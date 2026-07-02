import { PrismaClient } from '@prisma/client'
import { Pool } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'

const globalForPrisma = globalThis as unknown as { 
  prisma: PrismaClient | undefined
  isDbOffline?: boolean
}

// Verifica se a URL do banco é um mock/fictícia ou inexistente
const isMockUrl = !process.env.DATABASE_URL || 
                  process.env.DATABASE_URL.includes("npg_mock_url") || 
                  process.env.DATABASE_URL.includes("mock-pooler") ||
                  process.env.DATABASE_URL === "";

if (isMockUrl) {
  globalForPrisma.isDbOffline = true;
}

let realPrisma: PrismaClient | null = null;

// No Edge Runtime, o PrismaClient comum (sem adapter) lança erro de validação imediatamente.
// Portanto, criamos o PrismaClient apenas se tivermos uma conexão ativa do Neon compatível com Edge.
if (!isMockUrl && process.env.DATABASE_URL) {
  try {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL })
    const adapter = new PrismaNeon(pool)
    realPrisma = new PrismaClient({ adapter })
  } catch (error) {
    console.warn("Falha ao inicializar o adaptador Neon. Banco de dados indisponível.");
    globalForPrisma.isDbOffline = true;
  }
}

// Criamos um Proxy seguro para expor o objeto prisma.
// Se o banco estiver offline, qualquer chamada retorna um objeto simulado seguro
// em vez de travar por timeout ou dar erro de validação no Edge Runtime.
const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (isDatabaseOffline() || !realPrisma) {
      // Retorna um Proxy recursivo e invocável para evitar erros do tipo "cannot read properties of undefined"
      const mockHandler: ProxyHandler<any> = {
        get(t, p) {
          if (p === 'then') return undefined; // Evita comportamento incorreto com promises
          return new Proxy(() => Promise.resolve([]), mockHandler);
        },
        apply() {
          return Promise.resolve([]);
        }
      };
      return new Proxy(() => Promise.resolve([]), mockHandler);
    }
    return (realPrisma as any)[prop];
  }
});

export { prisma }
export default prisma

export function isDatabaseOffline() {
  if (isMockUrl) return true;
  if (globalForPrisma.isDbOffline) return true;
  return false;
}

export function setDatabaseOffline(offline: boolean) {
  globalForPrisma.isDbOffline = offline;
}

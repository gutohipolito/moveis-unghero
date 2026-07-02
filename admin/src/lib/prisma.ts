import { PrismaClient } from '@prisma/client'
import { Pool } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'

const globalForPrisma = globalThis as unknown as { 
  prisma: PrismaClient | undefined
  isDbOffline?: boolean
}

let prisma: PrismaClient

// Verifica se a URL do banco é um mock/fictícia ou inexistente
const isMockUrl = !process.env.DATABASE_URL || 
                  process.env.DATABASE_URL.includes("npg_mock_url") || 
                  process.env.DATABASE_URL.includes("mock-pooler") ||
                  process.env.DATABASE_URL === "";

if (isMockUrl) {
  globalForPrisma.isDbOffline = true;
}

if (process.env.NODE_ENV === 'production') {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaNeon(pool)
  prisma = new PrismaClient({ adapter })
} else {
  if (!globalForPrisma.prisma) {
    if (process.env.DATABASE_URL?.includes('neon.tech') && !isMockUrl) {
      const pool = new Pool({ connectionString: process.env.DATABASE_URL })
      const adapter = new PrismaNeon(pool)
      globalForPrisma.prisma = new PrismaClient({ adapter })
    } else {
      globalForPrisma.prisma = new PrismaClient({
        log: ['warn', 'error'],
      })
    }
  }
  prisma = globalForPrisma.prisma
}

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

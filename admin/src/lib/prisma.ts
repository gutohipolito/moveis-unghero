import { PrismaClient } from '@prisma/client'
import { Pool } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

let prisma: PrismaClient

if (process.env.NODE_ENV === 'production') {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaNeon(pool)
  prisma = new PrismaClient({ adapter })
} else {
  if (!globalForPrisma.prisma) {
    if (process.env.DATABASE_URL?.includes('neon.tech')) {
      const pool = new Pool({ connectionString: process.env.DATABASE_URL })
      const adapter = new PrismaNeon(pool)
      globalForPrisma.prisma = new PrismaClient({ adapter })
    } else {
      globalForPrisma.prisma = new PrismaClient()
    }
  }
  prisma = globalForPrisma.prisma
}

export { prisma }
export default prisma

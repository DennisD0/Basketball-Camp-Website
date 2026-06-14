import { PrismaClient } from '@prisma/client'
import path from 'path'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

// Bundled demo SQLite file (committed at prisma/dev.db) — resolved as an
// absolute path so it works both locally and from the Vercel function bundle,
// regardless of whether DATABASE_URL is configured in the environment.
const dbPath = path.join(process.cwd(), 'prisma', 'dev.db')

const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: { db: { url: `file:${dbPath}` } },
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma

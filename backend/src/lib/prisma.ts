import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import { Pool } from 'pg';
import ws from 'ws';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const databaseUrl = process.env.DATABASE_URL || '';
const isNeon = databaseUrl.includes('.neon.tech');

let adapter: any;

if (isNeon) {
  // Use Neon serverless WebSocket adapter (port 443)
  neonConfig.webSocketConstructor = ws;
  adapter = new PrismaNeon({ connectionString: databaseUrl });
} else {
  // Use standard TCP Postgres connection (port 5432)
  const pool = new Pool({
    connectionString: databaseUrl,
  });
  adapter = new PrismaPg(pool);
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;

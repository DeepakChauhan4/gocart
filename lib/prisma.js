
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';

import ws from 'ws';
neonConfig.webSocketConstructor = ws;

// To work in edge environments (Cloudflare Workers, Vercel Edge, etc.), enable querying over fetch
neonConfig.poolQueryViaFetch = true

const connectionString = `${process.env.DATABASE_URL}`;

// Prevent multiple instances during development
const globalForPrisma = global;

let prisma;

if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime with Neon adapter
    const adapter = new PrismaNeon({ connectionString });
    prisma = globalForPrisma.prisma || new PrismaClient({ adapter });
} else {
    // Node.js runtime
    prisma = globalForPrisma.prisma || new PrismaClient();
}

if (process.env.NEXT_RUNTIME !== 'edge') {
    globalForPrisma.prisma = prisma;
}

export default prisma;

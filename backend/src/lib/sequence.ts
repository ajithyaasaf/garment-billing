import { Prisma } from '@prisma/client';

export type SequenceType = 'INV' | 'QUO' | 'ORD';

/**
 * Generates an atomic, collision-free sequential number per month for Invoices, Quotations, and Orders.
 * Must be executed inside a Prisma transaction (tx).
 */
export async function getNextSequenceNumber(
  tx: Prisma.TransactionClient,
  type: SequenceType
): Promise<string> {
  const date = new Date();
  const y = date.getFullYear().toString().slice(-2);
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const yearMonth = `${y}${m}`;
  const counterId = `${type}-${yearMonth}`;

  const counter = await tx.sequenceCounter.upsert({
    where: { id: counterId },
    create: {
      id: counterId,
      type,
      yearMonth,
      lastSeq: 1,
    },
    update: {
      lastSeq: { increment: 1 },
    },
  });

  const seqStr = String(counter.lastSeq).padStart(4, '0');
  return `${type}-${yearMonth}-${seqStr}`;
}

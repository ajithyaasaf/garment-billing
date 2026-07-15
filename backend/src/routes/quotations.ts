import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

function generateQuotationNumber(): string {
  const date = new Date();
  const y = date.getFullYear().toString().slice(-2);
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const ms = Date.now().toString().slice(-5);
  return `QUO-${y}${m}-${ms}`;
}

router.get('/', async (req: AuthRequest, res: Response) => {
  const { page = '1', limit = '20', search = '', status, customerId } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const take = parseInt(limit as string);

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { quotationNumber: { contains: search as string, mode: 'insensitive' } },
      { customer: { shopName: { contains: search as string, mode: 'insensitive' } } },
      { customer: { ownerName: { contains: search as string, mode: 'insensitive' } } },
    ];
  }
  if (status) where.status = status;
  if (customerId) where.customerId = customerId;

  const [quotations, total] = await Promise.all([
    prisma.quotation.findMany({
      where,
      skip,
      take,
      include: {
        customer: { select: { shopName: true, ownerName: true, whatsapp: true } },
        createdBy: { select: { name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.quotation.count({ where }),
  ]);

  res.json({
    data: quotations,
    meta: { total, page: parseInt(page as string), limit: take, totalPages: Math.ceil(total / take) },
  });
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const quotation = await prisma.quotation.findUnique({
    where: { id: req.params.id },
    include: {
      customer: true,
      createdBy: { select: { name: true } },
      items: {
        include: {
          product: { select: { name: true, sku: true } },
        },
      },
    },
  });
  if (!quotation) return res.status(404).json({ error: 'Quotation not found' });
  res.json(quotation);
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const { customerId, items, discountAmount, discountPercent, notes, termsConditions, validUntil } = req.body;

  let subtotal = 0;
  let taxAmount = 0;

  const processedItems = items.map((item: {
    productId: string;
    variantId?: string;
    productName: string;
    color?: string;
    size?: string;
    quantity: number;
    unitPrice: number;
    gstPercent: number;
    discount?: number;
  }) => {
    const itemTotal = item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100);
    const gst = itemTotal * (item.gstPercent / 100);
    subtotal += itemTotal;
    taxAmount += gst;
    return {
      productId: item.productId,
      variantId: item.variantId,
      productName: item.productName,
      color: item.color,
      size: item.size,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      gstPercent: item.gstPercent,
      gstAmount: gst,
      totalAmount: itemTotal + gst,
      discount: item.discount || 0,
    };
  });

  const totalAmount = subtotal + taxAmount - (discountAmount || 0);

  const quotation = await prisma.quotation.create({
    data: {
      quotationNumber: generateQuotationNumber(),
      customerId,
      createdById: req.user!.id,
      subtotal,
      discountAmount: discountAmount || 0,
      discountPercent: discountPercent || 0,
      taxAmount,
      totalAmount,
      notes,
      termsConditions,
      validUntil: validUntil ? new Date(validUntil) : undefined,
      items: { create: processedItems },
    },
    include: {
      customer: true,
      items: true,
    },
  });

  res.status(201).json(quotation);
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const { items, ...data } = req.body;
  const quotation = await prisma.quotation.update({
    where: { id: req.params.id },
    data,
  });
  res.json(quotation);
});

// POST /api/quotations/:id/convert - Convert to invoice
router.post('/:id/convert', async (req: AuthRequest, res: Response) => {
  const quotation = await prisma.quotation.findUnique({
    where: { id: req.params.id },
    include: { items: true },
  });
  if (!quotation) return res.status(404).json({ error: 'Quotation not found' });
  if (quotation.convertedToInvoice) return res.status(400).json({ error: 'Already converted' });

  const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`;

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      customerId: quotation.customerId,
      createdById: req.user!.id,
      subtotal: quotation.subtotal,
      discountAmount: quotation.discountAmount,
      discountPercent: quotation.discountPercent,
      taxAmount: quotation.taxAmount,
      totalAmount: quotation.totalAmount,
      dueAmount: quotation.totalAmount,
      notes: quotation.notes,
      termsConditions: quotation.termsConditions,
      items: {
        create: quotation.items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          productName: item.productName,
          color: item.color,
          size: item.size,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          gstPercent: item.gstPercent,
          gstAmount: item.gstAmount,
          totalAmount: item.totalAmount,
          discount: item.discount,
        })),
      },
    },
  });

  await prisma.quotation.update({
    where: { id: req.params.id },
    data: { convertedToInvoice: true, invoiceId: invoice.id, status: 'CONVERTED' },
  });

  res.json(invoice);
});

// POST /api/quotations/:id/duplicate
router.post('/:id/duplicate', async (req: AuthRequest, res: Response) => {
  const original = await prisma.quotation.findUnique({
    where: { id: req.params.id },
    include: { items: true },
  });
  if (!original) return res.status(404).json({ error: 'Quotation not found' });

  const duplicate = await prisma.quotation.create({
    data: {
      quotationNumber: generateQuotationNumber(),
      customerId: original.customerId,
      createdById: req.user!.id,
      subtotal: original.subtotal,
      discountAmount: original.discountAmount,
      discountPercent: original.discountPercent,
      taxAmount: original.taxAmount,
      totalAmount: original.totalAmount,
      notes: original.notes,
      termsConditions: original.termsConditions,
      items: {
        create: original.items.map(({ id: _id, quotationId: _qid, ...item }) => item),
      },
    },
    include: { customer: true, items: true },
  });

  res.status(201).json(duplicate);
});

export default router;

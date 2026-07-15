import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/search?q=&type=all
router.get('/', async (req: AuthRequest, res: Response) => {
  const { q = '', type = 'all' } = req.query;
  const query = q as string;

  if (!query || query.length < 2) {
    return res.json({ products: [], customers: [], quotations: [], invoices: [], suppliers: [], purchases: [] });
  }

  const [products, customers, quotations, invoices, suppliers, purchases] = await Promise.all([
    type === 'all' || type === 'products'
      ? prisma.product.findMany({
          where: {
            isActive: true,
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { sku: { contains: query, mode: 'insensitive' } },
              { brand: { contains: query, mode: 'insensitive' } },
            ],
          },
          take: 5,
          select: { id: true, name: true, sku: true, wholesalePrice: true, retailPrice: true, category: { select: { name: true } } },
        })
      : [],
    type === 'all' || type === 'customers'
      ? prisma.customer.findMany({
          where: {
            isActive: true,
            OR: [
              { shopName: { contains: query, mode: 'insensitive' } },
              { ownerName: { contains: query, mode: 'insensitive' } },
              { whatsapp: { contains: query } },
            ],
          },
          take: 5,
          select: { id: true, shopName: true, ownerName: true, whatsapp: true, city: true },
        })
      : [],
    type === 'all' || type === 'quotations'
      ? prisma.quotation.findMany({
          where: {
            OR: [
              { quotationNumber: { contains: query, mode: 'insensitive' } },
              { customer: { shopName: { contains: query, mode: 'insensitive' } } },
              { customer: { ownerName: { contains: query, mode: 'insensitive' } } },
            ],
          },
          take: 5,
          select: { id: true, quotationNumber: true, totalAmount: true, status: true, customer: { select: { shopName: true, ownerName: true } } },
        })
      : [],
    type === 'all' || type === 'invoices'
      ? prisma.invoice.findMany({
          where: {
            OR: [
              { invoiceNumber: { contains: query, mode: 'insensitive' } },
              { customer: { shopName: { contains: query, mode: 'insensitive' } } },
              { customer: { ownerName: { contains: query, mode: 'insensitive' } } },
            ],
          },
          take: 5,
          select: { id: true, invoiceNumber: true, totalAmount: true, paymentStatus: true, customer: { select: { shopName: true, ownerName: true } } },
        })
      : [],
    type === 'all' || type === 'suppliers'
      ? prisma.supplier.findMany({
          where: {
            isActive: true,
            OR: [
              { shopName: { contains: query, mode: 'insensitive' } },
              { ownerName: { contains: query, mode: 'insensitive' } },
              { whatsapp: { contains: query } },
            ],
          },
          take: 5,
          select: { id: true, shopName: true, ownerName: true, whatsapp: true, city: true },
        })
      : [],
    type === 'all' || type === 'purchases'
      ? prisma.purchaseBill.findMany({
          where: {
            OR: [
              { billNumber: { contains: query, mode: 'insensitive' } },
              { supplier: { shopName: { contains: query, mode: 'insensitive' } } },
              { supplier: { ownerName: { contains: query, mode: 'insensitive' } } },
            ],
          },
          take: 5,
          select: { id: true, billNumber: true, totalAmount: true, paymentStatus: true, supplier: { select: { shopName: true, ownerName: true } } },
        })
      : [],
  ]);

  res.json({ products, customers, quotations, invoices, suppliers, purchases });
});

export default router;

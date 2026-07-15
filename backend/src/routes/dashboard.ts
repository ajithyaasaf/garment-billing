import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (_req: AuthRequest, res: Response) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    todaySales,
    monthlySales,
    lowStockCount,
    recentInvoices,
    recentQuotations,
    outstandingPayments,
    totalCustomers,
    topProducts,
    totalProducts,
  ] = await Promise.all([
    // Today's sales total
    prisma.invoice.aggregate({
      where: { invoiceDate: { gte: today } },
      _sum: { totalAmount: true },
      _count: true,
    }),
    // Monthly sales
    prisma.invoice.aggregate({
      where: { invoiceDate: { gte: monthStart } },
      _sum: { totalAmount: true },
      _count: true,
    }),
    // Low stock count
    prisma.productVariant.count({
      where: { stock: { lte: 5 } },
    }),
    // Recent invoices
    prisma.invoice.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        invoiceNumber: true,
        customerId: true,
        totalAmount: true,
        paymentStatus: true,
        invoiceDate: true,
        customer: { select: { shopName: true, ownerName: true } },
      },
    }),
    // Recent quotations
    prisma.quotation.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        quotationNumber: true,
        customerId: true,
        totalAmount: true,
        status: true,
        createdAt: true,
        customer: { select: { shopName: true, ownerName: true } },
      },
    }),
    // Outstanding payments
    prisma.invoice.aggregate({
      where: { paymentStatus: { in: ['UNPAID', 'PARTIAL'] } },
      _sum: { dueAmount: true },
      _count: true,
    }),
    // Total customers
    prisma.customer.count({ where: { isActive: true } }),
    // Top selling products (by invoice items)
    prisma.invoiceItem.groupBy({
      by: ['productId', 'productName'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    }),
    // Total products
    prisma.product.count(),
  ]);

  res.json({
    todaySales: {
      total: todaySales._sum.totalAmount || 0,
      count: todaySales._count,
    },
    monthlySales: {
      total: monthlySales._sum.totalAmount || 0,
      count: monthlySales._count,
    },
    lowStockCount,
    recentInvoices,
    recentQuotations,
    outstandingPayments: {
      total: outstandingPayments._sum.dueAmount || 0,
      count: outstandingPayments._count,
    },
    totalCustomers,
    topProducts,
    totalProducts,
  });
});

export default router;

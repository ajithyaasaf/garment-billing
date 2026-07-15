import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/reports/sales-daily
router.get('/sales-daily', async (req: AuthRequest, res: Response) => {
  const { days = '30' } = req.query;
  const daysAgo = new Date();
  daysAgo.setDate(daysAgo.getDate() - parseInt(days as string));

  const invoices = await prisma.invoice.findMany({
    where: { invoiceDate: { gte: daysAgo } },
    select: { invoiceDate: true, totalAmount: true, paidAmount: true },
    orderBy: { invoiceDate: 'asc' },
  });

  // Group by date
  const grouped: Record<string, { date: string; revenue: number; collected: number; count: number }> = {};
  for (const inv of invoices) {
    const date = inv.invoiceDate.toISOString().split('T')[0];
    if (!grouped[date]) grouped[date] = { date, revenue: 0, collected: 0, count: 0 };
    grouped[date].revenue += inv.totalAmount;
    grouped[date].collected += inv.paidAmount;
    grouped[date].count++;
  }

  res.json(Object.values(grouped));
});

// GET /api/reports/sales-monthly
router.get('/sales-monthly', async (req: AuthRequest, res: Response) => {
  const { year = new Date().getFullYear() } = req.query;
  const startDate = new Date(`${year}-01-01`);
  const endDate = new Date(`${parseInt(year as string) + 1}-01-01`);

  const invoices = await prisma.invoice.findMany({
    where: { invoiceDate: { gte: startDate, lt: endDate } },
    select: { invoiceDate: true, totalAmount: true, paidAmount: true },
  });

  const monthly: Record<number, { month: number; revenue: number; collected: number; count: number }> = {};
  for (let i = 1; i <= 12; i++) {
    monthly[i] = { month: i, revenue: 0, collected: 0, count: 0 };
  }

  for (const inv of invoices) {
    const m = inv.invoiceDate.getMonth() + 1;
    monthly[m].revenue += inv.totalAmount;
    monthly[m].collected += inv.paidAmount;
    monthly[m].count++;
  }

  res.json(Object.values(monthly));
});

// GET /api/reports/product-sales
router.get('/product-sales', async (req: AuthRequest, res: Response) => {
  const { limit = '20' } = req.query;

  const productSales = await prisma.invoiceItem.groupBy({
    by: ['productId', 'productName'],
    _sum: { quantity: true, totalAmount: true },
    orderBy: { _sum: { totalAmount: 'desc' } },
    take: parseInt(limit as string),
  });

  res.json(productSales);
});

// GET /api/reports/customer-sales
router.get('/customer-sales', async (req: AuthRequest, res: Response) => {
  const customers = await prisma.invoice.groupBy({
    by: ['customerId'],
    _sum: { totalAmount: true, paidAmount: true, dueAmount: true },
    _count: true,
    orderBy: { _sum: { totalAmount: 'desc' } },
    take: 20,
  });

  const customerIds = customers.map((c) => c.customerId);
  const customerDetails = await prisma.customer.findMany({
    where: { id: { in: customerIds } },
    select: { id: true, shopName: true, ownerName: true, city: true },
  });

  const result = customers.map((c) => {
    const detail = customerDetails.find((d) => d.id === c.customerId);
    return {
      ...c,
      shopName: detail?.shopName || detail?.ownerName,
      city: detail?.city,
    };
  });

  res.json(result);
});

// GET /api/reports/gst
router.get('/gst', async (req: AuthRequest, res: Response) => {
  const { month, year } = req.query;
  if (!month || !year) {
    res.status(400).json({ error: 'Month and year are required parameters' });
    return;
  }

  const startDate = new Date(`${year}-${String(month).padStart(2, '0')}-01`);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);

  const profile = await prisma.businessProfile.findFirst();
  const businessState = (profile?.state || 'Tamil Nadu').trim().toLowerCase();

  const invoices = await prisma.invoice.findMany({
    where: { invoiceDate: { gte: startDate, lt: endDate } },
    include: {
      customer: { select: { shopName: true, ownerName: true, gstNumber: true, state: true } },
      items: { select: { gstPercent: true, gstAmount: true, totalAmount: true, quantity: true } },
    },
    orderBy: { invoiceDate: 'asc' },
  });

  const gstSummary: Record<number, { rate: number; taxable: number; gst: number }> = {};

  let totalTaxable = 0;
  let totalGst = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  for (const inv of invoices) {
    const isLocal = (inv.customer.state || 'Tamil Nadu').trim().toLowerCase() === businessState;

    for (const item of inv.items) {
      if (!gstSummary[item.gstPercent]) {
        gstSummary[item.gstPercent] = { rate: item.gstPercent, taxable: 0, gst: 0 };
      }

      const itemTaxable = item.totalAmount - item.gstAmount;
      gstSummary[item.gstPercent].taxable += itemTaxable;
      gstSummary[item.gstPercent].gst += item.gstAmount;

      totalTaxable += itemTaxable;
      totalGst += item.gstAmount;

      if (isLocal) {
        totalCgst += item.gstAmount / 2;
        totalSgst += item.gstAmount / 2;
      } else {
        totalIgst += item.gstAmount;
      }
    }
  }

  res.json({
    period: { month: parseInt(month as string), year: parseInt(year as string) },
    invoiceCount: invoices.length,
    totals: {
      taxable: Math.round(totalTaxable * 100) / 100,
      gst: Math.round(totalGst * 100) / 100,
      cgst: Math.round(totalCgst * 100) / 100,
      sgst: Math.round(totalSgst * 100) / 100,
      igst: Math.round(totalIgst * 100) / 100,
    },
    gstBreakdown: Object.values(gstSummary).map(item => ({
      rate: item.rate,
      taxable: Math.round(item.taxable * 100) / 100,
      gst: Math.round(item.gst * 100) / 100,
    })),
    invoices: invoices.map((inv) => {
      const isLocal = (inv.customer.state || 'Tamil Nadu').trim().toLowerCase() === businessState;
      const invGst = inv.items.reduce((sum, item) => sum + item.gstAmount, 0);
      const invTaxable = inv.items.reduce((sum, item) => sum + (item.totalAmount - item.gstAmount), 0);
      return {
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        customer: inv.customer.shopName || inv.customer.ownerName,
        gstNumber: inv.customer.gstNumber,
        state: inv.customer.state,
        taxableAmount: Math.round(invTaxable * 100) / 100,
        cgst: isLocal ? Math.round((invGst / 2) * 100) / 100 : 0,
        sgst: isLocal ? Math.round((invGst / 2) * 100) / 100 : 0,
        igst: isLocal ? 0 : Math.round(invGst * 100) / 100,
        taxAmount: Math.round(invGst * 100) / 100,
        totalAmount: Math.round(inv.totalAmount * 100) / 100,
        items: inv.items,
      };
    }),
  });
});

// GET /api/reports/outstanding
router.get('/outstanding', async (_req, res: Response) => {
  const outstanding = await prisma.invoice.findMany({
    where: { paymentStatus: { in: ['UNPAID', 'PARTIAL'] } },
    include: { customer: { select: { shopName: true, ownerName: true, whatsapp: true, city: true } } },
    orderBy: { dueAmount: 'desc' },
  });

  const total = outstanding.reduce((sum, inv) => sum + inv.dueAmount, 0);

  res.json({ total, count: outstanding.length, invoices: outstanding });
});

// GET /api/reports/profit
router.get('/profit', async (req: AuthRequest, res: Response) => {
  const { fromDate, toDate } = req.query;

  const where: Record<string, unknown> = {};
  if (fromDate || toDate) {
    where.invoiceDate = {
      ...(fromDate ? { gte: new Date(fromDate as string) } : {}),
      ...(toDate ? { lte: new Date(toDate as string) } : {}),
    };
  }

  const invoiceItems = await prisma.invoiceItem.findMany({
    where: { invoice: where },
    include: { product: { select: { purchasePrice: true } } },
  });

  let revenue = 0;
  let costOfGoods = 0;

  for (const item of invoiceItems) {
    revenue += item.totalAmount - item.gstAmount;
    costOfGoods += (item.product.purchasePrice || 0) * item.quantity;
  }

  const grossProfit = revenue - costOfGoods;
  const profitMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

  res.json({ revenue, costOfGoods, grossProfit, profitMargin: profitMargin.toFixed(2) });
});

export default router;

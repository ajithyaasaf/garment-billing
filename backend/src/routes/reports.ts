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
router.get('/outstanding', async (req: AuthRequest, res: Response) => {
  const { customerType } = req.query;
  const customerWhere: Record<string, unknown> = {};
  if (customerType === 'WHOLESALE' || customerType === 'RETAIL') {
    customerWhere.type = customerType;
  }

  const outstanding = await prisma.invoice.findMany({
    where: {
      paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
      ...(Object.keys(customerWhere).length ? { customer: customerWhere } : {}),
    },
    include: { customer: { select: { shopName: true, ownerName: true, whatsapp: true, city: true, type: true } } },
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

// GET /api/reports/supplier-outstanding
router.get('/supplier-outstanding', async (_req, res: Response) => {
  const outstanding = await prisma.purchaseBill.findMany({
    where: { paymentStatus: { in: ['UNPAID', 'PARTIAL'] } },
    include: { supplier: { select: { shopName: true, ownerName: true, whatsapp: true, city: true } } },
    orderBy: { dueAmount: 'desc' },
  });

  const total = outstanding.reduce((sum, bill) => sum + bill.dueAmount, 0);

  res.json({ total, count: outstanding.length, bills: outstanding });
});

// GET /api/reports/purchases-summary
router.get('/purchases-summary', async (req: AuthRequest, res: Response) => {
  const yearParam = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
  const currentYear = isNaN(yearParam) ? new Date().getFullYear() : yearParam;
  const startDate = new Date(`${currentYear}-01-01`);
  const endDate = new Date(`${currentYear + 1}-01-01`);

  const bills = await prisma.purchaseBill.findMany({
    where: { billDate: { gte: startDate, lt: endDate } },
    select: { billDate: true, totalAmount: true, paidAmount: true },
  });

  const monthly: Record<number, { month: number; total: number; paid: number; count: number }> = {};
  for (let i = 1; i <= 12; i++) {
    monthly[i] = { month: i, total: 0, paid: 0, count: 0 };
  }

  for (const bill of bills) {
    const m = bill.billDate.getMonth() + 1;
    monthly[m].total += bill.totalAmount;
    monthly[m].paid += bill.paidAmount;
    monthly[m].count++;
  }

  // Top Suppliers
  const topSuppliersAgg = await prisma.purchaseBill.groupBy({
    by: ['supplierId'],
    _sum: { totalAmount: true },
    orderBy: { _sum: { totalAmount: 'desc' } },
    take: 5,
  });

  const supplierIds = topSuppliersAgg.map(s => s.supplierId);
  const suppliers = await prisma.supplier.findMany({
    where: { id: { in: supplierIds } },
    select: { id: true, shopName: true, ownerName: true },
  });

  const topSuppliers = topSuppliersAgg.map(s => {
    const d = suppliers.find(sup => sup.id === s.supplierId);
    return {
      supplierId: s.supplierId,
      shopName: d?.shopName || d?.ownerName || 'Unknown',
      total: s._sum.totalAmount || 0,
    };
  });

  res.json({
    monthly: Object.values(monthly),
    topSuppliers,
  });
});

// GET /api/reports/realtime-summary
router.get('/realtime-summary', async (req: AuthRequest, res: Response) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);

  const [
    todaySales,
    weekSales,
    todayPurchases,
    weekPurchases,
    newCustomersCount,
    fastestMovingProducts,
  ] = await Promise.all([
    // Today's Sales
    prisma.invoice.findMany({
      where: { invoiceDate: { gte: todayStart } },
      include: { customer: { select: { type: true } } },
    }),
    // Week's Sales
    prisma.invoice.findMany({
      where: { invoiceDate: { gte: weekStart } },
      include: { customer: { select: { type: true } } },
    }),
    // Today's Purchases (Sourcing)
    prisma.purchaseBill.aggregate({
      where: { billDate: { gte: todayStart } },
      _sum: { totalAmount: true, paidAmount: true },
      _count: true,
    }),
    // Week's Purchases (Sourcing)
    prisma.purchaseBill.aggregate({
      where: { billDate: { gte: weekStart } },
      _sum: { totalAmount: true, paidAmount: true },
      _count: true,
    }),
    // New Customers this week
    prisma.customer.count({
      where: { createdAt: { gte: weekStart }, isActive: true },
    }),
    // Fast Selling Products (Top 5)
    prisma.invoiceItem.groupBy({
      by: ['productId', 'productName'],
      _sum: { quantity: true, totalAmount: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    }),
  ]);

  let todaySalesRevenue = 0;
  let todaySalesCollected = 0;
  let todayWholesaleRevenue = 0;
  let todayRetailRevenue = 0;
  for (const inv of todaySales) {
    todaySalesRevenue += inv.totalAmount;
    todaySalesCollected += inv.paidAmount;
    if (inv.customer?.type === 'WHOLESALE') {
      todayWholesaleRevenue += inv.totalAmount;
    } else {
      todayRetailRevenue += inv.totalAmount;
    }
  }

  let weekSalesRevenue = 0;
  let weekSalesCollected = 0;
  let weekWholesaleRevenue = 0;
  let weekRetailRevenue = 0;
  for (const inv of weekSales) {
    weekSalesRevenue += inv.totalAmount;
    weekSalesCollected += inv.paidAmount;
    if (inv.customer?.type === 'WHOLESALE') {
      weekWholesaleRevenue += inv.totalAmount;
    } else {
      weekRetailRevenue += inv.totalAmount;
    }
  }

  res.json({
    today: {
      salesRevenue: todaySalesRevenue,
      wholesaleRevenue: todayWholesaleRevenue,
      retailRevenue: todayRetailRevenue,
      salesCollected: todaySalesCollected,
      salesCount: todaySales.length,
      purchaseTotal: todayPurchases._sum?.totalAmount || 0,
      purchaseCount: todayPurchases._count || 0,
    },
    week: {
      salesRevenue: weekSalesRevenue,
      wholesaleRevenue: weekWholesaleRevenue,
      retailRevenue: weekRetailRevenue,
      salesCollected: weekSalesCollected,
      salesCount: weekSales.length,
      purchaseTotal: weekPurchases._sum?.totalAmount || 0,
      purchaseCount: weekPurchases._count || 0,
      newCustomers: newCustomersCount || 0,
    },
    fastMoving: fastestMovingProducts.map(p => ({
      productId: p.productId,
      productName: p.productName,
      quantity: p._sum.quantity || 0,
      revenue: p._sum.totalAmount || 0,
    })),
  });
});

export default router;

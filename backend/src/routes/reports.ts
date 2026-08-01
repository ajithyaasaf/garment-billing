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
      customer: { select: { shopName: true, ownerName: true, gstNumber: true, state: true, type: true } },
      items: { select: { gstPercent: true, gstAmount: true, totalAmount: true, quantity: true, productName: true, product: { select: { sku: true } } } },
    },
    orderBy: { invoiceDate: 'asc' },
  });

  const gstSummary: Record<number, { rate: number; taxable: number; gst: number }> = {};
  const hsnMap: Record<string, { hsn: string; name: string; rate: number; qty: number; taxable: number; cgst: number; sgst: number; igst: number; totalGst: number }> = {};
  const b2cMap: Record<string, { state: string; rate: number; taxable: number; cgst: number; sgst: number; igst: number; totalGst: number }> = {};

  let totalTaxable = 0;
  let totalGst = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  const b2bInvoices: any[] = [];

  for (const inv of invoices) {
    const isLocal = (inv.customer.state || 'Tamil Nadu').trim().toLowerCase() === businessState;
    const invGst = inv.items.reduce((sum, item) => sum + item.gstAmount, 0);
    const invTaxable = inv.items.reduce((sum, item) => sum + (item.totalAmount - item.gstAmount), 0);
    const hasGstIn = Boolean(inv.customer.gstNumber && inv.customer.gstNumber.trim().length >= 10);

    const b2bItem = {
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate,
      customer: inv.customer.shopName || inv.customer.ownerName,
      gstNumber: inv.customer.gstNumber || '',
      state: inv.customer.state || 'Tamil Nadu',
      customerType: inv.customer.type || (inv.customer.shopName ? 'WHOLESALE' : 'RETAIL'),
      taxableAmount: Math.round(invTaxable * 100) / 100,
      cgst: isLocal ? Math.round((invGst / 2) * 100) / 100 : 0,
      sgst: isLocal ? Math.round((invGst / 2) * 100) / 100 : 0,
      igst: isLocal ? 0 : Math.round(invGst * 100) / 100,
      taxAmount: Math.round(invGst * 100) / 100,
      totalAmount: Math.round(inv.totalAmount * 100) / 100,
    };

    if (hasGstIn) {
      b2bInvoices.push(b2bItem);
    }

    for (const item of inv.items) {
      if (!gstSummary[item.gstPercent]) {
        gstSummary[item.gstPercent] = { rate: item.gstPercent, taxable: 0, gst: 0 };
      }

      const itemTaxable = item.totalAmount - item.gstAmount;
      const itemCgst = isLocal ? item.gstAmount / 2 : 0;
      const itemSgst = isLocal ? item.gstAmount / 2 : 0;
      const itemIgst = isLocal ? 0 : item.gstAmount;

      gstSummary[item.gstPercent].taxable += itemTaxable;
      gstSummary[item.gstPercent].gst += item.gstAmount;

      totalTaxable += itemTaxable;
      totalGst += item.gstAmount;
      totalCgst += itemCgst;
      totalSgst += itemSgst;
      totalIgst += itemIgst;

      // HSN Breakdown
      const hsnKey = `${item.product?.sku || 'GARMENT'}-${item.gstPercent}`;
      if (!hsnMap[hsnKey]) {
        hsnMap[hsnKey] = {
          hsn: item.product?.sku || 'GARMENT',
          name: item.productName || 'Garment Item',
          rate: item.gstPercent,
          qty: 0,
          taxable: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
          totalGst: 0,
        };
      }
      hsnMap[hsnKey].qty += item.quantity;
      hsnMap[hsnKey].taxable += itemTaxable;
      hsnMap[hsnKey].cgst += itemCgst;
      hsnMap[hsnKey].sgst += itemSgst;
      hsnMap[hsnKey].igst += itemIgst;
      hsnMap[hsnKey].totalGst += item.gstAmount;

      // B2C Summary (Retail Sales without GSTIN)
      if (!hasGstIn) {
        const b2cKey = `${inv.customer.state || 'Tamil Nadu'}-${item.gstPercent}`;
        if (!b2cMap[b2cKey]) {
          b2cMap[b2cKey] = {
            state: inv.customer.state || 'Tamil Nadu',
            rate: item.gstPercent,
            taxable: 0,
            cgst: 0,
            sgst: 0,
            igst: 0,
            totalGst: 0,
          };
        }
        b2cMap[b2cKey].taxable += itemTaxable;
        b2cMap[b2cKey].cgst += itemCgst;
        b2cMap[b2cKey].sgst += itemSgst;
        b2cMap[b2cKey].igst += itemIgst;
        b2cMap[b2cKey].totalGst += item.gstAmount;
      }
    }
  }

  const hsnSummary = Object.values(hsnMap).map((h) => ({
    hsn: h.hsn,
    name: h.name,
    rate: h.rate,
    qty: h.qty,
    taxable: Math.round(h.taxable * 100) / 100,
    cgst: Math.round(h.cgst * 100) / 100,
    sgst: Math.round(h.sgst * 100) / 100,
    igst: Math.round(h.igst * 100) / 100,
    totalGst: Math.round(h.totalGst * 100) / 100,
  }));

  const b2cSummary = Object.values(b2cMap).map((b) => ({
    state: b.state,
    rate: b.rate,
    taxable: Math.round(b.taxable * 100) / 100,
    cgst: Math.round(b.cgst * 100) / 100,
    sgst: Math.round(b.sgst * 100) / 100,
    igst: Math.round(b.igst * 100) / 100,
    totalGst: Math.round(b.totalGst * 100) / 100,
  }));

  // GSTR-1 Official Portal JSON Schema
  const gstr1Json = {
    gstin: profile?.gstNumber || '33AAAAA0000A1Z5',
    fp: `${String(month).padStart(2, '0')}${year}`,
    version: 'GSTR1_v3.0',
    b2b: b2bInvoices.map((inv) => ({
      ctin: inv.gstNumber,
      inv: [
        {
          inum: inv.invoiceNumber,
          idt: new Date(inv.invoiceDate).toLocaleDateString('en-GB'),
          val: inv.totalAmount,
          pos: inv.state,
          rchrg: 'N',
          inv_typ: 'R',
          itms: [
            {
              num: 1,
              itm_det: {
                txval: inv.taxableAmount,
                rt: inv.cgst > 0 ? (inv.taxAmount / inv.taxableAmount) * 100 : (inv.igst / inv.taxableAmount) * 100,
                iamt: inv.igst,
                camt: inv.cgst,
                samt: inv.sgst,
                csamt: 0,
              },
            },
          ],
        },
      ],
    })),
    b2cs: b2cSummary.map((b) => ({
      sply_ty: b.igst > 0 ? 'INTER' : 'INTRA',
      pos: b.state,
      rt: b.rate,
      txval: b.taxable,
      iamt: b.igst,
      camt: b.cgst,
      samt: b.sgst,
      csamt: 0,
    })),
    hsn: {
      data: hsnSummary.map((h, idx) => ({
        num: idx + 1,
        hsn_sc: h.hsn,
        desc: h.name,
        uqc: 'PCS',
        qty: h.qty,
        val: Math.round((h.taxable + h.totalGst) * 100) / 100,
        txval: h.taxable,
        iamt: h.igst,
        camt: h.cgst,
        samt: h.sgst,
        csamt: 0,
      })),
    },
  };

  res.json({
    period: { month: parseInt(month as string), year: parseInt(year as string) },
    invoiceCount: invoices.length,
    b2bCount: b2bInvoices.length,
    b2cCount: invoices.length - b2bInvoices.length,
    totals: {
      taxable: Math.round(totalTaxable * 100) / 100,
      gst: Math.round(totalGst * 100) / 100,
      cgst: Math.round(totalCgst * 100) / 100,
      sgst: Math.round(totalSgst * 100) / 100,
      igst: Math.round(totalIgst * 100) / 100,
    },
    gstBreakdown: Object.values(gstSummary).map((item) => ({
      rate: item.rate,
      taxable: Math.round(item.taxable * 100) / 100,
      gst: Math.round(item.gst * 100) / 100,
    })),
    b2bInvoices,
    b2cSummary,
    hsnSummary,
    gstr1Json,
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

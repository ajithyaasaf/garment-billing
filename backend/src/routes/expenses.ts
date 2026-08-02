import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// Standard Expense Categories for Garment Business
export const EXPENSE_CATEGORIES = [
  { id: "RENT", label: "Shop Rent", icon: "Home" },
  { id: "ELECTRICITY", label: "Electricity & Utilities", icon: "Zap" },
  { id: "SALARY", label: "Staff Salary / Advance", icon: "Users" },
  { id: "TRANSPORT", label: "Transport & Freight", icon: "Truck" },
  { id: "TEA_SNACKS", label: "Tea, Snacks & Refreshments", icon: "Coffee" },
  { id: "PACKAGING", label: "Packaging & Bags", icon: "Package" },
  { id: "MAINTENANCE", label: "Repair & Maintenance", icon: "Wrench" },
  { id: "MISC", label: "Miscellaneous / Other", icon: "MoreHorizontal" },
];

// GET /api/expenses - List expenses with filters
router.get('/', async (req: AuthRequest, res: Response) => {
  const { page = '1', limit = '20', category, search, startDate, endDate } = req.query;
  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};

  if (category && category !== 'ALL') {
    where.category = category as string;
  }

  if (search) {
    const q = (search as string).trim();
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { notes: { contains: q, mode: 'insensitive' } },
      { category: { contains: q, mode: 'insensitive' } },
    ];
  }

  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate as string);
    if (endDate) {
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      where.date.lte = end;
    }
  }

  try {
    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { date: 'desc' },
        include: {
          createdBy: { select: { name: true, email: true } },
        },
      }),
      prisma.expense.count({ where }),
    ]);

    res.json({
      data: expenses,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch expenses' });
  }
});

// GET /api/expenses/summary - Monthly summary and category breakdown
router.get('/summary', async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 1. Total Expenses This Month
    const monthAgg = await prisma.expense.aggregate({
      where: { date: { gte: firstDayOfMonth } },
      _sum: { amount: true },
      _count: true,
    });

    // 2. Today Expenses
    const todayAgg = await prisma.expense.aggregate({
      where: { date: { gte: startOfToday } },
      _sum: { amount: true },
    });

    // 3. Category Breakdown This Month
    const categoryGroup = await prisma.expense.groupBy({
      by: ['category'],
      where: { date: { gte: firstDayOfMonth } },
      _sum: { amount: true },
      _count: true,
    });

    const totalMonthAmount = monthAgg._sum.amount || 0;

    let highestCategory = 'N/A';
    let highestAmount = 0;

    const breakdown = categoryGroup.map((item: any) => {
      const sum = item._sum.amount || 0;
      if (sum > highestAmount) {
        highestAmount = sum;
        highestCategory = item.category;
      }
      return {
        category: item.category,
        totalAmount: sum,
        count: item._count,
        percentage: totalMonthAmount > 0 ? Math.round((sum / totalMonthAmount) * 100) : 0,
      };
    }).sort((a: any, b: any) => b.totalAmount - a.totalAmount);

    res.json({
      totalThisMonth: totalMonthAmount,
      todayTotal: todayAgg._sum.amount || 0,
      totalCount: monthAgg._count || 0,
      highestCategory,
      highestAmount,
      categoryBreakdown: breakdown,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch expense summary' });
  }
});

// POST /api/expenses - Create new expense
router.post('/', async (req: AuthRequest, res: Response) => {
  const { title, category, amount, paymentMethod, date, notes } = req.body;

  if (!title || !category || amount === undefined || amount === null) {
    return res.status(400).json({ error: 'Title, Category, and Amount are required' });
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number' });
  }

  try {
    const expense = await prisma.expense.create({
      data: {
        title: title.trim(),
        category: category.trim(),
        amount: parsedAmount,
        paymentMethod: paymentMethod || 'CASH',
        date: date ? new Date(date) : new Date(),
        notes: notes ? notes.trim() : null,
        createdById: req.user!.id,
      },
      include: {
        createdBy: { select: { name: true, email: true } },
      },
    });

    res.status(201).json(expense);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create expense' });
  }
});

// PUT /api/expenses/:id - Update an expense
router.put('/:id', async (req: AuthRequest, res: Response) => {
  const { title, category, amount, paymentMethod, date, notes } = req.body;
  const { id } = req.params;

  try {
    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    const data: any = {};
    if (title) data.title = title.trim();
    if (category) data.category = category.trim();
    if (amount !== undefined) {
      const parsed = parseFloat(amount);
      if (isNaN(parsed) || parsed <= 0) {
        return res.status(400).json({ error: 'Amount must be a positive number' });
      }
      data.amount = parsed;
    }
    if (paymentMethod) data.paymentMethod = paymentMethod;
    if (date) data.date = new Date(date);
    if (notes !== undefined) data.notes = notes ? notes.trim() : null;

    const updated = await prisma.expense.update({
      where: { id },
      data,
      include: {
        createdBy: { select: { name: true, email: true } },
      },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update expense' });
  }
});

// DELETE /api/expenses/:id - Delete an expense
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    await prisma.expense.delete({ where: { id } });
    res.json({ message: 'Expense deleted successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to delete expense' });
  }
});

export default router;

import { prisma } from './lib/prisma';

async function cleanDatabase() {
  const isConfirmed = process.argv.includes('--confirm');

  if (!isConfirmed) {
    console.log('⚠️  SAFETY NOTICE: Production Cleanup Safety Gate');
    console.log('----------------------------------------------------');
    console.log('This action will reset transactional test data (Invoices, Customers, Purchases, Expenses).');
    console.log('To execute this cleanup, run:');
    console.log('\n   npm run db:clean -- --confirm\n');
    process.exit(0);
  }

  console.log('🧹 Starting production database cleanup...');

  try {
    // 1. Delete Payments & Invoice Line Items
    await prisma.payment.deleteMany({});
    const deletedInvoiceItems = await prisma.invoiceItem.deleteMany({});
    const deletedInvoices = await prisma.invoice.deleteMany({});
    const deletedQuotationItems = await prisma.quotationItem.deleteMany({});
    const deletedQuotations = await prisma.quotation.deleteMany({});
    console.log(`✅ Cleared ${deletedInvoices.count} Invoices, ${deletedQuotations.count} Quotations & Line Items`);

    // 2. Delete Orders & Deliveries
    const deletedOrderItems = await prisma.orderItem.deleteMany({});
    const deletedOrders = await prisma.order.deleteMany({});
    console.log(`✅ Cleared ${deletedOrders.count} Orders & ${deletedOrderItems.count} Order Items`);

    // 3. Delete Purchases, Purchase Payments & Suppliers
    await prisma.purchasePayment.deleteMany({});
    const deletedPurchaseBillItems = await prisma.purchaseBillItem.deleteMany({});
    const deletedPurchaseBills = await prisma.purchaseBill.deleteMany({});
    const deletedSuppliers = await prisma.supplier.deleteMany({});
    console.log(`✅ Cleared ${deletedPurchaseBills.count} Purchase Bills & ${deletedSuppliers.count} Suppliers`);

    // 4. Delete Shop Expenses
    const deletedExpenses = await prisma.expense.deleteMany({});
    console.log(`✅ Cleared ${deletedExpenses.count} Expenses`);

    // 5. Delete Customer Records
    const deletedCustomers = await prisma.customer.deleteMany({});
    console.log(`✅ Cleared ${deletedCustomers.count} Test Customers`);

    // 6. Delete Stock Movement Logs, Sequence Counters & Notifications
    await prisma.stockMovement.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.sequenceCounter.deleteMany({});
    console.log(`✅ Cleared Stock Movements, Sequence Counters & Notifications`);

    // 7. Delete Products & Variants
    const deletedVariants = await prisma.productVariant.deleteMany({});
    const deletedProducts = await prisma.product.deleteMany({});
    console.log(`✅ Cleared ${deletedProducts.count} Products & ${deletedVariants.count} Variants`);

    console.log('');
    console.log('✨ Production Database Cleaned Successfully!');
    console.log('🔒 Admin account and Business Profile settings are preserved for production launch.');
  } catch (error) {
    console.error('❌ Error cleaning database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDatabase();

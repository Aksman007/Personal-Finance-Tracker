import { PrismaClient, TransactionType } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  { name: 'Salary', type: TransactionType.INCOME, icon: '💰', color: '#4CAF50' },
  { name: 'Freelance', type: TransactionType.INCOME, icon: '💻', color: '#8BC34A' },
  { name: 'Investment Return', type: TransactionType.INCOME, icon: '📈', color: '#009688' },
  { name: 'Other Income', type: TransactionType.INCOME, icon: '📥', color: '#00BCD4' },
  { name: 'Rent/Mortgage', type: TransactionType.EXPENSE, icon: '🏠', color: '#F44336' },
  { name: 'Utilities', type: TransactionType.EXPENSE, icon: '⚡', color: '#FF5722' },
  { name: 'Groceries', type: TransactionType.EXPENSE, icon: '🛒', color: '#FF9800' },
  { name: 'Food & Dining', type: TransactionType.EXPENSE, icon: '🍽️', color: '#FFC107' },
  { name: 'Transportation', type: TransactionType.EXPENSE, icon: '🚗', color: '#FFEB3B' },
  { name: 'Healthcare', type: TransactionType.EXPENSE, icon: '🏥', color: '#E91E63' },
  { name: 'Insurance', type: TransactionType.EXPENSE, icon: '🛡️', color: '#9C27B0' },
  { name: 'Entertainment', type: TransactionType.EXPENSE, icon: '🎬', color: '#673AB7' },
  { name: 'Shopping', type: TransactionType.EXPENSE, icon: '🛍️', color: '#3F51B5' },
  { name: 'Education', type: TransactionType.EXPENSE, icon: '📚', color: '#2196F3' },
  { name: 'Subscriptions', type: TransactionType.EXPENSE, icon: '📱', color: '#03A9F4' },
  { name: 'Travel', type: TransactionType.EXPENSE, icon: '✈️', color: '#00ACC1' },
  { name: 'Personal Care', type: TransactionType.EXPENSE, icon: '💇', color: '#26A69A' },
  { name: 'Gifts/Donations', type: TransactionType.EXPENSE, icon: '🎁', color: '#66BB6A' },
  { name: 'Taxes', type: TransactionType.EXPENSE, icon: '📋', color: '#78909C' },
  { name: 'EMI/Loan', type: TransactionType.EXPENSE, icon: '🏦', color: '#8D6E63' },
  { name: 'Uncategorized', type: TransactionType.EXPENSE, icon: '❓', color: '#9E9E9E' },
];

async function main() {
  console.log('Seeding categories...');
  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: { ...cat, isDefault: true },
    });
  }
  console.log(`Seeded ${categories.length} categories.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

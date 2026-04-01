import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface CategorizationResult {
  categoryId: string | null;
  categoryName: string | null;
  confidence: number;
}

/**
 * Keyword rules: maps description keywords → category names.
 * Category names must match the seeded Category.name values.
 */
const KEYWORD_RULES: Array<{ keywords: string[]; category: string }> = [
  // Income
  { keywords: ['salary', 'payroll', 'wages'], category: 'Salary' },
  {
    keywords: ['freelance', 'consulting', 'contract work'],
    category: 'Freelance',
  },
  {
    keywords: ['dividend', 'interest earned', 'interest credit'],
    category: 'Investments',
  },
  { keywords: ['refund', 'cashback', 'cash back'], category: 'Other Income' },

  // Housing
  { keywords: ['rent', 'lease', 'housing'], category: 'Rent' },
  {
    keywords: [
      'electricity',
      'electric bill',
      'gas bill',
      'water bill',
      'utility',
      'power bill',
    ],
    category: 'Utilities',
  },

  // Food
  {
    keywords: [
      'grocery',
      'groceries',
      'supermarket',
      'walmart',
      'target',
      'costco',
      'big bazaar',
      'dmart',
    ],
    category: 'Groceries',
  },
  {
    keywords: [
      'restaurant',
      'dining',
      'cafe',
      'food delivery',
      'swiggy',
      'zomato',
      'uber eats',
      'doordash',
      'grubhub',
    ],
    category: 'Dining Out',
  },

  // Transport
  {
    keywords: [
      'uber',
      'lyft',
      'ola',
      'taxi',
      'cab',
      'metro',
      'bus',
      'train ticket',
      'fuel',
      'petrol',
      'gas station',
      'diesel',
    ],
    category: 'Transport',
  },

  // Shopping
  {
    keywords: [
      'amazon',
      'flipkart',
      'shopping',
      'online purchase',
      'ebay',
      'myntra',
    ],
    category: 'Shopping',
  },

  // Health
  {
    keywords: [
      'hospital',
      'doctor',
      'pharmacy',
      'medical',
      'health insurance',
      'clinic',
      'dental',
      'lab test',
    ],
    category: 'Healthcare',
  },

  // Entertainment
  {
    keywords: [
      'netflix',
      'spotify',
      'movie',
      'cinema',
      'disney',
      'hulu',
      'prime video',
      'youtube premium',
      'gaming',
    ],
    category: 'Entertainment',
  },

  // Education
  {
    keywords: [
      'tuition',
      'course',
      'udemy',
      'coursera',
      'school fee',
      'college',
      'book',
      'education',
    ],
    category: 'Education',
  },

  // Insurance
  {
    keywords: ['insurance', 'premium', 'lic', 'policy'],
    category: 'Insurance',
  },

  // Subscriptions
  {
    keywords: ['subscription', 'membership', 'annual fee', 'monthly plan'],
    category: 'Subscriptions',
  },

  // Transfer
  {
    keywords: [
      'transfer',
      'neft',
      'imps',
      'rtgs',
      'upi',
      'wire',
      'zelle',
      'venmo',
    ],
    category: 'Other Expense',
  },

  // EMI / Loans
  {
    keywords: ['emi', 'loan', 'mortgage', 'installment'],
    category: 'EMI/Loans',
  },
];

@Injectable()
export class RuleCategorizer {
  private readonly logger = new Logger(RuleCategorizer.name);
  private categoryCache: Map<string, string> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Categorize a transaction description using keyword matching.
   * Returns the best match with a confidence score.
   */
  async categorize(
    description: string,
    type: 'INCOME' | 'EXPENSE',
  ): Promise<CategorizationResult> {
    const lower = description.toLowerCase();

    // Find matching rule
    for (const rule of KEYWORD_RULES) {
      const matched = rule.keywords.some((kw) => lower.includes(kw));
      if (matched) {
        const categoryId = await this.getCategoryId(rule.category);
        if (categoryId) {
          return {
            categoryId,
            categoryName: rule.category,
            confidence: 0.75,
          };
        }
      }
    }

    // Fallback: assign generic category based on type
    const fallbackName = type === 'INCOME' ? 'Other Income' : 'Other Expense';
    const fallbackId = await this.getCategoryId(fallbackName);

    return {
      categoryId: fallbackId,
      categoryName: fallbackName,
      confidence: 0.3,
    };
  }

  /**
   * Batch categorize multiple transactions.
   */
  async categorizeMany(
    items: Array<{ description: string; type: 'INCOME' | 'EXPENSE' }>,
  ): Promise<CategorizationResult[]> {
    // Ensure cache is warm
    await this.warmCache();

    return Promise.all(
      items.map((item) => this.categorize(item.description, item.type)),
    );
  }

  private async getCategoryId(name: string): Promise<string | null> {
    await this.warmCache();
    return this.categoryCache?.get(name) ?? null;
  }

  private async warmCache(): Promise<void> {
    if (this.categoryCache) return;

    const categories = await this.prisma.category.findMany({
      select: { id: true, name: true },
    });

    this.categoryCache = new Map(categories.map((c) => [c.name, c.id]));
    this.logger.debug(`Cached ${categories.length} categories`);
  }
}

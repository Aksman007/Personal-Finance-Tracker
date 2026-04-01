import { Injectable, Logger } from '@nestjs/common';
import type { CategorizationResult } from './rule.categorizer.js';
import { RuleCategorizer } from './rule.categorizer.js';

/**
 * AI-powered categorizer using Claude API.
 * Falls back to RuleCategorizer when API key is not configured
 * or confidence threshold is not met.
 *
 * NOTE: Full implementation deferred to Sprint 4 (AI Integration).
 * For now, delegates entirely to RuleCategorizer.
 */
@Injectable()
export class AiCategorizer {
  private readonly logger = new Logger(AiCategorizer.name);

  constructor(private readonly ruleCategorizer: RuleCategorizer) {}

  async categorize(
    description: string,
    type: 'INCOME' | 'EXPENSE',
  ): Promise<CategorizationResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      this.logger.debug(
        'ANTHROPIC_API_KEY not set, falling back to rule categorizer',
      );
      return this.ruleCategorizer.categorize(description, type);
    }

    // TODO (Sprint 4): Call Claude API for smart categorization
    // - Send transaction description + list of categories
    // - Parse response for category name + confidence
    // - If confidence >= 0.7, use AI result
    // - Otherwise fall back to rule categorizer

    // For now, always fall back
    return this.ruleCategorizer.categorize(description, type);
  }

  async categorizeMany(
    items: Array<{ description: string; type: 'INCOME' | 'EXPENSE' }>,
  ): Promise<CategorizationResult[]> {
    return Promise.all(
      items.map((item) => this.categorize(item.description, item.type)),
    );
  }
}

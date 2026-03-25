import { Injectable } from '@nestjs/common';

@Injectable()
export class AiCategorizer {
  // TODO: Claude API integration for description -> category
  // TODO: Batch categorization support
  // TODO: Confidence threshold (>= 0.7 to accept)
  // TODO: Fallback to RuleCategorizer
}

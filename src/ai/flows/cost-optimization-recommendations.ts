'use server';
/**
 * @fileOverview A GenAI-powered cost optimization engine that analyzes LLM usage and provides recommendations to reduce spend.
 *
 * - costOptimizationRecommendations - A function that generates cost-saving recommendations based on LLM usage data.
 * - LLMUsageDataInput - The input type for the costOptimizationRecommendations function.
 * - CostOptimizationRecommendationsOutput - The return type for the costOptimizationRecommendations function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const LLMUsageDataInputSchema = z.object({
  usageSummary: z
    .string()
    .describe(
      'A detailed summary of the user\'s LLM usage patterns, including models used, task types, frequency, and current costs.'
    ),
});
export type LLMUsageDataInput = z.infer<typeof LLMUsageDataInputSchema>;

const CostOptimizationRecommendationsOutputSchema = z.object({
  recommendations: z.array(
    z.object({
      type: z
        .enum(['Model Downgrade', 'Prompt Caching', 'Provider Switching', 'Other'])
        .describe('The category of the recommendation.'),
      description: z.string().describe('A detailed explanation of the recommendation.'),
      potentialSavings: z
        .string()
        .describe('An estimate of the potential monthly savings (e.g., "$50/month", "15%").'),
    })
  ),
});
export type CostOptimizationRecommendationsOutput = z.infer<
  typeof CostOptimizationRecommendationsOutputSchema
>;

export async function costOptimizationRecommendations(
  input: LLMUsageDataInput
): Promise<CostOptimizationRecommendationsOutput> {
  return costOptimizationFlow(input);
}

const costOptimizationPrompt = ai.definePrompt({
  name: 'costOptimizationPrompt',
  input: { schema: LLMUsageDataInputSchema },
  output: { schema: CostOptimizationRecommendationsOutputSchema },
  prompt: `You are an intelligent Cost Optimization Engine for LLM usage. Your goal is to analyze the provided LLM usage summary and generate personalized recommendations to help the user reduce their monthly spend.

Consider the following types of recommendations:
- Model downgrades for simple tasks (e.g., using a cheaper model for summarization or text generation).
- Prompt caching opportunities for frequently asked or repetitive prompts.
- Provider switching suggestions if a cheaper alternative offers similar quality for specific tasks.
- Other general best practices for cost reduction.

Your recommendations should be actionable, clear, and include an estimated potential monthly saving.

LLM Usage Summary: {{{usageSummary}}}`,
});

const costOptimizationFlow = ai.defineFlow(
  {
    name: 'costOptimizationRecommendations',
    inputSchema: LLMUsageDataInputSchema,
    outputSchema: CostOptimizationRecommendationsOutputSchema,
  },
  async (input: any) => {
    const { output } = await costOptimizationPrompt(input);
    return output!;
  }
);

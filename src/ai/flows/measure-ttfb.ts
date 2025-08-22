'use server';
/**
 * @fileOverview This file defines a Genkit flow for measuring the Time to First Byte (TTFB) of a website.
 *
 * - measureTtfb - A function that takes a website URL and returns its TTFB in milliseconds.
 * - MeasureTtfbInput - The input type for the measureTtfb function.
 * - MeasureTtfbOutput - The return type for the measureTtfb function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { performance } from 'perf_hooks';

const MeasureTtfbInputSchema = z.object({
  url: z.string().describe('The URL of the website to measure.'),
});
export type MeasureTtfbInput = z.infer<typeof MeasureTtfbInputSchema>;

const MeasureTtfbOutputSchema = z.object({
  ttfb: z.number().describe('The Time to First Byte in milliseconds.'),
});
export type MeasureTtfbOutput = z.infer<typeof MeasureTtfbOutputSchema>;

export async function measureTtfb(input: MeasureTtfbInput): Promise<MeasureTtfbOutput> {
  return measureTtfbFlow(input);
}

const measureTtfbFlow = ai.defineFlow(
  {
    name: 'measureTtfbFlow',
    inputSchema: MeasureTtfbInputSchema,
    outputSchema: MeasureTtfbOutputSchema,
  },
  async ({ url }) => {
    try {
      const startTime = performance.now();
      const response = await fetch(url, { method: 'GET', cache: 'no-store' });
      // We only need the headers to arrive to calculate TTFB
      await response.body?.getReader().read();
      const endTime = performance.now();
      
      return {
        ttfb: Math.round(endTime - startTime),
      };
    } catch (error) {
      console.error(`Failed to measure TTFB for ${url}:`, error);
      // Return a high value or specific error code on failure
      return { ttfb: -1 }; 
    }
  }
);

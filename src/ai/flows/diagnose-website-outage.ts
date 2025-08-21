'use server';
/**
 * @fileOverview This file defines a Genkit flow for diagnosing website outages using AI.
 *
 * - diagnoseWebsiteOutage - A function that takes a website URL and its HTTP response as input, and returns an AI-generated diagnostic message explaining the potential reason for the outage.
 * - DiagnoseWebsiteOutageInput - The input type for the diagnoseWebsiteOutage function.
 * - DiagnoseWebsiteOutageOutput - The return type for the diagnoseWebsiteOutage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DiagnoseWebsiteOutageInputSchema = z.object({
  url: z.string().describe('The URL of the website that is down.'),
  httpResponse: z.string().describe('The HTTP response from the website.'),
});
export type DiagnoseWebsiteOutageInput = z.infer<typeof DiagnoseWebsiteOutageInputSchema>;

const DiagnoseWebsiteOutageOutputSchema = z.object({
  diagnosticMessage: z.string().describe('An AI-generated diagnostic message explaining the potential reason for the outage.'),
});
export type DiagnoseWebsiteOutageOutput = z.infer<typeof DiagnoseWebsiteOutageOutputSchema>;

export async function diagnoseWebsiteOutage(input: DiagnoseWebsiteOutageInput): Promise<DiagnoseWebsiteOutageOutput> {
  return diagnoseWebsiteOutageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'diagnoseWebsiteOutagePrompt',
  input: {schema: DiagnoseWebsiteOutageInputSchema},
  output: {schema: DiagnoseWebsiteOutageOutputSchema},
  prompt: `You are an expert website reliability engineer. Given a website URL and its HTTP response, you will provide a diagnostic message explaining the potential reason for the outage.

Website URL: {{{url}}}
HTTP Response: {{{httpResponse}}}

Diagnostic Message:`,
});

const diagnoseWebsiteOutageFlow = ai.defineFlow(
  {
    name: 'diagnoseWebsiteOutageFlow',
    inputSchema: DiagnoseWebsiteOutageInputSchema,
    outputSchema: DiagnoseWebsiteOutageOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

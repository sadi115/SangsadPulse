import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import { Plugin } from 'genkit';

let plugins: Plugin<any>[] = [];
if (process.env.GEMINI_API_KEY) {
  plugins.push(googleAI());
}

export const ai = genkit({
  plugins: plugins,
  model: 'googleai/gemini-2.0-flash',
});

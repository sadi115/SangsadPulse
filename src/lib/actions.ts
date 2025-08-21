'use server';

import { diagnoseWebsiteOutage } from '@/ai/flows/diagnose-website-outage';
import type { Website } from '@/lib/types';

type CheckStatusResult = Pick<Website, 'status' | 'httpResponse' | 'lastChecked'>;

export async function checkStatus(url: string): Promise<CheckStatusResult> {
  const headers = {
    'User-Agent': 'WebWatch/1.0 (+https://your-domain.com/bot)',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0',
  };

  try {
    // Use no-cache to ensure we're getting a fresh response
    const response = await fetch(url, { method: 'GET', redirect: 'follow', headers, cache: 'no-store' });
    const responseText = `${response.status} ${response.statusText}`;

    return {
      status: response.ok ? 'Up' : 'Down',
      httpResponse: responseText,
      lastChecked: new Date().toISOString(),
    };
  } catch (error: unknown) {
    let message = 'An unknown error occurred.';
    if (error instanceof Error) {
        message = error.message;
    }
    return {
      status: 'Down',
      httpResponse: message,
      lastChecked: new Date().toISOString(),
    };
  }
}

export async function getAIDiagnosis(input: {
  url: string;
  httpResponse: string;
}): Promise<{ diagnosis: string }> {
  try {
    const result = await diagnoseWebsiteOutage({
      url: input.url,
      httpResponse: input.httpResponse,
    });
    return { diagnosis: result.diagnosticMessage };
  } catch (error) {
    console.error('AI diagnosis failed:', error);
    return { diagnosis: 'AI analysis failed. Please try again.' };
  }
}

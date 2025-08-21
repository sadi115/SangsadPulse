'use server';

import { diagnoseWebsiteOutage } from '@/ai/flows/diagnose-website-outage';
import type { Website } from '@/lib/types';

type CheckStatusResult = Pick<Website, 'status' | 'httpResponse' | 'lastChecked' | 'latency'>;

export async function checkStatus(url: string): Promise<CheckStatusResult> {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  };

  try {
    const startTime = performance.now();
    
    let currentUrl = url;
    let response;
    let redirectCount = 0;
    const maxRedirects = 5;

    while(redirectCount < maxRedirects) {
        response = await fetch(currentUrl, { method: 'GET', headers, redirect: 'manual', cache: 'no-store' });

        if (response.status >= 300 && response.status < 400 && response.headers.has('location')) {
            let redirectUrl = response.headers.get('location')!;
            
            // Handle relative redirect URLs
            if (redirectUrl.startsWith('/')) {
                const origin = new URL(currentUrl).origin;
                redirectUrl = origin + redirectUrl;
            }
            
            currentUrl = redirectUrl;
            redirectCount++;
        } else {
            break; // Not a redirect, so we have our final response
        }
    }

    if (redirectCount >= maxRedirects) {
        throw new Error('Exceeded maximum number of redirects.');
    }


    const endTime = performance.now();
    const latency = Math.round(endTime - startTime);

    const responseText = `${response.status} ${response.statusText}`;

    return {
      status: response.ok ? 'Up' : 'Down',
      httpResponse: responseText,
      lastChecked: new Date().toISOString(),
      latency,
    };
  } catch (error: unknown) {
    let message = 'An unknown error occurred.';
    if (error instanceof Error) {
        // More specific error messages can be helpful
        if (error.cause) {
            message = `${error.message} (cause: ${String(error.cause)})`;
        } else {
            message = error.message;
        }
    }
    return {
      status: 'Down',
      httpResponse: message,
      lastChecked: new Date().toISOString(),
      latency: 0,
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

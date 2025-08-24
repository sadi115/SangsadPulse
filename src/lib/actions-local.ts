

'use client';

import type { Website } from '@/lib/types';

type CheckStatusResult = Pick<Website, 'status' | 'httpResponse' | 'lastChecked' | 'latency'>;

/**
 * Performs an HTTP check from the client's browser.
 */
export async function checkStatusLocal(website: Website): Promise<CheckStatusResult> {
    const { monitorType, url, keyword } = website;

    if (monitorType !== 'HTTP(s)' && monitorType !== 'HTTP(s) - Keyword') {
        return {
            status: 'Down',
            httpResponse: 'Unsupported monitor type for local check.',
            lastChecked: new Date().toISOString(),
            latency: 0,
        };
    }

    try {
        const startTime = performance.now();
        
        let finalUrl = url.includes('://') ? url : `http://${url}`;
        
        const response = await fetch(finalUrl, {
            method: 'GET',
            mode: 'cors', // Required for cross-origin requests, may be blocked by servers without proper headers
            cache: 'no-store',
            redirect: 'follow', // Fetch API handles redirects automatically
        });

        const endTime = performance.now();
        const latency = Math.max(1, Math.round(endTime - startTime));

        let responseText = `${response.status} ${response.statusText}`;
        let status: 'Up' | 'Down' = response.ok ? 'Up' : 'Down';

        if (monitorType === 'HTTP(s) - Keyword' && keyword) {
            const body = await response.text();
            if (body.includes(keyword)) {
                status = 'Up';
                responseText = `Keyword '${keyword}' found.`;
            } else {
                status = 'Down';
                responseText = `Keyword '${keyword}' not found.`;
            }
        }

        return {
            status: status,
            httpResponse: responseText,
            lastChecked: new Date().toISOString(),
            latency,
        };
    } catch (error: unknown) {
        let message = 'Request failed. This could be due to a network error or a CORS policy blocking the request from the browser. Check the browser console for more details.';
        if (error instanceof Error) {
            message = `Request failed: ${error.message}. Check browser console for CORS errors.`;
        }
        return {
            status: 'Down',
            httpResponse: message,
            lastChecked: new Date().toISOString(),
            latency: 0,
        };
    }
}

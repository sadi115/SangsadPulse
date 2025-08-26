
'use client';

import type { Website, HttpClient } from '@/lib/types';
import axios from 'axios';

type CheckStatusResult = Pick<Website, 'status' | 'httpResponse' | 'lastChecked' | 'latency'>;

/**
 * Performs a check from the client's browser. Only supports HTTP(s) types.
 */
export async function checkStatusLocal(website: Website, httpClient: HttpClient): Promise<CheckStatusResult> {
    const { monitorType, url, keyword, port, httpMethod } = website;

    if (monitorType !== 'HTTP(s)' && monitorType !== 'HTTP(s) - Keyword') {
        return {
            status: 'Down',
            httpResponse: `Unsupported monitor type for local check. Only HTTP(s) checks are possible from the browser.`,
            lastChecked: new Date().toISOString(),
            latency: 0,
        };
    }
    
    try {
        let finalUrl = url;
        const isIpAddress = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(url);

        if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
            if (isIpAddress) {
                finalUrl = `http://${finalUrl}`;
            } else {
                finalUrl = `https://${finalUrl}`;
            }
        }
        
        const urlObject = new URL(finalUrl);
        if (port && !urlObject.port) {
            urlObject.port = String(port);
        }
        const requestUrl = urlObject.toString();
        
        const startTime = performance.now();
        let responseStatus: number;
        let responseStatusText: string;
        let responseData: string = '';
        
        if (httpClient === 'axios') {
            const response = await axios({
                method: httpMethod || 'GET',
                url: requestUrl,
                timeout: 10000, // 10 seconds timeout
                validateStatus: () => true, // Allow all statuses
            });
            responseStatus = response.status;
            responseStatusText = response.statusText;
            responseData = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        } else {
            const response = await fetch(requestUrl, {
                method: httpMethod || 'GET',
                mode: 'cors', 
                cache: 'no-store',
                redirect: 'follow',
            });
            responseStatus = response.status;
            responseStatusText = response.statusText;
            if (monitorType === 'HTTP(s) - Keyword' && keyword) {
                 responseData = await response.text();
            }
        }

        const endTime = performance.now();
        const latency = Math.max(1, Math.round(endTime - startTime));

        let responseText = `${responseStatus} ${responseStatusText}`;
        let status: 'Up' | 'Down' = responseStatus >= 200 && responseStatus < 400 ? 'Up' : 'Down';

        if (monitorType === 'HTTP(s) - Keyword' && keyword) {
            if (responseData.includes(keyword)) {
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
        
        if (error instanceof TypeError) { // Catches fetch() CORS/network errors
             message = `Request failed: ${error.message}. Check browser console for CORS errors.`;
        } else if (axios.isAxiosError(error)) { // Catches axios CORS/network errors
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

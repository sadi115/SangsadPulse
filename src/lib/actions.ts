'use server';

import { diagnoseWebsiteOutage } from '@/ai/flows/diagnose-website-outage';
import { measureTtfb } from '@/ai/flows/measure-ttfb';
import type { Website } from '@/lib/types';
import net from 'net';

type CheckStatusResult = Pick<Website, 'status' | 'httpResponse' | 'lastChecked' | 'latency'>;

async function checkTcpPort(host: string, port: number): Promise<CheckStatusResult> {
  return new Promise((resolve) => {
    const startTime = performance.now();
    const socket = new net.Socket();

    socket.setTimeout(5000); // 5 second timeout

    socket.on('connect', () => {
      const endTime = performance.now();
      socket.destroy();
      resolve({
        status: 'Up',
        httpResponse: `Port ${port} is open`,
        lastChecked: new Date().toISOString(),
        latency: Math.round(endTime - startTime),
      });
    });

    socket.on('error', (err) => {
      socket.destroy();
      resolve({
        status: 'Down',
        httpResponse: `Port ${port} is closed or filtered. Reason: ${err.message}`,
        lastChecked: new Date().toISOString(),
        latency: 0,
      });
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({
        status: 'Down',
        httpResponse: `Connection to port ${port} timed out.`,
        lastChecked: new Date().toISOString(),
        latency: 0,
      });
    });

    socket.connect(port, host);
  });
}

async function checkHttp(website: Website): Promise<CheckStatusResult> {
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
        
        let currentUrl = website.url;
        let response;
        let redirectCount = 0;
        const maxRedirects = 5;

        while(redirectCount < maxRedirects) {
            response = await fetch(currentUrl, { method: 'GET', headers, redirect: 'manual', cache: 'no-store' });

            if (response.status >= 300 && response.status < 400 && response.headers.has('location')) {
                let redirectUrl = response.headers.get('location')!;
                
                if (redirectUrl.startsWith('/')) {
                    const origin = new URL(currentUrl).origin;
                    redirectUrl = origin + redirectUrl;
                }
                
                currentUrl = redirectUrl;
                redirectCount++;
            } else {
                break;
            }
        }

        if (redirectCount >= maxRedirects) {
            throw new Error('Exceeded maximum number of redirects.');
        }

        const endTime = performance.now();
        const latency = Math.round(endTime - startTime);

        let responseText = `${response.status} ${response.statusText}`;
        let status: 'Up' | 'Down' = response.ok ? 'Up' : 'Down';

        if (website.monitorType === 'HTTP(s) - Keyword' && website.keyword) {
             const body = await response.text();
             if (body.includes(website.keyword)) {
                 status = 'Up';
                 responseText = `Keyword '${website.keyword}' found.`;
             } else {
                 status = 'Down';
                 responseText = `Keyword '${website.keyword}' not found.`;
             }
        }


        return {
            status: status,
            httpResponse: responseText,
            lastChecked: new Date().toISOString(),
            latency,
        };
    } catch (error: unknown) {
        let message = 'An unknown error occurred.';
        if (error instanceof Error) {
            if ('cause' in error && error.cause) {
                const cause = error.cause as Record<string, string>;
                message = `Request failed: ${cause.code || error.message}`;
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

export async function checkStatus(website: Website): Promise<CheckStatusResult> {
  const { monitorType, url, port } = website;
  
  try {
      if (monitorType === 'Downtime') {
        return { status: 'Down', httpResponse: 'In scheduled downtime.', lastChecked: new Date().toISOString(), latency: 0 };
      }

      const urlObject = new URL(url.includes('://') ? url : `http://${url}`);
      const hostname = urlObject.hostname || url;

      switch(monitorType) {
        case 'TCP Port':
            if (!port) {
                return { status: 'Down', httpResponse: 'Port is not specified for TCP check', lastChecked: new Date().toISOString(), latency: 0 };
            }
            return checkTcpPort(hostname, port);
        case 'Ping':
            // Simulating ping with a TCP check to port 80 (or 443 for https) as ICMP is not straightforward in Node.js
            const pingPort = url.startsWith('https://') ? 443 : 80;
            const result = await checkTcpPort(hostname, pingPort);
            if(result.status === 'Up') {
                return { ...result, httpResponse: `Host is reachable` };
            }
            return { ...result, httpResponse: `Host is unreachable. Reason: ${result.httpResponse}` };
        case 'HTTP(s)':
        case 'HTTP(s) - Keyword':
        default:
            return checkHttp(website);
      }
  } catch (error) {
     let message = 'Invalid URL or Host.';
     if (error instanceof TypeError && error.message.includes('Invalid URL')) {
        // This is likely a hostname for TCP/Ping check that is not a valid URL.
        // We can proceed with the raw `url` as hostname.
        switch(monitorType) {
            case 'TCP Port':
                if (!port) {
                    return { status: 'Down', httpResponse: 'Port is not specified for TCP check', lastChecked: new Date().toISOString(), latency: 0 };
                }
                return checkTcpPort(url, port);
            case 'Ping':
                const result = await checkTcpPort(url, 80);
                 if(result.status === 'Up') {
                    return { ...result, httpResponse: `Host is reachable` };
                }
                return { ...result, httpResponse: `Host is unreachable. Reason: ${result.httpResponse}` };
            default:
                 return { status: 'Down', httpResponse: message, lastChecked: new Date().toISOString(), latency: 0 };
        }
     }
     return { status: 'Down', httpResponse: message, lastChecked: new Date().toISOString(), latency: 0 };
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

export async function getTtfb(input: { url: string }): Promise<{ ttfb: number }> {
    try {
        const result = await measureTtfb({ url: input.url });
        return result;
    } catch (error) {
        console.error('TTFB measurement failed:', error);
        return { ttfb: -1 };
    }
}

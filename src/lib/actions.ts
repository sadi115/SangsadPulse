

'use server';

import { measureTtfb } from '@/ai/flows/measure-ttfb';
import type { Website, HttpClient } from '@/lib/types';
import net from 'net';
import tls from 'tls';
import dns from 'dns';
import { promisify } from 'util';
import https from 'https';
import axios from 'axios';

type CheckStatusResult = Pick<Website, 'status' | 'httpResponse' | 'lastChecked' | 'latency'>;

const dnsResolve = promisify(dns.resolve);
const dnsResolveMx = promisify(dns.resolveMx);
const dnsResolveNs = promisify(dns.resolveNs);
const dnsResolveCname = promisify(dns.resolveCname);
const dnsReverse = promisify(dns.reverse);

const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
});


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
        latency: Math.max(1, Math.round(endTime - startTime)),
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

async function checkSslCertificate(host: string): Promise<CheckStatusResult> {
    return new Promise((resolve) => {
        const options = {
            host: host,
            port: 443,
            rejectUnauthorized: false, // We handle verification manually
        };
        const startTime = performance.now();

        try {
            const socket = tls.connect(options, () => {
                const cert = socket.getPeerCertificate();
                const endTime = performance.now();
                socket.destroy();

                if (!cert || Object.keys(cert).length === 0) {
                    resolve({
                        status: 'Down',
                        httpResponse: 'No SSL certificate found.',
                        lastChecked: new Date().toISOString(),
                        latency: 0,
                    });
                    return;
                }
                
                const validTo = new Date(cert.valid_to);
                const daysRemaining = Math.ceil((validTo.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

                if (daysRemaining <= 0) {
                    resolve({
                        status: 'Down',
                        httpResponse: `Certificate for ${host} expired ${Math.abs(daysRemaining)} days ago.`,
                        lastChecked: new Date().toISOString(),
                        latency: Math.max(1, Math.round(endTime - startTime)),
                    });
                } else if (daysRemaining <= 7) {
                     resolve({
                        status: 'Down', // Treat certs expiring soon as "Down" for alerting purposes
                        httpResponse: `Certificate expires in ${daysRemaining} days.`,
                        lastChecked: new Date().toISOString(),
                        latency: Math.max(1, Math.round(endTime - startTime)),
                    });
                }
                else {
                    resolve({
                        status: 'Up',
                        httpResponse: `Certificate is valid. Expires in ${daysRemaining} days.`,
                        lastChecked: new Date().toISOString(),
                        latency: Math.max(1, Math.round(endTime - startTime)),
                    });
                }
            });

            socket.on('error', (err) => {
                socket.destroy();
                resolve({
                    status: 'Down',
                    httpResponse: `SSL connection error: ${err.message}`,
                    lastChecked: new Date().toISOString(),
                    latency: 0,
                });
            });

            socket.setTimeout(5000, () => {
                socket.destroy();
                resolve({
                    status: 'Down',
                    httpResponse: 'SSL connection timed out.',
                    lastChecked: new Date().toISOString(),
                    latency: 0,
                });
            });

        } catch (error: any) {
             resolve({
                status: 'Down',
                httpResponse: `Failed to check SSL: ${error.message}`,
                lastChecked: new Date().toISOString(),
                latency: 0,
            });
        }
    });
}


async function checkHttp(website: Website, httpClient: HttpClient): Promise<CheckStatusResult> {
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
    };

    const attemptRequest = async (initialUrl: string) => {
        let currentUrl = initialUrl;
        if (!currentUrl.includes('://')) {
            try {
                // Try HTTPS first
                const httpsUrl = `https://${currentUrl}`;
                // Quick check if HTTPS works
                if (httpClient === 'axios') {
                    await axios.get(httpsUrl, { timeout: 5000, httpsAgent, maxRedirects: 0 });
                } else {
                    await fetch(httpsUrl, { method: 'HEAD', redirect: 'manual', cache: 'no-store' });
                }
                currentUrl = httpsUrl;
            } catch (e) {
                // Fallback to HTTP
                currentUrl = `http://${currentUrl}`;
            }
        }

        const startTime = performance.now();
        let responseStatus: number;
        let responseStatusText: string;
        let responseData: string = '';

        if (httpClient === 'axios') {
            const response = await axios.get(currentUrl, {
                headers,
                timeout: 10000,
                maxRedirects: 10,
                httpsAgent,
                validateStatus: () => true, // Accept any status code
            });
            responseStatus = response.status;
            responseStatusText = response.statusText;
            responseData = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        } else { // fetch
            const response = await fetch(currentUrl, {
                headers,
                redirect: 'follow',
                cache: 'no-store',
                // @ts-ignore
                agent: (url: URL) => (url.protocol === 'https:' ? httpsAgent : undefined)
            });
            responseStatus = response.status;
            responseStatusText = response.statusText;
            if (website.monitorType === 'HTTP(s) - Keyword' && website.keyword) {
                 responseData = await response.text();
            }
        }
        
        const endTime = performance.now();
        const latency = Math.max(1, Math.round(endTime - startTime));

        let responseText = `${responseStatus} ${responseStatusText}`;
        let status: 'Up' | 'Down' = responseStatus >= 200 && responseStatus < 400 ? 'Up' : 'Down';

        if (website.monitorType === 'HTTP(s) - Keyword' && website.keyword) {
             if (responseData.includes(website.keyword)) {
                 status = 'Up';
                 responseText = `Keyword '${website.keyword}' found.`;
             } else {
                 status = 'Down';
                 responseText = `Keyword '${website.keyword}' not found.`;
             }
        }
        
        return { status, httpResponse: responseText, latency };
    };

    try {
        const { status, httpResponse, latency } = await attemptRequest(website.url);
        return {
            status,
            httpResponse,
            lastChecked: new Date().toISOString(),
            latency,
        };
    } catch (error: any) {
        let message = 'An unknown error occurred.';
        if (axios.isAxiosError(error)) {
            message = `Request failed: ${error.code || error.message}`;
        } else if (error && typeof error === 'object' && 'cause' in error) {
            // Handle node-fetch errors which often have a 'cause' property
            const cause = error.cause as any;
            message = `Request failed: ${cause.code || cause.message || 'fetch failed'}`;
        } else if (error instanceof Error) {
             message = `Request failed: ${error.message}`;
        }
        return {
            status: 'Down',
            httpResponse: message,
            lastChecked: new Date().toISOString(),
            latency: 0,
        };
    }
}

async function checkDns(host: string): Promise<CheckStatusResult> {
    const isIpAddress = net.isIP(host) !== 0;
    const startTime = performance.now();
    try {
        if (isIpAddress) {
            // It's an IP, do a reverse lookup to check if the DNS server responds
            const hostnames = await dnsReverse(host);
            const endTime = performance.now();
            if (hostnames && hostnames.length > 0) {
                 return {
                    status: 'Up',
                    httpResponse: `Reverse DNS resolved successfully.`,
                    lastChecked: new Date().toISOString(),
                    latency: Math.max(1, Math.round(endTime - startTime)),
                };
            } else {
                 return {
                    status: 'Down',
                    httpResponse: 'Reverse DNS lookup failed.',
                    lastChecked: new Date().toISOString(),
                    latency: 0,
                };
            }
        } else {
            // It's a hostname, resolve it
            const records = await dnsResolve(host);
            const endTime = performance.now();

            if (records && records.length > 0) {
                return {
                    status: 'Up',
                    httpResponse: `DNS resolved successfully.`,
                    lastChecked: new Date().toISOString(),
                    latency: Math.max(1, Math.round(endTime - startTime)),
                };
            } else {
                return {
                    status: 'Down',
                    httpResponse: 'No DNS records found.',
                    lastChecked: new Date().toISOString(),
                    latency: 0,
                };
            }
        }
    } catch (error: any) {
        return {
            status: 'Down',
            httpResponse: `DNS resolution failed: ${error.code || error.message}`,
            lastChecked: new Date().toISOString(),
            latency: 0,
        };
    }
}

async function checkDnsLookup(host: string): Promise<CheckStatusResult> {
    const startTime = performance.now();
    try {
        const recordTypes = ['A', 'CNAME', 'MX', 'NS'];
        const results: { [key: string]: any[] } = {};
        let hasRecords = false;

        for (const type of recordTypes) {
            try {
                let records: any[] = [];
                switch (type) {
                    case 'A':
                        records = await dnsResolve(host);
                        break;
                    case 'CNAME':
                        records = await dnsResolveCname(host);
                        break;
                    case 'MX':
                        records = await dnsResolveMx(host);
                        break;
                    case 'NS':
                        records = await dnsResolveNs(host);
                        break;
                }
                if (records.length > 0) {
                    hasRecords = true;
                    results[type] = records;
                }
            } catch (error: any) {
                // Ignore errors for specific record types (e.g., NODATA)
                if (error.code !== 'ENODATA' && error.code !== 'ENOTFOUND') {
                   // console.warn(`DNS lookup for ${type} failed: ${error.message}`);
                }
            }
        }
        
        const endTime = performance.now();

        if (hasRecords) {
            let responseText = '';
            for (const [type, records] of Object.entries(results)) {
                responseText += `${type} Records:\n`;
                if (type === 'MX') {
                    responseText += records.map(r => `  - ${r.exchange} (prio: ${r.priority})`).join('\n');
                } else {
                    responseText += records.map(r => `  - ${r}`).join('\n');
                }
                responseText += '\n\n';
            }

            return {
                status: 'Up',
                httpResponse: responseText.trim(),
                lastChecked: new Date().toISOString(),
                latency: Math.max(1, Math.round(endTime - startTime)),
            };
        } else {
            return {
                status: 'Down',
                httpResponse: 'No DNS records found for the host.',
                lastChecked: new Date().toISOString(),
                latency: 0,
            };
        }

    } catch (error: any) {
        return {
            status: 'Down',
            httpResponse: `DNS lookup failed: ${error.message}`,
            lastChecked: new Date().toISOString(),
            latency: 0,
        };
    }
}



export async function checkStatus(website: Website, httpClient: HttpClient = 'fetch'): Promise<CheckStatusResult> {
  const { monitorType, url, port } = website;
  
  try {
      if (monitorType === 'Downtime') {
        return { status: 'Down', httpResponse: 'In scheduled downtime.', lastChecked: new Date().toISOString(), latency: 0 };
      }
      if (monitorType === 'WebSocket' || monitorType === 'Push' || monitorType === 'HTTP/2' || monitorType === 'HTTPS - Proxy') {
        return { status: 'Idle', httpResponse: 'This monitor type is not yet implemented.', lastChecked: new Date().toISOString(), latency: 0 };
      }

      let hostname = url;
      try {
        const urlObject = new URL(url.includes('://') ? url : `http://${url}`);
        hostname = urlObject.hostname || url;
      } catch (e) {
        hostname = url;
      }


      switch(monitorType) {
        case 'TCP Port':
            if (!port) {
                return { status: 'Down', httpResponse: 'Port is not specified for TCP check', lastChecked: new Date().toISOString(), latency: 0 };
            }
            return checkTcpPort(hostname, port);
        case 'Ping':
            const pingPort = url.startsWith('https://') ? 443 : 80;
            const result = await checkTcpPort(hostname, pingPort);
            if(result.status === 'Up') {
                return { ...result, httpResponse: `Host is reachable` };
            }
            return { ...result, httpResponse: `Host is unreachable. Reason: ${result.httpResponse}` };
        case 'DNS Records':
            return checkDns(hostname);
        case 'DNS Lookup':
            return checkDnsLookup(hostname);
        case 'SSL Certificate':
             return checkSslCertificate(hostname);
        case 'HTTP(s)':
        case 'HTTP(s) - Keyword':
        default:
            return checkHttp(website, httpClient);
      }
  } catch (error) {
     let message = 'Invalid URL or Host.';
     if (error instanceof TypeError && error.message.includes('Invalid URL')) {
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
            case 'DNS Records':
                return checkDns(url);
            default:
                 return { status: 'Down', httpResponse: message, lastChecked: new Date().toISOString(), latency: 0 };
        }
     }
     return { status: 'Down', httpResponse: message, lastChecked: new Date().toISOString(), latency: 0 };
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

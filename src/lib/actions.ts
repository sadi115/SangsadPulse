
'use server';

import { measureTtfb } from '@/ai/flows/measure-ttfb';
import type { Website, HttpClient, MonitorLocation, StatusHistory } from '@/lib/types';
import net from 'net';
import dns from 'dns';
import { promisify } from 'util';
import https from 'https';
import axios from 'axios';
import ky from 'ky';
import got from 'got';
import { request as undiciRequest, Agent } from 'undici';
import nodeFetch from 'node-fetch';
import type { RequestInit as NodeRequestInit } from 'node-fetch';
import { query } from './db';
import { format } from 'date-fns';


type CheckStatusResult = Pick<Website, 'status' | 'httpResponse' | 'lastChecked' | 'latency'> & { resolvedUrl?: string };

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

    socket.setTimeout(10000); // 10 second timeout

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

async function checkHttp(website: Website, httpClient: HttpClient): Promise<CheckStatusResult> {
    const { url, monitorType, keyword, httpMethod } = website;
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
        if (!currentUrl.startsWith('http://') && !currentUrl.startsWith('https://')) {
            currentUrl = `https://${currentUrl}`;
        }
        
        let responseStatus: number;
        let responseStatusText: string;
        let responseData: string = '';
        let finalUrlAfterRedirect = currentUrl;
        
        const startTime = performance.now();
        const originalRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED;

        try {
            if (httpClient === 'axios') {
                const response = await axios({
                    method: httpMethod || 'GET',
                    url: currentUrl,
                    headers,
                    timeout: 10000,
                    maxRedirects: 10,
                    httpsAgent,
                    validateStatus: () => true,
                });
                responseStatus = response.status;
                responseStatusText = response.statusText;
                responseData = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
                if (response.request.res.responseUrl) {
                    finalUrlAfterRedirect = response.request.res.responseUrl;
                }
            } else if (httpClient === 'fetch' || httpClient === 'ky') {
                process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
                 const fetchFn = httpClient === 'ky' ? ky : globalThis.fetch;
                 const response = await fetchFn(currentUrl, {
                    method: httpMethod || 'GET',
                    headers,
                    redirect: 'follow',
                    // @ts-ignore Ky-specific property
                    throwHttpErrors: false,
                    cache: 'no-store',
                 });
                responseStatus = response.status;
                responseStatusText = response.statusText;
                responseData = await response.text();
                finalUrlAfterRedirect = response.url;
            } else if (httpClient === 'got') {
                let gotUrl = currentUrl;
                if (gotUrl.startsWith('http://')) {
                    gotUrl = gotUrl.replace('http://', 'https://');
                }
                const response = await got(gotUrl, {
                    method: (httpMethod || 'GET') as 'GET' | 'POST' | 'HEAD',
                    headers,
                    timeout: { request: 10000 },
                    followRedirect: true,
                    throwHttpErrors: false,
                    https: { rejectUnauthorized: false },
                    retry: { limit: 0 },
                });
                responseStatus = response.statusCode;
                responseStatusText = response.statusMessage || '';
                responseData = response.body;
                finalUrlAfterRedirect = response.url;
            } else if (httpClient === 'undici') {
                const { statusCode, body, headers: responseHeaders } = await undiciRequest(currentUrl, {
                    method: (httpMethod || 'GET') as 'GET' | 'POST' | 'HEAD',
                    headers,
                    maxRedirections: 10,
                    bodyTimeout: 10000,
                    headersTimeout: 10000,
                    dispatcher: new Agent({ connect: { rejectUnauthorized: false, keepAlive: false } }),
                });
                responseStatus = statusCode;
                responseStatusText = ''; 
                responseData = await body.text();
                if (responseHeaders.location) {
                    finalUrlAfterRedirect = responseHeaders.location;
                }
            } else { // node-fetch
                const fetchOptions: NodeRequestInit = {
                    method: httpMethod || 'GET',
                    headers,
                    redirect: 'follow',
                    agent: httpsAgent,
                    timeout: 10000,
                };
                const response = await nodeFetch(currentUrl, fetchOptions);
                responseStatus = response.status;
                responseStatusText = response.statusText;
                responseData = await response.text();
                finalUrlAfterRedirect = response.url;
            }
        } finally {
            if (httpClient === 'ky' || httpClient === 'fetch') {
                process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalRejectUnauthorized;
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
        
        return { status, httpResponse: responseText, latency, resolvedUrl: finalUrlAfterRedirect };
    };

    try {
        const { status, httpResponse, latency, resolvedUrl } = await attemptRequest(url);
        return {
            status,
            httpResponse,
            lastChecked: new Date().toISOString(),
            latency,
            resolvedUrl,
        };
    } catch (error: any) {
        let message = 'An unknown error occurred.';
        if (axios.isAxiosError(error)) {
            message = `Request failed: ${error.code || error.message}`;
        } else if (error && typeof error === 'object' && 'cause' in error) {
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
                    httpResponse: `Reverse DNS resolved to: ${hostnames.join(', ')}`,
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
                    httpResponse: `DNS resolved to: ${records.join(', ')}`,
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
                if (error.code !== 'ENODATA' && error.code !== 'ENOTFOUND') {
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


export async function checkStatus(website: Website, httpClient: HttpClient = 'fetch', location: MonitorLocation): Promise<CheckStatusResult> {
  const { monitorType, url, port } = website;
  let result: CheckStatusResult;

  try {
      if (monitorType === 'Downtime') {
        result = { status: 'Down', httpResponse: 'In scheduled downtime.', lastChecked: new Date().toISOString(), latency: 0 };
      } else {
        let hostname = url;
        try {
          if (net.isIP(url) === 0 && (url.startsWith('http') || url.includes('.'))) {
              const urlObject = new URL(url.startsWith('http') ? url : `https://${url}`);
              hostname = urlObject.hostname;
          }
        } catch (e) {
            hostname = url;
        }

        switch(monitorType) {
          case 'TCP Port':
              if (!port) {
                  result = { status: 'Down', httpResponse: 'Port is not specified for TCP check', lastChecked: new Date().toISOString(), latency: 0 };
              } else {
                result = await checkTcpPort(hostname, port);
              }
              break;
          case 'DNS Records':
              result = await checkDns(hostname);
              break;
          case 'DNS Lookup':
              result = await checkDnsLookup(hostname);
              break;
          case 'HTTP(s)':
          case 'HTTP(s) - Keyword':
          default:
              result = await checkHttp(website, httpClient);
              break;
        }
      }
  } catch (error) {
     let message = 'Invalid URL or Host.';
     if (error instanceof TypeError && error.message.includes('Invalid URL')) {
        let hostname;
        try {
            hostname = new URL(url).hostname;
        } catch {
            hostname = url;
        }

        switch(monitorType) {
            case 'TCP Port':
                if (!port) {
                    result = { status: 'Down', httpResponse: 'Port is not specified for TCP check', lastChecked: new Date().toISOString(), latency: 0 };
                } else {
                    result = await checkTcpPort(hostname, port);
                }
                break;
            case 'DNS Records':
                result = await checkDns(hostname);
                break;
            case 'DNS Lookup':
                result = await checkDnsLookup(hostname);
                break;
            default:
                 result = { status: 'Down', httpResponse: message, lastChecked: new Date().toISOString(), latency: 0 };
                 break;
        }
     } else {
        result = { status: 'Down', httpResponse: message, lastChecked: new Date().toISOString(), latency: 0 };
     }
  }

  // Save the result to the database
  if (result.status === 'Up' || result.status === 'Down') {
      try {
        const sql = 'INSERT INTO monitoring_history (website_id, checked_at, status, latency, http_response, location) VALUES (?, ?, ?, ?, ?, ?)';
        const params = [
            website.id,
            result.lastChecked, // Already in ISO format
            result.status,
            result.latency,
            result.httpResponse,
            location
        ];
        await query(sql, params);
      } catch (dbError) {
        console.error(`Failed to save history to DB for ${website.name}:`, dbError);
      }
  }

  return result;
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

const MAX_LATENCY_HISTORY_UI = 50;

export async function getHistoryForWebsite(websiteId: string): Promise<{statusHistory: StatusHistory[], latencyHistory: { time: string, latency: number }[]}> {
  try {
    const sql = 'SELECT * FROM monitoring_history WHERE website_id = ? ORDER BY checked_at DESC';
    const rows = await query(sql, [websiteId]) as any[];

    const statusHistory = rows.map(row => ({
      time: new Date(row.checked_at).toISOString(),
      status: row.status as 'Up' | 'Down',
      latency: row.latency,
      reason: row.http_response
    }));
    
    const latencyHistory = statusHistory
      .map(h => ({ time: h.time, latency: h.latency }))
      .slice(0, MAX_LATENCY_HISTORY_UI)
      .reverse();

    return { statusHistory, latencyHistory };

  } catch (error) {
    console.error(`Failed to fetch history from DB for website ${websiteId}:`, error);
    return { statusHistory: [], latencyHistory: [] };
  }
}

export async function clearHistoryForWebsite(websiteId: string): Promise<{success: boolean}> {
    try {
        const sql = 'DELETE FROM monitoring_history WHERE website_id = ?';
        await query(sql, [websiteId]);
        return { success: true };
    } catch(error) {
        console.error(`Failed to clear history from DB for website ${websiteId}:`, error);
        return { success: false };
    }
}


'use client'

import type { Website } from '@/lib/types';
import { LatencyChart } from './latency-chart';
import { Clock, AlertCircle, BarChart2, Wand2, LinkIcon, Hash, Search } from 'lucide-react';
import { format } from 'date-fns';

type WebsiteCardDetailsProps = {
    website: Website;
};

export function WebsiteCardDetails({ website }: WebsiteCardDetailsProps) {
    const lastCheckedTime = website.lastChecked ? format(new Date(website.lastChecked), 'pp') : '';
    const lastDownTime = website.lastDownTime ? format(new Date(website.lastDownTime), 'pp') : '';

    return (
        <div className="bg-secondary/50 px-4 py-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <div className="space-y-2">
                    <h4 className="font-semibold text-base">Details</h4>
                    <div className="space-y-1 text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <LinkIcon className="h-4 w-4" />
                            <a href={website.url} target="_blank" rel="noopener noreferrer" className="hover:underline break-all">
                                {website.url}
                            </a>
                        </div>
                        {website.monitorType === 'TCP Port' && website.port && (
                            <div className="flex items-center gap-2">
                                <Hash className="h-4 w-4" />
                                <span>Port: {website.port}</span>
                            </div>
                        )}
                        {website.monitorType === 'HTTP(s) - Keyword' && website.keyword && (
                            <div className="flex items-center gap-2">
                                <Search className="h-4 w-4" />
                                <span>Keyword: "{website.keyword}"</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2" title={website.httpResponse}>
                            <AlertCircle className="h-4 w-4" />
                            <span>{website.httpResponse || 'No response yet'}</span>
                        </div>
                    </div>
                </div>
                 <div className="space-y-2">
                    <h4 className="font-semibold text-base">Timestamps</h4>
                     <div className="space-y-1 text-muted-foreground">
                         {website.lastChecked && (
                            <div className="flex items-center gap-2" title={format(new Date(website.lastChecked), 'PPpp')}>
                                <Clock className="h-4 w-4" />
                                <span>Last checked: {lastCheckedTime}</span>
                            </div>
                        )}
                        {website.lastDownTime && (
                            <div className="flex items-center gap-2 text-red-500/90" title={format(new Date(website.lastDownTime), 'PPpp')}>
                                <AlertCircle className="h-4 w-4" />
                                <span>Last down: {lastDownTime}</span>
                            </div>
                        )}
                     </div>
                 </div>

                {(website.latency !== undefined || website.averageLatency !== undefined) && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-base">Performance</h4>
                    <div className="flex items-center gap-2 text-muted-foreground" title="Current and average latency">
                        <BarChart2 className="h-4 w-4" />
                        <div className="flex items-center gap-4">
                            {website.latency !== undefined && <span>Latency: {website.latency} ms</span>}
                            {website.averageLatency !== undefined && <span>Avg: {website.averageLatency} ms</span>}
                        </div>
                    </div>
                  </div>
                )}
               
                {website.diagnosis && (
                    <div className="md:col-span-2 space-y-2">
                         <h4 className="font-semibold text-base">AI Diagnosis</h4>
                        <div className="flex items-start gap-3">
                            <Wand2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                            <p className="text-muted-foreground">{website.diagnosis}</p>
                        </div>
                    </div>
                )}
                {website.latencyHistory && website.latencyHistory.length > 1 && (
                     <div className="md:col-span-2 space-y-2">
                        <h4 className="font-semibold text-base">Latency History (ms)</h4>
                        <div className="h-32 w-full">
                           <LatencyChart data={website.latencyHistory} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

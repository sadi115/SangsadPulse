
'use client'
import type { Website } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { format } from 'date-fns';

type UptimeBarProps = {
    history?: Website['latencyHistory'];
    ['max-items']?: number;
}

export function UptimeBar({ history = [], ['max-items']: maxItems = 50 }: UptimeBarProps) {
    const bars = Array.from({ length: maxItems }).map((_, index) => {
        const historyItem = history[history.length - maxItems + index];
        if (!historyItem) {
            return { status: 'none', latency: 0, time: null };
        }
        return {
            status: historyItem.latency > 0 ? 'up' : 'down',
            latency: historyItem.latency,
            time: historyItem.time,
        };
    });

    return (
        <TooltipProvider>
            <div className="flex items-center justify-end h-6 gap-px">
                {bars.map((bar, index) => {
                    let barColor;
                    switch (bar.status) {
                        case 'up':
                            barColor = 'bg-green-500';
                            break;
                        case 'down':
                            barColor = 'bg-red-500';
                            break;
                        default:
                            barColor = 'bg-muted';
                    }
                    
                    return (
                        <Tooltip key={index} delayDuration={100}>
                            <TooltipTrigger asChild>
                                <div className={cn("w-1.5 h-full rounded-sm", barColor)}></div>
                            </TooltipTrigger>
                            <TooltipContent>
                                {bar.time ? (
                                    <div className="text-sm">
                                        <p className="font-bold capitalize">{bar.status}</p>
                                        <p>Latency: {bar.latency > 0 ? `${bar.latency} ms` : 'N/A'}</p>
                                        <p className="text-muted-foreground">
                                            Checked at: {format(new Date(bar.time), 'pp, dd MMM yy')}
                                        </p>
                                    </div>
                                ) : (
                                    <p>No data</p>
                                )}
                            </TooltipContent>
                        </Tooltip>
                    );
                })}
            </div>
        </TooltipProvider>
    );
}

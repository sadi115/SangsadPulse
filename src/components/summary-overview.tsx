'use client';
import type { Website } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell } from 'recharts';
import { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { AlertCircle, Clock } from 'lucide-react';
import { LatencyChart } from './latency-chart';

type SummaryOverviewProps = {
    websites: Website[];
};

const CHART_CONFIG = {
  up: {
    label: 'Up',
    color: 'hsl(142.1 76.2% 42.2%)', // green-600
  },
  down: {
    label: 'Down',
    color: 'hsl(0 84.2% 60.2%)', // red-500
  },
  checking: {
    label: 'Checking',
    color: 'hsl(47.9 95.8% 53.1%)', // yellow-500
  },
  idle: {
    label: 'Idle',
    color: 'hsl(215.4 16.3% 46.9%)', // slate-500
  },
   paused: {
    label: 'Paused',
    color: 'hsl(220 9% 46%)', // gray-500
  },
};


export function SummaryOverview({ websites }: SummaryOverviewProps) {
  const summary = useMemo(() => {
    return websites.reduce(
      (acc, site) => {
        if (site.isPaused) {
            acc['Paused']++;
        } else {
            acc[site.status]++;
        }
        return acc;
      },
      { Up: 0, Down: 0, Checking: 0, Idle: 0, Paused: 0, Total: websites.length }
    );
  }, [websites]);

  const chartData = [
    { name: 'Up', value: summary.Up, fill: CHART_CONFIG.up.color },
    { name: 'Down', value: summary.Down, fill: CHART_CONFIG.down.color },
    { name: 'Checking', value: summary.Checking, fill: CHART_CONFIG.checking.color },
    { name: 'Idle', value: summary.Idle, fill: CHART_CONFIG.idle.color },
    { name: 'Paused', value: summary.Paused, fill: CHART_CONFIG.paused.color },
  ].filter(d => d.value > 0);

  const lastDownService = useMemo(() => {
    // Find the service that went down most recently.
    return websites
      .filter(site => site.status === 'Down' && site.lastDownTime)
      .sort((a, b) => new Date(b.lastDownTime!).getTime() - new Date(a.lastDownTime!).getTime())[0];
  }, [websites]);

  const aggregatedLatencyData = useMemo(() => {
    const allLatencyPoints: { time: string; latency: number }[] = [];
    websites.forEach(site => {
      if (site.status === 'Up' && site.latencyHistory) {
        allLatencyPoints.push(...site.latencyHistory);
      }
    });

    // Simple aggregation for demonstration. For more accuracy, you'd group by time intervals.
    // This sorts by time and takes the most recent points.
    return allLatencyPoints
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
      .slice(-50); // Limit to last 50 data points for performance

  }, [websites]);

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Overall Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="h-48 md:h-56 flex items-center justify-center">
                {websites.length > 0 ? (
                    <ChartContainer config={CHART_CONFIG} className="w-full h-full">
                         <PieChart>
                            <ChartTooltip
                                cursor={false}
                                content={<ChartTooltipContent hideLabel />}
                            />
                            <Pie
                                data={chartData}
                                dataKey="value"
                                nameKey="name"
                                innerRadius={60}
                                outerRadius={80}
                                strokeWidth={2}
                                stroke="hsl(var(--background))"
                                labelLine={false}
                                label={({
                                    cx,
                                    cy,
                                    midAngle,
                                    innerRadius,
                                    outerRadius,
                                    value,
                                    index,
                                }) => {
                                    const RADIAN = Math.PI / 180
                                    const radius = 12 + innerRadius + (outerRadius - innerRadius)
                                    const x = cx + radius * Math.cos(-midAngle * RADIAN)
                                    const y = cy + radius * Math.sin(-midAngle * RADIAN)

                                    return (
                                    <text
                                        x={x}
                                        y={y}
                                        className="fill-muted-foreground text-xs"
                                        textAnchor={x > cx ? 'start' : 'end'}
                                        dominantBaseline="central"
                                    >
                                        {chartData[index].name} ({value})
                                    </text>
                                    )
                                }}
                            >
                                {chartData.map((entry) => (
                                    <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ChartContainer>
                ) : (
                    <p className="text-muted-foreground">No data to display.</p>
                )}
            </div>
            <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-secondary rounded-lg border">
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-3xl font-bold">{summary.Total}</p>
                </div>
                <div className="p-4 bg-secondary rounded-lg border">
                    <p className="text-sm text-muted-foreground">Up</p>
                    <p className="text-3xl font-bold text-green-500">{summary.Up}</p>
                </div>
                 <div className="p-4 bg-secondary rounded-lg border">
                    <p className="text-sm text-muted-foreground">Down</p>
                    <p className="text-3xl font-bold text-red-500">{summary.Down}</p>
                </div>
                <div className="p-4 bg-secondary rounded-lg border">
                    <p className="text-sm text-muted-foreground">Paused</p>
                    <p className="text-3xl font-bold text-gray-500">{summary.Paused}</p>
                </div>
                <div className="p-4 bg-secondary rounded-lg border col-span-2 sm:col-span-2">
                     <p className="text-sm text-muted-foreground">Last Down Service</p>
                    {lastDownService ? (
                         <div className="flex flex-col items-center justify-center h-full pt-2">
                             <p className="text-lg font-semibold text-foreground truncate" title={lastDownService.name}>
                                 {lastDownService.name}
                             </p>
                            <div className="text-xs text-muted-foreground space-y-1 mt-1">
                                <div className='flex items-center gap-1.5'>
                                    <Clock className="h-3 w-3" />
                                    <span>{formatDistanceToNow(new Date(lastDownService.lastDownTime!), { addSuffix: true })}</span>
                                </div>
                                <div className='flex items-center gap-1.5' title={lastDownService.httpResponse}>
                                     <AlertCircle className="h-3 w-3 text-red-500" />
                                     <span className='truncate'>{lastDownService.httpResponse}</span>
                                </div>
                            </div>
                         </div>
                    ) : (
                        <p className="text-lg font-semibold text-foreground truncate h-full flex items-center justify-center">
                          N/A
                        </p>
                    )}
                </div>
            </div>
        </div>
         {aggregatedLatencyData.length > 0 && (
          <div className="pt-4">
            <h3 className="text-lg font-semibold mb-2 text-center">Average Latency (ms)</h3>
            <div className="h-48 w-full">
              <LatencyChart data={aggregatedLatencyData} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

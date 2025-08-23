
'use client';
import React from 'react';
import type { Website } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { PieChart, Pie, Cell, Label } from 'recharts';
import { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { AlertCircle, Clock, ServerOff } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Skeleton } from './ui/skeleton';

type SummaryOverviewProps = {
    websites: Website[];
    isLoading: boolean;
};

const CHART_CONFIG = {
  up: {
    label: 'Up',
    color: 'hsl(142.1 76.2% 36.3%)', // green-500
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
    color: 'hsl(215.4 16.3% 46.9%)', // muted-foreground
  },
   paused: {
    label: 'Paused',
    color: 'hsl(220 8.9% 46.1%)', // gray-500
  },
} satisfies ChartConfig;


export function SummaryOverview({ websites, isLoading }: SummaryOverviewProps) {
  const { summary, chartData, lastDownService, currentlyDownServices } = useMemo(() => {
    const summaryData = websites.reduce(
      (acc, site) => {
        if (site.isPaused) {
            acc['Paused']++;
        } else if (site.status === 'Up') {
            acc['Up']++;
        } else if (site.status === 'Down') {
            acc['Down']++;
        } else {
            acc[site.status]++;
        }
        return acc;
      },
      { Up: 0, Down: 0, Checking: 0, Idle: 0, Paused: 0, Total: websites.length }
    );

    const chartData = [
        { name: 'Up', value: summaryData.Up, fill: 'var(--color-up)' },
        { name: 'Down', value: summaryData.Down, fill: 'var(--color-down)' },
        { name: 'Checking', value: summaryData.Checking, fill: 'var(--color-checking)' },
        { name: 'Idle', value: summaryData.Idle, fill: 'var(--color-idle)' },
        { name: 'Paused', value: summaryData.Paused, fill: 'var(--color-paused)' },
    ].filter(d => d.value > 0);

    const downSites = websites.filter(site => site.status === 'Down' && site.lastDownTime);

    const lastDown = downSites.sort((a, b) => new Date(b.lastDownTime!).getTime() - new Date(a.lastDownTime!).getTime())[0];
    
    return {
        summary: summaryData,
        chartData,
        lastDownService: lastDown,
        currentlyDownServices: downSites
    };
  }, [websites]);
  
  const totalMonitors = websites.length;

  if (isLoading) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-center">Service Summary</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                    <div className="h-48 md:h-56 flex flex-col items-center justify-center">
                        <Skeleton className="h-40 w-40 rounded-full" />
                    </div>
                    <div className="lg:col-span-2 space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-[92px] rounded-lg" />
                            ))}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <Skeleton className="h-[108px] rounded-lg" />
                           <Skeleton className="h-[108px] rounded-lg" />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center">Service Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            <div className="h-48 md:h-56 flex flex-col items-center justify-center">
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
                                outerRadius={80}
                                innerRadius={50}
                                strokeWidth={2}
                                stroke="hsl(var(--background))"
                                labelLine={false}
                                label={({
                                  payload,
                                  x,
                                  y,
                                  cx,
                                  cy,
                                }) => {
                                  const { name, value } = payload;
                                  let className = 'fill-muted-foreground text-xs';
                                  if (name === 'Up') {
                                    className = 'fill-green-500 text-xs font-medium';
                                  } else if (name === 'Down') {
                                     className = 'fill-red-500 text-xs font-medium';
                                  }

                                  return (
                                    <text
                                      x={x}
                                      y={y}
                                      className={className}
                                      textAnchor={x > cx ? "start" : "end"}
                                      dominantBaseline="central"
                                    >
                                      {name} ({value})
                                    </text>
                                  )
                                }}
                            >
                                <Label
                                  content={({ viewBox }) => {
                                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                      return (
                                        <>
                                            <text
                                            x={viewBox.cx}
                                            y={viewBox.cy}
                                            textAnchor="middle"
                                            dominantBaseline="middle"
                                            className="fill-foreground text-3xl font-bold"
                                            >
                                            {totalMonitors}
                                            </text>
                                            <text
                                                x={viewBox.cx}
                                                y={(viewBox.cy || 0) + 20}
                                                textAnchor="middle"
                                                dominantBaseline="middle"
                                                className="fill-muted-foreground text-sm"
                                            >
                                                Total
                                            </text>
                                        </>
                                      )
                                    }
                                  }}
                                />
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
            <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
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
                     <div className="p-4 bg-secondary rounded-lg border">
                        <p className="text-sm text-muted-foreground">Checking</p>
                        <p className="text-3xl font-bold text-yellow-500">{summary.Checking + summary.Idle}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-base font-medium">Last Down Event</CardTitle>
                             <Clock className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                             {lastDownService ? (
                                <div className="space-y-1 text-sm">
                                    <p className="font-semibold text-foreground truncate" title={lastDownService.name}>
                                        {lastDownService.name}
                                    </p>
                                    <p className="text-muted-foreground">
                                        {formatDistanceToNow(new Date(lastDownService.lastDownTime!), { addSuffix: true })}
                                    </p>
                                    <p className="text-muted-foreground truncate" title={lastDownService.httpResponse}>
                                        {lastDownService.httpResponse}
                                    </p>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground pt-2">All services are up.</p>
                            )}
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-base font-medium">Currently Down</CardTitle>
                            <ServerOff className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            {currentlyDownServices.length > 0 ? (
                                <ScrollArea className="h-24">
                                    <div className="space-y-2">
                                    {currentlyDownServices.map((service, index) => (
                                        <React.Fragment key={service.id}>
                                            <div className="text-sm">
                                                <p className="font-semibold text-foreground truncate" title={service.name}>{service.name}</p>
                                                <p className="text-xs text-muted-foreground truncate" title={service.httpResponse}>{service.httpResponse}</p>
                                            </div>
                                            {index < currentlyDownServices.length - 1 && <Separator />}
                                        </React.Fragment>
                                    ))}
                                    </div>
                                </ScrollArea>
                            ) : (
                                <p className="text-sm text-muted-foreground pt-2">No services are currently down.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

            </div>
        </div>
      </CardContent>
    </Card>
  );
}

    
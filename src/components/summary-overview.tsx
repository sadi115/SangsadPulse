'use client';
import type { Website } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartStyle } from '@/components/ui/chart';
import { PieChart, Pie, Cell } from 'recharts';
import { useMemo } from 'react';

type SummaryOverviewProps = {
    websites: Website[];
};

const CHART_CONFIG = {
  up: {
    label: 'Up',
    color: 'hsl(var(--chart-2))',
  },
  down: {
    label: 'Down',
    color: 'hsl(var(--chart-5))',
  },
  checking: {
    label: 'Checking',
    color: 'hsl(var(--chart-4))',
  },
  idle: {
    label: 'Idle',
    color: 'hsl(var(--muted))',
  },
};


export function SummaryOverview({ websites }: SummaryOverviewProps) {
  const summary = useMemo(() => {
    return websites.reduce(
      (acc, site) => {
        acc[site.status]++;
        return acc;
      },
      { Up: 0, Down: 0, Checking: 0, Idle: 0, Total: websites.length }
    );
  }, [websites]);

  const chartData = [
    { name: 'Up', value: summary.Up, fill: CHART_CONFIG.up.color },
    { name: 'Down', value: summary.Down, fill: CHART_CONFIG.down.color },
    { name: 'Checking', value: summary.Checking, fill: CHART_CONFIG.checking.color },
    { name: 'Idle', value: summary.Idle, fill: CHART_CONFIG.idle.color },
  ].filter(d => d.value > 0);

  const lastDownService = useMemo(() => {
    // Find the most recently checked "Down" service
    return websites
      .filter(site => site.status === 'Down' && site.lastChecked)
      .sort((a, b) => new Date(b.lastChecked!).getTime() - new Date(a.lastChecked!).getTime())[0];
  }, [websites]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Overall Summary</CardTitle>
      </CardHeader>
      <CardContent>
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
                <div className="p-4 bg-card rounded-lg border">
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-3xl font-bold">{summary.Total}</p>
                </div>
                <div className="p-4 bg-card rounded-lg border">
                    <p className="text-sm text-muted-foreground">Up</p>
                    <p className="text-3xl font-bold text-green-500">{summary.Up}</p>
                </div>
                 <div className="p-4 bg-card rounded-lg border">
                    <p className="text-sm text-muted-foreground">Down</p>
                    <p className="text-3xl font-bold text-red-500">{summary.Down}</p>
                </div>
                <div className="p-4 bg-card rounded-lg border col-span-2 sm:col-span-3">
                     <p className="text-sm text-muted-foreground">Last Service Down</p>
                    <p className="text-lg font-semibold text-foreground truncate">
                        {lastDownService ? new URL(lastDownService.url).hostname : 'N/A'}
                    </p>
                </div>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}

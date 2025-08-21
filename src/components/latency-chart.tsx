'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format } from 'date-fns';

type LatencyChartProps = {
  data: { time: string; latency: number }[];
};

export function LatencyChart({ data }: LatencyChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
        margin={{
          top: 5,
          right: 20,
          left: -10,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
        <XAxis
          dataKey="time"
          tickFormatter={(time) => format(new Date(time), 'HH:mm')}
          fontSize={10}
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
          axisLine={{ stroke: 'hsl(var(--border))' }}
          tickLine={{ stroke: 'hsl(var(--border))' }}
        />
        <YAxis
          fontSize={10}
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
          axisLine={{ stroke: 'hsl(var(--border))' }}
          tickLine={{ stroke: 'hsl(var(--border))' }}
        />
        <Tooltip
          contentStyle={{
            background: 'hsl(var(--background))',
            borderColor: 'hsl(var(--border))',
            fontSize: '12px',
          }}
          labelFormatter={(label) => format(new Date(label), 'PPpp')}
        />
        <Line
          type="monotone"
          dataKey="latency"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

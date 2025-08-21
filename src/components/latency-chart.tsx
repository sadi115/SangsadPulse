'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
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
          tickFormatter={(time) => format(new Date(time), 'hh:mm:ss a')}
          fontSize={10}
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
          axisLine={{ stroke: 'hsl(var(--border))' }}
          tickLine={{ stroke: 'hsl(var(--border))' }}
          interval="preserveStartEnd"
        />
        <YAxis
          fontSize={10}
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
          axisLine={{ stroke: 'hsl(var(--border))' }}
          tickLine={{ stroke: 'hsl(var(--border))' }}
          domain={['auto', 'auto']}
          label={{ value: 'ms', position: 'insideTopLeft', dy: -10, fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
        />
        <Tooltip
          contentStyle={{
            background: 'hsl(var(--card))',
            borderColor: 'hsl(var(--border))',
            fontSize: '12px',
            borderRadius: 'var(--radius)',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          }}
          labelStyle={{ fontWeight: 'bold' }}
          itemStyle={{ color: 'hsl(var(--primary))' }}
          labelFormatter={(label) => format(new Date(label), 'PP hh:mm:ss a')}
          formatter={(value: number) => [`${value} ms`, 'Latency']}
        />
        <Line
          type="monotone"
          dataKey="latency"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={{
            r: 2,
            fill: 'hsl(var(--primary))',
            strokeWidth: 1,
            stroke: 'hsl(var(--background))'
          }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

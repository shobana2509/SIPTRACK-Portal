import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface ChartSeries {
  key: string;
  label: string;
  color: string;
}

interface LineAreaChartProps {
  data: any[];
  series: ChartSeries[];
  xAxisKey?: string;
  valueFormatter?: (value: number) => string;
}

export function LineAreaChart({ data, series, xAxisKey = "date", valueFormatter }: LineAreaChartProps) {
  const chartConfig = series.reduce((acc, s) => ({
    ...acc,
    [s.key]: {
      label: s.label,
      color: s.color,
    },
  }), {});

  const formatFn = valueFormatter || ((value: number) => `${value}`);

  return (
    <div className="w-full h-[350px] mt-4">
      <ChartContainer config={chartConfig} className="aspect-auto h-full w-full">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 30, left: 45, bottom: 30 }}
        >
          <defs>
            {series.map(s => (
              <linearGradient key={`color-${s.key}`} id={`color-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={s.color} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={s.color} stopOpacity={0}/>
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} vertical={false} />
          <XAxis
            dataKey={xAxisKey}
            tickLine={false}
            axisLine={false}
            tickMargin={12}
            tick={{ fontSize: 11 }}
            minTickGap={30}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={12}
            tickFormatter={formatFn}
            width={60}
          />
          <ChartTooltip 
            content={
              <ChartTooltipContent 
                formatter={(value) => formatFn(Number(value))}
              />
            } 
          />
          <Legend 
            verticalAlign="top" 
            height={36} 
            iconType="circle"
            wrapperStyle={{ paddingTop: '0px', paddingBottom: '20px' }}
          />
          {series.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={3}
              fillOpacity={1}
              fill={`url(#color-${s.key})`}
              animationDuration={1500}
            />
          ))}
        </AreaChart>
      </ChartContainer>
    </div>
  );
}

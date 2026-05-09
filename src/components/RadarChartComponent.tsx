import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface ChartSeries {
  key: string;
  label: string;
  color: string;
}

interface RadarChartProps {
  data: any[];
  series: ChartSeries[];
  xAxisKey?: string;
  valueFormatter?: (value: number) => string;
}

export function RadarChartComponent({ data, series, xAxisKey = "subject", valueFormatter }: RadarChartProps) {
  const chartConfig = series.reduce((acc, s) => ({
    ...acc,
    [s.key]: {
      label: s.label,
      color: s.color,
    },
  }), {});

  const formatFn = valueFormatter || ((value: number) => `${value}`);

  return (
    <div className="w-full h-[400px] mt-4">
      <ChartContainer config={chartConfig} className="mx-auto aspect-[1.2] w-full max-w-[600px]">
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
          <PolarGrid opacity={0.3} />
          <PolarAngleAxis 
            dataKey={xAxisKey} 
            tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }}
          />
          <PolarRadiusAxis 
            angle={30} 
            domain={[0, 'auto']} 
            tickFormatter={formatFn}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          />
          <ChartTooltip 
            content={
              <ChartTooltipContent 
                 formatter={(value, name) => [formatFn(Number(value)), series.find(s => s.key === name)?.label || name]}
                 hideLabel={false}
              />
            } 
          />
          <Legend 
             verticalAlign="bottom" 
             height={36} 
             iconType="circle"
             wrapperStyle={{ paddingTop: '20px' }}
          />
          {series.map((s) => (
            <Radar
              key={s.key}
              name={s.label}
              dataKey={s.key}
              stroke={s.color}
              strokeWidth={2}
              fill={s.color}
              fillOpacity={0.4}
              animationDuration={2000}
            />
          ))}
        </RadarChart>
      </ChartContainer>
    </div>
  );
}

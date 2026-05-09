import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface DataItem {
  name: string;
  value: number;
  color?: string;
}

interface DonutChartProps {
  data: DataItem[];
  valueFormatter?: (value: number) => string;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--info))', 'hsl(var(--warning))', 'hsl(var(--success))', 'hsl(var(--destructive))'];

export function DonutChart({ data, valueFormatter }: DonutChartProps) {
  const chartConfig = data.reduce((acc, item, index) => {
    return {
      ...acc,
      [item.name]: {
        label: item.name,
        color: item.color || COLORS[index % COLORS.length],
      },
    };
  }, {});

  const formatFn = valueFormatter || ((value: number) => `${value}`);

  return (
    <div className="w-full h-[300px] mt-4">
      <ChartContainer config={chartConfig} className="mx-auto aspect-[1.5] w-full max-w-[400px]">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius="60%"
            outerRadius="80%"
            paddingAngle={5}
            dataKey="value"
            animationDuration={1500}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <ChartTooltip
            content={
              <ChartTooltipContent 
                formatter={(value) => formatFn(Number(value))}
                hideLabel
              />
            }
          />
          <Legend 
            verticalAlign="bottom" 
            height={36} 
            iconType="circle"
            wrapperStyle={{ paddingTop: '20px' }}
          />
        </PieChart>
      </ChartContainer>
    </div>
  );
}

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, Rectangle } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatIndianCurrency } from "@/lib/formatCurrency";

interface ChartSeries {
  key: string;
  label: string;
  color: string;
}

interface TrendChartProps {
  data: any[];
  series: ChartSeries[];
  xAxisKey?: string;
  layout?: "horizontal" | "vertical";
  valueFormatter?: (value: number) => string;
}

export function TrendChart({ data, series, xAxisKey = "date", layout = "horizontal", valueFormatter }: TrendChartProps) {
  const parsedData = data.map(item => {
    const newItem = { ...item };
    series.forEach(s => {
      if (newItem[s.key] !== undefined && newItem[s.key] !== null) {
        newItem[s.key] = Number(newItem[s.key]) || 0;
      }
    });
    return newItem;
  });

  const chartConfig = series.reduce((acc, s) => ({
    ...acc,
    [s.key]: {
      label: s.label,
      color: s.color,
    },
  }), {});

  const defaultFormatter = (value: number) => {
    if (value >= 10000000) return `Rs. ${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `Rs. ${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `Rs. ${(value / 1000).toFixed(1)}k`.replace('.0', '');
    return `Rs. ${value}`;
  };

  const formatFn = valueFormatter || defaultFormatter;

  const isVertical = layout === "vertical";

  const CustomBar = (props: any) => {
    const { value, x, y, width, height, fill } = props;

    // Parse value safely — covers number 0, string "0", null, undefined
    const numericValue = Number(value);

    // Hide completely if value is 0 or not a valid number
    // Also guard against Recharts rendering a 0-dimension bar (double safety net)
    const isVertical = layout === "vertical";
    const dimensionIsZero = isVertical ? (width === 0 || width == null) : (height === 0 || height == null);
    if (numericValue === 0 || isNaN(numericValue) || dimensionIsZero) return null;

    // If the rendered bar is too thin to see (< 3px), show a mild 2px indicator line
    const tooSmall = isVertical ? width < 3 : height < 3;

    if (tooSmall) {
      return (
        <Rectangle
          {...props}
          width={isVertical ? 2 : width}
          height={isVertical ? height : 2}
          x={x}
          y={isVertical ? y : y + height - 2}
          fill={fill}
          opacity={0.6}
        />
      );
    }

    return <Rectangle {...props} />;
  };

  const containerHeight = isVertical ? Math.max(500, data.length * 55) : 350;

  return (
    <div className={`w-full mt-4 ${isVertical ? 'max-h-[500px] overflow-y-auto overflow-x-hidden scrollbar-thin pr-2' : ''}`}>
      <div style={{ height: containerHeight }} className="w-full">
        <ChartContainer config={chartConfig} className="aspect-auto h-full w-full">
          <BarChart
            data={parsedData}
            layout={layout}
            margin={{
              top: 10,
              right: 30,
              left: isVertical ? 0 : 45,
              bottom: isVertical ? 10 : 30
            }}
          >
            <CartesianGrid vertical={isVertical} strokeDasharray="3 3" opacity={0.3} />
            {isVertical ? (
              <>
                <XAxis type="number" tickFormatter={formatFn} hide={false} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey={xAxisKey}
                  width={95}
                  tickFormatter={(val: any) => typeof val === 'string' ? val.replace(/^SIPCOT\s+/i, '').substring(0, 15) + (val.replace(/^SIPCOT\s+/i, '').length > 15 ? '...' : '') : val}
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
              </>
            ) : (
              <>
                <XAxis
                  dataKey={xAxisKey}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={12}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={12}
                  tickFormatter={formatFn}
                  width={60}
                />
              </>
            )}
            <ChartTooltip
              cursor={{ fill: 'transparent', strokeDasharray: '3 3' }}
              content={
                <ChartTooltipContent
                  hideLabel
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
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                fill={s.color}
                radius={isVertical ? [0, 4, 4, 0] : [4, 4, 0, 0]}
                shape={<CustomBar />}
                animationDuration={1500}
              />
            ))}
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  );
}

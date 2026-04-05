import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, LineChart, Line, Area, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface ExpenseChartProps {
  data: Array<{ name: string; value: number; color?: string }>;
  type?: 'pie' | 'bar' | 'line';
  height?: number;
}

const COLORS = ['hsl(211, 100%, 50%)', 'hsl(149, 100%, 57%)', 'hsl(0, 91%, 71%)', 'hsl(45, 93%, 58%)', 'hsl(270, 50%, 60%)'];

export function ExpenseChart({ data, type = 'pie', height = 200 }: ExpenseChartProps) {
  const chartConfig = data.reduce((config: any, item: any, index: number) => {
    config[item.name] = {
      label: item.name,
      color: item.color || COLORS[index % COLORS.length],
    };
    return config;
  }, {} as any);

  if (type === 'pie') {
    return (
      <div className="w-full" style={{ height: `${height}px` }}>
        <ChartContainer config={chartConfig} className="w-full h-full">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={height * 0.15}
              outerRadius={height * 0.35}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent />} />
          </PieChart>
        </ChartContainer>
      </div>
    );
  }

  if (type === 'bar') {
    return (
      <div className="w-full" style={{ height: `${height}px` }}>
        <ChartContainer config={chartConfig} className="w-full h-full">
          <BarChart data={data} margin={{ left: -20, right: 10, top: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.1)" />
            <XAxis 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 500 }}
              interval={0}
              tickFormatter={(value) => value.length > 10 ? `${value.substring(0, 8)}...` : value}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 500 }}
            />
            <Bar 
              dataKey="value" 
              fill="hsl(var(--primary))" 
              radius={[6, 6, 0, 0]} 
              barSize={32}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
          </BarChart>
        </ChartContainer>
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height: `${height}px` }}>
      <ChartContainer config={chartConfig} className="w-full h-full">
        <LineChart data={data} margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
          <defs>
            <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(211, 100%, 50%)" stopOpacity={0.28} />
              <stop offset="95%" stopColor="hsl(211, 100%, 50%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="hsl(var(--border) / 0.2)" strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="name" hide />
          <YAxis hide />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke="hsl(211, 100%, 50%)" 
            strokeWidth={4}
            dot={{ fill: 'hsl(211, 100%, 50%)', stroke: 'hsl(var(--card))', strokeWidth: 3, r: 5 }}
            activeDot={{ r: 8, strokeWidth: 3, stroke: 'hsl(var(--card))' }}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
        </LineChart>
      </ChartContainer>
    </div>
  );
}

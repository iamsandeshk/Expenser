
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, LineChart, Line } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface ExpenseChartProps {
  data: Array<{ name: string; value: number; color?: string }>;
  type?: 'pie' | 'bar' | 'line';
  height?: number;
}

const COLORS = ['hsl(211, 100%, 50%)', 'hsl(149, 100%, 57%)', 'hsl(0, 91%, 71%)', 'hsl(45, 93%, 58%)', 'hsl(270, 50%, 60%)'];

export function ExpenseChart({ data, type = 'pie', height = 200 }: ExpenseChartProps) {
  const chartConfig = data.reduce((config, item, index) => {
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
          <ResponsiveContainer width="100%" height="100%">
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
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    );
  }

  if (type === 'bar') {
    return (
      <div className="w-full" style={{ height: `${height}px` }}>
        <ChartContainer config={chartConfig} className="w-full h-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis dataKey="name" />
              <YAxis />
              <Bar dataKey="value" fill="hsl(211, 100%, 50%)" radius={[4, 4, 0, 0]} />
              <ChartTooltip content={<ChartTooltipContent />} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height: `${height}px` }}>
      <ChartContainer config={chartConfig} className="w-full h-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="name" />
            <YAxis />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="hsl(211, 100%, 50%)" 
              strokeWidth={3}
              dot={{ fill: "hsl(211, 100%, 50%)", strokeWidth: 2, r: 4 }}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}

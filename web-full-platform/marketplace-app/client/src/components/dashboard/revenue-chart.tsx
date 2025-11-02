import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const revenueData = [
  { name: "Trading Cards", value: 4200, color: "hsl(174 60% 51%)" },
  { name: "Sneakers", value: 2800, color: "hsl(16 100% 66%)" },
  { name: "Collectibles", value: 1900, color: "hsl(174 40% 65%)" },
  { name: "Electronics", value: 1200, color: "hsl(16 80% 75%)" },
  { name: "Other", value: 800, color: "hsl(174 30% 80%)" },
];

export function RevenueChart() {
  return (
    <Card className="shadow border border-border">
      <CardHeader className="px-6 py-4 border-b border-border">
        <h3 className="text-lg font-medium text-foreground">Revenue by Category</h3>
      </CardHeader>
      <CardContent className="p-6">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={revenueData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {revenueData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value) => <span className="text-sm text-muted-foreground">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

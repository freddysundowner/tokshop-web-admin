import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const salesData = [
  { date: "Dec 1", sales: 1200 },
  { date: "Dec 5", sales: 1890 },
  { date: "Dec 10", sales: 1650 },
  { date: "Dec 15", sales: 2100 },
  { date: "Dec 20", sales: 2890 },
  { date: "Dec 25", sales: 2450 },
  { date: "Dec 30", sales: 3200 },
];

export function SalesChart() {
  return (
    <Card className="shadow border border-border">
      <CardHeader className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-foreground">Sales Performance</h3>
          <div className="flex space-x-2">
            <Button variant="ghost" size="sm" className="text-sm text-muted-foreground hover:text-foreground">
              7D
            </Button>
            <Button size="sm" className="text-sm" data-testid="button-30d-filter">
              30D
            </Button>
            <Button variant="ghost" size="sm" className="text-sm text-muted-foreground hover:text-foreground">
              90D
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 20%)" />
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                className="text-xs text-muted-foreground"
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                className="text-xs text-muted-foreground"
              />
              <Line 
                type="monotone" 
                dataKey="sales" 
                stroke="hsl(174 60% 51%)" 
                strokeWidth={2}
                dot={{ fill: "hsl(174 60% 51%)", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: "hsl(174 60% 51%)", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

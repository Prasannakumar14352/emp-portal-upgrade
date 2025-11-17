import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingDown, ArrowRight } from "lucide-react";

interface LeaveBalance {
  leaveType: string;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
  carryForward: number;
}

interface LeaveBalanceCardProps {
  balances: LeaveBalance[];
  year: number;
}

export function LeaveBalanceCard({ balances, year }: LeaveBalanceCardProps) {
  const getProgressColor = (remaining: number, total: number) => {
    const percentage = (remaining / total) * 100;
    if (percentage > 50) return "bg-green-500";
    if (percentage > 25) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Leave Balance {year}
          </CardTitle>
          <Badge variant="outline">{balances.length} Types</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {balances.map((balance, index) => {
          const usagePercentage = (balance.usedDays / balance.totalDays) * 100;
          
          return (
            <div key={index} className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{balance.leaveType}</p>
                  <p className="text-sm text-muted-foreground">
                    {balance.remainingDays} of {balance.totalDays} days remaining
                  </p>
                </div>
                {balance.carryForward > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    <ArrowRight className="h-3 w-3" />
                    {balance.carryForward} carried forward
                  </Badge>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Used: {balance.usedDays} days</span>
                  <span className="font-medium">{usagePercentage.toFixed(0)}%</span>
                </div>
                <Progress 
                  value={usagePercentage} 
                  className="h-2"
                />
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  Available: {balance.remainingDays}
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  Used: {balance.usedDays}
                </div>
                {balance.carryForward > 0 && (
                  <div className="flex items-center gap-1">
                    <TrendingDown className="h-3 w-3" />
                    Carry: {balance.carryForward}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {balances.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No leave balance data available</p>
            <p className="text-sm">Contact HR to set up your leave balances</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

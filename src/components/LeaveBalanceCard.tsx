import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface LeaveBalance {
  leaveType: string;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
  carryForward?: number;
}

interface Props {
  balances: LeaveBalance[];
  year: number;
}

export function LeaveBalanceCard({ balances, year }: Props) {
  return (
    <div>
      <h2 className="text-2xl font-semibold flex items-center gap-2 mb-6">
        <Calendar className="w-5 h-5" />
        Leave Balance {year}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {balances.map((b, i) => {
          const usagePercentage = (b.usedDays / b.totalDays) * 100 || 0;
          const availablePercent = 100 - usagePercentage;

          return (
            <Card key={i} className="shadow-sm hover:shadow-md transition rounded-xl">
              <CardHeader>
                <CardTitle className="text-lg flex justify-between items-center">
                  {b.leaveType}
                  <Badge variant="outline">{b.totalDays} Days</Badge>
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {b.remainingDays} of {b.totalDays} days remaining
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Used: {b.usedDays} days
                  </p>
                </div>

                <div>
                  {/* <div className="flex justify-between text-xs mb-1 text-muted-foreground">
                    <span>Usage</span>
                    <span>{usagePercentage.toFixed(0)}%</span>
                  </div>
                  <Progress value={usagePercentage} className="h-2" /> */}
                  <div>
                    <div className="flex justify-between text-xs mb-1 text-muted-foreground">
                      <span>Usage</span>
                      <span>{usagePercentage.toFixed(0)}%</span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-gray-200 flex overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${usagePercentage}%` }}
                      />
                      <div
                        className="h-full bg-green-500"
                        style={{ width: `${availablePercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    Available: {b.remainingDays}
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    Used: {b.usedDays}
                  </div>

                  {b.carryForward ? (
                    <div className="flex items-center gap-1">
                      <div className="h-2 w-2 rounded-full bg-yellow-500" />
                      Carry: {b.carryForward}
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

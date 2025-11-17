import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { holidayService, type Holiday } from "@/services/holidayService";
import { toast } from "sonner";

export default function Holidays() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHolidays();
  }, []);

  const loadHolidays = async () => {
    try {
      setLoading(true);
      const currentYear = new Date().getFullYear();
      const data = await holidayService.getAllHolidays(currentYear);
      setHolidays(data);
    } catch (error) {
      console.error('Failed to load holidays:', error);
      toast.error('Failed to load holidays');
    } finally {
      setLoading(false);
    }
  };

  const upcomingHolidays = holidays
    .filter(h => new Date(h.date) >= new Date())
    .slice(0, 4);

  const getMonthName = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'long' });
  };

  const getDay = (date: string) => {
    return new Date(date).getDate();
  };

  const getDayName = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
  };

  const isUpcoming = (date: string) => {
    const holidayDate = new Date(date);
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    return holidayDate >= today && holidayDate <= thirtyDaysFromNow;
  };

  if (loading) {
    return <div className="space-y-6">Loading holidays...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Holidays</h1>
        <p className="text-muted-foreground">View company holidays and plan your time off</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>All Holidays ({new Date().getFullYear()})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {holidays.length > 0 ? (
                holidays.map((holiday) => (
                  <div
                    key={holiday.id}
                    className={`flex items-center gap-4 rounded-lg border p-4 transition-colors ${
                      isUpcoming(holiday.date) ? 'bg-accent/10 border-accent' : ''
                    }`}
                  >
                    <div className="flex h-16 w-16 flex-col items-center justify-center rounded-lg bg-primary/10">
                      <span className="text-xs font-medium text-muted-foreground">
                        {getMonthName(holiday.date).slice(0, 3).toUpperCase()}
                      </span>
                      <span className="text-2xl font-bold text-primary">{getDay(holiday.date)}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{holiday.name}</p>
                        {isUpcoming(holiday.date) && (
                          <Badge variant="secondary">Upcoming</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {getDayName(holiday.date)} • {holiday.type}
                      </p>
                      {holiday.description && (
                        <p className="text-xs text-muted-foreground mt-1">{holiday.description}</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No holidays found for this year</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Holidays</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingHolidays.length > 0 ? (
                  upcomingHolidays.map((holiday) => (
                    <div key={holiday.id} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span className="font-medium">{holiday.name}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(holiday.date).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                      <Badge variant="outline">{holiday.type}</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No upcoming holidays in the next 30 days
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Holiday Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Holidays</span>
                  <span className="text-2xl font-bold">{holidays.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Upcoming</span>
                  <span className="text-2xl font-bold text-primary">
                    {holidays.filter(h => new Date(h.date) >= new Date()).length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">This Month</span>
                  <span className="text-2xl font-bold text-accent">
                    {holidays.filter(h => 
                      new Date(h.date).getMonth() === new Date().getMonth() &&
                      new Date(h.date).getFullYear() === new Date().getFullYear()
                    ).length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

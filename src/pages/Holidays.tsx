import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin } from "lucide-react";

export default function Holidays() {
  const holidays = [
    { name: "New Year's Day", date: "2026-01-01", type: "Public Holiday", optional: false },
    { name: "Republic Day", date: "2026-01-26", type: "National Holiday", optional: false },
    { name: "Holi", date: "2026-03-14", type: "Festival", optional: false },
    { name: "Good Friday", date: "2026-04-10", type: "Religious", optional: true },
    { name: "Independence Day", date: "2026-08-15", type: "National Holiday", optional: false },
    { name: "Gandhi Jayanti", date: "2026-10-02", type: "National Holiday", optional: false },
    { name: "Diwali", date: "2026-10-24", type: "Festival", optional: false },
    { name: "Christmas Day", date: "2026-12-25", type: "Religious", optional: false },
  ];

  const upcomingHolidays = holidays.filter(h => new Date(h.date) >= new Date()).slice(0, 4);
  const allHolidays = holidays;

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Holidays</h1>
        <p className="text-muted-foreground">View company holidays and plan your time off</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>All Holidays (2026)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allHolidays.map((holiday, index) => (
                <div
                  key={index}
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
                      {holiday.optional && (
                        <Badge variant="outline">Optional</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {getDayName(holiday.date)} • {holiday.type}
                    </p>
                  </div>
                </div>
              ))}
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
                {upcomingHolidays.map((holiday, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-accent" />
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
                    {index < upcomingHolidays.length - 1 && <div className="border-t" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Holiday Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Holidays</p>
                <p className="text-3xl font-bold">{holidays.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Optional Holidays</p>
                <p className="text-2xl font-bold text-accent">
                  {holidays.filter(h => h.optional).length}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Working Days</p>
                <p className="text-2xl font-bold text-success">
                  {365 - holidays.length}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

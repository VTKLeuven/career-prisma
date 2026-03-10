"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

type TimeSeriesEntry = { time: string; count: number; cumulative: number };
type RecentCheckin = { barcode: string; checked_in_at: string; name: string };

type CheckinData = {
  totalRegistered: number;
  totalCheckedIn: number;
  remaining: number;
  timeSeries: TimeSeriesEntry[];
  recentCheckins: RecentCheckin[];
};

const REFRESH_INTERVAL_MS = 30_000;

function formatTime(isoString: string) {
  return new Date(isoString).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTime(isoString: string) {
  return new Date(isoString).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function CheckinsClient() {
  const [data, setData] = useState<CheckinData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/checkins");
      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading && !data) {
    return <p className="text-muted-foreground">Loading check-in data...</p>;
  }

  if (error && !data) {
    return <p className="text-destructive">Error: {error}</p>;
  }

  if (!data) return null;

  const percentage =
    data.totalRegistered > 0
      ? Math.round((data.totalCheckedIn / data.totalRegistered) * 100)
      : 0;

  const pieData = [
    { name: "Checked in", value: data.totalCheckedIn },
    { name: "Remaining", value: Math.max(0, data.remaining) },
  ];

  const PIE_COLORS = ["var(--color-chart-1)", "var(--color-chart-3)"];

  const chartData = data.timeSeries.map((entry) => ({
    time: formatTime(entry.time),
    "New check-ins": entry.count,
    "Total checked in": entry.cumulative,
  }));

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardDescription>Registered</CardDescription>
            <CardTitle className="text-4xl tabular-nums">
              {data.totalRegistered}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Checked In</CardDescription>
            <CardTitle className="text-4xl tabular-nums text-green-600 dark:text-green-400">
              {data.totalCheckedIn}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Remaining</CardDescription>
            <CardTitle className="text-4xl tabular-nums text-orange-600 dark:text-orange-400">
              {Math.max(0, data.remaining)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Progress bar */}
      <Card>
        <CardHeader>
          <CardTitle>Check-in Progress</CardTitle>
          <CardDescription>
            {data.totalCheckedIn} of {data.totalRegistered} attendees ({percentage}%)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
            <div
              className="h-full bg-green-600 dark:bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Area chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Check-ins Over Time</CardTitle>
            <CardDescription>
              New arrivals per 15-minute window and cumulative total
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">
                No check-in data yet
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="time" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--color-card)",
                      borderColor: "var(--color-border)",
                      borderRadius: "8px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="Total checked in"
                    stroke="var(--color-chart-1)"
                    fill="var(--color-chart-1)"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="New check-ins"
                    stroke="var(--color-chart-2)"
                    fill="var(--color-chart-2)"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pie chart */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance</CardTitle>
            <CardDescription>Checked in vs. remaining</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            {data.totalRegistered === 0 ? (
              <p className="text-muted-foreground text-sm py-8">No registrations</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i]} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent check-ins */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Check-ins</CardTitle>
          <CardDescription>
            Last 20 check-ins
            {lastUpdated && (
              <span className="ml-2 text-xs">
                (updated {lastUpdated.toLocaleTimeString()})
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.recentCheckins.length === 0 ? (
            <p className="text-muted-foreground text-sm">No check-ins yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Name</th>
                    <th className="pb-2 pr-4 font-medium">Barcode</th>
                    <th className="pb-2 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentCheckins.map((c, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 pr-4">{c.name}</td>
                      <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">
                        {c.barcode}
                      </td>
                      <td className="py-2">{formatDateTime(c.checked_in_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

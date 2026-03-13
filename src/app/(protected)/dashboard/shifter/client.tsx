"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { fetchOrdersAction, finishOrderAction, pickUpOrderAction, fetchCompletedOrdersAction, deleteOrderAction } from "@/app/actions/orders";
import type { Order, Zone, OrderItem } from "@/lib/schema";
import { Check, Clock, History, Loader2, Play, Trash2 } from "lucide-react";

type ExtendedOrder = Order & {
    booth: any;
    shifter: any;
};

type CompletedOrder = ExtendedOrder & {
    durationMinutes: number;
    durationFormatted: string;
};

type OrdersPer15MinBucket = {
    label: string;
    start: string;
    end: string;
    count: number;
};

type OrdersPerBoothStat = {
    boothNumber: number | null;
    companyName: string | null;
    count: number;
};

type OrdersPerShifterStat = {
    name: string;
    count: number;
};

type CumulativeOrderPoint = {
    label: string;
    count: number;
};

type CompletedOrdersStats = {
    totalOrders: number;
    totalItems: number;
    avgDurationMinutes: number;
    medianDurationMinutes: number;
    fastestMinutes: number;
    slowestMinutes: number;
    per15MinBuckets: OrdersPer15MinBucket[];
    perBooth: OrdersPerBoothStat[];
    cumulativeOrders: CumulativeOrderPoint[];
    peakBucketLabel: string;
    ordersPerShifter: OrdersPerShifterStat[];
} | null;

// Fallback Tailwind classes when no custom dot_color is set
const ZONE_COLOR_CLASSES = [
    "bg-red-500",
    "bg-blue-500",
    "bg-green-500",
    "bg-yellow-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-orange-500",
    "bg-teal-500",
    "bg-cyan-500",
];
const DEFAULT_ZONE_CLASS = "bg-gray-400";

// Get zone color: use custom dot_color (hex) if set, else fallback Tailwind class
function getZoneColor(zoneId: string, zones: Zone[]): { className?: string; style?: React.CSSProperties } {
    const zone = zones.find(z => z.id === zoneId);
    const customColor = (zone as { dot_color?: string | null })?.dot_color?.trim();
    if (customColor) {
        return { style: { backgroundColor: customColor } };
    }
    const index = zones.findIndex(z => z.id === zoneId);
    const className = index >= 0 ? ZONE_COLOR_CLASSES[index % ZONE_COLOR_CLASSES.length] : DEFAULT_ZONE_CLASS;
    return { className };
}

export default function ShifterDashboardClient({ initialZones, currentUserId }: { initialZones: Zone[], currentUserId: string }) {
    const [orders, setOrders] = useState<ExtendedOrder[]>([]);
    const [completedOrders, setCompletedOrders] = useState<CompletedOrder[]>([]);
    const [completedStats, setCompletedStats] = useState<CompletedOrdersStats>(null);
    const [selectedZone, setSelectedZone] = useState<string>("all");
    const [loading, setLoading] = useState(true);
    const [showHistory, setShowHistory] = useState(false);

    const loadOrders = async () => {
        const data = await fetchOrdersAction(selectedZone);
        setOrders(data as unknown as ExtendedOrder[]);
        setLoading(false);
    };

    const loadCompletedOrders = async () => {
        const data = await fetchCompletedOrdersAction();
        // data shape: { orders: CompletedOrderWithDuration[], stats: CompletedOrdersStats | null }
        setCompletedOrders((data as any).orders as CompletedOrder[]);
        setCompletedStats((data as any).stats as CompletedOrdersStats);
    };

    useEffect(() => {
        if (showHistory) {
            loadCompletedOrders();
            // Also poll history every 10 seconds
            const interval = setInterval(loadCompletedOrders, 10000);
            return () => clearInterval(interval);
        } else {
            loadOrders();
            // Poll for new orders every 3 seconds for live updates
            const interval = setInterval(loadOrders, 3000);
            return () => clearInterval(interval);
        }
    }, [selectedZone, showHistory]);

    const handlePickup = async (id: string) => {
        await pickUpOrderAction(id);
        loadOrders();
    };

    const handleFinish = async (id: string) => {
        await finishOrderAction(id);
        loadOrders();
    };

    const handleDelete = async (id: string) => {
        await deleteOrderAction(id);
        loadOrders();
    };

    const formatDateTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString('en-BE', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getMinutesAgo = (dateStr: string) => {
        const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
        if (mins < 1) return "just now";
        return `${mins}m ago`;
    };

    // Get zone info from order by looking up booth in zones
    const getOrderZone = (order: ExtendedOrder): { id: string; name: string } | null => {
        const boothId = order.booth?.id || order.booth;

        if (!boothId) return null;

        // Search through zones to find which one contains this booth
        // The zones have booths as M2M relationship
        for (const zone of initialZones) {
            if (zone.booths && Array.isArray(zone.booths)) {
                const found = zone.booths.some((b: any) => {
                    const bId = typeof b === 'object' ? b.id : b;
                    return String(bId) === String(boothId);
                });
                if (found) {
                    return { id: zone.id, name: zone.name };
                }
            }
        }

        // Fallback: check booth.zone if populated
        const boothZone = order.booth?.zone;
        if (boothZone) {
            if (typeof boothZone === 'object') {
                return { id: boothZone.id, name: boothZone.name };
            }
            const zone = initialZones.find(z => z.id === boothZone);
            if (zone) return { id: zone.id, name: zone.name };
        }

        // Fallback: check order.zone
        if (order.zone) {
            if (typeof order.zone === 'object') {
                return { id: (order.zone as any).id, name: (order.zone as any).name };
            }
            const zone = initialZones.find(z => z.id === order.zone);
            if (zone) return { id: zone.id, name: zone.name };
        }

        return null;
    };

    // Re-render every 30s so "X min ago" stays fresh between polls
    const [, setTick] = useState(0);
    useEffect(() => {
        const timer = setInterval(() => setTick(t => t + 1), 30000);
        return () => clearInterval(timer);
    }, []);

    const sortedOrders = [...orders].sort(
        (a, b) => new Date(a.date_created).getTime() - new Date(b.date_created).getTime()
    );

    // Calculate summary stats (prefer server-computed stats when available)
    const avgDuration = completedStats?.avgDurationMinutes ?? (completedOrders.length > 0
        ? Math.round(completedOrders.reduce((acc, o) => acc + o.durationMinutes, 0) / completedOrders.length)
        : 0);

    return (
        <div className="space-y-6 w-full max-w-full min-w-0 overflow-x-hidden">
            {/* Header with view toggle */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                    <label className="font-medium">Filter by Zone:</label>
                    <Select value={selectedZone} onValueChange={setSelectedZone}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="All Zones" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Zones</SelectItem>
                            {initialZones.map(z => {
                                const color = getZoneColor(z.id, initialZones);
                                return (
                                    <SelectItem key={z.id} value={z.id}>
                                        <div className="flex items-center gap-2">
                                            <span className={`w-3 h-3 rounded-full ${color.className ?? ""}`} style={color.style} />
                                            {z.name}
                                        </div>
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>

                    {!showHistory && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Live updates</span>
                        </div>
                    )}
                </div>

                <Button
                    variant={showHistory ? "default" : "outline"}
                    onClick={() => setShowHistory(!showHistory)}
                >
                    {showHistory ? (
                        <>
                            <Play className="mr-2 h-4 w-4" /> Active Orders
                        </>
                    ) : (
                        <>
                            <History className="mr-2 h-4 w-4" /> Order History
                        </>
                    )}
                </Button>
            </div>

            {/* Order History View */}
            {showHistory ? (
                <div className="space-y-4 w-full max-w-full min-w-0 overflow-x-hidden">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription>Total Orders</CardDescription>
                                <CardTitle className="text-2xl">{completedStats?.totalOrders ?? completedOrders.length}</CardTitle>
                            </CardHeader>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription>Total Items Served</CardDescription>
                                <CardTitle className="text-2xl">{completedStats?.totalItems ?? 0}</CardTitle>
                            </CardHeader>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription>Avg Duration</CardDescription>
                                <CardTitle className="text-2xl">{avgDuration}m</CardTitle>
                            </CardHeader>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription>Median Duration</CardDescription>
                                <CardTitle className="text-2xl">{completedStats?.medianDurationMinutes ?? 0}m</CardTitle>
                            </CardHeader>
                        </Card>
                    </div >
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription>Fastest</CardDescription>
                                <CardTitle className="text-2xl">
                                    {completedStats ? completedStats.fastestMinutes : (completedOrders.length > 0 ? Math.min(...completedOrders.map(o => o.durationMinutes)) : 0)}m
                                </CardTitle>
                            </CardHeader>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription>Slowest</CardDescription>
                                <CardTitle className="text-2xl">
                                    {completedStats ? completedStats.slowestMinutes : (completedOrders.length > 0 ? Math.max(...completedOrders.map(o => o.durationMinutes)) : 0)}m
                                </CardTitle>
                            </CardHeader>
                        </Card>
                        <Card className="col-span-2">
                            <CardHeader className="pb-2">
                                <CardDescription>Peak Period</CardDescription>
                                <CardTitle className="text-2xl">{completedStats?.peakBucketLabel ?? "—"}</CardTitle>
                            </CardHeader>
                        </Card>
                    </div>

                    {/* Cumulative Orders Plot */}
                    {
                        completedStats && completedStats.cumulativeOrders.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Cumulative Orders</CardTitle>
                                    <CardDescription>Running total of orders throughout the day (11:00–17:00)</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {(() => {
                                        const data = completedStats.cumulativeOrders;
                                        const maxCount = Math.max(...data.map(d => d.count), 1);
                                        const svgWidth = 800;
                                        const svgHeight = 200;
                                        const paddingLeft = 40;
                                        const paddingRight = 10;
                                        const paddingTop = 10;
                                        const paddingBottom = 30;
                                        const chartWidth = svgWidth - paddingLeft - paddingRight;
                                        const chartHeight = svgHeight - paddingTop - paddingBottom;

                                        const points = data.map((d, i) => {
                                            const x = paddingLeft + (i / (data.length - 1)) * chartWidth;
                                            const y = paddingTop + chartHeight - (d.count / maxCount) * chartHeight;
                                            return `${x},${y}`;
                                        });

                                        // Fill area under the line
                                        const areaPoints = [
                                            `${paddingLeft},${paddingTop + chartHeight}`,
                                            ...points,
                                            `${paddingLeft + chartWidth},${paddingTop + chartHeight}`,
                                        ];

                                        // Hour labels for x-axis (11, 12, 13, 14, 15, 16, 17)
                                        const hourLabels = [11, 12, 13, 14, 15, 16, 17];

                                        // Y-axis ticks
                                        const yTicks = [0, Math.round(maxCount / 4), Math.round(maxCount / 2), Math.round(maxCount * 3 / 4), maxCount];

                                        return (
                                            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
                                                {/* Grid lines */}
                                                {yTicks.map((tick, i) => {
                                                    const y = paddingTop + chartHeight - (tick / maxCount) * chartHeight;
                                                    return (
                                                        <g key={`y-${i}`}>
                                                            <line x1={paddingLeft} y1={y} x2={svgWidth - paddingRight} y2={y} stroke="currentColor" strokeOpacity={0.1} strokeDasharray="4,4" />
                                                            <text x={paddingLeft - 5} y={y + 4} textAnchor="end" fontSize="11" fill="currentColor" fillOpacity={0.5}>{tick}</text>
                                                        </g>
                                                    );
                                                })}

                                                {/* X axis labels */}
                                                {hourLabels.map((hour) => {
                                                    const bucketIndex = (hour - 11) * 4;
                                                    if (bucketIndex < 0 || bucketIndex >= data.length) return null;
                                                    const x = paddingLeft + (bucketIndex / (data.length - 1)) * chartWidth;
                                                    return (
                                                        <text key={`x-${hour}`} x={x} y={svgHeight - 5} textAnchor="middle" fontSize="11" fill="currentColor" fillOpacity={0.5}>
                                                            {hour}:00
                                                        </text>
                                                    );
                                                })}

                                                {/* Area fill */}
                                                <polygon points={areaPoints.join(" ")} fill="hsl(var(--primary))" fillOpacity={0.1} />

                                                {/* Line */}
                                                <polyline
                                                    points={points.join(" ")}
                                                    fill="none"
                                                    stroke="hsl(var(--primary))"
                                                    strokeWidth={2.5}
                                                    strokeLinejoin="round"
                                                    strokeLinecap="round"
                                                />

                                                {/* Dots at hour marks */}
                                                {hourLabels.map((hour) => {
                                                    const bucketIndex = (hour - 11) * 4;
                                                    if (bucketIndex < 0 || bucketIndex >= data.length) return null;
                                                    const d = data[bucketIndex];
                                                    const x = paddingLeft + (bucketIndex / (data.length - 1)) * chartWidth;
                                                    const y = paddingTop + chartHeight - (d.count / maxCount) * chartHeight;
                                                    return (
                                                        <circle key={`dot-${hour}`} cx={x} cy={y} r={3} fill="hsl(var(--primary))" />
                                                    );
                                                })}
                                            </svg>
                                        );
                                    })()}
                                </CardContent>
                            </Card>
                        )
                    }

                    {/* 15-Minute Histogram */}
                    {
                        completedStats && completedStats.per15MinBuckets.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Orders per 15 minutes</CardTitle>
                                    <CardDescription>Distribution of orders in 15-minute intervals (11:00–17:00)</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {(() => {
                                        const buckets = completedStats.per15MinBuckets;
                                        const maxCount = Math.max(...buckets.map(b => b.count), 1);
                                        const peakCount = Math.max(...buckets.map(b => b.count));

                                        return (
                                            <div className="space-y-2">
                                                {/* Bar chart */}
                                                <div className="flex items-end gap-[2px] h-[160px]">
                                                    {buckets.map((bucket, idx) => {
                                                        const heightPct = (bucket.count / maxCount) * 100;
                                                        const isPeak = bucket.count === peakCount && bucket.count > 0;
                                                        return (
                                                            <div
                                                                key={idx}
                                                                className="relative flex-1 group"
                                                                style={{ height: '100%' }}
                                                            >
                                                                <div
                                                                    className={`absolute bottom-0 w-full rounded-t transition-all ${isPeak
                                                                        ? 'bg-primary'
                                                                        : bucket.count > 0
                                                                            ? 'bg-primary/60'
                                                                            : 'bg-muted'
                                                                        }`}
                                                                    style={{
                                                                        height: bucket.count > 0 ? `${Math.max(heightPct, 2)}%` : '2%',
                                                                    }}
                                                                />
                                                                {/* Tooltip on hover */}
                                                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-md whitespace-nowrap z-10 border">
                                                                    {bucket.label}: {bucket.count}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                {/* X-axis labels (hourly) */}
                                                <div className="flex justify-between text-xs text-muted-foreground px-0">
                                                    {[11, 12, 13, 14, 15, 16, 17].map(hour => (
                                                        <span key={hour}>{hour}:00</span>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </CardContent>
                            </Card>
                        )
                    }

                    {/* Top booths & per-shifter side by side */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {completedStats && completedStats.perBooth.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Top booths by orders</CardTitle>
                                    <CardDescription>
                                        Completed orders per booth (top 10).
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {(() => {
                                        const topBooths = completedStats.perBooth.slice(0, 10);
                                        const maxCount = Math.max(...topBooths.map(b => b.count), 1);
                                        return (
                                            <div className="space-y-2">
                                                {topBooths.map((b, idx) => (
                                                    <div key={`${b.boothNumber}-${b.companyName}-${idx}`} className="space-y-1">
                                                        <div className="flex justify-between text-sm">
                                                            <span className="truncate mr-2">
                                                                Booth {b.boothNumber ?? "?"}
                                                                {b.companyName ? ` – ${b.companyName}` : ""}
                                                            </span>
                                                            <span className="font-mono flex-shrink-0">{b.count}</span>
                                                        </div>
                                                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-primary rounded-full"
                                                                style={{ width: `${(b.count / maxCount) * 100}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })()}
                                </CardContent>
                            </Card>
                        )}

                        {completedStats && completedStats.ordersPerShifter.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Orders per shifter</CardTitle>
                                    <CardDescription>
                                        Completed orders handled by each shifter.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {(() => {
                                        const shifters = completedStats.ordersPerShifter;
                                        const maxCount = Math.max(...shifters.map(s => s.count), 1);
                                        return (
                                            <div className="space-y-2">
                                                {shifters.map((s, idx) => (
                                                    <div key={`${s.name}-${idx}`} className="space-y-1">
                                                        <div className="flex justify-between text-sm">
                                                            <span className="truncate mr-2">{s.name}</span>
                                                            <span className="font-mono flex-shrink-0">{s.count}</span>
                                                        </div>
                                                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-blue-500 rounded-full"
                                                                style={{ width: `${(s.count / maxCount) * 100}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })()}
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Orders Table */}
                    <Card className="w-full max-w-full overflow-hidden">
                        <CardHeader>
                            <CardTitle>Completed Orders</CardTitle>
                            <CardDescription>All completed orders</CardDescription>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                            <Table className="w-full">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[60px]">Booth</TableHead>
                                        <TableHead className="min-w-[120px]">Company</TableHead>
                                        <TableHead className="w-[100px]">Zone</TableHead>
                                        <TableHead>Items</TableHead>
                                        <TableHead className="w-[100px]">Ordered</TableHead>
                                        <TableHead className="w-[100px]">Completed</TableHead>
                                        <TableHead className="w-[80px]">Duration</TableHead>
                                        <TableHead className="w-[100px]">Shifter</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {completedOrders.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                                                No completed orders yet.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        completedOrders.map((order) => {
                                            const zone = getOrderZone(order);
                                            return (
                                                <TableRow key={order.id}>
                                                    <TableCell className="font-medium whitespace-nowrap">
                                                        #{order.booth?.booth_number}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div
                                                            className="max-w-[200px] truncate text-sm"
                                                            title={order.booth?.company?.name || "—"}
                                                        >
                                                            {order.booth?.company?.name || "—"}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {zone ? (() => {
                                                            const color = getZoneColor(zone.id, initialZones);
                                                            return (
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${color.className ?? ""}`} style={color.style} />
                                                                    <span className="text-sm truncate">{zone.name}</span>
                                                                </div>
                                                            );
                                                        })() : "—"}
                                                    </TableCell>
                                                    <TableCell className="align-top">
                                                        {(() => {
                                                            const itemsText = (order.items || [])
                                                                .map((item) => `${item.name} ×${item.quantity}`)
                                                                .join(", ");
                                                            return (
                                                                <div
                                                                    className="max-w-[260px] truncate text-sm"
                                                                    title={itemsText}
                                                                >
                                                                    {itemsText}
                                                                </div>
                                                            );
                                                        })()}
                                                    </TableCell>
                                                    <TableCell className="text-sm whitespace-nowrap">
                                                        {formatDateTime(order.date_created)}
                                                    </TableCell>
                                                    <TableCell className="text-sm whitespace-nowrap">
                                                        {formatDateTime(order.date_updated)}
                                                    </TableCell>
                                                    <TableCell className="whitespace-nowrap">
                                                        <Badge variant={order.durationMinutes <= avgDuration ? "default" : "secondary"}>
                                                            <Clock className="mr-1 h-3 w-3" />
                                                            {order.durationFormatted}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="max-w-[100px] truncate text-sm" title={
                                                            (order as any).shifter_name
                                                            || (order.shifter && typeof order.shifter === 'object'
                                                                ? ((order.shifter as any).first_name || (order.shifter as any).name || "—")
                                                                : "—")
                                                        }>
                                                            {(order as any).shifter_name
                                                                || (order.shifter && typeof order.shifter === 'object'
                                                                    ? ((order.shifter as any).first_name ||
                                                                        (order.shifter as any).name ||
                                                                        "—")
                                                                    : "—")}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div >
            ) : (
                /* Active Orders View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sortedOrders.length === 0 && !loading && (
                        <p className="col-span-full text-center text-muted-foreground py-12">No pending orders.</p>
                    )}

                    {sortedOrders.map((order) => {
                        const isMyOrder = order.shifter?.id === currentUserId || order.shifter === currentUserId;
                        const isTaken = !!order.shifter && !isMyOrder;
                        const zone = getOrderZone(order);

                        return (
                            <Card key={order.id} className={`${order.status === 'preparing' ? 'border-primary' : ''} ${isTaken ? 'opacity-70 bg-gray-50' : ''}`}>
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <CardTitle>{order.booth?.company?.name || "Unknown Company"}</CardTitle>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={order.status === 'preparing' ? "default" : "secondary"}>
                                                {isTaken
                                                    ? `Being prepared by ${(order as any).shifter_name
                                                    || (order.shifter && typeof order.shifter === 'object'
                                                        ? ((order.shifter as any).first_name ||
                                                            (order.shifter as any).name ||
                                                            'someone')
                                                        : 'someone')
                                                    }`
                                                    : order.status}
                                            </Badge>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Delete Order?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This will permanently remove this order. This action cannot be undone.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={() => handleDelete(order.id)}
                                                            className="bg-destructive hover:bg-destructive/90"
                                                        >
                                                            Delete
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </div>
                                    <CardDescription className="flex items-center justify-between">
                                        <span>Booth {order.booth?.booth_number}</span>
                                        <span className="flex items-center gap-1 text-xs">
                                            <Clock className="h-3 w-3" />
                                            {getMinutesAgo(order.date_created)}
                                        </span>
                                    </CardDescription>

                                    {/* Zone indicator */}
                                    <div className="flex items-center gap-2 mt-1">
                                        {zone ? (() => {
                                            const color = getZoneColor(zone.id, initialZones);
                                            return (
                                                <span className={`w-3 h-3 rounded-full ${color.className ?? "bg-gray-300"}`} style={color.style} />
                                            );
                                        })() : (
                                            <span className="w-3 h-3 rounded-full bg-gray-300" />
                                        )}
                                        <span className="text-sm text-muted-foreground">{zone ? zone.name : 'No Zone'}</span>
                                    </div>

                                    {isMyOrder && (
                                        <p className="text-xs text-primary font-bold">
                                            You are working on this
                                        </p>
                                    )}
                                </CardHeader>
                                <CardContent>
                                    <ul className="space-y-1">
                                        {(order.items || []).map((item, idx) => (
                                            <li key={idx} className="flex justify-between text-sm">
                                                <span>{item.name}</span>
                                                <span className="font-bold">x{item.quantity}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                                <CardFooter className="pt-2">
                                    {order.status === 'pending' && !isTaken && (
                                        <Button className="w-full" onClick={() => handlePickup(order.id)}>
                                            <Play className="mr-2 h-4 w-4" /> Start Preparing
                                        </Button>
                                    )}
                                    {order.status === 'preparing' && !isTaken && (
                                        <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => handleFinish(order.id)}>
                                            <Check className="mr-2 h-4 w-4" /> Finish
                                        </Button>
                                    )}
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>
            )
            }
        </div >
    );
}

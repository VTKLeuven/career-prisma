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

// Zone colors for visual identification
const ZONE_COLORS: Record<string, string> = {
    default: "bg-gray-400",
};

// Generate consistent color from zone ID
const getZoneColor = (zoneId: string, zones: Zone[]): string => {
    const colors = [
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
    const index = zones.findIndex(z => z.id === zoneId);
    return index >= 0 ? colors[index % colors.length] : ZONE_COLORS.default;
};

export default function ShifterDashboardClient({ initialZones, currentUserId }: { initialZones: Zone[], currentUserId: string }) {
    const [orders, setOrders] = useState<ExtendedOrder[]>([]);
    const [completedOrders, setCompletedOrders] = useState<CompletedOrder[]>([]);
    const [selectedZone, setSelectedZone] = useState<string>("all");
    const [loading, setLoading] = useState(true);
    const [showHistory, setShowHistory] = useState(false);

    const loadOrders = async () => {
        const data = await fetchOrdersAction(selectedZone);
        setOrders(data as unknown as ExtendedOrder[]);
        setLoading(false);
    };

    const loadCompletedOrders = async () => {
        const data = await fetchCompletedOrdersAction(50);
        setCompletedOrders(data as unknown as CompletedOrder[]);
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

    // Calculate summary stats
    const avgDuration = completedOrders.length > 0
        ? Math.round(completedOrders.reduce((acc, o) => acc + o.durationMinutes, 0) / completedOrders.length)
        : 0;

    return (
        <div className="space-y-6">
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
                            {initialZones.map(z => (
                                <SelectItem key={z.id} value={z.id}>
                                    <div className="flex items-center gap-2">
                                        <span className={`w-3 h-3 rounded-full ${getZoneColor(z.id, initialZones)}`} />
                                        {z.name}
                                    </div>
                                </SelectItem>
                            ))}
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
                <div className="space-y-4">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription>Total Orders</CardDescription>
                                <CardTitle className="text-2xl">{completedOrders.length}</CardTitle>
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
                                <CardDescription>Fastest</CardDescription>
                                <CardTitle className="text-2xl">
                                    {completedOrders.length > 0 ? Math.min(...completedOrders.map(o => o.durationMinutes)) : 0}m
                                </CardTitle>
                            </CardHeader>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription>Slowest</CardDescription>
                                <CardTitle className="text-2xl">
                                    {completedOrders.length > 0 ? Math.max(...completedOrders.map(o => o.durationMinutes)) : 0}m
                                </CardTitle>
                            </CardHeader>
                        </Card>
                    </div>

                    {/* Orders Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Completed Orders</CardTitle>
                            <CardDescription>Last {completedOrders.length} completed orders</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Booth</TableHead>
                                        <TableHead>Company</TableHead>
                                        <TableHead>Zone</TableHead>
                                        <TableHead>Items</TableHead>
                                        <TableHead>Ordered</TableHead>
                                        <TableHead>Completed</TableHead>
                                        <TableHead>Duration</TableHead>
                                        <TableHead>Shifter</TableHead>
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
                                                    <TableCell className="font-medium">
                                                        #{order.booth?.booth_number}
                                                    </TableCell>
                                                    <TableCell>
                                                        {order.booth?.company?.name || "—"}
                                                    </TableCell>
                                                    <TableCell>
                                                        {zone ? (
                                                            <div className="flex items-center gap-2">
                                                                <span className={`w-2 h-2 rounded-full ${getZoneColor(zone.id, initialZones)}`} />
                                                                <span className="text-sm">{zone.name}</span>
                                                            </div>
                                                        ) : "—"}
                                                    </TableCell>
                                                    <TableCell>
                                                        {(order.items || []).map((item, i) => (
                                                            <span key={i} className="text-sm">
                                                                {item.name} ×{item.quantity}{i < order.items.length - 1 ? ", " : ""}
                                                            </span>
                                                        ))}
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        {formatDateTime(order.date_created)}
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        {formatDateTime(order.date_updated)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={order.durationMinutes <= avgDuration ? "default" : "secondary"}>
                                                            <Clock className="mr-1 h-3 w-3" />
                                                            {order.durationFormatted}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        {typeof order.shifter === 'object'
                                                            ? order.shifter?.first_name || "—"
                                                            : "—"}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            ) : (
                /* Active Orders View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {orders.length === 0 && !loading && (
                        <p className="col-span-full text-center text-muted-foreground py-12">No pending orders.</p>
                    )}

                    {orders.map((order) => {
                        const isMyOrder = order.shifter?.id === currentUserId || order.shifter === currentUserId;
                        const isTaken = !!order.shifter && !isMyOrder;
                        const zone = getOrderZone(order);

                        return (
                            <Card key={order.id} className={`${order.status === 'preparing' ? 'border-primary' : ''} ${isTaken ? 'opacity-70 bg-gray-50' : ''}`}>
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <CardTitle>Booth {order.booth?.booth_number}</CardTitle>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={order.status === 'preparing' ? "default" : "secondary"}>
                                                {order.status}
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
                                    <CardDescription>{order.booth?.company?.name || "Unknown Company"}</CardDescription>

                                    {/* Zone indicator - always show */}
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`w-3 h-3 rounded-full ${zone ? getZoneColor(zone.id, initialZones) : 'bg-gray-300'}`} />
                                        <span className="text-sm text-muted-foreground">{zone ? zone.name : 'No Zone'}</span>
                                    </div>

                                    {isTaken && (
                                        <p className="text-xs text-amber-600 font-bold">
                                            Being prepared by {typeof order.shifter === 'object' ? order.shifter.first_name : 'another shifter'}
                                        </p>
                                    )}
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
            )}
        </div>
    );
}

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
import { Badge } from "@/components/ui/badge";
import { fetchOrdersAction, finishOrderAction, pickUpOrderAction } from "@/app/actions/orders";
import type { Order, Zone, OrderItem } from "@/lib/schema";
import { Check, Loader2, Play } from "lucide-react";

type ExtendedOrder = Order & {
    booth: any; // Using any to bypass potential schema mismatch during dev
    shifter: any;
};

export default function ShifterDashboardClient({ initialZones, currentUserId }: { initialZones: Zone[], currentUserId: string }) {
    const [orders, setOrders] = useState<ExtendedOrder[]>([]);
    const [selectedZone, setSelectedZone] = useState<string>("all");
    const [loading, setLoading] = useState(true);

    const loadOrders = async () => {
        // Silently refresh
        const data = await fetchOrdersAction(selectedZone);
        setOrders(data as unknown as ExtendedOrder[]);
        setLoading(false);
    };

    useEffect(() => {
        loadOrders();
        const interval = setInterval(loadOrders, 5000); // Poll every 5 seconds
        return () => clearInterval(interval);
    }, [selectedZone]);

    const handlePickup = async (id: string) => {
        await pickUpOrderAction(id);
        loadOrders();
    };

    const handleFinish = async (id: string) => {
        await finishOrderAction(id);
        loadOrders();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <label className="font-medium">Filter by Zone:</label>
                <Select value={selectedZone} onValueChange={setSelectedZone}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="All Zones" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Zones</SelectItem>
                        {initialZones.map(z => (
                            <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {orders.length === 0 && !loading && (
                    <p className="col-span-full text-center text-muted-foreground py-12">No pending orders.</p>
                )}

                {orders.map((order) => {
                    const isMyOrder = order.shifter?.id === currentUserId || order.shifter === currentUserId;
                    const isTaken = !!order.shifter && !isMyOrder;

                    return (
                        <Card key={order.id} className={`${order.status === 'preparing' ? 'border-primary' : ''} ${isTaken ? 'opacity-70 bg-gray-50' : ''}`}>
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <CardTitle>Booth {order.booth?.booth_number}</CardTitle>
                                    <Badge variant={order.status === 'preparing' ? "default" : "secondary"}>
                                        {order.status}
                                    </Badge>
                                </div>
                                <CardDescription>{order.booth?.company?.name || "Unknown Company"}</CardDescription>
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
                                {order.status === 'preparing' && isMyOrder && (
                                    <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => handleFinish(order.id)}>
                                        <Check className="mr-2 h-4 w-4" /> Finish
                                    </Button>
                                )}
                            </CardFooter>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}

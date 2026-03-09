"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Minus, Plus, ShoppingCart, Loader2, XCircle } from "lucide-react";
import { placeOrderAction, checkOrderStatusAction, cancelOrderAction } from "@/app/actions/booth";
import type { Drink, Order } from "@/lib/schema";
import { useRouter } from "next/navigation";
import { getDirectusImageUrl } from "@/components/Images";

export default function BoothClient({
    boothId,
    companyId,
    initialDrinks,
    initialActiveOrder
}: {
    boothId: string,
    companyId: string,
    initialDrinks: Drink[],
    initialActiveOrder: Order | null
}) {
    const [cart, setCart] = useState<{ [key: string]: number }>({});
    const [activeOrder, setActiveOrder] = useState<Order | null>(initialActiveOrder);
    const [submitting, setSubmitting] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const router = useRouter();

    // Poll for order status updates if active order exists
    useEffect(() => {
        if (!activeOrder) return;

        const interval = setInterval(async () => {
            const order = await checkOrderStatusAction(boothId);
            if (!order) {
                // Order finished or disappeared
                setActiveOrder(null);
                router.refresh();
            } else {
                setActiveOrder(order);
            }
        }, 5000); // 5 seconds

        return () => clearInterval(interval);
    }, [activeOrder, boothId, router]);

    const updateQuantity = (id: string, delta: number) => {
        setCart(prev => {
            const next = { ...prev };
            next[id] = (next[id] || 0) + delta;
            if (next[id] <= 0) delete next[id];
            return next;
        });
    };

    const handlePlaceOrder = async () => {
        if (!companyId) {
            console.warn("Placing order without companyId (permissions restriction).");
            // Proceed anyway, backend might handle it or we assume generic order
        }
        setSubmitting(true);

        const items = Object.entries(cart).map(([drinkId, qty]) => {
            const drink = initialDrinks.find(d => d.id === drinkId);
            return {
                drink_id: drinkId,
                name: drink?.name || "Unknown",
                quantity: qty
            };
        });

        const res = await placeOrderAction(boothId, companyId, items);
        if (res.success) {
            setActiveOrder({
                status: 'pending',
                items: items.map(i => ({
                    drink_id: i.drink_id,
                    name: i.name,
                    quantity: i.quantity,
                })),
            } as Order);
            setCart({});
            router.refresh();
        } else {
            alert(res.error || "Failed");
        }
        setSubmitting(false);
    };

    const handleCancel = async () => {
        if (!activeOrder?.id) return;
        setCancelling(true);
        const res = await cancelOrderAction(boothId, activeOrder.id);
        if (res.success) {
            setActiveOrder(null);
            router.refresh();
        } else {
            alert(res.error || "Failed to cancel order");
        }
        setCancelling(false);
    };

    if (activeOrder) {
        const isPreparing = activeOrder.status === 'preparing';
        const totalItems = activeOrder.items?.reduce((acc, i) => acc + i.quantity, 0) || 0;

        return (
            <Card className={`text-center py-10 ${isPreparing
                ? 'bg-green-50 border-green-300'
                : 'bg-amber-50 border-amber-200'
                }`}>
                <CardContent className="space-y-4">
                    <Loader2 className={`h-12 w-12 animate-spin mx-auto ${isPreparing ? 'text-green-500' : 'text-amber-500'
                        }`} />
                    <h2 className={`text-xl font-semibold ${isPreparing ? 'text-green-800' : 'text-amber-800'
                        }`}>
                        {isPreparing ? 'Being Prepared!' : 'Order Pending'}
                    </h2>

                    {activeOrder.items && activeOrder.items.length > 0 && (
                        <div className={`text-sm text-left inline-block rounded-md px-4 py-2 ${isPreparing ? 'bg-green-100/60' : 'bg-amber-100/60'}`}>
                            {activeOrder.items.map((item, idx) => (
                                <div key={idx} className={`flex justify-between gap-6 py-0.5 ${isPreparing ? 'text-green-700' : 'text-amber-700'}`}>
                                    <span>{item.name || 'Unknown item'}</span>
                                    <span className="font-semibold">x{item.quantity}</span>
                                </div>
                            ))}
                            <div className={`border-t mt-1 pt-1 flex justify-between gap-6 font-semibold ${isPreparing ? 'border-green-300 text-green-800' : 'border-amber-300 text-amber-800'}`}>
                                <span>Total</span>
                                <span>{totalItems} items</span>
                            </div>
                        </div>
                    )}

                    <p className={`text-sm ${isPreparing ? 'text-green-500' : 'text-amber-500'}`}>
                        Status: <span className="uppercase font-bold">{activeOrder.status}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-4">
                        {isPreparing
                            ? 'Your order is being prepared. It wil arrive soon!'
                            : 'Your order is being picked up soon.'}
                    </p>

                    {!isPreparing && (
                        <Button
                            variant="outline"
                            className="mt-2 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={handleCancel}
                            disabled={cancelling}
                        >
                            {cancelling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                            Cancel Order
                        </Button>
                    )}
                </CardContent>
            </Card>
        );
    }

    const drinkItems = initialDrinks.filter(d => d.type === 'drink');
    const snackItems = initialDrinks.filter(d => d.type === 'snack');

    const renderItem = (item: Drink) => {
        const qty = cart[item.id] || 0;
        return (
            <div key={item.id} className="flex justify-between items-center py-1 px-4 border-b last:border-0">
                <div className="flex gap-3 items-center">
                    {/* Image */}
                    {item.image && (
                        <div className="relative flex-shrink-0 rounded-md overflow-hidden bg-white" style={{ width: '80px', height: '80px' }}>
                            <img
                                src={getDirectusImageUrl(item.image)}
                                alt={item.name}
                                className="absolute inset-0 h-full w-full object-contain p-1"
                            />
                        </div>
                    )}
                    <div>
                        <p className="font-bold text-lg">{item.name}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {qty > 0 && (
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, -1)}>
                            <Minus className="h-3 w-3" />
                        </Button>
                    )}
                    <span className={`w-6 text-center ${qty > 0 ? "font-bold" : "text-muted-foreground"}`}>
                        {qty > 0 ? qty : ""}
                    </span>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, 1)}>
                        <Plus className="h-3 w-3" />
                    </Button>
                </div>
            </div>
        );
    };

    const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);

    return (
        <div className="space-y-8 pb-20">

            {drinkItems.length > 0 && (
                <section>
                    <h3 className="text-lg font-semibold mb-4 text-gray-700 uppercase tracking-wide text-xs">Drinks</h3>
                    <Card className="py-0">
                        <CardContent className="p-0">
                            {drinkItems.map(renderItem)}
                        </CardContent>
                    </Card>
                </section>
            )}

            {snackItems.length > 0 && (
                <section>
                    <h3 className="text-lg font-semibold mb-4 text-gray-700 uppercase tracking-wide text-xs">Snacks</h3>
                    <Card className="py-0">
                        <CardContent className="p-0">
                            {snackItems.map(renderItem)}
                        </CardContent>
                    </Card>
                </section>
            )}

            {totalItems > 0 && (
                <div className="sticky bottom-4 z-50 mt-4">
                    <Button size="lg" className="w-full shadow-lg text-lg" onClick={handlePlaceOrder} disabled={submitting}>
                        {submitting ? <Loader2 className="mr-2 animate-spin" /> : <ShoppingCart className="mr-2" />}
                        Place Order ({totalItems} items)
                    </Button>
                </div>
            )}
        </div>
    );
}

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Minus, Plus, ShoppingCart, Loader2 } from "lucide-react";
import { placeOrderAction, checkOrderStatusAction } from "@/app/actions/booth";
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
            setCart({});
            // Optimistically set active order
            setActiveOrder({ status: 'pending' } as Order);
            router.refresh();
        } else {
            alert(res.error || "Failed");
        }
        setSubmitting(false);
    };

    if (activeOrder) {
        const isPreparing = activeOrder.status === 'preparing';

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
                    <p className={isPreparing ? 'text-green-600' : 'text-amber-600'}>
                        Amount: {activeOrder.items?.reduce((acc, i) => acc + i.quantity, 0) || 0} items
                    </p>
                    <p className={`text-sm ${isPreparing ? 'text-green-500' : 'text-amber-500'}`}>
                        Status: <span className="uppercase font-bold">{activeOrder.status}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-4">
                        {isPreparing
                            ? 'A shifter is now preparing your order. It will arrive soon!'
                            : 'Please wait until a shifter picks up your order.'}
                    </p>
                </CardContent>
            </Card>
        );
    }

    const drinkItems = initialDrinks.filter(d => d.type === 'drink');
    const snackItems = initialDrinks.filter(d => d.type === 'snack');

    const renderItem = (item: Drink) => {
        const qty = cart[item.id] || 0;
        return (
            <div key={item.id} className="flex justify-between items-center py-3 border-b last:border-0">
                <div className="flex gap-3 items-center">
                    {/* Optional Image */}
                    {/* <div className="h-10 w-10 bg-gray-100 rounded"></div> */}
                    <div>
                        <p className="font-medium">{item.name}</p>
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
                    <Card>
                        <CardContent className="pt-4">
                            {drinkItems.map(renderItem)}
                        </CardContent>
                    </Card>
                </section>
            )}

            {snackItems.length > 0 && (
                <section>
                    <h3 className="text-lg font-semibold mb-4 text-gray-700 uppercase tracking-wide text-xs">Snacks</h3>
                    <Card>
                        <CardContent className="pt-4">
                            {snackItems.map(renderItem)}
                        </CardContent>
                    </Card>
                </section>
            )}

            {totalItems > 0 && (
                <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto">
                    <Button size="lg" className="w-full shadow-lg text-lg" onClick={handlePlaceOrder} disabled={submitting}>
                        {submitting ? <Loader2 className="mr-2 animate-spin" /> : <ShoppingCart className="mr-2" />}
                        Place Order ({totalItems} items)
                    </Button>
                </div>
            )}
        </div>
    );
}

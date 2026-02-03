"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { createDrinkAction, deleteDrinkAction, updateDrinkAction } from "@/app/actions/drinks"; // You'll need to create this
import type { Drink } from "@/lib/schema";
import { useRouter } from "next/navigation";
import { Trash2, Edit, Plus } from "lucide-react";

export default function DrinksClient({ initialDrinks }: { initialDrinks: Drink[] }) {
    const [drinks, setDrinks] = useState(initialDrinks);
    const [isOpen, setIsOpen] = useState(false);
    const [editingDrink, setEditingDrink] = useState<Drink | null>(null);
    const router = useRouter();

    // Form state
    const [formData, setFormData] = useState<Partial<Drink>>({
        name: "",
        type: "drink",
        is_active: true,
        visible_from: "",
        visible_until: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingDrink) {
            await updateDrinkAction(editingDrink.id, formData);
        } else {
            await createDrinkAction(formData);
        }
        setIsOpen(false);
        setEditingDrink(null);
        setFormData({ name: "", type: "drink", is_active: true });
        router.refresh();
    };

    const openEdit = (drink: Drink) => {
        setEditingDrink(drink);
        setFormData({
            name: drink.name,
            type: drink.type,
            is_active: drink.is_active,
            visible_from: drink.visible_from,
            visible_until: drink.visible_until,
        });
        setIsOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure?")) {
            await deleteDrinkAction(id);
            router.refresh();
        }
    };

    return (
        <div className="space-y-4">
            <Dialog open={isOpen} onOpenChange={(open) => {
                setIsOpen(open);
                if (!open) setEditingDrink(null);
            }}>
                <DialogTrigger asChild>
                    <Button onClick={() => {
                        setEditingDrink(null);
                        setFormData({ name: "", type: "drink", is_active: true });
                    }}>
                        <Plus className="mr-2 h-4 w-4" /> Add Item
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingDrink ? "Edit Item" : "Add New Item"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid w-full gap-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="grid w-full gap-2">
                            <Label htmlFor="type">Type</Label>
                            <select
                                id="type"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value as "drink" | "snack" })}
                            >
                                <option value="drink">Drink</option>
                                <option value="snack">Snack</option>
                            </select>
                        </div>
                        <div className="grid w-full gap-2">
                            <Label>Visibility Time (Optional)</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="time"
                                    placeholder="From"
                                    value={formData.visible_from || ""}
                                    onChange={(e) => setFormData({ ...formData, visible_from: e.target.value })}
                                />
                                <Input
                                    type="time"
                                    placeholder="Until"
                                    value={formData.visible_until || ""}
                                    onChange={(e) => setFormData({ ...formData, visible_until: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="active"
                                checked={formData.is_active}
                                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked as boolean })}
                            />
                            <Label htmlFor="active">Available</Label>
                        </div>
                        <Button type="submit" className="w-full">
                            {editingDrink ? "Update" : "Create"}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Active</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {initialDrinks.map((drink) => (
                            <TableRow key={drink.id}>
                                <TableCell className="font-medium">{drink.name}</TableCell>
                                <TableCell>{drink.type}</TableCell>
                                <TableCell>{drink.is_active ? "Yes" : "No"}</TableCell>
                                <TableCell>
                                    <div className="flex gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => openEdit(drink)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(drink.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

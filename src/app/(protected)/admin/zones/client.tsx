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
import { createZoneAction, deleteZoneAction, updateZoneAction } from "@/app/actions/zones";
import type { Zone, Booth } from "@/lib/schema";
import { useRouter } from "next/navigation";
import { Trash2, Edit, Plus, Printer, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ZonesClient({ initialZones, booths }: { initialZones: Zone[], booths: Booth[] }) {
    const [zones, setZones] = useState(initialZones);
    const [isOpen, setIsOpen] = useState(false);
    const [editingZone, setEditingZone] = useState<Zone | null>(null);
    const router = useRouter();

    const [formData, setFormData] = useState<{
        name: string;
        booths: string[];
    }>({
        name: "",
        booths: [],
    });

    const [rangeFrom, setRangeFrom] = useState("");
    const [rangeTo, setRangeTo] = useState("");
    const [ranges, setRanges] = useState<{ from: number; to: number }[]>([]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingZone) {
            await updateZoneAction(editingZone.id, formData);
        } else {
            await createZoneAction(formData);
        }
        setIsOpen(false);
        setEditingZone(null);
        setFormData({ name: "", booths: [] });
        setRanges([]);
        setRangeFrom("");
        setRangeTo("");
        router.refresh();
    };

    const openEdit = (zone: Zone) => {
        setEditingZone(zone);
        // map booth objects to IDs
        const boothIds = Array.isArray(zone.booths)
            ? zone.booths.map((b: any) => typeof b === 'string' ? b : b.id)
            : [];

        setFormData({
            name: zone.name,
            booths: boothIds,
        });
        setIsOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure?")) {
            await deleteZoneAction(id);
            router.refresh();
        }
    };

    const toggleBooth = (boothId: string) => {
        setFormData(prev => {
            const exists = prev.booths.includes(boothId);
            if (exists) {
                return { ...prev, booths: prev.booths.filter(id => id !== boothId) };
            } else {
                return { ...prev, booths: [...prev.booths, boothId] };
            }
        });
    };

    const addRange = () => {
        const from = parseInt(rangeFrom);
        const to = parseInt(rangeTo);
        if (isNaN(from) || isNaN(to) || from > to) return;

        const boothIdsInRange = booths
            .filter(b => b.booth_number >= from && b.booth_number <= to)
            .map(b => b.id);

        setFormData(prev => {
            const merged = new Set([...prev.booths, ...boothIdsInRange]);
            return { ...prev, booths: Array.from(merged) };
        });
        setRanges(prev => [...prev, { from, to }]);
        setRangeFrom("");
        setRangeTo("");
    };

    const removeRange = (index: number) => {
        const range = ranges[index];
        const boothIdsInRange = new Set(
            booths
                .filter(b => b.booth_number >= range.from && b.booth_number <= range.to)
                .map(b => b.id)
        );

        const otherRanges = ranges.filter((_, i) => i !== index);
        const boothIdsInOtherRanges = new Set(
            otherRanges.flatMap(r =>
                booths.filter(b => b.booth_number >= r.from && b.booth_number <= r.to).map(b => b.id)
            )
        );

        setFormData(prev => ({
            ...prev,
            booths: prev.booths.filter(id => !boothIdsInRange.has(id) || boothIdsInOtherRanges.has(id)),
        }));
        setRanges(otherRanges);
    };

    return (
        <div className="space-y-4">
            <Dialog open={isOpen} onOpenChange={(open) => {
                setIsOpen(open);
                if (!open) setEditingZone(null);
            }}>
                <DialogTrigger asChild>
                    <Button onClick={() => {
                        setEditingZone(null);
                        setFormData({ name: "", booths: [] });
                        setRanges([]);
                        setRangeFrom("");
                        setRangeTo("");
                    }}>
                        <Plus className="mr-2 h-4 w-4" /> Add Zone
                    </Button>
                </DialogTrigger>
                <Button variant="outline" onClick={() => router.push('/admin/zones/print')}>
                    <Printer className="mr-2 h-4 w-4" /> Print QR Codes
                </Button>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingZone ? "Edit Zone" : "Create Zone"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid w-full gap-2">
                            <Label htmlFor="name">Zone Name</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-3">
                            <Label>Assign Booths</Label>

                            <div className="space-y-2 rounded-md border p-3 bg-muted/30">
                                <p className="text-sm font-medium">Quick add by range</p>
                                <div className="flex items-end gap-2">
                                    <div className="grid gap-1">
                                        <Label htmlFor="range-from" className="text-xs">From booth</Label>
                                        <Input
                                            id="range-from"
                                            type="number"
                                            min={1}
                                            placeholder="e.g. 1"
                                            value={rangeFrom}
                                            onChange={(e) => setRangeFrom(e.target.value)}
                                            className="w-24"
                                        />
                                    </div>
                                    <div className="grid gap-1">
                                        <Label htmlFor="range-to" className="text-xs">To booth</Label>
                                        <Input
                                            id="range-to"
                                            type="number"
                                            min={1}
                                            placeholder="e.g. 20"
                                            value={rangeTo}
                                            onChange={(e) => setRangeTo(e.target.value)}
                                            className="w-24"
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={addRange}
                                        disabled={!rangeFrom || !rangeTo || parseInt(rangeFrom) > parseInt(rangeTo)}
                                    >
                                        <Plus className="mr-1 h-3 w-3" /> Add Range
                                    </Button>
                                </div>
                                {ranges.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {ranges.map((range, i) => (
                                            <Badge key={i} variant="secondary" className="gap-1 pr-1">
                                                Booth {range.from}–{range.to}
                                                <button
                                                    type="button"
                                                    onClick={() => removeRange(i)}
                                                    className="ml-0.5 rounded-full hover:bg-muted p-0.5"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground">
                                    {formData.booths.length} of {booths.length} booths selected
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setFormData(prev => ({ ...prev, booths: booths.map(b => b.id) }));
                                        }}
                                    >
                                        Select All
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setFormData(prev => ({ ...prev, booths: [] }));
                                            setRanges([]);
                                        }}
                                    >
                                        Clear All
                                    </Button>
                                </div>
                            </div>

                            <div className="border rounded-md p-4 h-60 overflow-y-auto grid grid-cols-2 gap-2">
                                {booths.map(booth => {
                                    const companyName = booth.company?.name || "Unassigned";
                                    const floorPlanName = booth.Floorplan?.name || "Unknown Floorplan";
                                    return (
                                        <div key={booth.id} className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                id={`booth-${booth.id}`}
                                                checked={formData.booths.includes(booth.id)}
                                                onChange={() => toggleBooth(booth.id)}
                                                className="h-4 w-4 rounded border-gray-300"
                                            />
                                            <label htmlFor={`booth-${booth.id}`} className="text-sm cursor-pointer">
                                                <span className="font-bold">{booth.booth_number}</span> - {companyName} <span className="text-xs text-muted-foreground">({floorPlanName})</span>
                                            </label>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <Button type="submit" className="w-full">
                            {editingZone ? "Update" : "Create"}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Booths</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {initialZones.map((zone) => {
                            const boothCount = Array.isArray(zone.booths) ? zone.booths.length : 0;
                            return (
                                <TableRow key={zone.id}>
                                    <TableCell className="font-medium">{zone.name}</TableCell>
                                    <TableCell>{boothCount} Booths</TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => openEdit(zone)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(zone.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

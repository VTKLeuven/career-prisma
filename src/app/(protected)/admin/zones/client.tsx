"use client";

import { useState, useMemo } from "react";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { createZoneAction, deleteZoneAction, updateZoneAction } from "@/app/actions/zones";
import type { Zone, Booth, CareerEventPage } from "@/lib/schema";
import { useRouter } from "next/navigation";
import { Trash2, Edit, Plus, Printer, X, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function getFloorplanId(page: CareerEventPage): string | null {
    const fp = page.floorplan;
    if (!fp) return null;
    return typeof fp === "object" && fp?.id ? fp.id : (typeof fp === "string" ? fp : null);
}

export default function ZonesClient({
    initialZones,
    booths,
    baseUrl,
    careerEventPages,
}: {
    initialZones: Zone[];
    booths: Booth[];
    baseUrl: string;
    careerEventPages: CareerEventPage[];
}) {
    const [selectedEventPageId, setSelectedEventPageId] = useState<string>("");
    const [zones, setZones] = useState(initialZones);
    const [isOpen, setIsOpen] = useState(false);
    const [editingZone, setEditingZone] = useState<Zone | null>(null);
    const router = useRouter();

    const selectedEventPage = careerEventPages.find((p) => p.id === selectedEventPageId) ?? null;
    const floorplanId = selectedEventPage ? getFloorplanId(selectedEventPage) : null;

    const { filteredBooths2, filteredZones } = useMemo(() => {
        if (!floorplanId) {
            return { filteredBooths2: [] as Booth[], filteredZones: [] as Zone[] };
        }
        const fpId = floorplanId;
        const boothIdsForFloorplan = new Set(
            booths
                .filter((b) => {
                    const fp = b.Floorplan;
                    const fpIdResolved = typeof fp === "object" && fp && "id" in fp ? (fp as { id: string }).id : fp;
                    return fpIdResolved === fpId;
                })
                .map((b) => String(b.id))
        );
        const filteredBooths2 = booths.filter((b) => boothIdsForFloorplan.has(String(b.id)));
        const filteredZones = initialZones.filter((zone) => {
            const zoneBooths = Array.isArray(zone.booths) ? zone.booths : [];
            if (zoneBooths.length === 0) return true;
            return zoneBooths.some((b: unknown) => {
                const bid = typeof b === "object" && b && "id" in b ? (b as { id: any }).id : b;
                return boothIdsForFloorplan.has(String(bid));
            });
        });
        return { filteredBooths2, filteredZones };
    }, [floorplanId, booths, initialZones]);

    const [formData, setFormData] = useState<{
        name: string;
        booths: string[];
        dot_color: string;
    }>({
        name: "",
        booths: [],
        dot_color: "",
    });

    const [rangeFrom, setRangeFrom] = useState("");
    const [rangeTo, setRangeTo] = useState("");
    const [ranges, setRanges] = useState<{ from: number; to: number }[]>([]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            ...formData,
            dot_color: formData.dot_color?.trim() || undefined,
        };
        if (editingZone) {
            await updateZoneAction(editingZone.id, payload);
        } else {
            await createZoneAction(payload);
        }
        setIsOpen(false);
        setEditingZone(null);
        setFormData({ name: "", booths: [], dot_color: "" });
        setRanges([]);
        setRangeFrom("");
        setRangeTo("");
        router.refresh();
    };

    const openEdit = (zone: Zone) => {
        setEditingZone(zone);
        // map booth objects to IDs
        const boothIds = Array.isArray(zone.booths)
            ? zone.booths.map((b: any) => typeof b === 'object' && b && 'id' in b ? String(b.id) : String(b))
            : [];

        setFormData({
            name: zone.name,
            booths: boothIds,
            dot_color: (zone as { dot_color?: string }).dot_color || "",
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

        const boothIdsInRange = filteredBooths2
            .filter(b => b.booth_number >= from && b.booth_number <= to)
            .map(b => String(b.id));

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
            filteredBooths2
                .filter(b => b.booth_number >= range.from && b.booth_number <= range.to)
                .map(b => String(b.id))
        );

        const otherRanges = ranges.filter((_, i) => i !== index);
        const boothIdsInOtherRanges = new Set(
            otherRanges.flatMap(r =>
                filteredBooths2.filter(b => b.booth_number >= r.from && b.booth_number <= r.to).map(b => String(b.id))
            )
        );

        setFormData(prev => ({
            ...prev,
            booths: prev.booths.filter(id => !boothIdsInRange.has(id) || boothIdsInOtherRanges.has(id)),
        }));
        setRanges(otherRanges);
    };

    const exportCSV = () => {
        const escapeCsv = (value: string) => {
            if (value.includes(",") || value.includes('"') || value.includes("\n")) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        };

        const header = "Company,Booth URL";
        const rows = filteredBooths2
            .filter(b => b.company?.name)
            .map(b => `${escapeCsv(b.company!.name)},${baseUrl}/booth/${b.id}`);

        const csv = [header, ...rows].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `booth-qr-urls-${new Date().toISOString().split("T")[0]}.csv`;
        link.click();
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-4 rounded-lg border p-4 bg-muted/30">
                <Label>Career Event Page</Label>
                <Select value={selectedEventPageId} onValueChange={setSelectedEventPageId}>
                    <SelectTrigger className="max-w-md">
                        <SelectValue placeholder="Select a career event page to manage zones & booths..." />
                    </SelectTrigger>
                    <SelectContent>
                        {careerEventPages.map((page) => (
                            <SelectItem key={page.id} value={page.id}>
                                {(page.event as { name?: string })?.name ?? "Event"} – {(page.floorplan as { name?: string })?.name ?? "Floorplan"}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {careerEventPages.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                        Create an event page and assign a floorplan to it first.
                    </p>
                )}
            </div>

            {!selectedEventPage && (
                <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                    Select a career event page above to assign booths to zones, print QR codes, or export CSV.
                </div>
            )}

            {selectedEventPage && (
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <Dialog open={isOpen} onOpenChange={(open) => {
                            setIsOpen(open);
                            if (!open) setEditingZone(null);
                        }}>
                            <DialogTrigger asChild>
                                <Button onClick={() => {
                                    setEditingZone(null);
                                    setFormData({ name: "", booths: [], dot_color: "" });
                                    setRanges([]);
                                    setRangeFrom("");
                                    setRangeTo("");
                                }}>
                                    <Plus className="mr-2 h-4 w-4" /> Add Zone
                                </Button>
                            </DialogTrigger>
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

                                    <div className="grid w-full gap-2">
                                        <Label htmlFor="dot_color">Zone Dot Color (Shifter Dashboard)</Label>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                id="dot_color"
                                                type="text"
                                                placeholder="e.g. #ff0000 or #3b82f6"
                                                value={formData.dot_color}
                                                onChange={(e) => setFormData({ ...formData, dot_color: e.target.value })}
                                                className="max-w-[140px] font-mono"
                                            />
                                            {formData.dot_color && (
                                                <span
                                                    className="w-6 h-6 rounded-full border shrink-0"
                                                    style={{ backgroundColor: formData.dot_color }}
                                                    title={formData.dot_color}
                                                />
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Hex color for the zone indicator dot on the shifter platform. Leave empty for default.
                                        </p>
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
                                                {formData.booths.length} of {filteredBooths2.length} booths selected
                                            </p>
                                            <div className="flex gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setFormData(prev => ({ ...prev, booths: filteredBooths2.map(b => String(b.id)) }));
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
                                            {filteredBooths2.map(booth => {
                                                const companyName = booth.company?.name || "Unassigned";
                                                const floorPlanName = booth.Floorplan?.name || "Unknown Floorplan";
                                                return (
                                                    <div key={booth.id} className="flex items-center space-x-2">
                                                        <input
                                                            type="checkbox"
                                                            id={`booth-${booth.id}`}
                                                            checked={formData.booths.includes(String(booth.id))}
                                                            onChange={() => toggleBooth(String(booth.id))}
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
                        <Button variant="outline" onClick={() => router.push(`/admin/zones/print?eventPageId=${selectedEventPageId}`)}>
                            <Printer className="mr-2 h-4 w-4" /> Print QR Codes
                        </Button>
                        <Button variant="outline" onClick={exportCSV}>
                            <Download className="mr-2 h-4 w-4" /> Export CSV
                        </Button>
                    </div>

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
                                {filteredZones.map((zone) => {
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
            )}
        </div>
    );
}

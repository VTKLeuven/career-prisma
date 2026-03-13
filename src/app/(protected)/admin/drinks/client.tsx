"use client";


function TimePicker24h({ value, onChange, placeholder }: { value: string, onChange: (val: string) => void, placeholder: string }) {
    // Parse value "HH:mm"
    const [h, m] = value ? value.split(':') : ["", ""];
    const minutesRef = useRef<HTMLInputElement>(null);

    const updateTime = (newH: string, newM: string) => {
        if (!newH && !newM) onChange("");
        else onChange(`${newH}:${newM}`);
    };

    const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/[^0-9]/g, '');
        if (val.length > 2) val = val.slice(0, 2);

        let num = parseInt(val);
        if (isNaN(num)) {
            // empty
            updateTime("", m);
            return;
        }

        // Limit to 23
        if (num > 23) {
            val = "23";
        }

        updateTime(val, m);

        if (val.length === 2) {
            minutesRef.current?.focus();
        }
    };

    const handleHourBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (val.length > 0) {
            updateTime(val.padStart(2, '0'), m);
        }
    }

    const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/[^0-9]/g, '');
        if (val.length > 2) val = val.slice(0, 2);

        let num = parseInt(val);
        if (isNaN(num)) {
            updateTime(h, "");
            return;
        }

        if (num > 59) {
            val = "59";
        }

        updateTime(h, val);
    };

    const handleMinuteBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (val.length > 0) {
            updateTime(h, val.padStart(2, '0'));
        }
    }

    return (
        <div className="flex h-10 flex-1 items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
            <span className="text-muted-foreground mr-2 text-xs uppercase tracking-wider">{placeholder}</span>
            <div className="flex items-center gap-1">
                <Input
                    className="w-9 p-0 text-center shadow-none border-none focus-visible:ring-0 h-auto bg-transparent tabular-nums"
                    placeholder="HH"
                    value={h}
                    onChange={handleHourChange}
                    onBlur={handleHourBlur}
                    maxLength={2}
                />
                <span className="text-muted-foreground">:</span>
                <Input
                    ref={minutesRef}
                    className="w-9 p-0 text-center shadow-none border-none focus-visible:ring-0 h-auto bg-transparent tabular-nums"
                    placeholder="MM"
                    value={m}
                    onChange={handleMinuteChange}
                    onBlur={handleMinuteBlur}
                    maxLength={2}
                />
            </div>
        </div>
    );
}

import { useState, useRef } from "react";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { createDrinkAction, deleteDrinkAction, updateDrinkAction, setOrderingSettingsAction } from "@/app/actions/drinks";
import { uploadFileAction } from "@/app/actions/media";
import type { Drink, CareerEvent } from "@/lib/schema";
import { useRouter } from "next/navigation";
import { Trash2, Edit, Plus, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DrinksClient({
    initialDrinks,
    initialCompanyOrderingEnabled = false,
    initialActiveEventId = null,
    events = [],
}: {
    initialDrinks: Drink[];
    initialCompanyOrderingEnabled?: boolean;
    initialActiveEventId?: string | null;
    events?: CareerEvent[];
}) {
    const [drinks, setDrinks] = useState(initialDrinks);
    const [isOpen, setIsOpen] = useState(false);
    const [editingDrink, setEditingDrink] = useState<Drink | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    // Ordering settings state
    const [companyOrderingEnabled, setCompanyOrderingEnabled] = useState(initialCompanyOrderingEnabled);
    const [activeEventId, setActiveEventId] = useState<string | null>(initialActiveEventId);
    const [updatingSettings, setUpdatingSettings] = useState(false);

    const router = useRouter();

    const updateOrderingSettings = async (enabled: boolean, eventId: string | null) => {
        setUpdatingSettings(true);
        const res = await setOrderingSettingsAction(enabled, eventId);
        setUpdatingSettings(false);
        if (res.success) {
            setCompanyOrderingEnabled(enabled);
            setActiveEventId(eventId);
            router.refresh();
        } else {
            alert(res.error || "Failed to update setting");
        }
    };

    const handleCompanyOrderingToggle = (checked: boolean) => {
        updateOrderingSettings(checked, activeEventId);
    };

    const handleActiveEventChange = (value: string) => {
        const newEventId = value === "none" ? null : value;
        updateOrderingSettings(companyOrderingEnabled, newEventId);
    };

    // Form state
    const [formData, setFormData] = useState<Partial<Drink>>({
        name: "",
        type: "drink",
        is_active: true,
        visible_from: "",
        visible_until: "",
        image: undefined,
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);
            // Create a temporary URL for preview
            const objectUrl = URL.createObjectURL(file);
            setFormData(prev => ({ ...prev, image: objectUrl }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setUploading(true);

        try {
            let imageId = formData.image;

            // correct: if it's a temp blob URL, we need to upload the file
            // if it is a string but NOT a blob url, it's likely an existing ID, so keep it.
            // But we have selectedFile to be sure.

            if (selectedFile) {
                const uploadFormData = new FormData();
                uploadFormData.append("file", selectedFile);

                const uploadRes = await uploadFileAction(uploadFormData);
                if (!uploadRes.success || !uploadRes.data) {
                    alert("Failed to upload image: " + (uploadRes.error || "Unknown error"));
                    setUploading(false);
                    return;
                }

                // Directus returns { id: ... } or { data: { id: ... } } depending on version/endpoint
                // The SDK typically returns the object directly.
                imageId = uploadRes.data.id;
            } else if (typeof formData.image === 'string' && formData.image.startsWith('blob:')) {
                // Should not happen if selectedFile logic is correct, but safety check
                imageId = undefined;
            }

            const dataToSubmit = {
                ...formData,
                image: imageId,
                visible_from: formData.visible_from ? (formData.visible_from.split(':').length === 2 ? formData.visible_from + ':00' : formData.visible_from) : null,
                visible_until: formData.visible_until ? (formData.visible_until.split(':').length === 2 ? formData.visible_until + ':00' : formData.visible_until) : null,
            };

            if (typeof dataToSubmit.image === 'string' && dataToSubmit.image.startsWith('blob:')) {
                dataToSubmit.image = undefined;
            }

            if (editingDrink) {
                await updateDrinkAction(editingDrink.id, dataToSubmit);
            } else {
                await createDrinkAction(dataToSubmit);
            }
            setIsOpen(false);
            setEditingDrink(null);
            setFormData({ name: "", type: "drink", is_active: true });
            setSelectedFile(null);
            router.refresh();
        } catch (err) {
            console.error(err);
            alert("Error saving drink");
        } finally {
            setUploading(false);
        }
    };

    const openEdit = (drink: Drink) => {
        setEditingDrink(drink);
        setSelectedFile(null);

        // Handle potential object from Directus expansion (even if TS says string)
        let imageVal = drink.image;
        if (imageVal && typeof imageVal === 'object' && (imageVal as any).id) {
            imageVal = (imageVal as any).id;
        }

        const parseTime = (t?: string) => {
            if (!t) return "";
            const parts = t.split(':');
            return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : t;
        };

        setFormData({
            name: drink.name,
            type: drink.type,
            is_active: drink.is_active,
            visible_from: parseTime(drink.visible_from),
            visible_until: parseTime(drink.visible_until),
            image: imageVal,
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
            <Card>
                <CardHeader>
                    <CardTitle>Company Dashboard</CardTitle>
                    <CardDescription>
                        When enabled, company representatives will see an "Ordering" tab in their dashboard
                        that links to their booth&apos;s drink ordering page.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col gap-1">
                            <Label htmlFor="company-ordering" className="text-sm font-medium">
                                Show Ordering tab for company reps
                            </Label>
                            <div className="flex items-center gap-1.5">
                                {updatingSettings ? (
                                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                ) : (
                                    <span className={`inline-block h-2 w-2 rounded-full ${companyOrderingEnabled ? 'bg-emerald-500' : 'bg-red-400'}`} />
                                )}
                                <span className={`text-xs font-medium ${companyOrderingEnabled ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                                    {updatingSettings ? 'Updating…' : companyOrderingEnabled ? 'Enabled' : 'Disabled'}
                                </span>
                            </div>
                        </div>
                        <Switch
                            id="company-ordering"
                            checked={companyOrderingEnabled}
                            onCheckedChange={handleCompanyOrderingToggle}
                            disabled={updatingSettings}
                        />
                    </div>

                    <div className="flex flex-col gap-2 pt-2 border-t mt-2">
                        <Label htmlFor="active-event">Active Event for Ordering</Label>
                        <Select
                            value={activeEventId || "none"}
                            onValueChange={handleActiveEventChange}
                            disabled={updatingSettings}
                        >
                            <SelectTrigger id="active-event" className="w-full sm:w-[300px]">
                                <SelectValue placeholder="Select active event..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">
                                    <span className="text-muted-foreground italic">No event selected</span>
                                </SelectItem>
                                {events.map(event => (
                                    <SelectItem key={event.id} value={event.id}>
                                        {event.name} ({new Date(event.date).getFullYear()})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                            Orders will be linked to the booth of the selected event. If no event is selected, the fallback behavior is used.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isOpen} onOpenChange={(open) => {
                setIsOpen(open);
                if (!open) setEditingDrink(null);
            }}>
                <DialogTrigger asChild>
                    <Button onClick={() => {
                        setEditingDrink(null);
                        setSelectedFile(null);
                        setFormData({ name: "", type: "drink", is_active: true });
                    }}>
                        <Plus className="mr-2 h-4 w-4" /> Add Item
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingDrink ? "Edit Item" : "Add New Item"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 w-full min-w-0">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="flex flex-col gap-2">
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

                        {/* Image Upload Section */}
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="image">Image</Label>
                            <div className="flex gap-4 items-center">
                                {formData.image && (
                                    <div className="h-16 w-16 relative border rounded overflow-hidden flex-shrink-0">
                                        {/* Using a simple img tag for preview if it's a URL or previously saved ID */}
                                        <img
                                            src={typeof formData.image === 'string' && formData.image.startsWith('blob:')
                                                ? formData.image
                                                : `${process.env.NEXT_PUBLIC_DIRECTUS_URL}assets/${formData.image}`}
                                            alt="Preview"
                                            className="h-full w-full object-cover"
                                            onError={(e) => {
                                                // Fallback if image fails to load (e.g. invalid ID or not found)
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                    </div>
                                )}
                                <div className="flex-1">
                                    <Input
                                        id="image"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Select an image to upload (optional).
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label>Visibility Time (Optional)</Label>
                            <div className="flex flex-col gap-2">
                                <TimePicker24h
                                    value={formData.visible_from || ""}
                                    onChange={(val) => setFormData({ ...formData, visible_from: val })}
                                    placeholder="From"
                                />
                                <TimePicker24h
                                    value={formData.visible_until || ""}
                                    onChange={(val) => setFormData({ ...formData, visible_until: val })}
                                    placeholder="Until"
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
                        <Button type="submit" className="w-full" disabled={uploading}>
                            {uploading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...
                                </>
                            ) : (
                                editingDrink ? "Update" : "Create"
                            )}
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

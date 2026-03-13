"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
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
    Plus,
    Trash2,
    Edit,
    Copy,
    Upload,
    Monitor,
    Image as ImageIcon,
    FileText,
    Film,
    Eye,
    X,
    Clock,
    AlertTriangle,
} from "lucide-react";
import {
    fetchScreensAction,
    createScreenAction,
    updateScreenAction,
    deleteScreenAction,
    fetchMediaAction,
    deleteMediaAction,
    fetchScheduleSlotsAction,
    createScheduleSlotAction,
    updateScheduleSlotAction,
    deleteScheduleSlotAction,
} from "@/app/actions/signage";
import type { SignageScreen, SignageMedia, SignageScheduleSlot } from "@/lib/schema";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}

function getFileId(media: SignageMedia): string | null {
    if (typeof media.file === "string") return media.file;
    if (media.file && typeof media.file === "object" && media.file.id) return media.file.id;
    return null;
}

function getMediaIcon(type: string) {
    switch (type) {
        case "pdf":
            return <FileText className="h-5 w-5" />;
        case "video":
            return <Film className="h-5 w-5" />;
        default:
            return <ImageIcon className="h-5 w-5" />;
    }
}

function getBrusselsTime(): string {
    return new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Brussels",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(new Date());
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function SignageClient({
    initialScreens,
    initialMedia,
    baseUrl,
}: {
    initialScreens: SignageScreen[];
    initialMedia: SignageMedia[];
    baseUrl: string;
}) {
    const [activeTab, setActiveTab] = useState<"screens" | "media" | "schedule">("screens");
    const [screens, setScreens] = useState(initialScreens);
    const [media, setMedia] = useState(initialMedia);
    const [selectedScreenId, setSelectedScreenId] = useState<string>("");

    const tabs = [
        { id: "screens" as const, label: "Screens", icon: <Monitor className="h-4 w-4" /> },
        { id: "media" as const, label: "Media Library", icon: <ImageIcon className="h-4 w-4" /> },
        { id: "schedule" as const, label: "Schedule", icon: <Clock className="h-4 w-4" /> },
    ];

    return (
        <div className="space-y-4">
            {/* Tab Bar */}
            <div className="flex border-b">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors
              ${activeTab === tab.id
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/40"
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === "screens" && (
                <ScreensTab screens={screens} setScreens={setScreens} baseUrl={baseUrl} />
            )}
            {activeTab === "media" && (
                <MediaTab media={media} setMedia={setMedia} />
            )}
            {activeTab === "schedule" && (
                <ScheduleTab
                    screens={screens}
                    media={media}
                    setMedia={setMedia}
                    selectedScreenId={selectedScreenId}
                    setSelectedScreenId={setSelectedScreenId}
                />
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Screens Tab
// ---------------------------------------------------------------------------

function ScreensTab({
    screens,
    setScreens,
    baseUrl,
}: {
    screens: SignageScreen[];
    setScreens: (s: SignageScreen[]) => void;
    baseUrl: string;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [editing, setEditing] = useState<SignageScreen | null>(null);
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);

    const openCreate = () => {
        setEditing(null);
        setName("");
        setSlug("");
        setIsOpen(true);
    };

    const openEdit = (screen: SignageScreen) => {
        setEditing(screen);
        setName(screen.name);
        setSlug(screen.slug);
        setIsOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editing) {
                const res = await updateScreenAction(editing.id, { name, slug });
                if (res.success) {
                    setScreens(screens.map((s) => (s.id === editing.id ? { ...s, name, slug } : s)));
                }
            } else {
                const res = await createScreenAction({ name, slug });
                if (res.success && res.data) {
                    const refreshed = await fetchScreensAction();
                    setScreens(refreshed);
                }
            }
            setIsOpen(false);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this screen and all its schedule slots?")) return;
        const res = await deleteScreenAction(id);
        if (res.success) {
            setScreens(screens.filter((s) => s.id !== id));
        }
    };

    const copyUrl = (slug: string) => {
        navigator.clipboard.writeText(`${baseUrl}/screen/${slug}`);
        setCopied(slug);
        setTimeout(() => setCopied(null), 2000);
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Screens</CardTitle>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={openCreate}>
                            <Plus className="mr-2 h-4 w-4" /> Add Screen
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editing ? "Edit Screen" : "Create Screen"}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="screen-name">Name</Label>
                                <Input
                                    id="screen-name"
                                    value={name}
                                    onChange={(e) => {
                                        setName(e.target.value);
                                        if (!editing) setSlug(slugify(e.target.value));
                                    }}
                                    placeholder="e.g. Lobby Screen"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="screen-slug">URL Slug</Label>
                                <Input
                                    id="screen-slug"
                                    value={slug}
                                    onChange={(e) => setSlug(slugify(e.target.value))}
                                    placeholder="e.g. lobby"
                                    required
                                />
                                <p className="text-xs text-muted-foreground">
                                    Public URL: {baseUrl}/screen/{slug || "..."}
                                </p>
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button variant="outline" type="button">Cancel</Button>
                                </DialogClose>
                                <Button type="submit" disabled={loading}>
                                    {loading ? "Saving..." : editing ? "Update" : "Create"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                {screens.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                        No screens yet. Create one to get started.
                    </div>
                ) : (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Slug</TableHead>
                                    <TableHead>URL</TableHead>
                                    <TableHead className="w-[120px]">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {screens.map((screen) => (
                                    <TableRow key={screen.id}>
                                        <TableCell className="font-medium">{screen.name}</TableCell>
                                        <TableCell className="font-mono text-sm text-muted-foreground">
                                            {screen.slug}
                                        </TableCell>
                                        <TableCell>
                                            <button
                                                onClick={() => copyUrl(screen.slug)}
                                                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                                            >
                                                <Copy className="h-3.5 w-3.5" />
                                                {copied === screen.slug ? "Copied!" : `/screen/${screen.slug}`}
                                            </button>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(screen)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive"
                                                    onClick={() => handleDelete(screen.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// ---------------------------------------------------------------------------
// Media Library Tab
// ---------------------------------------------------------------------------

function MediaTab({
    media,
    setMedia,
}: {
    media: SignageMedia[];
    setMedia: (m: SignageMedia[]) => void;
}) {
    const [uploading, setUploading] = useState(false);
    const [previewMedia, setPreviewMedia] = useState<SignageMedia | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const formData = new FormData();
                formData.append("file", file);
                formData.append("name", file.name.replace(/\.[^.]+$/, ""));

                const res = await fetch("/api/signage/media/upload", {
                    method: "POST",
                    body: formData,
                });

                if (!res.ok) {
                    const err = await res.json().catch(() => ({ error: "Upload failed" }));
                    alert(`Upload failed: ${err.error}`);
                    continue;
                }
            }
            // Refresh media list
            const refreshed = await fetchMediaAction();
            setMedia(refreshed);
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = "";
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this media? It will be removed from all schedules.")) return;
        const res = await deleteMediaAction(id);
        if (res.success) {
            setMedia(media.filter((m) => m.id !== id));
        }
    };

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Media Library</CardTitle>
                    <div>
                        <input
                            ref={fileRef}
                            type="file"
                            accept=".pdf,.mp4,.webm,.png,.jpg,.jpeg,.gif,.webp"
                            multiple
                            onChange={handleUpload}
                            className="hidden"
                            id="media-upload"
                        />
                        <Button
                            onClick={() => fileRef.current?.click()}
                            disabled={uploading}
                        >
                            <Upload className="mr-2 h-4 w-4" />
                            {uploading ? "Uploading..." : "Upload Media"}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {media.length === 0 ? (
                        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                            No media uploaded yet. Upload PDFs, videos, or images to use in schedules.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {media.map((item) => {
                                const fileId = getFileId(item);
                                return (
                                    <div
                                        key={item.id}
                                        className="group relative rounded-lg border bg-card overflow-hidden hover:shadow-md transition-shadow"
                                    >
                                        {/* Thumbnail / Preview */}
                                        <div className="aspect-video bg-muted flex items-center justify-center relative">
                                            {item.type === "image" && fileId ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={`/api/signage/media/${fileId}`}
                                                    alt={item.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                    {getMediaIcon(item.type)}
                                                    <span className="text-xs uppercase font-medium">{item.type}</span>
                                                </div>
                                            )}
                                            {/* Hover overlay */}
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => setPreviewMedia(item)}
                                                >
                                                    <Eye className="mr-1 h-3.5 w-3.5" /> Preview
                                                </Button>
                                            </div>
                                        </div>
                                        {/* Info */}
                                        <div className="p-3 flex items-center justify-between">
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium truncate">{item.name}</p>
                                                <p className="text-xs text-muted-foreground capitalize">{item.type}</p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive shrink-0"
                                                onClick={() => handleDelete(item.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Preview Modal */}
            {previewMedia && (
                <MediaPreviewModal
                    media={previewMedia}
                    onClose={() => setPreviewMedia(null)}
                />
            )}
        </>
    );
}

// ---------------------------------------------------------------------------
// Media Preview Modal
// ---------------------------------------------------------------------------

function MediaPreviewModal({
    media,
    onClose,
}: {
    media: SignageMedia;
    onClose: () => void;
}) {
    const fileId = getFileId(media);
    const mediaUrl = fileId ? `/api/signage/media/${fileId}` : null;
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [pdfPage, setPdfPage] = useState(1);
    const [pdfTotal, setPdfTotal] = useState(0);
    const pdfDocRef = useRef<any>(null);

    // PDF rendering
    useEffect(() => {
        if (media.type !== "pdf" || !mediaUrl) return;
        let cancelled = false;

        (async () => {
            const pdfjsLib = await import("pdfjs-dist");
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

            const pdf = await pdfjsLib.getDocument(mediaUrl).promise;
            if (cancelled) return;
            pdfDocRef.current = pdf;
            setPdfTotal(pdf.numPages);
            setPdfPage(1);
        })();

        return () => { cancelled = true; };
    }, [media.type, mediaUrl]);

    useEffect(() => {
        if (!pdfDocRef.current || !canvasRef.current) return;
        let cancelled = false;

        (async () => {
            const page = await pdfDocRef.current.getPage(pdfPage);
            if (cancelled) return;
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = canvasRef.current!;
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({
                canvasContext: canvas.getContext("2d")!,
                viewport,
            }).promise;
        })();

        return () => { cancelled = true; };
    }, [pdfPage]);

    return (
        <Dialog open onOpenChange={() => onClose()}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {getMediaIcon(media.type)}
                        {media.name}
                    </DialogTitle>
                </DialogHeader>
                <div className="flex-1 min-h-0 overflow-auto flex items-center justify-center bg-muted/30 rounded-lg">
                    {media.type === "image" && mediaUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={mediaUrl}
                            alt={media.name}
                            className="max-w-full max-h-[70vh] object-contain"
                        />
                    )}
                    {media.type === "video" && mediaUrl && (
                        <video
                            src={mediaUrl}
                            controls
                            autoPlay
                            muted
                            className="max-w-full max-h-[70vh]"
                        />
                    )}
                    {media.type === "pdf" && (
                        <div className="flex flex-col items-center gap-3 p-4 w-full">
                            <canvas ref={canvasRef} className="max-w-full max-h-[60vh] border rounded shadow" />
                            {pdfTotal > 0 && (
                                <div className="flex items-center gap-3">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPdfPage((p) => Math.max(1, p - 1))}
                                        disabled={pdfPage <= 1}
                                    >
                                        Previous
                                    </Button>
                                    <span className="text-sm text-muted-foreground">
                                        Page {pdfPage} / {pdfTotal}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPdfPage((p) => Math.min(pdfTotal, p + 1))}
                                        disabled={pdfPage >= pdfTotal}
                                    >
                                        Next
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ---------------------------------------------------------------------------
// Schedule Tab
// ---------------------------------------------------------------------------

function resolveSlotMedia(slot: SignageScheduleSlot, mediaList: SignageMedia[]): SignageMedia | null {
    const raw = slot.file;
    if (raw == null) return null;
    const id = typeof raw === "object" ? (raw as SignageMedia).id : raw;
    if (id == null) return null;
    return mediaList.find((m) => String(m.id) === String(id)) ?? null;
}

function ScheduleTab({
    screens,
    media,
    setMedia,
    selectedScreenId,
    setSelectedScreenId,
}: {
    screens: SignageScreen[];
    media: SignageMedia[];
    setMedia: (m: SignageMedia[]) => void;
    selectedScreenId: string;
    setSelectedScreenId: (id: string) => void;
}) {
    const [slots, setSlots] = useState<SignageScheduleSlot[]>([]);
    const [loading, setLoading] = useState(false);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingSlot, setEditingSlot] = useState<SignageScheduleSlot | null>(null);

    // Form state
    const [startTime, setStartTime] = useState("09:00");
    const [endTime, setEndTime] = useState("17:00");
    const [selectedMediaId, setSelectedMediaId] = useState("");

    const loadSlots = useCallback(async (screenId: string) => {
        if (!screenId) return;
        setLoading(true);
        try {
            const result = await fetchScheduleSlotsAction(screenId);
            setSlots(result);
        } finally {
            setLoading(false);
        }
    }, []);

    const refreshMedia = useCallback(async () => {
        const result = await fetchMediaAction();
        setMedia(result);
    }, [setMedia]);

    useEffect(() => {
        if (selectedScreenId) {
            loadSlots(selectedScreenId);
            refreshMedia();
        } else {
            setSlots([]);
        }
    }, [selectedScreenId, loadSlots, refreshMedia]);

    const openAdd = () => {
        setEditingSlot(null);
        setStartTime("09:00");
        setEndTime("17:00");
        setSelectedMediaId("");
        setIsAddOpen(true);
    };

    const openEdit = (slot: SignageScheduleSlot) => {
        setEditingSlot(slot);
        setStartTime(slot.start_time);
        setEndTime(slot.end_time);
        const rawFile = slot.file;
        const mediaId = rawFile == null
            ? ""
            : typeof rawFile === "object"
                ? String((rawFile as SignageMedia).id)
                : String(rawFile);
        setSelectedMediaId(mediaId);
        setIsAddOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMediaId) return;

        if (editingSlot) {
            const res = await updateScheduleSlotAction(editingSlot.id, {
                start_time: startTime,
                end_time: endTime,
                media: selectedMediaId,
            });
            if (res.success) {
                await Promise.all([loadSlots(selectedScreenId), refreshMedia()]);
            }
        } else {
            const res = await createScheduleSlotAction({
                screen: selectedScreenId,
                media: selectedMediaId,
                start_time: startTime,
                end_time: endTime,
            });
            if (res.success) {
                await Promise.all([loadSlots(selectedScreenId), refreshMedia()]);
            }
        }
        setIsAddOpen(false);
    };

    const handleDeleteSlot = async (id: string) => {
        if (!confirm("Delete this timeslot?")) return;
        const res = await deleteScheduleSlotAction(id);
        if (res.success) {
            setSlots(slots.filter((s) => s.id !== id));
        }
    };

    // Check overlaps
    const getOverlaps = useCallback(() => {
        const overlaps: string[] = [];
        for (let i = 0; i < slots.length; i++) {
            for (let j = i + 1; j < slots.length; j++) {
                const a = slots[i];
                const b = slots[j];
                if (a.start_time < b.end_time && b.start_time < a.end_time) {
                    overlaps.push(`${a.start_time}–${a.end_time} overlaps with ${b.start_time}–${b.end_time}`);
                }
            }
        }
        return overlaps;
    }, [slots]);

    const overlaps = getOverlaps();

    // Visual timeline
    const timelineSlots = slots.map((slot) => {
        const [sh, sm] = slot.start_time.split(":").map(Number);
        const [eh, em] = slot.end_time.split(":").map(Number);
        const startMin = sh * 60 + sm;
        const endMin = eh * 60 + em;
        const left = (startMin / 1440) * 100;
        const width = Math.max(((endMin - startMin) / 1440) * 100, 0.5);
        const resolved = resolveSlotMedia(slot, media);
        const mediaName = resolved?.name ?? "Media";
        const mediaType = resolved?.type;
        return { ...slot, left, width, mediaName, mediaType };
    });

    const currentBrusselsTime = getBrusselsTime();

    return (
        <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <CardTitle>Schedule</CardTitle>
                <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Brussels time: <span className="font-mono font-medium">{currentBrusselsTime}</span>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Screen selector */}
                <div className="flex flex-col gap-2">
                    <Label>Select Screen</Label>
                    <Select value={selectedScreenId} onValueChange={setSelectedScreenId}>
                        <SelectTrigger className="max-w-md">
                            <SelectValue placeholder="Choose a screen to manage its schedule..." />
                        </SelectTrigger>
                        <SelectContent>
                            {screens.map((s) => (
                                <SelectItem key={s.id} value={String(s.id)}>
                                    {s.name} ({s.slug})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {!selectedScreenId && (
                    <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                        Select a screen above to manage its schedule.
                    </div>
                )}

                {selectedScreenId && (
                    <>
                        {/* Overlap warnings */}
                        {overlaps.length > 0 && (
                            <div className="rounded-lg border border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20 p-3 space-y-1">
                                <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400 font-medium text-sm">
                                    <AlertTriangle className="h-4 w-4" />
                                    Overlapping timeslots detected
                                </div>
                                {overlaps.map((o, i) => (
                                    <p key={i} className="text-xs text-yellow-600 dark:text-yellow-500 ml-6">{o}</p>
                                ))}
                            </div>
                        )}

                        {/* Visual timeline */}
                        <div className="space-y-2">
                            <Label>Timeline (24h)</Label>
                            <div className="relative h-12 bg-muted rounded-lg border overflow-hidden">
                                {/* Hour markers */}
                                {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => (
                                    <div
                                        key={h}
                                        className="absolute top-0 bottom-0 border-l border-muted-foreground/20"
                                        style={{ left: `${(h / 24) * 100}%` }}
                                    >
                                        <span className="absolute -top-0 left-0.5 text-[10px] text-muted-foreground">
                                            {String(h).padStart(2, "0")}:00
                                        </span>
                                    </div>
                                ))}
                                {/* Slots */}
                                {timelineSlots.map((slot) => (
                                    <div
                                        key={slot.id}
                                        className="absolute top-3 bottom-1 rounded cursor-pointer hover:brightness-110 transition-all"
                                        style={{
                                            left: `${slot.left}%`,
                                            width: `${slot.width}%`,
                                            backgroundColor: slot.mediaType === "pdf"
                                                ? "#3b82f6"
                                                : slot.mediaType === "video"
                                                    ? "#8b5cf6"
                                                    : slot.mediaType === "image"
                                                        ? "#10b981"
                                                        : "#6b7280",
                                        }}
                                        title={`${slot.start_time}–${slot.end_time}: ${slot.mediaName}`}
                                        onClick={() => openEdit(slot)}
                                    />
                                ))}
                                {/* Current time indicator */}
                                {(() => {
                                    const [ch, cm] = currentBrusselsTime.split(":").map(Number);
                                    const pos = ((ch * 60 + cm) / 1440) * 100;
                                    return (
                                        <div
                                            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                                            style={{ left: `${pos}%` }}
                                        />
                                    );
                                })()}
                            </div>
                            <div className="flex gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#3b82f6]" /> PDF</span>
                                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#8b5cf6]" /> Video</span>
                                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#10b981]" /> Image</span>
                                <span className="flex items-center gap-1"><span className="w-0.5 h-3 bg-red-500" /> Now</span>
                            </div>
                        </div>

                        {/* Add / Edit dialog */}
                        <div className="flex items-center justify-between">
                            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                                <DialogTrigger asChild>
                                    <Button onClick={openAdd}>
                                        <Plus className="mr-2 h-4 w-4" /> Add Timeslot
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>
                                            {editingSlot ? "Edit Timeslot" : "Add Timeslot"}
                                        </DialogTitle>
                                    </DialogHeader>
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="start-time">Start Time (24h)</Label>
                                                <Input
                                                    id="start-time"
                                                    type="time"
                                                    value={startTime}
                                                    onChange={(e) => setStartTime(e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="end-time">End Time (24h)</Label>
                                                <Input
                                                    id="end-time"
                                                    type="time"
                                                    value={endTime}
                                                    onChange={(e) => setEndTime(e.target.value)}
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Media</Label>
                                            <Select value={selectedMediaId} onValueChange={setSelectedMediaId}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select media to display..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {media.map((m) => (
                                                        <SelectItem key={m.id} value={String(m.id)}>
                                                            <span className="flex items-center gap-2">
                                                                {getMediaIcon(m.type)}
                                                                {m.name}
                                                            </span>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {media.length === 0 && (
                                                <p className="text-xs text-muted-foreground">
                                                    No media uploaded. Go to the Media Library tab to upload first.
                                                </p>
                                            )}
                                        </div>
                                        <DialogFooter>
                                            <DialogClose asChild>
                                                <Button variant="outline" type="button">Cancel</Button>
                                            </DialogClose>
                                            <Button type="submit" disabled={!selectedMediaId}>
                                                {editingSlot ? "Update" : "Add"}
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </div>

                        {/* Slots Table */}
                        {loading ? (
                            <div className="text-center py-8 text-muted-foreground">Loading schedule...</div>
                        ) : slots.length === 0 ? (
                            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                                No timeslots yet. Add one to schedule media on this screen.
                            </div>
                        ) : (
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Start</TableHead>
                                            <TableHead>End</TableHead>
                                            <TableHead>Media</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead className="w-[100px]">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {slots.map((slot) => {
                                            const slotMedia = resolveSlotMedia(slot, media);
                                            return (
                                                <TableRow key={slot.id}>
                                                    <TableCell className="font-mono">{slot.start_time}</TableCell>
                                                    <TableCell className="font-mono">{slot.end_time}</TableCell>
                                                    <TableCell className="flex items-center gap-2">
                                                        {slotMedia && getMediaIcon(slotMedia.type)}
                                                        {slotMedia?.name || "Unknown"}
                                                    </TableCell>
                                                    <TableCell className="capitalize text-muted-foreground text-sm">
                                                        {slotMedia?.type || "—"}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-1">
                                                            <Button variant="ghost" size="icon" onClick={() => openEdit(slot)}>
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-destructive"
                                                                onClick={() => handleDeleteSlot(slot.id)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}

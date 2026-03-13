"use client";

import { useEffect, useState, useRef, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScheduleSlot {
    id: string;
    start_time: string; // "HH:mm"
    end_time: string;   // "HH:mm"
    media: {
        id: string;
        name: string;
        type: "pdf" | "video" | "image";
        file_url: string | null;
    };
}

interface ScreenData {
    screen: { id: string; name: string; slug: string };
    slots: ScheduleSlot[];
    _fetched_at: string;
}

// ---------------------------------------------------------------------------
// Brussels time helper (hardcoded timezone)
// ---------------------------------------------------------------------------

function getBrusselsTimeHHMM(): string {
    return new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Brussels",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(new Date());
}

function timeToMinutes(t: string): number {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
}

function findCurrentSlot(slots: ScheduleSlot[]): ScheduleSlot | null {
    const now = timeToMinutes(getBrusselsTimeHHMM());
    for (const slot of slots) {
        const start = timeToMinutes(slot.start_time);
        const end = timeToMinutes(slot.end_time);
        if (now >= start && now < end) return slot;
    }
    return null;
}

// ---------------------------------------------------------------------------
// Cache helpers
// ---------------------------------------------------------------------------

const SCHEDULE_CACHE_KEY = "signage_schedule_";
const MEDIA_CACHE_NAME = "signage-media-v1";

async function cacheSchedule(slug: string, data: ScreenData) {
    try {
        localStorage.setItem(SCHEDULE_CACHE_KEY + slug, JSON.stringify(data));
    } catch { /* localStorage may be full */ }
}

function getCachedSchedule(slug: string): ScreenData | null {
    try {
        const raw = localStorage.getItem(SCHEDULE_CACHE_KEY + slug);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

async function precacheMediaFiles(slots: ScheduleSlot[]) {
    if (!("caches" in window)) return;
    try {
        const cache = await caches.open(MEDIA_CACHE_NAME);
        const urls = slots
            .map((s) => s.media.file_url)
            .filter((u): u is string => !!u);

        for (const url of urls) {
            // Only cache if not already cached
            const existing = await cache.match(url);
            if (!existing) {
                try {
                    const response = await fetch(url);
                    if (response.ok) {
                        await cache.put(url, response);
                    }
                } catch {
                    // Network error — skip, we'll retry next poll
                }
            }
        }
    } catch {
        // Cache API not available
    }
}

async function getCachedResponse(url: string): Promise<Response | null> {
    if (!("caches" in window)) return null;
    try {
        const cache = await caches.open(MEDIA_CACHE_NAME);
        return await cache.match(url) || null;
    } catch {
        return null;
    }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ScreenViewer({ slug }: { slug: string }) {
    const [data, setData] = useState<ScreenData | null>(null);
    const [currentSlot, setCurrentSlot] = useState<ScheduleSlot | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Fetch schedule data
    const fetchSchedule = useCallback(async () => {
        try {
            const res = await fetch(`/api/signage/screens/${slug}`);
            if (!res.ok) throw new Error("Failed to fetch");
            const newData: ScreenData = await res.json();
            setData(newData);
            setError(null);
            cacheSchedule(slug, newData);
            // Pre-cache all media files
            precacheMediaFiles(newData.slots);
            return newData;
        } catch {
            // Try cached version
            const cached = getCachedSchedule(slug);
            if (cached) {
                setData(cached);
                setError(null);
                return cached;
            }
            setError("Unable to load schedule");
            return null;
        }
    }, [slug]);

    // Initial load
    useEffect(() => {
        fetchSchedule();
    }, [fetchSchedule]);

    // Poll every 60 seconds for schedule updates
    useEffect(() => {
        const interval = setInterval(fetchSchedule, 60_000);
        return () => clearInterval(interval);
    }, [fetchSchedule]);

    // Update current slot every 10 seconds
    useEffect(() => {
        const update = () => {
            if (data) {
                setCurrentSlot(findCurrentSlot(data.slots));
            }
        };
        update();
        const interval = setInterval(update, 10_000);
        return () => clearInterval(interval);
    }, [data]);

    // Register service worker
    useEffect(() => {
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.register("/signage-sw.js").catch(() => {
                // SW registration failed — still works, just no offline interception
            });
        }
    }, []);

    // Full-screen black background
    if (error && !data) {
        return (
            <div className="fixed inset-0 bg-black flex items-center justify-center text-white">
                <p className="text-xl opacity-60">{error}</p>
            </div>
        );
    }

    if (!currentSlot) {
        return (
            <div className="fixed inset-0 bg-black flex items-center justify-center text-white">
                <div className="text-center space-y-4 opacity-40">
                    <p className="text-2xl font-light">No content scheduled</p>
                    <p className="text-sm">{getBrusselsTimeHHMM()} (Brussels)</p>
                </div>
            </div>
        );
    }

    const { media } = currentSlot;

    return (
        <div className="fixed inset-0 bg-black overflow-hidden">
            {media.type === "image" && media.file_url && (
                <ImageDisplay url={media.file_url} />
            )}
            {media.type === "video" && media.file_url && (
                <VideoDisplay url={media.file_url} />
            )}
            {media.type === "pdf" && media.file_url && (
                <PdfSlideshow url={media.file_url} />
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Image Display
// ---------------------------------------------------------------------------

function ImageDisplay({ url }: { url: string }) {
    const [src, setSrc] = useState(url);

    useEffect(() => {
        // Try network first, fallback to cache
        (async () => {
            try {
                const res = await fetch(url);
                if (res.ok) {
                    const blob = await res.blob();
                    setSrc(URL.createObjectURL(blob));
                    return;
                }
            } catch { /* do nothing */ }
            // Fallback: cache
            const cached = await getCachedResponse(url);
            if (cached) {
                const blob = await cached.blob();
                setSrc(URL.createObjectURL(blob));
            }
        })();
    }, [url]);

    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={src}
            alt=""
            className="w-full h-full object-contain"
        />
    );
}

// ---------------------------------------------------------------------------
// Video Display
// ---------------------------------------------------------------------------

function VideoDisplay({ url }: { url: string }) {
    const [src, setSrc] = useState(url);

    useEffect(() => {
        // Try to get a blob URL for offline resilience
        (async () => {
            try {
                const res = await fetch(url);
                if (res.ok) {
                    const blob = await res.blob();
                    setSrc(URL.createObjectURL(blob));
                    return;
                }
            } catch { /* do nothing */ }
            const cached = await getCachedResponse(url);
            if (cached) {
                const blob = await cached.blob();
                setSrc(URL.createObjectURL(blob));
            }
        })();
    }, [url]);

    return (
        <video
            src={src}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-contain"
        />
    );
}

// ---------------------------------------------------------------------------
// PDF Slideshow
// ---------------------------------------------------------------------------

function PdfSlideshow({ url }: { url: string }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const pdfDocRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Load PDF
    useEffect(() => {
        let cancelled = false;

        (async () => {
            // Try fetch, fallback to cache
            let pdfData: ArrayBuffer | null = null;
            try {
                const res = await fetch(url);
                if (res.ok) {
                    pdfData = await res.arrayBuffer();
                }
            } catch { /* do nothing */ }

            if (!pdfData) {
                const cached = await getCachedResponse(url);
                if (cached) {
                    pdfData = await cached.arrayBuffer();
                }
            }

            if (!pdfData || cancelled) return;

            const pdfjsLib = await import("pdfjs-dist");
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

            const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
            if (cancelled) return;
            pdfDocRef.current = pdf;
            setTotalPages(pdf.numPages);
            setPage(1);
        })();

        return () => { cancelled = true; };
    }, [url]);

    // Render current page
    useEffect(() => {
        if (!pdfDocRef.current || !canvasRef.current || !containerRef.current) return;
        let cancelled = false;

        (async () => {
            const pdfPage = await pdfDocRef.current.getPage(page);
            if (cancelled) return;

            const container = containerRef.current!;
            const canvas = canvasRef.current!;

            // Calculate scale to fit the container
            const unscaledViewport = pdfPage.getViewport({ scale: 1 });
            const scaleX = container.clientWidth / unscaledViewport.width;
            const scaleY = container.clientHeight / unscaledViewport.height;
            const scale = Math.min(scaleX, scaleY);

            const viewport = pdfPage.getViewport({ scale });
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await pdfPage.render({
                canvasContext: canvas.getContext("2d")!,
                viewport,
            }).promise;
        })();

        return () => { cancelled = true; };
    }, [page, totalPages]);

    // Auto-advance pages every 10 seconds
    useEffect(() => {
        if (totalPages <= 1) return;
        const interval = setInterval(() => {
            setPage((p) => (p >= totalPages ? 1 : p + 1));
        }, 10_000);
        return () => clearInterval(interval);
    }, [totalPages]);

    return (
        <div ref={containerRef} className="w-full h-full flex items-center justify-center">
            <canvas ref={canvasRef} className="max-w-full max-h-full" />
        </div>
    );
}

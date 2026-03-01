"use client";

// CV Preview component for displaying PDF previews
export function CVPreview({
    fileUrl,
    className,
    title
}: {
    fileUrl?: string;
    className?: string;
    title?: string;
}) {
    if (!fileUrl) {
        return (
            <div className={`border rounded-lg p-4 bg-gray-50 flex items-center justify-center ${className || ''}`}>
                <p className="text-muted-foreground text-center">No CV available</p>
            </div>
        );
    }

    return (
        <div className={`border rounded-lg overflow-hidden ${className || ''}`}>
            <iframe
                src={fileUrl}
                title={title || "CV Preview"}
                className="w-full h-full min-h-[400px]"
            />
        </div>
    );
}

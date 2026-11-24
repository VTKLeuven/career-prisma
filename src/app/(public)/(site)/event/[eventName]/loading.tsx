// Loading component for event pages (shows while server component loads)
export default function Loading() {
  return (
    <div className="min-h-screen max-md:min-h-dvh bg-vtk-bg">
      <div className="animate-pulse">
        <div className="h-screen max-md:h-dvh bg-neutral-200" />
      </div>
    </div>
  );
}


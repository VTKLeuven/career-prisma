// Loading component for event pages (shows while server component loads)
export default function Loading() {
  return (
    <div className="min-h-screen bg-vtk-bg">
      <div className="animate-pulse">
        <div className="h-screen bg-neutral-200" />
      </div>
    </div>
  );
}


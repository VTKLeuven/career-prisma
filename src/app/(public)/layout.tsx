export default function NoSidebarLayout({ children }: { children: React.ReactNode }) {
  // simple shell without sidebar/header
  return <div className="min-h-dvh">{children}</div>;
}

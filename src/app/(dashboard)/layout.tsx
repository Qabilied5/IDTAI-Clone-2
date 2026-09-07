import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-panel">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <div className="flex-1 overflow-y-auto p-5">
          <div className="mx-auto flex w-full max-w-[1400px] min-w-0 flex-col">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
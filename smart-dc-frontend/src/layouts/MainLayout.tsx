import { useState, type ReactNode } from "react";

import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

export default function MainLayout({ children }: { children: ReactNode }) {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#1a2946_0%,_#0a1326_42%,_#050b17_100%)] text-white">
      <div className="flex min-h-screen w-full">
        <div className="flex min-h-screen w-full overflow-hidden border border-white/8 bg-[#0a1428]/92 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <Sidebar
            expanded={sidebarExpanded}
            onToggle={() => setSidebarExpanded((current) => !current)}
          />

          <div className="flex min-w-0 flex-1 flex-col border-l border-white/6">
            <Navbar
              sidebarExpanded={sidebarExpanded}
              onToggleSidebar={() => setSidebarExpanded((current) => !current)}
            />
            <main className="flex-1 overflow-auto px-4 py-4 md:px-6 md:py-5">
              {children}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}

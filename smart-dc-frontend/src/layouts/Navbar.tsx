import { useContext } from "react";
import { useNavigate } from "react-router-dom";

import { AuthContext } from "../context/AuthContext";

export default function Navbar({
  sidebarExpanded,
  onToggleSidebar,
}: {
  sidebarExpanded: boolean;
  onToggleSidebar: () => void;
}) {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();

  const firstName = auth?.user?.name?.split?.(" ")?.[0] || "Admin";
  const roleLabel = auth?.user?.role?.replaceAll("_", " ") || "USER";

  return (
    <header className="flex items-center justify-between border-b border-white/8 bg-[linear-gradient(180deg,rgba(46,66,102,0.88),rgba(20,31,55,0.88))] px-4 py-4 md:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
          title={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d={sidebarExpanded ? "M15 6 9 12l6 6" : "m9 6 6 6-6 6"}
            />
          </svg>
        </button>

        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Control Center</p>
          <h1 className="mt-1 text-xl font-semibold text-slate-100 md:text-2xl">
            Data Center Monitoring Dashboard
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm text-slate-300">
            Welcome, <span className="font-semibold text-white">{firstName}</span>
          </p>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{roleLabel}</p>
        </div>

        <button
          onClick={() => navigate("/profile")}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-[linear-gradient(135deg,#2b4676,#172846)] text-sm font-semibold text-cyan-100 transition hover:scale-[1.02]"
          title="Open profile"
        >
          {firstName.slice(0, 2).toUpperCase()}
        </button>

        <button
          onClick={() => {
            auth?.logout();
            navigate("/login");
          }}
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
        >
          Logout
        </button>
      </div>
    </header>
  );
}

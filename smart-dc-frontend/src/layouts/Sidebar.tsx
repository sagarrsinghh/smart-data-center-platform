import { Link, useLocation } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { ALL_ROLES, OPERATOR_ROLES, SUPER_ADMIN_ONLY } from "../utils/roles";

const navSections = [
  {
    label: "Overview",
    links: [
      {
        name: "Dashboard",
        path: "/",
        description: "Monitoring summary",
        roles: ALL_ROLES,
        icon: (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M3.75 10.5 12 3.75l8.25 6.75v9a.75.75 0 0 1-.75.75h-4.5v-6h-6v6h-4.5a.75.75 0 0 1-.75-.75v-9Z"
          />
        ),
      },
    ],
  },
  {
    label: "Data Pipeline",
    links: [
      {
        name: "Workbook Upload",
        path: "/upload",
        description: "Snapshot ingestion",
        roles: OPERATOR_ROLES,
        icon: (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M12 16.5V6.75m0 0-3 3m3-3 3 3M4.5 18.75h15"
          />
        ),
      },
      {
        name: "Project Deployments",
        path: "/metrics",
        description: "Resource records",
        roles: ALL_ROLES,
        icon: (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M4.5 18.75v-6m5.25 6V9m5.25 9.75V5.25m4.5 13.5H3"
          />
        ),
      },
    ],
  },
  {
    label: "Intelligence",
    links: [
      {
        name: "Capacity Analytics",
        path: "/analytics",
        description: "Storage & allocation",
        roles: ALL_ROLES,
        icon: (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M3.75 17.25 8.25 12l3 3 6-7.5 3 3.75"
          />
        ),
      },
      {
        name: "Capacity Warnings",
        path: "/alerts",
        description: "Limits & errors",
        roles: ALL_ROLES,
        icon: (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M12 9v3.75m0 3h.008v.008H12v-.008Zm8.25 3.188L13.616 4.69a1.875 1.875 0 0 0-3.232 0L3.75 18.188A1.875 1.875 0 0 0 5.366 21h13.268a1.875 1.875 0 0 0 1.616-2.812Z"
          />
        ),
      },
      {
        name: "Capacity Planning",
        path: "/prediction",
        description: "Forecast & baselines",
        roles: ALL_ROLES,
        icon: (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M12 3.75v3m0 10.5v3m8.25-8.25h-3M6.75 12h-3m11.136 5.886-2.121-2.12M9.236 8.236 7.114 6.114m10.772 0-2.12 2.122M9.236 15.764l-2.122 2.122"
          />
        ),
      },
    ],
  },
  {
    label: "Operations",
    links: [
      {
        name: "Reports",
        path: "/reports",
        description: "Exports & audit files",
        roles: ALL_ROLES,
        icon: (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M7.5 3.75h6l3 3v13.5H7.5a1.5 1.5 0 0 1-1.5-1.5V5.25a1.5 1.5 0 0 1 1.5-1.5Zm6 0v3h3"
          />
        ),
      },
      {
        name: "Storage Assets",
        path: "/servers",
        description: "Physical arrays",
        roles: OPERATOR_ROLES,
        icon: (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M4.5 6.75h15v4.5h-15v-4.5Zm0 6h15v4.5h-15v-4.5Zm3 2.25h.008v.008H7.5v-.008Zm0-6h.008v.008H7.5v-.008Z"
          />
        ),
      },
    ],
  },
  {
    label: "Administration",
    links: [
      {
        name: "Users",
        path: "/users",
        description: "Accounts & roles",
        roles: SUPER_ADMIN_ONLY,
        icon: (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M18 18.75a3 3 0 0 0-3-3H9a3 3 0 0 0-3 3m12-9a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm-9 1.5a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm0 7.5h-3a2.25 2.25 0 0 0-2.25 2.25"
          />
        ),
      },
    ],
  },
];

export default function Sidebar({
  expanded,
  onToggle,
}: {
  expanded: boolean;
  onToggle: () => void;
}) {
  const location = useLocation();
  const auth = useContext(AuthContext);
  const userRole = auth?.user?.role;

  return (
    <aside
      className={`hidden flex-col border-r border-white/6 bg-[linear-gradient(180deg,rgba(18,31,56,0.98),rgba(8,16,30,0.98))] py-5 transition-[width] duration-300 md:flex ${
        expanded ? "w-[290px] px-4" : "w-[92px] px-3"
      }`}
    >
      <div className={`mb-8 flex items-center ${expanded ? "justify-between gap-3" : "justify-center"}`}>
        <div className={`flex items-center ${expanded ? "gap-3" : ""}`}>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#3f73ff,#3155c6)] shadow-[0_10px_25px_rgba(50,92,205,0.45)]">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4.5 15.75h15M6.75 15.75V9.75m4.5 6V6.75m4.5 9V11.25m4.5 4.5V8.25M3 19.5h18" />
            </svg>
          </div>

          {expanded && (
            <div>
              <p className="text-[11px] uppercase tracking-[0.26em] text-slate-500">Smart DC</p>
              <h2 className="mt-1 text-lg font-semibold text-white">Monitoring Suite</h2>
            </div>
          )}
        </div>

        <button
          onClick={onToggle}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
          title={expanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor">
            {expanded ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m15 6-6 6 6 6" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m9 6 6 6-6 6" />
            )}
          </svg>
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto">
        {navSections.map((section) => {
          const visibleLinks = section.links.filter((link) => !userRole || link.roles.includes(userRole));

          if (visibleLinks.length === 0) {
            return null;
          }

          return (
            <div key={section.label}>
            {expanded && (
              <p className="mb-2 px-3 text-[11px] uppercase tracking-[0.24em] text-slate-500">
                {section.label}
              </p>
            )}

            <div className="space-y-1.5">
              {visibleLinks.map((link) => {
                const isActive =
                  location.pathname === link.path ||
                  (link.path !== "/" && location.pathname.startsWith(link.path));

                return (
                  <Link
                    key={link.name}
                    to={link.path}
                    title={link.name}
                    className={`group flex items-center rounded-2xl border transition ${
                      expanded ? "gap-3 px-3 py-3" : "justify-center px-0 py-3"
                    } ${
                      isActive
                        ? "border-white/10 bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                        : "border-transparent text-slate-400 hover:border-white/8 hover:bg-white/5 hover:text-slate-200"
                    }`}
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/5">
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor">
                        {link.icon}
                      </svg>
                    </div>

                    {expanded && (
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-current">{link.name}</p>
                        <p className="truncate text-xs text-slate-500 group-hover:text-slate-400">
                          {link.description}
                        </p>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
            </div>
          );
        })}
      </nav>

    </aside>
  );
}

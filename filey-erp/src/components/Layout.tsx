import { ReactNode } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { LayoutGrid, Boxes, LogOut } from "lucide-react";
import { cn } from "../lib/format";
import { APPS } from "../lib/apps";
import { useAuth } from "../lib/auth";

export default function Layout({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const { profile, signOut } = useAuth();
  const initials = (profile?.name || "U")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const isLauncher = loc.pathname === "/";
  const current =
    APPS.find((a) => a.to === loc.pathname)?.label ??
    (isLauncher ? "Apps" : "Filey");

  return (
    <div className="flex h-full bg-brand-50">
      <aside className="w-64 shrink-0 bg-brand-900 flex flex-col">
        <Link
          to="/"
          className="px-6 py-6 flex items-center gap-3 hover:bg-white/5 transition-colors duration-200"
        >
          <div className="rounded-xl bg-primary-600 p-2 text-white">
            <Boxes size={22} />
          </div>
          <div>
            <p className="font-extrabold text-white leading-tight">Filey</p>
            <p className="text-[11px] font-semibold text-brand-400">
              ERP &amp; CRM
            </p>
          </div>
        </Link>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors duration-200 cursor-pointer",
                isActive
                  ? "bg-primary-600 text-white"
                  : "text-brand-400 hover:bg-white/5 hover:text-white"
              )
            }
          >
            <LayoutGrid size={18} />
            Apps
          </NavLink>

          <div className="pt-3 pb-1 px-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-500">
              Modules
            </p>
          </div>

          {APPS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors duration-200 cursor-pointer",
                  isActive
                    ? "bg-primary-600 text-white"
                    : "text-brand-400 hover:bg-white/5 hover:text-white"
                )
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 m-3 rounded-xl bg-white/5">
          <p className="text-[11px] font-semibold text-brand-400 uppercase">
            Storage
          </p>
          <p className="text-xs text-brand-300 mt-1">
            Secure cloud sync — Supabase, row-level secured to you.
          </p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 shrink-0 bg-white border-b border-brand-200 flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              aria-label="All apps"
              className="rounded-xl p-2 text-brand-500 hover:bg-brand-50 transition-colors duration-200 cursor-pointer"
            >
              <LayoutGrid size={20} />
            </Link>
            <div>
              <p className="text-[11px] font-semibold text-brand-400 uppercase tracking-wide">
                Filey / {isLauncher ? "Home" : "Modules"}
              </p>
              <p className="text-sm font-bold text-ink">{current}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="pill bg-brand-100 text-brand-600 hidden sm:inline-flex">
              {profile?.company ?? "Cloud"}
            </span>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-ink text-white grid place-items-center text-sm font-bold">
                {initials}
              </div>
              <div className="hidden md:block leading-tight">
                <p className="text-xs font-bold text-ink">
                  {profile?.name ?? "User"}
                </p>
                <p className="text-[11px] text-brand-400">
                  {profile?.email}
                </p>
              </div>
            </div>
            <button
              onClick={signOut}
              aria-label="Sign out"
              title="Sign out"
              className="rounded-lg p-2 text-brand-500 hover:bg-brand-100 cursor-pointer transition-colors duration-200"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
}

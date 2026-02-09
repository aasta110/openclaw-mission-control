"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AGENT_CONFIG } from "@/lib/config";

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "COMMAND", icon: CommandIcon },
    { href: "/team", label: "AGENTS", icon: AgentsIcon },
    { href: "/tasks/new", label: "DEPLOY", icon: DeployIcon },
  ];

  return (
    <nav className="relative z-50">
      {/* macOS-like toolbar */}
      <div className="absolute inset-0 bg-white/6 backdrop-blur-xl border-b border-white/10" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-white/10" />

      <div className="relative px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            {/* Logo mark (subtle) */}
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-white/8 border border-white/12 flex items-center justify-center transition-transform duration-200 group-hover:scale-[1.03]">
                <svg
                  className="w-5 h-5 text-text-primary"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2">
                  <path
                    d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            <div className="flex flex-col">
              <span className="font-display font-semibold text-[15px] tracking-wide text-text-primary">
                {AGENT_CONFIG.brand.name}
              </span>
              <span className="font-body text-[12px] text-text-muted">
                {AGENT_CONFIG.brand.subtitle}
              </span>
            </div>
          </Link>

          {/* Navigation */}
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/6 border border-white/10">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    relative flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-[12px]
                    transition-colors duration-150
                    ${
                      isActive
                        ? "bg-[rgba(10,132,255,0.18)] text-text-primary border border-[rgba(10,132,255,0.25)]"
                        : "text-text-secondary hover:text-text-primary hover:bg-white/8"
                    }
                  `}>
                  {/* Active indicator line */}
                  {isActive && (
                    <span className="absolute inset-x-0 bottom-0 h-0.5 bg-white/50" />
                  )}

                  <Icon className={`w-4 h-4 ${isActive ? "text-text-primary" : ""}`} />
                  <span className="font-body font-medium tracking-wide">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Status indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/30">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
              </span>
              <span className="font-mono text-[10px] text-success tracking-wider uppercase">
                ONLINE
              </span>
            </div>

            {/* Seed button */}
            {/* <button
              onClick={async () => {
                await fetch('/api/seed', { method: 'POST' });
                window.location.reload();
              }}
              className="group relative px-4 py-2 rounded-lg font-mono text-xs tracking-wider text-text-muted hover:text-cyan transition-colors overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                SEED
              </span>
              
              
              <span className="absolute inset-0 bg-gradient-to-r from-cyan/10 to-violet/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button> */}
          </div>
        </div>
      </div>
    </nav>
  );
}

// Icon components
function CommandIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function AgentsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
      <circle cx="19" cy="8" r="2" />
      <path d="M23 21v-1a3 3 0 00-2-2.83" />
      <circle cx="5" cy="8" r="2" />
      <path d="M1 21v-1a3 3 0 012-2.83" />
    </svg>
  );
}

function DeployIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2">
      <path
        d="M12 4v16m0-16l-4 4m4-4l4 4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="4" y="18" width="16" height="2" rx="1" />
    </svg>
  );
}

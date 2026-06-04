"use client";

import Link from "next/link";
import React from "react";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`group flex items-center gap-2 ${className}`}>
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 text-white shadow">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="5" r="2.4" />
          <circle cx="5" cy="18" r="2.4" />
          <circle cx="19" cy="18" r="2.4" />
          <path d="M12 7.4v3.6M12 11l-6.2 4.4M12 11l6.2 4.4" />
        </svg>
      </span>
      <span className="text-sm font-semibold tracking-tight text-slate-100 group-hover:text-white">
        Battle Tree Canvas
      </span>
    </Link>
  );
}

export function TopBar({
  children,
  subtitle,
}: {
  children?: React.ReactNode;
  subtitle?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/80 px-4 backdrop-blur">
      <div className="flex min-w-0 items-center gap-3">
        <Logo />
        {subtitle && (
          <>
            <span className="text-slate-700">/</span>
            <div className="min-w-0 truncate text-sm text-slate-300">{subtitle}</div>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </header>
  );
}

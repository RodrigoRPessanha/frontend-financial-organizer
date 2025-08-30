"use client";
import React from "react";

type Props = { className?: string; children?: React.ReactNode };

export default function ForceLogoutLink({ className, children = "Forçar sair" }: Props) {
  const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
  const hrefDefault = `${base}/auth/logout`;
  return (
    <a
      href={hrefDefault}
      target="_self"
      rel="noopener"
      className={className}
      onClick={(e) => {
        try {
          const next = window.location.origin;
          const real = `${base}/auth/logout?next=${encodeURIComponent(next)}`;
          (e.currentTarget as HTMLAnchorElement).href = real;
        } catch {}
      }}
    >
      {children}
    </a>
  );
}

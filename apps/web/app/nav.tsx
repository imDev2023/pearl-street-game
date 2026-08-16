"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {ACTIVE_CHAIN} from "@/lib/chain";

const links = [
  {href: "/", label: "Proof of reserve"},
  {href: "/vault", label: "Vault"},
] as const;

export function Nav() {
  const path = usePathname();
  return (
    <nav aria-label="Primary">
      {links.map((l) => (
        <Link key={l.href} href={l.href} className={"pill" + (path === l.href ? " active" : "")} aria-current={path === l.href ? "page" : undefined}>
          {l.label}
        </Link>
      ))}
      <span className="pill chain" title={`chain id ${ACTIVE_CHAIN.id}`}>
        {ACTIVE_CHAIN.name}
      </span>
    </nav>
  );
}

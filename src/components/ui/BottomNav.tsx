"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, FileText, User } from "lucide-react";
import { T } from "@/components/tokens";

const ITEMS = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/nearby", label: "Nearby", icon: Compass },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <div className="sticky bottom-0 left-0 right-0 grid grid-cols-4 border-t-2" style={{ background: "rgba(255,248,236,0.95)", backdropFilter: "blur(8px)", borderColor: T.line }}>
      {ITEMS.map((it) => {
        const active = pathname === it.href || pathname?.startsWith(it.href + "/");
        const Icon = it.icon;
        return (
          <Link key={it.href} href={it.href} className="flex flex-col items-center gap-1 py-3 active:scale-90 transition">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center transition" style={{ background: active ? T.green : "transparent" }}>
              <Icon size={19} color={active ? "#fff" : T.inkSoft} strokeWidth={active ? 2.6 : 2} />
            </div>
            <span className="text-[10.5px] font-bold" style={{ color: active ? T.green : T.inkSoft, fontFamily: "var(--font-jakarta)" }}>{it.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

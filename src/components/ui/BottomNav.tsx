"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, FileText, User, Camera } from "lucide-react";
import { T, tintShadow } from "@/components/tokens";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

function NavLink({ href, label, icon: Icon, active }: { href: string; label: string; icon: any; active: boolean }) {
  return (
    <Link href={href} className="flex flex-col items-center gap-1 py-3 flex-1 active:scale-90 transition">
      <Icon size={20} color={active ? T.purpleDeep : "#8A7A3E"} strokeWidth={active ? 2.6 : 2} />
      <span className="text-[10.5px] font-extrabold" style={{ color: active ? T.purpleDeep : "#8A7A3E", fontFamily: "var(--font-jakarta)" }}>{label}</span>
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + "/");

  const left = [{ href: "/home", label: t("nav_home"), icon: Home }, { href: "/nearby", label: t("nav_nearby"), icon: Compass }];
  const right = [{ href: "/reports", label: t("nav_reports"), icon: FileText }, { href: "/profile", label: t("nav_profile"), icon: User }];

  return (
    <div className="sticky bottom-0 left-0 right-0 relative" style={{ background: T.yellow }}>
      <div className="flex items-stretch px-2">
        {left.map((it) => <NavLink key={it.href} {...it} active={isActive(it.href)} />)}
        <div className="w-[76px]" />
        {right.map((it) => <NavLink key={it.href} {...it} active={isActive(it.href)} />)}
      </div>
      <Link
        href="/report"
        className="absolute left-1/2 -translate-x-1/2 -top-6 w-16 h-16 rounded-full flex items-center justify-center active:scale-90 transition"
        style={{ background: T.purple, border: `4px solid ${T.yellow}`, boxShadow: tintShadow(T.purpleDeep) }}
      >
        <Camera size={26} color="#fff" strokeWidth={2} />
      </Link>
    </div>
  );
}

"use client";
import { BottomNav } from "@/components/ui/BottomNav";
import { useRequireOnboarding } from "@/lib/useRequireOnboarding";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const ready = useRequireOnboarding();
  if (!ready) return null;

  return (
    <>
      <div className="flex-1 overflow-y-auto">{children}</div>
      <BottomNav />
    </>
  );
}

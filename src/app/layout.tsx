import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";

export const metadata: Metadata = {
  title: "Nivaar — Just show us the problem",
  description: "AI-powered civic issue reporting. Take a photo, we handle the rest.",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ ["--font-baloo" as any]: "sans-serif", ["--font-jakarta" as any]: "sans-serif", ["--font-mono" as any]: "monospace" }}>
      <body style={{ fontFamily: "var(--font-jakarta)" }}>
        <LanguageProvider>
          <div style={{ background: "#DDE3DC", minHeight: "100vh" }} className="flex items-center justify-center py-6 px-3">
            <div className="w-full max-w-[430px] flex flex-col overflow-hidden" style={{ background: "#FFFBF3", minHeight: "calc(100vh - 48px)", maxHeight: 900, borderRadius: 40, boxShadow: "0 30px 60px -20px rgba(15,36,25,0.35)" }}>
              {children}
            </div>
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}

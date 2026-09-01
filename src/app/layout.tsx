import type { Metadata } from "next";
import { Baloo_2, Plus_Jakarta_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";

const baloo = Baloo_2({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-baloo" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-jakarta" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Nivaar — Just show us the problem",
  description: "AI-powered civic issue reporting. Take a photo, we handle the rest.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${baloo.variable} ${jakarta.variable} ${mono.variable}`}>
      <body style={{ fontFamily: "var(--font-jakarta)" }}>
        <LanguageProvider>
          <div style={{ background: "#DDE3DC", minHeight: "100vh" }} className="flex items-center justify-center py-6 px-3">
            <div className="w-full max-w-[430px] flex flex-col overflow-hidden" style={{ background: "#FFF8EC", minHeight: "calc(100vh - 48px)", maxHeight: 900, borderRadius: 40, boxShadow: "0 30px 60px -20px rgba(15,36,25,0.35)" }}>
              {children}
            </div>
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}

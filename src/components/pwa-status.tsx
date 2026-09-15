"use client";
import { useEffect, useState } from "react";
import type { Locale } from "../lib/i18n";
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}
export function PwaStatus({ locale }: { locale: Locale }) {
  const [install, setInstall] = useState<InstallEvent | null>(null),
    [help, setHelp] = useState(false);
  useEffect(() => {
    const receive = (e: Event) => {
      e.preventDefault();
      setInstall(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", receive);
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator)
      void navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {});
    return () => window.removeEventListener("beforeinstallprompt", receive);
  }, []);
  return (
    <div className="pwa-status">
      <button
        onClick={() => {
          if (install) void install.prompt().then(() => setInstall(null));
          else setHelp(!help);
        }}
      >
        {locale === "ar" ? "إضافة إلى الشاشة الرئيسية" : "Add to home screen"}
      </button>
      {help && (
        <p>
          {locale === "ar"
            ? "من قائمة المتصفح اختر تثبيت التطبيق أو إضافة إلى الشاشة الرئيسية. في iPhone استخدم قائمة المشاركة في Safari. الطقس والذكاء الاصطناعي يحتاجان اتصالًا."
            : "Use your browser’s Install app or Add to Home Screen option. On iPhone, use Safari’s Share menu. Weather and AI require internet."}
        </p>
      )}
    </div>
  );
}

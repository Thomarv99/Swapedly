import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";

// Captures the beforeinstallprompt event so we can trigger it manually
let deferredPrompt: any = null;

export function PWAInstallPrompt() {
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already running as installed PWA
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    // Don't show if dismissed this session
    if (sessionStorage.getItem("pwa-dismissed")) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window.navigator as any).standalone;
    setIsIOS(ios);

    if (ios) {
      // Show iOS instructions after 3 seconds
      setTimeout(() => setShowBanner(true), 3000);
      return;
    }

    // Android / Chrome — wait for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e;
      setTimeout(() => setShowBanner(true), 3000);
    };
    window.addEventListener("beforeinstallprompt", handler as any);
    return () => window.removeEventListener("beforeinstallprompt", handler as any);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
    }
    dismiss();
  };

  const dismiss = () => {
    setShowBanner(false);
    setIsDismissed(true);
    sessionStorage.setItem("pwa-dismissed", "1");
  };

  if (!showBanner || isDismissed) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-2xl px-4 py-3 flex items-center gap-3 animate-in slide-in-from-bottom duration-300">
      <div className="h-10 w-10 rounded-xl bg-[#5A45FF] flex items-center justify-center shrink-0">
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white" stroke="currentColor" strokeWidth="2.5">
          <path d="M7 16L3 12l4-4M17 8l4 4-4 4M14 4l-4 16" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900">Add Swapedly to Home Screen</p>
        {isIOS ? (
          <p className="text-xs text-gray-500">Tap <strong>Share</strong> then <strong>Add to Home Screen</strong></p>
        ) : (
          <p className="text-xs text-gray-500">Install the app for a faster experience</p>
        )}
      </div>
      {!isIOS && (
        <button
          onClick={handleInstall}
          className="shrink-0 bg-[#5A45FF] text-white text-xs font-bold px-4 py-2 rounded-full flex items-center gap-1.5"
        >
          <Download className="h-3 w-3" /> Install
        </button>
      )}
      <button onClick={dismiss} className="shrink-0 text-gray-400 hover:text-gray-600 p-1">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

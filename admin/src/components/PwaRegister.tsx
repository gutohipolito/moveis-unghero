"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Falha silenciosa — PWA ainda funciona via manifest em alguns browsers
    });
  }, []);

  return null;
}

"use client";

import React from "react";

/** Silhueta da pasta (PNG) + degradê, mais escuro em cima. */
export function FinderFolderIcon({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative aspect-square w-full overflow-hidden ${className}`}
      style={{
        WebkitMaskImage: "url(/icons/folder-silhouette.png)",
        maskImage: "url(/icons/folder-silhouette.png)",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        background:
          "linear-gradient(180deg, #1A1D23 0%, #3E434D 55%, #6B7180 100%)",
      }}
      aria-hidden
    />
  );
}

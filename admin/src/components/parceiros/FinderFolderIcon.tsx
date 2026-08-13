"use client";

import React, { useId } from "react";

/**
 * Pasta no espírito do Finder escuro do macOS: cinza chapado, cantos arredondados,
 * aba simples — sem PNG/.ico. Preview opcional na “frente” da pasta.
 */
export function FinderFolderIcon({
  previewUrl,
  className = "",
}: {
  previewUrl?: string | null;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const bodyId = `folder-body-${uid}`;
  const tabId = `folder-tab-${uid}`;
  const shadeId = `folder-shade-${uid}`;

  return (
    <div className={`relative aspect-square w-full ${className}`}>
      <svg
        viewBox="0 0 120 100"
        className="h-full w-full"
        aria-hidden
      >
        <defs>
          <linearGradient id={bodyId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4A4E58" />
            <stop offset="100%" stopColor="#2F333C" />
          </linearGradient>
          <linearGradient id={tabId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#555963" />
            <stop offset="100%" stopColor="#3D414A" />
          </linearGradient>
          <linearGradient id={shadeId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5C616C" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#1F2228" stopOpacity="0.15" />
          </linearGradient>
          <filter id={`folder-blur-${uid}`} x="-10%" y="-10%" width="120%" height="130%">
            <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#0a0a0a" floodOpacity="0.35" />
          </filter>
        </defs>

        <g filter={`url(#folder-blur-${uid})`}>
          {/* Aba */}
          <path
            d="M14 22c0-5.5 4.5-10 10-10h26c4.2 0 7.8 2.6 9.2 6.4L62 28H24c-5.5 0-10-4.5-10-10z"
            fill={`url(#${tabId})`}
          />
          {/* Corpo */}
          <path
            d="M10 30c0-5 4-9 9-9h82c5 0 9 4 9 9v48c0 7.2-5.8 13-13 13H23c-7.2 0-13-5.8-13-13V30z"
            fill={`url(#${bodyId})`}
          />
          {/* Frente (faixa mais clara, como o flap do Finder) */}
          <path
            d="M10 42h100v36c0 7.2-5.8 13-13 13H23c-7.2 0-13-5.8-13-13V42z"
            fill={`url(#${shadeId})`}
          />
        </g>
      </svg>

      {previewUrl ? (
        <div className="pointer-events-none absolute inset-x-[16%] bottom-[16%] top-[42%] overflow-hidden rounded-[10px] border border-white/10 bg-[#1a1d24]/80 shadow-inner">
          <img
            src={previewUrl}
            alt=""
            className="h-full w-full object-cover opacity-90"
          />
        </div>
      ) : null}
    </div>
  );
}

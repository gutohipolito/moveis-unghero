import React from "react";

/** Pasta estilo Finder — SVG próprio (sem PNG externo), com preview opcional na “capa”. */
export function FinderFolderIcon({
  previewUrl,
  className = "",
}: {
  previewUrl?: string | null;
  className?: string;
}) {
  return (
    <div className={`relative aspect-[5/4] w-full ${className}`}>
      <svg
        viewBox="0 0 120 96"
        className="h-full w-full drop-shadow-sm"
        aria-hidden
      >
        <defs>
          <linearGradient id="mu-folder-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F5D78E" />
            <stop offset="55%" stopColor="#E2B84A" />
            <stop offset="100%" stopColor="#C9962E" />
          </linearGradient>
          <linearGradient id="mu-folder-tab" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F8E4A8" />
            <stop offset="100%" stopColor="#E8C45C" />
          </linearGradient>
        </defs>
        <path
          d="M8 28c0-4.4 3.6-8 8-8h28l10 10h50c4.4 0 8 3.6 8 8v42c0 4.4-3.6 8-8 8H16c-4.4 0-8-3.6-8-8V28z"
          fill="url(#mu-folder-body)"
        />
        <path
          d="M16 20h26c2.2 0 4.2 1 5.5 2.7L52 28H16c-2.2 0-4-1.8-4-4s1.8-4 4-4z"
          fill="url(#mu-folder-tab)"
        />
        <path
          d="M12 36h96v36c0 4.4-3.6 8-8 8H20c-4.4 0-8-3.6-8-8V36z"
          fill="#FBF3DC"
          opacity="0.35"
        />
      </svg>
      {previewUrl ? (
        <div className="pointer-events-none absolute inset-x-[18%] bottom-[14%] top-[38%] overflow-hidden rounded-md border border-black/10 bg-white/80 shadow-sm">
          <img
            src={previewUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Lightbulb } from "lucide-react";
import SuggestionModal from "@/components/melhorias/SuggestionModal";
import { createPartnerSuggestion } from "@/app/actions/suggestions";
import { cn } from "@/lib/utils";

type SuggestionFabProps = {
  audience?: "staff" | "partner";
  className?: string;
};

export default function SuggestionFab({
  audience = "staff",
  className,
}: SuggestionFabProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Sugerir melhoria"
        title="Sugerir melhoria"
        className={cn(
          "suggestion-fab fixed z-40 flex items-center justify-center",
          "right-4 bottom-[calc(var(--mobile-nav-height)_+_env(safe-area-inset-bottom)_+_1.5rem)]",
          "md:right-6 md:bottom-12",
          "h-11 w-11 rounded-full text-white",
          "bg-gradient-to-br from-amber-400 to-amber-600",
          "shadow-lg shadow-amber-500/30",
          "opacity-90 hover:opacity-100 active:scale-95",
          "transition-all cursor-pointer ring-1 ring-amber-300/50",
          className
        )}
      >
        <Lightbulb className="h-5 w-5 shrink-0" />
      </button>

      <SuggestionModal
        isOpen={open}
        onClose={() => setOpen(false)}
        audience={audience}
        submitAction={audience === "partner" ? createPartnerSuggestion : undefined}
      />
    </>
  );
}

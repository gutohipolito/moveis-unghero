"use client";

import { HighlightAnimatedIcon, SparklesIcon } from "@/components/icons";

export default function ClienteLoginHeroIcon() {
  return (
    <HighlightAnimatedIcon
      icon={SparklesIcon}
      size={28}
      className="text-primary"
      playOnMount
    />
  );
}

"use client";

import React, { useEffect, useRef, type ComponentType, type Ref } from "react";
import type { AnimatedIconHandle, AnimatedIconProps } from "./types";

type IconComponent = ComponentType<
  AnimatedIconProps & { ref?: Ref<AnimatedIconHandle> }
>;

/** Liga start/stop da animação ao hover/focus do elemento pai (botão, card, link). */
export function useAnimatedIconHover() {
  const iconRef = useRef<AnimatedIconHandle>(null);

  return {
    iconRef,
    hoverHandlers: {
      onMouseEnter: () => iconRef.current?.startAnimation(),
      onMouseLeave: () => iconRef.current?.stopAnimation(),
      onFocus: () => iconRef.current?.startAnimation(),
      onBlur: () => iconRef.current?.stopAnimation(),
    },
  };
}

type HighlightAnimatedIconProps = AnimatedIconProps & {
  icon: IconComponent;
  /** Dispara uma vez ao montar (útil em empty states / heroes). */
  playOnMount?: boolean;
  wrapperClassName?: string;
};

/** Ícone que anima ao passar o mouse na área do wrapper (não só no SVG). */
export function HighlightAnimatedIcon({
  icon: Icon,
  playOnMount = false,
  wrapperClassName = "inline-flex items-center justify-center",
  ...props
}: HighlightAnimatedIconProps) {
  const iconRef = useRef<AnimatedIconHandle>(null);

  useEffect(() => {
    if (!playOnMount) return;
    const t = window.setTimeout(() => {
      iconRef.current?.startAnimation();
    }, 350);
    return () => window.clearTimeout(t);
  }, [playOnMount]);

  return (
    <span
      className={wrapperClassName}
      onMouseEnter={() => iconRef.current?.startAnimation()}
      onMouseLeave={() => iconRef.current?.stopAnimation()}
    >
      <Icon ref={iconRef} {...props} />
    </span>
  );
}

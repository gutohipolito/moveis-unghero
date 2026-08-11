"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

type Props = {
  text: string;
  className?: string;
};

function AnimatedLetter({
  char,
  index,
  total,
  progress,
}: {
  char: string;
  index: number;
  total: number;
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  const charProgress = index / Math.max(total - 1, 1);
  const opacity = useTransform(
    progress,
    [Math.max(0, charProgress - 0.12), Math.min(1, charProgress + 0.04)],
    [0.18, 1]
  );

  return (
    <motion.span style={{ opacity, display: char === " " ? "inline" : "inline-block" }}>
      {char === " " ? "\u00A0" : char}
    </motion.span>
  );
}

export default function ScrollRevealText({ text, className = "" }: Props) {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.85", "end 0.25"],
  });
  const chars = Array.from(text);

  return (
    <p ref={ref} className={className} aria-label={text}>
      {chars.map((char, i) => (
        <AnimatedLetter
          key={`${i}-${char}`}
          char={char}
          index={i}
          total={chars.length}
          progress={scrollYProgress}
        />
      ))}
    </p>
  );
}

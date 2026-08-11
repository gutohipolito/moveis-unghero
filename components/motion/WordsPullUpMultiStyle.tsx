"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

type Segment = { text: string; className?: string; style?: React.CSSProperties };

type Props = {
  segments: Segment[];
  className?: string;
  delay?: number;
};

export default function WordsPullUpMultiStyle({
  segments,
  className = "",
  delay = 0,
}: Props) {
  const ref = useRef<HTMLParagraphElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });

  const words = segments.flatMap((seg, segIndex) =>
    seg.text.split(" ").map((word, wordIndex, arr) => ({
      word,
      className: seg.className,
      style: seg.style,
      key: `${segIndex}-${wordIndex}-${word}`,
      trailingSpace: wordIndex < arr.length - 1 || segIndex < segments.length - 1,
    }))
  );

  return (
    <p
      ref={ref}
      className={className}
      style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0.18em 0.28em" }}
    >
      {words.map((item, i) => (
        <span
          key={item.key}
          style={{ display: "inline-block", overflow: "hidden", verticalAlign: "bottom" }}
        >
          <motion.span
            className={item.className}
            style={{ display: "inline-block", ...item.style }}
            initial={{ y: 24, opacity: 0 }}
            animate={inView ? { y: 0, opacity: 1 } : undefined}
            transition={{ duration: 0.8, delay: delay + i * 0.07, ease: EASE }}
          >
            {item.word}
          </motion.span>
        </span>
      ))}
    </p>
  );
}

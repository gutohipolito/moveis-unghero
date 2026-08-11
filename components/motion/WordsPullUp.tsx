"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

type Props = {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  showAsterisk?: boolean;
  delay?: number;
};

export default function WordsPullUp({
  text,
  className = "",
  style,
  showAsterisk = false,
  delay = 0,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const words = text.split(" ");

  return (
    <span ref={ref} className={className} style={style} aria-label={text}>
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          style={{ display: "inline-block", overflow: "hidden", verticalAlign: "bottom" }}
        >
          <motion.span
            style={{ display: "inline-block", position: "relative" }}
            initial={{ y: 28, opacity: 0 }}
            animate={inView ? { y: 0, opacity: 1 } : undefined}
            transition={{ duration: 0.85, delay: delay + i * 0.08, ease: EASE }}
          >
            {word}
            {showAsterisk && i === words.length - 1 ? (
              <sup
                style={{
                  position: "absolute",
                  top: "0.55em",
                  right: "-0.32em",
                  fontSize: "0.28em",
                  fontStyle: "normal",
                  fontFamily: "var(--font-body)",
                }}
              >
                *
              </sup>
            ) : null}
            {i < words.length - 1 ? "\u00A0" : null}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

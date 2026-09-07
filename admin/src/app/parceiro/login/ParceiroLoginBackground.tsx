"use client";

import React, { useEffect, useState } from "react";

/**
 * Vídeo de fundo + overlay VEIO (veios de cobre com transparência).
 * Vídeo desliga com prefers-reduced-motion.
 */
export default function ParceiroLoginBackground() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduceMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return (
    <div className="parceiro-login-bg" aria-hidden>
      {!reduceMotion ? (
        <video
          className="parceiro-login-video"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/factory-bg.png"
        >
          <source src="/videos/parceiro-login-bg.mp4" type="video/mp4" />
        </video>
      ) : (
        <div className="parceiro-login-video parceiro-login-video-static" />
      )}
      <div className="parceiro-login-veio" />
      <div className="parceiro-login-overlay" />
    </div>
  );
}

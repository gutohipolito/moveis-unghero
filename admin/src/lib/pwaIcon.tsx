import { ImageResponse } from "next/og";

export function createPwaIcon(size: number) {
  const radius = Math.round(size * 0.18);
  const innerRadius = Math.round(size * 0.14);
  const innerSize = Math.round(size * 0.72);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1f1b18",
          borderRadius: radius,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: innerSize,
            height: innerSize,
            borderRadius: innerRadius,
            background: "#d9a007",
            color: "#1a1612",
            fontSize: Math.round(size * 0.28),
            fontWeight: 800,
            letterSpacing: "-0.04em",
          }}
        >
          MU
        </div>
      </div>
    ),
    { width: size, height: size }
  );
}

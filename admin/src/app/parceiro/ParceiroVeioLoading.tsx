/** Loader exclusivo do portal do parceiro (VEIO). */
export default function ParceiroVeioLoading({
  label = "Carregando",
}: {
  label?: string;
}) {
  return (
    <div
      className="parceiro-veio-loader"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="parceiro-veio-loader-atmosphere" aria-hidden>
        <span className="parceiro-veio-loader-glow is-copper" />
        <span className="parceiro-veio-loader-glow is-wood" />
        <svg
          className="parceiro-veio-loader-vein"
          viewBox="0 0 1200 220"
          preserveAspectRatio="xMidYMid meet"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            className="parceiro-veio-loader-path is-soft"
            d="M-20 130 C 120 60, 220 180, 380 100 S 620 40, 760 120 S 980 190, 1220 90"
            strokeWidth="1.4"
          />
          <path
            className="parceiro-veio-loader-path is-main"
            d="M-40 110 C 140 40, 260 170, 420 95 S 660 30, 820 115 S 1020 180, 1240 80"
            strokeWidth="2.4"
          />
          <path
            className="parceiro-veio-loader-path is-accent"
            d="M0 150 C 160 90, 280 195, 440 125 S 700 55, 860 140 S 1060 200, 1220 120"
            strokeWidth="1.2"
          />
          <circle className="parceiro-veio-loader-node" cx="420" cy="95" r="4.5" />
          <circle className="parceiro-veio-loader-node is-late" cx="820" cy="115" r="3.5" />
        </svg>
      </div>

      <p className="parceiro-veio-loader-label">
        {label}
        <span className="parceiro-veio-loader-dots" aria-hidden>
          <span />
          <span />
          <span />
        </span>
      </p>
    </div>
  );
}

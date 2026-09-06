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
      </div>

      <div className="parceiro-veio-loader-stage">
        <svg
          className="parceiro-veio-loader-vein"
          viewBox="0 0 280 96"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <path
            className="parceiro-veio-loader-path is-soft"
            d="M8 58 C 42 28, 68 76, 108 46 S 168 18, 198 52 S 248 78, 272 40"
            strokeWidth="1.25"
          />
          <path
            className="parceiro-veio-loader-path is-main"
            d="M4 50 C 48 18, 76 70, 118 42 S 176 14, 212 48 S 252 72, 276 36"
            strokeWidth="2"
          />
          <path
            className="parceiro-veio-loader-path is-accent"
            d="M16 66 C 56 44, 84 82, 126 56 S 184 30, 222 60 S 256 84, 274 54"
            strokeWidth="1.1"
          />
          <circle className="parceiro-veio-loader-node" cx="118" cy="42" r="3.2" />
          <circle className="parceiro-veio-loader-node is-late" cx="212" cy="48" r="2.6" />
        </svg>

        <p className="parceiro-veio-loader-label">
          {label}
          <span className="parceiro-veio-loader-dots" aria-hidden>
            <span />
            <span />
            <span />
          </span>
        </p>
      </div>
    </div>
  );
}

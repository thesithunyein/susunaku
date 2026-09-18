/**
 * The Susunaku mark: three members and one coin.
 *
 * Three fat rounded bars lie on a ring, with a gold coin travelling around them.
 * The middle is deliberately empty — that is the product. The coin orbits and its
 * face stays upright (a counter-rotation), and the eye blinks now and then so the
 * mark reads as alive rather than as a spinner. Both are CSS-only, so
 * `prefers-reduced-motion` stops them like any other animation.
 *
 * Ring geometry: r = 20, so the circumference is 125.6637. A dash of 32.5 and a
 * gap of 93.1637 is exactly one revolution, and stepping the offset by 41.8879
 * (120°) places the three members.
 */
export function Mark({ size = 30, animated = true }: { size?: number; animated?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={animated ? "susu-logo" : undefined}
    >
      <defs>
        <linearGradient id="susuCoinFace" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFD978" />
          <stop offset="100%" stopColor="#D9A520" />
        </linearGradient>
      </defs>

      {[
        { color: "#4A54E1", offset: 0 },
        { color: "#D9A520", offset: -41.8879 },
        { color: "#2FA84F", offset: -83.7758 },
      ].map((member) => (
        <g key={member.offset} fill="none" strokeLinecap="round">
          <circle
            cx="32"
            cy="32"
            r="20"
            stroke="#080909"
            strokeWidth="11"
            strokeDasharray="32.5 93.1637"
            strokeDashoffset={member.offset}
          />
          <circle
            cx="32"
            cy="32"
            r="20"
            stroke={member.color}
            strokeWidth="6.4"
            strokeDasharray="32.5 93.1637"
            strokeDashoffset={member.offset}
          />
        </g>
      ))}

      <g className="susu-orbit">
        <g className="susu-coin">
          <circle
            cx="32"
            cy="12"
            r="9"
            fill="url(#susuCoinFace)"
            stroke="#080909"
            strokeWidth="2.8"
          />
          <circle className="susu-eye" cx="29.3" cy="10.4" r="1.7" fill="#080909" />
          <circle className="susu-eye" cx="34.7" cy="10.4" r="1.7" fill="#080909" />
          <path
            d="M28.8 13.9 Q32 17.1 35.2 13.9"
            fill="none"
            stroke="#080909"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </g>
      </g>
    </svg>
  );
}

export function Lockup({ size = 32 }: { size?: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <Mark size={size} />
      <span className="brand-name">Susunaku</span>
    </span>
  );
}

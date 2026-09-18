/**
 * Chunky SVG props in the reference's voxel-ish, chunky-rounded style.
 *
 * The mark is three members and one coin: three fat rounded bars lying on a
 * ring, with a gold coin travelling around them. The middle is deliberately
 * empty — that is the product. The coin orbits and its face stays upright (a
 * counter-rotation), and the eye blinks now and then so the mark reads as alive
 * rather than as a spinner. Both are CSS-only so `prefers-reduced-motion` can
 * stop them like any other animation.
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
            stroke="#0B0B0C"
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
            stroke="#0B0B0C"
            strokeWidth="2.8"
          />
          <circle className="susu-eye" cx="29.3" cy="10.4" r="1.7" fill="#0B0B0C" />
          <circle className="susu-eye" cx="34.7" cy="10.4" r="1.7" fill="#0B0B0C" />
          <path
            d="M28.8 13.9 Q32 17.1 35.2 13.9"
            fill="none"
            stroke="#0B0B0C"
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

export function Chest({
  label,
  value,
  sub,
  width = 268,
}: {
  label: string;
  value: string;
  sub?: string;
  width?: number;
}) {
  return (
    <svg
      width={width}
      viewBox="0 0 300 240"
      role="img"
      aria-label={`${label}: ${value}`}
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id="chestBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#EE5238" />
          <stop offset="100%" stopColor="#C0301C" />
        </linearGradient>
      </defs>
      {/* lid */}
      <rect x="48" y="34" width="204" height="52" rx="18" fill="url(#chestBody)" />
      <rect x="48" y="34" width="204" height="18" rx="14" fill="#F26A52" opacity="0.55" />
      <rect x="136" y="24" width="28" height="18" rx="8" fill="#F5C33B" />
      <rect x="48" y="78" width="204" height="12" rx="6" fill="#D9A520" />
      {/* body */}
      <rect x="56" y="88" width="188" height="120" rx="16" fill="url(#chestBody)" />
      <rect x="56" y="88" width="188" height="12" rx="8" fill="#F26A52" opacity="0.35" />
      {/* corner trims */}
      <rect x="56" y="88" width="16" height="120" rx="10" fill="#D9A520" opacity="0.85" />
      <rect x="228" y="88" width="16" height="120" rx="10" fill="#D9A520" opacity="0.85" />
      {/* LCD */}
      <rect x="86" y="108" width="128" height="76" rx="12" fill="#0F0F11" />
      <rect x="90" y="112" width="120" height="68" rx="9" fill="#101012" />
      <text
        x="150"
        y="131"
        textAnchor="middle"
        fontFamily="Silkscreen, monospace"
        fontSize="8"
        fill="#C9C2B4"
      >
        {label.toUpperCase()}
      </text>
      <text
        x="150"
        y="158"
        textAnchor="middle"
        fontFamily="Silkscreen, monospace"
        fontSize="21"
        fontWeight="700"
        fill="#F4E8D4"
      >
        {value}
      </text>
      {sub ? (
        <text
          x="150"
          y="174"
          textAnchor="middle"
          fontFamily="Silkscreen, monospace"
          fontSize="7"
          fill="#8F887C"
        >
          {sub.toUpperCase()}
        </text>
      ) : null}
      {/* dial + button */}
      <circle cx="235" cy="150" r="13" fill="#8F2013" stroke="#D9A520" strokeWidth="3" />
      <rect x="228" y="180" width="16" height="16" rx="5" fill="#2FA84F" />
      {/* feet */}
      <rect x="78" y="208" width="34" height="12" rx="5" fill="#8F2013" />
      <rect x="188" y="208" width="34" height="12" rx="5" fill="#8F2013" />
    </svg>
  );
}

const TOY_COLORS = ["#F5C33B", "#7B4FBF", "#2FA84F", "#3E9BE8", "#E8396B", "#E5432C"];

/** A member, as a chunky character. Same silhouette, different colours. */
export function Toy({ index, size = 62 }: { index: number; size?: number }) {
  const color = TOY_COLORS[index % TOY_COLORS.length];
  return (
    <svg width={size} viewBox="0 0 80 110" aria-hidden="true">
      <rect x="24" y="6" width="32" height="30" rx="8" fill={color} />
      <rect x="31" y="17" width="7" height="9" rx="2" fill="#fff" />
      <rect x="42" y="17" width="7" height="9" rx="2" fill="#fff" />
      <rect x="33" y="19" width="3.5" height="5" rx="1.5" fill="#0B0B0C" />
      <rect x="44" y="19" width="3.5" height="5" rx="1.5" fill="#0B0B0C" />
      <rect x="18" y="38" width="44" height="42" rx="10" fill={color} />
      <rect x="18" y="38" width="44" height="10" rx="6" fill="#fff" opacity="0.22" />
      <rect x="26" y="56" width="28" height="8" rx="4" fill="#0B0B0C" opacity="0.18" />
      <rect x="20" y="82" width="16" height="14" rx="6" fill="#0B0B0C" opacity="0.82" />
      <rect x="44" y="82" width="16" height="14" rx="6" fill="#0B0B0C" opacity="0.82" />
    </svg>
  );
}

export function Coin({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="18" fill="#3E9BE8" />
      <circle cx="20" cy="20" r="13" fill="#2E86E0" />
      <text
        x="20"
        y="27"
        textAnchor="middle"
        fontFamily="Inter, sans-serif"
        fontWeight="800"
        fontSize="18"
        fill="#fff"
      >
        $
      </text>
    </svg>
  );
}

export function Blob({ size = 40, color = "#2FA84F" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" aria-hidden="true">
      <path
        d="M6 24c0-9 6-16 16-16s16 7 16 16-6 14-16 14S6 33 6 24Z"
        fill={color}
      />
      <circle cx="17" cy="21" r="3.2" fill="#fff" />
      <circle cx="28" cy="21" r="3.2" fill="#fff" />
      <circle cx="17.5" cy="21.5" r="1.6" fill="#0B0B0C" />
      <circle cx="28.5" cy="21.5" r="1.6" fill="#0B0B0C" />
    </svg>
  );
}

export function StarCoin({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path
        d="M24 3l6.6 13.6L45 19l-10.5 10.2L37 44 24 37 11 44l2.5-14.8L3 19l14.4-2.4L24 3Z"
        fill="#F5C33B"
      />
      <text
        x="24"
        y="30"
        textAnchor="middle"
        fontFamily="Inter, sans-serif"
        fontWeight="800"
        fontSize="15"
        fill="#0B0B0C"
      >
        $
      </text>
    </svg>
  );
}

export function Bolt({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 44" aria-hidden="true">
      <path d="M20 0 4 26h10L12 44 30 16H18L20 0Z" fill="#3E9BE8" />
    </svg>
  );
}

export function Heart({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 44" aria-hidden="true">
      <path
        d="M24 42S3 29 3 15.5C3 7.5 9.2 2 16.4 2 20.6 2 23.2 4.2 24 6c.8-1.8 3.4-4 7.6-4C38.8 2 45 7.5 45 15.5C45 29 24 42 24 42Z"
        fill="#E8396B"
      />
    </svg>
  );
}

export function Printer({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <rect x="6" y="20" width="36" height="20" rx="5" fill="#2F2F35" />
      <rect x="12" y="8" width="24" height="12" rx="3" fill="#0B0B0C" />
      <rect x="12" y="34" width="24" height="10" rx="3" fill="#F4E8D4" />
      <circle cx="36" cy="27" r="2.6" fill="#2FA84F" />
    </svg>
  );
}

export function GridIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" aria-hidden="true">
      <circle cx="22" cy="22" r="19" fill="#fff" stroke="#F5C33B" strokeWidth="3" />
      <rect x="14" y="14" width="7" height="7" rx="2" fill="#4A54E1" />
      <rect x="23" y="14" width="7" height="7" rx="2" fill="#E5432C" />
      <rect x="14" y="23" width="7" height="7" rx="2" fill="#2FA84F" />
      <rect x="23" y="23" width="7" height="7" rx="2" fill="#F5C33B" />
    </svg>
  );
}

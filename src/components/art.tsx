/**
 * The Susunaku mark: the mascot himself.
 *
 * The big lavender boy from the landing page, redrawn flat: a fuzzy dome rising
 * from the bottom edge (exactly how he appears in the app), two wide eyes whose
 * pupils glance about, ochre brows, and the pink heart he holds — the pot that
 * does not exist, carried by nobody in particular.
 *
 * One CSS animation pair, both stopped by the global `prefers-reduced-motion`
 * rule: the pupils blink (`.susu-eye`) and glance side to side (`.susu-glance`).
 * Palette: body #C7B4F2, heart #F2A0C4, brows/coin ochre #E8A34B, ink #080909.
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
      {/* body: a dome sitting on the bottom edge, no legs — he rises, like in the video */}
      <path
        d="M32 7 C18.5 7 8.5 21 8.5 39.5 L8.5 62 Q8.5 64 10.5 64 L53.5 64 Q55.5 64 55.5 62 L55.5 39.5 C55.5 21 45.5 7 32 7 Z"
        fill="#C7B4F2"
        stroke="#080909"
        strokeWidth="2.6"
      />
      {/* brows: ochre, round-capped, slightly worried */}
      <path
        d="M14.5 18.5 Q20 13.5 25.5 16 M38.5 16 Q44 13.5 49.5 18.5"
        fill="none"
        stroke="#E8A34B"
        strokeWidth="4.4"
        strokeLinecap="round"
      />

      {/* eyes: wide white, ink-rimmed, pupils glancing up-left then about */}
      <g className={animated ? "susu-glance" : undefined}>
        <circle cx="22.5" cy="28" r="8" fill="#FFFFFF" stroke="#080909" strokeWidth="2.4" />
        <circle cx="41.5" cy="28" r="8" fill="#FFFFFF" stroke="#080909" strokeWidth="2.4" />
        <g className={animated ? "susu-eye" : undefined}>
          <circle cx="21" cy="26.5" r="4.3" fill="#080909" />
          <circle cx="40" cy="26.5" r="4.3" fill="#080909" />
          <circle cx="22.7" cy="24.8" r="1.3" fill="#FFFFFF" />
          <circle cx="41.7" cy="24.8" r="1.3" fill="#FFFFFF" />
        </g>
      </g>

      {/* the heart he hugs: the pot that does not exist. Big, at his chest,
          with his arms wrapped around it — hands landing on its edges. */}
      <path
        d="M32 60.5 C23.5 55 21 48.5 25 44.8 C27.8 42.2 32 44 32 46.8 C32 44 36.2 42.2 39 44.8 C43 48.5 40.5 55 32 60.5 Z"
        fill="#F2A0C4"
        stroke="#080909"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      {/* arms: thick lavender strokes with ink rims, from the body's sides,
          hands (the round caps) resting on the heart */}
      {[
        { d: "M12.5 36 Q13 51 25.5 53.5" },
        { d: "M51.5 36 Q51 51 38.5 53.5" },
      ].map((arm) => (
        <g key={arm.d} fill="none" strokeLinecap="round">
          <path d={arm.d} stroke="#080909" strokeWidth="8.4" />
          <path d={arm.d} stroke="#C7B4F2" strokeWidth="4.4" />
        </g>
      ))}
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

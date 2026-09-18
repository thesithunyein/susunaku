/**
 * Real icons, not emoji.
 *
 * Emoji render differently on every OS and read as decoration rather than
 * affordance — a wallet button showing 👤 on Windows is a different glyph than
 * on iOS. These are inline SVGs: they inherit `currentColor`, keep their stroke
 * at any size, and look identical everywhere.
 *
 * GoogleMark and GitHubMark use the official brand marks and their official
 * colours. Nothing else here imitates a third-party logo.
 */

interface IconProps {
  size?: number;
  className?: string;
  /**
   * Icons are decorative here: every one sits inside a control that already
   * carries a text label or an aria-label, so announcing the glyph again would
   * only add noise.
   */
}

function Svg({
  size = 18,
  className,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** Google's official "G" mark — the four brand colours, self-coloured. */
export function GoogleMark({ size = 18, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.616z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}

/** GitHub's official mark. */
export function GitHubMark({ size = 18, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"
      />
    </svg>
  );
}

export function IconUser(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </Svg>
  );
}

export function IconMenu(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Svg>
  );
}

export function IconClose(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}

export function IconChevron(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 9l6 6 6-6" />
    </Svg>
  );
}

export function IconPlus(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function IconCheck(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4.5 12.5l5 5 10-11" />
    </Svg>
  );
}

export function IconCopy(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="9" y="9" width="11" height="11" rx="2.5" />
      <path d="M15 6.5A2.5 2.5 0 0 0 12.5 4H6.5A2.5 2.5 0 0 0 4 6.5v6A2.5 2.5 0 0 0 6.5 15" />
    </Svg>
  );
}

export function IconExternal(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M14 4h6v6M20 4l-8.5 8.5" />
      <path d="M18 14.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3.5" />
    </Svg>
  );
}

export function IconRefresh(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M20 11a8 8 0 0 0-13.7-5.3L4 8" />
      <path d="M4 4v4h4" />
      <path d="M4 13a8 8 0 0 0 13.7 5.3L20 16" />
      <path d="M20 20v-4h-4" />
    </Svg>
  );
}

export function IconWallet(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="6" width="18" height="13" rx="3" />
      <path d="M3 10h18M16.5 14.5h.01" />
      <path d="M6.5 6V5a2 2 0 0 1 2-2h9" />
    </Svg>
  );
}

export function IconShield(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3l7.5 3v5.5c0 4.5-3 8.2-7.5 9.5-4.5-1.3-7.5-5-7.5-9.5V6L12 3z" />
      <path d="M9.2 12.2l2 2 3.6-4" />
    </Svg>
  );
}

export function IconArrowIn(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 4v12" />
      <path d="M7.5 11.5L12 16l4.5-4.5" />
      <path d="M4.5 19.5h15" />
    </Svg>
  );
}

export function IconArrowOut(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 16V4" />
      <path d="M7.5 8.5L12 4l4.5 4.5" />
      <path d="M4.5 19.5h15" />
    </Svg>
  );
}

export function IconClock(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Svg>
  );
}

export function IconSend(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4.5 12L20 4.5 13 20l-2.4-6.1L4.5 12z" />
    </Svg>
  );
}

export function IconSpark(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3.5l1.9 5 5 1.9-5 1.9-1.9 5-1.9-5-5-1.9 5-1.9L12 3.5z" />
    </Svg>
  );
}

export function IconBook(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 5.5A2 2 0 0 1 6 3.5h13v13H6a2 2 0 0 0-2 2v-13z" />
      <path d="M4 18.5A2 2 0 0 1 6 20.5h13" />
    </Svg>
  );
}

export function IconKey(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="8" cy="12" r="3.5" />
      <path d="M11.5 12H20M17.5 12v3M14.5 12v2.5" />
    </Svg>
  );
}

export function IconCoin(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M14.5 9.2A3 3 0 0 0 12 7.6c-1.6 0-2.6.9-2.6 2 0 2.6 5 1.4 5 4 0 1.2-1 2.1-2.6 2.1a3.1 3.1 0 0 1-2.6-1.5" />
    </Svg>
  );
}

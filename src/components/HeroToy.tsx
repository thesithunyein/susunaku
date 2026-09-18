import { useEffect, useRef } from 'react';
import gazeFrames from '../gaze-frames.json';

// The clip is the same 1920x1080 source as the studio reference, re-encoded at
// 960x540 — so every source-space coordinate halves.
const SRC_W = 960;
const SRC_H = 540;
const EYE_X = 948 / 2; // midpoint between the pupils, source space
const EYE_Y = 418 / 2;

const TAU = Math.PI * 2;
const wrappedAngle = (angle: number) => ((angle % TAU) + TAU) % TAU;

/**
 * The clip records two orbits, so over a ~10 degree band (roughly 84-94 degrees,
 * pointing down) two rows answer the same direction about 2.8s apart. Matching
 * on the nearest angle alone flips between them — a visible cut each time. So:
 * among the rows that point at the cursor within tolerance, take the one nearest
 * the frame already on screen.
 */
const AMBIGUOUS_RAD = 0.12;

function angularDistance(target: number, sample: number) {
  const difference = Math.abs(target - sample);
  return Math.min(difference, TAU - difference);
}

// Angles were measured from the actual pupil positions in the clip. Match
// direction, rather than assuming the orbit moves at a constant speed.
function timeForAngle(angle: number, previous: number) {
  const target = wrappedAngle(angle);
  let nearest = Infinity;
  for (const [sampleAngle] of gazeFrames) {
    const distance = angularDistance(target, sampleAngle);
    if (distance < nearest) nearest = distance;
  }
  let chosen = gazeFrames[0][1];
  let chosenGap = Infinity;
  for (const [sampleAngle, time] of gazeFrames) {
    if (angularDistance(target, sampleAngle) > nearest + AMBIGUOUS_RAD) continue;
    const gap = Math.abs(time - previous);
    if (gap < chosenGap) {
      chosenGap = gap;
      chosen = time;
    }
  }
  return chosen + 1 / 240;
}

/**
 * The mascot. Desktop: the recorded pupils track the cursor — moving the mouse
 * seeks the frame whose gaze points that way. Phone: the clip plays as a loop.
 * Reduced motion pauses the loop; the desktop scrub is pointer-driven, so it
 * stays. Rendered inside the empty states, where the page has room for it.
 */
export default function HeroToy() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let frame = 0;
    let desiredTime = 0;
    let pointer: { x: number; y: number } | null = null;
    let disposed = false;
    const mobile = window.matchMedia('(max-width: 700px)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const seek = () => {
      frame = 0;
      if (disposed || mobile.matches || video.readyState < 2 || video.seeking) return;
      if (Math.abs(video.currentTime - desiredTime) > 1 / 48) {
        video.currentTime = Math.min(desiredTime, video.duration - 1 / 24);
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(seek);
    };
    const updateTarget = () => {
      if (mobile.matches || !pointer) return;
      const rect = video.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return; // offscreen
      const scale = Math.max(rect.width / SRC_W, rect.height / SRC_H);
      // Match object-fit: cover positioning exactly.
      const eyeX = rect.left + rect.width / 2 + (EYE_X - SRC_W / 2) * scale;
      const eyeY = rect.top + rect.height / 2 + (EYE_Y - SRC_H / 2) * scale;
      const dx = pointer.x - eyeX;
      const dy = pointer.y - eyeY;
      // Avoid unstable angles directly between the eyes.
      if (Math.hypot(dx, dy) > 8) {
        desiredTime = timeForAngle(Math.atan2(dy, dx), desiredTime);
        schedule();
      }
    };
    const move = (event: PointerEvent) => {
      pointer = { x: event.clientX, y: event.clientY };
      updateTarget();
    };
    const ready = () => {
      video.loop = mobile.matches;
      if (mobile.matches && !reducedMotion.matches) {
        void video.play().catch(() => {
          /* Keep the first frame if autoplay is unavailable. */
        });
      } else {
        video.pause();
        if (!mobile.matches) {
          updateTarget();
          schedule();
        }
      }
    };
    // Coalesce fast pointer movements while a frame is decoding. When it
    // finishes, seek immediately to the latest requested gaze direction.
    video.addEventListener('seeked', schedule);
    video.addEventListener('loadeddata', ready);
    mobile.addEventListener('change', ready);
    reducedMotion.addEventListener('change', ready);
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('resize', updateTarget);
    window.addEventListener('scroll', updateTarget, { passive: true });
    if (video.readyState >= 2) ready();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      video.removeEventListener('seeked', schedule);
      video.removeEventListener('loadeddata', ready);
      mobile.removeEventListener('change', ready);
      reducedMotion.removeEventListener('change', ready);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('resize', updateTarget);
      window.removeEventListener('scroll', updateTarget);
    };
  }, []);

  return (
    <div className="toy-stage" aria-hidden="true">
      <video ref={videoRef} muted playsInline preload="auto" src="/toy-scrub.mp4" />
    </div>
  );
}

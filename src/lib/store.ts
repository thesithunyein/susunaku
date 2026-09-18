import { useSyncExternalStore } from "react";
import type { Circle } from "./circle";

const CIRCLES_KEY = "susunaku.circles.v1";

type Listener = () => void;

let circles: Circle[] = load();
const listeners = new Set<Listener>();

function load(): Circle[] {
  try {
    const raw = window.localStorage.getItem(CIRCLES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Circle[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(): void {
  try {
    window.localStorage.setItem(CIRCLES_KEY, JSON.stringify(circles));
  } catch {
    /* private mode: circles live for the session only */
  }
}

function emit(): void {
  circles = [...circles];
  persist();
  for (const listener of listeners) listener();
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Circle[] {
  return circles;
}

export function useCircles(): Circle[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function getCircles(): Circle[] {
  return circles;
}

export function getCircle(id: string): Circle | undefined {
  return circles.find((c) => c.id === id);
}

/** Adds a circle, or replaces an existing one with the same id (re-joining). */
export function upsertCircle(circle: Circle): void {
  const index = circles.findIndex((c) => c.id === circle.id);
  if (index === -1) circles.push(circle);
  else circles[index] = circle;
  emit();
}

export function removeCircle(id: string): void {
  circles = circles.filter((c) => c.id !== id);
  emit();
}

export function subscribeToCircles(listener: Listener): () => void {
  return subscribe(listener);
}

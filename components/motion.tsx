'use client';

/**
 * Motion primitives. Everything here is visible without JavaScript and
 * without motion: an element is only hidden once we know it is below the
 * fold, and prefers-reduced-motion skips every animation.
 */

import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react';
import { formatValue } from '@/lib/format';
import type { MetricFormat } from '@/lib/metrics/types';

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/** Calls back once when the element first enters the viewport. */
export function useInViewOnce<T extends Element>(onEnter: () => void, rootMargin = '0px 0px -12% 0px') {
  const ref = useRef<T | null>(null);
  const done = useRef(false);
  const cb = useRef(onEnter);
  cb.current = onEnter;
  useEffect(() => {
    const el = ref.current;
    if (!el || done.current) return;
    if (typeof IntersectionObserver === 'undefined') { done.current = true; cb.current(); return; }
    let raf = 0;
    const fire = () => { if (done.current) return; done.current = true; io.disconnect(); window.removeEventListener('scroll', onScroll); cb.current(); };
    const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) fire(); }, { rootMargin });
    // An anchor jump or a fast fling can carry an element from below the
    // screen to above it without it ever intersecting; show it then too.
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; if (el.getBoundingClientRect().top < window.innerHeight) fire(); });
    };
    io.observe(el);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { io.disconnect(); window.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [rootMargin]);
  return ref;
}

/** Fades, lifts and sharpens its children the first time they scroll into view. */
export function Reveal({ children, as: Tag = 'div', className = '', delay = 0, ...rest }: { children: ReactNode; as?: ElementType; className?: string; delay?: number; id?: string; 'aria-label'?: string }) {
  const [pre, setPre] = useState(false);
  const ref = useInViewOnce<HTMLElement>(() => setPre(false));
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const r = el.getBoundingClientRect();
    if (r.top > window.innerHeight * 0.92) setPre(true);
  }, [ref]);
  return (
    <Tag ref={ref} className={`reveal${pre ? ' pre' : ''}${className ? ` ${className}` : ''}`} style={delay ? { transitionDelay: `${delay}ms` } : undefined} {...rest}>
      {children}
    </Tag>
  );
}

const easeOut = (t: number) => 1 - (1 - t) ** 3;

/**
 * A live number. Counts up quickly the first time it is seen, then eases to
 * each new value on refresh. Null renders as an em dash, never as zero.
 */
export function MetricNumber({ value, format = 'count', decimals, className, unavailableNote = false }: { value: number | null; format?: MetricFormat; decimals?: number; className?: string; unavailableNote?: boolean }) {
  const [shown, setShown] = useState<number | null>(value);
  const seen = useRef(false);
  const from = useRef<number>(0);
  const frame = useRef<number | null>(null);

  const animate = (to: number, start: number, ms: number) => {
    if (frame.current) cancelAnimationFrame(frame.current);
    if (prefersReducedMotion() || start === to) { setShown(to); return; }
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / ms);
      setShown(start + (to - start) * easeOut(t));
      if (t < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
  };

  const ref = useInViewOnce<HTMLSpanElement>(() => {
    seen.current = true;
    if (value !== null) animate(value, 0, 750);
  });

  useEffect(() => {
    if (value === null) { setShown(null); return; }
    if (!seen.current) { from.current = value; setShown(value); return; }
    animate(value, from.current, 450);
    from.current = value;
    return () => { if (frame.current) cancelAnimationFrame(frame.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (value === null) {
    return (
      <span ref={ref} className={className}>
        —{unavailableNote && <span className="unavail">Data temporarily unavailable</span>}
      </span>
    );
  }
  const n = shown ?? value;
  const rounded = format === 'usd' ? n : decimals !== undefined ? Number(n.toFixed(decimals)) : Math.round(n);
  const text = format === 'usd'
    ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: decimals ?? (Number.isInteger(value) ? 0 : 2), maximumFractionDigits: decimals ?? 2 })
    : format === 'percent'
      ? `${n.toFixed(decimals ?? (value < 10 && !Number.isInteger(value) ? 1 : 0))}%`
      : formatValue(rounded, format === 'ratio' ? 'ratio' : 'count');
  return <span ref={ref} className={`tnum${className ? ` ${className}` : ''}`} aria-label={formatValue(value, format)}>{text}</span>;
}

/** "just now", "4m ago", "3h ago", "Oct 2". Re-renders every 30 seconds. */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

const dateFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric' });
export function ago(iso: string, now: number): string {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d < 7 ? `${d}d ago` : dateFmt.format(new Date(iso));
}

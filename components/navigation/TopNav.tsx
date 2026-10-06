'use client';

import { useEffect, useState } from 'react';
import { EyeIcon, RefreshIcon } from '../ui';

const LINKS = [
  { href: '#overview', label: 'Overview' },
  { href: '#growth', label: 'Growth' },
  { href: '#product', label: 'Product' },
  { href: '#revenue', label: 'Revenue' },
  { href: '#activity', label: 'Activity' },
];

/** Thin translucent bar; a little more solid once the page has scrolled. */
export function TopNav({ stale, refreshing, beat, onRefresh, investor, onInvestor }: {
  stale: boolean; refreshing: boolean; beat: number; onRefresh: () => void; investor: boolean; onInvestor: () => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  return (
    <header className={`nav${scrolled ? ' scrolled' : ''}`}>
      <nav className="navIn" aria-label="Command Center">
        <a className="navBrand" href={investor ? '#top' : '#overview'}>
          <img src="/fynq-logo.png" alt="" width={24} height={24} />
          FYNQ
        </a>
        {!investor && (
          <div className="navLinks">
            {LINKS.map((l) => <a key={l.href} href={l.href}>{l.label}</a>)}
          </div>
        )}
        <div className="navRight">
          <span className="livePill" role="status" aria-live="polite">
            <span key={beat} className={`liveDot${stale ? ' stale' : ' beat'}`} aria-hidden="true" />
            <span className="lbl">{stale ? 'RETRYING' : 'LIVE'}</span>
          </span>
          <button type="button" className={`navBtn${investor ? ' on' : ''}`} onClick={onInvestor} aria-pressed={investor} aria-label={investor ? 'Exit Investor View' : 'Investor View'}>
            <EyeIcon /><span className="lbl">{investor ? 'Exit Investor View' : 'Investor View'}</span>
          </button>
          <button type="button" className="iconBtn" onClick={onRefresh} disabled={refreshing} aria-label="Refresh now">
            <RefreshIcon className={refreshing ? 'spin' : undefined} />
          </button>
        </div>
      </nav>
    </header>
  );
}

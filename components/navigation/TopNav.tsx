'use client';

import { useEffect, useRef, useState } from 'react';
import { CloseIcon, DownloadIcon, ExpandIcon, EyeIcon, MenuIcon, RefreshIcon } from '../ui';

export type View = 'command' | 'ceo' | 'investor';

const LINKS = [
  { href: '#overview', label: 'Overview' },
  { href: '#growth', label: 'Growth' },
  { href: '#journey', label: 'Users' },
  { href: '#activation', label: 'Product' },
  { href: '#monetization', label: 'Revenue' },
  { href: '#activity', label: 'Activity' },
];

/**
 * Almost invisible: transparent over the hero, a blurred surface once the
 * page scrolls. The admin menu holds the views, the export and log out.
 */
export function TopNav({ stale, refreshing, beat, onRefresh, view, onView, onPresent, onLogout }: {
  stale: boolean; refreshing: boolean; beat: number; onRefresh: () => void;
  view: View; onView: (v: View) => void; onPresent: () => void; onLogout: () => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (menu.current && !menu.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('pointerdown', onDown); window.removeEventListener('keydown', onKey); };
  }, [open]);

  const go = (v: View) => { setOpen(false); onView(v); };

  return (
    <header className={`nav${scrolled || open ? ' scrolled' : ''}`}>
      <nav className="navIn" aria-label="Command Center">
        <a className="navBrand" href="#overview" onClick={(e) => { if (view !== 'command') { e.preventDefault(); onView('command'); } }}>
          <img src="/fynq-logo.png" alt="" width={22} height={22} />
          <span>FYNQ</span>
        </a>
        {view === 'command' && (
          <div className="navLinks">
            {LINKS.map((l) => <a key={l.href} href={l.href}>{l.label}</a>)}
          </div>
        )}
        {view !== 'command' && <span className="navMode">{view === 'ceo' ? 'CEO View' : 'Investor View'}</span>}
        <div className="navRight">
          <span className="livePill" role="status" aria-live="polite">
            <span key={beat} className={`liveDot${stale ? ' stale' : ' beat'}`} aria-hidden="true" />
            <span>{stale ? 'RETRYING' : 'LIVE'}</span>
          </span>
          {view === 'investor' ? (
            <>
              <button type="button" className="navBtn hideSm" onClick={onPresent}><ExpandIcon />Present</button>
              <button type="button" className="navBtn on" onClick={() => onView('command')}><span className="hideSm">Exit Investor View</span><span className="showSm">Exit</span></button>
            </>
          ) : (
            <button type="button" className="navBtn hideSm" onClick={() => onView('investor')}>
              <EyeIcon />Investor View
            </button>
          )}
          {view !== 'investor' && <button type="button" className="iconBtn" onClick={onRefresh} disabled={refreshing} aria-label="Refresh now">
            <RefreshIcon className={refreshing ? 'spin' : undefined} />
          </button>}
          {view !== 'investor' && <div className="menuWrap" ref={menu}>
            <button type="button" className="iconBtn admin" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu" aria-label="Admin menu">
              {open ? <CloseIcon /> : <MenuIcon />}
            </button>
            {open && (
              <div className="menu" role="menu">
                <p className="menuLabel">Signed in as admin</p>
                <div className="menuLinks">
                  {view === 'command' && LINKS.map((l) => <a key={l.href} href={l.href} role="menuitem" onClick={() => setOpen(false)}>{l.label}</a>)}
                </div>
                <p className="menuLabel">View</p>
                <button type="button" role="menuitemradio" aria-checked={view === 'command'} onClick={() => go('command')}>Command</button>
                <button type="button" role="menuitemradio" aria-checked={view === 'ceo'} onClick={() => go('ceo')}>CEO View</button>
                <button type="button" role="menuitemradio" aria-checked={false} onClick={() => go('investor')}>Investor View</button>
                <button type="button" role="menuitem" onClick={() => { setOpen(false); onPresent(); }}><ExpandIcon />Presentation Mode</button>
                <hr />
                <a role="menuitem" href="/api/export" onClick={() => setOpen(false)}><DownloadIcon />Export summary (CSV)</a>
                <button type="button" role="menuitem" onClick={() => { setOpen(false); onLogout(); }}>Log out</button>
              </div>
            )}
          </div>}
        </div>
      </nav>
    </header>
  );
}

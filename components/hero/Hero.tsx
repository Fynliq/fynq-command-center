import { syncedAt } from '@/lib/format';
import { ChevronDown } from '../ui';

/** The opening: no dashboard yet, just the promise and the live state. */
export function Hero({ generatedAt, stale }: { generatedAt: string; stale: boolean }) {
  return (
    <section id="overview" className="hero" aria-labelledby="hero-title">
      <div className="grain" aria-hidden="true" />
      <div className="heroIn">
        <p className="kicker">FYNQ Command Center</p>
        <h1 id="hero-title" className="display sheen">Know exactly<br />how FYNQ is growing.</h1>
        <p className="lede">Live company intelligence.<br />From first visit to paying customer.</p>
        <div className="heroLive">
          <b><span className={`liveDot${stale ? ' stale' : ''}`} aria-hidden="true" />{stale ? 'RECONNECTING' : 'LIVE DATA'}</b>
          <span className="sep" aria-hidden="true" />
          <span>Last updated {syncedAt(generatedAt)}</span>
        </div>
      </div>
      <a className="scrollCue" href="#device" aria-label="Scroll to the numbers"><ChevronDown /></a>
    </section>
  );
}

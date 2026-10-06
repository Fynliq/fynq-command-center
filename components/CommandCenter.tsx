'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DashboardData } from '@/lib/metrics/types';
import { syncedAt } from '@/lib/format';
import { TopNav, type View } from './navigation/TopNav';
import { Hero } from './hero/Hero';
import { ExecutiveStrip } from './metrics/ExecutiveStrip';
import { PulseBand } from './metrics/PulseBand';
import { TodayBriefing } from './metrics/TodayBriefing';
import { PhoneShowcase } from './device/PhoneShowcase';
import { phoneMetricsFrom } from '@/lib/metrics/phone';
import { GrowthChapter } from './sections/GrowthChapter';
import { ActivationChapter } from './sections/ActivationChapter';
import { EngagementChapter } from './sections/EngagementChapter';
import { MonetizationChapter } from './revenue/MonetizationChapter';
import { RetentionChapter } from './sections/RetentionChapter';
import { TrafficSection } from './revenue/TrafficSection';
import { LiveActivity } from './activity/LiveActivity';
import { Milestones, RoadTo5000 } from './milestones/Milestones';
import { Trajectory } from './milestones/Trajectory';
import { Details } from './details/Details';
import { InvestorMode } from './investor/InvestorMode';
import { CeoView } from './views/CeoView';
import { DownloadIcon } from './ui';

const REFRESH_MS = 60_000;

/**
 * The page. It owns the live data: the server renders the first numbers,
 * then this refreshes them every 60 seconds (and when the tab comes back),
 * keeping the last good numbers if a refresh fails. Three views share the
 * same data: COMMAND (everything), CEO (one screen) and Investor (slides).
 */
export function CommandCenter({ initial }: { initial: DashboardData }) {
  const [d, setD] = useState(initial);
  const [refreshing, setRefreshing] = useState(false);
  const [stale, setStale] = useState(false);
  const [beat, setBeat] = useState(0);
  const [view, setView] = useState<View>('command');
  const [presenting, setPresenting] = useState(false);
  const busy = useRef(false);

  const refresh = useCallback(async (force = false) => {
    if (busy.current) return;
    busy.current = true;
    setRefreshing(true);
    try {
      const res = await fetch(`/api/metrics${force ? '?fresh=1' : ''}`, { cache: 'no-store', credentials: 'same-origin' });
      if (res.status === 401) { window.location.href = '/login'; return; }
      if (!res.ok) throw new Error('metrics');
      setD((await res.json()) as DashboardData);
      setStale(false);
      setBeat((b) => b + 1);
    } catch {
      setStale(true);
    } finally {
      busy.current = false;
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, REFRESH_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [refresh]);

  const present = useCallback((on: boolean) => {
    setPresenting(on);
    if (on) void document.documentElement.requestFullscreen?.().catch(() => {});
    else if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => {});
  }, []);

  const changeView = (next: View) => {
    if (presenting && next !== 'investor') present(false);
    setView(next);
    window.scrollTo({ top: 0 });
  };

  const startPresenting = () => { setView('investor'); window.scrollTo({ top: 0 }); present(true); };

  const logout = async () => {
    await fetch('/api/logout', { method: 'POST' }).catch(() => null);
    window.location.href = '/login';
  };

  // The phone reads the same refreshed response as the page: no separate queries.
  const phone = phoneMetricsFrom(d);

  return (
    <div className={`cc view-${view}${presenting ? ' present' : ''}`}>
      {!presenting && (
        <TopNav stale={stale} refreshing={refreshing} beat={beat} onRefresh={() => void refresh(true)} view={view} onView={changeView} onPresent={startPresenting} onLogout={() => void logout()} />
      )}

      {view === 'investor' && <InvestorMode d={d} presenting={presenting} onPresent={present} />}
      {view === 'ceo' && <CeoView d={d} />}
      {view === 'command' && (
        <main>
          <Hero moment={d.story.moment} generatedAt={d.generatedAt} stale={stale} />
          <ExecutiveStrip d={d} />
          <PulseBand pulse={d.story.pulse} velocity={d.story.velocity} />
          <TodayBriefing d={d} />
          <GrowthChapter d={d} />
          <ActivationChapter d={d} />
          <PhoneShowcase metrics={phone} />
          <EngagementChapter d={d} />
          <MonetizationChapter d={d} />
          <TrafficSection a={d.attribution} />
          <RetentionChapter r={d.story.retention} />
          <LiveActivity events={d.story.live} />
          <Milestones milestones={d.story.milestones} />
          <RoadTo5000 target={d.story.target} />
          <Trajectory target={d.story.target} history={d.growth.tracked.daily.map((p) => p.total)} generatedAt={d.generatedAt} />
          {d.unavailable.length > 0 && (
            <div className="container"><div className="notice" role="status"><p>Some numbers are temporarily unavailable ({d.unavailable.join(', ')}). They show as “—”; everything else is live.</p></div></div>
          )}
          <Details d={d} />
          <footer className="foot">
            <div className="container footIn">
              <span className="footBrand"><img src="/fynq-logo.png" alt="" width={18} height={18} />FYNQ Command Center</span>
              <span className="muted">Aggregate figures only · Central Time · updated {syncedAt(d.generatedAt)} · refreshes every 60 seconds</span>
              <span className="footActions">
                <a className="navBtn" href="/api/export"><DownloadIcon />Export summary</a>
                <button type="button" className="navBtn" onClick={() => void logout()}>Log out</button>
              </span>
            </div>
          </footer>
        </main>
      )}
    </div>
  );
}

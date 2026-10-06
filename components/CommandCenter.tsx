'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DashboardData } from '@/lib/metrics/types';
import { syncedAt } from '@/lib/format';
import { TopNav } from './navigation/TopNav';
import { Hero } from './hero/Hero';
import { IPhoneShowcase, type PhoneMetrics } from './device/IPhoneShowcase';
import { CompanyMoment } from './metrics/CompanyMoment';
import { FynqPulse } from './metrics/FynqPulse';
import { TodaySection } from './metrics/TodaySection';
import { ProductStory } from './metrics/ProductStory';
import { GrowthSection } from './growth/GrowthSection';
import { ConversionJourney } from './funnel/ConversionJourney';
import { RevenueSection } from './revenue/RevenueSection';
import { TrafficSection } from './revenue/TrafficSection';
import { LiveActivity } from './activity/LiveActivity';
import { Milestones, RoadTo5000 } from './milestones/Milestones';
import { Details } from './details/Details';
import { InvestorMode } from './investor/InvestorMode';
import { byId, DownloadIcon, v } from './ui';

const REFRESH_MS = 60_000;

/**
 * The page. It owns the live data: the server renders the first numbers,
 * then this refreshes them every 60 seconds (and when the tab comes back),
 * keeping the last good numbers if a refresh fails.
 */
export function CommandCenter({ initial }: { initial: DashboardData }) {
  const [d, setD] = useState(initial);
  const [refreshing, setRefreshing] = useState(false);
  const [stale, setStale] = useState(false);
  const [beat, setBeat] = useState(0);
  const [investor, setInvestor] = useState(false);
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

  const toggleInvestor = () => {
    setInvestor((x) => !x);
    if (presenting) present(false);
    window.scrollTo({ top: 0 });
  };

  const logout = async () => {
    await fetch('/api/logout', { method: 'POST' }).catch(() => null);
    window.location.href = '/login';
  };

  const phone: PhoneMetrics = {
    trackedUsers: v(byId(d.primary, 'trackedUsers')),
    newUsersToday: v(byId(d.today, 'newTrackedToday')),
    accounts: v(byId(d.primary, 'accounts')),
    uploaders: v(byId(d.uploads.metrics, 'uniqueUploaders')),
    paidCustomers: v(byId(d.primary, 'paidCustomers')),
    revenue: v(byId(d.primary, 'realRevenue')),
    growthHistory: d.growth.tracked.daily.slice(-30).map((p) => p.total),
  };

  return (
    <div className={presenting ? 'present' : undefined}>
      <TopNav stale={stale} refreshing={refreshing} beat={beat} onRefresh={() => void refresh(true)} investor={investor} onInvestor={toggleInvestor} />
      {investor ? (
        <InvestorMode d={d} presenting={presenting} onPresent={present} onExit={toggleInvestor} />
      ) : (
        <main>
          <Hero generatedAt={d.generatedAt} stale={stale} />
          <IPhoneShowcase metrics={phone} />
          <CompanyMoment moment={d.story.moment} />
          <FynqPulse pulse={d.story.pulse} />
          <TodaySection today={d.today} />
          <GrowthSection series={d.growth.tracked} />
          <ProductStory d={d} />
          <ConversionJourney journey={d.story.journey} />
          <RevenueSection d={d} />
          <TrafficSection a={d.attribution} />
          <LiveActivity events={d.story.live} />
          <Milestones milestones={d.story.milestones} />
          <RoadTo5000 target={d.story.target} />
          {d.unavailable.length > 0 && (
            <div className="notice" role="status"><p>Some numbers are temporarily unavailable ({d.unavailable.join(', ')}). They show as “—”; everything else is live.</p></div>
          )}
          <Details d={d} />
          <footer className="foot">
            <div className="wrap footIn">
              <span>FYNQ Command Center · aggregate figures only · Central Time · updated {syncedAt(d.generatedAt)} · refreshes every 60 seconds</span>
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

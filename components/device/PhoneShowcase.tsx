'use client';

import type { PhoneMetrics } from '@/lib/metrics/phone';
import { Reveal } from '../motion';
import { IPhoneFynqDisplay } from './IPhoneFynqDisplay';

/** The device section: copy on the left, the live phone on the right. */
export function PhoneShowcase({ metrics }: { metrics: PhoneMetrics }) {
  return (
    <section id="device" className="device2" aria-labelledby="device-title">
      <div className="container deviceGrid">
        <Reveal className="deviceText">
          <p className="label">Mobile</p>
          <h2 id="device-title" className="sectionTitle">The company,<br /><span className="soft">in your hand.</span></h2>
          <p className="lead">The same live numbers, on the same refresh, built for a phone.</p>
        </Reveal>
        <IPhoneFynqDisplay metrics={metrics} />
      </div>
    </section>
  );
}

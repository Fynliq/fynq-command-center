import type { StoryData } from '@/lib/metrics/types';
import { formatValue } from '@/lib/format';
import { Reveal } from '../motion';

/** A plain-language read of the week, chosen by a fixed rule (no AI). */
export function FynqPulse({ pulse }: { pulse: StoryData['pulse'] }) {
  return (
    <section className="stage tight" aria-labelledby="pulse-title">
      <Reveal className="wrap">
        <div className="pulse">
          <div className="pulseHead">
            <img src="/fynq-logo.png" alt="" width={28} height={28} />
            <p className="kicker" id="pulse-title">FYNQ Pulse</p>
          </div>
          <p className="headline">{pulse.headline}</p>
          {pulse.detail && <p className="lede">{pulse.detail}</p>}
          <div className="pulseItems">
            {pulse.items.map((i) => (
              <div className="pulseItem" key={i.id}>
                <span>{i.label}</span>
                <b className={`tnum${i.value ? ' pos' : ''}`}>{i.value === null ? '—' : `+${formatValue(i.value, i.format)}`}</b>
                <span>{i.value === null ? 'Data temporarily unavailable' : i.suffix}</span>
              </div>
            ))}
          </div>
          <p className="pulseRule">{pulse.rule}</p>
        </div>
      </Reveal>
    </section>
  );
}

'use client';

import type { ReactNode } from 'react';
import { Reveal } from '../motion';

/**
 * One numbered chapter of COMMAND mode: "01 Growth". Chapters are told apart
 * by space and a hairline, not by color. On a phone the number and name
 * stick under the navigation while the chapter is on screen.
 */
export function Chapter({ id, n, name, title, sub, children, tone = 'base', aside }: {
  id: string; n: string; name: string; title: ReactNode; sub?: ReactNode; children: ReactNode; tone?: 'base' | 'raised' | 'black'; aside?: ReactNode;
}) {
  return (
    <section id={id} className={`chapter ${tone}`} aria-labelledby={`${id}-title`}>
      <div className="chapterTag" aria-hidden="true">
        <div className="container"><span className="num tnum">{n}</span><span className="nm">{name}</span></div>
      </div>
      <div className="container">
        <Reveal className="chapterHead">
          <div>
            <p className="eyebrowTag"><span className="tnum">{n}</span>{name}</p>
            <h2 id={`${id}-title`} className="sectionTitle">{title}</h2>
            {sub && <p className="lead">{sub}</p>}
          </div>
          {aside && <div className="chapterAside">{aside}</div>}
        </Reveal>
        {children}
      </div>
    </section>
  );
}

/** A quiet block inside a chapter: a small label, then whatever it holds. */
export function Block({ label, right, children, className = '' }: { label?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Reveal className={`block2 ${className}`}>
      {(label || right) && (
        <div className="blockHead">
          {label && <p className="label">{label}</p>}
          {right}
        </div>
      )}
      {children}
    </Reveal>
  );
}

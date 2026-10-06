/** Shown while the first live numbers load: quiet skeletons, no spinner. */
export default function Loading() {
  return (
    <main aria-busy="true" aria-label="Loading the Command Center" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '120px 20px' }}>
      <div style={{ width: 'min(880px, 100%)', display: 'grid', gap: 18, justifyItems: 'center' }}>
        <div className="skel" style={{ width: 180, height: 14 }} />
        <div className="skel" style={{ width: '90%', height: 'clamp(48px, 9vw, 110px)' }} />
        <div className="skel" style={{ width: '70%', height: 'clamp(48px, 9vw, 110px)' }} />
        <div className="skel" style={{ width: 320, maxWidth: '80%', height: 22, marginTop: 12 }} />
      </div>
    </main>
  );
}

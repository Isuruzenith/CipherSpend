import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';

/* ─────────────────────────────────────────
   SHARED THEME PRIMITIVES
   (mirrors Login page exactly)
───────────────────────────────────────── */

/** Tiling hex-grid SVG — fixed behind everything */
function HexGrid() {
  return (
    <svg
      style={{
        position: 'fixed', inset: 0, width: '100%', height: '100%',
        opacity: 0.028, pointerEvents: 'none', zIndex: 0,
      }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="hex-land" x="0" y="0" width="56" height="48" patternUnits="userSpaceOnUse">
          <polygon points="28,2 52,14 52,38 28,50 4,38 4,14"
            fill="none" stroke="#14b8a6" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hex-land)" />
    </svg>
  );
}

/** Falling cipher-character column — same as Login */
const GLYPHS = '01アイウエオカキクケコABCDEF0123456789⊕⊗∑∫√≠≡';
function CipherStream({ col, side = 'left', opacity = 0.55 }: {
  col: number; side?: 'left' | 'right'; opacity?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    const chars: string[] = Array.from({ length: 32 },
      () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]);
    const id = setInterval(() => {
      frame++;
      chars[Math.floor(Math.random() * chars.length)] =
        GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      el.innerHTML = chars.map((c, i) => {
        const o = Math.max(0, 1 - Math.abs(i - (frame % chars.length)) / 9);
        const color = i === frame % chars.length
          ? '#14b8a6'
          : `rgba(20,184,166,${o * 0.18})`;
        return `<span style="color:${color};display:block;height:18px;font-size:11px;line-height:18px;">${c}</span>`;
      }).join('');
    }, 85);
    return () => clearInterval(id);
  }, []);
  return (
    <div ref={ref} style={{
      position: 'fixed', top: 0, [side]: `${col}px`,
      fontFamily: 'monospace', userSelect: 'none', pointerEvents: 'none',
      height: '100vh', display: 'flex', flexDirection: 'column',
      zIndex: 0, opacity,
    }} />
  );
}

/** Teal pill badge — same as Dashboard */
function VaultBadge({ label }: { label: string }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '5px 12px', borderRadius: 999,
      background: 'rgba(20,184,166,0.07)',
      border: '1px solid rgba(20,184,166,0.22)',
      fontSize: 12, color: '#14b8a6',
      fontFamily: '"IBM Plex Mono", monospace',
      letterSpacing: '0.07em', fontWeight: 600,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%', background: '#14b8a6',
        display: 'inline-block', boxShadow: '0 0 6px #14b8a6',
      }} />
      {label}
    </div>
  );
}

/** Dark glass card — mirrors Dashboard Panel */
function Panel({ children, style }: {
  children: React.ReactNode; style?: React.CSSProperties;
}) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 16, position: 'relative', overflow: 'hidden',
      backdropFilter: 'blur(4px)',
      ...style,
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, width: 80, height: 80,
        background: 'radial-gradient(circle at 0 0, rgba(20,184,166,0.07), transparent 70%)',
        pointerEvents: 'none',
      }} />
      {children}
    </div>
  );
}

/** Monospace section label with teal tick */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: '#14b8a6',
      letterSpacing: '0.1em', textTransform: 'uppercase',
      fontFamily: '"IBM Plex Mono", monospace', marginBottom: 12,
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <span style={{ width: 20, height: 1, background: 'rgba(20,184,166,0.5)', display: 'inline-block' }} />
      {children}
      <span style={{ width: 20, height: 1, background: 'rgba(20,184,166,0.5)', display: 'inline-block' }} />
    </div>
  );
}

/* ─────────────────────────────────────────
   ANIMATED CANVAS — packet flow
───────────────────────────────────────── */
function SketchCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;
    const accent = '#14b8a6';
    const line = 'rgba(20,184,166,0.15)';

    const paths = [
      { p0: [80, H / 2 - 36], p1: [W * 0.35, H / 2 - 72], p2: [W * 0.65, H / 2 - 72], p3: [W - 80, H / 2 - 36], phase: 0 },
      { p0: [80, H / 2], p1: [W * 0.35, H / 2 + 8], p2: [W * 0.65, H / 2 - 8], p3: [W - 80, H / 2], phase: 0.33 },
      { p0: [80, H / 2 + 36], p1: [W * 0.35, H / 2 + 72], p2: [W * 0.65, H / 2 + 72], p3: [W - 80, H / 2 + 36], phase: 0.66 },
    ];

    function bez(t: number, p0: number[], p1: number[], p2: number[], p3: number[]) {
      const u = 1 - t;
      return [
        u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
        u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
      ];
    }

    function draw(ts: number) {
      ctx.clearRect(0, 0, W, H);
      paths.forEach(p => {
        ctx.beginPath();
        ctx.moveTo(p.p0[0], p.p0[1]);
        ctx.bezierCurveTo(p.p1[0], p.p1[1], p.p2[0], p.p2[1], p.p3[0], p.p3[1]);
        ctx.strokeStyle = line;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 7]);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      const speed = ts * 0.00028;
      paths.forEach(p => {
        const t = ((speed + p.phase) % 1);
        const [x, y] = bez(t, p.p0, p.p1, p.p2, p.p3);
        const grad = ctx.createRadialGradient(x, y, 0, x, y, 16);
        grad.addColorStop(0, accent + 'cc');
        grad.addColorStop(1, accent + '00');
        ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2);
        ctx.fillStyle = grad; ctx.fill();
        ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = accent; ctx.fill();
      });

      [[80, H / 2 - 36], [80, H / 2], [80, H / 2 + 36],
      [W - 80, H / 2 - 36], [W - 80, H / 2], [W - 80, H / 2 + 36]]
        .forEach(([x, y]) => {
          ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(20,184,166,0.08)';
          ctx.strokeStyle = accent + '66'; ctx.lineWidth = 1;
          ctx.fill(); ctx.stroke();
        });

      rafRef.current = requestAnimationFrame(draw);
    }
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

/* ─────────────────────────────────────────
   HOW IT WORKS — stepper
───────────────────────────────────────── */
const STEPS = [
  {
    icon: (
      <svg viewBox="0 0 56 56" fill="none" style={{ width: 48, height: 48 }}>
        <rect x="8" y="14" width="40" height="28" rx="6" stroke="#14b8a6" strokeWidth="1.5" fill="none" />
        <path d="M20 28h6M28 22v12" stroke="#14b8a6" strokeWidth="2" strokeLinecap="round" />
        <path d="M36 24l-4 4 4 4" stroke="#14b8a6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity=".5" />
        <circle cx="44" cy="16" r="5" fill="#0d9488" />
        <path d="M42 16l1.5 1.5L46 14" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
    label: 'Your Device',
    title: 'Encrypt in browser',
    body: 'You type LKR 42.50 for groceries. Before anything leaves your device, the raw amount is encrypted using CKKS homomorphic encryption via WebAssembly (node-seal). The server never sees a raw number — only an unreadable ciphertext blob.',
    color: '#14b8a6',
    border: 'rgba(20,184,166,0.3)',
    bg: 'rgba(20,184,166,0.06)',
  },
  {
    icon: (
      <svg viewBox="0 0 56 56" fill="none" style={{ width: 48, height: 48 }}>
        <rect x="6" y="18" width="44" height="20" rx="4" stroke="#8b5cf6" strokeWidth="1.5" fill="none" />
        <circle cx="16" cy="28" r="4" stroke="#8b5cf6" strokeWidth="1.2" fill="none" />
        <circle cx="28" cy="28" r="4" stroke="#8b5cf6" strokeWidth="1.2" fill="none" />
        <circle cx="40" cy="28" r="4" stroke="#8b5cf6" strokeWidth="1.2" fill="none" />
        <path d="M10 10l3 8M46 10l-3 8M10 46l3-8M46 46l-3-8" stroke="#8b5cf6" strokeWidth="1" opacity=".4" />
      </svg>
    ),
    label: 'API Server',
    title: 'Blind computation',
    body: 'The FastAPI backend receives ciphertext blobs and runs TenSEAL homomorphic additions on them. It calculates your total monthly spending and per-category sums — all on encrypted data. The server is effectively blind to your actual amounts.',
    color: '#8b5cf6',
    border: 'rgba(139,92,246,0.3)',
    bg: 'rgba(139,92,246,0.06)',
  },
  {
    icon: (
      <svg viewBox="0 0 56 56" fill="none" style={{ width: 48, height: 48 }}>
        <path d="M14 40V28c0-7.7 6.3-14 14-14s14 6.3 14 14v12" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <rect x="10" y="36" width="36" height="14" rx="4" stroke="#f59e0b" strokeWidth="1.5" fill="none" />
        <circle cx="28" cy="43" r="3" fill="#f59e0b" />
        <path d="M28 43v3" stroke="#f59e0b" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
    label: 'Vault Session',
    title: 'Decrypt locally',
    body: 'The encrypted aggregate result returns to your browser. Your session secret key — derived from your passphrase via PBKDF2 — decrypts it in-memory via WASM. Only your active vault tab ever sees the real numbers. Close the tab, the key is gone.',
    color: '#f59e0b',
    border: 'rgba(245,158,11,0.3)',
    bg: 'rgba(245,158,11,0.06)',
  },
];

function StepExplainer() {
  const [active, setActive] = useState(0);
  const [animating, setAnimating] = useState(false);

  function go(i: number) {
    if (i === active) return;
    setAnimating(true);
    setTimeout(() => { setActive(i); setAnimating(false); }, 180);
  }

  const s = STEPS[active];

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Tab row */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        {STEPS.map((st, i) => (
          <button key={i} onClick={() => go(i)} style={{
            flex: 1, padding: '16px 8px',
            background: i === active ? st.bg : 'transparent',
            border: 'none',
            borderBottom: i === active ? `2px solid ${st.color}` : '2px solid transparent',
            color: i === active ? '#f4f4f5' : '#52525b',
            fontSize: 12, fontWeight: i === active ? 700 : 400,
            fontFamily: '"IBM Plex Mono", monospace',
            letterSpacing: '0.06em', textTransform: 'uppercase',
            cursor: 'pointer', transition: 'all .2s',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          }}>
            <span style={{ opacity: i === active ? 1 : 0.35, transition: 'opacity .2s' }}>
              {st.icon}
            </span>
            {st.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{
        padding: '28px 32px 20px',
        opacity: animating ? 0 : 1,
        transform: animating ? 'translateY(8px)' : 'translateY(0)',
        transition: 'opacity .2s, transform .2s',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '3px 10px', borderRadius: 6,
          background: s.bg, border: `1px solid ${s.border}`,
          fontSize: 11, color: s.color,
          fontFamily: '"IBM Plex Mono", monospace',
          letterSpacing: '0.06em', marginBottom: 12,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
          STEP {active + 1} OF 3
        </div>
        <h3 style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 700, color: s.color, letterSpacing: '-0.01em' }}>
          {s.title}
        </h3>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.8, color: '#71717a', maxWidth: 560 }}>
          {s.body}
        </p>
      </div>

      {/* Progress dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, paddingBottom: 20 }}>
        {STEPS.map((st, i) => (
          <button key={i} onClick={() => go(i)} style={{
            width: i === active ? 24 : 6, height: 6, borderRadius: 3,
            border: 'none', cursor: 'pointer',
            background: i === active ? st.color : 'rgba(255,255,255,0.12)',
            transition: 'all .3s', padding: 0,
          }} />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   FHE MATH TRACE
───────────────────────────────────────── */
function FHESketch() {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 400); return () => clearTimeout(t); }, []);

  const rows = [
    { label: 'Encrypt', op: 'Enc(42.50)', result: '⟨ct₁⟩', color: '#14b8a6' },
    { label: 'Encrypt', op: 'Enc(18.00)', result: '⟨ct₂⟩', color: '#14b8a6' },
    { label: 'Server adds', op: 'ct₁ ⊕ ct₂', result: '⟨ct₃⟩', color: '#8b5cf6' },
    { label: 'Decrypt', op: 'Dec(ct₃)', result: '60.50', color: '#f59e0b' },
  ];

  return (
    <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 13, display: 'flex', flexDirection: 'column', gap: 0 }}>
      {rows.map((r, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateX(0)' : 'translateX(-14px)',
          transition: `opacity .35s ${i * 0.13}s, transform .35s ${i * 0.13}s`,
          padding: '9px 0',
          borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
        }}>
          <span style={{ color: '#3f3f46', minWidth: 90, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {r.label}
          </span>
          <span style={{ color: '#a1a1aa', flex: 1 }}>{r.op}</span>
          <span style={{ color: r.color, fontWeight: 700 }}>→ {r.result}</span>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────
   TRUST BOUNDARY SVG
───────────────────────────────────────── */
function TrustBoundary() {
  return (
    <svg viewBox="0 0 440 160" fill="none" style={{ width: '100%', display: 'block' }}>
      <rect x="4" y="10" width="194" height="140" rx="10"
        stroke="#14b8a6" strokeWidth="1" strokeDasharray="4 3" fill="rgba(20,184,166,0.04)" />
      <text x="14" y="28" fill="#14b8a6" fontSize="10" fontWeight="600" fontFamily="monospace">BROWSER (trusted)</text>
      <rect x="14" y="36" width="80" height="30" rx="5" fill="rgba(20,184,166,0.1)" stroke="#14b8a6" strokeWidth="0.8" />
      <text x="54" y="54" fill="#5eead4" fontSize="11" textAnchor="middle" fontFamily="monospace">keygen</text>
      <rect x="106" y="36" width="80" height="30" rx="5" fill="rgba(20,184,166,0.1)" stroke="#14b8a6" strokeWidth="0.8" />
      <text x="146" y="54" fill="#5eead4" fontSize="11" textAnchor="middle" fontFamily="monospace">encrypt</text>
      <rect x="14" y="80" width="172" height="30" rx="5" fill="rgba(20,184,166,0.07)" stroke="#14b8a6" strokeWidth="0.8" />
      <text x="100" y="99" fill="#5eead4" fontSize="11" textAnchor="middle" fontFamily="monospace">decrypt (WASM)</text>

      <line x1="200" y1="80" x2="236" y2="80" stroke="#3f3f46" strokeWidth="1" markerEnd="url(#aw2)" />
      <text x="218" y="73" fill="#52525b" fontSize="9" textAnchor="middle" fontFamily="monospace">ciphertext</text>

      <rect x="238" y="10" width="194" height="140" rx="10"
        stroke="#8b5cf6" strokeWidth="1" strokeDasharray="4 3" fill="rgba(139,92,246,0.04)" />
      <text x="248" y="28" fill="#8b5cf6" fontSize="10" fontWeight="600" fontFamily="monospace">SERVER (untrusted)</text>
      <rect x="248" y="36" width="80" height="30" rx="5" fill="rgba(139,92,246,0.1)" stroke="#8b5cf6" strokeWidth="0.8" />
      <text x="288" y="54" fill="#c4b5fd" fontSize="11" textAnchor="middle" fontFamily="monospace">store ct</text>
      <rect x="340" y="36" width="80" height="30" rx="5" fill="rgba(139,92,246,0.1)" stroke="#8b5cf6" strokeWidth="0.8" />
      <text x="380" y="54" fill="#c4b5fd" fontSize="11" textAnchor="middle" fontFamily="monospace">sum ct</text>
      <rect x="248" y="80" width="172" height="30" rx="5"
        fill="rgba(139,92,246,0.05)" stroke="#8b5cf6" strokeWidth="0.8" strokeDasharray="3 2" />
      <text x="334" y="99" fill="#a78bfa" fontSize="11" textAnchor="middle" fontFamily="monospace">⛔ no plaintext</text>

      <line x1="238" y1="124" x2="202" y2="124" stroke="#3f3f46" strokeWidth="1" markerEnd="url(#aw2)" />
      <text x="220" y="117" fill="#52525b" fontSize="9" textAnchor="middle" fontFamily="monospace">encrypted sum</text>

      <defs>
        <marker id="aw2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M2 2L8 5L2 8" fill="none" stroke="#52525b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>
    </svg>
  );
}

/* ─────────────────────────────────────────
   MAIN LANDING PAGE
───────────────────────────────────────── */
export default function Landing() {
  const [heroVisible, setHeroVisible] = useState(false);
  useEffect(() => { setTimeout(() => setHeroVisible(true), 60); }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080a0c',
      color: '#f4f4f5',
      fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
      overflowX: 'hidden',
      position: 'relative',
    }}>
      <HexGrid />
      {[22, 58].map(c => <CipherStream key={`l${c}`} col={c} side="left" opacity={0.5} />)}
      {[22, 58].map(c => <CipherStream key={`r${c}`} col={c} side="right" opacity={0.5} />)}

      {/* ── HERO ── */}
      <section style={{
        position: 'relative', minHeight: '100vh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '100px 24px 60px', overflow: 'hidden', zIndex: 1,
      }}>
        {/* Ambient glow */}
        <div style={{
          position: 'absolute', top: '18%', left: '50%', transform: 'translateX(-50%)',
          width: 700, height: 500, borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(20,184,166,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{
          maxWidth: 680, textAlign: 'center', position: 'relative', zIndex: 1,
          opacity: heroVisible ? 1 : 0,
          transform: heroVisible ? 'translateY(0)' : 'translateY(22px)',
          transition: 'opacity .65s, transform .65s',
        }}>
          <div style={{ marginBottom: 28 }}>
            <VaultBadge label="CKKS FULLY HOMOMORPHIC ENCRYPTION" />
          </div>

          <h1 style={{
            fontSize: 'clamp(38px,6vw,74px)', fontWeight: 800,
            lineHeight: 1.08, letterSpacing: '-0.03em', margin: '0 0 24px',
          }}>
            Your expenses.<br />
            <span style={{ color: '#14b8a6' }}>Encrypted</span>{' '}
            <span style={{ color: '#27272a' }}>always.</span>
          </h1>

          <p style={{
            fontSize: 'clamp(16px,2vw,20px)', color: '#52525b',
            lineHeight: 1.75, maxWidth: 520, margin: '0 auto 44px',
          }}>
            CipherSpend tracks your finances using homomorphic encryption — the server
            computes your totals without ever reading a single amount.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/signup">
              <button style={{
                padding: '14px 32px', borderRadius: 10, border: 'none',
                background: '#0d9488', color: '#fff', fontSize: 16, fontWeight: 700,
                cursor: 'pointer', letterSpacing: '-0.01em',
                boxShadow: '0 0 28px rgba(20,184,166,0.28)',
                transition: 'background .2s, transform .1s', fontFamily: 'inherit',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = '#0f766e')}
                onMouseLeave={e => (e.currentTarget.style.background = '#0d9488')}
                onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
                onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <svg viewBox="0 0 16 16" fill="none" style={{ width: 14, height: 14 }}>
                    <path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    <rect x="2" y="7" width="12" height="8" rx="2.5" fill="currentColor" opacity=".9" />
                  </svg>
                  Create Secure Vault
                </span>
              </button>
            </Link>
            <Link to="/login">
              <button style={{
                padding: '14px 32px', borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.09)',
                background: 'rgba(255,255,255,0.03)',
                color: '#a1a1aa', fontSize: 16, cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all .2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; e.currentTarget.style.color = '#f4f4f5'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = '#a1a1aa'; }}
              >Unlock Vault</button>
            </Link>
          </div>
        </div>

        {/* Animated canvas strip */}
        <div style={{
          width: '100%', maxWidth: 620, height: 140, marginTop: 72,
          position: 'relative', zIndex: 1,
          opacity: heroVisible ? 1 : 0, transition: 'opacity 1s .35s',
        }}>
          {/* Browser node */}
          <div style={{
            position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: 'rgba(20,184,166,0.08)',
              border: '1px solid rgba(20,184,166,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg viewBox="0 0 20 20" fill="none" style={{ width: 17, height: 17 }}>
                <rect x="2" y="4" width="16" height="12" rx="2" stroke="#14b8a6" strokeWidth="1.2" />
                <path d="M6 16l8 0M10 16v2" stroke="#14b8a6" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>
              <span style={{ fontSize: 10, color: '#3f3f46', letterSpacing: '0.07em', fontFamily: 'monospace' }}>BROWSER</span>
          </div>

          {/* Server node */}
          <div style={{
            position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: 'rgba(139,92,246,0.08)',
              border: '1px solid rgba(139,92,246,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg viewBox="0 0 20 20" fill="none" style={{ width: 17, height: 17 }}>
                <rect x="2" y="2" width="16" height="16" rx="3" stroke="#8b5cf6" strokeWidth="1.2" />
                <path d="M6 7h8M6 10h5M6 13h6" stroke="#8b5cf6" strokeWidth="1" strokeLinecap="round" opacity=".6" />
              </svg>
            </div>
              <span style={{ fontSize: 10, color: '#3f3f46', letterSpacing: '0.07em', fontFamily: 'monospace' }}>SERVER</span>
          </div>

          <div style={{ position: 'absolute', inset: '0 58px' }}>
            <SketchCanvas />
          </div>

          <div style={{
            position: 'absolute', top: '12%', left: '50%', transform: 'translateX(-50%)',
            fontSize: 11, color: '#14b8a6', fontFamily: '"IBM Plex Mono", monospace',
            letterSpacing: '0.04em', pointerEvents: 'none', whiteSpace: 'nowrap',
          }}>⟨ciphertext⟩</div>
          <div style={{
            position: 'absolute', bottom: '12%', left: '50%', transform: 'translateX(-50%)',
            fontSize: 11, color: '#8b5cf6', fontFamily: '"IBM Plex Mono", monospace',
            letterSpacing: '0.04em', pointerEvents: 'none', whiteSpace: 'nowrap',
          }}>⟨encrypted sum⟩</div>
        </div>

        {/* Scroll hint */}
        <div style={{
          position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
          opacity: .3, animation: 'bounce 2s ease-in-out infinite',
        }}>
          <svg viewBox="0 0 16 24" fill="none" style={{ width: 13 }}>
            <rect x="2" y="2" width="12" height="20" rx="6" stroke="#71717a" strokeWidth="1" />
            <circle cx="8" cy="8" r="2" fill="#71717a">
              <animate attributeName="cy" values="8;14;8" dur="1.8s" repeatCount="indefinite" />
            </circle>
          </svg>
          <span style={{ fontSize: 10, color: '#52525b', letterSpacing: '0.08em', fontFamily: 'monospace' }}>SCROLL</span>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: '80px 24px', maxWidth: 860, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <SectionLabel>How it works</SectionLabel>
          <h2 style={{
            fontSize: 'clamp(26px,4vw,42px)', fontWeight: 700,
            letterSpacing: '-0.02em', margin: '4px 0 0', color: '#f4f4f5',
          }}>Three steps, zero visibility</h2>
        </div>

        <Panel>
          <StepExplainer />
        </Panel>
      </section>

      {/* ── MATH + TRUST BOUNDARY ── */}
      <section style={{ padding: '0 24px 80px', maxWidth: 860, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px,1fr))', gap: 16 }}>
          <Panel style={{ padding: '22px 24px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#14b8a6', display: 'inline-block' }} />
              <span style={{
                fontSize: 11, fontWeight: 700, color: '#52525b',
                letterSpacing: '0.08em', textTransform: 'uppercase',
                fontFamily: '"IBM Plex Mono", monospace',
              }}>FHE arithmetic trace</span>
            </div>
            <FHESketch />
          </Panel>

          <Panel style={{ padding: '22px 24px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#8b5cf6', display: 'inline-block' }} />
              <span style={{
                fontSize: 11, fontWeight: 700, color: '#52525b',
                letterSpacing: '0.08em', textTransform: 'uppercase',
                fontFamily: '"IBM Plex Mono", monospace',
              }}>Trust boundary</span>
            </div>
            <TrustBoundary />
          </Panel>
        </div>
      </section>

      {/* ── FEATURE GRID ── */}
      <section style={{ padding: '0 24px 80px', maxWidth: 860, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <SectionLabel>Capabilities</SectionLabel>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 12 }}>
          {[
            { icon: '🔑', title: 'Passphrase-derived keys', sub: 'PBKDF2 + AES-GCM, no server backdoor', accent: '#14b8a6' },
            { icon: '🖥', title: 'WASM in-browser crypto', sub: 'node-seal runs SEAL in your tab', accent: '#14b8a6' },
            { icon: '➕', title: 'Homomorphic addition', sub: 'CKKS scheme, scale 2⁴⁰', accent: '#8b5cf6' },
            { icon: '📤', title: 'Encrypted CSV export', sub: 'Decrypts locally before download', accent: '#8b5cf6' },
            { icon: '🌐', title: 'Multi-currency', sub: 'LKR, USD, EUR, GBP and more', accent: '#f59e0b' },
            { icon: '🗂', title: 'Category analytics', sub: 'Blind aggregation per category', accent: '#f59e0b' },
          ].map((f, i) => (
            <div key={i}
              style={{
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(255,255,255,0.02)',
                padding: '18px 18px 14px',
                transition: 'border-color .2s, background .2s',
                cursor: 'default',
                position: 'relative', overflow: 'hidden',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = `${f.accent}33`;
                e.currentTarget.style.background = `${f.accent}08`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
              }}
            >
              <div style={{ fontSize: 22, marginBottom: 10 }}>{f.icon}</div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#e4e4e7', margin: '0 0 4px', letterSpacing: '-0.01em' }}>
                {f.title}
              </p>
              <p style={{
                fontSize: 12, color: '#3f3f46', margin: 0, lineHeight: 1.65,
                fontFamily: '"IBM Plex Mono", monospace',
              }}>{f.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{
        padding: '80px 24px', textAlign: 'center',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        position: 'relative', zIndex: 1,
      }}>
        {/* ambient glow */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          width: 500, height: 300, borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(20,184,166,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <VaultBadge label="ZERO-KNOWLEDGE STORAGE" />
          <h2 style={{
            fontSize: 'clamp(22px,4vw,36px)', fontWeight: 700,
            letterSpacing: '-0.02em', margin: '20px 0 14px', color: '#f4f4f5',
          }}>
            Ready to take back your financial privacy?
          </h2>
          <p style={{
            fontSize: 15, color: '#52525b', marginBottom: 36,
            maxWidth: 400, margin: '0 auto 36px', lineHeight: 1.75,
          }}>
            Your key never touches our servers. Your amounts never leave your device unencrypted.
          </p>
          <Link to="/signup">
            <button style={{
              padding: '15px 40px', borderRadius: 12, border: 'none',
              background: '#0d9488', color: '#fff', fontSize: 16, fontWeight: 700,
              cursor: 'pointer', letterSpacing: '-0.01em',
              boxShadow: '0 0 36px rgba(20,184,166,0.3)',
              transition: 'background .2s, transform .1s', fontFamily: 'inherit',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = '#0f766e')}
              onMouseLeave={e => (e.currentTarget.style.background = '#0d9488')}
              onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
              onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
            >Create your vault →</button>
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.05)',
        padding: '20px 24px', textAlign: 'center',
        fontSize: 12, color: '#3f3f46',
        fontFamily: '"IBM Plex Mono", monospace',
        letterSpacing: '0.04em', position: 'relative', zIndex: 1,
      }}>
        CipherSpend · client-side homomorphic encryption · CKKS · zero-knowledge storage
      </footer>

      {/* ── warning note — same as Login/Dashboard ── */}
      <div style={{
        margin: '0 24px 24px', padding: '10px 14px',
        background: 'rgba(245,158,11,0.03)',
        border: '1px solid rgba(245,158,11,0.1)',
        borderRadius: 8, fontSize: 12, color: '#57534e',
        fontFamily: '"IBM Plex Mono", monospace', lineHeight: 1.6,
        display: 'flex', alignItems: 'center', gap: 8,
        maxWidth: 860, marginLeft: 'auto', marginRight: 'auto',
        position: 'relative', zIndex: 1,
      }}>
        <span style={{ color: '#a16207' }}>⚠</span>
        Passphrase is unrecoverable by design. Keep it safe.
      </div>

      <style>{`
        @keyframes bounce {
          0%,100% { transform: translateX(-50%) translateY(0); }
          50%      { transform: translateX(-50%) translateY(8px); }
        }
      `}</style>
    </div>
  );
}

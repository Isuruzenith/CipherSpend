import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState } from 'react';

/* ─── tiny animated sketch canvas ─── */
function SketchCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const tRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;

    // theme colours – works in both light & dark via detection
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const accent = '#14b8a6';
    const dim    = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
    const line   = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)';

    // flowing packets along bezier paths
    const paths = [
      { p0:[80,H/2-40], p1:[W*0.35,H/2-80], p2:[W*0.65,H/2-80], p3:[W-80,H/2-40], phase:0   },
      { p0:[80,H/2],    p1:[W*0.35,H/2+10], p2:[W*0.65,H/2-10], p3:[W-80,H/2],    phase:0.33 },
      { p0:[80,H/2+40], p1:[W*0.35,H/2+80], p2:[W*0.65,H/2+80], p3:[W-80,H/2+40], phase:0.66 },
    ];

    function bez(t:number, p0:number[], p1:number[], p2:number[], p3:number[]) {
      const u = 1-t;
      return [
        u*u*u*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t*t*t*p3[0],
        u*u*u*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t*t*t*p3[1],
      ];
    }

    function draw(ts:number) {
      tRef.current = ts;
      ctx.clearRect(0,0,W,H);

      // draw bezier tracks
      paths.forEach(p => {
        ctx.beginPath();
        ctx.moveTo(p.p0[0], p.p0[1]);
        ctx.bezierCurveTo(p.p1[0],p.p1[1], p.p2[0],p.p2[1], p.p3[0],p.p3[1]);
        ctx.strokeStyle = line;
        ctx.lineWidth = 1;
        ctx.setLineDash([4,6]);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // animate packets
      const speed = ts * 0.0003;
      paths.forEach(p => {
        const t = ((speed + p.phase) % 1);
        const [x,y] = bez(t, p.p0, p.p1, p.p2, p.p3);
        // glow trail
        const grad = ctx.createRadialGradient(x,y,0, x,y,14);
        grad.addColorStop(0, accent+'cc');
        grad.addColorStop(1, accent+'00');
        ctx.beginPath();
        ctx.arc(x,y,14,0,Math.PI*2);
        ctx.fillStyle = grad;
        ctx.fill();
        // core dot
        ctx.beginPath();
        ctx.arc(x,y,4,0,Math.PI*2);
        ctx.fillStyle = accent;
        ctx.fill();
      });

      // node circles at endpoints
      [[80,H/2-40],[80,H/2],[80,H/2+40],[W-80,H/2-40],[W-80,H/2],[W-80,H/2+40]].forEach(([x,y]) => {
        ctx.beginPath();
        ctx.arc(x,y,7,0,Math.PI*2);
        ctx.fillStyle = dim;
        ctx.strokeStyle = accent+'88';
        ctx.lineWidth = 1;
        ctx.fill();
        ctx.stroke();
      });

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width:'100%', height:'100%', display:'block' }}
    />
  );
}

/* ─── step-through explainer ─── */
const STEPS = [
  {
    icon: (
      <svg viewBox="0 0 56 56" fill="none" style={{width:56,height:56}}>
        <rect x="8" y="14" width="40" height="28" rx="6" stroke="#14b8a6" strokeWidth="1.5" fill="none"/>
        <path d="M20 28h6M28 22v12" stroke="#14b8a6" strokeWidth="2" strokeLinecap="round"/>
        <path d="M36 24l-4 4 4 4" stroke="#14b8a6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity=".5"/>
        <circle cx="44" cy="16" r="5" fill="#0d9488"/>
        <path d="M42 16l1.5 1.5L46 14" stroke="#fff" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
    label: 'Your device',
    title: 'Encrypt in browser',
    body: 'You type LKR 42.50 for groceries. Before anything leaves your device, the raw amount is encrypted using CKKS homomorphic encryption via WebAssembly (node-seal). The server never sees a raw number — only an unreadable ciphertext blob.',
    color: '#0d9488',
  },
  {
    icon: (
      <svg viewBox="0 0 56 56" fill="none" style={{width:56,height:56}}>
        <rect x="6" y="18" width="44" height="20" rx="4" stroke="#8b5cf6" strokeWidth="1.5" fill="none"/>
        <circle cx="16" cy="28" r="4" stroke="#8b5cf6" strokeWidth="1.2" fill="none"/>
        <circle cx="28" cy="28" r="4" stroke="#8b5cf6" strokeWidth="1.2" fill="none"/>
        <circle cx="40" cy="28" r="4" stroke="#8b5cf6" strokeWidth="1.2" fill="none"/>
        <path d="M10 10l3 8M46 10l-3 8" stroke="#8b5cf6" strokeWidth="1" opacity=".4"/>
        <path d="M10 46l3-8M46 46l-3-8" stroke="#8b5cf6" strokeWidth="1" opacity=".4"/>
      </svg>
    ),
    label: 'CipherSpend API',
    title: 'Blind computation',
    body: 'The FastAPI backend receives ciphertext blobs and runs TenSEAL homomorphic additions on them. It can calculate your total monthly spending, per-category sums — all on encrypted data. The server is effectively blind to your actual amounts.',
    color: '#8b5cf6',
  },
  {
    icon: (
      <svg viewBox="0 0 56 56" fill="none" style={{width:56,height:56}}>
        <path d="M14 40V28c0-7.7 6.3-14 14-14s14 6.3 14 14v12" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        <rect x="10" y="36" width="36" height="14" rx="4" stroke="#f59e0b" strokeWidth="1.5" fill="none"/>
        <circle cx="28" cy="43" r="3" fill="#f59e0b"/>
        <path d="M28 43v3" stroke="#f59e0b" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
    label: 'Your vault session',
    title: 'Decrypt locally',
    body: 'The encrypted aggregate result returns to your browser. Your session secret key — derived from your passphrase via PBKDF2 — decrypts it in-memory via WASM. Only your active vault tab ever sees the real numbers. Close the tab, the key is gone.',
    color: '#f59e0b',
  },
];

function StepExplainer() {
  const [active, setActive] = useState(0);
  const [animating, setAnimating] = useState(false);

  function go(i:number) {
    if (i === active) return;
    setAnimating(true);
    setTimeout(() => { setActive(i); setAnimating(false); }, 180);
  }

  const s = STEPS[active];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
      {/* step tabs */}
      <div style={{ display:'flex', gap:0, borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
        {STEPS.map((st,i) => (
          <button
            key={i}
            onClick={() => go(i)}
            style={{
              flex:1, padding:'14px 8px', background:'transparent',
              border:'none', borderBottom: i===active ? `2px solid ${st.color}` : '2px solid transparent',
              color: i===active ? '#f4f4f5' : '#71717a',
              fontSize:13, fontWeight: i===active ? 600 : 400,
              cursor:'pointer', transition:'all .2s',
              display:'flex', flexDirection:'column', alignItems:'center', gap:8,
            }}
          >
            <span style={{ opacity: i===active ? 1 : 0.45, transition:'opacity .2s' }}>
              {st.icon}
            </span>
            <span style={{fontSize:11, letterSpacing:'0.04em', textTransform:'uppercase'}}>{st.label}</span>
          </button>
        ))}
      </div>

      {/* content */}
      <div style={{
        padding:'28px 28px 24px',
        opacity: animating ? 0 : 1,
        transform: animating ? 'translateY(6px)' : 'translateY(0)',
        transition:'opacity .2s, transform .2s',
      }}>
        <h3 style={{ margin:'0 0 10px', fontSize:18, fontWeight:600, color: s.color }}>
          {s.title}
        </h3>
        <p style={{ margin:0, fontSize:14, lineHeight:1.75, color:'#a1a1aa' }}>
          {s.body}
        </p>
      </div>

      {/* progress dots */}
      <div style={{ display:'flex', justifyContent:'center', gap:6, paddingBottom:16 }}>
        {STEPS.map((_,i) => (
          <button
            key={i}
            onClick={() => go(i)}
            style={{
              width: i===active ? 20 : 6, height:6,
              borderRadius:3, border:'none', cursor:'pointer',
              background: i===active ? STEPS[i].color : 'rgba(255,255,255,0.15)',
              transition:'all .3s', padding:0,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── FHE math sketch card ─── */
function FHESketch() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 400);
    return () => clearTimeout(t);
  }, []);

  const rows = [
    { label:'Encrypt', op:'Enc(42.50)', result:'⟨ct₁⟩', color:'#14b8a6' },
    { label:'Encrypt', op:'Enc(18.00)', result:'⟨ct₂⟩', color:'#14b8a6' },
    { label:'Server adds', op:'ct₁ ⊕ ct₂', result:'⟨ct₃⟩', color:'#8b5cf6' },
    { label:'Decrypt', op:'Dec(ct₃)',  result:'60.50',  color:'#f59e0b' },
  ];

  return (
    <div style={{ fontFamily:'monospace', fontSize:13, display:'flex', flexDirection:'column', gap:2 }}>
      {rows.map((r,i) => (
        <div
          key={i}
          style={{
            display:'flex', alignItems:'center', gap:10,
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateX(0)' : 'translateX(-12px)',
            transition: `opacity .35s ${i*0.12}s, transform .35s ${i*0.12}s`,
            padding:'7px 0',
            borderBottom: i < rows.length-1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
          }}
        >
          <span style={{ color:'#52525b', minWidth:84, fontSize:11, textTransform:'uppercase', letterSpacing:'0.04em' }}>
            {r.label}
          </span>
          <span style={{ color:'#d4d4d8', flex:1 }}>{r.op}</span>
          <span style={{ color: r.color, fontWeight:600 }}>→ {r.result}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── TRUST BOUNDARY diagram ─── */
function TrustBoundary() {
  return (
    <svg viewBox="0 0 440 160" fill="none" style={{width:'100%',display:'block'}}>
      {/* Browser zone */}
      <rect x="4" y="10" width="194" height="140" rx="10" stroke="#14b8a6" strokeWidth="1" strokeDasharray="4 3" fill="rgba(20,184,166,0.04)"/>
      <text x="14" y="28" fill="#14b8a6" fontSize="11" fontWeight="500" fontFamily="monospace">BROWSER (trusted)</text>
      <rect x="14" y="36" width="80" height="32" rx="5" fill="rgba(20,184,166,0.12)" stroke="#14b8a6" strokeWidth="0.8"/>
      <text x="54" y="55" fill="#5eead4" fontSize="11" textAnchor="middle" fontFamily="monospace">keygen</text>
      <rect x="106" y="36" width="80" height="32" rx="5" fill="rgba(20,184,166,0.12)" stroke="#14b8a6" strokeWidth="0.8"/>
      <text x="146" y="55" fill="#5eead4" fontSize="11" textAnchor="middle" fontFamily="monospace">encrypt</text>
      <rect x="14" y="82" width="172" height="32" rx="5" fill="rgba(20,184,166,0.08)" stroke="#14b8a6" strokeWidth="0.8"/>
      <text x="100" y="101" fill="#5eead4" fontSize="11" textAnchor="middle" fontFamily="monospace">decrypt (WASM)</text>

      {/* arrow right */}
      <line x1="200" y1="80" x2="236" y2="80" stroke="#71717a" strokeWidth="1" markerEnd="url(#aw)"/>
      <text x="218" y="73" fill="#52525b" fontSize="10" textAnchor="middle" fontFamily="monospace">ciphertext</text>

      {/* Server zone */}
      <rect x="238" y="10" width="194" height="140" rx="10" stroke="#8b5cf6" strokeWidth="1" strokeDasharray="4 3" fill="rgba(139,92,246,0.04)"/>
      <text x="248" y="28" fill="#8b5cf6" fontSize="11" fontWeight="500" fontFamily="monospace">SERVER (untrusted)</text>
      <rect x="248" y="36" width="80" height="32" rx="5" fill="rgba(139,92,246,0.12)" stroke="#8b5cf6" strokeWidth="0.8"/>
      <text x="288" y="55" fill="#c4b5fd" fontSize="11" textAnchor="middle" fontFamily="monospace">store ct</text>
      <rect x="340" y="36" width="80" height="32" rx="5" fill="rgba(139,92,246,0.12)" stroke="#8b5cf6" strokeWidth="0.8"/>
      <text x="380" y="55" fill="#c4b5fd" fontSize="11" textAnchor="middle" fontFamily="monospace">sum ct</text>
      <rect x="248" y="82" width="172" height="32" rx="5" fill="rgba(139,92,246,0.06)" stroke="#8b5cf6" strokeWidth="0.8" strokeDasharray="3 2"/>
      <text x="334" y="101" fill="#a78bfa" fontSize="11" textAnchor="middle" fontFamily="monospace">⛔ no plaintext</text>

      {/* arrow back */}
      <line x1="238" y1="124" x2="202" y2="124" stroke="#71717a" strokeWidth="1" markerEnd="url(#aw)"/>
      <text x="220" y="117" fill="#52525b" fontSize="10" textAnchor="middle" fontFamily="monospace">encrypted sum</text>

      <defs>
        <marker id="aw" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M2 2L8 5L2 8" fill="none" stroke="#71717a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </marker>
      </defs>
    </svg>
  );
}

/* ─── MAIN PAGE ─── */
export default function Landing() {
  const [heroVisible, setHeroVisible] = useState(false);
  useEffect(() => { setTimeout(() => setHeroVisible(true), 60); }, []);

  return (
    <div style={{
      minHeight:'100vh',
      background:'#09090b',
      color:'#f4f4f5',
      fontFamily:'"Inter", system-ui, sans-serif',
      overflowX:'hidden',
    }}>
      {/* ── HERO ── */}
      <section style={{
        position:'relative', minHeight:'100vh',
        display:'flex', flexDirection:'column', alignItems:'center',
        justifyContent:'center', padding:'80px 24px 40px',
        overflow:'hidden',
      }}>
        {/* ambient glow */}
        <div style={{
          position:'absolute', top:'20%', left:'50%', transform:'translateX(-50%)',
          width:600, height:400, borderRadius:'50%',
          background:'radial-gradient(ellipse, rgba(20,184,166,0.08) 0%, transparent 70%)',
          pointerEvents:'none',
        }}/>

        {/* nav */}
        <header className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800 bg-zinc-950/85 backdrop-blur-sm">
          <div className="max-w-5xl mx-auto h-16 px-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 group">
              <img src="/favicon-32x32.png" alt="CipherSpend logo" className="w-8 h-8 rounded-sm" />
              <span className="font-bold text-lg tracking-tight text-white group-hover:text-teal-300 transition-colors">CipherSpend</span>
            </Link>
            <div className="flex items-center gap-3">
              <Button asChild variant="outline" size="sm" className="border-zinc-700 text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm" className="bg-teal-500 hover:bg-teal-600 text-zinc-950 font-semibold">
                <Link to="/signup">Get started</Link>
              </Button>
            </div>
          </div>
        </header>

        {/* hero text */}
        <div style={{
          maxWidth:700, textAlign:'center', position:'relative', zIndex:1,
          opacity: heroVisible ? 1 : 0,
          transform: heroVisible ? 'translateY(0)' : 'translateY(20px)',
          transition:'opacity .6s, transform .6s',
        }}>
          <div style={{
            display:'inline-flex', alignItems:'center', gap:6,
            padding:'5px 14px', borderRadius:999,
            border:'1px solid rgba(20,184,166,0.25)', background:'rgba(20,184,166,0.07)',
            fontSize:12, color:'#14b8a6', fontWeight:500, marginBottom:28,
            letterSpacing:'0.04em',
          }}>
            <span style={{width:6,height:6,borderRadius:'50%',background:'#14b8a6',display:'inline-block'}}/>
            CKKS FULLY HOMOMORPHIC ENCRYPTION
          </div>

          <h1 style={{
            fontSize:'clamp(36px,6vw,72px)', fontWeight:800, lineHeight:1.1,
            letterSpacing:'-0.03em', margin:'0 0 24px',
          }}>
            Your expenses.<br/>
            <span style={{ color:'#14b8a6' }}>Encrypted</span>{' '}
            <span style={{ color:'#3f3f46' }}>always.</span>
          </h1>

          <p style={{
            fontSize:'clamp(15px,2vw,19px)', color:'#71717a', lineHeight:1.7,
            maxWidth:540, margin:'0 auto 40px',
          }}>
            CipherSpend tracks your finances using homomorphic encryption — the server computes your totals
            without ever reading a single amount.
          </p>

          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <Link to="/signup">
              <button style={{
                padding:'14px 32px', borderRadius:10, border:'none',
                background:'#0d9488', color:'#fff', fontSize:15, fontWeight:700,
                cursor:'pointer', letterSpacing:'-0.01em',
                boxShadow:'0 0 24px rgba(20,184,166,0.25)',
              }}>
                Create Secure Vault →
              </button>
            </Link>
            <Link to="/login">
              <button style={{
                padding:'14px 32px', borderRadius:10,
                border:'1px solid rgba(255,255,255,0.1)',
                background:'rgba(255,255,255,0.04)',
                color:'#d4d4d8', fontSize:15, cursor:'pointer',
              }}>
                Unlock Vault
              </button>
            </Link>
          </div>
        </div>

        {/* animated canvas strip */}
        <div style={{
          width:'100%', maxWidth:640, height:140, marginTop:64,
          position:'relative', zIndex:1,
          opacity: heroVisible ? 1 : 0, transition:'opacity 1s .3s',
        }}>
          {/* endpoint labels */}
          <div style={{
            position:'absolute', left:0, top:'50%', transform:'translateY(-50%)',
            display:'flex', flexDirection:'column', alignItems:'center', gap:4,
          }}>
            <div style={{ width:44, height:44, borderRadius:10, background:'rgba(20,184,166,0.1)',
              border:'1px solid rgba(20,184,166,0.3)',
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg viewBox="0 0 20 20" fill="none" style={{width:18,height:18}}>
                <rect x="2" y="4" width="16" height="12" rx="2" stroke="#14b8a6" strokeWidth="1.2"/>
                <path d="M6 16l8 0" stroke="#14b8a6" strokeWidth="1.2" strokeLinecap="round"/>
                <path d="M10 16v2" stroke="#14b8a6" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </div>
            <span style={{ fontSize:10, color:'#52525b', letterSpacing:'0.05em' }}>BROWSER</span>
          </div>

          <div style={{
            position:'absolute', right:0, top:'50%', transform:'translateY(-50%)',
            display:'flex', flexDirection:'column', alignItems:'center', gap:4,
          }}>
            <div style={{ width:44, height:44, borderRadius:10, background:'rgba(139,92,246,0.1)',
              border:'1px solid rgba(139,92,246,0.3)',
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg viewBox="0 0 20 20" fill="none" style={{width:18,height:18}}>
                <rect x="2" y="2" width="16" height="16" rx="3" stroke="#8b5cf6" strokeWidth="1.2"/>
                <path d="M6 7h8M6 10h5M6 13h6" stroke="#8b5cf6" strokeWidth="1" strokeLinecap="round" opacity=".6"/>
              </svg>
            </div>
            <span style={{ fontSize:10, color:'#52525b', letterSpacing:'0.05em' }}>SERVER</span>
          </div>

          <div style={{ position:'absolute', inset:'0 56px' }}>
            <SketchCanvas />
          </div>

          {/* floating labels on the packets */}
          <div style={{
            position:'absolute', top:'14%', left:'50%', transform:'translateX(-50%)',
            fontSize:10, color:'#14b8a6', fontFamily:'monospace', letterSpacing:'0.05em',
            pointerEvents:'none',
          }}>⟨ciphertext⟩</div>
          <div style={{
            position:'absolute', bottom:'14%', left:'50%', transform:'translateX(-50%)',
            fontSize:10, color:'#8b5cf6', fontFamily:'monospace', letterSpacing:'0.05em',
            pointerEvents:'none',
          }}>⟨encrypted sum⟩</div>
        </div>

        {/* scroll hint */}
        <div style={{
          position:'absolute', bottom:32, left:'50%', transform:'translateX(-50%)',
          display:'flex', flexDirection:'column', alignItems:'center', gap:4,
          opacity:.4, animation:'bounce 2s ease-in-out infinite',
        }}>
          <svg viewBox="0 0 16 24" fill="none" style={{width:14}}>
            <rect x="2" y="2" width="12" height="20" rx="6" stroke="#a1a1aa" strokeWidth="1"/>
            <circle cx="8" cy="8" r="2" fill="#a1a1aa">
              <animate attributeName="cy" values="8;14;8" dur="1.8s" repeatCount="indefinite"/>
            </circle>
          </svg>
          <span style={{ fontSize:10, color:'#71717a', letterSpacing:'0.06em' }}>SCROLL</span>
        </div>
      </section>

      {/* ── HOW IT WORKS – interactive stepper ── */}
      <section style={{ padding:'80px 24px', maxWidth:880, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:56 }}>
          <span style={{ fontSize:11, letterSpacing:'0.1em', color:'#14b8a6', fontWeight:600,
            textTransform:'uppercase' }}>How it works</span>
          <h2 style={{ fontSize:'clamp(28px,4vw,44px)', fontWeight:700, letterSpacing:'-0.02em',
            margin:'12px 0 0' }}>Three steps, zero visibility</h2>
        </div>

        <div style={{
          borderRadius:16, border:'1px solid rgba(255,255,255,0.07)',
          background:'#111113', overflow:'hidden',
        }}>
          <StepExplainer />
        </div>
      </section>

      {/* ── MATH SKETCH ── */}
      <section style={{ padding:'0 24px 80px', maxWidth:880, margin:'0 auto' }}>
        <div style={{
          display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px,1fr))', gap:20,
        }}>
          {/* FHE math card */}
          <div style={{
            borderRadius:14, border:'1px solid rgba(255,255,255,0.07)',
            background:'#111113', padding:'24px 24px 20px',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:18 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:'#14b8a6' }}/>
              <span style={{ fontSize:12, fontWeight:600, color:'#a1a1aa', letterSpacing:'0.05em',
                textTransform:'uppercase' }}>FHE arithmetic trace</span>
            </div>
            <FHESketch />
          </div>

          {/* trust boundary diagram */}
          <div style={{
            borderRadius:14, border:'1px solid rgba(255,255,255,0.07)',
            background:'#111113', padding:'24px 24px 20px',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:18 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:'#8b5cf6' }}/>
              <span style={{ fontSize:12, fontWeight:600, color:'#a1a1aa', letterSpacing:'0.05em',
                textTransform:'uppercase' }}>Trust boundary</span>
            </div>
            <TrustBoundary />
          </div>
        </div>
      </section>

      {/* ── FEATURE PILLS ── */}
      <section style={{ padding:'0 24px 80px', maxWidth:880, margin:'0 auto' }}>
        <div style={{
          display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px,1fr))', gap:14,
        }}>
          {[
            { icon:'🔑', title:'Passphrase-derived keys', sub:'PBKDF2 + AES-GCM, no server backdoor' },
            { icon:'🖥', title:'WASM in-browser crypto', sub:'node-seal runs SEAL in your tab' },
            { icon:'➕', title:'Homomorphic addition', sub:'CKKS scheme, scale 2⁴⁰' },
            { icon:'📤', title:'Encrypted CSV export', sub:'Decrypts locally before download' },
            { icon:'🌐', title:'Multi-currency', sub:'LKR, USD, EUR, GBP and more' },
            { icon:'🗂', title:'Category analytics', sub:'Blind aggregation per category' },
          ].map((f,i) => (
            <div key={i} style={{
              borderRadius:12, border:'1px solid rgba(255,255,255,0.06)',
              background:'#111113', padding:'18px 18px 14px',
              transition:'border-color .2s',
            }}
              onMouseEnter={e => (e.currentTarget.style.borderColor='rgba(255,255,255,0.14)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor='rgba(255,255,255,0.06)')}
            >
              <div style={{ fontSize:22, marginBottom:10 }}>{f.icon}</div>
              <p style={{ fontSize:13, fontWeight:600, color:'#e4e4e7', margin:'0 0 4px' }}>{f.title}</p>
              <p style={{ fontSize:12, color:'#52525b', margin:0, lineHeight:1.6 }}>{f.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{
        padding:'80px 24px', textAlign:'center',
        borderTop:'1px solid rgba(255,255,255,0.05)',
      }}>
        <h2 style={{ fontSize:'clamp(24px,4vw,38px)', fontWeight:700,
          letterSpacing:'-0.02em', margin:'0 0 16px' }}>
          Ready to take back your financial privacy?
        </h2>
        <p style={{ fontSize:15, color:'#71717a', marginBottom:36, maxWidth:420, margin:'0 auto 36px' }}>
          Your key never touches our servers. Your amounts never leave your device unencrypted.
        </p>
        <Link to="/signup">
          <button style={{
            padding:'16px 40px', borderRadius:12, border:'none',
            background:'#0d9488', color:'#fff', fontSize:16, fontWeight:700,
            cursor:'pointer', letterSpacing:'-0.01em',
            boxShadow:'0 0 32px rgba(20,184,166,0.3)',
          }}>
            Create your vault →
          </button>
        </Link>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        borderTop:'1px solid rgba(255,255,255,0.05)',
        padding:'24px', textAlign:'center',
        fontSize:12, color:'#3f3f46',
      }}>
        CipherSpend — client-side homomorphic encryption · CKKS · zero-knowledge storage
      </footer>

      <style>{`
        @keyframes bounce {
          0%,100%{transform:translateX(-50%) translateY(0)}
          50%{transform:translateX(-50%) translateY(8px)}
        }
      `}</style>
    </div>
  );
}

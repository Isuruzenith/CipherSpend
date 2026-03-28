import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCrypto } from '@/context/CryptoContext';
import { toast } from 'sonner';

/* ── tiny hex grid background ── */
function HexGrid() {
  return (
    <svg
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.035, pointerEvents: 'none' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="hex" x="0" y="0" width="56" height="48" patternUnits="userSpaceOnUse">
          <polygon points="28,2 52,14 52,38 28,50 4,38 4,14" fill="none" stroke="#14b8a6" strokeWidth="1"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hex)"/>
    </svg>
  );
}

/* ── animated ciphertext stream on one side ── */
const GLYPHS = '01アイウエオカキクケコABCDEF0123456789⊕⊗∑∫√≠≡';
function CipherStream({ col }: { col: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    const chars: string[] = Array.from({ length: 22 }, () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]);
    const interval = setInterval(() => {
      frame++;
      const idx = Math.floor(Math.random() * chars.length);
      chars[idx] = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      el.innerHTML = chars.map((c, i) => {
        const opacity = Math.max(0, 1 - Math.abs(i - (frame % chars.length)) / 6);
        const color = i === frame % chars.length ? '#14b8a6' : `rgba(20,184,166,${opacity * 0.25})`;
        return `<span style="color:${color};display:block;height:20px;font-size:12px;line-height:20px;transition:color .1s">${c}</span>`;
      }).join('');
    }, 80);
    return () => clearInterval(interval);
  }, []);
  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        top: 0,
        left: `${col}px`,
        fontFamily: 'monospace',
        writingMode: 'vertical-rl',
        userSelect: 'none',
        pointerEvents: 'none',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    />
  );
}

/* ── unlock animation steps ── */
const UNLOCK_STEPS = [
  'Deriving KEK via PBKDF2-SHA256…',
  'Fetching wrapped secret key…',
  'AES-GCM unwrapping key material…',
  'Initialising SEAL CKKS context…',
  'Vault unlocked ✓',
];

function UnlockProgress() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timers = UNLOCK_STEPS.map((_, i) =>
      setTimeout(() => setStep(i + 1), i * 700 + 300)
    );
    return () => timers.forEach(clearTimeout);
  }, []);
  return (
    <div style={{ marginTop: 24, fontFamily: 'monospace', fontSize: 11 }}>
      {UNLOCK_STEPS.map((s, i) => (
        <div
          key={i}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '5px 0',
            opacity: step > i ? 1 : 0.2,
            transition: 'opacity .4s',
            color: i === UNLOCK_STEPS.length - 1 && step > i ? '#14b8a6' : 'rgba(255,255,255,0.5)',
          }}
        >
          <span style={{ width: 12, textAlign: 'center' }}>
            {step > i ? (i === UNLOCK_STEPS.length - 1 ? '✓' : '▸') : '○'}
          </span>
          {s}
        </div>
      ))}
    </div>
  );
}

export default function LogIn() {
  const navigate = useNavigate();
  const { loginAndUnlockVault } = useCrypto();

  const [email, setEmail] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => { setTimeout(() => setMounted(true), 60); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      toast('Unlocking vault…', { description: 'Deriving KEK and unwrapping secret key.' });
      await loginAndUnlockVault(email, passphrase);
      toast.success('Vault unlocked!');
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Incorrect passphrase or unknown vault.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (name: string): React.CSSProperties => ({
    width: '100%',
    padding: '11px 14px',
    background: 'rgba(255,255,255,0.03)',
    border: `1px solid ${focused === name ? 'rgba(20,184,166,0.6)' : 'rgba(255,255,255,0.09)'}`,
    borderRadius: 8,
    color: '#f4f4f5',
    fontSize: 14,
    fontFamily: 'monospace',
    outline: 'none',
    transition: 'border-color .2s, box-shadow .2s',
    boxShadow: focused === name ? '0 0 0 3px rgba(20,184,166,0.08)' : 'none',
    boxSizing: 'border-box',
  });

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080a0c',
      display: 'flex',
      alignItems: 'stretch',
      fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <HexGrid />

      {/* cipher streams – decorative left/right edges */}
      {[20, 60, 100].map(c => <CipherStream key={c} col={c} />)}
      {[20, 60, 100].map(c => (
        <div key={`r${c}`} style={{ position: 'absolute', right: 0 }}>
          <CipherStream col={-c} />
        </div>
      ))}

      {/* left panel – decorative info */}
      <div style={{
        display: 'none',
        flex: '0 0 420px',
        padding: '48px 48px',
        flexDirection: 'column',
        justifyContent: 'center',
        borderRight: '1px solid rgba(255,255,255,0.05)',
        position: 'relative',
        zIndex: 1,
      }}
        className="login-left-panel"
      >
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
            <img src="/favicon-32x32.png" alt="CipherSpend logo" style={{ width: 24, height: 24, borderRadius: 4 }} />
            <span style={{ fontWeight: 700, fontSize: 15, color: '#f4f4f5', letterSpacing: '-0.01em' }}>
              CipherSpend
            </span>
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: '#f4f4f5', margin: '0 0 12px', letterSpacing: '-0.02em' }}>
            Your vault,<br />your keys.
          </h2>
          <p style={{ fontSize: 14, color: '#52525b', lineHeight: 1.7, margin: 0 }}>
            Passphrase-derived encryption means no one — including us — can read your financial data.
          </p>
        </div>

        {[
          { icon: '⚙', label: 'PBKDF2-SHA256', sub: '600 000 iterations key derivation' },
          { icon: '🔐', label: 'AES-256-GCM', sub: 'Secret key wrapped at rest' },
          { icon: '⚡', label: 'WASM in-browser', sub: 'Decrypt runs in your tab only' },
        ].map((item, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20,
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateX(0)' : 'translateX(-8px)',
            transition: `opacity .4s ${i * 0.1 + 0.2}s, transform .4s ${i * 0.1 + 0.2}s`,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: 'rgba(20,184,166,0.08)',
              border: '1px solid rgba(20,184,166,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, flexShrink: 0,
            }}>{item.icon}</div>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#d4d4d8' }}>{item.label}</p>
              <p style={{ margin: 0, fontSize: 12, color: '#3f3f46', lineHeight: 1.5 }}>{item.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* main form column */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '32px 24px', position: 'relative', zIndex: 1,
      }}>
        <div style={{
          width: '100%', maxWidth: 420,
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity .5s, transform .5s',
        }}>
          {/* brand mark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 40 }}>
            <img src="/favicon-32x32.png" alt="CipherSpend logo" style={{ width: 22, height: 22, borderRadius: 4 }} />
            <span style={{ fontWeight: 700, fontSize: 14, color: '#71717a', letterSpacing: '-0.01em' }}>
              CipherSpend
            </span>
          </div>

          {/* heading */}
          <div style={{ marginBottom: 32 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 6,
              background: 'rgba(20,184,166,0.07)',
              border: '1px solid rgba(20,184,166,0.2)',
              fontSize: 11, color: '#14b8a6', fontFamily: 'monospace',
              letterSpacing: '0.06em', marginBottom: 16,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#14b8a6', display: 'inline-block' }}/>
              VAULT AUTHENTICATION
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: '#f4f4f5', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
              Unlock your vault
            </h1>
            <p style={{ fontSize: 13, color: '#52525b', margin: 0, lineHeight: 1.6 }}>
              Enter your passphrase to decrypt your homomorphic keys in memory.
            </p>
          </div>

          {/* error */}
          {error && (
            <div style={{
              marginBottom: 20, padding: '11px 14px',
              background: 'rgba(239,68,68,0.07)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 8, fontSize: 13, color: '#f87171',
              display: 'flex', alignItems: 'flex-start', gap: 8,
            }}>
              <span style={{ marginTop: 1 }}>⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#a1a1aa',
                letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 7, fontFamily: 'monospace' }}>
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
                disabled={loading}
                placeholder="vault@example.com"
                style={inputStyle('email')}
                autoComplete="email"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#a1a1aa',
                letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 7, fontFamily: 'monospace' }}>
                Master passphrase
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={passphrase}
                  onChange={e => setPassphrase(e.target.value)}
                  onFocus={() => setFocused('pass')}
                  onBlur={() => setFocused(null)}
                  disabled={loading}
                  placeholder="••••••••••••••••"
                  style={{ ...inputStyle('pass'), paddingRight: 44 }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#52525b', fontSize: 14, padding: 4,
                    transition: 'color .15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#a1a1aa')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#52525b')}
                >
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '13px',
                background: loading ? 'rgba(20,184,166,0.3)' : '#0d9488',
                border: '1px solid rgba(20,184,166,0.4)',
                borderRadius: 9, color: '#fff',
                fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                letterSpacing: '-0.01em',
                transition: 'background .2s, box-shadow .2s, transform .1s',
                boxShadow: loading ? 'none' : '0 0 20px rgba(20,184,166,0.2)',
                marginTop: 4,
                position: 'relative', overflow: 'hidden',
              }}
              onMouseEnter={e => { if (!loading) (e.currentTarget.style.background = '#0f766e'); }}
              onMouseLeave={e => { if (!loading) (e.currentTarget.style.background = '#0d9488'); }}
              onMouseDown={e => { if (!loading) (e.currentTarget.style.transform = 'scale(0.98)'); }}
              onMouseUp={e => { (e.currentTarget.style.transform = 'scale(1)'); }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span style={{
                    width: 14, height: 14, borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff',
                    display: 'inline-block',
                    animation: 'spin .7s linear infinite',
                  }}/>
                  Unlocking…
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <svg viewBox="0 0 16 16" fill="none" style={{ width: 15, height: 15 }}>
                    <path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    <rect x="2" y="7" width="12" height="8" rx="2.5" fill="currentColor" opacity=".9"/>
                    <circle cx="8" cy="11" r="1.2" fill="#0d9488"/>
                  </svg>
                  Unlock Vault
                </span>
              )}
            </button>
          </form>

          {/* loading steps */}
          {loading && <UnlockProgress />}

          {/* footer link */}
          <p style={{ marginTop: 28, textAlign: 'center', fontSize: 13, color: '#3f3f46' }}>
            No vault yet?{' '}
            <Link to="/signup" style={{ color: '#14b8a6', textDecoration: 'none', fontWeight: 500 }}
              onMouseEnter={e => ((e.target as HTMLElement).style.textDecoration = 'underline')}
              onMouseLeave={e => ((e.target as HTMLElement).style.textDecoration = 'none')}
            >
              Create one →
            </Link>
          </p>

          {/* warning note */}
          <div style={{
            marginTop: 24, padding: '10px 12px',
            background: 'rgba(245,158,11,0.04)',
            border: '1px solid rgba(245,158,11,0.12)',
            borderRadius: 8, fontSize: 11, color: '#78716c',
            fontFamily: 'monospace', lineHeight: 1.6,
          }}>
            ⚠ Passphrase is unrecoverable by design. Keep it safe.
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (min-width: 860px) {
          .login-left-panel { display: flex !important; }
        }
      `}</style>
    </div>
  );
}

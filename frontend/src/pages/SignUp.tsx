import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCrypto } from '@/context/CryptoContext';
import { toast } from 'sonner';

/* ── animated circuit grid background ── */
function CircuitGrid() {
  return (
    <svg
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.04, pointerEvents: 'none' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="circuit" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
          <path d="M0 40 H30 M50 40 H80 M40 0 V30 M40 50 V80" stroke="#14b8a6" strokeWidth="0.6" fill="none"/>
          <circle cx="40" cy="40" r="3.5" fill="none" stroke="#14b8a6" strokeWidth="0.6"/>
          <circle cx="0"  cy="40" r="2" fill="#14b8a6" opacity="0.5"/>
          <circle cx="80" cy="40" r="2" fill="#14b8a6" opacity="0.5"/>
          <circle cx="40" cy="0"  r="2" fill="#14b8a6" opacity="0.5"/>
          <circle cx="40" cy="80" r="2" fill="#14b8a6" opacity="0.5"/>
          <rect x="15" y="15" width="12" height="8" rx="2" fill="none" stroke="#14b8a6" strokeWidth="0.5" opacity="0.5"/>
          <rect x="55" y="55" width="12" height="8" rx="2" fill="none" stroke="#14b8a6" strokeWidth="0.5" opacity="0.5"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#circuit)"/>
    </svg>
  );
}

/* ── key generation animation ── */
const KEYGEN_STEPS = [
  'Initialising node-seal WASM module…',
  'Building CKKS encryption context…',
  'Poly modulus degree: 8192',
  'Generating public key…',
  'Generating secret key…',
  'Generating relin / Galois keys…',
  'Deriving KEK via PBKDF2-SHA256…',
  'Wrapping secret key with AES-GCM…',
  'Uploading wrapped key to server…',
  'Vault sealed ✓',
];

function KeyGenProgress() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timers = KEYGEN_STEPS.map((_, i) =>
      setTimeout(() => setStep(i + 1), i * 500 + 200)
    );
    return () => timers.forEach(clearTimeout);
  }, []);
  return (
    <div style={{ marginTop: 20, fontFamily: 'monospace', fontSize: 11 }}>
      <div style={{
        height: 3, borderRadius: 2,
        background: 'rgba(255,255,255,0.06)',
        marginBottom: 14, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', borderRadius: 2,
          background: 'linear-gradient(90deg, #0d9488, #14b8a6)',
          width: `${(step / KEYGEN_STEPS.length) * 100}%`,
          transition: 'width .5s ease',
        }}/>
      </div>
      {KEYGEN_STEPS.map((s, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '4px 0',
          opacity: step > i ? 1 : 0.15,
          transition: 'opacity .3s',
          color: i === KEYGEN_STEPS.length - 1 && step > i ? '#14b8a6' : 'rgba(255,255,255,0.45)',
        }}>
          <span style={{ width: 12, textAlign: 'center', fontSize: 10 }}>
            {step > i ? (i === KEYGEN_STEPS.length - 1 ? '✓' : '▸') : '·'}
          </span>
          {s}
        </div>
      ))}
    </div>
  );
}

/* ── passphrase entropy meter ── */
function entropyScore(p: string): { score: number; label: string; color: string; tips: string[] } {
  if (!p) return { score: 0, label: '', color: 'transparent', tips: [] };
  let score = 0;
  const tips: string[] = [];
  if (p.length >= 12) score += 1; else tips.push('Use 12+ characters');
  if (p.length >= 20) score += 1;
  if (/[A-Z]/.test(p)) score += 1; else tips.push('Add uppercase letters');
  if (/[0-9]/.test(p)) score += 1; else tips.push('Add numbers');
  if (/[^A-Za-z0-9]/.test(p)) score += 1; else tips.push('Add symbols (!, @, #…)');
  if (p.length >= 16 && score >= 4) score += 1;

  const levels = [
    { score: 1, label: 'Very weak',  color: '#ef4444' },
    { score: 2, label: 'Weak',       color: '#f97316' },
    { score: 3, label: 'Fair',       color: '#eab308' },
    { score: 4, label: 'Strong',     color: '#22c55e' },
    { score: 5, label: 'Very strong',color: '#14b8a6' },
    { score: 6, label: 'Excellent',  color: '#14b8a6' },
  ];
  const level = levels[Math.min(score - 1, levels.length - 1)] ?? { label: '', color: 'transparent' };
  return { score, label: level.label, color: level.color, tips };
}

function StrengthMeter({ passphrase }: { passphrase: string }) {
  const { score, label, color, tips } = entropyScore(passphrase);
  if (!passphrase) return null;
  const pct = Math.min((score / 6) * 100, 100);
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 2,
          background: color,
          width: `${pct}%`,
          transition: 'width .3s, background .3s',
        }}/>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
        <span style={{ fontSize: 11, color, fontFamily: 'monospace', transition: 'color .3s' }}>{label}</span>
        {tips[0] && <span style={{ fontSize: 11, color: '#3f3f46', fontFamily: 'monospace' }}>{tips[0]}</span>}
      </div>
    </div>
  );
}

/* ── floating key icon that animates while generating ── */
function VaultIcon({ generating }: { generating: boolean }) {
  return (
    <div style={{
      width: 52, height: 52, borderRadius: 14,
      background: 'rgba(20,184,166,0.08)',
      border: `1px solid ${generating ? '#14b8a6' : 'rgba(20,184,166,0.25)'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'border-color .3s, box-shadow .3s',
      boxShadow: generating ? '0 0 20px rgba(20,184,166,0.2)' : 'none',
      animation: generating ? 'pulse 1.5s ease-in-out infinite' : 'none',
    }}>
      <svg viewBox="0 0 24 24" fill="none" style={{ width: 24, height: 24 }}>
        <path d="M12 2C9.2 2 7 4.2 7 7v2" stroke="#14b8a6" strokeWidth="1.6" strokeLinecap="round"/>
        <rect x="3" y="9" width="18" height="13" rx="3" fill="rgba(20,184,166,0.1)" stroke="#14b8a6" strokeWidth="1.4"/>
        <circle cx="12" cy="15.5" r="2" fill="#14b8a6"/>
        <path d="M12 15.5v2.5" stroke="#14b8a6" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    </div>
  );
}

export default function SignUp() {
  const navigate = useNavigate();
  const { registerAndGenerateVault } = useCrypto();

  const [email, setEmail] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => { setTimeout(() => setMounted(true), 60); }, []);

  const { score } = entropyScore(passphrase);
  const confirmMatch = confirm.length > 0 && confirm === passphrase;
  const confirmMismatch = confirm.length > 0 && confirm !== passphrase;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passphrase !== confirm) { setError('Passphrases do not match.'); return; }
    if (score < 3) { setError('Please choose a stronger passphrase.'); return; }
    setLoading(true);
    setError('');
    try {
      toast('Generating secure vault…', { description: 'This uses WASM and may take a few seconds.' });
      await registerAndGenerateVault(email, passphrase);
      toast.success('Vault created!');
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to create vault.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (name: string, extra?: React.CSSProperties): React.CSSProperties => ({
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
    ...extra,
  });

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080a0c',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
      position: 'relative',
      overflow: 'hidden',
      padding: '32px 24px',
    }}>
      <CircuitGrid />

      {/* ambient teal glow */}
      <div style={{
        position: 'absolute', top: '30%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(13,148,136,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }}/>

      <div style={{
        width: '100%', maxWidth: 440,
        position: 'relative', zIndex: 1,
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(16px)',
        transition: 'opacity .5s, transform .5s',
      }}>
        {/* brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 36 }}>
          <img src="/favicon-32x32.png" alt="CipherSpend logo" style={{ width: 22, height: 22, borderRadius: 4 }} />
          <span style={{ fontWeight: 700, fontSize: 14, color: '#71717a', letterSpacing: '-0.01em' }}>
            CipherSpend
          </span>
        </div>

        {/* card */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16,
          padding: '32px 32px 28px',
          backdropFilter: 'blur(8px)',
        }}>
          {/* header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
            <div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 6,
                background: 'rgba(20,184,166,0.07)',
                border: '1px solid rgba(20,184,166,0.2)',
                fontSize: 11, color: '#14b8a6', fontFamily: 'monospace',
                letterSpacing: '0.06em', marginBottom: 14,
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#14b8a6', display: 'inline-block' }}/>
                NEW VAULT
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f4f4f5', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                Create secure vault
              </h1>
              <p style={{ fontSize: 13, color: '#52525b', margin: 0, lineHeight: 1.6 }}>
                Your passphrase derives the key that seals your CKKS secret key.
              </p>
            </div>
            <VaultIcon generating={loading} />
          </div>

          {/* error */}
          {error && (
            <div style={{
              marginBottom: 18, padding: '10px 13px',
              background: 'rgba(239,68,68,0.07)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 8, fontSize: 13, color: '#f87171',
              display: 'flex', gap: 8,
            }}>
              <span>⚠</span><span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* email */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#71717a',
                letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 7, fontFamily: 'monospace' }}>
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
                disabled={loading}
                placeholder="you@example.com"
                style={inputStyle('email')}
                autoComplete="email"
              />
            </div>

            {/* passphrase */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#71717a',
                letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 7, fontFamily: 'monospace' }}>
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
                  placeholder="Choose a strong passphrase"
                  style={{ ...inputStyle('pass'), paddingRight: 44 }}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#52525b', fontSize: 13, padding: 4,
                  }}
                >
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
              <StrengthMeter passphrase={passphrase} />
            </div>

            {/* confirm */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#71717a',
                letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 7, fontFamily: 'monospace' }}>
                Confirm passphrase
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  onFocus={() => setFocused('confirm')}
                  onBlur={() => setFocused(null)}
                  disabled={loading}
                  placeholder="Re-enter passphrase"
                  style={{
                    ...inputStyle('confirm', { paddingRight: 44 }),
                    border: confirmMismatch
                      ? '1px solid rgba(239,68,68,0.5)'
                      : confirmMatch
                        ? '1px solid rgba(20,184,166,0.5)'
                        : inputStyle('confirm').border,
                  }}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#52525b', fontSize: 13, padding: 4,
                  }}
                >
                  {showConfirm ? '🙈' : '👁'}
                </button>
                {confirmMatch && (
                  <span style={{
                    position: 'absolute', right: 38, top: '50%', transform: 'translateY(-50%)',
                    color: '#14b8a6', fontSize: 12,
                  }}>✓</span>
                )}
              </div>
              {confirmMismatch && (
                <p style={{ fontSize: 11, color: '#f87171', fontFamily: 'monospace', margin: '5px 0 0' }}>
                  Passphrases do not match
                </p>
              )}
            </div>

            {/* submit */}
            <button
              type="submit"
              disabled={loading || confirmMismatch}
              style={{
                width: '100%', padding: '13px',
                background: loading || confirmMismatch ? 'rgba(20,184,166,0.2)' : '#0d9488',
                border: '1px solid rgba(20,184,166,0.35)',
                borderRadius: 9, color: '#fff',
                fontSize: 14, fontWeight: 700,
                cursor: loading || confirmMismatch ? 'not-allowed' : 'pointer',
                letterSpacing: '-0.01em',
                transition: 'background .2s, box-shadow .2s, transform .1s',
                boxShadow: (!loading && !confirmMismatch) ? '0 0 20px rgba(20,184,166,0.18)' : 'none',
                marginTop: 6,
              }}
              onMouseEnter={e => { if (!loading && !confirmMismatch) (e.currentTarget.style.background = '#0f766e'); }}
              onMouseLeave={e => { if (!loading && !confirmMismatch) (e.currentTarget.style.background = '#0d9488'); }}
              onMouseDown={e => { if (!loading) (e.currentTarget.style.transform = 'scale(0.98)'); }}
              onMouseUp={e => { (e.currentTarget.style.transform = 'scale(1)'); }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span style={{
                    width: 14, height: 14, borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff', display: 'inline-block',
                    animation: 'spin .7s linear infinite',
                  }}/>
                  Generating FHE keys…
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <svg viewBox="0 0 16 16" fill="none" style={{ width: 15, height: 15 }}>
                    <rect x="1" y="1" width="14" height="14" rx="3.5" fill="none" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M5 8l2.5 2.5L11 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Create Vault
                </span>
              )}
            </button>
          </form>

          {/* keygen progress */}
          {loading && <KeyGenProgress />}
        </div>

        {/* warning */}
        <div style={{
          marginTop: 16, padding: '10px 14px',
          background: 'rgba(245,158,11,0.04)',
          border: '1px solid rgba(245,158,11,0.1)',
          borderRadius: 8, fontSize: 11, color: '#78716c',
          fontFamily: 'monospace', lineHeight: 1.7,
          display: 'flex', gap: 8,
        }}>
          <span>⚠</span>
          <span>
            Your passphrase <strong style={{ color: '#92400e' }}>cannot be recovered</strong> by CipherSpend.
            If lost, your encrypted data is permanently inaccessible.
          </span>
        </div>

        {/* footer */}
        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: '#3f3f46' }}>
          Already have a vault?{' '}
          <Link to="/login" style={{ color: '#14b8a6', textDecoration: 'none', fontWeight: 500 }}
            onMouseEnter={e => ((e.target as HTMLElement).style.textDecoration = 'underline')}
            onMouseLeave={e => ((e.target as HTMLElement).style.textDecoration = 'none')}
          >
            Unlock it →
          </Link>
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%,100%{ box-shadow: 0 0 0 0 rgba(20,184,166,0.2); }
          50%{ box-shadow: 0 0 20px 4px rgba(20,184,166,0.15); }
        }
      `}</style>
    </div>
  );
}

"use client";
export const dynamic = 'force-dynamic';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();
  const [gaugePercent, setGaugePercent] = useState(0);
  const [gaugeValue, setGaugeValue] = useState('0%');
  const [gaugeSub, setGaugeSub] = useState('$0 / $200');
  const [chip1, setChip1] = useState('$0.42');
  const [chip2, setChip2] = useState('84,291');
  const [chip3, setChip3] = useState('OpenAI');
  const [heroEmail, setHeroEmail] = useState('');
  const [ctaEmail, setCtaEmail] = useState('');
  const [heroSuccess, setHeroSuccess] = useState(false);
  const [ctaSuccess, setCtaSuccess] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  const cursorRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const rxRef = useRef(0);
  const ryRef = useRef(0);
  const mxRef = useRef(0);
  const myRef = useRef(0);
  const arcRef = useRef<SVGPathElement>(null);
  const needleRef = useRef<SVGLineElement>(null);

  // Cursor
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ('ontouchstart' in window) {
      if (cursorRef.current) cursorRef.current.style.display = 'none';
      if (ringRef.current) ringRef.current.style.display = 'none';
      return;
    }
    const onMove = (e: MouseEvent) => {
      mxRef.current = e.clientX;
      myRef.current = e.clientY;
      if (cursorRef.current) {
        cursorRef.current.style.left = e.clientX - 4 + 'px';
        cursorRef.current.style.top = e.clientY - 4 + 'px';
      }
    };
    document.addEventListener('mousemove', onMove);
    let raf: number;
    const animateRing = () => {
      rxRef.current += (mxRef.current - rxRef.current) * 0.12;
      ryRef.current += (myRef.current - ryRef.current) * 0.12;
      if (ringRef.current) {
        ringRef.current.style.left = rxRef.current + 'px';
        ringRef.current.style.top = ryRef.current + 'px';
      }
      raf = requestAnimationFrame(animateRing);
    };
    animateRing();
    return () => { document.removeEventListener('mousemove', onMove); cancelAnimationFrame(raf); };
  }, []);

  // Nav scroll
  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Gauge animation
  useEffect(() => {
    const target = 67;
    const totalDash = 520;
    const timer = setTimeout(() => {
      if (arcRef.current) {
        const offset = totalDash - (totalDash * target / 100);
        arcRef.current.style.strokeDashoffset = String(offset);
        arcRef.current.style.stroke = target > 80 ? '#FF3B30' : target > 50 ? '#FF9500' : '#30D158';
        arcRef.current.style.transition = 'stroke-dashoffset 2s cubic-bezier(0.4,0,0.2,1), stroke 1s ease';
      }
      if (needleRef.current) {
        const angle = -130 + (target / 100) * 260;
        needleRef.current.style.transform = `rotate(${angle}deg)`;
        needleRef.current.style.transition = 'transform 2s cubic-bezier(0.4,0,0.2,1)';
      }
      let current = 0;
      const interval = setInterval(() => {
        current += 2;
        if (current >= target) { current = target; clearInterval(interval); }
        setGaugeValue(current + '%');
        setGaugeSub('$' + ((current / 100) * 200).toFixed(0) + ' / $200');
        setGaugePercent(current);
      }, 30);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  // Chip cycling
  useEffect(() => {
    const providers = ['OpenAI', 'Anthropic', 'Gemini', 'Groq', 'NVIDIA'];
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % providers.length;
      setChip3(providers[idx]);
      setChip1('$' + (Math.random() * 2).toFixed(2));
      setChip2(Math.floor(50000 + Math.random() * 100000).toLocaleString());
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Intersection observer for fade-up
  useEffect(() => {
    const els = document.querySelectorAll('.fu');
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('fv'); });
    }, { threshold: 0.1 });
    els.forEach(el => obs.observe(el));
    setTimeout(() => {
      document.querySelectorAll('.hero-fu').forEach(el => el.classList.add('fv'));
    }, 100);
    return () => obs.disconnect();
  }, []);

  const handleSignup = (e: React.FormEvent, which: 'hero' | 'cta') => {
    e.preventDefault();
    const email = which === 'hero' ? heroEmail : ctaEmail;
    try {
      const stored = JSON.parse(localStorage.getItem('waitlist') || '[]');
      stored.push({ email, ts: new Date().toISOString() });
      localStorage.setItem('waitlist', JSON.stringify(stored));
    } catch {}
    if (which === 'hero') setHeroSuccess(true);
    else setCtaSuccess(true);
  };

  const s = {
    page: { background: '#080808', color: '#f0f0f0', fontFamily: "'DM Sans', sans-serif", overflowX: 'hidden' as const, cursor: 'none' },
    nav: { position: 'fixed' as const, top: 0, left: 0, right: 0, zIndex: 50, padding: '20px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.3s', ...(navScrolled ? { borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(8,8,8,0.9)', backdropFilter: 'blur(20px)' } : {}) },
    logoWrap: { display: 'flex', alignItems: 'center', gap: '10px' },
    logoDot: { width: '8px', height: '8px', borderRadius: '50%', background: '#FF3B30', animation: 'pulseDot 2s ease-in-out infinite' },
    logoText: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '24px', letterSpacing: '0.05em', color: '#f0f0f0' },
    navLinks: { display: 'flex', alignItems: 'center', gap: '32px', listStyle: 'none' },
    navLink: { fontFamily: "'DM Mono', monospace", fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#666', textDecoration: 'none', cursor: 'none' },
    navCta: { fontFamily: "'DM Mono', monospace", fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' as const, background: '#FF3B30', color: 'white', border: 'none', padding: '10px 20px', cursor: 'none' },
    hero: { minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center', padding: '120px 40px 80px', gap: '80px', maxWidth: '1400px', margin: '0 auto', position: 'relative' as const },
    tag: { fontFamily: "'DM Mono', monospace", fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#FF3B30', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' },
    h1: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(64px, 7vw, 96px)', lineHeight: '0.95', letterSpacing: '0.02em', marginBottom: '32px' },
    sub: { fontSize: '16px', lineHeight: '1.7', color: '#999', maxWidth: '440px', marginBottom: '48px', fontWeight: 300 },
    btnPrimary: { fontFamily: "'DM Mono', monospace", fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase' as const, background: '#FF3B30', color: 'white', border: 'none', padding: '16px 32px', cursor: 'none' },
    btnGhost: { fontFamily: "'DM Mono', monospace", fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase' as const, background: 'transparent', color: '#666', border: '1px solid rgba(255,255,255,0.06)', padding: '16px 32px', cursor: 'none', textDecoration: 'none', display: 'inline-block' },
    input: { background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.08)', color: '#f0f0f0', padding: '16px 20px', fontFamily: "'DM Mono', monospace", fontSize: '12px', letterSpacing: '0.05em', outline: 'none', flex: 1 },
    proofRow: { marginTop: '48px', display: 'flex', alignItems: 'center', gap: '24px' },
    proofItem: { fontFamily: "'DM Mono', monospace", fontSize: '10px', letterSpacing: '0.1em', color: '#555', textTransform: 'uppercase' as const, display: 'flex', alignItems: 'center', gap: '6px' },
    gaugeWrap: { position: 'relative' as const, width: '420px', height: '420px' },
    gaugeBgGlow: { position: 'absolute' as const, inset: '-40px', background: 'radial-gradient(circle, rgba(255,59,48,0.06) 0%, transparent 70%)', borderRadius: '50%', animation: 'glowPulse 4s ease-in-out infinite' },
    gaugeCenter: { position: 'absolute' as const, inset: 0, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', paddingTop: '30px' },
    gaugeVal: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '64px', letterSpacing: '0.02em', lineHeight: '1', color: '#FF3B30' },
    gaugeLbl: { fontFamily: "'DM Mono', monospace", fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#666', marginTop: '8px' },
    gaugeSb: { fontFamily: "'DM Mono', monospace", fontSize: '12px', color: '#444', marginTop: '4px' },
    chip: { position: 'absolute' as const, background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.06)', padding: '10px 14px', fontFamily: "'DM Mono', monospace" },
    chipLbl: { fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: '#555', marginBottom: '3px' },
    chipVal: { fontSize: '14px', fontWeight: 500 },
    sectionTag: { fontFamily: "'DM Mono', monospace", fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#555', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' },
    sectionH: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(48px, 5vw, 72px)', lineHeight: '1', letterSpacing: '0.02em', marginBottom: '64px' },
    grid1: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.06)' },
    card: { background: '#080808', padding: '40px', position: 'relative' as const, overflow: 'hidden' },
    stepGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.06)', marginTop: '64px' },
    step: { background: '#0f0f0f', padding: '40px 32px' },
    pricingGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginTop: '64px' },
    pCard: { border: '1px solid rgba(255,255,255,0.06)', padding: '40px', position: 'relative' as const },
    pCardFeat: { border: '1px solid #FF3B30', padding: '40px', position: 'relative' as const, background: 'linear-gradient(135deg, rgba(255,59,48,0.05), transparent)' },
    pCta: { width: '100%', fontFamily: "'DM Mono', monospace", fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase' as const, padding: '14px', border: '1px solid rgba(255,255,255,0.06)', background: 'transparent', color: '#f0f0f0', cursor: 'none' },
    pCtaFeat: { width: '100%', fontFamily: "'DM Mono', monospace", fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase' as const, padding: '14px', border: '1px solid #FF3B30', background: '#FF3B30', color: 'white', cursor: 'none' },
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@300;400;500&family=DM+Sans:wght@300;400;500&display=swap');
        @keyframes pulseDot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.7)} }
        @keyframes glowPulse { 0%,100%{opacity:0.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.05)} }
        @keyframes float0 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes float1 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes tickerScroll { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        .ticker-inner { display:flex; gap:64px; white-space:nowrap; animation:tickerScroll 20s linear infinite; }
        .fu { opacity:0; transform:translateY(24px); transition:opacity 0.7s ease, transform 0.7s ease; }
        .fv { opacity:1; transform:translateY(0); }
        .hero-fu { opacity:0; transform:translateY(24px); transition:opacity 0.7s ease, transform 0.7s ease; }
        a { color: inherit; }
        button:hover { opacity: 0.9; }
        @media (prefers-reduced-motion: reduce) {
          .ticker-inner { animation:none; }
          .fu,.hero-fu { transition:none; }
        }
        @media (max-width: 900px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .hero-right { display: none !important; }
          .pain-grid, .step-grid, .pricing-grid, .proof-grid { grid-template-columns: 1fr !important; }
          nav { padding: 16px 24px !important; }
          .nav-links-wrap { display: none !important; }
          .section-inner { padding: 80px 24px !important; }
        }
      `}</style>

      <div style={s.page}>
        {/* Cursor */}
        <div ref={cursorRef} style={{ position: 'fixed', width: '8px', height: '8px', background: '#FF3B30', borderRadius: '50%', pointerEvents: 'none', zIndex: 9999, mixBlendMode: 'difference' }} />
        <div ref={ringRef} style={{ position: 'fixed', width: '32px', height: '32px', border: '1px solid rgba(255,59,48,0.4)', borderRadius: '50%', pointerEvents: 'none', zIndex: 9998, transform: 'translate(-50%,-50%)' }} />

        {/* Grain */}
        <div style={{ position: 'fixed', inset: 0, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`, opacity: 0.025, pointerEvents: 'none', zIndex: 100 }} />

        {/* NAV */}
        <nav style={s.nav}>
          <div style={s.logoWrap}>
            <div style={s.logoDot} />
            <span style={s.logoText}>BURN RATE</span>
          </div>
          <ul className="nav-links-wrap" style={s.navLinks}>
            <li><a href="#how" style={s.navLink}>How it works</a></li>
            <li><a href="#pricing" style={s.navLink}>Pricing</a></li>
            <li><a href="#proof" style={s.navLink}>Stories</a></li>
          </ul>
          <button style={s.navCta} onClick={() => router.push('/auth/signup')}>
            Start Free Trial
          </button>
        </nav>

        {/* HERO */}
        <section style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)', backgroundSize: '60px 60px', pointerEvents: 'none' }} />
          <div className="hero-grid" style={s.hero}>
            <div className="hero-fu" style={{ position: 'relative', zIndex: 2, transitionDelay: '0.1s' }}>
              <div style={s.tag}>
                <span style={{ display: 'block', width: '24px', height: '1px', background: '#FF3B30' }} />
                Real-time API cost intelligence
              </div>
              <h1 style={s.h1}>
                <span>YOU&apos;RE<br />BURNING</span><br />
                <span style={{ color: '#FF3B30' }}>MONEY.</span>
              </h1>
              <p style={s.sub}>
                Your OpenAI, Anthropic, and Groq bills are growing and{' '}
                <strong style={{ color: '#f0f0f0', fontWeight: 500 }}>you have no idea why</strong>.
                Burn Rate watches every token, every dollar, every spike — and kills compromised keys before they drain your account.
              </p>

              {!heroSuccess ? (
                <form onSubmit={e => handleSignup(e, 'hero')} style={{ display: 'flex', gap: 0, maxWidth: '420px' }}>
                  <input type="email" required placeholder="dev@yourcompany.com" value={heroEmail}
                    onChange={e => setHeroEmail(e.target.value)} style={{ ...s.input, borderRight: 'none' }} />
                  <button type="submit" style={s.btnPrimary}>Start Free</button>
                </form>
              ) : (
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: '12px', color: '#30D158', letterSpacing: '0.1em' }}>
                  LOCKED IN. WE WILL HIT YOU WHEN WE LAUNCH.
                </p>
              )}

              <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
                <button style={s.btnGhost} onClick={() => router.push('/auth/login')}>Sign In</button>
                <a href="#how" style={s.btnGhost}>See how it works</a>
              </div>

              <div style={s.proofRow}>
                {['No credit card required', '7-day free trial', 'Cancel anytime'].map(t => (
                  <div key={t} style={s.proofItem}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#30D158', display: 'inline-block' }} />
                    {t}
                  </div>
                ))}
              </div>
            </div>

            <div className="hero-right hero-fu" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', transitionDelay: '0.3s' }}>
              <div style={s.gaugeWrap}>
                <div style={s.gaugeBgGlow} />
                <svg width="420" height="420" viewBox="0 0 420 420">
                  <circle cx="210" cy="210" r="185" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                  <path d="M 55 280 A 165 165 0 1 1 365 280" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="16" strokeLinecap="round" />
                  <path ref={arcRef} d="M 55 280 A 165 165 0 1 1 365 280" fill="none" stroke="#FF3B30" strokeWidth="16" strokeLinecap="round" strokeDasharray="520" strokeDashoffset="520" />
                  <path d="M 55 280 A 165 165 0 0 1 120 100" fill="none" stroke="#30D158" strokeWidth="4" strokeLinecap="round" opacity="0.3" />
                  <path d="M 120 100 A 165 165 0 0 1 300 100" fill="none" stroke="#FF9500" strokeWidth="4" strokeLinecap="round" opacity="0.3" />
                  <path d="M 300 100 A 165 165 0 0 1 365 280" fill="none" stroke="#FF3B30" strokeWidth="4" strokeLinecap="round" opacity="0.3" />
                  <line ref={needleRef} x1="210" y1="210" x2="210" y2="60" stroke="#FF3B30" strokeWidth="2" strokeLinecap="round"
                    style={{ transformOrigin: '210px 210px', transform: 'rotate(-130deg)' }} />
                  <circle cx="210" cy="210" r="8" fill="#FF3B30" />
                  <circle cx="210" cy="210" r="4" fill="#080808" />
                  <text x="48" y="310" fill="#444" fontFamily="'DM Mono',monospace" fontSize="10" letterSpacing="1">$0</text>
                  <text x="355" y="310" fill="#444" fontFamily="'DM Mono',monospace" fontSize="10" letterSpacing="1">MAX</text>
                  <text x="175" y="52" fill="#444" fontFamily="'DM Mono',monospace" fontSize="10" letterSpacing="1">BURN</text>
                </svg>
                <div style={s.gaugeCenter}>
                  <div style={s.gaugeVal}>{gaugeValue}</div>
                  <div style={s.gaugeLbl}>Budget Used</div>
                  <div style={s.gaugeSb}>{gaugeSub}</div>
                </div>
                <div style={{ ...s.chip, top: '10%', right: '-10%', animation: 'float0 6s ease-in-out infinite' }}>
                  <div style={s.chipLbl}>Last Hour</div>
                  <div style={{ ...s.chipVal, color: '#FF9500' }}>{chip1}</div>
                </div>
                <div style={{ ...s.chip, bottom: '20%', right: '-5%', animation: 'float1 6s ease-in-out infinite 1.5s' }}>
                  <div style={s.chipLbl}>Tokens</div>
                  <div style={{ ...s.chipVal, color: '#30D158' }}>{chip2}</div>
                </div>
                <div style={{ ...s.chip, bottom: '10%', left: '-8%', animation: 'float0 6s ease-in-out infinite 3s' }}>
                  <div style={s.chipLbl}>Provider</div>
                  <div style={{ ...s.chipVal, color: '#0A84FF' }}>{chip3}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TICKER */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', padding: '12px 0', background: '#0f0f0f' }}>
          <div className="ticker-inner">
            {[...Array(2)].map((_, ri) => (
              ['OpenAI GPT-4o +$0.015/1K', 'Anthropic Claude +$0.003/1K', 'Google Gemini -$0.0001/1K', 'Groq Llama -$0.0006/1K', 'NVIDIA NIM +$0.00077/1K', 'Avg Bill Shock +$847', 'Keys Leaked on GitHub +50,000'].map((item, i) => (
                <div key={`${ri}-${i}`} style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#444', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <span style={{ color: item.includes('-') ? '#30D158' : '#FF3B30' }}>{item}</span>
                </div>
              ))
            ))}
          </div>
        </div>

        {/* PAIN */}
        <section id="pain" className="section-inner" style={{ padding: '120px 40px', maxWidth: '1400px', margin: '0 auto' }}>
          <div style={s.sectionTag}><span style={{ display: 'block', width: '16px', height: '1px', background: '#555' }} />The problem</div>
          <h2 className="fu" style={s.sectionH}>DEVELOPERS<br />GET BURNED.</h2>
          <div className="pain-grid" style={s.grid1}>
            {[
              { num: '01', icon: '🔑', title: 'LEAKED KEYS COST THOUSANDS', desc: 'One key accidentally pushed to GitHub. Someone finds it in minutes. By morning, you have a $2,000 bill for requests you never made.', amount: 'AVG LOSS: $847 PER INCIDENT', delay: '0s' },
              { num: '02', icon: '📈', title: 'SURPRISE BILLS END PROJECTS', desc: "You're building in dev mode. A loop runs overnight. You wake up to a $500 charge and a cancelled side project. No warning. No way to stop it.", amount: '50,000+ KEYS LEAKED ON GITHUB', delay: '0.1s' },
              { num: '03', icon: '🌑', title: 'ZERO VISIBILITY BY DEFAULT', desc: "Every AI provider gives you a bill at the end of the month. Not a live gauge. Not an alert. Not a kill switch. Just a number — and it's too late.", amount: 'NO REAL-TIME TOOL UNDER $39/MO', delay: '0.2s' },
            ].map(p => (
              <div key={p.num} className="fu" style={{ ...s.card, transitionDelay: p.delay }}>
                <span style={{ fontSize: '24px', marginBottom: '20px', display: 'block' }}>{p.icon}</span>
                <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '28px', letterSpacing: '0.02em', marginBottom: '12px', lineHeight: '1.1' }}>{p.title}</h3>
                <p style={{ fontSize: '14px', lineHeight: '1.7', color: '#555', fontWeight: 300 }}>{p.desc}</p>
                <div style={{ marginTop: '20px', fontFamily: "'DM Mono', monospace", fontSize: '11px', color: '#FF3B30', letterSpacing: '0.1em' }}>{p.amount}</div>
              </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" style={{ padding: '120px 40px', background: '#0f0f0f', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <div style={s.sectionTag}><span style={{ display: 'block', width: '16px', height: '1px', background: '#555' }} />The solution</div>
            <h2 className="fu" style={s.sectionH}>BUILT FOR<br />DEVELOPERS.</h2>
            <div className="step-grid" style={s.stepGrid}>
              {[
                { n: '01', title: 'ADD YOUR KEYS', desc: 'Paste your API keys. We encrypt them with AES-256. Your keys never leave our vault unencrypted.' },
                { n: '02', title: 'WE POLL YOUR USAGE', desc: 'Every 10 minutes we pull your usage from OpenAI and Anthropic. Google, Groq, and NVIDIA via our 1-line SDK wrapper.' },
                { n: '03', title: 'GET ALERTED INSTANTLY', desc: 'Hourly spikes. Unusual patterns. Budget thresholds. You get notified before the damage is done.' },
                { n: '04', title: 'KILL SWITCH READY', desc: 'One tap deactivates any compromised key instantly. Direct links to revoke at every provider. Damage contained.' },
              ].map((step, i) => (
                <div key={step.n} className="fu" style={{ ...s.step, transitionDelay: `${i * 0.1}s` }}>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '48px', color: 'rgba(255,59,48,0.15)', lineHeight: '1', marginBottom: '20px' }}>{step.n}</div>
                  <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '22px', letterSpacing: '0.02em', marginBottom: '10px' }}>{step.title}</h3>
                  <p style={{ fontSize: '13px', lineHeight: '1.7', color: '#555', fontWeight: 300 }}>{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="section-inner" style={{ padding: '120px 40px', maxWidth: '1400px', margin: '0 auto' }}>
          <div style={s.sectionTag}><span style={{ display: 'block', width: '16px', height: '1px', background: '#555' }} />Pricing</div>
          <h2 className="fu" style={s.sectionH}>NO SURPRISES<br />HERE EITHER.</h2>
          <div className="pricing-grid" style={s.pricingGrid}>
            {[
              { plan: 'Starter', price: 'FREE', per: '/ 7 days', desc: 'Everything you need to see if you are on fire.', features: ['3 API keys', 'Real-time dashboard', 'Hourly spike alerts', '30-day history', 'Kill switch'], cta: 'Start Free Trial', featured: false, delay: '0s' },
              { plan: 'Pro', price: '$5', per: '/ month', desc: 'For developers who ship and do not want surprises.', features: ['10 API keys', 'All 5 providers', 'SDK for Groq, Google, NVIDIA', 'Anomaly detection', 'Emergency key revocation', 'Budget projections', '90-day history'], cta: 'Get Started — $5/mo', featured: true, delay: '0.1s' },
              { plan: 'Team', price: '$29', per: '/ month', desc: 'For teams building AI products at scale.', features: ['Unlimited keys', 'Multi-user access', 'Slack alerts', '1-year history', 'White-label reports', 'Priority support'], cta: 'Contact Us', featured: false, delay: '0.2s' },
            ].map(p => (
              <div key={p.plan} className="fu" style={{ ...(p.featured ? s.pCardFeat : s.pCard), transitionDelay: p.delay }}>
                {p.featured && (
                  <div style={{ position: 'absolute', top: '-1px', left: '24px', background: '#FF3B30', fontFamily: "'DM Mono', monospace", fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '4px 10px', color: 'white' }}>Most Popular</div>
                )}
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#555', marginBottom: '16px' }}>{p.plan}</div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '64px', lineHeight: '1', marginBottom: '4px', letterSpacing: '0.02em' }}>
                  {p.price} <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '14px', color: '#555' }}>{p.per}</span>
                </div>
                <p style={{ fontSize: '13px', color: '#555', marginBottom: '32px', fontWeight: 300 }}>{p.desc}</p>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                  {p.features.map(f => (
                    <li key={f} style={{ fontFamily: "'DM Mono', monospace", fontSize: '12px', color: '#666', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ width: '4px', height: '4px', background: '#30D158', borderRadius: '50%', flexShrink: 0, display: 'inline-block' }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <button style={p.featured ? s.pCtaFeat : s.pCta} onClick={() => router.push('/auth/signup')}>
                  {p.cta}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* PROOF */}
        <section id="proof" className="section-inner" style={{ padding: '120px 40px', maxWidth: '1400px', margin: '0 auto' }}>
          <div style={s.sectionTag}><span style={{ display: 'block', width: '16px', height: '1px', background: '#555' }} />Developer stories</div>
          <h2 className="fu" style={s.sectionH}>THEY LEARNED<br />THE HARD WAY.</h2>
          <div className="proof-grid" style={s.grid1}>
            {[
              { quote: 'Woke up to a $1,350 OpenAI bill. A loop in my code ran all night. No alert, no warning. I would have paid $60/year for something to have texted me.', highlight: '$1,350 OpenAI bill', author: 'indie developer, San Francisco', amount: '$1,350 SURPRISE BILL', delay: '0s' },
              { quote: 'Pushed my .env to a public repo by accident. Key was stolen in 4 minutes. $800 in fraudulent charges before I noticed. There was no kill switch.', highlight: 'Key was stolen in 4 minutes', author: 'backend engineer, London', amount: '$800 IN 4 MINUTES', delay: '0.1s' },
              { quote: 'I had no idea Gemini was eating 40% of my budget on a model I forgot to switch. Burn Rate showed me in the first 5 minutes.', highlight: '40% of my budget', author: 'ML engineer, Berlin', amount: '40% WASTED SPEND FOUND', delay: '0.2s' },
            ].map(p => (
              <div key={p.author} className="fu" style={{ ...s.card, transitionDelay: p.delay }}>
                <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#777', marginBottom: '24px', fontWeight: 300, fontStyle: 'italic' }}>
                  {p.quote.split(p.highlight).map((part, i, arr) => (
                    <span key={i}>{part}{i < arr.length - 1 && <strong style={{ color: '#f0f0f0', fontStyle: 'normal', fontWeight: 500 }}>{p.highlight}</strong>}</span>
                  ))}
                </p>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#444' }}>{p.author}</div>
                <span style={{ display: 'inline-block', marginTop: '12px', background: 'rgba(255,59,48,0.1)', border: '1px solid rgba(255,59,48,0.2)', color: '#FF3B30', fontFamily: "'DM Mono', monospace", fontSize: '10px', letterSpacing: '0.1em', padding: '4px 10px' }}>{p.amount}</span>
              </div>
            ))}
          </div>
        </section>

        {/* FINAL CTA */}
        <section style={{ padding: '160px 40px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(255,59,48,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <h2 className="fu" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(64px, 8vw, 120px)', lineHeight: '0.95', letterSpacing: '0.02em', marginBottom: '32px', position: 'relative' }}>
            KNOW YOUR<br /><span style={{ color: '#FF3B30' }}>BURN RATE.</span>
          </h2>
          <p className="fu" style={{ fontSize: '16px', color: '#555', marginBottom: '48px', fontWeight: 300, position: 'relative', transitionDelay: '0.1s' }}>
            7-day free trial. No credit card. Cancel anytime.
          </p>
          {!ctaSuccess ? (
            <form className="fu" onSubmit={e => handleSignup(e, 'cta')} style={{ display: 'inline-flex', gap: 0, transitionDelay: '0.2s', position: 'relative' }}>
              <input type="email" required placeholder="dev@yourcompany.com" value={ctaEmail}
                onChange={e => setCtaEmail(e.target.value)}
                style={{ ...s.input, width: '280px', borderRight: 'none', padding: '18px 24px' }} />
              <button type="submit" style={{ ...s.btnPrimary, fontSize: '12px', padding: '18px 32px' }}>
                Start Free
              </button>
            </form>
          ) : (
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: '13px', color: '#30D158', letterSpacing: '0.15em' }}>
              LOCKED IN. WE WILL HIT YOU WHEN WE LAUNCH.
            </p>
          )}
        </section>

        {/* FOOTER */}
        <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '20px', letterSpacing: '0.05em', color: '#333' }}>BURN RATE</div>
          <ul style={{ display: 'flex', gap: '24px', listStyle: 'none' }}>
            {['Privacy', 'Terms', 'Docs'].map(l => (
              <li key={l}><a href="#" style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#333', textDecoration: 'none' }}>{l}</a></li>
            ))}
          </ul>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', letterSpacing: '0.1em', color: '#222' }}>2026 Burn Rate Labs</div>
        </footer>
      </div>
    </>
  );
}
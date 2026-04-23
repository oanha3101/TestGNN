import { ArrowRight, BrainCircuit, GitMerge, BarChart3, Users, Zap, Shield } from 'lucide-react'

type LandingPageProps = {
  onGetStarted: () => void
}

const features = [
  {
    icon: BrainCircuit,
    title: 'Multi-Model GNN Engine',
    desc: 'Train GCN, GAT, GraphSAGE, and GraphTransformer models with real-time telemetry and live loss curves.',
    color: '#6a5fc1',
  },
  {
    icon: GitMerge,
    title: 'Interactive Graph Canvas',
    desc: 'Visualize neural propagation, edit nodes/edges, and inspect attention weights on an interactive Sigma.js canvas.',
    color: '#c2ef4e',
  },
  {
    icon: BarChart3,
    title: 'Training Dashboard',
    desc: 'Live epoch metrics, accuracy benchmarks, F1 scores, and model comparison tables updated in real time.',
    color: '#ffb287',
  },
  {
    icon: Users,
    title: 'Community Platform',
    desc: 'Share training runs, publish insights, and collaborate with researchers across the STYM network.',
    color: '#fa7faa',
  },
  {
    icon: Zap,
    title: 'GNNExplainer Built-in',
    desc: 'One-click subgraph explainability with edge saliency overlay and adjustable importance threshold.',
    color: '#c2ef4e',
  },
  {
    icon: Shield,
    title: 'Role-Based Access',
    desc: 'Secure multi-tenant architecture with user/admin roles, session management, and audit-ready vault storage.',
    color: '#6a5fc1',
  },
]

const stats = [
  { value: '4', label: 'GNN Architectures' },
  { value: '3', label: 'Layout Algorithms' },
  { value: '∞', label: 'Custom Datasets' },
  { value: '100%', label: 'Open Source' },
]

export function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="landing-root">
      {/* Ambient background */}
      <div className="landing-glow landing-glow-a" />
      <div className="landing-glow landing-glow-b" />
      <div className="landing-glow landing-glow-c" />

      {/* ── Nav ──────────────────────────────────────────── */}
      <nav className="landing-nav">
        <div className="landing-brand">
          <div className="brand-mark">G</div>
          <span className="landing-brand-name">GNN Neural Platform</span>
        </div>
        <button className="landing-nav-btn" onClick={onGetStarted}>
          Sign In <ArrowRight size={14} />
        </button>
      </nav>

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="landing-hero">
        <div className="landing-badge">
          <span className="landing-badge-dot" />
          Graph Neural Networks · Research Platform
        </div>

        <h1 className="landing-h1">
          Train, Inspect &amp;{' '}
          <span className="landing-h1-accent">Visualize</span>
          <br />
          Graph Neural Networks
        </h1>

        <p className="landing-subtitle">
          An end-to-end research platform for building, training, and explaining GNN models —
          with real-time graph visualization, community sharing, and role-based collaboration.
        </p>

        <div className="landing-hero-actions">
          <button className="landing-cta-primary" onClick={onGetStarted}>
            Get Started <ArrowRight size={18} />
          </button>
          <a
            className="landing-cta-ghost"
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            View on GitHub
          </a>
        </div>

        {/* Floating graph preview */}
        <div className="landing-graph-preview" aria-hidden="true">
          <div className="lgp-node lgp-n1" />
          <div className="lgp-node lgp-n2" />
          <div className="lgp-node lgp-n3" />
          <div className="lgp-node lgp-n4" />
          <div className="lgp-node lgp-n5" />
          <svg className="lgp-edges" viewBox="0 0 320 200" fill="none">
            <line x1="160" y1="100" x2="80" y2="50"  stroke="#6a5fc1" strokeWidth="1.5" strokeOpacity=".6" />
            <line x1="160" y1="100" x2="240" y2="50" stroke="#6a5fc1" strokeWidth="1.5" strokeOpacity=".6" />
            <line x1="160" y1="100" x2="60"  y2="160" stroke="#c2ef4e" strokeWidth="2"   strokeOpacity=".5" />
            <line x1="160" y1="100" x2="260" y2="160" stroke="#c2ef4e" strokeWidth="1.5" strokeOpacity=".4" />
            <line x1="80"  y1="50"  x2="240" y2="50"  stroke="#fa7faa" strokeWidth="1"   strokeOpacity=".3" />
          </svg>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────── */}
      <section className="landing-stats">
        {stats.map((s) => (
          <div key={s.label} className="landing-stat">
            <span className="landing-stat-value">{s.value}</span>
            <span className="landing-stat-label">{s.label}</span>
          </div>
        ))}
      </section>

      {/* ── Features ──────────────────────────────────────── */}
      <section className="landing-features">
        <div className="landing-section-label">Platform Capabilities</div>
        <h2 className="landing-section-h2">Everything you need to do GNN research</h2>

        <div className="landing-features-grid">
          {features.map((f) => {
            const Icon = f.icon
            return (
              <article key={f.title} className="landing-feature-card">
                <div className="landing-feature-icon" style={{ background: `${f.color}22`, border: `1px solid ${f.color}55` }}>
                  <Icon size={22} style={{ color: f.color }} />
                </div>
                <h3 className="landing-feature-title">{f.title}</h3>
                <p className="landing-feature-desc">{f.desc}</p>
              </article>
            )
          })}
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────── */}
      <section className="landing-cta-banner">
        <div className="landing-cta-banner-inner">
          <h2 className="landing-cta-banner-h2">Ready to start training?</h2>
          <p className="landing-cta-banner-sub">
            Create a free account and run your first GNN experiment in under 2 minutes.
          </p>
          <button className="landing-cta-primary landing-cta-xl" onClick={onGetStarted}>
            Get Started — It's Free <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="landing-brand">
          <div className="brand-mark" style={{ width: '1.6rem', height: '1.6rem', fontSize: '0.8rem' }}>G</div>
          <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>GNN Neural Platform © 2025</span>
        </div>
        <span style={{ fontSize: '0.7rem', opacity: 0.35, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Built for researchers
        </span>
      </footer>
    </div>
  )
}

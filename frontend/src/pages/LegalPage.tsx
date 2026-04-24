import { ArrowLeft } from 'lucide-react'

type LegalKind = 'terms' | 'privacy'

type LegalPageProps = {
  kind: LegalKind
  onBack: () => void
}

const TERMS_SECTIONS: Array<{ title: string; body: string[] }> = [
  {
    title: '1. Acceptance of terms',
    body: [
      'By creating an account on the GNN Visualization Platform ("GNN-VP", "the Service") you agree to these Terms of Service and the accompanying Privacy Policy. If you do not agree, do not register or use the Service.',
    ],
  },
  {
    title: '2. Account eligibility',
    body: [
      'You must be at least 16 years old and capable of entering into a binding contract to use the Service. You are responsible for keeping your credentials confidential and for all activity that occurs under your account.',
    ],
  },
  {
    title: '3. Acceptable use',
    body: [
      'You agree to use the Service only for lawful research, educational, or personal analysis purposes. You will not upload datasets that contain personal data without consent, attempt to exfiltrate other users\' data, or disrupt the platform or its underlying infrastructure.',
      'You retain ownership of datasets, graphs, and training artefacts you upload. You grant GNN-VP a limited, revocable license to store and process them solely to provide the Service to you.',
    ],
  },
  {
    title: '4. Service availability',
    body: [
      'GNN-VP is provided on an as-is, as-available basis. We do not guarantee uptime, specific training performance, or that model outputs will be free of errors. You should validate any research conclusions with independent tools.',
    ],
  },
  {
    title: '5. Termination',
    body: [
      'We may suspend or terminate your account if you breach these Terms or use the platform in a way that harms other users or our infrastructure. You may close your account at any time; once closed, associated datasets and training runs may be deleted after a short retention window.',
    ],
  },
  {
    title: '6. Changes',
    body: [
      'We may update these Terms as the platform evolves. We will post the updated version on this page and, where changes are material, notify you via email or in-app banner before the changes take effect.',
    ],
  },
]

const PRIVACY_SECTIONS: Array<{ title: string; body: string[] }> = [
  {
    title: '1. What we collect',
    body: [
      'Account data: email, display name, and (hashed) password.',
      'Usage data: training runs you create, datasets you upload, posts and bookmarks you make, and timestamps of key events.',
      'Technical data: IP address and user-agent, used for rate limiting and audit logs.',
    ],
  },
  {
    title: '2. How we use it',
    body: [
      'We use your data to operate the Service — to authenticate you, run training jobs on your behalf, show your content to the community channels you choose, and to investigate abuse or technical issues.',
      'We do not sell your data. We do not use your data to train third-party models.',
    ],
  },
  {
    title: '3. Security',
    body: [
      'Passwords are stored only as bcrypt hashes. Reset tokens are stored only as SHA-256 hashes and expire within the configured window. Access to the production database is limited to the platform operators.',
    ],
  },
  {
    title: '4. Your rights',
    body: [
      'You can edit your profile and delete posts at any time. You can request export or deletion of all your data by emailing the platform administrator listed in the repository README. We will act on such requests within 30 days.',
    ],
  },
  {
    title: '5. Cookies and local storage',
    body: [
      'The frontend stores a JWT and your theme preference in browser local storage. These are used only to keep you signed in and to restore your preferred appearance. No third-party analytics or advertising cookies are set.',
    ],
  },
  {
    title: '6. Contact',
    body: [
      'For questions about this policy or your data, contact the platform administrator listed in the repository README.',
    ],
  },
]

export function LegalPage({ kind, onBack }: LegalPageProps) {
  const title = kind === 'terms' ? 'Terms of Service' : 'Privacy Policy'
  const intro =
    kind === 'terms'
      ? 'The agreement between you and the GNN Visualization Platform. Please read these terms before creating an account or using the workspace.'
      : 'How the GNN Visualization Platform collects, uses, and safeguards the information you provide while using the workspace.'
  const sections = kind === 'terms' ? TERMS_SECTIONS : PRIVACY_SECTIONS
  const updated = 'April 2026'

  return (
    <div className="legal-page">
      <div className="landing-glow landing-glow-a" />
      <div className="landing-glow landing-glow-b" />

      <button className="auth-back-btn" onClick={onBack}>
        <ArrowLeft size={16} /> Back
      </button>

      <article className="legal-container">
        <header className="legal-header">
          <div className="auth-logo-row">
            <div className="brand-mark auth-brand-mark">G</div>
            <span className="auth-brand-label">GNN Neural Platform</span>
          </div>
          <h1>{title}</h1>
          <p className="legal-meta">Last updated · {updated}</p>
          <p className="legal-intro">{intro}</p>
        </header>

        <div className="legal-body">
          {sections.map((section) => (
            <section key={section.title} className="legal-section">
              <h2>{section.title}</h2>
              {section.body.map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </section>
          ))}
        </div>
      </article>
    </div>
  )
}

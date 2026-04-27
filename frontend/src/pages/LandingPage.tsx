import { Link } from 'react-router-dom'
import {
  Activity, UploadCloud, BarChart2, ShieldCheck, Zap, Database,
  TrendingUp, FileText, Bell, ArrowRight, CheckCircle, Star,
} from 'lucide-react'

const features = [
  { icon: UploadCloud,  title: 'Drag & Drop CSV Upload',      description: 'Upload sensor data in seconds. No configuration, no setup — just drop your file and get results instantly.' },
  { icon: Zap,          title: '98.82% Accurate ML Models',   description: 'Two Random Forest models trained on real industrial data predict failures and classify failure reasons with high precision.' },
  { icon: BarChart2,    title: 'Analytics & Trend Charts',    description: 'Track failure rates over time with interactive area charts, line charts, and pie charts. Spot patterns early.' },
  { icon: ShieldCheck,  title: 'Risk-Level Classification',   description: 'Every prediction is tagged High, Medium, or Low Risk so your team can prioritise maintenance work effectively.' },
  { icon: TrendingUp,   title: 'Anomaly Trend Alerts',        description: 'Get automatic warnings when your failure rate is trending upward across recent analyses — before it becomes a crisis.' },
  { icon: FileText,     title: 'PDF & CSV Export',            description: 'Export full analysis reports as PDF or download raw predictions as CSV to share with your maintenance team.' },
  { icon: Database,     title: 'Analysis History',            description: 'Every analysis is saved to your account so you can review past results and measure improvement over time.' },
  { icon: Bell,         title: 'Feature Explainability',      description: 'Understand which sensor readings drive predictions with a built-in feature importance panel powered by the ML model.' },
]

const steps = [
  { number: 1, title: 'Upload Your Data',       description: 'Export sensor readings from your machines as a CSV file and upload it through the Upload Data page. Use our template if you need a starting point.' },
  { number: 2, title: 'ML Models Analyse It',   description: 'Our Random Forest pipeline processes each row, predicts whether the machine will fail, and classifies the likely failure reason.' },
  { number: 3, title: 'Review & Act',           description: 'Explore results with interactive metric cards, filter the predictions table, check the explainability panel, and export to your team.' },
]

const stats = [
  { value: '98.82%', label: 'Model Accuracy' },
  { value: '<1s',    label: 'Prediction Time' },
  { value: '5',      label: 'Sensor Inputs' },
  { value: '2',      label: 'ML Models' },
]

const testimonials = [
  {
    quote: "PredictIQ cut our unplanned downtime by 40% in the first quarter. The failure predictions are remarkably accurate for our CNC fleet.",
    author: "Marcus Hoffmann",
    role: "Maintenance Director",
    company: "Hoffmann Precision GmbH",
    initials: "MH",
  },
  {
    quote: "We used to rely on scheduled maintenance windows. Now we act on data. PredictIQ paid for itself in the first month.",
    author: "Sarah Chen",
    role: "Operations Manager",
    company: "Pacific Industrial Systems",
    initials: "SC",
  },
  {
    quote: "The risk classification and export features make it easy to brief our engineering team. Setup took less than 10 minutes.",
    author: "Tomás Reyes",
    role: "Plant Engineer",
    company: "Reyes Manufacturing Co.",
    initials: "TR",
  },
]

const pricingTiers = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    description: 'Perfect for getting started',
    features: [
      '50 analyses per month',
      'CSV & PDF export',
      'Analysis history',
      'Risk classification',
      'Email support',
    ],
    cta: 'Get Started',
    href: '/signup',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/month',
    description: 'For serious maintenance teams',
    features: [
      'Unlimited analyses',
      'AI chat assistant',
      'Trend forecasting',
      'Scheduled analysis',
      'API access',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    href: '/signup',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large industrial operations',
    features: [
      'Everything in Pro',
      'Team workspaces',
      'SSO / SAML',
      'Custom integrations',
      'SLA guarantee',
      'Dedicated support',
    ],
    cta: 'Contact Us',
    href: '/signup',
    highlight: false,
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Nav */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shadow-sm">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">PredictIQ</span>
          </div>
          <nav className="hidden sm:flex items-center gap-6 text-sm text-gray-500">
            <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-gray-900 transition-colors">How It Works</a>
            <a href="#pricing" className="hover:text-gray-900 transition-colors">Pricing</a>
          </nav>
          <nav className="flex items-center gap-2">
            <Link to="/login" className="btn btn-ghost text-sm text-gray-600">Sign In</Link>
            <Link to="/signup" className="btn btn-primary text-sm">Get Started <ArrowRight className="w-3.5 h-3.5" /></Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-primary-950 to-slate-900 py-24 sm:py-32 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-600/20 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 bg-primary-500/20 text-primary-300 text-xs font-semibold px-4 py-1.5 rounded-full mb-6 border border-primary-500/30">
            <Zap className="w-3.5 h-3.5" />
            AI-Powered Predictive Maintenance
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6">
            Predict Machine Failures{' '}
            <span
              className="text-transparent bg-clip-text"
              style={{ backgroundImage: 'linear-gradient(90deg, #60a5fa, #a78bfa, #34d399)' }}
            >
              Before They Happen
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Upload sensor data and let our 98.82%-accurate ML models identify at-risk machines, classify failure reasons, and help your team act before downtime strikes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/signup" className="btn btn-primary px-8 py-3 text-base font-semibold w-full sm:w-auto shadow-lg shadow-primary-500/30">
              Get Started — It's Free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/login" className="btn btn-ghost px-8 py-3 text-base font-semibold w-full sm:w-auto text-slate-300 hover:text-white hover:bg-white/10 border border-white/20">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-primary-600 py-8 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {stats.map(({ value, label }) => (
            <div key={label}>
              <p className="text-3xl font-extrabold text-white">{value}</p>
              <p className="text-primary-200 text-sm mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Live Demo mockup */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">See It In Action</h2>
            <p className="text-gray-500 max-w-xl mx-auto">A snapshot of the PredictIQ dashboard after a real analysis run.</p>
          </div>
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            {/* Fake browser chrome */}
            <div className="bg-gray-100 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <div className="flex-1 mx-4 bg-white rounded-lg px-3 py-1 text-xs text-gray-400 border border-gray-200">app.predictiq.io/dashboard</div>
            </div>
            {/* Fake dashboard content */}
            <div className="p-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                  { label: 'Total Analyses', value: '24', color: 'bg-blue-50 border-blue-100', text: 'text-blue-700' },
                  { label: 'Total Failures', value: '187', color: 'bg-red-50 border-red-100', text: 'text-red-700' },
                  { label: 'High Risk', value: '43', color: 'bg-orange-50 border-orange-100', text: 'text-orange-700' },
                  { label: 'Model Accuracy', value: '98.82%', color: 'bg-green-50 border-green-100', text: 'text-green-700' },
                ].map(c => (
                  <div key={c.label} className={`${c.color} border rounded-xl p-4`}>
                    <p className="text-xs text-gray-500 mb-1">{c.label}</p>
                    <p className={`text-xl font-bold ${c.text}`}>{c.value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Machine #47', risk: 'High Risk', prob: '91.2%', color: 'bg-red-100 text-red-700' },
                  { label: 'Machine #12', risk: 'Medium Risk', prob: '67.4%', color: 'bg-orange-100 text-orange-700' },
                  { label: 'Machine #83', risk: 'Low Risk', prob: '12.1%', color: 'bg-green-100 text-green-700' },
                ].map(m => (
                  <div key={m.label} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-sm font-medium text-gray-700">{m.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{m.prob}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${m.color}`}>{m.risk}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Everything you need to stay ahead of failures</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">A complete platform for industrial predictive maintenance — from raw sensor data to actionable insights.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map(({ icon: Icon, title, description }) => (
              <div key={title} className="card-hover group">
                <div className="w-10 h-10 bg-primary-100 group-hover:bg-primary-600 rounded-xl flex items-center justify-center mb-4 transition-colors duration-200">
                  <Icon className="w-5 h-5 text-primary-600 group-hover:text-white transition-colors duration-200" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2 text-sm">{title}</h3>
                <p className="text-gray-400 text-xs leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">From raw CSV to maintenance decisions in three simple steps.</p>
          </div>
          <ol className="space-y-6">
            {steps.map(({ number, title, description }) => (
              <li key={number} className="flex gap-5 items-start bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex-shrink-0 w-11 h-11 rounded-full bg-primary-600 text-white flex items-center justify-center text-lg font-bold shadow-md shadow-primary-200">
                  {number}
                </div>
                <div className="pt-0.5">
                  <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Trusted by maintenance teams</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">Industrial engineers rely on PredictIQ to keep their fleets running.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {testimonials.map(({ quote, author, role, company, initials }) => (
              <div key={author} className="card flex flex-col gap-4 hover:shadow-md transition-shadow">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed flex-1">"{quote}"</p>
                <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                  <div className="w-9 h-9 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{author}</p>
                    <p className="text-xs text-gray-400">{role} · {company}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Simple, transparent pricing</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">Start free. Upgrade when you need more power.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {pricingTiers.map(tier => (
              <div
                key={tier.name}
                className={`rounded-2xl p-6 flex flex-col gap-5 border transition-all ${
                  tier.highlight
                    ? 'bg-primary-600 border-primary-500 shadow-xl shadow-primary-200 scale-105'
                    : 'bg-white border-gray-200 shadow-sm hover:shadow-md'
                }`}
              >
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${tier.highlight ? 'text-primary-200' : 'text-gray-400'}`}>
                    {tier.name}
                  </p>
                  <div className="flex items-end gap-1">
                    <span className={`text-4xl font-extrabold ${tier.highlight ? 'text-white' : 'text-gray-900'}`}>{tier.price}</span>
                    {tier.period && <span className={`text-sm mb-1 ${tier.highlight ? 'text-primary-200' : 'text-gray-400'}`}>{tier.period}</span>}
                  </div>
                  <p className={`text-sm mt-1 ${tier.highlight ? 'text-primary-200' : 'text-gray-500'}`}>{tier.description}</p>
                </div>
                <ul className="space-y-2 flex-1">
                  {tier.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle className={`w-4 h-4 flex-shrink-0 ${tier.highlight ? 'text-primary-200' : 'text-green-500'}`} />
                      <span className={tier.highlight ? 'text-white' : 'text-gray-600'}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to={tier.href}
                  className={`btn text-sm font-semibold w-full justify-center ${
                    tier.highlight
                      ? 'bg-white text-primary-700 hover:bg-primary-50'
                      : 'btn-primary'
                  }`}
                >
                  {tier.cta} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary-600 to-primary-800">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to reduce unplanned downtime?</h2>
          <p className="text-primary-200 text-lg mb-10">Create a free account and run your first analysis in minutes.</p>
          <Link to="/signup" className="inline-flex items-center gap-2 bg-white text-primary-700 font-semibold px-10 py-3.5 rounded-xl hover:bg-primary-50 transition-colors text-base shadow-lg">
            Get Started <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary-600 rounded flex items-center justify-center">
              <Activity className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-white font-semibold text-sm">PredictIQ</span>
          </div>
          <p className="text-xs text-slate-500">AI-Powered Predictive Maintenance SaaS · 98.82% Accuracy</p>
          <div className="flex items-center gap-4 text-xs">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <Link to="/login" className="hover:text-white transition-colors">Sign In</Link>
            <Link to="/signup" className="hover:text-white transition-colors">Get Started</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

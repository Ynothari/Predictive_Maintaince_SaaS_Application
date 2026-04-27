import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Upload, BarChart2, History, X, ChevronRight } from 'lucide-react'

const STEPS = [
  {
    icon: Upload,
    title: 'Upload your CSV',
    description: 'Go to the Upload page and drop in your machine sensor data CSV. Our AI will analyze every row for failure risk.',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    icon: BarChart2,
    title: 'View predictions',
    description: 'After analysis, see a full breakdown: failure probabilities, risk levels, failure reasons, and actionable recommendations.',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
  },
  {
    icon: History,
    title: 'Track history',
    description: 'Every analysis is saved. Visit the History page to review past runs, add notes, and monitor trends over time.',
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
]

export default function OnboardingTour() {
  const { user }    = useAuth()
  const storageKey  = `onboarding_done_${user?.username}`

  const [step, setStep] = useState(0)

  // Don't show if already completed or no user
  if (!user || localStorage.getItem(storageKey)) return null

  const complete = () => {
    localStorage.setItem(storageKey, '1')
    // Force re-render by navigating to same page — simplest approach
    window.location.reload()
  }

  const skip = () => complete()

  const current = STEPS[step]
  const Icon    = current.icon
  const isLast  = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8 animate-slide-up relative">
        {/* Skip */}
        <button
          onClick={skip}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
          aria-label="Skip tour"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Step indicator */}
        <div className="flex items-center gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? 'w-6 bg-primary-600' : i < step ? 'w-3 bg-primary-300' : 'w-3 bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Icon */}
        <div className={`w-14 h-14 ${current.bg} rounded-2xl flex items-center justify-center mb-5`}>
          <Icon className={`w-7 h-7 ${current.color}`} />
        </div>

        {/* Content */}
        <h2 className="text-xl font-bold text-gray-900 mb-2">{current.title}</h2>
        <p className="text-gray-500 text-sm leading-relaxed mb-8">{current.description}</p>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button onClick={skip} className="text-sm text-gray-400 hover:text-gray-600">
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} className="btn btn-secondary text-sm">
                Back
              </button>
            )}
            {isLast ? (
              <button onClick={complete} className="btn btn-primary text-sm">
                Get Started
              </button>
            ) : (
              <button onClick={() => setStep(s => s + 1)} className="btn btn-primary text-sm">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

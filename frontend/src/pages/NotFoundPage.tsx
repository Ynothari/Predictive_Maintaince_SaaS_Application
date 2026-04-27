import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Activity } from 'lucide-react'

export default function NotFoundPage() {
  const { isAuthenticated } = useAuth()
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Activity className="w-8 h-8 text-primary-600" />
        </div>
        <h1 className="text-6xl font-extrabold text-gray-200 mb-2">404</h1>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Page not found</h2>
        <p className="text-gray-500 text-sm mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to={isAuthenticated ? '/app/dashboard' : '/'}
          className="btn btn-primary"
        >
          {isAuthenticated ? 'Back to Dashboard' : 'Back to Home'}
        </Link>
      </div>
    </div>
  )
}

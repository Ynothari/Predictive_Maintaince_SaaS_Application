import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { ReactNode } from 'react'
import LoginPage from './pages/LoginPage'
import ProtectedRoute from './components/ProtectedRoute'
import LandingPage from './pages/LandingPage'
import SignupPage from './pages/SignupPage'
import AppLayout from './layouts/AppLayout'
import AppDashboardPage from './pages/AppDashboardPage'
import UploadPage from './pages/UploadPage'
import AnalyticsPage from './pages/AnalyticsPage'
import SettingsPage from './pages/SettingsPage'
import HistoryPage from './pages/HistoryPage'
import AdminPage from './pages/AdminPage'
import NotFoundPage from './pages/NotFoundPage'
import SessionExpiryBanner from './components/SessionExpiryBanner'
import ComparisonPage from './pages/ComparisonPage'
import MonitorPage from './pages/MonitorPage'
import FleetPage from './pages/FleetPage'
import ResetPasswordPage from './pages/ResetPasswordPage'

function RootRedirect() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Navigate to="/app/dashboard" replace /> : <LandingPage />
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Navigate to="/app/dashboard" replace /> : <>{children}</>
}

function AdminRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" state={{ returnTo: '/admin' }} replace />
}

function App() {
  return (
    <GoogleOAuthProvider clientId="561839765949-cugiloaj4in662s2cegl0ptja3uc3f01.apps.googleusercontent.com">
      <AuthProvider>
        <NotificationProvider>
          <BrowserRouter>
          <SessionExpiryBanner />
          <Routes>
            <Route path="/"       element={<RootRedirect />} />
            <Route path="/login"          element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/signup"         element={<PublicRoute><SignupPage /></PublicRoute>} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/admin"  element={<AdminRoute><AdminPage /></AdminRoute>} />
            <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/app/dashboard" replace />} />
              <Route path="dashboard" element={<AppDashboardPage />} />
              <Route path="upload"    element={<UploadPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="history"   element={<HistoryPage />} />
              <Route path="settings"  element={<SettingsPage />} />
              <Route path="compare"   element={<ComparisonPage />} />
              <Route path="monitor"   element={<MonitorPage />} />
              <Route path="fleet"     element={<FleetPage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
    </GoogleOAuthProvider>
  )
}

export default App

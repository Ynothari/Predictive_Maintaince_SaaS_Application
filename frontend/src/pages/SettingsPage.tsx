import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useNotifications } from '../contexts/NotificationContext'
import { useAnalyses } from '../hooks/useAnalyses'
import axios from 'axios'
import {
  User, Mail, Lock, AlertCircle, CheckCircle, Shield, Trash2,
  Bell, BellOff, Download, LogOut, Pencil, Save, X, Key, Eye, EyeOff,
  Smartphone,
} from 'lucide-react'

type Section = 'notifications' | 'data' | 'account'

function SectionTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
        active ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {label}
    </button>
  )
}

function Toggle({ enabled, onChange, label }: { enabled: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm text-gray-700">{label}</span>
      <button
        onClick={() => onChange(!enabled)}
        className={`toggle ${enabled ? 'bg-primary-600' : 'bg-gray-200'}`}
        role="switch"
        aria-checked={enabled}
      >
        <span className={`toggle-thumb ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  )
}

export default function SettingsPage() {
  const { user, token, changePassword, updateProfileRemote, logout } = useAuth()
  const { addNotification }                                   = useNotifications()
  const { analyses, deleteAll: deleteAllAnalyses }            = useAnalyses()
  const navigate                                              = useNavigate()

  const [activeSection, setActiveSection] = useState<Section>('account')

  // ── Notification prefs ──────────────────────────────────────────────────────
  const notifKey = `notif_prefs_${user?.username}`
  const [notifPrefs, setNotifPrefs] = useState(() => {
    try { return { enabled: true, highRisk: true, failures: true, healthy: false, ...JSON.parse(localStorage.getItem(notifKey) ?? '{}') } }
    catch { return { enabled: true, highRisk: true, failures: true, healthy: false } }
  })
  const saveNotifPref = (key: string, val: boolean) => {
    const updated = { ...notifPrefs, [key]: val }
    setNotifPrefs(updated)
    localStorage.setItem(notifKey, JSON.stringify(updated))
  }

  // ── Failure rate threshold ──────────────────────────────────────────────────
  const thresholdKey = `threshold_${user?.username}`
  const [threshold, setThreshold] = useState<number>(() => {
    const stored = localStorage.getItem(thresholdKey)
    return stored ? parseInt(stored, 10) : 15
  })
  const saveThreshold = (val: number) => {
    const clamped = Math.max(0, Math.min(100, val))
    setThreshold(clamped)
    localStorage.setItem(thresholdKey, String(clamped))
  }

  // ── API Key ─────────────────────────────────────────────────────────────────
  const [apiKey, setApiKey]         = useState<string | null>(null)
  const [showApiKey, setShowApiKey] = useState(false)
  const [apiKeyLoading, setApiKeyLoading] = useState(false)

  const generateApiKey = async () => {
    setApiKeyLoading(true)
    try {
      const res = await axios.post('/auth/api-key', {}, { headers: { Authorization: `Bearer ${token}` } })
      setApiKey(res.data.api_key)
      setShowApiKey(false)
      addNotification('success', 'API Key Generated', 'Your new API key is ready.')
    } catch {
      addNotification('error', 'Failed', 'Could not generate API key.')
    } finally { setApiKeyLoading(false) }
  }

  const revokeApiKey = async () => {
    if (!window.confirm('Revoke your API key? Any integrations using it will stop working.')) return
    setApiKeyLoading(true)
    try {
      await axios.delete('/auth/api-key', { headers: { Authorization: `Bearer ${token}` } })
      setApiKey(null)
      addNotification('info', 'API Key Revoked', 'Your API key has been revoked.')
    } catch {
      addNotification('error', 'Failed', 'Could not revoke API key.')
    } finally { setApiKeyLoading(false) }
  }

  // ── 2FA ─────────────────────────────────────────────────────────────────────
  const [twoFaEnabled, setTwoFaEnabled]     = useState(false)
  const [twoFaSetupData, setTwoFaSetupData] = useState<{ qr_url: string; secret: string } | null>(null)
  const [twoFaCode, setTwoFaCode]           = useState('')
  const [twoFaLoading, setTwoFaLoading]     = useState(false)
  const [twoFaError, setTwoFaError]         = useState<string | null>(null)

  const setup2FA = async () => {
    setTwoFaLoading(true); setTwoFaError(null)
    try {
      const res = await axios.post('/auth/2fa/setup', {}, { headers: { Authorization: `Bearer ${token}` } })
      setTwoFaSetupData(res.data)
    } catch { setTwoFaError('Failed to start 2FA setup.') }
    finally { setTwoFaLoading(false) }
  }

  const verify2FA = async () => {
    setTwoFaLoading(true); setTwoFaError(null)
    try {
      await axios.post('/auth/2fa/verify', { code: twoFaCode }, { headers: { Authorization: `Bearer ${token}` } })
      setTwoFaEnabled(true); setTwoFaSetupData(null); setTwoFaCode('')
      addNotification('success', '2FA Enabled', 'Two-factor authentication is now active.')
    } catch { setTwoFaError('Invalid code. Please try again.') }
    finally { setTwoFaLoading(false) }
  }

  const disable2FA = async () => {
    if (!twoFaCode) { setTwoFaError('Enter your current TOTP code to disable 2FA.'); return }
    setTwoFaLoading(true); setTwoFaError(null)
    try {
      await axios.post('/auth/2fa/disable', { code: twoFaCode }, { headers: { Authorization: `Bearer ${token}` } })
      setTwoFaEnabled(false); setTwoFaCode('')
      addNotification('info', '2FA Disabled', 'Two-factor authentication has been turned off.')
    } catch { setTwoFaError('Invalid code. Could not disable 2FA.') }
    finally { setTwoFaLoading(false) }
  }

  // ── Password change ─────────────────────────────────────────────────────────
  const [curPw, setCurPw]         = useState('')
  const [newPw, setNewPw]         = useState('')
  const [confPw, setConfPw]       = useState('')
  const [pwError, setPwError]     = useState<string | null>(null)
  const [pwOk, setPwOk]           = useState(false)
  const [pwLoading, setPwLoading] = useState(false)

  const pwStrength = () => {
    if (!newPw) return null
    if (newPw.length < 8)  return { label: 'Too short', color: 'bg-red-400',    w: '20%' }
    if (newPw.length < 10) return { label: 'Weak',      color: 'bg-orange-400', w: '45%' }
    if (!/[A-Z]/.test(newPw) || !/[0-9]/.test(newPw)) return { label: 'Fair', color: 'bg-yellow-400', w: '70%' }
    return { label: 'Strong', color: 'bg-green-500', w: '100%' }
  }
  const strength = pwStrength()

  const handlePwSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setPwError(null); setPwOk(false)
    if (newPw.length < 8) { setPwError('New password must be at least 8 characters.'); return }
    if (newPw !== confPw) { setPwError('Passwords do not match.'); return }
    setPwLoading(true)
    try {
      await changePassword(curPw, newPw)
      setPwOk(true); setCurPw(''); setNewPw(''); setConfPw('')
      addNotification('success', 'Password Updated', 'Your password has been changed successfully.')
    } catch (err: any) {
      setPwError(err?.response?.data?.detail ?? 'Failed to change password.')
    } finally { setPwLoading(false) }
  }

  // ── Profile edit ────────────────────────────────────────────────────────────
  const [editingProfile, setEditingProfile] = useState(false)
  const [editUsername, setEditUsername]     = useState(user?.username ?? '')
  const [editEmail, setEditEmail]           = useState(user?.email ?? '')
  const [editFullName, setEditFullName]     = useState(user?.fullName ?? '')
  const [profileError, setProfileError]     = useState<string | null>(null)
  const [profileOk, setProfileOk]           = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)

  const usernameAlreadyChanged = user?.usernameChanged === true

  const startEdit = () => {
    setEditUsername(user?.username ?? '')
    setEditEmail(user?.email ?? '')
    setEditFullName(user?.fullName ?? '')
    setProfileError(null)
    setEditingProfile(true)
  }

  const cancelEdit = () => {
    setEditingProfile(false)
    setProfileError(null)
  }

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  const saveProfile = async () => {
    setProfileError(null)
    // Frontend validation
    if (!editUsername.trim()) { setProfileError('Username cannot be empty.'); return }
    if (!editEmail.trim() || !EMAIL_RE.test(editEmail)) { setProfileError('Enter a valid email address.'); return }
    if (editUsername !== user?.username && usernameAlreadyChanged) {
      setProfileError('Username can only be changed once.'); return
    }
    setProfileLoading(true)
    try {
      await updateProfileRemote({
        newUsername: editUsername !== user?.username ? editUsername : undefined,
        newEmail:    editEmail    !== user?.email    ? editEmail    : undefined,
        fullName:    editFullName,
      })
      setEditingProfile(false)
      setProfileOk(true)
      setTimeout(() => setProfileOk(false), 4000)
      addNotification('success', 'Profile Updated', 'Your profile has been saved.')
    } catch (err: any) {
      setProfileError(err?.response?.data?.detail ?? 'Failed to update profile.')
    } finally { setProfileLoading(false) }
  }

  // ── Data export / delete ────────────────────────────────────────────────────
  const exportData = () => {
    if (!user) return
    const payload = {
      exportedAt: new Date().toISOString(),
      user: { username: user.username, email: user.email },
      analyses: analyses.map(a => ({
        id: a.id, timestamp: a.timestamp,
        totalRecords: a.totalRecords, failureCount: a.failureCount,
        highRiskCount: a.highRiskCount, failureRate: a.failureRate,
      })),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `predictiq-data-${user.username}.json`; a.click()
    URL.revokeObjectURL(url)
    addNotification('success', 'Data Exported', 'Your data has been downloaded as a JSON file.')
  }

  const deleteAllData = async () => {
    if (!user) return
    if (!window.confirm('Delete ALL your analysis history permanently? This cannot be undone.')) return
    try {
      await deleteAllAnalyses()
      addNotification('info', 'Data Cleared', 'All your analysis history has been deleted.')
    } catch {
      addNotification('error', 'Delete Failed', 'Could not delete analysis history. Please try again.')
    }
  }

  const handleLogout = () => { logout(); navigate('/login') }

  const tabs: { id: Section; label: string }[] = [
    { id: 'account',       label: 'Account' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'data',          label: 'Data Control' },
  ]

  return (
    <div className="max-w-3xl mx-auto p-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your profile, notifications, and account</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-2xl mb-6 flex-wrap">
        {tabs.map(t => (
          <SectionTab key={t.id} label={t.label} active={activeSection === t.id} onClick={() => setActiveSection(t.id)} />
        ))}
      </div>

      {/* ── ACCOUNT ── */}
      {activeSection === 'account' && (
        <div className="space-y-5 animate-fade-in">

          {/* Profile card */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="section-title mb-0 flex items-center gap-2">
                <User className="w-4 h-4 text-primary-600" />Profile
              </h2>
              {!editingProfile ? (
                <button onClick={startEdit} className="btn btn-ghost text-xs">
                  <Pencil className="w-3.5 h-3.5" />Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={saveProfile} disabled={profileLoading} className="btn btn-primary text-xs py-1.5 disabled:opacity-50">
                    {profileLoading
                      ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <Save className="w-3.5 h-3.5" />}
                    Save
                  </button>
                  <button onClick={cancelEdit} className="btn btn-ghost text-xs py-1.5">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {profileOk && (
              <div className="alert-success animate-slide-up">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <p>Profile updated successfully.</p>
              </div>
            )}
            {profileError && (
              <div className="alert-error animate-slide-up">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <p>{profileError}</p>
              </div>
            )}

            {/* Avatar row */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white flex items-center justify-center text-xl font-bold shadow-sm">
                {(user?.fullName || user?.username || '?').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{user?.fullName || user?.username}</p>
                <p className="text-sm text-gray-500">@{user?.username}</p>
              </div>
            </div>

            {/* Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Display Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Display Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={editingProfile ? editFullName : (user?.fullName || '')}
                    onChange={e => setEditFullName(e.target.value)}
                    readOnly={!editingProfile}
                    className={`input pl-9 ${!editingProfile ? 'bg-gray-50 cursor-not-allowed text-gray-500' : ''}`}
                    placeholder="Your display name"
                  />
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Username
                  {usernameAlreadyChanged && (
                    <span className="ml-2 text-xs text-amber-600 font-normal">(cannot change again)</span>
                  )}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={editingProfile ? editUsername : (user?.username || '')}
                    onChange={e => setEditUsername(e.target.value)}
                    readOnly={!editingProfile || usernameAlreadyChanged}
                    className={`input pl-9 ${(!editingProfile || usernameAlreadyChanged) ? 'bg-gray-50 cursor-not-allowed text-gray-500' : ''}`}
                    placeholder="Username"
                  />
                </div>
                {editingProfile && usernameAlreadyChanged && (
                  <p className="text-xs text-amber-600 mt-1">Username can only be changed once.</p>
                )}
              </div>

              {/* Email */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={editingProfile ? editEmail : (user?.email || '')}
                    onChange={e => setEditEmail(e.target.value)}
                    readOnly={!editingProfile}
                    className={`input pl-9 ${!editingProfile ? 'bg-gray-50 cursor-not-allowed text-gray-500' : ''}`}
                    placeholder="your@email.com"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Change Password */}
          <div className="card space-y-4">
            <h2 className="section-title flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-500" />Change Password
            </h2>
            {pwOk    && <div className="alert-success animate-slide-up"><CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" /><p>Password changed successfully.</p></div>}
            {pwError && <div className="alert-error animate-slide-up"><AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" /><p>{pwError}</p></div>}
            <form onSubmit={handlePwSubmit} className="space-y-4" noValidate>
              {([
                { label: 'Current Password', val: curPw,  set: setCurPw,  ph: 'Enter current password' },
                { label: 'New Password',     val: newPw,  set: setNewPw,  ph: 'Min. 8 characters' },
                { label: 'Confirm Password', val: confPw, set: setConfPw, ph: 'Repeat new password' },
              ] as const).map(({ label, val, set, ph }) => (
                <div key={label}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="password" value={val} onChange={e => (set as any)(e.target.value)} className="input pl-9" placeholder={ph} />
                  </div>
                  {label === 'New Password' && strength && (
                    <div className="mt-1.5">
                      <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-300 ${strength.color}`} style={{ width: strength.w }} />
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{strength.label}</p>
                    </div>
                  )}
                </div>
              ))}
              <button type="submit" disabled={pwLoading} className="btn btn-primary disabled:opacity-50">
                {pwLoading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Updating…</> : 'Update Password'}
              </button>
            </form>
          </div>

          {/* Sign out */}
          <div className="card">
            <h2 className="section-title flex items-center gap-2">
              <LogOut className="w-4 h-4 text-gray-500" />Session
            </h2>
            <p className="text-sm text-gray-500 mb-4">Sign out of your account on this device.</p>
            <button onClick={handleLogout} className="btn btn-secondary text-red-600 border-red-200 hover:bg-red-50">
              <LogOut className="w-4 h-4" />Sign Out
            </button>
          </div>

          {/* API Key */}
          <div className="card">
            <h2 className="section-title flex items-center gap-2">
              <Key className="w-4 h-4 text-primary-600" />API Key
            </h2>
            <p className="text-sm text-gray-500 mb-4">Use an API key to authenticate programmatic requests.</p>
            {apiKey ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl font-mono text-sm border border-gray-200">
                  <span className="flex-1 truncate text-gray-700">
                    {showApiKey ? apiKey : `${apiKey.slice(0, 8)}${'•'.repeat(24)}`}
                  </span>
                  <button onClick={() => setShowApiKey(v => !v)} className="text-gray-400 hover:text-gray-600">
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button onClick={revokeApiKey} disabled={apiKeyLoading} className="btn btn-secondary text-red-600 border-red-200 hover:bg-red-50 text-sm disabled:opacity-50">
                  <X className="w-4 h-4" />Revoke Key
                </button>
              </div>
            ) : (
              <button onClick={generateApiKey} disabled={apiKeyLoading} className="btn btn-primary text-sm disabled:opacity-50">
                {apiKeyLoading
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Key className="w-4 h-4" />}
                Generate API Key
              </button>
            )}
          </div>

          {/* Two-Factor Authentication */}
          <div className="card">
            <h2 className="section-title flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-primary-600" />Two-Factor Authentication
            </h2>
            {twoFaError && (
              <div className="alert-error mb-3 animate-slide-up">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <p>{twoFaError}</p>
              </div>
            )}
            {twoFaEnabled ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="badge-green text-sm"><CheckCircle className="w-3.5 h-3.5" />2FA Active</span>
                  <span className="text-xs text-gray-400">Your account is protected with TOTP.</span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Enter TOTP code to disable</label>
                  <input
                    type="text"
                    value={twoFaCode}
                    onChange={e => setTwoFaCode(e.target.value)}
                    placeholder="6-digit code"
                    maxLength={6}
                    className="input w-40 text-center font-mono"
                  />
                </div>
                <button onClick={disable2FA} disabled={twoFaLoading} className="btn btn-secondary text-red-600 border-red-200 hover:bg-red-50 text-sm disabled:opacity-50">
                  {twoFaLoading ? <span className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" /> : <X className="w-4 h-4" />}
                  Disable 2FA
                </button>
              </div>
            ) : twoFaSetupData ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">Scan the QR code with your authenticator app, or enter the secret manually.</p>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                  <p className="text-xs text-gray-500 font-medium">QR Code URL (open in authenticator):</p>
                  <a href={twoFaSetupData.qr_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:underline break-all">{twoFaSetupData.qr_url}</a>
                  <p className="text-xs text-gray-500 font-medium mt-2">Manual secret:</p>
                  <code className="text-xs font-mono bg-white border border-gray-200 px-2 py-1 rounded text-gray-800 block">{twoFaSetupData.secret}</code>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Enter 6-digit code to verify</label>
                  <input
                    type="text"
                    value={twoFaCode}
                    onChange={e => setTwoFaCode(e.target.value)}
                    placeholder="000000"
                    maxLength={6}
                    className="input w-40 text-center font-mono"
                  />
                </div>
                <button onClick={verify2FA} disabled={twoFaLoading || twoFaCode.length !== 6} className="btn btn-primary text-sm disabled:opacity-50">
                  {twoFaLoading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Verify & Enable 2FA
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-500">Add an extra layer of security with a TOTP authenticator app (Google Authenticator, Authy, etc.).</p>
                <button onClick={setup2FA} disabled={twoFaLoading} className="btn btn-primary text-sm disabled:opacity-50">
                  {twoFaLoading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Smartphone className="w-4 h-4" />}
                  Enable 2FA
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── NOTIFICATIONS ── */}
      {activeSection === 'notifications' && (
        <div className="space-y-5 animate-fade-in">
          <div className="card">
            <h2 className="section-title flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary-600" />In-App Notifications
            </h2>
            <p className="text-sm text-gray-500 mb-2">Control which alerts appear after each analysis.</p>
            <div className="divide-y divide-gray-100">
              <Toggle enabled={notifPrefs.enabled}  onChange={v => saveNotifPref('enabled', v)}  label="Enable all notifications" />
              <div className={`transition-opacity ${notifPrefs.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                <Toggle enabled={notifPrefs.highRisk} onChange={v => saveNotifPref('highRisk', v)} label="High-risk machine alerts" />
                <Toggle enabled={notifPrefs.failures} onChange={v => saveNotifPref('failures', v)} label="Predicted failure warnings" />
                <Toggle enabled={notifPrefs.healthy}  onChange={v => saveNotifPref('healthy', v)}  label="All-healthy confirmations" />
              </div>
            </div>
          </div>
          <div className="card">
            <h2 className="section-title flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />Failure Rate Alert Threshold
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Get an in-app alert when the failure rate exceeds this percentage after an analysis.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                max={100}
                value={threshold}
                onChange={e => saveThreshold(parseInt(e.target.value, 10) || 0)}
                className="input w-24 text-center"
              />
              <span className="text-sm text-gray-500">%</span>
              <span className="text-xs text-gray-400">(0–100, default 15)</span>
            </div>
          </div>
          <div className="card">
            <h2 className="section-title flex items-center gap-2">
              <BellOff className="w-4 h-4 text-gray-400" />Email & SMS Alerts
            </h2>
            <div className="alert-warning">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Coming soon</p>
                <p className="text-xs mt-0.5">Email and SMS alert delivery requires SMTP/Twilio configuration.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DATA CONTROL ── */}
      {activeSection === 'data' && (
        <div className="space-y-5 animate-fade-in">
          <div className="card">
            <h2 className="section-title flex items-center gap-2">
              <Download className="w-4 h-4 text-primary-600" />Export Your Data
            </h2>
            <p className="text-sm text-gray-500 mb-4">Download all your analysis history as a JSON file.</p>
            <button onClick={exportData} className="btn btn-secondary">
              <Download className="w-4 h-4" />Download My Data
            </button>
          </div>
          <div className="card border-red-100">
            <h2 className="section-title flex items-center gap-2 text-red-700">
              <Trash2 className="w-4 h-4" />Delete All Data
            </h2>
            <p className="text-sm text-gray-500 mb-4">Permanently delete all your analysis history. This cannot be undone.</p>
            <button onClick={deleteAllData} className="btn btn-danger">
              <Trash2 className="w-4 h-4" />Delete All My Data
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

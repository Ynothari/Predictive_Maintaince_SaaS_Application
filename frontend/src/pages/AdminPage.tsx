import { useState, useEffect, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  Shield, Users, Trash2, RefreshCw, AlertCircle, CheckCircle,
  Search, Plus, X, Activity, LogOut, Eye, EyeOff, Pencil, Save,
  ClipboardList,
} from 'lucide-react'
import axios from 'axios'

interface AdminUser {
  username: string
  email: string
  full_name: string
  last_login_at: string | null
  analysis_count: number
}

interface AuditEntry {
  id: number
  user_id: number | null
  action: string
  details: string
  ip_address: string | null
  created_at: string
}

type AdminTab = 'users' | 'audit'

export default function AdminPage() {
  const { token, user, logout } = useAuth()
  const navigate                = useNavigate()

  const [activeTab, setActiveTab] = useState<AdminTab>('users')
  const [users, setUsers]         = useState<AdminUser[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [search, setSearch]       = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [actionMsg, setActionMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Edit state
  const [editTarget, setEditTarget]   = useState<string | null>(null)
  const [editEmail, setEditEmail]     = useState('')
  const [editFullName, setEditFullName] = useState('')
  const [editSaving, setEditSaving]   = useState(false)

  // Create form
  const [cFullName, setCFullName] = useState('')
  const [cEmail, setCEmail]       = useState('')
  const [cUsername, setCUsername] = useState('')
  const [cPassword, setCPassword] = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [creating, setCreating]   = useState(false)

  // Audit log
  const [auditLogs, setAuditLogs]   = useState<AuditEntry[]>([])
  const [auditLoading, setAuditLoading] = useState(false)

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } }

  const fetchUsers = async () => {
    setLoading(true); setError(null)
    try {
      const res = await axios.get<AdminUser[]>('/admin/users', authHeaders)
      setUsers(res.data)
    } catch (e: any) {
      if (e?.response?.status === 403) {
        setError('Access denied. Admin privileges required.')
      } else {
        setError('Failed to load users.')
      }
    } finally { setLoading(false) }
  }

  const fetchAuditLog = async () => {
    setAuditLoading(true)
    try {
      const res = await axios.get<AuditEntry[]>('/admin/audit-log', authHeaders)
      setAuditLogs(res.data)
    } catch { /* silent */ } finally { setAuditLoading(false) }
  }

  useEffect(() => { fetchUsers() }, [])
  useEffect(() => { if (activeTab === 'audit') fetchAuditLog() }, [activeTab])

  if (!loading && error === 'Access denied. Admin privileges required.') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-500 text-sm mb-6">
            You must be logged in as <strong>admin</strong> to access this panel.
          </p>
          <div className="space-y-2">
            <button onClick={() => navigate('/login', { state: { returnTo: '/admin' } })} className="btn btn-primary w-full">
              Sign in as Admin
            </button>
            <button onClick={() => navigate('/app/dashboard')} className="btn btn-secondary w-full">
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  const flash = (type: 'ok' | 'err', text: string) => {
    setActionMsg({ type, text })
    setTimeout(() => setActionMsg(null), 4000)
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!cFullName || !cEmail || !cUsername || !cPassword) return
    setCreating(true)
    try {
      await axios.post('/admin/users', {
        full_name: cFullName, email: cEmail, username: cUsername, password: cPassword,
      }, authHeaders)
      flash('ok', `User "${cUsername}" created successfully.`)
      setCFullName(''); setCEmail(''); setCUsername(''); setCPassword('')
      setShowCreate(false)
      fetchUsers()
    } catch (e: any) {
      flash('err', e?.response?.data?.detail ?? 'Failed to create user.')
    } finally { setCreating(false) }
  }

  const startEdit = (u: AdminUser) => {
    setEditTarget(u.username)
    setEditEmail(u.email)
    setEditFullName(u.full_name)
  }

  const cancelEdit = () => { setEditTarget(null) }

  const saveEdit = async (username: string) => {
    setEditSaving(true)
    try {
      await axios.patch(`/admin/users/${username}`, {
        email: editEmail, full_name: editFullName,
      }, authHeaders)
      flash('ok', `User "${username}" updated.`)
      setEditTarget(null)
      fetchUsers()
    } catch (e: any) {
      flash('err', e?.response?.data?.detail ?? 'Failed to update user.')
    } finally { setEditSaving(false) }
  }

  const handleDelete = async (username: string) => {
    try {
      await axios.delete(`/admin/users/${username}`, authHeaders)
      flash('ok', `User "${username}" deleted.`)
      setDeleteTarget(null)
      fetchUsers()
    } catch (e: any) {
      flash('err', e?.response?.data?.detail ?? 'Failed to delete user.')
      setDeleteTarget(null)
    }
  }

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Top bar */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 dark:text-white">Admin Panel</h1>
            <p className="text-xs text-gray-400">PredictIQ · Restricted Access</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <Activity className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
            <span className="text-xs font-semibold text-red-700 dark:text-red-300">{user?.username}</span>
          </div>
          <button onClick={() => navigate('/app/dashboard')} className="btn btn-ghost text-xs">← Back to App</button>
          <button onClick={() => { logout(); navigate('/login') }} className="btn btn-ghost text-xs text-red-500">
            <LogOut className="w-3.5 h-3.5" />Sign out
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {actionMsg && (
          <div className={`animate-slide-up ${actionMsg.type === 'ok' ? 'alert-success' : 'alert-error'}`}>
            {actionMsg.type === 'ok'
              ? <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
              : <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />}
            <p>{actionMsg.text}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Users', value: users.length, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
            { label: 'Registered', value: users.length, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
            { label: 'Admin', value: 1, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
          ].map(s => (
            <div key={s.label} className="card p-4">
              <div className={`w-8 h-8 ${s.bg} rounded-lg flex items-center justify-center mb-2`}>
                <Users className={`w-4 h-4 ${s.color}`} />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-2xl w-fit">
          {([
            { id: 'users' as AdminTab, label: 'Users', icon: Users },
            { id: 'audit' as AdminTab, label: 'Audit Log', icon: ClipboardList },
          ]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>

        {/* Users tab */}
        {activeTab === 'users' && (
          <div className="card p-0 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500" />Registered Users
              </h2>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search users…" className="input pl-8 py-1.5 text-sm w-48" />
                </div>
                <button onClick={fetchUsers} className="btn btn-ghost p-2" title="Refresh">
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button onClick={() => setShowCreate(v => !v)} className="btn btn-primary text-xs">
                  <Plus className="w-3.5 h-3.5" />Add User
                </button>
              </div>
            </div>

            {showCreate && (
              <div className="px-6 py-4 bg-blue-50 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-800 animate-slide-up">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Create New User</h3>
                <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3">
                  <input value={cFullName} onChange={e => setCFullName(e.target.value)} placeholder="Full name" className="input text-sm py-2" required />
                  <input value={cEmail}    onChange={e => setCEmail(e.target.value)}    placeholder="Email" type="email" className="input text-sm py-2" required />
                  <input value={cUsername} onChange={e => setCUsername(e.target.value)} placeholder="Username" className="input text-sm py-2" required />
                  <div className="relative">
                    <input value={cPassword} onChange={e => setCPassword(e.target.value)}
                      placeholder="Password (min 8 chars)" type={showPw ? 'text' : 'password'}
                      className="input text-sm py-2 pr-9" required minLength={8} />
                    <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="col-span-2 flex gap-2">
                    <button type="submit" disabled={creating} className="btn btn-primary text-xs">
                      {creating ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating…</> : 'Create User'}
                    </button>
                    <button type="button" onClick={() => setShowCreate(false)} className="btn btn-ghost text-xs">
                      <X className="w-3.5 h-3.5" />Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
              </div>
            ) : error ? (
              <div className="p-6">
                <div className="alert-error"><AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" /><p>{error}</p></div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Users className="w-10 h-10 text-gray-200 dark:text-gray-700 mb-3" />
                <p className="text-gray-400 text-sm">{search ? 'No users match your search.' : 'No registered users yet.'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      {['Username', 'Full Name', 'Email', 'Last Login', 'Analyses', 'Actions'].map(h => (
                        <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {filtered.map(u => (
                      <tr key={u.username} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white flex items-center justify-center text-xs font-bold">
                              {u.username.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="font-medium text-gray-900 dark:text-white">{u.username}</span>
                          </div>
                        </td>
                        {/* Full Name — inline edit */}
                        <td className="px-6 py-3 text-gray-600 dark:text-gray-400">
                          {editTarget === u.username
                            ? <input value={editFullName} onChange={e => setEditFullName(e.target.value)} className="input text-sm py-1 w-36" />
                            : (u.full_name || '—')}
                        </td>
                        {/* Email — inline edit */}
                        <td className="px-6 py-3 text-gray-600 dark:text-gray-400">
                          {editTarget === u.username
                            ? <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} className="input text-sm py-1 w-44" />
                            : u.email}
                        </td>
                        <td className="px-6 py-3 text-gray-500 text-xs whitespace-nowrap">
                          {u.last_login_at
                            ? new Date(u.last_login_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : '—'}
                        </td>
                        <td className="px-6 py-3 text-gray-600 dark:text-gray-400">{u.analysis_count}</td>
                        <td className="px-6 py-3">
                          {editTarget === u.username ? (
                            <div className="flex items-center gap-2">
                              <button onClick={() => saveEdit(u.username)} disabled={editSaving} className="btn btn-primary text-xs py-1 px-2">
                                {editSaving ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                Save
                              </button>
                              <button onClick={cancelEdit} className="btn btn-ghost text-xs py-1 px-2"><X className="w-3.5 h-3.5" /></button>
                            </div>
                          ) : deleteTarget === u.username ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-red-600 dark:text-red-400">Confirm delete?</span>
                              <button onClick={() => handleDelete(u.username)} className="btn btn-danger text-xs py-1 px-2">Yes</button>
                              <button onClick={() => setDeleteTarget(null)} className="btn btn-ghost text-xs py-1 px-2">No</button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <button onClick={() => startEdit(u)} className="btn btn-ghost text-xs text-blue-500 hover:bg-blue-50 py-1 px-2">
                                <Pencil className="w-3.5 h-3.5" />Edit
                              </button>
                              <button onClick={() => setDeleteTarget(u.username)} className="btn btn-ghost text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 py-1 px-2">
                                <Trash2 className="w-3.5 h-3.5" />Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Audit Log tab */}
        {activeTab === 'audit' && (
          <div className="card p-0 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-gray-500" />Audit Log
              </h2>
              <button onClick={fetchAuditLog} className="btn btn-ghost p-2" title="Refresh">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            {auditLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <ClipboardList className="w-10 h-10 text-gray-200 mb-3" />
                <p className="text-gray-400 text-sm">No audit entries yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Time', 'Action', 'Details', 'User ID', 'IP'].map(h => (
                        <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {auditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-6 py-3">
                          <span className="badge-blue">{log.action}</span>
                        </td>
                        <td className="px-6 py-3 text-gray-600 max-w-xs truncate">{log.details}</td>
                        <td className="px-6 py-3 text-gray-400 text-xs">{log.user_id ?? '—'}</td>
                        <td className="px-6 py-3 text-gray-400 text-xs">{log.ip_address ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

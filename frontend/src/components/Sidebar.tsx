import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, Upload, BarChart2, Settings, Menu, X, LogOut, Activity, Bell, History, Shield, GitCompare, Radio, Factory } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useNotifications } from '../contexts/NotificationContext'

const navItems = [
  { label: 'Dashboard',    path: '/app/dashboard', icon: LayoutDashboard },
  { label: 'Upload Data',  path: '/app/upload',    icon: Upload },
  { label: 'Live Monitor', path: '/app/monitor',   icon: Radio },
  { label: 'Fleet View',   path: '/app/fleet',     icon: Factory },
  { label: 'Analytics',    path: '/app/analytics', icon: BarChart2 },
  { label: 'History',      path: '/app/history',   icon: History },
  { label: 'Compare',      path: '/app/compare',   icon: GitCompare },
  { label: 'Settings',     path: '/app/settings',  icon: Settings },
]

export default function Sidebar() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { user, logout }             = useAuth()
  const { unreadCount, togglePanel } = useNotifications()
  const location                     = useLocation()
  const navigate                     = useNavigate()

  const initials     = user?.username ? user.username.slice(0, 2).toUpperCase() : '??'
  const displayName  = user?.fullName || user?.username || ''
  const handleLogout = () => { logout(); navigate('/login') }
  const closeSidebar = () => setIsSidebarOpen(false)

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shadow-sm">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900">PredictIQ</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={togglePanel} className="relative p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors" aria-label="Notifications">
            <Bell size={17} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <button className="md:hidden text-gray-400 hover:text-gray-600 p-1.5" onClick={closeSidebar} aria-label="Close sidebar">
            <X size={17} />
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="px-3 pb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Menu</p>
        {navItems.map(({ label, path, icon: Icon }) => {
          const isActive = location.pathname === path
          return (
            <NavLink key={path} to={path} onClick={closeSidebar}
              className={[
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
              ].join(' ')}
            >
              <Icon size={17} className={isActive ? 'text-white' : 'text-gray-400'} />
              {label}
            </NavLink>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50 mb-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm">
            {initials}
          </div>
          <span className="text-sm font-semibold text-gray-800 truncate">{displayName}</span>
        </div>
        {user?.username === 'admin' && (
          <NavLink to="/admin" onClick={closeSidebar}
            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-amber-600 hover:bg-amber-50 rounded-xl transition-colors mb-0.5">
            <Shield size={13} />Admin Panel
          </NavLink>
        )}
        <button onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors">
          <LogOut size={15} />Sign out
        </button>
      </div>
    </div>
  )

  return (
    <>
      <button className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-white shadow-md text-gray-600 hover:text-gray-900 border border-gray-100"
        onClick={() => setIsSidebarOpen(true)} aria-label="Open sidebar">
        <Menu size={18} />
      </button>
      {isSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={closeSidebar} />
      )}
      <aside className={['md:hidden fixed top-0 left-0 z-50 h-full w-64 bg-white shadow-xl transform transition-transform duration-200',
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'].join(' ')}>
        {sidebarContent}
      </aside>
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 h-full shadow-sm">
        {sidebarContent}
      </aside>
    </>
  )
}

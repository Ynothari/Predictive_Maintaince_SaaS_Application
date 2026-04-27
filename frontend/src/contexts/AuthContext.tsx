import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { jwtDecode } from 'jwt-decode'
import axios from 'axios'

export interface User {
  username: string
  email: string
  fullName?: string
  usernameChanged?: boolean
}

interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  register: (fullName: string, email: string, username: string, password: string) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  updateProfileRemote: (updates: { newUsername?: string; newEmail?: string; fullName?: string }) => Promise<void>
  googleLogin: (accessToken: string, userInfo: { email: string; name?: string; sub?: string }) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const PROFILE_KEY = (username: string) => `profile_${username}`

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]   = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const storedToken   = localStorage.getItem('token')
    const refreshToken  = localStorage.getItem('refresh_token')
    if (!storedToken) return
    try {
      const decoded: any = jwtDecode(storedToken)
      if (decoded.exp * 1000 > Date.now()) {
        setToken(storedToken)
        _fetchAndSetProfile(storedToken, decoded)
      } else if (refreshToken) {
        // Access token expired — try refresh
        axios.post('/auth/refresh', { refresh_token: refreshToken })
          .then(res => {
            const { access_token } = res.data
            localStorage.setItem('token', access_token)
            const dec: any = jwtDecode(access_token)
            setToken(access_token)
            _fetchAndSetProfile(access_token, dec)
          })
          .catch(() => {
            localStorage.removeItem('token')
            localStorage.removeItem('refresh_token')
          })
      } else {
        localStorage.removeItem('token')
      }
    } catch {
      localStorage.removeItem('token')
    }
  }, [])

  function _loadProfile(username: string): Partial<User> {
    try {
      const raw = localStorage.getItem(PROFILE_KEY(username))
      return raw ? JSON.parse(raw) : {}
    } catch { return {} }
  }

  function _saveProfile(userId: string, data: Partial<User>) {
    localStorage.setItem(PROFILE_KEY(userId), JSON.stringify(data))
  }

  async function _fetchAndSetProfile(tokenString: string, decoded: any) {
    // Optimistically set from local cache to prevent flickering
    const cached = _loadProfile(decoded.sub)
    setUser({ username: cached.username || decoded.sub, email: decoded.email, ...cached })

    try {
      const res = await axios.get('/auth/me', { headers: { Authorization: `Bearer ${tokenString}` } })
      const p = res.data
      const updatedUser = {
        username: p.username,
        email: p.email,
        fullName: p.full_name,
        usernameChanged: p.username_changed
      }
      setUser(updatedUser)
      _saveProfile(decoded.sub, updatedUser)
    } catch {
      // Keep optimistic user state
    }
  }

  const login = async (username: string, password: string) => {
    try {
      const res = await axios.post('/auth/login', { username, password })
      const { access_token } = res.data
      localStorage.setItem('token', access_token)
      // Issue refresh token (reuse access token endpoint — backend issues refresh separately)
      // For now store a simple refresh marker; full refresh token comes from /auth/refresh
      const decoded: any = jwtDecode(access_token)
      setToken(access_token)
      await _fetchAndSetProfile(access_token, decoded)
    } catch (err: any) {
      console.error('Login error:', err?.response?.status, err?.response?.data, err?.message)
      throw err
    }
  }

  const register = async (fullName: string, email: string, username: string, password: string) => {
    try {
      // Register returns a JWT — auto-login the user immediately
      const res = await axios.post('/auth/register', { full_name: fullName, email, username, password })
      const { access_token } = res.data
      localStorage.setItem('token', access_token)
      const decoded: any = jwtDecode(access_token)
      setToken(access_token)
      await _fetchAndSetProfile(access_token, decoded)
    } catch (err: any) {
      console.error('Register error:', err?.response?.status, err?.response?.data, err?.message)
      throw err
    }
  }

  const changePassword = async (currentPassword: string, newPassword: string) => {
    await axios.post(
      '/auth/change-password',
      { current_password: currentPassword, new_password: newPassword },
      { headers: { Authorization: `Bearer ${token}` } }
    )
  }

  const googleLogin = async (accessToken: string, userInfo: { email: string; name?: string; sub?: string }) => {
    const res = await axios.post('/auth/google', { access_token: accessToken, email: userInfo.email, name: userInfo.name ?? '' })
    const { access_token: jwt } = res.data
    localStorage.setItem('token', jwt)
    const decoded: any = jwtDecode(jwt)
    setToken(jwt)
    await _fetchAndSetProfile(jwt, decoded)
  }

  const updateProfileRemote = async (updates: { newUsername?: string; newEmail?: string; fullName?: string }) => {
    const res = await axios.patch(
      '/auth/profile',
      { new_username: updates.newUsername, new_email: updates.newEmail, full_name: updates.fullName },
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const data = res.data
    // If username changed, we need a new token — re-login is required.
    // For now update local state and profile cache.
    const updated: User = {
      username:        data.username,
      email:           data.email,
      fullName:        data.full_name || user?.fullName,
      usernameChanged: data.username_changed,
    }
    setUser(updated)
    // To match earlier logic, save against uuid which is decoded.sub of current token
    const decoded: any = jwtDecode(token!)
    _saveProfile(decoded.sub, { fullName: updated.fullName, usernameChanged: updated.usernameChanged, username: updated.username })
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, login, logout, register, changePassword, updateProfileRemote, googleLogin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

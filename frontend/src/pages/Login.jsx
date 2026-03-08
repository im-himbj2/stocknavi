import { useState, useEffect } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { login, register } from '../services/auth'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { login: setAuth, isAuth } = useAuth()
  const { t } = useLanguage()

  const [activeTab, setActiveTab] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [registerSuccess, setRegisterSuccess] = useState(false)
  const [verifiedSuccess, setVerifiedSuccess] = useState(false)

  useEffect(() => {
    if (searchParams.get('verified') === 'true') {
      setVerifiedSuccess(true)
    }
  }, [])

  useEffect(() => {
    if (isAuth) {
      navigate('/', { replace: true })
    }
  }, [isAuth])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError(null)
    if (!email || !password) {
      setError(t('login.emailLabel') + ' / ' + t('login.passwordLabel'))
      return
    }
    setLoading(true)
    try {
      const result = await login(email, password)
      if (result.user) setAuth(result.user)
      const from = location.state?.from?.pathname || '/'
      navigate(from, { replace: true })
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || t('login.defaultError')
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError(null)
    setRegisterSuccess(false)
    if (!email || !password) return
    if (password.length < 6) { setError('비밀번호는 최소 6자 이상이어야 합니다.'); return }
    if (password !== confirmPassword) { setError('비밀번호가 일치하지 않습니다.'); return }
    setLoading(true)
    try {
      await register(email, password, fullName || null)
      setRegisterSuccess(true)
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || t('login.defaultError')
      if (msg.includes('이미 등록된')) {
        setActiveTab('login')
        setError(t('login.alreadyRegistered'))
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex items-center justify-center p-6 py-24 min-h-[calc(100vh-120px)] overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-blue-600/20 blur-[150px] rounded-full pointer-events-none z-0"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-indigo-600/10 blur-[150px] rounded-full pointer-events-none z-0"></div>

      <div className="relative z-10 w-full max-w-md bg-[#0a0f1e]/80 border border-white/10 rounded-[2.5rem] p-8 md:p-12 backdrop-blur-3xl shadow-[0_30px_60px_rgba(0,0,0,0.5)] animate-fade-in-up">
        {/* 탭 */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => { setActiveTab('login'); setError(null) }}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${activeTab === 'login' ? 'bg-white text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
          >
            {t('login.loginTab')}
          </button>
          <button
            onClick={() => { setActiveTab('register'); setError(null) }}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${activeTab === 'register' ? 'bg-white text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
          >
            {t('login.registerTab')}
          </button>
        </div>

        <h1 className="text-3xl font-bold mb-2 text-center">
          {activeTab === 'login' ? t('login.loginTitle') : t('login.registerTitle')}
        </h1>
        <p className="text-gray-400 text-center mb-6">
          {activeTab === 'login' ? t('login.loginSubtitle') : t('login.registerSubtitle')}
        </p>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-900/40 border border-red-500/40 text-red-200 text-sm">
            {error}
          </div>
        )}

        {verifiedSuccess && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-emerald-900/40 border border-emerald-500/40 text-emerald-200 text-sm flex items-center gap-2">
            <span>✅</span>
            <span>{t('login.verifiedMsg')}</span>
          </div>
        )}

        {registerSuccess && (
          <div className="space-y-4">
            <div className="px-4 py-3 rounded-lg bg-blue-900/40 border border-blue-500/40 text-blue-200 text-sm">
              <p className="font-semibold mb-1">{t('login.emailSentTitle')}</p>
              <p className="text-xs text-blue-300 whitespace-pre-line">{t('login.emailSentDesc')}</p>
            </div>
            <button
              onClick={() => { setActiveTab('login'); setRegisterSuccess(false); setError(null) }}
              className="w-full py-3 rounded-lg bg-white text-black font-semibold hover:bg-gray-100 transition-all"
            >
              {t('login.goToLogin')}
            </button>
          </div>
        )}

        {!registerSuccess && activeTab === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">{t('login.emailLabel')}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder={t('login.emailPlaceholder')}
                className="w-full px-4 py-3 rounded-lg bg-black/40 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">{t('login.passwordLabel')}</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-lg bg-black/40 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-lg bg-white text-black font-semibold hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('login.loginLoading') : t('login.loginBtn')}
            </button>
          </form>
        ) : !registerSuccess ? (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">{t('login.nameLabel')}</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                placeholder={t('login.namePlaceholder')}
                className="w-full px-4 py-3 rounded-lg bg-black/40 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">{t('login.emailLabel')}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder={t('login.emailPlaceholder')}
                className="w-full px-4 py-3 rounded-lg bg-black/40 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">{t('login.passwordLabel')}</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder={t('login.passwordPlaceholder')}
                className="w-full px-4 py-3 rounded-lg bg-black/40 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">{t('login.confirmPasswordLabel')}</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('login.confirmPlaceholder')}
                className="w-full px-4 py-3 rounded-lg bg-black/40 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-lg bg-white text-black font-semibold hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('login.registerLoading') : t('login.registerBtn')}
            </button>
          </form>
        ) : null}
      </div>
      <style>{styles}</style>
    </div>
  )
}

const styles = `
  @keyframes fade-in-up {
    from { opacity: 0; transform: translateY(40px); filter: blur(10px); }
    to { opacity: 1; transform: translateY(0); filter: blur(0); }
  }
  .animate-fade-in-up {
    animation: fade-in-up 1.2s cubic-bezier(0.16, 1, 0.3, 1);
  }
`

export default Login

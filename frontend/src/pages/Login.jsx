import { useState, useEffect } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { login, register } from '../services/auth'
import { useAuth } from '../contexts/AuthContext'

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { login: setAuth, isAuth } = useAuth()

  const [activeTab, setActiveTab] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [registerSuccess, setRegisterSuccess] = useState(false)
  const [verifiedSuccess, setVerifiedSuccess] = useState(false)

  // ?verified=true → 이메일 인증 완료 배너
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
      setError('이메일과 비밀번호를 입력해주세요.')
      return
    }
    setLoading(true)
    try {
      const result = await login(email, password)
      if (result.user) {
        setAuth(result.user)
      }
      const from = location.state?.from?.pathname || '/'
      navigate(from, { replace: true })
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || '로그인에 실패했습니다.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError(null)
    setRegisterSuccess(false)
    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해주세요.')
      return
    }
    if (password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.')
      return
    }
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }
    setLoading(true)
    try {
      await register(email, password, fullName || null)
      setRegisterSuccess(true)
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || '회원가입에 실패했습니다.'
      if (msg.includes('이미 등록된')) {
        setActiveTab('login')
        setError('이미 가입된 이메일입니다. 로그인해주세요.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex items-center justify-center p-6 py-24 min-h-[calc(100vh-120px)] overflow-hidden">
      {/* 배경 장식 글로우 */}
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-blue-600/20 blur-[150px] rounded-full pointer-events-none z-0"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-indigo-600/10 blur-[150px] rounded-full pointer-events-none z-0"></div>

      <div className="relative z-10 w-full max-w-md bg-[#0a0f1e]/80 border border-white/10 rounded-[2.5rem] p-8 md:p-12 backdrop-blur-3xl shadow-[0_30px_60px_rgba(0,0,0,0.5)] animate-fade-in-up">
        {/* 탭 */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => {
              setActiveTab('login')
              setError(null)
            }}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${activeTab === 'login'
              ? 'bg-white text-black'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
          >
            로그인
          </button>
          <button
            onClick={() => {
              setActiveTab('register')
              setError(null)
            }}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${activeTab === 'register'
              ? 'bg-white text-black'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
          >
            회원가입
          </button>
        </div>

        <h1 className="text-3xl font-bold mb-2 text-center">
          {activeTab === 'login' ? '로그인' : '회원가입'}
        </h1>
        <p className="text-gray-400 text-center mb-6">
          {activeTab === 'login'
            ? '계정에 로그인하고 기능을 이용하세요.'
            : '새 계정을 만들고 시작하세요.'}
        </p>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-900/40 border border-red-500/40 text-red-200 text-sm">
            {error}
          </div>
        )}

        {verifiedSuccess && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-emerald-900/40 border border-emerald-500/40 text-emerald-200 text-sm flex items-center gap-2">
            <span>✅</span>
            <span>이메일 인증이 완료되었습니다! 로그인해주세요.</span>
          </div>
        )}

        {registerSuccess && (
          <div className="space-y-4">
            <div className="px-4 py-3 rounded-lg bg-blue-900/40 border border-blue-500/40 text-blue-200 text-sm">
              <p className="font-semibold mb-1">📧 인증 이메일을 발송했습니다</p>
              <p className="text-xs text-blue-300">가입하신 이메일 받은편지함을 확인하고 인증 링크를 클릭해주세요.<br/>인증 완료 후 로그인하실 수 있습니다.</p>
            </div>
            <button
              onClick={() => { setActiveTab('login'); setRegisterSuccess(false); setError(null) }}
              className="w-full py-3 rounded-lg bg-white text-black font-semibold hover:bg-gray-100 transition-all"
            >
              로그인하러 가기
            </button>
          </div>
        )}

        {/* 로그인 폼 */}
        {!registerSuccess && activeTab === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-lg bg-black/40 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-lg bg-black/40 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-white text-black font-semibold hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>
        ) : !registerSuccess ? (
          /* 회원가입 폼 */
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">이름 (선택사항)</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="홍길동"
                className="w-full px-4 py-3 rounded-lg bg-black/40 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-lg bg-black/40 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="최소 6자 이상"
                className="w-full px-4 py-3 rounded-lg bg-black/40 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">비밀번호 확인</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="비밀번호를 한 번 더 입력하세요"
                className="w-full px-4 py-3 rounded-lg bg-black/40 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-white text-black font-semibold hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '가입 중...' : '회원가입'}
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

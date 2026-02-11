import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { logout as authLogout } from '../../services/auth'

function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuth, logout } = useAuth()

  const isActive = (path) => location.pathname === path

  const handleLogout = () => {
    authLogout()
    logout()
    navigate('/login', { replace: true })
  }

  const navItems = [
    { path: '/', label: '홈' },
    { path: '/news', label: '뉴스' },
    { path: '/dividend', label: '배당' },
    { path: '/company', label: '기업 분석' },
    { path: '/economic', label: '경제 지표' },
    { path: '/speech', label: '연설 요약' },
    { path: '/portfolio', label: '포트폴리오' },
    { path: '/subscription', label: '구독' },
  ]

  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <nav className="bg-[#020617]/70 backdrop-blur-2xl border-b border-white/5 sticky top-0 z-[100] transition-colors duration-500">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="group flex items-center gap-2">
            <span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-400 to-blue-600 tracking-tighter transition-all duration-300 group-hover:opacity-80">
              StockNavi
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
          </Link>

          {/* 데스크탑 메뉴 */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`relative px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${isActive(item.path)
                  ? 'text-white bg-blue-600/20 border border-blue-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                {item.label}
                {isActive(item.path) && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6]"></span>
                )}
              </Link>
            ))}
            <div className="h-6 w-[1px] bg-white/10 mx-4"></div>
            {isAuth ? (
              <button
                onClick={handleLogout}
                className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-all duration-300"
              >
                Sign Out
              </button>
            ) : (
              <Link
                to="/login"
                className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/40 transition-all duration-300"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* 모바일 메뉴 버튼 */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-400 hover:bg-white/5 focus:outline-none"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* 모바일 드롭다운 메뉴 */}
        {isMenuOpen && (
          <div className="md:hidden py-6 border-t border-white/5 space-y-2 animate-slide-up">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMenuOpen(false)}
                className={`block px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${isActive(item.path)
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-4 mt-4 border-t border-white/5 px-4">
              {isAuth ? (
                <button
                  onClick={() => {
                    handleLogout()
                    setIsMenuOpen(false)
                  }}
                  className="w-full px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-red-400 bg-red-400/10 border border-red-400/20"
                >
                  Sign Out
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="block w-full px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest bg-blue-600 text-white text-center shadow-lg shadow-blue-900/40"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

export default Navbar


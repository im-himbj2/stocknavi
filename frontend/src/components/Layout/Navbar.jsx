import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { logout as authLogout } from '../../services/auth'

function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuth, logout } = useAuth()
  const { lang, toggleLang, t } = useLanguage()

  const isActive = (path) => location.pathname === path

  const handleLogout = () => {
    authLogout()
    logout()
    navigate('/login', { replace: true })
  }

  const navItems = [
    { path: '/', key: 'nav.home' },
    { path: '/news', key: 'nav.news' },
    { path: '/company', key: 'nav.company' },
    { path: '/economic', key: 'nav.economic' },
    { path: '/speech', key: 'nav.speech' },
    { path: '/portfolio', key: 'nav.portfolio' },
    { path: '/subscription', key: 'nav.subscription' },
  ]

  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <nav className="bg-[#0a0f15]/80 backdrop-blur-2xl border-b border-white/5 sticky top-0 z-[100] transition-colors duration-500">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="group flex items-center gap-2">
            <span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-[#5BA4D4] to-[#0070cc] tracking-tighter transition-all duration-300 group-hover:opacity-80">
              StockNavi
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-[#0070cc] animate-pulse"></div>
          </Link>

          {/* 데스크탑 메뉴 */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`relative px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${isActive(item.path)
                  ? 'text-white bg-[#0070cc]/20 border border-[#0070cc]/40'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                {t(item.key)}
                {isActive(item.path) && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#0070cc] rounded-full shadow-[0_0_10px_#0070cc]"></span>
                )}
              </Link>
            ))}
            <div className="h-6 w-[1px] bg-white/10 mx-2"></div>
            {/* 언어 토글 */}
            <button
              onClick={toggleLang}
              className="px-3 py-1.5 rounded-lg text-xs font-black tracking-widest border border-white/10 text-gray-400 hover:text-white hover:border-white/30 transition-all duration-300"
            >
              {lang === 'ko' ? 'EN' : 'KR'}
            </button>
            <div className="h-6 w-[1px] bg-white/10 mx-2"></div>
            {isAuth ? (
              <button
                onClick={handleLogout}
                className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-all duration-300"
              >
                {t('nav.signOut')}
              </button>
            ) : (
              <Link
                to="/login"
                className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-[#0070cc] text-white hover:bg-[#0085ff] shadow-lg shadow-[#0070cc]/20 transition-all duration-300"
              >
                {t('nav.signIn')}
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
                  ? 'bg-[#0070cc]/20 text-[#5BA4D4] border border-[#0070cc]/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                {t(item.key)}
              </Link>
            ))}
            <div className="pt-4 mt-4 border-t border-white/5 px-4 flex flex-col gap-3">
              <button
                onClick={toggleLang}
                className="w-full px-6 py-3 rounded-xl text-xs font-black tracking-widest border border-white/10 text-gray-400"
              >
                {lang === 'ko' ? '🌐 English' : '🌐 한국어'}
              </button>
              {isAuth ? (
                <button
                  onClick={() => { handleLogout(); setIsMenuOpen(false) }}
                  className="w-full px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-red-400 bg-red-400/10 border border-red-400/20"
                >
                  {t('nav.signOut')}
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="block w-full px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest bg-[#0070cc] text-white text-center shadow-lg shadow-[#0070cc]/20"
                >
                  {t('nav.signIn')}
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

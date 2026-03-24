import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import React from 'react'
import { useLanguage } from '../../contexts/LanguageContext'
import { useAuth } from '../../contexts/AuthContext'
import { logout as authLogout } from '../../services/auth'

function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(() => window.innerWidth >= 768)

  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setIsOpen(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const { lang, toggleLang, t } = useLanguage()
  const { isAuth, logout } = useAuth()

  const menuItems = [
    { path: '/',              key: 'sidebar.home',          icon: 'home' },
    { path: '/company',       key: 'sidebar.company',       icon: 'monitoring' },
    { path: '/economic',      key: 'sidebar.economic',      icon: 'show_chart' },
    { path: '/intelligence',  key: 'sidebar.intelligence',  icon: 'psychology' },
    { path: '/speech',        key: 'sidebar.speech',        icon: 'smart_toy' },
    { path: '/portfolio',     key: 'sidebar.portfolio',     icon: 'account_balance_wallet' },
    { path: '/tax',           key: 'sidebar.tax',           icon: 'calculate' },
  ]

  const isActive = (path) => location.pathname === path

  const handleLogout = () => {
    authLogout()
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside className={`${isOpen ? 'w-64' : 'w-[72px]'} bg-[#0e1f33] flex flex-col min-h-screen transition-all duration-300 shrink-0`}>
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 gap-3 border-b border-white/5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#0070cc] flex items-center justify-center text-white font-black text-sm shrink-0">S</div>
          {isOpen && <span className="text-[15px] font-black text-white font-headline tracking-tight truncate">StockNavi</span>}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto px-2">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            title={!isOpen ? t(item.key) : ''}
            className={`flex items-center gap-3 py-3 rounded-lg transition-all text-sm font-label ${
              isOpen ? 'px-4' : 'px-4 justify-center'
            } ${
              isActive(item.path)
                ? 'bg-gradient-to-r from-[#0070cc]/20 to-transparent text-[#a5c8ff] border-l-4 border-[#0070cc] rounded-l-none pl-3'
                : 'text-slate-400 hover:text-white hover:bg-[#1b2026]/70'
            }`}
          >
            <span className={`material-symbols-outlined text-[20px] shrink-0 ${isActive(item.path) ? 'text-[#a5c8ff]' : ''}`}
              style={isActive(item.path) ? { fontVariationSettings: "'FILL' 1" } : {}}>
              {item.icon}
            </span>
            {isOpen && <span className="font-semibold tracking-wide">{t(item.key)}</span>}
          </Link>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="border-t border-white/5 p-3 space-y-1">
        {/* Language toggle */}
        <button
          onClick={toggleLang}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-slate-400 hover:text-white hover:bg-[#1b2026]/70 rounded-lg transition-all text-xs font-black tracking-widest"
          title="Toggle language"
        >
          <span className="material-symbols-outlined text-[16px]">language</span>
          {isOpen && <span>{lang === 'ko' ? 'EN' : 'KR'}</span>}
        </button>

        {isAuth && (
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all text-xs"
            title={t('nav.signOut')}
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            {isOpen && <span>{t('nav.signOut')}</span>}
          </button>
        )}

        {/* Collapse toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-center py-2.5 text-slate-400 hover:text-slate-100 hover:bg-[#1b2026]/70 rounded-lg transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">
            {isOpen ? 'chevron_left' : 'chevron_right'}
          </span>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar

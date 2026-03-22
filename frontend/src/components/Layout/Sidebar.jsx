import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useLanguage } from '../../contexts/LanguageContext'
import { useAuth } from '../../contexts/AuthContext'
import { logout as authLogout } from '../../services/auth'

function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(true)
  const { lang, toggleLang, t } = useLanguage()
  const { isAuth, logout } = useAuth()

  const menuItems = [
    { path: '/',              key: 'sidebar.home',          icon: 'home' },
    { path: '/company',       key: 'sidebar.company',       icon: 'monitoring' },
    { path: '/economic',      key: 'sidebar.economic',      icon: 'show_chart' },
    { path: '/intelligence',  key: 'sidebar.intelligence',  icon: 'psychology' },
    { path: '/speech',        key: 'sidebar.speech',        icon: 'smart_toy' },
    { path: '/portfolio',     key: 'sidebar.portfolio',     icon: 'account_balance_wallet' },
  ]

  const isActive = (path) => location.pathname === path

  const handleLogout = () => {
    authLogout()
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside className={`${isOpen ? 'w-64' : 'w-20'} bg-[#0e2234] border-r border-surface-dark-border transition-all duration-300 flex flex-col min-h-screen`}>
      {/* Logo */}
      <div className="h-16 border-b border-surface-dark-border flex items-center justify-between px-4 gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm shrink-0">S</div>
        {isOpen && <span className="text-lg font-bold text-white">StockNavi</span>}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-2 overflow-y-auto">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              isActive(item.path)
                ? 'bg-[#0070cc]/25 text-blue-200 border border-[#0070cc]/40'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
            title={!isOpen ? t(item.key) : ''}
          >
            <span className="material-symbols-outlined text-[20px] shrink-0">{item.icon}</span>
            {isOpen && <span className="text-sm font-medium">{t(item.key)}</span>}
          </Link>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="border-t border-surface-dark-border p-3 space-y-2">
        {/* Language toggle */}
        <button
          onClick={toggleLang}
          className="w-full flex items-center justify-center gap-2 py-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all text-xs font-black tracking-widest"
          title="Toggle language"
        >
          <span className="material-symbols-outlined text-[16px]">language</span>
          {isOpen && <span>{lang === 'ko' ? 'EN' : 'KR'}</span>}
        </button>

        {/* Sign out */}
        {isAuth && (
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all text-xs"
            title={t('nav.signOut')}
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            {isOpen && <span>{t('nav.signOut')}</span>}
          </button>
        )}

        {/* Collapse toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-center py-2 text-slate-400 hover:text-slate-100 hover:bg-surface-dark-border/30 rounded-lg transition-all"
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

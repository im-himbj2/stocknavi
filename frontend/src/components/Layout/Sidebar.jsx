import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'

function Sidebar() {
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(true)

  const menuItems = [
    { path: '/', label: 'Home', icon: 'home' },
    { path: '/company', label: 'Company Analysis', icon: 'monitoring' },
    { path: '/dividend', label: 'Dividend Strategy', icon: 'paid' },
    { path: '/economic', label: 'Economic Indicators', icon: 'show_chart' },
    { path: '/speech', label: 'AI Intelligence', icon: 'smart_toy' },
    { path: '/portfolio', label: 'Portfolio', icon: 'account_balance_wallet' },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <aside className={`${isOpen ? 'w-64' : 'w-20'} bg-[#0e2234] border-r border-surface-dark-border transition-all duration-300 flex flex-col min-h-screen`}>
      {/* Logo / Brand */}
      <div className="h-16 border-b border-surface-dark-border flex items-center justify-between px-4 gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm shrink-0">
          S
        </div>
        {isOpen && <span className="text-lg font-bold text-white">StockNavi</span>}
      </div>

      {/* Navigation Menu */}
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
            title={!isOpen ? item.label : ''}
          >
            <span className="material-symbols-outlined text-[20px] shrink-0">{item.icon}</span>
            {isOpen && <span className="text-sm font-medium">{item.label}</span>}
          </Link>
        ))}
      </nav>

      {/* Toggle Button */}
      <div className="border-t border-surface-dark-border p-3">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-center py-2 text-slate-400 hover:text-slate-100 hover:bg-surface-dark-border/30 rounded-lg transition-all"
          title="Toggle sidebar"
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

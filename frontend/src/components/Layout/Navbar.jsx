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

  return (
    <nav className="bg-black/80 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="text-xl font-bold text-white hover:opacity-80 transition-opacity">
            StockNavi
          </Link>
          <div className="flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive(item.path)
                    ? 'bg-white text-black'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {item.label}
              </Link>
            ))}
            {isAuth ? (
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200"
              >
                로그아웃
              </button>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200"
              >
                로그인
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar


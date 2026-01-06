import { createContext, useContext, useState, useEffect } from 'react'
import { isAuthenticated, getCurrentUser } from '../services/auth'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAuth, setIsAuth] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const hasToken = isAuthenticated()
      if (hasToken) {
        try {
          // 타임아웃 설정 (10초로 증가, 백엔드가 느릴 수 있음)
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('인증 확인 타임아웃')), 10000)
          )
          const userDataPromise = getCurrentUser()
          const userData = await Promise.race([userDataPromise, timeoutPromise])
          setUser(userData)
          setIsAuth(true)
        } catch (error) {
          // 토큰이 있지만 유효하지 않은 경우 또는 백엔드 연결 실패
          // 타임아웃 에러는 조용히 처리 (백엔드가 시작 중일 수 있음)
          if (error.message && error.message.includes('타임아웃')) {
            console.warn('인증 확인 타임아웃 (백엔드가 시작 중일 수 있음):', error)
          } else {
            console.error('인증 확인 실패:', error)
          }
          // 백엔드 연결 실패 시에도 로딩을 종료하고 계속 진행
          setIsAuth(false)
          setUser(null)
        }
      } else {
        setIsAuth(false)
        setUser(null)
      }
    } catch (error) {
      console.error('인증 상태 확인 오류:', error)
      setIsAuth(false)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = (userData) => {
    setUser(userData)
    setIsAuth(true)
  }

  const logout = () => {
    setUser(null)
    setIsAuth(false)
  }

  return (
    <AuthContext.Provider value={{ user, isAuth, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}


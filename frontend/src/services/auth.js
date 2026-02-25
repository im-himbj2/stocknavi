import { api } from './api'

export const login = async (email, password) => {
  const formData = new FormData()
  formData.append('username', email)
  formData.append('password', password)
  
  const response = await api.post('/auth/login', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  
  if (response.data.access_token) {
    localStorage.setItem('access_token', response.data.access_token)
    // 사용자 정보 가져오기
    try {
      const userData = await getCurrentUser()
      return { ...response.data, user: userData }
    } catch (error) {
      console.error('사용자 정보 가져오기 실패:', error)
      return response.data
    }
  }
  
  return response.data
}

export const register = async (email, password, fullName) => {
  const response = await api.post('/auth/register', {
    email,
    password,
    full_name: fullName,
  })
  return response.data
}

export const getCurrentUser = async () => {
  const response = await api.get('/auth/me')
  return response.data
}

export const logout = () => {
  localStorage.removeItem('access_token')
}

export const isAuthenticated = () => {
  return !!localStorage.getItem('access_token')
}

export const googleLogin = async (idToken) => {
  const response = await api.post('/auth/google/login', {
    id_token: idToken
  })
  
  if (response.data.access_token) {
    localStorage.setItem('access_token', response.data.access_token)
    // 사용자 정보 가져오기
    try {
      const userData = await getCurrentUser()
      return { ...response.data, user: userData }
    } catch (error) {
      console.error('사용자 정보 가져오기 실패:', error)
      return response.data
    }
  }
  
  return response.data
}
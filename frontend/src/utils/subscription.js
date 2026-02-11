import apiService from '../services/api'

let subscriptionStatusCache = null
let subscriptionStatusCacheTime = null
const CACHE_DURATION = 5 * 60 * 1000 // 5분

export const getSubscriptionStatus = async () => {
  // 캐시 확인
  if (subscriptionStatusCache && subscriptionStatusCacheTime) {
    const now = Date.now()
    if (now - subscriptionStatusCacheTime < CACHE_DURATION) {
      return subscriptionStatusCache
    }
  }

  try {
    const status = await apiService.getSubscriptionStatus()
    subscriptionStatusCache = status
    subscriptionStatusCacheTime = Date.now()
    return status
  } catch (error) {
    // 로그인하지 않은 경우 무료로 간주
    return { tier: 'free', is_active: false }
  }
}

export const isPremium = async () => {
  const status = await getSubscriptionStatus()
  return status.is_active && status.tier === 'premium'
}

export const clearSubscriptionCache = () => {
  subscriptionStatusCache = null
  subscriptionStatusCacheTime = null
}






















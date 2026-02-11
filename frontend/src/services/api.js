import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401) {
      // Handle unauthorized - clear token
      localStorage.removeItem('access_token')

      // 이미 로그인 페이지가 아니고, 재시도 요청이 아닌 경우에만 리다이렉트
      if (!originalRequest._retry && !window.location.pathname.includes('/login')) {
        originalRequest._retry = true
        // 로그인 페이지로 리다이렉트 (replace로 히스토리 스택에 남기지 않음)
        window.location.replace('/login')
      }
    }
    return Promise.reject(error)
  }
)

// 기업 분석 API
export const getCompanyAnalysis = async (symbol, includeTechnical = true) => {
  try {
    console.log(`[API] 기업 분석 요청: ${symbol} (기술적 분석: ${includeTechnical})`)
    console.log(`[API] 요청 URL: ${api.defaults.baseURL}/company/${symbol}`)
    const response = await api.get(`/company/${symbol}`, {
      params: { include_technical: includeTechnical },
      timeout: 60000, // 60초 타임아웃
    })
    console.log(`[API] 기업 분석 응답 성공`)
    return response.data
  } catch (error) {
    console.error('[API] 기업 분석 오류:', error)
    console.error('[API] 에러 상세:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      request: error.request,
      config: error.config
    })
    if (error.response) {
      const errorMessage = error.response.data?.detail || error.response.data?.message || `서버 오류 (${error.response.status})`
      throw new Error(errorMessage)
    } else if (error.request) {
      throw new Error('서버에 연결할 수 없습니다. 백엔드 서버가 http://localhost:8000 에서 실행 중인지 확인하세요.')
    } else {
      throw new Error(error.message || '알 수 없는 오류가 발생했습니다.')
    }
  }
}

export const getStockPrice = async (symbol) => {
  try {
    // 포트폴리오 가격 조회 API를 재사용하여 단일 심볼 가격 조회
    const prices = await getPortfolioPrices([symbol])
    if (prices && prices[symbol]) {
      return prices[symbol]
    }
    // 데이터가 없는 경우 기본 구조 반환
    return { price: 0, change: 0, changePercent: 0 }
  } catch (error) {
    console.error(`[API] 주가 조회 오류 (${symbol}):`, error)
    throw new Error('주가 정보를 가져오는데 실패했습니다.')
  }
}

// 배당 분석 API
export const getDividendHistory = async (symbol) => {
  try {
    console.log(`[API] 배당 이력 요청: ${symbol}`)
    console.log(`[API] 요청 URL: ${api.defaults.baseURL}/dividend/${symbol}`)
    const response = await api.get(`/dividend/${symbol}`, {
      timeout: 30000, // 30초 타임아웃
    })
    console.log(`[API] 배당 이력 응답 성공:`, response.data)
    return response.data
  } catch (error) {
    console.error('[API] 배당 이력 오류:', error)
    console.error('[API] 에러 상세:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      request: error.request,
      config: error.config
    })
    if (error.response) {
      // 404나 빈 데이터는 빈 배열 반환
      if (error.response.status === 404) {
        return { dividends: [], company_info: null, five_year_growth_rate: null }
      }
      const errorMessage = error.response.data?.detail || error.response.data?.message || `서버 오류 (${error.response.status})`
      throw new Error(errorMessage)
    } else if (error.request) {
      throw new Error('서버에 연결할 수 없습니다. 백엔드 서버가 http://localhost:8000 에서 실행 중인지 확인하세요.')
    } else {
      throw new Error(error.message || '알 수 없는 오류가 발생했습니다.')
    }
  }
}

// 뉴스 API
export const getNews = async (symbol = null, country = 'us', limit = 20) => {
  try {
    console.log(`[API] 뉴스 요청: symbol=${symbol}, country=${country}, limit=${limit}`)
    const params = { country, limit }
    if (symbol) params.symbol = symbol
    const response = await api.get('/news', { params, timeout: 30000 })
    console.log(`[API] 뉴스 응답:`, response.data)
    console.log(`[API] 뉴스 개수:`, response.data?.news?.length || 0)
    return response.data
  } catch (error) {
    console.error('[API] 뉴스 조회 오류:', error)
    console.error('[API] 오류 상세:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      request: error.request
    })
    if (error.response) {
      const errorMessage = error.response.data?.detail || error.response.data?.message || `서버 오류 (${error.response.status})`
      throw new Error(errorMessage)
    } else if (error.request) {
      throw new Error('서버에 연결할 수 없습니다. 백엔드 서버가 http://localhost:8000 에서 실행 중인지 확인하세요.')
    } else {
      throw new Error(error.message || '알 수 없는 오류가 발생했습니다.')
    }
  }
}

export const getCompanyNews = async (symbol) => {
  try {
    console.log(`[API] 기업 뉴스 요청: ${symbol}`)
    const response = await api.get(`/news/company/${symbol}`, { timeout: 30000 })
    return response.data
  } catch (error) {
    console.error('[API] 기업 뉴스 조회 오류:', error)
    throw new Error(error.response?.data?.detail || error.message || '기업 뉴스 조회 중 오류가 발생했습니다.')
  }
}

// 포트폴리오 API
export const getPortfolio = async () => {
  try {
    const response = await api.get('/portfolio/', { timeout: 30000 })
    return response.data
  } catch (error) {
    console.error('[API] 포트폴리오 조회 오류:', error)
    if (error.response?.status === 401) {
      throw new Error('로그인이 필요합니다.')
    }
    throw new Error(error.response?.data?.detail || error.message || '포트폴리오 조회 중 오류가 발생했습니다.')
  }
}

export const addPortfolioItem = async (symbol, quantity, averagePrice, notes = null) => {
  try {
    const response = await api.post('/portfolio/', {
      symbol: symbol.toUpperCase(),
      quantity: parseFloat(quantity),
      average_price: parseFloat(averagePrice),
      notes: notes || null
    }, { timeout: 30000 })
    return response.data
  } catch (error) {
    console.error('[API] 포트폴리오 추가 오류:', error)
    throw new Error(error.response?.data?.detail || error.message || '포트폴리오 추가 중 오류가 발생했습니다.')
  }
}

export const deletePortfolioItem = async (itemId) => {
  try {
    await api.delete(`/portfolio/${itemId}`, { timeout: 30000 })
    return true
  } catch (error) {
    console.error('[API] 포트폴리오 삭제 오류:', error)
    throw new Error(error.response?.data?.detail || error.message || '포트폴리오 삭제 중 오류가 발생했습니다.')
  }
}

export const getPortfolioPrices = async (symbols) => {
  try {
    const symbolStr = symbols.join(',')
    const response = await api.get(`/portfolio/prices?symbols=${symbolStr}`, { timeout: 30000 })
    return response.data
  } catch (error) {
    console.error('[API] 포트폴리오 가격 조회 오류:', error)
    return {}
  }
}

// 경제 지표 API
export const getEconomicCalendar = async (startDate = null, endDate = null) => {
  try {
    const params = {}
    if (startDate) params.start_date = startDate
    if (endDate) params.end_date = endDate
    const response = await api.get('/economic/calendar', { params, timeout: 60000 }) // 60초로 증가
    return response.data
  } catch (error) {
    console.error('[API] 경제 캘린더 조회 오류:', error)
    // 타임아웃 에러는 조용히 처리 (빈 데이터 반환)
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return { indicator: 'economic_calendar', data: [], source: 'Error', cached: false, updated_at: new Date().toISOString() }
    }
    throw new Error(error.response?.data?.detail || error.message || '경제 캘린더 조회 중 오류가 발생했습니다.')
  }
}

export const getEconomicHighlights = async () => {
  try {
    const response = await api.get('/economic/highlights', { timeout: 30000 })
    return response.data
  } catch (error) {
    console.error('[API] 주요 경제 지표 조회 오류:', error)
    return { indicator: 'macro_highlights', data: [], source: 'Error', cached: false, updated_at: new Date().toISOString() }
  }
}

export const getTreasuryRates = async () => {
  try {
    const response = await api.get('/economic/treasury', { timeout: 30000 })
    return response.data
  } catch (error) {
    console.error('[API] 국채 수익률 조회 오류:', error)
    throw new Error(error.response?.data?.detail || error.message || '국채 수익률 조회 중 오류가 발생했습니다.')
  }
}

export const getMarketIndices = async () => {
  try {
    const response = await api.get('/economic/indices', { timeout: 60000 }) // 60초로 증가
    return response.data
  } catch (error) {
    console.error('[API] 시장 지수 조회 오류:', error)
    // 타임아웃 에러는 조용히 처리 (빈 데이터 반환)
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return { indicator: 'market_indices', data: [], source: 'Error', cached: false, updated_at: new Date().toISOString() }
    }
    throw new Error(error.response?.data?.detail || error.message || '시장 지수 조회 중 오류가 발생했습니다.')
  }
}

export const getTreasuryYahoo = async (maturity = '10y') => {
  try {
    const response = await api.get(`/economic/treasury-yahoo/${maturity}`, { timeout: 30000 })
    return response.data
  } catch (error) {
    console.error('[API] 국채 수익률 조회 오류:', error)
    throw new Error(error.response?.data?.detail || error.message || '국채 수익률 조회 중 오류가 발생했습니다.')
  }
}

// 시장 심리 지수 API
export const getMarketSentiment = async () => {
  try {
    const response = await api.get('/market-sentiment', { timeout: 30000 })
    return response.data
  } catch (error) {
    console.error('[API] 시장 심리 지수 조회 오류:', error)
    throw new Error(error.response?.data?.detail || error.message || '시장 심리 지수 조회 중 오류가 발생했습니다.')
  }
}

// 섹터 로테이션 API
export const getSectorRotation = async () => {
  try {
    const response = await api.get('/sector-rotation', { timeout: 30000 })
    return response.data
  } catch (error) {
    console.error('[API] 섹터 로테이션 조회 오류:', error)
    throw new Error(error.response?.data?.detail || error.message || '섹터 로테이션 조회 중 오류가 발생했습니다.')
  }
}

// 옵션 플로우 API
export const getOptionsFlow = async () => {
  try {
    const response = await api.get('/options-flow', { timeout: 30000 })
    return response.data
  } catch (error) {
    console.error('[API] 옵션 플로우 조회 오류:', error)
    throw new Error(error.response?.data?.detail || error.message || '옵션 플로우 조회 중 오류가 발생했습니다.')
  }
}

// 새로운 경제지표 API 추가
export const getJoblessClaims = async () => {
  try {
    const response = await api.get('/economic/jobless-claims', { timeout: 30000 })
    return response.data
  } catch (error) {
    // Fallback or silent fail
    console.error('[API] 실업수당 청구 건수 조회 오류:', error)
    return { indicator: 'jobless_claims', data: [], source: 'Error', cached: false }
  }
}

export const getConsumerConfidence = async () => {
  try {
    const response = await api.get('/economic/consumer-confidence', { timeout: 30000 })
    return response.data
  } catch (error) {
    console.error('[API] 소비자 신뢰지수 조회 오류:', error)
    return { indicator: 'consumer_confidence', data: [], source: 'Error', cached: false }
  }
}

export const getRetailSales = async () => {
  try {
    const response = await api.get('/economic/retail-sales', { timeout: 30000 })
    return response.data
  } catch (error) {
    console.error('[API] 소매 판매 조회 오류:', error)
    return { indicator: 'retail_sales', data: [], source: 'Error', cached: false }
  }
}

export const getOilPrices = async () => {
  try {
    const response = await api.get('/economic/oil-prices', { timeout: 30000 })
    return response.data
  } catch (error) {
    console.error('[API] 원유 가격 조회 오류:', error)
    return { indicator: 'oil_prices', data: [], source: 'Error', cached: false }
  }
}

export const getPMI = async () => {
  try {
    const response = await api.get('/economic/pmi', { timeout: 30000 })
    return response.data
  } catch (error) {
    console.error('[API] PMI 조회 오류:', error)
    return { indicator: 'pmi', data: [], source: 'Error', cached: false }
  }
}

// 연설 요약 API
export const getFOMCMeetings = async (limit = 10, forceRefresh = false) => {
  try {
    const response = await api.get('/speech/fomc', {
      params: { limit, force_refresh: forceRefresh },
      timeout: 30000
    })
    return response.data
  } catch (error) {
    console.error('[API] FOMC 회의록 조회 오류:', error)
    throw new Error(error.response?.data?.detail || error.message || 'FOMC 회의록 조회 중 오류가 발생했습니다.')
  }
}

export const getSpeechSummary = async (speechId, useOpenAI = false) => {
  try {
    const response = await api.get(`/speech/summary/${speechId}`, {
      params: { use_openai: useOpenAI },
      timeout: 120000  // AI 요약에 시간이 걸릴 수 있음
    })
    return response.data
  } catch (error) {
    console.error('[API] 연설 요약 조회 오류:', error)
    throw new Error(error.response?.data?.detail || error.message || '연설 요약 조회 중 오류가 발생했습니다.')
  }
}

export const getRecentSpeeches = async (limit = 5, forceRefresh = false) => {
  try {
    const response = await api.get('/speech/recent', {
      params: { limit, force_refresh: forceRefresh },
      timeout: 30000
    })
    return response.data
  } catch (error) {
    console.error('[API] 최근 연설문 조회 오류:', error)
    throw new Error(error.response?.data?.detail || error.message || '최근 연설문 조회 중 오류가 발생했습니다.')
  }
}

// 구독제 API
export const getSubscriptionPlans = async () => {
  try {
    const response = await api.get('/subscription/plans', { timeout: 30000 })
    return response.data
  } catch (error) {
    console.error('[API] 구독 플랜 조회 오류:', error)
    throw new Error(error.response?.data?.detail || error.message || '구독 플랜 조회 중 오류가 발생했습니다.')
  }
}

export const createCheckoutSession = async () => {
  try {
    const response = await api.post('/subscription/checkout', {}, { timeout: 30000 })
    return response.data
  } catch (error) {
    console.error('[API] 결제 세션 생성 오류:', error)
    throw new Error(error.response?.data?.detail || error.message || '결제 세션 생성 중 오류가 발생했습니다.')
  }
}

export const getSubscriptionStatus = async () => {
  try {
    const response = await api.get('/subscription/status', { timeout: 30000 })
    return response.data
  } catch (error) {
    console.error('[API] 구독 상태 조회 오류:', error)
    throw new Error(error.response?.data?.detail || error.message || '구독 상태 조회 중 오류가 발생했습니다.')
  }
}

export const cancelSubscription = async () => {
  try {
    const response = await api.post('/subscription/cancel', {}, { timeout: 30000 })
    return response.data
  } catch (error) {
    console.error('[API] 구독 취소 오류:', error)
    throw new Error(error.response?.data?.detail || error.message || '구독 취소 중 오류가 발생했습니다.')
  }
}

// API 서비스 객체로 export (더 편리한 사용을 위해)
const apiService = {
  getCompanyAnalysis,
  getStockPrice,
  getDividendHistory,
  getNews,
  getCompanyNews,
  getPortfolio,
  addPortfolioItem,
  deletePortfolioItem,
  getPortfolioPrices,
  getEconomicCalendar,
  getEconomicHighlights,
  getTreasuryRates,
  getMarketIndices,
  getTreasuryYahoo,
  getMarketSentiment,
  getSectorRotation,
  getOptionsFlow,
  getJoblessClaims,
  getConsumerConfidence,
  getRetailSales,
  getOilPrices,
  getPMI,
  getFOMCMeetings,
  getSpeechSummary,
  getRecentSpeeches,
  getRecentSpeeches,
  getSubscriptionPlans,
  createCheckoutSession,
  getSubscriptionStatus,
  cancelSubscription,
}

// axios 인스턴스도 export (auth.js에서 사용)
export default apiService
export { api }

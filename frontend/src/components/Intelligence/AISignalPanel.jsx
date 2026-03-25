import React, { useState, useEffect } from 'react'
import { AlertTriangle, Eye, Zap, TrendingUp } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'

export default function AISignalPanel({ selectedStock, selectedTheme }) {
  const { t, lang } = useLanguage()
  const [signals, setSignals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterSignal, setFilterSignal] = useState('all')
  const [symbols, setSymbols] = useState('')

  // 기본 주요 종목
  const DEFAULT_SYMBOLS = ['005930', '000660', 'AAPL', 'MSFT', 'NVDA', '373220', '051910', 'TSLA']

  useEffect(() => {
    // selectedStock이나 selectedTheme이 변하면 업데이트
    if (selectedStock) {
      setSymbols(selectedStock)
    } else if (selectedTheme) {
      setSymbols('')
    } else {
      setSymbols(DEFAULT_SYMBOLS.join(','))
    }
  }, [selectedStock, selectedTheme])

  useEffect(() => {
    if (symbols) {
      fetchAISignals(symbols)
    }
  }, [symbols])

  const fetchAISignals = async (syms) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/intelligence/ai-signals?symbols=${syms}`)
      if (!response.ok) throw new Error('Failed to fetch AI signals')
      const data = await response.json()
      setSignals(data.signals || [])
    } catch (err) {
      console.error('[AISignalPanel]', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredSignals = filterSignal === 'all' ? signals : signals.filter((s) => s.signal === filterSignal)

  const getSignalColor = (signal) => {
    switch (signal) {
      case 'buy':
        return 'bg-secondary/20 border-secondary text-secondary'
      case 'watch':
        return 'bg-surface-container border-outline-variant text-on-surface'
      case 'caution':
        return 'bg-[#FF8C00]/20 border-[#FF8C00] text-[#FF8C00]'
      default:
        return 'bg-surface-container border-outline-variant text-on-surface'
    }
  }

  const getSignalIcon = (signal) => {
    switch (signal) {
      case 'buy':
        return <Zap size={16} />
      case 'watch':
        return <Eye size={16} />
      case 'caution':
        return <AlertTriangle size={16} />
      default:
        return <Eye size={16} />
    }
  }

  const getSignalLabel = (signal) => {
    switch (signal) {
      case 'buy':
        return '매수 적기'
      case 'watch':
        return '관망'
      case 'caution':
        return '주의'
      default:
        return '중립'
    }
  }

  const formatUpdatedAt = (isoString) => {
    try {
      const date = new Date(isoString)
      const now = new Date()
      const diffMs = now - date
      const diffMin = Math.floor(diffMs / 60000)
      const diffHour = Math.floor(diffMs / 3600000)

      if (diffMin < 1) return '방금 전'
      if (diffMin < 60) return `${diffMin}분 전`
      if (diffHour < 24) return `${diffHour}시간 전`
      return date.toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US')
    } catch {
      return '정보 없음'
    }
  }

  if (error) {
    return (
      <div className="bg-surface-container rounded-2xl border border-outline-variant/20 p-6">
        <div className="text-sm text-error">{error}</div>
      </div>
    )
  }

  return (
    <div className="bg-surface-container rounded-2xl border border-outline-variant/20 p-6">
      {/* 헤더 */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold font-headline text-on-surface">
            🤖 {t('intelligence.aiSignals') || 'AI 매수·매도 시그널'}
          </h3>
          <p className="text-xs text-on-surface-variant mt-1">
            기술적 지표 + Groq AI 분석
          </p>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-on-surface-variant">
            <div className="w-2 h-2 rounded-full bg-on-surface-variant animate-pulse" />
            <span className="text-xs">분석 중...</span>
          </div>
        )}
      </div>

      {/* 필터 탭 */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {[
          { value: 'all', label: '전체', count: signals.length },
          { value: 'buy', label: '매수 적기', count: signals.filter((s) => s.signal === 'buy').length },
          { value: 'watch', label: '관망', count: signals.filter((s) => s.signal === 'watch').length },
          { value: 'caution', label: '주의', count: signals.filter((s) => s.signal === 'caution').length },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilterSignal(tab.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              filterSignal === tab.value
                ? 'bg-primary-container text-on-primary-container'
                : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {tab.label} <span className="ml-1 opacity-70">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* 시그널 카드 그리드 */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border-2 border-outline-variant/20 p-4 animate-pulse">
              <div className="h-4 bg-surface-container-high rounded w-3/4 mb-4" />
              <div className="h-3 bg-surface-container-high rounded w-1/2 mb-4" />
              <div className="space-y-2">
                <div className="h-3 bg-surface-container-high rounded w-full" />
                <div className="h-3 bg-surface-container-high rounded w-5/6" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredSignals.length === 0 ? (
        <div className="flex items-center justify-center h-40">
          <div className="text-sm text-on-surface-variant">
            {selectedStock ? '선택된 종목의 시그널이 없습니다' : '데이터를 불러오는 중입니다'}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSignals.map((signal) => (
            <div
              key={signal.symbol}
              className={`rounded-lg border-2 p-4 transition-all hover:shadow-lg ${getSignalColor(signal.signal)}`}
            >
              {/* 상단: 종목명 + 시그널 뱃지 */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-bold text-on-surface">{signal.name}</div>
                  <div className="text-xs text-on-surface-variant">{signal.symbol}</div>
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${getSignalColor(signal.signal)}`}>
                  {getSignalIcon(signal.signal)}
                  {getSignalLabel(signal.signal)}
                </div>
              </div>

              {/* 현재가 */}
              <div className="mb-3 pb-3 border-b border-current border-opacity-20">
                <div className="text-sm font-headline font-bold text-on-surface">
                  {signal.price > 1000
                    ? `₩${signal.price.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`
                    : `$${signal.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`}
                </div>
              </div>

              {/* AI 논평 */}
              <div className="mb-3">
                <p className="text-xs leading-relaxed text-on-surface">{signal.comment}</p>
              </div>

              {/* 기술적 지표 & Confidence */}
              <div className="space-y-2">
                {/* RSI 배지 */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-on-surface-variant">RSI(14)</span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded ${
                      signal.rsi >= 70
                        ? 'bg-error/20 text-error'
                        : signal.rsi <= 30
                          ? 'bg-secondary/20 text-secondary'
                          : 'bg-on-surface-variant/20 text-on-surface-variant'
                    }`}
                  >
                    {signal.rsi.toFixed(1)}
                  </span>
                </div>

                {/* Confidence Bar */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-on-surface-variant">확실도</span>
                    <span className="text-xs font-bold">{signal.confidence}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-container-highest overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        signal.signal === 'buy'
                          ? 'bg-secondary'
                          : signal.signal === 'caution'
                            ? 'bg-[#FF8C00]'
                            : 'bg-on-surface-variant'
                      }`}
                      style={{ width: `${signal.confidence}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* 하단: 업데이트 시간 */}
              <div className="mt-3 pt-3 border-t border-current border-opacity-20">
                <div className="text-xs text-on-surface-variant text-center">
                  {formatUpdatedAt(signal.updated_at)} 분석
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

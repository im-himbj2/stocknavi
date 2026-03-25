import React, { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Zap } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'

export default function SmartMoneyTracker({ onSelectStock }) {
  const { t, lang } = useLanguage()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchSmartMoney()
  }, [])

  const fetchSmartMoney = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/intelligence/smart-money')
      if (!response.ok) throw new Error('Failed to fetch smart money data')
      const data = await response.json()
      setItems(data.items || [])
    } catch (err) {
      console.error('[SmartMoneyTracker]', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-surface-container rounded-2xl border border-outline-variant/20 p-6">
        <h3 className="text-base font-bold font-headline text-on-surface mb-4">
          {t('intelligence.smartMoney') || '🤖 스마트머니 트래커'}
        </h3>
        <div className="flex items-center justify-center h-64">
          <div className="text-on-surface-variant">로딩 중...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-surface-container rounded-2xl border border-outline-variant/20 p-6">
        <h3 className="text-base font-bold font-headline text-on-surface mb-4">
          {t('intelligence.smartMoney') || '🤖 스마트머니 트래커'}
        </h3>
        <div className="text-sm text-error">{error}</div>
      </div>
    )
  }

  return (
    <div className="bg-surface-container rounded-2xl border border-outline-variant/20 p-6">
      {/* 헤더 */}
      <div className="mb-6">
        <h3 className="text-base font-bold font-headline text-on-surface mb-2">
          🤖 {t('intelligence.smartMoney') || '스마트머니 트래커'}
        </h3>
        <p className="text-xs text-on-surface-variant">
          외국인 + 기관 동시 순매수 종목
        </p>
      </div>

      {/* 카드 리스트 */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {items.length === 0 ? (
          <div className="text-sm text-on-surface-variant text-center py-8">
            데이터 없음
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.ticker}
              onClick={() => onSelectStock?.(item.ticker)}
              className="bg-surface-container-low hover:bg-surface-container-high rounded-lg p-4 border border-outline-variant/10 cursor-pointer transition-all hover:border-primary-container/50"
            >
              {/* 상단 행: 랭킹 + 종목명 + 현재가 */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* 랭킹 뱃지 */}
                  <div className="w-6 h-6 rounded-full bg-primary-container/20 flex items-center justify-center text-xs font-bold text-primary-container shrink-0">
                    {item.rank}
                  </div>

                  {/* 종목명 */}
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-on-surface truncate">
                      {item.name}
                    </div>
                    <div className="text-xs text-on-surface-variant">
                      {item.ticker}
                    </div>
                  </div>
                </div>

                {/* 현재가 + 등락률 */}
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-on-surface">
                    ₩{item.price.toLocaleString()}
                  </div>
                  <div className={`text-xs font-bold flex items-center justify-end gap-1 ${
                    item.change_pct >= 0 ? 'text-secondary' : 'text-error'
                  }`}>
                    {item.change_pct >= 0 ? (
                      <TrendingUp size={12} />
                    ) : (
                      <TrendingDown size={12} />
                    )}
                    {Math.abs(item.change_pct).toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* 중간 행: 스코어 게이지바 */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-on-surface-variant">매수 강도</span>
                  <span className="text-xs font-bold text-primary-container">
                    {item.score.toFixed(1)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-surface-container-highest overflow-hidden">
                  <div
                    className="h-full bg-primary-container rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (item.score / 10) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* 하단 행: 거래량 급증 + 수급 데이터 */}
              <div className="space-y-2 text-xs">
                {/* 거래량 급증 뱃지 */}
                {item.vol_surge_pct > 50 && (
                  <div className="flex items-center gap-1 text-secondary">
                    <Zap size={12} />
                    <span className="font-bold">
                      거래량 +{item.vol_surge_pct.toFixed(0)}%
                    </span>
                  </div>
                )}

                {/* 외국인·기관 수급 */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center justify-between bg-surface-container rounded px-2 py-1">
                    <span className="text-on-surface-variant">외국인</span>
                    <span className="font-bold text-secondary">
                      ₩{(item.foreign_net / 1e8).toFixed(1)}억
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-surface-container rounded px-2 py-1">
                    <span className="text-on-surface-variant">기관</span>
                    <span className="font-bold text-secondary">
                      ₩{(item.institution_net / 1e8).toFixed(1)}억
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

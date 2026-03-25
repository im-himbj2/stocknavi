import React, { useState, useEffect } from 'react'
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts'
import { useLanguage } from '../../contexts/LanguageContext'

const COLORS = {
  up: '#1E90FF',    // 파랑 (상승)
  down: '#FF4444',  // 빨강 (하락)
}

export default function ThemeHeatmap({ onSelectTheme, onSelectStock }) {
  const { t, lang } = useLanguage()
  const [themes, setThemes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedTheme, setSelectedTheme] = useState(null)

  useEffect(() => {
    fetchThemeHeatmap()
  }, [])

  const fetchThemeHeatmap = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/intelligence/theme-heatmap')
      if (!response.ok) throw new Error('Failed to fetch theme heatmap')
      const data = await response.json()
      // 트리맵용 데이터 변환
      const treemapData = (data.themes || []).map((theme) => ({
        name: theme.name,
        value: Math.max(1, Math.abs(theme.weight)),
        change_pct: theme.change_pct,
        stocks: theme.stocks,
      }))
      setThemes(treemapData)
    } catch (err) {
      console.error('[ThemeHeatmap]', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const CustomTreemapContent = (props) => {
    const { x, y, width, height, name, change_pct } = props
    if (width < 50 || height < 50) return null

    const isUp = change_pct >= 0
    const color = isUp ? COLORS.up : COLORS.down
    const opacity = Math.min(0.3 + Math.abs(change_pct) / 100, 1)

    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: color,
            opacity: opacity,
            stroke: color,
            strokeWidth: 1,
            cursor: 'pointer',
          }}
          onClick={() => {
            setSelectedTheme(name)
            onSelectTheme?.(name)
          }}
        />
        <text
          x={x + width / 2}
          y={y + height / 2 - 8}
          textAnchor="middle"
          fill="white"
          fontSize="12"
          fontWeight="bold"
        >
          {name}
        </text>
        <text
          x={x + width / 2}
          y={y + height / 2 + 8}
          textAnchor="middle"
          fill="white"
          fontSize="14"
          fontWeight="bold"
        >
          {change_pct >= 0 ? '+' : ''}{change_pct.toFixed(2)}%
        </text>
      </g>
    )
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload[0]) {
      const { name, change_pct, stocks } = payload[0].payload
      return (
        <div className="bg-surface-container-high border border-primary-container/30 rounded p-3 shadow-lg">
          <div className="font-bold text-on-surface mb-2">{name}</div>
          <div className={`text-sm font-bold mb-2 ${change_pct >= 0 ? 'text-secondary' : 'text-error'}`}>
            {change_pct >= 0 ? '+' : ''}{change_pct.toFixed(2)}%
          </div>
          <div className="text-xs text-on-surface-variant space-y-1">
            {stocks.slice(0, 3).map((stock) => (
              <div key={stock.ticker} className="flex justify-between gap-2">
                <span>{stock.name}</span>
                <span className={stock.change_pct >= 0 ? 'text-secondary' : 'text-error'}>
                  {stock.change_pct >= 0 ? '+' : ''}{stock.change_pct.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="bg-surface-container rounded-2xl border border-outline-variant/20 p-6">
        <h3 className="text-base font-bold font-headline text-on-surface mb-4">
          🔥 {t('intelligence.themeHeatmap') || '테마 히트맵'}
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
          🔥 {t('intelligence.themeHeatmap') || '테마 히트맵'}
        </h3>
        <div className="text-sm text-error">{error}</div>
      </div>
    )
  }

  return (
    <div className="bg-surface-container rounded-2xl border border-outline-variant/20 p-6">
      {/* 헤더 */}
      <div className="mb-4">
        <h3 className="text-base font-bold font-headline text-on-surface mb-2">
          🔥 {t('intelligence.themeHeatmap') || '테마 히트맵'}
        </h3>
        <p className="text-xs text-on-surface-variant">
          박스 크기 = 투자 규모 | 색상: 파랑(상승) 빨강(하락)
        </p>
      </div>

      {/* 트리맵 차트 */}
      <div className="h-64 -mx-6 px-6">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={themes}
            dataKey="value"
            stroke="#fff"
            fill="#8884d8"
            content={<CustomTreemapContent />}
            tooltip={<CustomTooltip />}
          />
        </ResponsiveContainer>
      </div>

      {/* 선택된 테마 정보 */}
      {selectedTheme && (
        <div className="mt-4 p-3 bg-surface-container-low rounded-lg border border-primary-container/20">
          <div className="text-sm font-bold text-on-surface mb-2">{selectedTheme} 관련 주요 종목</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {themes
              .find((t) => t.name === selectedTheme)
              ?.stocks.slice(0, 4)
              .map((stock) => (
                <div
                  key={stock.ticker}
                  onClick={() => onSelectStock?.(stock.ticker)}
                  className="bg-surface-container rounded px-2 py-1 cursor-pointer hover:bg-primary-container/10 transition-all"
                >
                  <div className="font-bold text-on-surface truncate">{stock.name}</div>
                  <div className={stock.change_pct >= 0 ? 'text-secondary' : 'text-error'}>
                    {stock.change_pct >= 0 ? '+' : ''}{stock.change_pct.toFixed(2)}%
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

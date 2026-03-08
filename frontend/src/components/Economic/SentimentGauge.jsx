import React from 'react'
import BloombergPanelWrapper, { Skeleton } from './BloombergPanelWrapper'
import { useLanguage } from '../../contexts/LanguageContext'

const getColor = (v) => {
  if (v < 25) return '#dc2626'
  if (v < 45) return '#ea580c'
  if (v < 55) return '#ca8a04'
  if (v < 75) return '#22c55e'
  return '#16a34a'
}

const SentimentGauge = ({ value = null, loading = false }) => {
  const { t } = useLanguage()

  const getLabel = (v) => {
    if (v < 25) return t('economic.extremeFear')
    if (v < 45) return t('economic.fear')
    if (v < 55) return t('economic.neutral')
    if (v < 75) return t('economic.greed')
    return t('economic.extremeGreed')
  }

  const score = value != null ? Math.max(0, Math.min(100, Number(value))) : null
  const color = score != null ? getColor(score) : '#4b5563'
  const label = score != null ? getLabel(score) : '—'

  // Arc: semicircle from 180° to 0° (left to right = Fear to Greed)
  const arcLen = 251.33
  const dashLen = score != null ? (score / 100) * arcLen : 0
  const needleAngle = score != null ? (score / 100) * 180 - 90 : -90

  return (
    <BloombergPanelWrapper title={t('economic.fearGreed')} badge="CNN">
      {loading
        ? <div className="flex flex-col items-center gap-2 py-2"><Skeleton className="w-36 h-20" /><Skeleton className="w-16 h-5" /></div>
        : (
          <div className="flex flex-col items-center">
            <svg viewBox="0 0 200 115" className="w-full max-w-[180px]" xmlns="http://www.w3.org/2000/svg">
              {/* Background arc */}
              <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#1a3a5c" strokeWidth="14" strokeLinecap="round" />
              {/* Color arc */}
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke={color}
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={`${dashLen} ${arcLen}`}
                style={{ transition: 'stroke-dasharray 0.6s ease' }}
              />
              {/* Zone labels */}
              <text x="10" y="115" fontSize="7" fill="#dc2626" fontFamily="monospace">FEAR</text>
              <text x="155" y="115" fontSize="7" fill="#16a34a" fontFamily="monospace">GREED</text>
              {/* Needle */}
              <g transform={`translate(100,100) rotate(${needleAngle})`}>
                <line x1="0" y1="4" x2="0" y2="-58" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              </g>
              {/* Hub */}
              <circle cx="100" cy="100" r="5" fill={color} />
            </svg>
            <p className="text-2xl font-mono font-bold text-white mt-1">{score ?? '—'}</p>
            <p className="text-[11px] font-mono font-bold mt-0.5" style={{ color }}>{label}</p>
          </div>
        )
      }
    </BloombergPanelWrapper>
  )
}

export default SentimentGauge

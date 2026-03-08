import React from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import BloombergPanelWrapper, { Skeleton } from './BloombergPanelWrapper'
import { useLanguage } from '../../contexts/LanguageContext'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0a1929] border border-[#1a3a5c] px-2 py-1.5 text-[11px] font-mono">
      <p className="text-[#5ba4d4]">{label}</p>
      <p className="text-white font-bold">{payload[0]?.value?.toFixed(3)}%</p>
    </div>
  )
}

const YieldCurveChart = ({ curveData = [], loading = false }) => {
  const { t } = useLanguage()
  const isInverted = curveData.length >= 2 && curveData[0]?.yield > curveData[curveData.length - 1]?.yield

  return (
    <BloombergPanelWrapper
      title={t('economic.yieldCurve')}
      badge={isInverted ? t('economic.inverted') : t('economic.normal')}
    >
      {loading
        ? <Skeleton className="h-40 w-full" />
        : curveData.length > 0
          ? (
            <div>
              {isInverted && (
                <p className="text-[9px] font-mono text-amber-400 mb-2 flex items-center gap-1">
                  {t('economic.inversionWarning')}
                </p>
              )}
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={curveData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                  <defs>
                    <linearGradient id="yieldGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0070cc" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0070cc" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke="#1a3a5c" />
                  <XAxis
                    dataKey="maturity"
                    tick={{ fill: '#5ba4d4', fontSize: 9, fontFamily: 'monospace' }}
                    axisLine={{ stroke: '#1a3a5c' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#5ba4d4', fontSize: 9, fontFamily: 'monospace' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => `${v}%`}
                    domain={['dataMin - 0.2', 'dataMax + 0.2']}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="yield"
                    stroke="#0070cc"
                    strokeWidth={2}
                    fill="url(#yieldGrad)"
                    dot={{ r: 3, fill: '#0070cc', strokeWidth: 0 }}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
              {/* Point values */}
              <div className="flex justify-around mt-2">
                {curveData.map(d => (
                  <div key={d.maturity} className="text-center">
                    <p className="text-[9px] font-mono text-gray-500">{d.maturity}</p>
                    <p className="text-[11px] font-mono font-bold text-white">{d.yield?.toFixed(2)}%</p>
                  </div>
                ))}
              </div>
            </div>
          )
          : <p className="text-[10px] text-gray-600 font-mono py-6 text-center">{t('economic.noYieldData')}</p>
      }
    </BloombergPanelWrapper>
  )
}

export default YieldCurveChart

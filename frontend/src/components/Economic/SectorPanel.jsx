import React from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import BloombergPanelWrapper, { Skeleton } from './BloombergPanelWrapper'
import { useLanguage } from '../../contexts/LanguageContext'

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]
  const isPos = d.value >= 0
  return (
    <div className="bg-[#0a1929] border border-[#1a3a5c] px-2 py-1.5 text-[11px] font-mono">
      <p className="text-[#5ba4d4]">{d.payload.name}</p>
      <p className={`font-bold ${isPos ? 'text-green-400' : 'text-red-400'}`}>
        {isPos ? '+' : ''}{d.value.toFixed(2)}%
      </p>
    </div>
  )
}

const SectorPanel = ({ sectors = [], loading = false }) => {
  const { t } = useLanguage()
  const sorted = [...sectors].sort((a, b) => b.change_percent - a.change_percent)

  return (
    <BloombergPanelWrapper title={t('economic.sectorPerformance')} badge="1M">
      {loading
        ? <Skeleton className="h-52 w-full" />
        : sorted.length > 0
          ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={sorted}
                layout="vertical"
                margin={{ top: 0, right: 36, bottom: 0, left: 4 }}
              >
                <CartesianGrid strokeDasharray="2 4" stroke="#1a3a5c" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: '#5ba4d4', fontSize: 9, fontFamily: 'monospace' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => `${v > 0 ? '+' : ''}${v}%`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={58}
                  tick={{ fill: '#9ca3af', fontSize: 9, fontFamily: 'monospace' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1a3a5c30' }} />
                <Bar dataKey="change_percent" radius={[0, 2, 2, 0]} isAnimationActive={false}>
                  {sorted.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.change_percent >= 0 ? '#22c55e' : '#ef4444'}
                      fillOpacity={0.85}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )
          : <p className="text-[10px] text-gray-600 font-mono py-6 text-center">{t('economic.noSectorData')}</p>
      }
    </BloombergPanelWrapper>
  )
}

export default SectorPanel

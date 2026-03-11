import React from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useLanguage } from '../../contexts/LanguageContext'
import BloombergPanelWrapper from '../Economic/BloombergPanelWrapper'

const DATA_LAST_UPDATED = '2026-03-10'

// 가계부채 GDP 비율 추이 (한국은행, %)
const DEBT_TREND = [
  { year: '2018', value: 93.3 }, { year: '2019', value: 95.2 }, { year: '2020', value: 103.8 },
  { year: '2021', value: 106.7 }, { year: '2022', value: 104.5 }, { year: '2023', value: 101.5 },
  { year: '2024', value: 98.4 },
]

// 합계출산율 추이 (통계청, 명)
const BIRTH_TREND = [
  { year: '2018', value: 0.98 }, { year: '2019', value: 0.92 }, { year: '2020', value: 0.84 },
  { year: '2021', value: 0.81 }, { year: '2022', value: 0.78 }, { year: '2023', value: 0.72 },
  { year: '2024', value: 0.75 },
]

// 핵심 취약 지표
const VULN_METRICS = [
  {
    key: 'householdDebt',
    valueStr: '98.4%',
    worldRank: 1,
    trendKey: 'trendDown',
    trendData: DEBT_TREND,
    noteKey: 'debtNote',
    color: '#dc2626',
    unit: '% of GDP',
    yDomain: [85, 115],
  },
  {
    key: 'birthRate',
    valueStr: '0.75',
    worldRank: 1,
    trendKey: 'trendDown',
    trendData: BIRTH_TREND,
    noteKey: 'birthNote',
    color: '#ea580c',
    unit: lang => lang === 'ko' ? '명/여성' : 'per woman',
    yDomain: [0.6, 1.1],
  },
  {
    key: 'semiDep',
    valueStr: '22%',
    worldRank: null,
    trendKey: 'trendUp',
    trendData: null,
    noteKey: 'semiNote',
    color: '#0070cc',
    unit: lang => lang === 'ko' ? '총수출 비중' : 'of total exports',
    yDomain: null,
  },
  {
    key: 'youthUnemp',
    valueStr: '6.1%',
    worldRank: null,
    trendKey: 'trendFlat',
    trendData: null,
    noteKey: 'youthNote',
    color: '#ca8a04',
    unit: lang => lang === 'ko' ? '15~29세' : 'ages 15-29',
    yDomain: null,
  },
]

const TREND_COLORS = { trendDown: '#dc2626', trendUp: '#22c55e', trendFlat: '#ca8a04' }
const TREND_ICONS  = { trendDown: '▼', trendUp: '▲', trendFlat: '→' }

const MiniChart = ({ data, color, yDomain }) => (
  <ResponsiveContainer width="100%" height={40}>
    <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: -30 }}>
      <XAxis dataKey="year" tick={{ fill: '#4b6280', fontSize: 7, fontFamily: 'monospace' }} />
      <YAxis domain={yDomain} tick={{ fill: '#4b6280', fontSize: 7, fontFamily: 'monospace' }} />
      <Tooltip
        contentStyle={{ backgroundColor: '#050d18', border: '1px solid #1a3a5c', borderRadius: 2, fontSize: 9, fontFamily: 'monospace' }}
        itemStyle={{ color: '#e2e8f0' }}
        labelStyle={{ color: '#6b7280' }}
      />
      <Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} dot={false} />
    </LineChart>
  </ResponsiveContainer>
)

export default function KoreaEconomyPanel() {
  const { t, lang } = useLanguage()

  return (
    <BloombergPanelWrapper title={t('korea.econVulnerability')} badge={t('korea.econBadge')}>
      <div className="grid grid-cols-2 gap-3">
        {VULN_METRICS.map((m) => {
          const tColor = TREND_COLORS[m.trendKey]
          const tIcon  = TREND_ICONS[m.trendKey]
          const unitStr = typeof m.unit === 'function' ? m.unit(lang) : m.unit

          return (
            <div key={m.key} className="bg-[#0a1929] border border-[#1a3a5c] rounded p-2.5">
              {/* 지표명 + 추세 */}
              <div className="flex items-center justify-between mb-1">
                <p className="text-[9px] font-mono text-gray-500 uppercase tracking-wide">{t(`korea.${m.key}`)}</p>
                <span className="text-[9px] font-mono font-bold" style={{ color: tColor }}>
                  {tIcon} {t(`korea.${m.trendKey}`)}
                </span>
              </div>

              {/* 수치 */}
              <p className="text-2xl font-mono font-bold mb-0.5" style={{ color: m.color }}>
                {m.valueStr}
              </p>
              <p className="text-[8px] font-mono text-gray-600 mb-1.5">
                {unitStr}
                {m.worldRank && (
                  <span className="ml-1.5 font-bold" style={{ color: m.color }}>
                    {t('korea.worldRank')} {m.worldRank}{t('korea.rankSuffix')}
                  </span>
                )}
              </p>

              {/* 미니 차트 (데이터 있을 때만) */}
              {m.trendData && (
                <div className="mb-1.5">
                  <MiniChart data={m.trendData} color={m.color} yDomain={m.yDomain} />
                </div>
              )}

              {/* 설명 노트 */}
              <p className="text-[8px] font-mono text-gray-500 leading-snug border-t border-[#1a3a5c]/40 pt-1.5">
                {t(`korea.${m.noteKey}`)}
              </p>
            </div>
          )
        })}
      </div>

      <div className="mt-3 pt-2 border-t border-[#1a3a5c]/40 flex justify-between">
        <span className="text-[8px] font-mono text-gray-700">Sources: 한국은행 · 통계청 · 산업통상자원부 · OECD</span>
        <span className="text-[8px] font-mono text-gray-700">{DATA_LAST_UPDATED}</span>
      </div>
    </BloombergPanelWrapper>
  )
}

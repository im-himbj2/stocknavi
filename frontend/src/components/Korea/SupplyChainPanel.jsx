import React from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useLanguage } from '../../contexts/LanguageContext'
import BloombergPanelWrapper from '../Economic/BloombergPanelWrapper'

const DATA_LAST_UPDATED = '2026-03-10'

// 주요 산업 수출 현황 (2024, 억달러, KITA/산업통상자원부)
const EXPORT_DATA = [
  { nameKo: '반도체',   nameEn: 'Semicon.',  value: 1317, color: '#0070cc' },
  { nameKo: '자동차',   nameEn: 'Auto',      value: 709,  color: '#22c55e' },
  { nameKo: '석유제품', nameEn: 'Petroleum', value: 463,  color: '#ca8a04' },
  { nameKo: '배터리',   nameEn: 'Battery',   value: 312,  color: '#a855f7' },
  { nameKo: '철강',     nameEn: 'Steel',     value: 285,  color: '#6b7280' },
  { nameKo: '조선',     nameEn: 'Shipbuild', value: 247,  color: '#14b8a6' },
]

// 산업별 공급망 리스크 카드
const INDUSTRY_RISKS = [
  {
    keyKo: 'semiconductorTitle', keyEn: 'semiconductorTitle',
    icon: '💾',
    riskLevel: 'high',
    exportPct: '22%',
    pointsKo: [
      'HBM: 미국 對중국 수출통제 → 삼성·하이닉스 직격',
      'TSMC 미국 이전 → 파운드리 경쟁 심화',
      '중국 반도체 자립화 가속 (CXMT, YMTC)',
    ],
    pointsEn: [
      'HBM: US export controls on China → Direct impact on Samsung/SK Hynix',
      'TSMC US fabs → Intensifying foundry competition',
      'China semiconductor self-sufficiency accelerating (CXMT, YMTC)',
    ],
  },
  {
    keyKo: 'batteryTitle', keyEn: 'batteryTitle',
    icon: '🔋',
    riskLevel: 'high',
    exportPct: '5.2%',
    pointsKo: [
      '미국 IRA 보조금 → 중국산 배터리 우회 문제',
      '리튬·코발트 원자재 100% 수입 의존',
      'BYD·CATL 저가 공세 → 가격 경쟁력 약화',
    ],
    pointsEn: [
      'US IRA subsidies → Issues with circumventing Chinese batteries',
      '100% import dependency for Li/Co raw materials',
      'BYD/CATL price pressure → Weakening price competitiveness',
    ],
  },
  {
    keyKo: 'autoTitle', keyEn: 'autoTitle',
    icon: '🚗',
    riskLevel: 'med',
    exportPct: '11.8%',
    pointsKo: [
      '미국 EV 보조금 조건 → 현대·기아 수혜',
      'UAW·관세 리스크 (트럼프 25% 자동차 관세)',
      '전동화 전환 속도 압박',
    ],
    pointsEn: [
      'US EV subsidy conditions → Hyundai/Kia benefiting',
      'UAW & tariff risk (Trump 25% auto tariff)',
      'Pressure from electrification transition speed',
    ],
  },
  {
    keyKo: 'steelTitle', keyEn: 'steelTitle',
    icon: '⚓',
    riskLevel: 'low',
    exportPct: '4.7%',
    pointsKo: [
      '중국산 저가 철강 덤핑 지속',
      '수주 잔량 역대 최대 (조선)',
      'LNG 운반선 수요 급증',
    ],
    pointsEn: [
      'Continued Chinese low-price steel dumping',
      'Record-high shipbuilding backlog',
      'Surging LNG carrier demand',
    ],
  },
]

const RISK_COLORS = { high: '#dc2626', med: '#ea580c', low: '#22c55e' }
const RISK_LABELS = { ko: { high: '높음', med: '보통', low: '낮음' }, en: { high: 'High', med: 'Med', low: 'Low' } }

const CustomTooltip = ({ active, payload, lang }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-[#050d18] border border-[#1a3a5c] rounded p-2 text-[10px] font-mono">
      <p className="text-white font-bold">{lang === 'ko' ? d.nameKo : d.nameEn}</p>
      <p className="text-[#5ba4d4]">{d.value.toLocaleString()} {lang === 'ko' ? '억달러' : '$100M'}</p>
    </div>
  )
}

export default function SupplyChainPanel() {
  const { t, lang } = useLanguage()

  return (
    <BloombergPanelWrapper title={t('korea.supplyChain')} badge={t('korea.supplyBadge')}>
      {/* 수출 바 차트 */}
      <div className="mb-4">
        <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-2">{t('korea.exportChart')}</p>
        <ResponsiveContainer width="100%" height={100}>
          <BarChart data={EXPORT_DATA} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
            <XAxis dataKey={lang === 'ko' ? 'nameKo' : 'nameEn'} tick={{ fill: '#6b7280', fontSize: 9, fontFamily: 'monospace' }} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 8, fontFamily: 'monospace' }} />
            <Tooltip content={<CustomTooltip lang={lang} />} />
            <Bar dataKey="value" radius={[2, 2, 0, 0]}>
              {EXPORT_DATA.map((d) => <Cell key={d.nameKo} fill={d.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 산업별 리스크 카드 그리드 */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {INDUSTRY_RISKS.map((ind) => {
          const rColor = RISK_COLORS[ind.riskLevel]
          const rLabel = RISK_LABELS[lang][ind.riskLevel]
          const points = lang === 'ko' ? ind.pointsKo : ind.pointsEn
          return (
            <div key={ind.keyKo} className="bg-[#0a1929] border border-[#1a3a5c] rounded p-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono font-bold text-white">
                  {ind.icon} {t(`korea.${ind.keyKo}`)}
                </span>
                <span
                  className="text-[8px] font-mono px-1 py-0.5 rounded"
                  style={{ backgroundColor: rColor + '25', border: `1px solid ${rColor}55`, color: rColor }}
                >
                  {rLabel}
                </span>
              </div>
              <p className="text-[8px] font-mono text-gray-500 mb-1.5">
                {t('korea.exportShare')}: <span className="text-[#5ba4d4]">{ind.exportPct}</span>
              </p>
              <ul className="space-y-0.5">
                {points.map((pt, i) => (
                  <li key={i} className="text-[8px] font-mono text-gray-400 leading-snug">· {pt}</li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      {/* 미중 반도체 전쟁 & 원자재 */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-[#1a0a0a] border border-[#3a1a1a] rounded p-2.5">
          <p className="text-[9px] font-mono font-bold text-red-400 mb-1">⚠ {t('korea.usChipWar')}</p>
          <p className="text-[8px] font-mono text-gray-400 leading-snug">{t('korea.usChipWarNote')}</p>
        </div>
        <div className="bg-[#0a1a0a] border border-[#1a3a1a] rounded p-2.5">
          <p className="text-[9px] font-mono font-bold text-yellow-500 mb-1">⚠ {t('korea.rawMaterial')}</p>
          <p className="text-[8px] font-mono text-gray-400 leading-snug">
            · {t('korea.lithiumSource')}<br />· {t('korea.cobaltSource')}
          </p>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-[#1a3a5c]/40 flex justify-between">
        <span className="text-[8px] font-mono text-gray-700">Sources: KITA · 산업통상자원부 · CSIS · Bloomberg</span>
        <span className="text-[8px] font-mono text-gray-700">{DATA_LAST_UPDATED}</span>
      </div>
    </BloombergPanelWrapper>
  )
}

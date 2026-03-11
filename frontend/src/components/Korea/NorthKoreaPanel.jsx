import React, { useState } from 'react'
import { useLanguage } from '../../contexts/LanguageContext'
import BloombergPanelWrapper from '../Economic/BloombergPanelWrapper'

// ─── 데이터 최종 업데이트: 2026-03-10 (38North, CSIS, KBS 기반) ───
const DATA_LAST_UPDATED = '2026-03-10'

const PROVOCATIONS = [
  { date: '2025-11-18', typeKo: 'ICBM', typeEn: 'ICBM', descKo: '화성-19형 ICBM 발사 (고각도). 비행거리 1만km+ 추정.', descEn: 'Hwasong-19 ICBM (lofted). Est. range 10,000km+.' },
  { date: '2025-09-12', typeKo: '탄도미사일', typeEn: 'Ballistic', descKo: '단거리 탄도미사일 다수 발사 (동해).', descEn: 'Multiple short-range ballistic missiles fired (East Sea).' },
  { date: '2025-06-05', typeKo: '순항미사일', typeEn: 'Cruise', descKo: '전략순항미사일 발사 훈련 (화살-2형).', descEn: 'Strategic cruise missile exercise (Hwassal-2).' },
  { date: '2024-11-21', typeKo: 'ICBM', typeEn: 'ICBM', descKo: '화성-17형 발사. 최고고도 7,000km, 비행시간 86분.', descEn: 'Hwasong-17 launch. Max alt 7,000km, flight 86 min.' },
  { date: '2024-09-13', typeKo: '핵실험 준비', typeEn: 'Nuke Prep', descKo: '풍계리 핵실험장 3·4번 갱도 복구 완료 (위성 확인).', descEn: 'Punggye-ri tunnels 3&4 restored (satellite-confirmed).' },
  { date: '2024-01-24', typeKo: '포격', typeEn: 'Artillery', descKo: 'NLL 인근 해상 포병사격 (연평도 인근).', descEn: 'Naval artillery fire near NLL (Yeonpyeong area).' },
  { date: '2023-12-18', typeKo: 'ICBM', typeEn: 'ICBM', descKo: '화성-18형 고체연료 ICBM 발사. 사전 징후 탐지 불가.', descEn: 'Hwasong-18 solid-fuel ICBM. No detectable advance warning.' },
  { date: '2022-10-04', typeKo: 'IRBM', typeEn: 'IRBM', descKo: '화성-12형 일본 상공 통과. 비행거리 4,600km.', descEn: 'Hwasong-12 over Japan. Range 4,600km.' },
]

// 미사일 사거리 데이터 (km)
const MISSILE_RANGES = [
  { nameKo: '스커드-ER', nameEn: 'Scud-ER',   range: 1000,  color: '#ca8a04', riskKo: '남한 전역', riskEn: 'All of South Korea' },
  { nameKo: '노동-1형',  nameEn: 'Nodong-1',   range: 1300,  color: '#ea580c', riskKo: '일본 서부', riskEn: 'Western Japan' },
  { nameKo: '화성-12형', nameEn: 'Hwasong-12', range: 5000,  color: '#dc2626', riskKo: '괌',        riskEn: 'Guam' },
  { nameKo: '화성-15형', nameEn: 'Hwasong-15', range: 13000, color: '#9333ea', riskKo: '미국 본토', riskEn: 'US Mainland' },
  { nameKo: '화성-18형', nameEn: 'Hwasong-18', range: 15000, color: '#6b21a8', riskKo: '미국 전역', riskEn: 'All of US' },
]

const TYPE_COLORS = {
  'ICBM': '#dc2626', 'IRBM': '#ea580c', '탄도미사일': '#ca8a04', 'Ballistic': '#ca8a04',
  '순항미사일': '#0070cc', 'Cruise': '#0070cc', '핵실험 준비': '#9333ea', 'Nuke Prep': '#9333ea',
  '포격': '#6b7280', 'Artillery': '#6b7280',
}

export default function NorthKoreaPanel() {
  const { t, lang } = useLanguage()
  const [showAll, setShowAll] = useState(false)

  const lastProvoDate = new Date(PROVOCATIONS[0].date)
  const daysAgo = Math.floor((new Date() - lastProvoDate) / (1000 * 60 * 60 * 24))

  const displayed = showAll ? PROVOCATIONS : PROVOCATIONS.slice(0, 4)

  return (
    <BloombergPanelWrapper title={t('korea.securityMonitor')} badge={t('korea.securityBadge')}>
      {/* 통계 카드 3개 */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: t('korea.nukTests'),       value: '6',   sub: '1차(2006) ~ 6차(2017)', color: '#9333ea' },
          { label: t('korea.icbmLaunches'),   value: '12+', sub: '2022~2025 집중', color: '#dc2626' },
          { label: t('korea.lastProvocation'),value: `${daysAgo}`, sub: t('korea.daysAgo'), color: '#ea580c' },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="bg-[#0a1929] border border-[#1a3a5c] rounded p-2.5 text-center">
            <p className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-1">{label}</p>
            <p className="text-2xl font-mono font-bold" style={{ color }}>{value}</p>
            <p className="text-[8px] font-mono text-gray-600 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* 미사일 사거리 바 차트 */}
      <div className="mb-4">
        <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-2">{t('korea.missileRange')}</p>
        <div className="space-y-1.5">
          {MISSILE_RANGES.map(({ nameKo, nameEn, range, color, riskKo, riskEn }) => {
            const pct = Math.min(100, (range / 15000) * 100)
            return (
              <div key={nameKo} className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-gray-400 w-20 shrink-0">{lang === 'ko' ? nameKo : nameEn}</span>
                <div className="flex-1 bg-[#0a1929] rounded-sm h-3 overflow-hidden">
                  <div className="h-full rounded-sm transition-all" style={{ width: `${pct}%`, backgroundColor: color + 'cc' }} />
                </div>
                <span className="text-[9px] font-mono w-14 text-right" style={{ color }}>{range.toLocaleString()}km</span>
                <span className="text-[8px] font-mono text-gray-600 w-20 shrink-0">{lang === 'ko' ? riskKo : riskEn}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* 도발 타임라인 */}
      <div>
        <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-2">{t('korea.provoTimeline')}</p>
        <div className="space-y-1.5">
          {displayed.map((p) => {
            const typeKey = lang === 'ko' ? p.typeKo : p.typeEn
            const color = TYPE_COLORS[typeKey] || '#6b7280'
            return (
              <div key={p.date} className="flex gap-2 items-start bg-[#0a1929] rounded px-2 py-1.5 border border-[#1a3a5c]/40">
                <span className="text-[9px] font-mono text-gray-600 w-20 shrink-0 pt-0.5">{p.date}</span>
                <span
                  className="text-[8px] font-mono px-1.5 py-0.5 rounded-sm shrink-0"
                  style={{ backgroundColor: color + '25', border: `1px solid ${color}55`, color }}
                >
                  {typeKey}
                </span>
                <span className="text-[10px] font-mono text-gray-300 leading-snug">
                  {lang === 'ko' ? p.descKo : p.descEn}
                </span>
              </div>
            )
          })}
        </div>
        {PROVOCATIONS.length > 4 && (
          <button
            onClick={() => setShowAll(v => !v)}
            className="mt-2 text-[9px] font-mono text-[#5ba4d4] hover:text-white transition-colors"
          >
            {showAll
              ? (lang === 'ko' ? '접기 ▲' : 'Show less ▲')
              : (lang === 'ko' ? `+ ${PROVOCATIONS.length - 4}개 더 보기 ▼` : `+ ${PROVOCATIONS.length - 4} more ▼`)}
          </button>
        )}
      </div>

      {/* 출처 */}
      <div className="mt-3 pt-2 border-t border-[#1a3a5c]/40 flex items-center justify-between">
        <span className="text-[8px] font-mono text-gray-700">
          Sources: 38North · CSIS · KBS · 연합뉴스 · NTI
        </span>
        <span className="text-[8px] font-mono text-gray-700">{DATA_LAST_UPDATED}</span>
      </div>
    </BloombergPanelWrapper>
  )
}

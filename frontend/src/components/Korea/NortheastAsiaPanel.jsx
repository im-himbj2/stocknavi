import React, { useState, useEffect } from 'react'
import { useLanguage } from '../../contexts/LanguageContext'
import BloombergPanelWrapper from '../Economic/BloombergPanelWrapper'
import { getForexRates } from '../../services/api'

const DATA_LAST_UPDATED = '2026-03-10'

// 주변국 리스크 요약 (하드코딩, 정기 업데이트)
const NEIGHBOR_RISKS = [
  {
    flag: '🇨🇳',
    nameKo: '중국', nameEn: 'China',
    riskTypeKo: '경제 의존·무역 갈등', riskTypeEn: 'Economic dependency / Trade conflict',
    impactKo: '수출 30% 의존, THAAD 보복 재연 가능', impactEn: '30% export dependency, THAAD retaliation risk',
    level: 'high',
    tensionScore: 72,
  },
  {
    flag: '🇯🇵',
    nameKo: '일본', nameEn: 'Japan',
    riskTypeKo: '소부장 수출규제·역사 갈등', riskTypeEn: 'Material export restrictions / Historical tensions',
    impactKo: '불화수소·포토레지스트 공급망 리스크', impactEn: 'HF & photoresist supply chain risk',
    level: 'med',
    tensionScore: 45,
  },
  {
    flag: '🇷🇺',
    nameKo: '러시아', nameEn: 'Russia',
    riskTypeKo: '북한 군사협력·제재 이슈', riskTypeEn: 'NK military cooperation / Sanctions issues',
    impactKo: '대러 제재 준수 압박, 에너지 공급 불안', impactEn: 'Russia sanctions compliance pressure, energy insecurity',
    level: 'med',
    tensionScore: 58,
  },
  {
    flag: '🇺🇸',
    nameKo: '미국', nameEn: 'United States',
    riskTypeKo: '방위비·관세 협상', riskTypeEn: 'Defense cost-sharing / Tariff negotiations',
    impactKo: '트럼프 관세 25% 자동차·반도체 위협', impactEn: 'Trump 25% tariff threat on autos & chips',
    level: 'low',
    tensionScore: 28,
  },
]

// 한중일 무역 긴장 이슈 (최신)
const TRADE_ISSUES = [
  {
    ko: '중국, 한국산 배터리 소재 반덤핑 조사 (2025.9)',
    en: 'China anti-dumping probe on Korean battery materials (Sep 2025)',
    color: '#dc2626',
  },
  {
    ko: '일본, 반도체 제조 장비 추가 수출규제 검토 (2025.11)',
    en: 'Japan reviewing additional semiconductor equipment export restrictions (Nov 2025)',
    color: '#ea580c',
  },
  {
    ko: '한미 방위비 분담금 협상 타결 ($1.38B/yr, 2026.1)',
    en: 'Korea-US defense cost-sharing deal reached ($1.38B/yr, Jan 2026)',
    color: '#22c55e',
  },
  {
    ko: '미국, 한국산 철강 쿼터 유지 (232조 관세 면제 연장)',
    en: 'US maintains Korean steel quota (Section 232 tariff exemption extended)',
    color: '#22c55e',
  },
]

const RISK_COLORS = { high: '#dc2626', med: '#ea580c', low: '#22c55e' }
const RISK_BG    = { high: '#1a0a0a',  med: '#1a0f0a', low: '#0a1a0a' }

// KRW 환율 심볼 필터 (기존 forex API에서)
const KRW_PAIRS = ['USD/KRW', 'JPY/KRW', 'CNY/KRW', 'EUR/KRW']

export default function NortheastAsiaPanel() {
  const { t, lang } = useLanguage()
  const [forex, setForex] = useState([])
  const [fxLoading, setFxLoading] = useState(true)

  useEffect(() => {
    getForexRates()
      .then(data => {
        const filtered = (data || []).filter(fx => KRW_PAIRS.includes(fx.symbol))
        setForex(filtered)
      })
      .catch(() => setForex([]))
      .finally(() => setFxLoading(false))
  }, [])

  return (
    <BloombergPanelWrapper title={t('korea.neAsia')} badge={t('korea.neAsiaBadge')}>
      {/* 주변국 리스크 테이블 */}
      <div className="mb-4">
        <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-2">{t('korea.neighborRisk')}</p>
        <div className="space-y-1.5">
          {NEIGHBOR_RISKS.map((n) => {
            const rColor = RISK_COLORS[n.level]
            const rBg = RISK_BG[n.level]
            return (
              <div key={n.nameKo} className="rounded border p-2" style={{ backgroundColor: rBg, borderColor: rColor + '40' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-mono font-bold text-white">
                    {n.flag} {lang === 'ko' ? n.nameKo : n.nameEn}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="text-[8px] font-mono text-gray-500">{t('korea.tensionScore')}</span>
                      <div className="w-16 h-1.5 bg-[#0a1929] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${n.tensionScore}%`, backgroundColor: rColor }} />
                      </div>
                      <span className="text-[9px] font-mono font-bold" style={{ color: rColor }}>{n.tensionScore}</span>
                    </div>
                  </div>
                </div>
                <p className="text-[8px] font-mono text-gray-500 mb-0.5">
                  {lang === 'ko' ? n.riskTypeKo : n.riskTypeEn}
                </p>
                <p className="text-[9px] font-mono text-gray-300">
                  → {lang === 'ko' ? n.impactKo : n.impactEn}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* 최신 무역 이슈 */}
      <div className="mb-4">
        <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-2">
          {lang === 'ko' ? '최신 무역·외교 이슈' : 'Latest Trade & Diplomatic Issues'}
        </p>
        <div className="space-y-1">
          {TRADE_ISSUES.map((issue, i) => (
            <div key={i} className="flex gap-1.5 items-start">
              <span className="text-[9px] font-mono leading-snug" style={{ color: issue.color }}>●</span>
              <span className="text-[9px] font-mono text-gray-400 leading-snug">{lang === 'ko' ? issue.ko : issue.en}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 실시간 원화 환율 */}
      <div>
        <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-2">{t('korea.liveForex')}</p>
        {fxLoading ? (
          <div className="space-y-1">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-6 bg-[#1a3a5c]/40 animate-pulse rounded" />
            ))}
          </div>
        ) : forex.length === 0 ? (
          <p className="text-[9px] font-mono text-gray-600">
            {lang === 'ko' ? '환율 데이터 없음' : 'No FX data'}
          </p>
        ) : (
          <div className="space-y-1">
            {forex.map((fx) => {
              const isPos = (fx.changesPercentage ?? 0) >= 0
              return (
                <div key={fx.symbol} className="flex items-center justify-between py-1 border-b border-[#1a3a5c]/30 last:border-0">
                  <span className="text-[10px] font-mono text-gray-400">{fx.symbol}</span>
                  <span className="text-[11px] font-mono text-white font-bold">
                    {fx.price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className={`text-[9px] font-mono font-bold ${isPos ? 'text-green-400' : 'text-red-400'}`}>
                    {isPos ? '▲' : '▼'}{Math.abs(fx.changesPercentage ?? 0).toFixed(2)}%
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="mt-3 pt-2 border-t border-[#1a3a5c]/40 flex justify-between">
        <span className="text-[8px] font-mono text-gray-700">Sources: 외교부 · KIEP · Reuters · Bloomberg</span>
        <span className="text-[8px] font-mono text-gray-700">{DATA_LAST_UPDATED}</span>
      </div>
    </BloombergPanelWrapper>
  )
}

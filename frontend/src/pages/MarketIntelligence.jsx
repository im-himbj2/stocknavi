import React from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import IRSPanel from '../components/Intelligence/IRSPanel'
import EventImpactPanel from '../components/Intelligence/EventImpactPanel'
import SectorCascadePanel from '../components/Intelligence/SectorCascadePanel'

export default function MarketIntelligence() {
  const { lang } = useLanguage()

  return (
    <div className="min-h-screen bg-[#0a0f15] text-white">
      {/* 페이지 헤더 */}
      <div className="border-b border-[#1a3a5c] px-6 py-4 bg-[#050d18]">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🧠</span>
          <div>
            <h1 className="text-lg font-mono font-bold text-white tracking-wider uppercase">
              {lang === 'ko' ? 'Market Intelligence' : 'Market Intelligence'}
            </h1>
            <p className="text-[10px] font-mono text-gray-500 mt-0.5">
              {lang === 'ko'
                ? '투자 리스크 스코어 · 이벤트 영향 분석 · 섹터 캐스케이드 시뮬레이션'
                : 'Investment Risk Score · Event Impact Analysis · Sector Cascade Simulation'}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
            <span className="text-[9px] font-mono text-gray-500">INTEL</span>
          </div>
        </div>
      </div>

      {/* 컨텐츠 */}
      <div className="p-4 space-y-4 max-w-screen-xl mx-auto">
        {/* 섹션 1: 투자 리스크 스코어 */}
        <IRSPanel />

        {/* 섹션 2: 이벤트 → 주가 트래커 */}
        <EventImpactPanel />

        {/* 섹션 3: 섹터 캐스케이드 */}
        <SectorCascadePanel />
      </div>
    </div>
  )
}

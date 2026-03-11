import React from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import NorthKoreaPanel from '../components/Korea/NorthKoreaPanel'
import SupplyChainPanel from '../components/Korea/SupplyChainPanel'
import NortheastAsiaPanel from '../components/Korea/NortheastAsiaPanel'
import KoreaEconomyPanel from '../components/Korea/KoreaEconomyPanel'

export default function KoreaIntelligence() {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen bg-[#0a0f15] text-white">
      {/* 페이지 헤더 */}
      <div className="border-b border-[#1a3a5c] px-6 py-4 bg-[#050d18]">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🇰🇷</span>
          <div>
            <h1 className="text-lg font-mono font-bold text-white tracking-wider uppercase">
              {t('korea.pageTitle')}
            </h1>
            <p className="text-[10px] font-mono text-gray-500 mt-0.5">
              {t('korea.pageSubtitle')}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[9px] font-mono text-gray-500">LIVE</span>
          </div>
        </div>
      </div>

      {/* 컨텐츠 영역 */}
      <div className="p-4 space-y-4 max-w-screen-xl mx-auto">

        {/* 섹션 A: 한반도 안보 모니터 (풀 width) */}
        <NorthKoreaPanel />

        {/* 섹션 B + C: 공급망 & 동북아 리스크 (2열) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SupplyChainPanel />
          <NortheastAsiaPanel />
        </div>

        {/* 섹션 D: 한국 경제 취약성 (풀 width) */}
        <KoreaEconomyPanel />

      </div>
    </div>
  )
}

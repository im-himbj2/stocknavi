import React, { useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import SmartMoneyTracker from '../components/Intelligence/SmartMoneyTracker'
import ThemeHeatmap from '../components/Intelligence/ThemeHeatmap'
import AISignalPanel from '../components/Intelligence/AISignalPanel'

export default function MarketIntelligence() {
  const { t, lang } = useLanguage()
  const [selectedStock, setSelectedStock] = useState(null)
  const [selectedTheme, setSelectedTheme] = useState(null)

  return (
    <>
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-[#0f141a]/90 backdrop-blur-xl border-b border-outline-variant/20 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold font-headline text-on-background tracking-tight">
            {t('intelligence.pageTitle') || '투자 인텔리전스'}
          </h1>
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-secondary">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-secondary" />
            </span>
            LIVE
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-6 space-y-6 max-w-[1440px] mx-auto min-h-96">
        {/* Top Section: 2 Columns */}
        <div className="grid grid-cols-5 gap-6">
          {/* Column 1: Smart Money Tracker (40%, col-span-2) */}
          <div className="col-span-2">
            <SmartMoneyTracker onSelectStock={setSelectedStock} />
          </div>

          {/* Column 2: Theme Heatmap (60%, col-span-3) */}
          <div className="col-span-3">
            <ThemeHeatmap onSelectTheme={setSelectedTheme} onSelectStock={setSelectedStock} />
          </div>
        </div>

        {/* Bottom Section: AI Signals (Full Width) */}
        <div>
          <AISignalPanel selectedStock={selectedStock} selectedTheme={selectedTheme} />
        </div>
      </div>
    </>
  )
}

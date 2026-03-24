import React, { useState, useEffect } from 'react'
import apiService from '../services/api'
import { useLanguage } from '../contexts/LanguageContext'
import { useBullMode } from '../contexts/BullModeContext'
import WorldConflictMap from '../components/Economic/WorldConflictMap'
import MarketGrid from '../components/Economic/MarketGrid'
import MacroPanel from '../components/Economic/MacroPanel'
import SentimentGauge from '../components/Economic/SentimentGauge'
import YieldCurveChart from '../components/Economic/YieldCurveChart'
import ForexPanel from '../components/Economic/ForexPanel'
import SectorPanel from '../components/Economic/SectorPanel'
import EconomicCalendarPanel from '../components/Economic/EconomicCalendarPanel'


const EconomicIndicators = () => {
  const { t, lang } = useLanguage()
  const { bullMode, toggleBullMode } = useBullMode()
  const [globalIndices, setGlobalIndices] = useState([])
  const [commodities, setCommodities] = useState([])
  const [crypto, setCrypto] = useState([])
  const [forex, setForex] = useState([])
  const [curveData, setCurveData] = useState([])
  const [highlights, setHighlights] = useState([])
  const [pmi, setPmi] = useState(null)
  const [jobless, setJobless] = useState(null)
  const [consumer, setConsumer] = useState(null)
  const [sectors, setSectors] = useState([])
  const [sentiment, setSentiment] = useState(null)
  const [calendar, setCalendar] = useState([])
  const [fomc, setFomc] = useState(null)
  const [fomcSummary, setFomcSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    let mounted = true

    const fetchMain = async () => {
      setLoading(true)
      try {
        const [
          indicesRes, commoditiesRes, cryptoRes, forexRes, curveRes,
          highlightsRes, pmiRes, joblessRes, consumerRes,
          sectorsRes, sentimentRes, calendarRes,
        ] = await Promise.all([
          apiService.getGlobalIndices().catch(() => ({ data: [] })),
          apiService.getCommodities().catch(() => ({ data: [] })),
          apiService.getCryptoPrices().catch(() => ({ data: [] })),
          apiService.getForexRates().catch(() => ({ data: [] })),
          apiService.getYieldCurve().catch(() => ({ data: [] })),
          apiService.getEconomicHighlights().catch(() => ({ data: [] })),
          apiService.getPMI().catch(() => ({ data: [] })),
          apiService.getJoblessClaims().catch(() => ({ data: [] })),
          apiService.getConsumerConfidence().catch(() => ({ data: [] })),
          apiService.getSectorRotation().catch(() => ({ data: [] })),
          apiService.getMarketSentiment().catch(() => ({ data: [] })),
          apiService.getEconomicCalendar().catch(() => ({ data: [] })),
        ])

        if (!mounted) return

        if (indicesRes?.data) setGlobalIndices(indicesRes.data)
        if (commoditiesRes?.data) setCommodities(commoditiesRes.data)
        if (cryptoRes?.data) setCrypto(cryptoRes.data)
        if (forexRes?.data) setForex(forexRes.data)
        if (curveRes?.data) setCurveData(curveRes.data)
        if (highlightsRes?.data) setHighlights(highlightsRes.data)

        const pmiLatest = pmiRes?.data?.[0]?.value
        if (pmiLatest) setPmi(pmiLatest)

        if (joblessRes?.data) setJobless(joblessRes.data)
        if (consumerRes?.data) setConsumer(consumerRes.data)
        if (sectorsRes?.data) setSectors(sectorsRes.data)

        const sentVal = sentimentRes?.data?.[0]?.value
        if (sentVal != null) setSentiment(sentVal)

        if (calendarRes?.data) setCalendar(calendarRes.data)

        setLastUpdated(new Date())
      } catch (err) {
        console.error('[StockNavi] Main data fetch error:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchMain()

    // FOMC loaded separately (slow AI call)
    const fetchFomc = async () => {
      try {
        const res = await apiService.getFOMCMeetings(1)
        if (!mounted) return
        if (res?.items?.[0]) {
          setFomc(res.items[0])
          try {
            const sumRes = await apiService.getSpeechSummary('fomc_0')
            if (mounted && sumRes) setFomcSummary(sumRes)
          } catch {}
        }
      } catch {}
    }
    fetchFomc()

    return () => { mounted = false }
  }, [])

  // Marquee: duplicate indices for seamless loop
  const tickerItems = [...globalIndices, ...globalIndices]

  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-screen">
      {/* Page header — Stitch style */}
      <div className="sticky top-0 z-40 bg-[#0f141a]/90 backdrop-blur-xl border-b border-outline-variant/20 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold font-headline text-on-background tracking-tight">{t('economic.pageTitle') || '경제 지표'}</h1>
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-secondary">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-secondary" />
            </span>
            LIVE
          </span>
          {bullMode && (
            <span className="text-[9px] font-bold text-secondary border border-secondary/30 px-2 py-0.5 rounded-full tracking-widest animate-pulse bg-secondary/10">
              🐂 BULL MODE
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-[10px] text-on-surface-variant">
              {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={toggleBullMode}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              bullMode
                ? 'bg-secondary/20 text-secondary border border-secondary/30'
                : 'bg-surface-container text-on-surface-variant border border-outline-variant/30 hover:text-on-surface'
            }`}
            title={bullMode ? '전체 보기' : '강세장 필터'}
          >
            {bullMode ? '🐂 강세장 필터 ON' : '강세장 필터'}
          </button>
        </div>
      </div>

      {/* Ticker Bar */}
      {globalIndices.length > 0 && (
        <div className="bg-surface-container-low border-b border-outline-variant/20 overflow-hidden py-2">
          <div className="flex gap-8 animate-marquee whitespace-nowrap">
            {tickerItems.map((idx, i) => (
              <span key={`${idx.symbol}-${i}`} className="inline-flex items-center gap-1.5 text-[11px] font-medium">
                <span className="text-on-surface-variant">{idx.name}</span>
                <span className="text-on-surface font-bold">
                  {idx.price >= 1000
                    ? idx.price.toLocaleString('en-US', { maximumFractionDigits: 0 })
                    : idx.price.toFixed(2)}
                </span>
                <span className={idx.change_percent >= 0 ? 'text-secondary' : 'text-error'}>
                  {idx.change_percent >= 0 ? '▲' : '▼'}{Math.abs(idx.change_percent).toFixed(2)}%
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="px-6 py-6 space-y-6 max-w-[1440px] mx-auto">
        {/* 3. Market Grid */}
        <div className="bg-surface-container rounded-2xl overflow-hidden border border-outline-variant/10">
          <div className="px-6 py-4 border-b border-outline-variant/10 flex items-center justify-between">
            <h2 className="text-base font-bold font-headline text-[#a5c8ff]">{t('economic.marketsOverview')}</h2>
            <span className="text-[10px] text-on-surface-variant">{t('economic.marketsOverviewSub')}</span>
          </div>
          <MarketGrid
            globalIndices={globalIndices}
            commodities={commodities}
            crypto={crypto}
            loading={loading}
          />
        </div>

        {/* 4. Macro + Sentiment */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-surface-container rounded-2xl overflow-hidden border border-outline-variant/10">
            <MacroPanel
              highlights={highlights}
              pmi={pmi}
              jobless={jobless}
              consumer={consumer}
              loading={loading}
            />
          </div>
          <div className="bg-surface-container rounded-2xl overflow-hidden border border-outline-variant/10">
            <SentimentGauge value={sentiment} loading={loading} />
          </div>
        </div>

        {/* 5. Yield Curve + Forex */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-surface-container rounded-2xl overflow-hidden border border-outline-variant/10">
            <YieldCurveChart curveData={curveData} loading={loading} />
          </div>
          <div className="bg-surface-container rounded-2xl overflow-hidden border border-outline-variant/10">
            <ForexPanel forex={forex} loading={loading} />
          </div>
        </div>

        {/* 6. Sector + Calendar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-surface-container rounded-2xl overflow-hidden border border-outline-variant/10">
            <SectorPanel sectors={sectors} loading={loading} />
          </div>
          <div className="bg-surface-container rounded-2xl overflow-hidden border border-outline-variant/10">
            <EconomicCalendarPanel events={calendar} loading={loading} />
          </div>
        </div>

        {/* 7. FOMC Analysis */}
        <div className="bg-surface-container rounded-2xl border border-outline-variant/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-outline-variant/10 flex items-center gap-3">
            <h2 className="text-base font-bold font-headline text-[#a5c8ff]">{t('economic.fomcAnalysis')}</h2>
            <span className="text-[10px] font-bold bg-[#0070cc]/20 text-[#a5c8ff] px-2 py-0.5 rounded-full border border-[#0070cc]/30">AI</span>
          </div>
          <div className="p-6">
            {!fomc ? (
              <p className="text-sm text-on-surface-variant py-2">{t('economic.loading')}</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">{t('economic.meeting')}</p>
                  <p className="text-sm text-[#a5c8ff] font-medium">{fomc.date}</p>
                  <p className="text-sm text-on-surface font-bold mt-1 leading-snug">{fomc.title}</p>
                </div>
                {fomcSummary ? (
                  <div>
                    <p className="text-sm text-on-surface-variant mb-3 leading-relaxed">
                      {fomcSummary.summary?.substring(0, 200)}...
                    </p>
                    {fomcSummary.hawk_dove_score != null && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] text-on-surface-variant">Dove</span>
                          <span className="text-[10px] text-on-surface font-bold">
                            Hawk/Dove: {fomcSummary.hawk_dove_score.toFixed(0)}
                          </span>
                          <span className="text-[10px] text-on-surface-variant">Hawk</span>
                        </div>
                        <div className="bg-surface-container-highest rounded-full h-1.5">
                          <div
                            className={`h-full rounded-full transition-all ${fomcSummary.hawk_dove_score > 50 ? 'bg-error' : 'bg-[#a5c8ff]'}`}
                            style={{ width: `${fomcSummary.hawk_dove_score}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {fomcSummary.keywords && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {fomcSummary.keywords.slice(0, 6).map((kw, i) => (
                          <span key={i} className="text-[10px] bg-[#0070cc]/15 text-[#a5c8ff] px-2 py-0.5 rounded-full border border-[#0070cc]/20">
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-on-surface-variant">{t('economic.loadingAI')}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* WorldConflictMap */}
        <div className="bg-surface-container rounded-2xl overflow-hidden border border-outline-variant/10">
          <WorldConflictMap />
        </div>
      </div>

      {/* 면책 고지 */}
      <div className="px-6 py-4 border-t border-outline-variant/10">
        <p className="text-[10px] text-on-surface-variant/50 text-center leading-relaxed">
          본 정보는 투자 권고가 아닙니다. 투자 결정의 책임은 투자자 본인에게 있습니다. | This information does not constitute investment advice.
        </p>
      </div>
    </div>
  )
}

export default EconomicIndicators

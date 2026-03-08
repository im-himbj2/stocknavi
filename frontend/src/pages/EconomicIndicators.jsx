import React, { useState, useEffect } from 'react'
import apiService from '../services/api'
import Navbar from '../components/Layout/Navbar'
import WorldConflictMap from '../components/Economic/WorldConflictMap'
import MarketGrid from '../components/Economic/MarketGrid'
import MacroPanel from '../components/Economic/MacroPanel'
import SentimentGauge from '../components/Economic/SentimentGauge'
import YieldCurveChart from '../components/Economic/YieldCurveChart'
import ForexPanel from '../components/Economic/ForexPanel'
import SectorPanel from '../components/Economic/SectorPanel'
import EconomicCalendarPanel from '../components/Economic/EconomicCalendarPanel'
import BloombergPanelWrapper from '../components/Economic/BloombergPanelWrapper'

const EconomicIndicators = () => {
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
        console.error('[Bloomberg] Main data fetch error:', err)
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
    <div className="bg-[#0a0f15] text-white min-h-screen">
      <Navbar />

      {/* Page header */}
      <div className="px-4 py-2 flex items-center justify-between border-b border-[#1a3a5c] bg-[#050d18]">
        <div className="flex items-center gap-3">
          <h1 className="text-[13px] font-mono font-bold text-[#5ba4d4] uppercase tracking-widest">
            Bloomberg Intelligence Terminal
          </h1>
          <span className="flex items-center gap-1.5 text-[10px] font-mono text-green-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
            </span>
            LIVE
          </span>
        </div>
        {lastUpdated && (
          <span className="text-[9px] font-mono text-gray-600">
            Updated {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* 1. World Conflict Map */}
      <WorldConflictMap />

      {/* 2. Ticker Bar */}
      {globalIndices.length > 0 && (
        <div className="bg-[#050d18] border-b border-[#1a3a5c] overflow-hidden py-1.5">
          <div className="flex gap-8 animate-marquee whitespace-nowrap">
            {tickerItems.map((idx, i) => (
              <span key={`${idx.symbol}-${i}`} className="inline-flex items-center gap-1.5 text-[11px] font-mono">
                <span className="text-gray-500">{idx.name}</span>
                <span className="text-white font-bold">
                  {idx.price >= 1000
                    ? idx.price.toLocaleString('en-US', { maximumFractionDigits: 0 })
                    : idx.price.toFixed(2)}
                </span>
                <span className={idx.change_percent >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {idx.change_percent >= 0 ? '▲' : '▼'}{Math.abs(idx.change_percent).toFixed(2)}%
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 py-3 space-y-3">
        {/* 3. 4-Panel Market Grid */}
        <div className="border border-[#1a3a5c] rounded-sm overflow-hidden">
          <div className="bg-[#0a1929] border-b border-[#1a3a5c] px-3 py-1 flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-[#5ba4d4] uppercase tracking-widest">Markets Overview</span>
            <span className="text-[9px] font-mono text-gray-600">Equities · Commodities · Crypto</span>
          </div>
          <MarketGrid
            globalIndices={globalIndices}
            commodities={commodities}
            crypto={crypto}
            loading={loading}
          />
        </div>

        {/* 4. Macro + Sentiment */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2">
            <MacroPanel
              highlights={highlights}
              pmi={pmi}
              jobless={jobless}
              consumer={consumer}
              loading={loading}
            />
          </div>
          <SentimentGauge value={sentiment} loading={loading} />
        </div>

        {/* 5. Yield Curve + Forex */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2">
            <YieldCurveChart curveData={curveData} loading={loading} />
          </div>
          <ForexPanel forex={forex} loading={loading} />
        </div>

        {/* 6. Sector + Calendar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2">
            <SectorPanel sectors={sectors} loading={loading} />
          </div>
          <EconomicCalendarPanel events={calendar} loading={loading} />
        </div>

        {/* 7. FOMC Analysis */}
        <BloombergPanelWrapper title="Latest FOMC Analysis" badge="AI">
          {!fomc ? (
            <p className="text-[10px] text-gray-600 font-mono py-2">Loading FOMC data...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-1">Meeting</p>
                <p className="text-[11px] font-mono text-[#5ba4d4]">{fomc.date}</p>
                <p className="text-[12px] font-mono text-white font-bold mt-1 leading-snug">{fomc.title}</p>
              </div>
              {fomcSummary ? (
                <div>
                  <p className="text-[10px] font-mono text-gray-400 mb-3 leading-relaxed">
                    {fomcSummary.summary?.substring(0, 200)}...
                  </p>
                  {fomcSummary.hawk_dove_score != null && (
                    <div className="mb-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">Dove</span>
                        <span className="text-[9px] font-mono text-gray-400 font-bold">
                          Hawk/Dove: {fomcSummary.hawk_dove_score.toFixed(0)}
                        </span>
                        <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">Hawk</span>
                      </div>
                      <div className="bg-[#1a3a5c] rounded h-1.5">
                        <div
                          className={`h-full rounded transition-all ${fomcSummary.hawk_dove_score > 50 ? 'bg-red-500' : 'bg-blue-500'}`}
                          style={{ width: `${fomcSummary.hawk_dove_score}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {fomcSummary.keywords && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {fomcSummary.keywords.slice(0, 6).map((kw, i) => (
                        <span key={i} className="text-[9px] font-mono bg-[#0070cc]/20 text-[#5ba4d4] px-2 py-0.5 rounded-sm">
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[10px] text-gray-600 font-mono">Loading AI analysis...</p>
              )}
            </div>
          )}
        </BloombergPanelWrapper>
      </div>
    </div>
  )
}

export default EconomicIndicators

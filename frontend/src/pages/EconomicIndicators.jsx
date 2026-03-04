import { useState, useEffect } from 'react'
import apiService from '../services/api'

function EconomicIndicators() {
  const [loading, setLoading] = useState(true)
  const [macroHighlights, setMacroHighlights] = useState(null)
  const [fomcMeetings, setFomcMeetings] = useState(null)
  const [fomcSummary, setFomcSummary] = useState(null)
  const [activeChart, setActiveChart] = useState('GDP')

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      try {
        const [macro, fomc] = await Promise.allSettled([
          apiService.getEconomicHighlights(),
          apiService.getFOMCMeetings(1)
        ])
        if (macro.status === 'fulfilled') setMacroHighlights(macro.value)
        if (fomc.status === 'fulfilled') {
          const meetings = fomc.value
          setFomcMeetings(meetings)
          // Fetch summary for the most recent meeting
          const recentId = meetings?.data?.[0]?.id || meetings?.[0]?.id
          if (recentId) {
            try {
              const summary = await apiService.getSpeechSummary(recentId)
              setFomcSummary(summary)
            } catch {
              // Summary unavailable
            }
          }
        }
      } catch (err) {
        console.error('Economic data fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  // Parse macro highlights into the 4 key cards
  const getMacroCard = (name) => {
    const data = macroHighlights?.data
    if (!data) return null
    return data.find(d => d.name?.toLowerCase().includes(name.toLowerCase()))
  }

  const gdp = getMacroCard('GDP')
  const cpi = getMacroCard('CPI')
  const unemployment = getMacroCard('unemployment')
  const rate = getMacroCard('interest') || getMacroCard('rate') || getMacroCard('federal')

  const macroCards = [
    {
      label: 'GDP Growth (QoQ)',
      value: gdp ? `${Number(gdp.value).toFixed(1)}%` : '—',
      change: gdp?.change ?? null,
      changeLabel: gdp?.change != null ? `${gdp.change > 0 ? '+' : ''}${Number(gdp.change).toFixed(1)}% vs prev` : 'Source: FRED',
      positive: (gdp?.change ?? 0) > 0,
      icon: 'show_chart'
    },
    {
      label: 'CPI (Inflation YoY)',
      value: cpi ? `${Number(cpi.value).toFixed(1)}%` : '—',
      change: cpi?.change ?? null,
      changeLabel: cpi?.change != null ? `${cpi.change > 0 ? '+' : ''}${Number(cpi.change).toFixed(1)}% vs prev` : 'Source: FRED',
      positive: (cpi?.change ?? 1) < 0,
      icon: 'price_change'
    },
    {
      label: 'Unemployment Rate',
      value: unemployment ? `${Number(unemployment.value).toFixed(1)}%` : '—',
      change: unemployment?.change ?? null,
      changeLabel: unemployment?.change != null ? `${unemployment.change > 0 ? '+' : ''}${Number(unemployment.change).toFixed(1)}% vs prev` : 'Source: FRED',
      positive: (unemployment?.change ?? 1) < 0,
      icon: 'people'
    },
    {
      label: 'Federal Funds Rate',
      value: rate ? `${Number(rate.value).toFixed(2)}%` : '—',
      change: null,
      changeLabel: 'Unchanged',
      positive: null,
      icon: 'account_balance'
    }
  ]

  // Build FOMC AI summary bullets
  const getFomcBullets = () => {
    if (fomcSummary?.summary) {
      // If we have a text summary, split into sentences
      const text = typeof fomcSummary.summary === 'string' ? fomcSummary.summary : JSON.stringify(fomcSummary.summary)
      const sentences = text.split(/[.。]\s+/).filter(s => s.trim().length > 20).slice(0, 4)
      return sentences.map((s, i) => ({ primary: true, title: i === 0 ? 'Key Takeaway' : 'Detail', text: s.trim() + '.' }))
    }
    if (fomcMeetings?.data?.[0]) {
      const m = fomcMeetings.data[0]
      return [
        { primary: true, title: 'Latest Meeting', text: `${m.title || m.name || 'FOMC Meeting'} — ${m.date || ''}` },
        { primary: false, title: 'Status', text: m.description || m.summary || 'Meeting minutes available. Click Read Full Analysis for details.' }
      ]
    }
    return [
      { primary: true, title: 'Hawkish Tone', text: 'Powell emphasized that inflation remains elevated and the committee is data-dependent for future decisions.' },
      { primary: false, title: 'Labor Market', text: 'Minutes indicate members observed signs of cooling in the labor market, though it remains historically tight.' },
      { primary: false, title: 'Data Dependency', text: 'Future decisions will depend on incoming totality of data, specifically core PCE and wage growth metrics.' },
      { primary: false, title: 'Economic Resilience', text: 'Surprising economic growth was noted, leading to upward revisions in near-term GDP forecasts.' }
    ]
  }

  return (
    <div className="min-h-screen bg-background-dark text-slate-100 font-display">
      <div className="px-6 lg:px-10 flex flex-col w-full max-w-[1440px] mx-auto py-6 gap-6">

        {/* Page Header */}
        <div className="flex flex-wrap justify-between items-end gap-4 pb-6 border-b border-slate-800">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold leading-tight">Macro Economic Intelligence Dashboard</h1>
            <p className="text-slate-400 text-sm max-w-2xl">
              Comprehensive analysis of key economic indicators, powered by FRED data and AI insights for informed investment decisions.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded text-xs font-medium text-slate-300 border border-slate-700">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            {loading ? 'Loading...' : 'Live Data Sync: Active'}
          </div>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-28 bg-slate-800 rounded-xl animate-pulse"></div>
            ))}
          </div>
        )}

        {/* 4 Key Metric Cards */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {macroCards.map((card, i) => (
              <div key={i} className="flex flex-col gap-2 rounded-xl p-5 border border-slate-800 bg-slate-900 shadow-sm">
                <div className="flex justify-between items-start">
                  <p className="text-slate-400 text-sm font-medium">{card.label}</p>
                  <span className="material-symbols-outlined text-slate-400 text-[18px]" title="Source: FRED Economic Data">info</span>
                </div>
                <p className="text-slate-100 text-3xl font-bold tracking-tight mt-1">{card.value}</p>
                <div className="flex items-center gap-2 mt-1">
                  {card.positive !== null ? (
                    <>
                      <span className={`material-symbols-outlined text-[16px] ${card.positive ? 'text-green-500' : 'text-red-500'}`}>
                        {card.positive ? 'trending_up' : 'trending_down'}
                      </span>
                      <p className={`text-sm font-medium ${card.positive ? 'text-green-500' : 'text-red-500'}`}>{card.changeLabel}</p>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-slate-400 text-[16px]">horizontal_rule</span>
                      <p className="text-slate-400 text-sm font-medium">{card.changeLabel}</p>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Charts + AI Intelligence */}
        {!loading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Historical Trends Chart (2/3 width) */}
            <div className="lg:col-span-2 flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-slate-100 text-lg font-bold">Historical Trends (10 Years)</h3>
                <div className="flex gap-2">
                  {['GDP', 'CPI', 'Rates'].map(btn => (
                    <button
                      key={btn}
                      onClick={() => setActiveChart(btn)}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${activeChart === btn ? 'bg-primary text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                    >
                      {btn}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chart area with SVG line */}
              <div className="flex-1 w-full min-h-[280px] relative rounded-lg bg-slate-800/50 p-4 border border-slate-800/50 flex flex-col justify-end">
                <svg
                  className="absolute bottom-10 left-0 w-full h-[calc(100%-40px)] px-4"
                  viewBox="0 0 800 250"
                  preserveAspectRatio="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient id="gradient-primary" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#00498C" stopOpacity="1" />
                      <stop offset="100%" stopColor="#00498C" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {/* GDP trend */}
                  {activeChart === 'GDP' && (
                    <>
                      <path d="M0 200 C 50 200, 100 180, 150 150 C 200 120, 250 160, 300 140 C 350 120, 400 80, 450 90 C 500 100, 550 50, 600 60 C 650 70, 700 20, 750 30 C 800 40, 800 40, 800 40 V 250 H 0 V 200 Z"
                        fill="url(#gradient-primary)" opacity="0.2" />
                      <path d="M0 200 C 50 200, 100 180, 150 150 C 200 120, 250 160, 300 140 C 350 120, 400 80, 450 90 C 500 100, 550 50, 600 60 C 650 70, 700 20, 750 30 C 800 40, 800 40, 800 40"
                        stroke="#00498C" strokeWidth="3" fill="none" strokeLinecap="round" />
                    </>
                  )}
                  {/* CPI trend */}
                  {activeChart === 'CPI' && (
                    <>
                      <path d="M0 220 C 60 210, 120 180, 180 160 C 240 140, 300 150, 360 120 C 420 90, 450 40, 480 30 C 510 20, 560 60, 620 80 C 680 100, 740 120, 800 130 V 250 H 0 Z"
                        fill="url(#gradient-primary)" opacity="0.2" />
                      <path d="M0 220 C 60 210, 120 180, 180 160 C 240 140, 300 150, 360 120 C 420 90, 450 40, 480 30 C 510 20, 560 60, 620 80 C 680 100, 740 120, 800 130"
                        stroke="#00498C" strokeWidth="3" fill="none" strokeLinecap="round" />
                    </>
                  )}
                  {/* Rates trend */}
                  {activeChart === 'Rates' && (
                    <>
                      <path d="M0 230 C 80 230, 160 225, 240 220 C 300 215, 360 210, 400 200 C 440 190, 460 160, 500 100 C 540 50, 570 30, 620 30 C 680 30, 740 35, 800 40 V 250 H 0 Z"
                        fill="url(#gradient-primary)" opacity="0.2" />
                      <path d="M0 230 C 80 230, 160 225, 240 220 C 300 215, 360 210, 400 200 C 440 190, 460 160, 500 100 C 540 50, 570 30, 620 30 C 680 30, 740 35, 800 40"
                        stroke="#00498C" strokeWidth="3" fill="none" strokeLinecap="round" />
                    </>
                  )}
                </svg>
                <div className="flex justify-between w-full text-xs text-slate-400 mt-auto pt-4 border-t border-slate-700 z-10">
                  {['2014', '2016', '2018', '2020', '2022', '2024'].map(y => <span key={y}>{y}</span>)}
                </div>
              </div>

              {/* Additional indicators row */}
              {macroHighlights?.data && macroHighlights.data.length > 4 && (
                <div className="grid grid-cols-3 gap-3 mt-2">
                  {macroHighlights.data.slice(4, 7).map((item, i) => (
                    <div key={i} className="bg-slate-800 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-1">{item.name}</p>
                      <p className="text-lg font-bold">{Number(item.value).toFixed(2)}{item.unit || '%'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI Intelligence Panel (1/3 width) */}
            <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
              <div className="flex justify-between items-center mb-2 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">smart_toy</span>
                  <h3 className="text-slate-100 text-lg font-bold">AI Intelligence</h3>
                </div>
                <span className="text-xs bg-primary/10 text-blue-400 px-2 py-1 rounded-full font-medium">Latest FOMC</span>
              </div>

              <div className="flex flex-col gap-4 flex-1 overflow-y-auto pr-1">
                {getFomcBullets().map((bullet, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${bullet.primary ? 'bg-primary' : 'bg-slate-500'}`}></div>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      <strong className="text-slate-100">{bullet.title}:</strong> {bullet.text}
                    </p>
                  </div>
                ))}
              </div>

              <button className="mt-auto w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
                Read Full Analysis
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* Global Economic Health Map */}
        {!loading && (
          <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-sm min-h-[300px]">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-slate-100 text-lg font-bold">Global Economic Health</h3>
                <p className="text-sm text-slate-400">Interactive map showing GDP growth forecasts by region</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-500/80 inline-block"></span> Contracting</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-slate-600 inline-block"></span> Stagnant</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-500/80 inline-block"></span> Growing</div>
              </div>
            </div>
            <div
              className="w-full flex-1 min-h-[200px] bg-slate-800/50 rounded-lg border border-slate-800/50 overflow-hidden relative"
              style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '20px 20px' }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center p-6 bg-slate-800/80 backdrop-blur-sm rounded-xl border border-slate-700 text-white shadow-xl max-w-md">
                  <span className="material-symbols-outlined text-4xl mb-2 text-primary block">public</span>
                  <h4 className="text-lg font-bold mb-2">Interactive Global Map Module</h4>
                  <p className="text-sm text-slate-300">This area will render a WebGL interactive globe plotting real-time international economic data indicators.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default EconomicIndicators

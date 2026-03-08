import React from 'react'
import BloombergPanelWrapper, { Skeleton } from './BloombergPanelWrapper'

const impactColor = (impact) => {
  if (!impact) return 'text-gray-600'
  const s = String(impact).toLowerCase()
  if (s === 'high' || s === '3') return 'text-red-400'
  if (s === 'medium' || s === '2') return 'text-amber-400'
  return 'text-gray-500'
}

const impactDots = (impact) => {
  const s = String(impact ?? '').toLowerCase()
  const count = s === 'high' || s === '3' ? 3 : s === 'medium' || s === '2' ? 2 : 1
  return '●'.repeat(count) + '○'.repeat(3 - count)
}

const fmtDate = (dateStr) => {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch { return dateStr.slice(5, 10) }
}

const EconomicCalendarPanel = ({ events = [], loading = false }) => {
  // Filter to upcoming + recent, show max 12
  const sorted = [...events]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 12)

  return (
    <BloombergPanelWrapper title="Economic Calendar" badge="FMP">
      {loading
        ? Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-8 w-full mb-1" />)
        : sorted.length > 0
          ? (
            <div className="overflow-hidden">
              <div className="flex text-[8px] font-mono text-gray-600 uppercase tracking-wider pb-1 border-b border-[#1a3a5c] mb-1">
                <span className="w-14">Date</span>
                <span className="flex-1">Event</span>
                <span className="w-8 text-right">Imp</span>
              </div>
              {sorted.map((evt, i) => (
                <div key={i} className="flex items-start py-1 border-b border-[#1a3a5c]/30 last:border-0">
                  <span className="text-[9px] font-mono text-gray-500 w-14 flex-shrink-0">
                    {fmtDate(evt.date)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-mono text-gray-300 truncate leading-tight">
                      {evt.event || evt.name || '—'}
                    </p>
                    {(evt.actual != null || evt.previous != null || evt.estimate != null) && (
                      <p className="text-[8px] font-mono text-gray-600 mt-0.5">
                        {evt.actual != null && <span className="text-green-500 mr-1">A:{evt.actual}</span>}
                        {evt.estimate != null && <span className="text-[#5ba4d4] mr-1">E:{evt.estimate}</span>}
                        {evt.previous != null && <span>P:{evt.previous}</span>}
                      </p>
                    )}
                  </div>
                  <span className={`text-[9px] font-mono w-8 text-right flex-shrink-0 ${impactColor(evt.impact)}`}>
                    {impactDots(evt.impact)}
                  </span>
                </div>
              ))}
            </div>
          )
          : <p className="text-[10px] text-gray-600 font-mono py-6 text-center">No events</p>
      }
    </BloombergPanelWrapper>
  )
}

export default EconomicCalendarPanel

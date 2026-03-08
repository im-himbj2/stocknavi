import React from 'react'
import BloombergPanelWrapper, { Skeleton } from './BloombergPanelWrapper'

const MacroItem = ({ label, value, unit = '', sublabel = '' }) => (
  <div className="flex items-center justify-between py-1.5 border-b border-[#1a3a5c]/40 last:border-0">
    <div>
      <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">{label}</p>
      {sublabel && <p className="text-[9px] font-mono text-gray-600">{sublabel}</p>}
    </div>
    <p className="text-[14px] font-mono font-bold text-white">
      {value != null && value !== '—' ? `${value}` : '—'}
      {value != null && value !== '—' && unit && <span className="text-[10px] text-gray-500 ml-0.5">{unit}</span>}
    </p>
  </div>
)

const MacroPanel = ({ highlights = [], pmi = null, jobless = null, consumer = null, loading = false }) => {
  const get = (name) => {
    const item = highlights.find(h => h.name === name)
    return item?.value != null ? Number(item.value).toFixed(2) : null
  }

  const latestVal = (data) => {
    if (!data || !Array.isArray(data) || data.length === 0) return null
    const obs = data[data.length - 1]
    return obs?.value ? Number(obs.value).toLocaleString('en-US', { maximumFractionDigits: 1 }) : null
  }

  const pmiVal = pmi ? Number(pmi).toFixed(1) : null

  return (
    <BloombergPanelWrapper title="Macro Indicators" badge="FRED/FMP">
      {loading
        ? Array(7).fill(0).map((_, i) => <Skeleton key={i} className="h-8 w-full mb-1" />)
        : (
          <>
            <MacroItem label="GDP Growth QoQ" value={get('GDP')} unit="%" sublabel="Latest quarter" />
            <MacroItem label="CPI YoY" value={get('CPI')} unit="%" sublabel="Inflation" />
            <MacroItem label="Unemployment" value={get('unemploymentRate')} unit="%" sublabel="Rate" />
            <MacroItem label="Fed Funds Rate" value={get('interestRate')} unit="%" sublabel="Target rate" />
            <MacroItem label="ISM Mfg PMI" value={pmiVal} sublabel={pmiVal ? (Number(pmiVal) >= 50 ? 'Expansion' : 'Contraction') : ''} />
            <MacroItem label="Jobless Claims" value={latestVal(jobless)} unit="K" sublabel="Weekly initial" />
            <MacroItem label="Consumer Sentiment" value={latestVal(consumer)} sublabel="Univ. of Michigan" />
          </>
        )
      }
    </BloombergPanelWrapper>
  )
}

export default MacroPanel

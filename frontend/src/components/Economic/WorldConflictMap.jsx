import React, { useState } from 'react'
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps'
import { Tooltip } from 'react-tooltip'
import { useLanguage } from '../../contexts/LanguageContext'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

const CONFLICT_ZONES = [
  // Active War — Red
  { numericCode: '804', name: 'Ukraine',           level: 'war',      note: 'Russia-Ukraine War' },
  { numericCode: '275', name: 'Palestine/Gaza',    level: 'war',      note: 'Israel-Hamas War' },
  { numericCode: '729', name: 'Sudan',             level: 'war',      note: 'RSF vs SAF Civil War' },
  { numericCode: '104', name: 'Myanmar',           level: 'war',      note: 'Military Junta vs Resistance' },
  { numericCode: '887', name: 'Yemen',             level: 'war',      note: 'Houthi Conflict' },
  { numericCode: '231', name: 'Ethiopia',          level: 'war',      note: 'Amhara/Tigray Conflicts' },
  { numericCode: '180', name: 'DR Congo',          level: 'war',      note: 'M23/Rwanda Eastern Congo' },
  { numericCode: '706', name: 'Somalia',           level: 'war',      note: 'Al-Shabaab Insurgency' },
  { numericCode: '466', name: 'Mali',              level: 'war',      note: 'Sahel Insurgency' },
  { numericCode: '562', name: 'Niger',             level: 'war',      note: 'Sahel Insurgency' },
  { numericCode: '854', name: 'Burkina Faso',      level: 'war',      note: 'Sahel Insurgency' },
  { numericCode: '760', name: 'Syria',             level: 'war',      note: 'Post-Assad Fragmentation' },
  { numericCode: '368', name: 'Iraq',              level: 'conflict', note: 'ISIS/PMF Activity' },
  // Active Conflict — Orange
  { numericCode: '376', name: 'Israel',            level: 'conflict', note: 'Multi-front military operations' },
  { numericCode: '422', name: 'Lebanon',           level: 'conflict', note: 'Post-Hezbollah ceasefire instability' },
  { numericCode: '566', name: 'Nigeria',           level: 'conflict', note: 'Boko Haram/ISWAP' },
  { numericCode: '508', name: 'Mozambique',        level: 'conflict', note: 'Cabo Delgado Insurgency' },
  { numericCode: '140', name: 'Central African Rep', level: 'conflict', note: 'Wagner/rebel groups' },
  { numericCode: '004', name: 'Afghanistan',       level: 'conflict', note: 'Taliban vs ISIS-K' },
  { numericCode: '586', name: 'Pakistan',          level: 'conflict', note: 'TTP / Baloch insurgency' },
  { numericCode: '484', name: 'Mexico',            level: 'conflict', note: 'Cartel Wars' },
  { numericCode: '332', name: 'Haiti',             level: 'conflict', note: 'Gang Control Collapse' },
  // Tensions — Yellow
  { numericCode: '643', name: 'Russia',            level: 'tensions', note: 'NATO confrontation' },
  { numericCode: '156', name: 'China',             level: 'tensions', note: 'Taiwan Strait / S. China Sea' },
  { numericCode: '158', name: 'Taiwan',            level: 'tensions', note: 'PRC Military Pressure' },
  { numericCode: '408', name: 'North Korea',       level: 'tensions', note: 'Missile Tests / Russia alignment' },
  { numericCode: '364', name: 'Iran',              level: 'tensions', note: 'Nuclear program / proxy conflicts' },
  { numericCode: '356', name: 'India',             level: 'tensions', note: 'Kashmir / China LAC' },
  { numericCode: '862', name: 'Venezuela',         level: 'tensions', note: 'Essequibo claim vs Guyana' },
]

const CONFLICT_COLORS = {
  war:      '#dc2626',
  conflict: '#ea580c',
  tensions: '#ca8a04',
  none:     '#1e3a5f',
}

const LEGEND_LEVELS = [
  { level: 'war',      color: '#dc2626', labelKey: 'legendWar' },
  { level: 'conflict', color: '#ea580c', labelKey: 'legendConflict' },
  { level: 'tensions', color: '#ca8a04', labelKey: 'legendTensions' },
]

const conflictLookup = new Map(CONFLICT_ZONES.map(z => [z.numericCode, z]))

const WorldConflictMap = () => {
  const { t } = useLanguage()
  const [tooltip, setTooltip] = useState('')

  return (
    <div className="relative bg-[#0a1929] border-b border-[#1a3a5c]">
      {/* Header */}
      <div className="absolute top-2.5 left-3 z-10">
        <span className="text-[10px] font-mono font-bold text-[#5ba4d4] uppercase tracking-widest">
          {t('economic.globalRiskMonitor')}
        </span>
        <span className="ml-2 text-[9px] text-gray-600 font-mono">
          {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>

      {/* Legend */}
      <div className="absolute top-2.5 right-3 z-10 flex gap-3">
        {LEGEND_LEVELS.map(({ level, color, labelKey }) => (
          <span key={level} className="flex items-center gap-1 text-[9px] font-mono text-gray-400">
            <span className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: color }} />
            {t(`economic.${labelKey}`)}
          </span>
        ))}
      </div>

      {/* Count badges */}
      <div className="absolute bottom-2.5 left-3 z-10 flex gap-2">
        {LEGEND_LEVELS.map(({ level, color, labelKey }) => {
          const count = CONFLICT_ZONES.filter(z => z.level === level).length
          return (
            <span
              key={level}
              className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm"
              style={{ backgroundColor: color + '30', color, border: `1px solid ${color}60` }}
            >
              {count} {t(`economic.${labelKey}`)}
            </span>
          )
        })}
      </div>

      <ComposableMap
        projection="geoEqualEarth"
        style={{ width: '100%', height: '300px', backgroundColor: '#0a1929' }}
        projectionConfig={{ scale: 140 }}
      >
        <ZoomableGroup zoom={1} center={[0, 20]}>
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const zone = conflictLookup.get(String(geo.id))
                const fill = zone ? CONFLICT_COLORS[zone.level] : CONFLICT_COLORS.none
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fill}
                    stroke="#071523"
                    strokeWidth={0.4}
                    style={{
                      default: { outline: 'none' },
                      hover: {
                        outline: 'none',
                        fill: zone ? fill : '#2a4a6a',
                        filter: 'brightness(1.35)',
                        cursor: zone ? 'pointer' : 'default',
                      },
                      pressed: { outline: 'none' },
                    }}
                    data-tooltip-id="conflict-tooltip"
                    data-tooltip-content={
                      zone
                        ? `${zone.name} — ${zone.note}`
                        : geo.properties?.name || ''
                    }
                  />
                )
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      <Tooltip
        id="conflict-tooltip"
        style={{
          backgroundColor: '#0a1929',
          border: '1px solid #1a3a5c',
          color: '#e2e8f0',
          fontSize: '11px',
          fontFamily: 'monospace',
          padding: '4px 8px',
          zIndex: 50,
        }}
      />
    </div>
  )
}

export default WorldConflictMap

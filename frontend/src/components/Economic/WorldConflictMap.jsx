import React, { useState, useRef, useCallback } from 'react'
import { ComposableMap, Geographies, Geography, Sphere, Graticule } from 'react-simple-maps'
import { Tooltip } from 'react-tooltip'
import { useLanguage } from '../../contexts/LanguageContext'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

const CONFLICT_ZONES = [
  // === 전쟁 (Active War) ===
  { numericCode: '804', name: 'Ukraine',              nameKo: '우크라이나',         level: 'war',      note: 'Russia-Ukraine War (2022–)',                    noteKo: '러시아-우크라이나 전쟁 (2022~)' },
  { numericCode: '643', name: 'Russia',               nameKo: '러시아',             level: 'war',      note: 'Russia-Ukraine War — Aggressor State',          noteKo: '러시아-우크라이나 전쟁 침략국' },
  { numericCode: '275', name: 'Palestine/Gaza',       nameKo: '팔레스타인/가자',    level: 'war',      note: 'Israel-Hamas War (2023–)',                       noteKo: '이스라엘-하마스 전쟁 (2023~)' },
  { numericCode: '376', name: 'Israel',               nameKo: '이스라엘',           level: 'war',      note: 'Active military ops in Gaza & Lebanon',         noteKo: '가자·레바논 군사작전 진행 중' },
  { numericCode: '729', name: 'Sudan',                nameKo: '수단',               level: 'war',      note: 'SAF vs RSF Civil War (2023–)',                   noteKo: '수단군 대 RSF 내전 (2023~)' },
  { numericCode: '104', name: 'Myanmar',              nameKo: '미얀마',             level: 'war',      note: 'Military Junta vs Resistance Civil War',        noteKo: '군사정권 대 저항군 내전' },
  { numericCode: '887', name: 'Yemen',                nameKo: '예멘',               level: 'war',      note: 'Houthi Conflict & Red Sea Crisis',              noteKo: '후티 전쟁 및 홍해 위기' },
  { numericCode: '231', name: 'Ethiopia',             nameKo: '에티오피아',         level: 'war',      note: 'Amhara Crisis & Ongoing Armed Conflicts',       noteKo: '암하라 위기 및 지속적 무력충돌' },
  { numericCode: '180', name: 'DR Congo',             nameKo: '콩고민주공화국',     level: 'war',      note: 'M23/Rwanda Eastern Congo War',                  noteKo: 'M23·르완다 동부 콩고 전쟁' },
  { numericCode: '706', name: 'Somalia',              nameKo: '소말리아',           level: 'war',      note: 'Al-Shabaab Ongoing Insurgency',                 noteKo: '알샤바브 반군 지속 활동' },

  // === 분쟁 (Active Conflict) ===
  { numericCode: '760', name: 'Syria',                nameKo: '시리아',             level: 'conflict', note: 'Post-Assad ISIS Activity & Fragmentation',      noteKo: '포스트 아사드 분열 및 IS 활동' },
  { numericCode: '368', name: 'Iraq',                 nameKo: '이라크',             level: 'conflict', note: 'ISIS Resurgence / Iranian-backed Militias',     noteKo: 'IS 재건·이란 지원 민병대 활동' },
  { numericCode: '422', name: 'Lebanon',              nameKo: '레바논',             level: 'conflict', note: 'Post-Hezbollah Ceasefire Instability',          noteKo: '헤즈볼라 휴전 이후 불안정' },
  { numericCode: '466', name: 'Mali',                 nameKo: '말리',               level: 'conflict', note: 'Sahel Insurgency (JNIM/ISIS)',                   noteKo: '사헬 반군 활동 (JNIM·IS)' },
  { numericCode: '562', name: 'Niger',                nameKo: '니제르',             level: 'conflict', note: 'Sahel Insurgency & Coup Aftermath',             noteKo: '사헬 반군 및 쿠데타 후유증' },
  { numericCode: '854', name: 'Burkina Faso',         nameKo: '부르키나파소',       level: 'conflict', note: 'Sahel Insurgency (JNIM)',                        noteKo: '사헬 반군 활동 (JNIM)' },
  { numericCode: '566', name: 'Nigeria',              nameKo: '나이지리아',         level: 'conflict', note: 'Boko Haram / ISWAP Insurgency',                 noteKo: '보코하람·ISWAP 반군 활동' },
  { numericCode: '140', name: 'Central African Rep',  nameKo: '중앙아프리카공화국', level: 'conflict', note: 'Wagner Group / Armed Rebel Factions',            noteKo: '바그너 그룹·무장 반군 활동' },
  { numericCode: '508', name: 'Mozambique',           nameKo: '모잠비크',           level: 'conflict', note: 'Cabo Delgado Islamist Insurgency',               noteKo: '카보 델가도 이슬람 반군' },
  { numericCode: '004', name: 'Afghanistan',          nameKo: '아프가니스탄',       level: 'conflict', note: 'Taliban Rule vs ISIS-K Ongoing Attacks',         noteKo: '탈레반 통치 하 IS-K 공격 지속' },
  { numericCode: '586', name: 'Pakistan',             nameKo: '파키스탄',           level: 'conflict', note: 'TTP Attacks / Baloch Separatist Insurgency',    noteKo: 'TTP 테러·발루치 분리주의 반군' },
  { numericCode: '484', name: 'Mexico',               nameKo: '멕시코',             level: 'conflict', note: 'Cartel Wars (CJNG/Sinaloa)',                     noteKo: '카르텔 전쟁 (CJNG·시날로아)' },
  { numericCode: '332', name: 'Haiti',                nameKo: '아이티',             level: 'conflict', note: 'Gang Control Collapse / State Failure',          noteKo: '갱단 무정부 상태·국가 기능 붕괴' },
  { numericCode: '218', name: 'Colombia',             nameKo: '콜롬비아',           level: 'conflict', note: 'FARC Dissidents / ELN Armed Conflict',           noteKo: 'FARC 잔당·ELN 무장 분쟁' },

  // === 긴장 (Tensions) ===
  { numericCode: '156', name: 'China',                nameKo: '중국',               level: 'tensions', note: 'Taiwan Strait / South China Sea Militarization', noteKo: '대만해협·남중국해 군사화' },
  { numericCode: '158', name: 'Taiwan',               nameKo: '대만',               level: 'tensions', note: 'PRC Invasion Threat & Military Pressure',        noteKo: '중국의 침공 위협 및 군사 압박' },
  { numericCode: '408', name: 'North Korea',          nameKo: '북한',               level: 'tensions', note: 'ICBM Tests / Russia Military Alliance',          noteKo: 'ICBM 발사·러시아 군사동맹' },
  { numericCode: '364', name: 'Iran',                 nameKo: '이란',               level: 'tensions', note: 'Nuclear Ambitions / Proxy War Network',          noteKo: '핵개발 야망·중동 대리전 네트워크' },
  { numericCode: '356', name: 'India',                nameKo: '인도',               level: 'tensions', note: 'China LAC Standoff / Pakistan-Kashmir',          noteKo: '중국 국경 대치·카슈미르 분쟁' },
  { numericCode: '862', name: 'Venezuela',            nameKo: '베네수엘라',         level: 'tensions', note: 'Essequibo Territorial Claim vs Guyana',          noteKo: '에세키보 영유권 분쟁 (가이아나)' },
  { numericCode: '031', name: 'Azerbaijan',           nameKo: '아제르바이잔',       level: 'tensions', note: 'Post-Karabakh Armenian Tensions',                noteKo: '나고르노-카라바흐 이후 아르메니아 긴장' },
]

const CONFLICT_COLORS = {
  war:      '#dc2626',
  conflict: '#ea580c',
  tensions: '#ca8a04',
  none:     '#1a3356',
}

const LEGEND_LEVELS = [
  { level: 'war',      color: '#dc2626', labelKey: 'legendWar' },
  { level: 'conflict', color: '#ea580c', labelKey: 'legendConflict' },
  { level: 'tensions', color: '#ca8a04', labelKey: 'legendTensions' },
]

const conflictLookup = new Map(CONFLICT_ZONES.map(z => [z.numericCode, z]))

const WorldConflictMap = () => {
  const { t, lang } = useLanguage()
  const [rotation, setRotation] = useState([0, -20, 0])
  const [dragging, setDragging] = useState(false)
  const lastPos = useRef(null)

  const handlePointerDown = useCallback((e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
    lastPos.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handlePointerMove = useCallback((e) => {
    if (!dragging || !lastPos.current) return
    const dx = (e.clientX - lastPos.current.x) * 0.35
    const dy = (e.clientY - lastPos.current.y) * 0.35
    setRotation(r => [
      r[0] + dx,
      Math.max(-90, Math.min(90, r[1] - dy)),
      0,
    ])
    lastPos.current = { x: e.clientX, y: e.clientY }
  }, [dragging])

  const handlePointerUp = useCallback(() => {
    setDragging(false)
    lastPos.current = null
  }, [])

  const warCount      = CONFLICT_ZONES.filter(z => z.level === 'war').length
  const conflictCount = CONFLICT_ZONES.filter(z => z.level === 'conflict').length
  const tensionCount  = CONFLICT_ZONES.filter(z => z.level === 'tensions').length

  return (
    <div
      className="relative bg-[#050d18] border-b border-[#1a3a5c] select-none overflow-hidden"
      style={{ cursor: dragging ? 'grabbing' : 'grab' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Header */}
      <div className="absolute top-2.5 left-3 z-10 flex items-center gap-3">
        <span className="text-[10px] font-mono font-bold text-[#5ba4d4] uppercase tracking-widest">
          {t('economic.globalRiskMonitor')}
        </span>
        <span className="text-[9px] text-gray-600 font-mono">
          {new Date().toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
        <span className="text-[8px] font-mono text-gray-700 italic">{lang === 'ko' ? '드래그하여 회전' : 'drag to rotate'}</span>
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

      {/* Globe */}
      <ComposableMap
        projection="geoOrthographic"
        projectionConfig={{ scale: 170, rotate: rotation }}
        style={{ width: '100%', height: '320px' }}
      >
        {/* Ocean sphere */}
        <Sphere fill="#0d2137" stroke="#1a3a5c" strokeWidth={0.8} />
        {/* Lat/lon grid lines */}
        <Graticule stroke="#1a3a5c" strokeWidth={0.3} />

        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const zone = conflictLookup.get(String(geo.id))
              const fill = zone ? CONFLICT_COLORS[zone.level] : CONFLICT_COLORS.none
              const displayName = zone ? (lang === 'ko' ? zone.nameKo : zone.name) : (geo.properties?.name || '')
              const displayNote = zone ? (lang === 'ko' ? zone.noteKo : zone.note) : ''
              const tooltipContent = zone ? `${displayName} — ${displayNote}` : displayName

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={fill}
                  stroke="#071523"
                  strokeWidth={0.4}
                  style={{
                    default:  { outline: 'none', transition: 'fill 0.1s' },
                    hover:    { outline: 'none', fill: zone ? fill : '#2a4a6a', filter: 'brightness(1.4)', cursor: zone ? 'pointer' : 'default' },
                    pressed:  { outline: 'none' },
                  }}
                  data-tooltip-id="conflict-tooltip"
                  data-tooltip-content={tooltipContent}
                />
              )
            })
          }
        </Geographies>
      </ComposableMap>

      {/* Count badges */}
      <div className="absolute bottom-2.5 left-3 z-10 flex gap-2 flex-wrap">
        {[
          { level: 'war',      count: warCount,      color: '#dc2626', labelKey: 'legendWar' },
          { level: 'conflict', count: conflictCount, color: '#ea580c', labelKey: 'legendConflict' },
          { level: 'tensions', count: tensionCount,  color: '#ca8a04', labelKey: 'legendTensions' },
        ].map(({ level, count, color, labelKey }) => (
          <span
            key={level}
            className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm"
            style={{ backgroundColor: color + '30', color, border: `1px solid ${color}60` }}
          >
            {count} {t(`economic.${labelKey}`)}
          </span>
        ))}
        <span className="text-[9px] font-mono px-1.5 py-0.5 text-gray-600">
          {lang === 'ko' ? `총 ${CONFLICT_ZONES.length}개 지역` : `${CONFLICT_ZONES.length} zones`}
        </span>
      </div>

      <Tooltip
        id="conflict-tooltip"
        style={{
          backgroundColor: '#0a1929',
          border: '1px solid #1a3a5c',
          color: '#e2e8f0',
          fontSize: '11px',
          fontFamily: 'monospace',
          padding: '4px 10px',
          zIndex: 50,
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}

export default WorldConflictMap

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ComposableMap, Geographies, Geography, Sphere, Graticule } from 'react-simple-maps'
import { Tooltip } from 'react-tooltip'
import { useLanguage } from '../../contexts/LanguageContext'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

const LEVEL_COLORS = {
  war:      '#dc2626',
  conflict: '#ea580c',
  tensions: '#ca8a04',
  none:     '#1a3356',
}

// 출처 기관 웹사이트
const SOURCE_URLS = {
  'ACLED': 'https://acleddata.com',
  'UN OCHA': 'https://www.unocha.org',
  'SIPRI': 'https://www.sipri.org',
  'ICG': 'https://www.crisisgroup.org',
  'CFR': 'https://www.cfr.org',
  'UNHCR': 'https://www.unhcr.org',
  'IAEA': 'https://www.iaea.org',
  '38 North': 'https://www.38north.org',
  'CSIS': 'https://www.csis.org',
  'InSight Crime': 'https://insightcrime.org',
  'Reuters': 'https://www.reuters.com/world',
  'SOHR': 'https://www.syriahr.org',
  'UNAMI': 'https://www.uniraq.org',
  'UN UNIFIL': 'https://unifil.unmissions.org',
  'UN MINUSMA': 'https://minusma.unmissions.org',
  'ECOWAS': 'https://www.ecowas.int',
  'UN BINUH': 'https://minujah.unmissions.org',
  'AMISOM': 'https://amisom-au.org',
  'MINUSCA': 'https://minusca.unmissions.org',
  'UNAMA': 'https://unama.unmissions.org',
  'OSCE': 'https://www.osce.org',
  'UN Panel of Experts': 'https://www.un.org/securitycouncil',
  'UN Security Council': 'https://www.un.org/securitycouncil',
}

const CONFLICT_ZONES = [
  // ======== 전쟁 (Active War) ========
  {
    numericCode: '804', name: 'Ukraine', nameKo: '우크라이나', level: 'war',
    note: 'Russia-Ukraine War (Feb 2022–)', noteKo: '러시아-우크라이나 전쟁 (2022.2~)',
    sources: ['ACLED', 'UN OCHA', 'SIPRI', 'ICG'],
  },
  {
    numericCode: '643', name: 'Russia', nameKo: '러시아', level: 'war',
    note: 'Russia-Ukraine War — Aggressor State', noteKo: '러시아-우크라이나 전쟁 침략국',
    sources: ['ACLED', 'SIPRI', 'UN Security Council', 'CFR'],
  },
  {
    numericCode: '275', name: 'Palestine/Gaza', nameKo: '팔레스타인/가자', level: 'war',
    note: 'Israel-Hamas War (Oct 2023–)', noteKo: '이스라엘-하마스 전쟁 (2023.10~)',
    sources: ['UN OCHA', 'ACLED', 'ICG', 'Reuters'],
  },
  {
    numericCode: '376', name: 'Israel', nameKo: '이스라엘', level: 'war',
    note: 'Active military ops in Gaza & Lebanon', noteKo: '가자·레바논 군사작전 진행 중',
    sources: ['ACLED', 'UN OCHA', 'ICG'],
  },
  {
    numericCode: '729', name: 'Sudan', nameKo: '수단', level: 'war',
    note: 'SAF vs RSF Civil War (Apr 2023–)', noteKo: '수단군 대 RSF 내전 (2023.4~)',
    sources: ['ACLED', 'UN OCHA', 'UNHCR', 'ICG'],
  },
  {
    numericCode: '104', name: 'Myanmar', nameKo: '미얀마', level: 'war',
    note: 'Military Junta vs Resistance Civil War (2021–)', noteKo: '군사정권 대 저항군 내전 (2021~)',
    sources: ['ACLED', 'ICG', 'UNHCR', 'UN OCHA'],
  },
  {
    numericCode: '887', name: 'Yemen', nameKo: '예멘', level: 'war',
    note: 'Houthi Conflict & Red Sea Crisis', noteKo: '후티 전쟁 및 홍해 위기',
    sources: ['ACLED', 'UN OCHA', 'SIPRI', 'ICG'],
  },
  {
    numericCode: '231', name: 'Ethiopia', nameKo: '에티오피아', level: 'war',
    note: 'Amhara Crisis & Ongoing Armed Conflicts', noteKo: '암하라 위기 및 지속적 무력충돌',
    sources: ['ACLED', 'UN OCHA', 'ICG'],
  },
  {
    numericCode: '180', name: 'DR Congo', nameKo: '콩고민주공화국', level: 'war',
    note: 'M23/Rwanda Eastern Congo War', noteKo: 'M23·르완다 동부 콩고 전쟁',
    sources: ['ACLED', 'UN OCHA', 'UNHCR', 'ICG'],
  },
  {
    numericCode: '706', name: 'Somalia', nameKo: '소말리아', level: 'war',
    note: 'Al-Shabaab Ongoing Insurgency', noteKo: '알샤바브 반군 지속 활동',
    sources: ['ACLED', 'UN OCHA', 'ICG', 'AMISOM'],
  },

  // ======== 분쟁 (Active Conflict) ========
  {
    numericCode: '760', name: 'Syria', nameKo: '시리아', level: 'conflict',
    note: 'Post-Assad ISIS Activity & Fragmentation', noteKo: '포스트 아사드 분열 및 IS 활동',
    sources: ['ACLED', 'SOHR', 'UN OCHA', 'ICG'],
  },
  {
    numericCode: '368', name: 'Iraq', nameKo: '이라크', level: 'conflict',
    note: 'ISIS Resurgence / Iranian-backed Militias', noteKo: 'IS 재건·이란 지원 민병대 활동',
    sources: ['ACLED', 'UNAMI', 'ICG'],
  },
  {
    numericCode: '422', name: 'Lebanon', nameKo: '레바논', level: 'conflict',
    note: 'Post-Hezbollah Ceasefire Instability', noteKo: '헤즈볼라 휴전 이후 불안정',
    sources: ['ACLED', 'UN UNIFIL', 'ICG'],
  },
  {
    numericCode: '466', name: 'Mali', nameKo: '말리', level: 'conflict',
    note: 'Sahel Insurgency (JNIM/ISIS)', noteKo: '사헬 반군 활동 (JNIM·IS)',
    sources: ['ACLED', 'UN MINUSMA', 'ICG'],
  },
  {
    numericCode: '562', name: 'Niger', nameKo: '니제르', level: 'conflict',
    note: 'Sahel Insurgency & Coup Aftermath', noteKo: '사헬 반군 및 쿠데타 후유증',
    sources: ['ACLED', 'ICG', 'ECOWAS'],
  },
  {
    numericCode: '854', name: 'Burkina Faso', nameKo: '부르키나파소', level: 'conflict',
    note: 'Sahel Insurgency (JNIM)', noteKo: '사헬 반군 활동 (JNIM)',
    sources: ['ACLED', 'UN OCHA', 'ICG'],
  },
  {
    numericCode: '566', name: 'Nigeria', nameKo: '나이지리아', level: 'conflict',
    note: 'Boko Haram / ISWAP Insurgency', noteKo: '보코하람·ISWAP 반군 활동',
    sources: ['ACLED', 'UN OCHA', 'ICG'],
  },
  {
    numericCode: '140', name: 'Central African Rep', nameKo: '중앙아프리카공화국', level: 'conflict',
    note: 'Wagner Group / Armed Rebel Factions', noteKo: '바그너 그룹·무장 반군 활동',
    sources: ['ACLED', 'MINUSCA', 'ICG'],
  },
  {
    numericCode: '508', name: 'Mozambique', nameKo: '모잠비크', level: 'conflict',
    note: 'Cabo Delgado Islamist Insurgency', noteKo: '카보 델가도 이슬람 반군',
    sources: ['ACLED', 'UN OCHA', 'ICG'],
  },
  {
    numericCode: '004', name: 'Afghanistan', nameKo: '아프가니스탄', level: 'conflict',
    note: 'Taliban Rule vs ISIS-K Ongoing Attacks', noteKo: '탈레반 통치 하 IS-K 공격 지속',
    sources: ['ACLED', 'UNAMA', 'ICG', 'UNHCR'],
  },
  {
    numericCode: '586', name: 'Pakistan', nameKo: '파키스탄', level: 'conflict',
    note: 'TTP Attacks / Baloch Separatist Insurgency', noteKo: 'TTP 테러·발루치 분리주의 반군',
    sources: ['ACLED', 'ICG', 'SIPRI'],
  },
  {
    numericCode: '484', name: 'Mexico', nameKo: '멕시코', level: 'conflict',
    note: 'Cartel Wars (CJNG/Sinaloa)', noteKo: '카르텔 전쟁 (CJNG·시날로아)',
    sources: ['ACLED', 'InSight Crime', 'CFR'],
  },
  {
    numericCode: '332', name: 'Haiti', nameKo: '아이티', level: 'conflict',
    note: 'Gang Control Collapse / State Failure', noteKo: '갱단 무정부 상태·국가 기능 붕괴',
    sources: ['ACLED', 'UN BINUH', 'ICG'],
  },
  {
    numericCode: '218', name: 'Colombia', nameKo: '콜롬비아', level: 'conflict',
    note: 'FARC Dissidents / ELN Armed Conflict', noteKo: 'FARC 잔당·ELN 무장 분쟁',
    sources: ['ACLED', 'InSight Crime', 'ICG'],
  },

  // ======== 긴장 (Tensions) ========
  {
    numericCode: '156', name: 'China', nameKo: '중국', level: 'tensions',
    note: 'Taiwan Strait / South China Sea Militarization', noteKo: '대만해협·남중국해 군사화',
    sources: ['SIPRI', 'CSIS', 'ICG', 'CFR'],
  },
  {
    numericCode: '158', name: 'Taiwan', nameKo: '대만', level: 'tensions',
    note: 'PRC Invasion Threat & Military Pressure', noteKo: '중국의 침공 위협 및 군사 압박',
    sources: ['SIPRI', 'CSIS', 'CFR'],
  },
  {
    numericCode: '408', name: 'North Korea', nameKo: '북한', level: 'tensions',
    note: 'ICBM Tests / Russia Military Alliance', noteKo: 'ICBM 발사·러시아 군사동맹',
    sources: ['SIPRI', '38 North', 'IAEA', 'UN Panel of Experts'],
  },
  {
    numericCode: '364', name: 'Iran', nameKo: '이란', level: 'tensions',
    note: 'Nuclear Ambitions / Proxy War Network', noteKo: '핵개발 야망·중동 대리전 네트워크',
    sources: ['IAEA', 'SIPRI', 'ICG', 'CFR'],
  },
  {
    numericCode: '356', name: 'India', nameKo: '인도', level: 'tensions',
    note: 'China LAC Standoff / Pakistan-Kashmir', noteKo: '중국 국경 대치·카슈미르 분쟁',
    sources: ['SIPRI', 'ICG', 'ACLED'],
  },
  {
    numericCode: '862', name: 'Venezuela', nameKo: '베네수엘라', level: 'tensions',
    note: 'Essequibo Territorial Claim vs Guyana', noteKo: '에세키보 영유권 분쟁 (가이아나)',
    sources: ['ICG', 'CFR', 'Reuters'],
  },
  {
    numericCode: '031', name: 'Azerbaijan', nameKo: '아제르바이잔', level: 'tensions',
    note: 'Post-Karabakh Armenian Tensions', noteKo: '나고르노-카라바흐 이후 아르메니아 긴장',
    sources: ['ACLED', 'ICG', 'OSCE'],
  },
]

const LEGEND_LEVELS = [
  { level: 'war',      color: '#dc2626', labelKey: 'legendWar' },
  { level: 'conflict', color: '#ea580c', labelKey: 'legendConflict' },
  { level: 'tensions', color: '#ca8a04', labelKey: 'legendTensions' },
]

const conflictLookup = new Map(CONFLICT_ZONES.map(z => [z.numericCode, z]))

const WorldConflictMap = () => {
  const { t, lang } = useLanguage()
  const [rotation, setRotation] = useState([0, -20, 0])
  const [scale, setScale] = useState(280)
  const [dragging, setDragging] = useState(false)
  const [selectedZone, setSelectedZone] = useState(null)
  const lastPos = useRef(null)
  const containerRef = useRef(null)
  const dragMoved = useRef(false)
  const draggingRef = useRef(false)
  const selectedZoneRef = useRef(null)

  const openZone  = useCallback((zone) => { selectedZoneRef.current = zone; setSelectedZone(zone)  }, [])
  const closeZone = useCallback(()     => { selectedZoneRef.current = null; setSelectedZone(null) }, [])

  // Wheel zoom
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e) => {
      e.preventDefault()
      setScale(s => Math.max(100, Math.min(600, s + (e.deltaY > 0 ? -30 : 30))))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const handlePointerDown = useCallback((e) => {
    if (selectedZoneRef.current) return  // modal open → block drag
    e.currentTarget.setPointerCapture(e.pointerId)
    draggingRef.current = true
    dragMoved.current = false
    setDragging(true)
    lastPos.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handlePointerMove = useCallback((e) => {
    if (!draggingRef.current || !lastPos.current) return
    const rawDx = e.clientX - lastPos.current.x
    const rawDy = e.clientY - lastPos.current.y
    if (Math.abs(rawDx) > 8 || Math.abs(rawDy) > 8) {
      dragMoved.current = true
    }
    setRotation(r => [r[0] + rawDx * 0.35, Math.max(-90, Math.min(90, r[1] - rawDy * 0.35)), 0])
    lastPos.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handlePointerUp = useCallback(() => {
    draggingRef.current = false
    setDragging(false)
    lastPos.current = null
  }, [])

  // Build rich HTML tooltip for hover
  const buildTooltip = useCallback((zone) => {
    const name     = lang === 'ko' ? zone.nameKo : zone.name
    const nameAlt  = lang === 'ko' ? zone.name   : ''
    const note     = lang === 'ko' ? zone.noteKo : zone.note
    const c        = LEVEL_COLORS[zone.level]
    const lvlLabel = {
      war:      lang === 'ko' ? '전쟁'  : 'ACTIVE WAR',
      conflict: lang === 'ko' ? '분쟁'  : 'CONFLICT',
      tensions: lang === 'ko' ? '긴장'  : 'TENSIONS',
    }[zone.level]
    const srcLabel = lang === 'ko' ? '출처' : 'Sources'
    const clickLabel = lang === 'ko' ? '클릭하여 상세보기' : 'Click for details'
    const srcs     = zone.sources.join(' · ')

    return `<div style="min-width:240px;max-width:380px;font-family:monospace">
      <div style="font-size:13px;font-weight:700;color:#e2e8f0;margin-bottom:4px">
        ${name}${nameAlt ? `&nbsp;<span style="color:#6b7280;font-size:11px;font-weight:400">${nameAlt}</span>` : ''}
      </div>
      <div style="display:inline-block;padding:2px 7px;border-radius:2px;background:${c}25;border:1px solid ${c}55;color:${c};font-size:10px;margin-bottom:8px;letter-spacing:.05em">
        ● ${lvlLabel}
      </div>
      <div style="font-size:11px;color:#d1d5db;line-height:1.5;margin-bottom:8px">${note}</div>
      <div style="font-size:9px;color:#4b6280;border-top:1px solid #1a3a5c;padding-top:5px;margin-bottom:6px">
        📋 ${srcLabel}: <span style="color:#5ba4d4">${srcs}</span>
      </div>
      <div style="font-size:8px;color:#5ba4d4;font-style:italic;padding-top:4px;border-top:1px solid #0a1929">
        👆 ${clickLabel}
      </div>
    </div>`
  }, [lang])

  const warCount      = CONFLICT_ZONES.filter(z => z.level === 'war').length
  const conflictCount = CONFLICT_ZONES.filter(z => z.level === 'conflict').length
  const tensionCount  = CONFLICT_ZONES.filter(z => z.level === 'tensions').length

  return (
    <div
      ref={containerRef}
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
        <span className="text-[8px] font-mono text-gray-700 italic">
          {lang === 'ko' ? '드래그·스크롤 줌' : 'drag · scroll to zoom'}
        </span>
      </div>

      {/* Legend */}
      <div className="absolute top-2.5 right-3 z-10 flex gap-3">
        {LEGEND_LEVELS.map(({ level, color, labelKey }) => (
          <span key={level} className="flex items-center gap-1 text-[9px] font-mono text-gray-400">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            {t(`economic.${labelKey}`)}
          </span>
        ))}
      </div>

      {/* Zoom controls */}
      <div
        className="absolute top-8 right-3 z-10 flex flex-col gap-1 mt-1"
        onPointerDown={e => e.stopPropagation()}
      >
        <button
          onClick={() => setScale(s => Math.min(600, s + 40))}
          className="w-5 h-5 bg-[#1a3a5c] hover:bg-[#2a4a6c] text-[#5ba4d4] text-[12px] font-bold rounded-sm flex items-center justify-center"
        >+</button>
        <button
          onClick={() => setScale(s => Math.max(100, s - 40))}
          className="w-5 h-5 bg-[#1a3a5c] hover:bg-[#2a4a6c] text-[#5ba4d4] text-[14px] font-bold rounded-sm flex items-center justify-center leading-none"
        >−</button>
        <button
          onClick={() => { setScale(280); setRotation([0, -20, 0]) }}
          className="w-5 h-5 bg-[#1a3a5c] hover:bg-[#2a4a6c] text-[#5ba4d4] text-[9px] font-bold rounded-sm flex items-center justify-center"
          title="Reset"
        >⌂</button>
      </div>

      {/* Globe (larger) */}
      <ComposableMap
        projection="geoOrthographic"
        projectionConfig={{ scale, rotate: rotation }}
        style={{ width: '100%', height: '380px' }}
      >
        <Sphere fill="#0d2137" stroke="#1a3a5c" strokeWidth={0.8} />
        <Graticule stroke="#1a3a5c" strokeWidth={0.25} />

        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const zone = conflictLookup.get(String(geo.id))
              const fill = zone ? LEVEL_COLORS[zone.level] : LEVEL_COLORS.none

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={fill}
                  stroke="#071523"
                  strokeWidth={0.4}
                  style={{
                    default: { outline: 'none' },
                    hover:   { outline: 'none', fill: zone ? fill : '#263d5a', filter: 'brightness(1.4)', cursor: zone ? 'pointer' : 'default' },
                    pressed: { outline: 'none' },
                  }}
                  onClick={(e) => {
                    if (zone && !dragMoved.current) {
                      e.stopPropagation()
                      openZone(zone)
                    }
                  }}
                  data-tooltip-id="conflict-tooltip"
                  data-tooltip-html={zone ? buildTooltip(zone) : undefined}
                  data-tooltip-content={!zone ? (geo.properties?.name || '') : undefined}
                />
              )
            })
          }
        </Geographies>
      </ComposableMap>

      {/* Count badges */}
      <div className="absolute bottom-2.5 left-3 z-10 flex gap-2 flex-wrap">
        {[
          { count: warCount,      color: '#dc2626', labelKey: 'legendWar' },
          { count: conflictCount, color: '#ea580c', labelKey: 'legendConflict' },
          { count: tensionCount,  color: '#ca8a04', labelKey: 'legendTensions' },
        ].map(({ count, color, labelKey }) => (
          <span
            key={labelKey}
            className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm"
            style={{ backgroundColor: color + '30', color, border: `1px solid ${color}60` }}
          >
            {count} {t(`economic.${labelKey}`)}
          </span>
        ))}
        <span className="text-[9px] font-mono text-gray-700 px-1">
          {lang === 'ko' ? `총 ${CONFLICT_ZONES.length}개 지역` : `${CONFLICT_ZONES.length} zones total`}
        </span>
      </div>

      {/* Detail Panel — rendered via portal so pointer events never reach the globe container */}
      {selectedZone && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#050d18] border-2 border-[#1a3a5c] rounded-lg p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto shadow-2xl">
            {/* Header with close button */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-mono font-bold text-white mb-1">
                  {lang === 'ko' ? selectedZone.nameKo : selectedZone.name}
                </h2>
                {lang === 'ko' && (
                  <p className="text-sm font-mono text-gray-400">{selectedZone.name}</p>
                )}
              </div>
              <button
                onClick={closeZone}
                className="text-gray-400 hover:text-white text-2xl leading-none"
              >×</button>
            </div>

            {/* Level Badge */}
            <div className="mb-4">
              <span
                className="inline-block px-3 py-1.5 rounded font-mono text-sm font-bold"
                style={{
                  backgroundColor: LEVEL_COLORS[selectedZone.level] + '25',
                  border: `1px solid ${LEVEL_COLORS[selectedZone.level]}60`,
                  color: LEVEL_COLORS[selectedZone.level],
                }}
              >
                ● {lang === 'ko' ? (
                  { war: '전쟁', conflict: '분쟁', tensions: '긴장' }[selectedZone.level]
                ) : (
                  { war: 'ACTIVE WAR', conflict: 'CONFLICT', tensions: 'TENSIONS' }[selectedZone.level]
                )}
              </span>
            </div>

            {/* Description */}
            <div className="mb-6 space-y-2">
              <p className="text-sm font-mono text-gray-300 leading-relaxed">
                {selectedZone.note}
              </p>
              {lang === 'ko' && (
                <p className="text-sm font-mono text-gray-400 leading-relaxed">
                  {selectedZone.noteKo}
                </p>
              )}
            </div>

            {/* Sources Section */}
            <div className="border-t border-[#1a3a5c] pt-4">
              <p className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">
                {lang === 'ko' ? '📋 출처 정보' : '📋 Source Information'}
              </p>
              <div className="space-y-2">
                {selectedZone.sources.map((source) => {
                  const url = SOURCE_URLS[source] || '#'
                  return (
                    <a
                      key={source}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 rounded bg-[#1a3a5c]/40 hover:bg-[#2a4a6c]/60 transition-colors text-sm font-mono text-[#5ba4d4] hover:text-white"
                    >
                      <span>→</span>
                      <span>{source}</span>
                    </a>
                  )
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-[#1a3a5c]/50">
              <button
                onClick={closeZone}
                className="w-full px-4 py-2 bg-[#1a3a5c] hover:bg-[#2a4a6c] text-[#5ba4d4] font-mono text-sm rounded transition-colors"
              >
                {lang === 'ko' ? '닫기' : 'Close'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <Tooltip
        id="conflict-tooltip"
        style={{
          backgroundColor: '#0a1929',
          border: '1px solid #1a3a5c',
          color: '#e2e8f0',
          fontFamily: 'monospace',
          padding: '10px 14px',
          zIndex: 9999,
          pointerEvents: 'none',
          maxWidth: '380px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
        }}
      />
    </div>
  )
}

export default WorldConflictMap

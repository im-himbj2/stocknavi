import React, { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ComposableMap, Geographies, Geography, Sphere, Graticule, Marker } from 'react-simple-maps'
import { Tooltip } from 'react-tooltip'
import { useLanguage } from '../../contexts/LanguageContext'
import { SUPPLY_CHAIN_NODES } from '../../data/supplyChainNodes'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

// ─── 데이터 최종 업데이트 날짜 (매일 갱신) ───────────────────────────────────
const DATA_LAST_UPDATED = '2026-03-10'

const LEVEL_COLORS = {
  war:      '#dc2626',
  conflict: '#ea580c',
  tensions: '#ca8a04',
  none:     '#1a3356',
}

// ─── 레벨 분류 기준 (Level Classification Criteria) ───────────────────────────
//
//  WAR  (red)      — 국가 간 직접 무력충돌 / State-vs-state direct armed hostilities
//    • 주권국 군대 간 조직적·지속적 교전, 대규모 사상자 발생
//    • 영토 점령·포위·체계적 군사작전 진행 중
//    • 예: 러시아→우크라이나 침공, 미국·이스라엘→이란 공습 (2026.2)
//
//  CONFLICT (orange) — 비국가 무력행위·대리전·반군 전쟁 / Sub-state or proxy armed conflict
//    • 반군·테러조직·민병대·카르텔 등과 정부군 간 지속 교전
//    • 간헐적 국가간 군사 타격(지속 캠페인 수준 미만)
//    • 예: 시리아(IS 재건), 이라크(이란계 민병대), 콜롬비아(FARC 잔당)
//
//  TENSIONS (yellow) — 군사 위협·충돌 위험 / Military posturing without active combat
//    • 군비 증강·위협·영토 분쟁(실제 교전 없음)
//    • 외교 위기·제재·역사적 적대 관계 유지
//    • 예: 북한(ICBM), 대만해협, 인도-파키스탄 카슈미르
//
// ────────────────────────────────────────────────────────────────────────────────

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
  'Al Jazeera': 'https://www.aljazeera.com',
  'BBC': 'https://www.bbc.com/news/world',
  'AP': 'https://apnews.com',
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
  'Britannica': 'https://www.britannica.com/event/2026-Iran-Conflict',
  'Wikipedia': 'https://en.wikipedia.org/wiki/2026_Iran_war',
  'EIA': 'https://www.eia.gov',
  'Bloomberg': 'https://www.bloomberg.com',
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
  {
    numericCode: '364', name: 'Iran', nameKo: '이란', level: 'war',
    note: 'US-Israel Joint War (Feb 28, 2026–). Khamenei killed. 1,300+ dead. Iran retaliated with 500+ missiles & 2,000 drones.',
    noteKo: '미·이스라엘 이란 전쟁 (2026.2.28~). 하메네이 사망. 사망 1,300명+. 이란 미사일 500발+·드론 2,000대로 보복.',
    sources: ['Al Jazeera', 'Reuters', 'BBC', 'AP', 'IAEA', 'UN Security Council', 'Britannica', 'Wikipedia'],
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

// ─── 공급망 레이어 색상/설정 ──────────────────────────────────────────────────
const NODE_TYPE_COLORS = { foundry: '#3b82f6', battery: '#8b5cf6', port: '#6b7280' }
const RISK_OPACITY = { high: 0.9, med: 0.7, low: 0.5 }
const RISK_COLORS  = { high: '#dc2626', med: '#ea580c', low: '#22c55e' }

const WorldConflictMap = () => {
  const { t, lang } = useLanguage()
  const [rotation, setRotation] = useState([0, -20, 0])
  const [scale, setScale] = useState(280)
  const [dragging, setDragging] = useState(false)
  const [selectedZone, setSelectedZone] = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const [layers, setLayers] = useState({ conflicts: true, foundry: true, battery: true, ports: false })
  const lastPos = useRef(null)
  const containerRef = useRef(null)
  const dragMoved = useRef(false)
  const draggingRef = useRef(false)
  const selectedZoneRef = useRef(null)
  const selectedNodeRef = useRef(null)

  const openZone = useCallback((zone) => {
    selectedNodeRef.current = null; setSelectedNode(null)
    selectedZoneRef.current = zone; setSelectedZone(zone)
  }, [])
  const closeZone = useCallback(() => {
    selectedZoneRef.current = null; setSelectedZone(null)
  }, [])
  const openNode = useCallback((node) => {
    selectedZoneRef.current = null; setSelectedZone(null)
    selectedNodeRef.current = node; setSelectedNode(node)
  }, [])
  const closeNode = useCallback(() => {
    selectedNodeRef.current = null; setSelectedNode(null)
  }, [])
  const toggleLayer = useCallback((key) => {
    setLayers(prev => ({ ...prev, [key]: !prev[key] }))
  }, [])

  // 글로브 가시성 체크 (직교투영에서 뒷면 숨김)
  const isVisible = useCallback((lon, lat) => {
    const [rx, ry] = rotation
    const cx = -rx * Math.PI / 180
    const cy = -ry * Math.PI / 180
    const px = lon * Math.PI / 180
    const py = lat * Math.PI / 180
    const d = Math.acos(Math.max(-1, Math.min(1,
      Math.sin(cy) * Math.sin(py) + Math.cos(cy) * Math.cos(py) * Math.cos(cx - px)
    )))
    return d < Math.PI / 2
  }, [rotation])

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
    if (selectedZoneRef.current || selectedNodeRef.current) return
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

  // 레이어 설정 (이름/색상)
  const LAYER_DEFS = [
    { key: 'conflicts', color: '#dc2626', labelKo: '분쟁 지역',    labelEn: 'Conflicts',    dotShape: 'circle' },
    { key: 'foundry',   color: '#3b82f6', labelKo: '반도체',        labelEn: 'Semiconductors', dotShape: 'circle' },
    { key: 'battery',   color: '#8b5cf6', labelKo: '배터리 소재',   labelEn: 'Battery Mtrls', dotShape: 'circle' },
    { key: 'ports',     color: '#6b7280', labelKo: '항구·해협',     labelEn: 'Ports/Straits', dotShape: 'triangle' },
  ]

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
        <span className="flex items-center gap-1 text-[9px] font-mono text-gray-500">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
          {lang === 'ko' ? '업데이트' : 'Updated'}
          {' '}
          {new Date(DATA_LAST_UPDATED).toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
        <span className="text-[8px] font-mono text-gray-700 italic">
          {lang === 'ko' ? '드래그·스크롤 줌' : 'drag · scroll to zoom'}
        </span>
      </div>

      {/* Legend (분쟁 레벨) */}
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

      {/* Globe */}
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
              const fill = (layers.conflicts && zone) ? LEVEL_COLORS[zone.level] : LEVEL_COLORS.none

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={fill}
                  stroke="#071523"
                  strokeWidth={0.4}
                  style={{
                    default: { outline: 'none' },
                    hover:   { outline: 'none', fill: zone && layers.conflicts ? fill : '#263d5a', filter: 'brightness(1.4)', cursor: zone && layers.conflicts ? 'pointer' : 'default' },
                    pressed: { outline: 'none' },
                  }}
                  onClick={(e) => {
                    if (zone && layers.conflicts && !dragMoved.current) {
                      e.stopPropagation()
                      openZone(zone)
                    }
                  }}
                  data-tooltip-id="conflict-tooltip"
                  data-tooltip-html={zone && layers.conflicts ? buildTooltip(zone) : undefined}
                  data-tooltip-content={!(zone && layers.conflicts) ? (geo.properties?.name || '') : undefined}
                />
              )
            })
          }
        </Geographies>

        {/* 공급망 노드 마커 */}
        {SUPPLY_CHAIN_NODES
          .filter(n => {
            if (!isVisible(n.lon, n.lat)) return false
            if (n.type === 'foundry') return layers.foundry
            if (n.type === 'battery') return layers.battery
            if (n.type === 'port')    return layers.ports
            return false
          })
          .map(node => {
            const color   = NODE_TYPE_COLORS[node.type]
            const opacity = RISK_OPACITY[node.risk] || 0.7
            const r = node.type === 'port' ? 5 : (5 + (node.concentration || 0) / 15)

            return (
              <Marker key={node.id} coordinates={[node.lon, node.lat]}>
                {node.type === 'port' ? (
                  // 삼각형 (항구)
                  <polygon
                    points={`0,${-r} ${r * 0.9},${r * 0.5} ${-r * 0.9},${r * 0.5}`}
                    fill={color}
                    fillOpacity={opacity}
                    stroke="#0a1929"
                    strokeWidth={0.8}
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => { e.stopPropagation(); if (!dragMoved.current) openNode(node) }}
                  />
                ) : (
                  <>
                    {/* 글로우 효과 */}
                    <circle r={r + 5} fill={color} fillOpacity={0.12} stroke="none" />
                    {/* 메인 원 */}
                    <circle
                      r={r}
                      fill={color}
                      fillOpacity={opacity}
                      stroke="#0a1929"
                      strokeWidth={0.8}
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => { e.stopPropagation(); if (!dragMoved.current) openNode(node) }}
                    />
                  </>
                )}
              </Marker>
            )
          })
        }
      </ComposableMap>

      {/* 하단 왼쪽: 분쟁 카운트 배지 */}
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

      {/* 하단 오른쪽: 레이어 토글 패널 */}
      <div
        className="absolute bottom-2.5 right-3 z-10 flex flex-col items-end gap-0.5"
        onPointerDown={e => e.stopPropagation()}
      >
        <span className="text-[7px] font-mono text-gray-600 uppercase tracking-widest mb-0.5 mr-1">
          {lang === 'ko' ? 'LAYERS' : 'LAYERS'}
        </span>
        {LAYER_DEFS.map(({ key, color, labelKo, labelEn, dotShape }) => (
          <button
            key={key}
            onClick={() => toggleLayer(key)}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[8px] font-mono transition-all ${
              layers[key] ? 'text-white bg-[#1a3a5c]/60' : 'text-gray-600 bg-transparent'
            }`}
          >
            {dotShape === 'triangle' ? (
              <svg width="8" height="8" viewBox="0 0 8 8" className="flex-shrink-0">
                <polygon points="4,1 7,7 1,7" fill={layers[key] ? color : '#374151'} />
              </svg>
            ) : (
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: layers[key] ? color : '#374151' }} />
            )}
            {lang === 'ko' ? labelKo : labelEn}
          </button>
        ))}
      </div>

      {/* 분쟁 지역 상세 모달 */}
      {selectedZone && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#050d18] border-2 border-[#1a3a5c] rounded-lg p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-mono font-bold text-white mb-1">
                  {lang === 'ko' ? selectedZone.nameKo : selectedZone.name}
                </h2>
                {lang === 'ko' && (
                  <p className="text-sm font-mono text-gray-400">{selectedZone.name}</p>
                )}
              </div>
              <button onClick={closeZone} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
            </div>

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

            <div className="mb-6">
              <p className="text-sm font-mono text-gray-300 leading-relaxed">
                {lang === 'ko' ? selectedZone.noteKo : selectedZone.note}
              </p>
            </div>

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

      {/* 공급망 노드 상세 모달 */}
      {selectedNode && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#050d18] border-2 border-[#1a3a5c] rounded-lg p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto shadow-2xl">
            {/* 헤더 */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: NODE_TYPE_COLORS[selectedNode.type] }} />
                  <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: NODE_TYPE_COLORS[selectedNode.type] }}>
                    {{ foundry: lang === 'ko' ? '반도체 파운드리' : 'Semiconductor', battery: lang === 'ko' ? '배터리 원자재' : 'Battery Materials', port: lang === 'ko' ? '핵심 항구·해협' : 'Key Port / Strait' }[selectedNode.type]}
                  </span>
                </div>
                <h2 className="text-xl font-mono font-bold text-white">
                  {lang === 'ko' ? selectedNode.nameKo : selectedNode.nameEn}
                </h2>
              </div>
              <button onClick={closeNode} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
            </div>

            {/* 리스크 레벨 + 집중도 */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <span
                className="px-2 py-1 rounded font-mono text-xs font-bold"
                style={{
                  backgroundColor: RISK_COLORS[selectedNode.risk] + '20',
                  border: `1px solid ${RISK_COLORS[selectedNode.risk]}60`,
                  color: RISK_COLORS[selectedNode.risk],
                }}
              >
                ● {{ high: lang === 'ko' ? '고위험' : 'HIGH RISK', med: lang === 'ko' ? '중위험' : 'MED RISK', low: lang === 'ko' ? '저위험' : 'LOW RISK' }[selectedNode.risk]}
              </span>
              {selectedNode.concentration && (
                <span className="text-xs font-mono text-gray-400">
                  {lang === 'ko' ? '공급 의존도' : 'Supply Dependency'}:
                  <span className="font-bold text-white ml-1">{selectedNode.concentration}%</span>
                </span>
              )}
            </div>

            {/* 설명 */}
            <p className="text-sm font-mono text-gray-300 leading-relaxed mb-4">
              {lang === 'ko' ? selectedNode.noteKo : selectedNode.noteEn}
            </p>

            {/* 영향 종목 */}
            {selectedNode.relatedStocks?.length > 0 && (
              <div className="mb-4">
                <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-2">
                  {lang === 'ko' ? '📊 영향 종목' : '📊 Affected Stocks'}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedNode.relatedStocks.map(s => (
                    <span key={s} className="px-2 py-0.5 rounded text-[10px] font-mono text-blue-300 bg-blue-900/30 border border-blue-800/40">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 관련 분쟁 지역 */}
            {selectedNode.conflictRef && (() => {
              const zone = CONFLICT_ZONES.find(z => z.numericCode === selectedNode.conflictRef)
              return zone ? (
                <div className="mb-4 p-2.5 rounded border" style={{ backgroundColor: LEVEL_COLORS[zone.level] + '10', borderColor: LEVEL_COLORS[zone.level] + '40' }}>
                  <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-1.5">
                    {lang === 'ko' ? '⚠ 관련 분쟁 지역' : '⚠ Linked Conflict Zone'}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: LEVEL_COLORS[zone.level] }} />
                    <span className="text-[11px] font-mono font-bold" style={{ color: LEVEL_COLORS[zone.level] }}>
                      {lang === 'ko' ? zone.nameKo : zone.name}
                    </span>
                    <span className="text-[9px] font-mono text-gray-500">
                      — {{ war: lang === 'ko' ? '전쟁' : 'Active War', conflict: lang === 'ko' ? '분쟁' : 'Conflict', tensions: lang === 'ko' ? '긴장' : 'Tensions' }[zone.level]}
                    </span>
                  </div>
                </div>
              ) : null
            })()}

            {/* 출처 */}
            {selectedNode.sources?.length > 0 && (
              <div className="border-t border-[#1a3a5c] pt-4 mb-4">
                <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-2">
                  {lang === 'ko' ? '📋 출처' : '📋 Sources'}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedNode.sources.map(s => {
                    const url = SOURCE_URLS[s]
                    return url ? (
                      <a key={s} href={url} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] font-mono text-[#5ba4d4] hover:text-white px-2 py-0.5 rounded bg-[#1a3a5c]/40 hover:bg-[#2a4a6c]/60 transition-colors">
                        → {s}
                      </a>
                    ) : (
                      <span key={s} className="text-[10px] font-mono text-gray-500 px-2 py-0.5 rounded bg-[#1a3a5c]/30">{s}</span>
                    )
                  })}
                </div>
              </div>
            )}

            <button
              onClick={closeNode}
              className="w-full px-4 py-2 bg-[#1a3a5c] hover:bg-[#2a4a6c] text-[#5ba4d4] font-mono text-sm rounded transition-colors"
            >
              {lang === 'ko' ? '닫기' : 'Close'}
            </button>
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

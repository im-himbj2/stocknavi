import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'

// ─── 한국 세금 계산 로직 ───────────────────────────────────────────────────────

function calcKoreanTax({ stockType, buyPrice, sellPrice, qty, holdingMonths, isMajorHolder, otherGainsKRW }) {
  const totalBuy = buyPrice * qty
  const totalSell = sellPrice * qty
  const grossGain = totalSell - totalBuy

  if (grossGain <= 0) return { grossGain, taxableIncome: 0, taxAmount: 0, localTax: 0, totalTax: 0, netGain: grossGain, note: '손실 — 과세 없음' }

  if (stockType === 'domestic_small') {
    // 국내 소액주주: 비과세
    return { grossGain, taxableIncome: 0, taxAmount: 0, localTax: 0, totalTax: 0, netGain: grossGain, note: '국내 상장주식 소액주주 — 비과세' }
  }

  if (stockType === 'domestic_major') {
    // 국내 대주주
    const DEDUCTION = 2_500_000
    const annualGain = grossGain + (otherGainsKRW || 0)
    const taxableBase = Math.max(0, annualGain - DEDUCTION)
    let rate
    if (holdingMonths < 12) {
      rate = 0.30 // 단기 (1년 미만)
    } else {
      rate = taxableBase > 300_000_000 ? 0.25 : 0.20 // 3억 초과 25%, 이하 20%
    }
    const myShare = grossGain / annualGain
    const taxAmount = Math.round(taxableBase * rate * myShare)
    const localTax = Math.round(taxAmount * 0.10)
    return { grossGain, taxableIncome: Math.round(taxableBase * myShare), taxAmount, localTax, totalTax: taxAmount + localTax, netGain: grossGain - taxAmount - localTax, rate, note: holdingMonths < 12 ? '단기 30%' : (taxableBase > 300_000_000 ? '장기 25% (3억 초과)' : '장기 20%') }
  }

  if (stockType === 'overseas') {
    // 해외주식: 22% (기본공제 250만원/년)
    const DEDUCTION = 2_500_000
    const annualGain = grossGain + (otherGainsKRW || 0)
    const taxableBase = Math.max(0, annualGain - DEDUCTION)
    const myShare = grossGain / annualGain
    const taxAmount = Math.round(taxableBase * 0.20 * myShare)
    const localTax = Math.round(taxAmount * 0.10)
    return { grossGain, taxableIncome: Math.round(taxableBase * myShare), taxAmount, localTax, totalTax: taxAmount + localTax, netGain: grossGain - taxAmount - localTax, rate: 0.22, note: '해외주식 22% (기본공제 250만원)' }
  }

  return null
}

// ─── 숫자 포맷 ────────────────────────────────────────────────────────────────
const fmtKRW = (v) => v == null ? '—' : `₩${Math.abs(v).toLocaleString('ko-KR')}${v < 0 ? ' (손실)' : ''}`
const fmtPct = (v) => v == null ? '—' : `${(v * 100).toFixed(1)}%`

export default function TaxSimulator() {
  const { lang } = useLanguage()
  const ko = lang === 'ko'
  const [searchParams] = useSearchParams()

  // URL 파라미터로 포트폴리오에서 프리필 지원
  // 예: /tax?symbol=005930&qty=100&buyPrice=65000&currentPrice=70000&stockType=domestic_major
  const [form, setForm] = useState({
    stockType: searchParams.get('stockType') || 'overseas',
    buyPrice: searchParams.get('buyPrice') || '',
    sellPrice: searchParams.get('currentPrice') || '',
    qty: searchParams.get('qty') || '',
    holdingMonths: searchParams.get('holdingMonths') || '',
    isMajorHolder: searchParams.get('stockType') === 'domestic_major',
    otherGains: '',
    currency: 'KRW',
    usdKrwRate: '1380',
  })
  const prefillSymbol = searchParams.get('symbol') || ''

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // 환율 적용
  const toKRW = (v) => {
    if (!v) return 0
    const n = parseFloat(v)
    if (form.currency === 'USD') return n * parseFloat(form.usdKrwRate || 1380)
    return n
  }

  const result = useMemo(() => {
    const buy = toKRW(form.buyPrice)
    const sell = toKRW(form.sellPrice)
    const qty = parseFloat(form.qty) || 0
    const months = parseInt(form.holdingMonths) || 0
    const other = toKRW(form.otherGains)
    if (!buy || !sell || !qty) return null
    return calcKoreanTax({
      stockType: form.stockType,
      buyPrice: buy, sellPrice: sell, qty, holdingMonths: months,
      isMajorHolder: form.isMajorHolder,
      otherGainsKRW: other,
    })
  }, [form])

  const Label = ({ children }) => (
    <label className="block text-[11px] font-mono font-bold text-gray-500 uppercase tracking-widest mb-1">{children}</label>
  )
  const Input = ({ value, onChange, placeholder, type = 'number' }) => (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-[#0a1929] border border-[#1a3a5c] rounded px-3 py-2 text-sm font-mono text-white placeholder-gray-600 focus:outline-none focus:border-[#3a7acc] transition-colors"
    />
  )
  const Select = ({ value, onChange, options }) => (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-[#0a1929] border border-[#1a3a5c] rounded px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-[#3a7acc] transition-colors"
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )

  const stockTypeOptions = ko ? [
    { value: 'domestic_small', label: '국내 상장주식 — 소액주주 (비과세)' },
    { value: 'domestic_major', label: '국내 상장주식 — 대주주' },
    { value: 'overseas',       label: '해외주식 / 해외 ETF' },
  ] : [
    { value: 'domestic_small', label: 'Domestic Listed — Minor Holder (Tax-Free)' },
    { value: 'domestic_major', label: 'Domestic Listed — Major Holder' },
    { value: 'overseas',       label: 'Overseas Stock / ETF' },
  ]

  return (
    <div className="min-h-screen bg-[#0a0f15] text-white">
      {/* 헤더 */}
      <div className="border-b border-[#1a3a5c] px-6 py-4 bg-[#050d18]">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🧮</span>
          <div>
            <h1 className="text-lg font-mono font-bold text-white tracking-wider uppercase">
              {ko ? '양도소득세 시뮬레이터' : 'Capital Gains Tax Simulator'}
            </h1>
            <p className="text-[10px] font-mono text-gray-500 mt-0.5">
              {ko ? '국내/해외 주식 양도세 간편 계산 · 참고용 추정치입니다' : 'KR/Overseas stock capital gains estimate · For reference only'}
            </p>
          </div>
        </div>
      </div>

      {/* 포트폴리오 프리필 배너 */}
      {prefillSymbol && (
        <div className="mx-4 mt-4 px-4 py-2.5 bg-blue-900/30 border border-blue-700/40 rounded-lg flex items-center gap-2 text-sm">
          <span className="text-blue-400 font-mono font-bold">{prefillSymbol}</span>
          <span className="text-slate-400">{ko ? '포트폴리오에서 자동 입력됨 · 현재가를 매도가로 설정했습니다' : 'Pre-filled from portfolio · current price set as sell price'}</span>
        </div>
      )}

      <div className="p-4 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ── 입력 패널 ── */}
          <div className="bg-[#0d1f35] border border-[#1a3a5c] rounded-xl p-5 space-y-4">
            <p className="text-[10px] font-mono font-bold text-[#5ba4d4] uppercase tracking-widest">
              {ko ? '거래 정보 입력' : 'Trade Information'}
            </p>

            {/* 종류 */}
            <div>
              <Label>{ko ? '주식 종류' : 'Stock Type'}</Label>
              <Select value={form.stockType} onChange={v => set('stockType', v)} options={stockTypeOptions} />
            </div>

            {/* 통화 */}
            <div>
              <Label>{ko ? '입력 통화' : 'Input Currency'}</Label>
              <div className="flex gap-2">
                {['KRW', 'USD'].map(c => (
                  <button
                    key={c}
                    onClick={() => set('currency', c)}
                    className={`flex-1 py-2 rounded text-xs font-mono font-bold border transition-colors ${
                      form.currency === c
                        ? 'bg-[#0070cc]/20 border-[#0070cc]/60 text-[#5ba4d4]'
                        : 'bg-[#0a1929] border-[#1a3a5c] text-gray-500 hover:text-white'
                    }`}
                  >{c}</button>
                ))}
              </div>
              {form.currency === 'USD' && (
                <div className="mt-2">
                  <Label>{ko ? '환율 (₩/USD)' : 'Exchange Rate (₩/USD)'}</Label>
                  <Input value={form.usdKrwRate} onChange={v => set('usdKrwRate', v)} placeholder="1380" />
                </div>
              )}
            </div>

            {/* 가격 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{ko ? `매입가 (${form.currency})` : `Buy Price (${form.currency})`}</Label>
                <Input value={form.buyPrice} onChange={v => set('buyPrice', v)} placeholder="0" />
              </div>
              <div>
                <Label>{ko ? `매도가 (${form.currency})` : `Sell Price (${form.currency})`}</Label>
                <Input value={form.sellPrice} onChange={v => set('sellPrice', v)} placeholder="0" />
              </div>
            </div>

            <div>
              <Label>{ko ? '수량 (주)' : 'Shares'}</Label>
              <Input value={form.qty} onChange={v => set('qty', v)} placeholder="100" />
            </div>

            {/* 대주주 전용 */}
            {form.stockType === 'domestic_major' && (
              <div>
                <Label>{ko ? '보유 기간 (개월)' : 'Holding Period (months)'}</Label>
                <Input value={form.holdingMonths} onChange={v => set('holdingMonths', v)} placeholder="24" />
              </div>
            )}

            {/* 연간 다른 양도차익 */}
            {form.stockType !== 'domestic_small' && (
              <div>
                <Label>{ko ? `올해 다른 양도차익 (${form.currency}) — 기본공제 합산용` : `Other Gains This Year (${form.currency}) — for deduction`}</Label>
                <Input value={form.otherGains} onChange={v => set('otherGains', v)} placeholder="0" />
              </div>
            )}
          </div>

          {/* ── 결과 패널 ── */}
          <div className="bg-[#0d1f35] border border-[#1a3a5c] rounded-xl p-5">
            <p className="text-[10px] font-mono font-bold text-[#5ba4d4] uppercase tracking-widest mb-4">
              {ko ? '계산 결과' : 'Tax Calculation'}
            </p>

            {!result ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-600 text-[11px] font-mono">
                {ko ? '위 정보를 입력하면 자동 계산됩니다' : 'Enter trade details to calculate'}
              </div>
            ) : (
              <div className="space-y-3">
                {/* 요약 배지 */}
                <div className={`text-center py-3 rounded-lg border ${
                  result.totalTax === 0
                    ? 'bg-green-500/10 border-green-500/30 text-green-400'
                    : 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                }`}>
                  <p className="text-[9px] font-mono uppercase tracking-widest mb-1">{ko ? '적용 세율 규정' : 'Tax Rule'}</p>
                  <p className="text-sm font-mono font-bold">{result.note}</p>
                </div>

                {/* 상세 내역 */}
                <div className="space-y-2">
                  {[
                    { label: ko ? '총 매도금액' : 'Total Sell', value: fmtKRW(parseFloat(form.sellPrice || 0) * parseFloat(form.qty || 0) * (form.currency === 'USD' ? parseFloat(form.usdKrwRate || 1380) : 1)) },
                    { label: ko ? '총 매입금액' : 'Total Buy', value: fmtKRW(parseFloat(form.buyPrice || 0) * parseFloat(form.qty || 0) * (form.currency === 'USD' ? parseFloat(form.usdKrwRate || 1380) : 1)) },
                    { label: ko ? '양도차익 (총)' : 'Gross Gain', value: fmtKRW(result.grossGain), highlight: true },
                    { label: ko ? '과세표준' : 'Taxable Income', value: fmtKRW(result.taxableIncome) },
                    { label: ko ? '양도소득세' : 'Capital Gains Tax', value: fmtKRW(result.taxAmount) },
                    { label: ko ? '지방소득세 (10%)' : 'Local Income Tax (10%)', value: fmtKRW(result.localTax) },
                    { label: ko ? '총 세금' : 'Total Tax', value: fmtKRW(result.totalTax), bold: true, color: result.totalTax > 0 ? 'text-red-400' : 'text-green-400' },
                    { label: ko ? '세후 순이익' : 'Net Gain After Tax', value: fmtKRW(result.netGain), bold: true, color: result.netGain >= 0 ? 'text-[#5ba4d4]' : 'text-red-400' },
                  ].map((row, i) => (
                    <div key={i} className={`flex justify-between items-center py-1.5 border-b border-[#1a3a5c]/40 last:border-0 ${row.highlight ? 'bg-[#1a3a5c]/20 px-2 rounded' : ''}`}>
                      <span className="text-[10px] font-mono text-gray-500">{row.label}</span>
                      <span className={`text-[11px] font-mono ${row.bold ? 'font-bold text-base' : ''} ${row.color || 'text-white'}`}>{row.value}</span>
                    </div>
                  ))}
                </div>

                {/* 실효세율 */}
                {result.grossGain > 0 && result.totalTax > 0 && (
                  <div className="mt-3 p-3 bg-[#0a1929] rounded-lg border border-[#1a3a5c]/40">
                    <p className="text-[9px] font-mono text-gray-600 mb-1">{ko ? '실효세율 (총 세금 / 양도차익)' : 'Effective Tax Rate'}</p>
                    <p className="text-lg font-mono font-bold text-orange-400">
                      {fmtPct(result.totalTax / result.grossGain)}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 세금 규정 요약 */}
        <div className="mt-4 bg-[#0d1f35] border border-[#1a3a5c] rounded-xl p-5">
          <p className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest mb-3">
            {ko ? '주요 세율 규정 (2025년 기준)' : 'Tax Rate Summary (2025)'}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[10px] font-mono">
            {[
              {
                title: ko ? '🇰🇷 국내 소액주주' : '🇰🇷 Domestic Minor Holder',
                rules: ko
                  ? ['코스피: 지분율 1% & 시가 50억원 미만', '코스닥: 지분율 2% & 시가 50억원 미만', '→ 양도세 비과세']
                  : ['KOSPI: <1% holding & <₩5B market value', 'KOSDAQ: <2% holding & <₩5B market value', '→ Capital gains tax-free'],
                color: 'text-green-400',
              },
              {
                title: ko ? '🇰🇷 국내 대주주' : '🇰🇷 Domestic Major Holder',
                rules: ko
                  ? ['단기 (1년 미만): 30%', '장기 (1년 이상): 20% / 25%*', '기본공제: 250만원/년', '*3억원 초과분 25%']
                  : ['Short-term (<1yr): 30%', 'Long-term (≥1yr): 20% / 25%*', 'Annual deduction: ₩2.5M', '*25% above ₩300M'],
                color: 'text-orange-400',
              },
              {
                title: ko ? '🌍 해외주식/ETF' : '🌍 Overseas Stock/ETF',
                rules: ko
                  ? ['세율: 22% (소득세 20% + 지방 2%)', '기본공제: 250만원/년', '환율: 매입·매도 시점 기준환율', '손익통산: 동일 연도 내 가능']
                  : ['Rate: 22% (20% + 2% local)', 'Annual deduction: ₩2.5M', 'FX rate: acquisition/disposal date', 'Loss offset within same year'],
                color: 'text-blue-400',
              },
            ].map((card, i) => (
              <div key={i} className="bg-[#0a1929] rounded-lg p-3 border border-[#1a3a5c]/40">
                <p className={`font-bold mb-2 ${card.color}`}>{card.title}</p>
                {card.rules.map((r, j) => (
                  <p key={j} className="text-gray-500 leading-relaxed">{r}</p>
                ))}
              </div>
            ))}
          </div>
          <p className="text-[8px] font-mono text-gray-700 mt-3">
            {ko
              ? '※ 본 계산기는 참고용 추정치입니다. 실제 납부세액은 세무사 상담을 권장합니다. 금융투자소득세(금투세) 관련 사항은 포함되지 않습니다.'
              : '※ This calculator provides estimates for reference only. Consult a tax professional for actual tax obligations.'}
          </p>
        </div>
      </div>
    </div>
  )
}

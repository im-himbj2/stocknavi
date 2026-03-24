import { Link } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import apiService from '../services/api'
import ShelfDisplay from '../components/Shelf/ShelfDisplay'
import MarketTicker from '../components/Home/MarketTicker'
import Navbar from '../components/Layout/Navbar'
import CandleBackground from '../components/Home/CandleBackground'
import { useLanguage } from '../contexts/LanguageContext'

function Home() {
  const { t } = useLanguage()
  const [searchSymbol, setSearchSymbol] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [marketIndices, setMarketIndices] = useState([])
  const searchRef = useRef(null)

  const majorStocks = [
    { symbol: 'AAPL', name: 'Apple Inc.' },
    { symbol: 'NVDA', name: 'NVIDIA' },
    { symbol: 'TSLA', name: 'Tesla' },
    { symbol: 'MSFT', name: 'Microsoft' },
    { symbol: '005930', name: '삼성전자' },
    { symbol: '000660', name: 'SK하이닉스' },
  ]

  useEffect(() => {
    if (searchSymbol.trim()) {
      const filtered = majorStocks.filter(
        stock => stock.symbol.toLowerCase().includes(searchSymbol.toLowerCase()) ||
          stock.name.toLowerCase().includes(searchSymbol.toLowerCase())
      ).slice(0, 5)
      setSuggestions(filtered)
      setShowSuggestions(filtered.length > 0)
    } else {
      setShowSuggestions(false)
    }
  }, [searchSymbol])

  return (
    <div className="bg-[#0a0f15] text-white min-h-screen selection:bg-[#0070cc]/30 overflow-x-hidden">
      {/* 최상단 내비게이션 바 */}
      <Navbar />

      {/* 마켓 티커 (내비바 아래로 이동) */}
      <MarketTicker />

      {/* 배경 캔들차트 애니메이션 */}
      <CandleBackground />

      {/* 배경 장식 - 더욱 섬세한 조명 효과 */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#0070cc]/12 rounded-full blur-[150px] animate-pulse"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#0070cc]/8 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '3s' }}></div>
        <div className="absolute top-[30%] left-[20%] w-[30%] h-[30%] bg-[#0070cc]/5 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative z-10">
        {/* 히어로 섹션 - 더욱 대담한 타이포그래피 */}
        <section className="pt-32 pb-24 px-6">
          <div className="container mx-auto text-center max-w-5xl">
            <div className="inline-flex items-center gap-3 px-4 py-1.5 mb-10 rounded-full border border-[#0070cc]/40 bg-[#0070cc]/10 backdrop-blur-3xl animate-fade-in shadow-[0_0_20px_rgba(0,73,140,0.15)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#5BA4D4] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0070cc]"></span>
              </span>
              <span className="text-[11px] text-[#5BA4D4] font-black uppercase tracking-[0.2em]">{t('home.badge')}</span>
            </div>

            <h1 className="text-6xl md:text-8xl font-black mb-10 leading-[0.9] tracking-tight animate-title font-headline">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#a5c8ff] to-[#4edea3]">
                {t('home.headline1') || '정밀한 투자'}
              </span>
              <br />
              <span className="text-white">
                {t('home.headline2') || '인텔리전스'}
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-400/80 mb-16 max-w-3xl mx-auto font-medium leading-relaxed tracking-tight whitespace-pre-line">
              {t('home.subtitle')}
            </p>

            {/* 통합 검색바 - 더욱 세련된 글래스모피즘 */}
            <div className="max-w-2xl mx-auto relative group" ref={searchRef}>
              <div className="absolute -inset-1 bg-gradient-to-r from-[#0070cc] to-[#0066CC] rounded-[2rem] blur opacity-20 group-focus-within:opacity-40 transition duration-1000"></div>
              <div className="relative flex items-center bg-white/[0.03] border border-white/10 p-2.5 rounded-[1.8rem] backdrop-blur-3xl focus-within:bg-white/[0.06] focus-within:border-[#0070cc]/60 transition-all shadow-2xl">
                <div className="pl-6 text-[#5BA4D4]/60">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <input
                  type="text"
                  value={searchSymbol}
                  onChange={(e) => setSearchSymbol(e.target.value.toUpperCase())}
                  placeholder={t('home.searchPlaceholder')}
                  className="w-full bg-transparent px-5 py-4 text-base font-medium focus:outline-none placeholder-gray-500"
                />
                <Link
                  to={searchSymbol ? `/company?symbol=${searchSymbol}` : '/company'}
                  className="bg-[#0070cc] hover:bg-[#0059B3] text-white px-10 py-4 rounded-[1.2rem] text-sm font-black transition-all shadow-lg shadow-[#0070cc]/30 hover:scale-[1.02] active:scale-[0.98]"
                >
                  {t('home.searchBtn')}
                </Link>
              </div>

              {showSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-4 bg-[#0A090C]/95 border border-white/10 rounded-[1.5rem] overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.8)] z-50 backdrop-blur-2xl animate-slide-up">
                  {suggestions.map((s, i) => (
                    <Link
                      key={i}
                      to={`/company?symbol=${s.symbol}`}
                      className="flex items-center justify-between px-8 py-5 hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors"
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-black text-white text-lg tracking-tight">{s.symbol}</span>
                        <span className="text-xs text-[#5BA4D4]/60 font-bold uppercase tracking-widest">{s.name}</span>
                      </div>
                      <div className="text-[#0070cc]/50">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 피처 카드 섹션 — Stitch 2x2 그리드 */}
        <section className="py-20 relative">
          <div className="container mx-auto px-6 max-w-5xl">
            <div className="text-center mb-12">
              <p className="text-[10px] font-black text-[#5BA4D4]/80 uppercase tracking-[0.4em] mb-4">{t('home.marketInsightSub')}</p>
              <h2 className="text-4xl md:text-5xl font-black text-white font-headline tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50">{t('home.marketInsightTitle')}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[
                { path: '/company', icon: '📊', title: t('sidebar.company'), desc: t('home.feature.company') || 'AI 기반 한국·미국 종목 심층 분석 및 재무 데이터', glow: '#0070cc', borderColor: '#0070cc' },
                { path: '/economic', icon: '🌐', title: t('sidebar.economic'), desc: t('home.feature.economic') || '실시간 경제지표, 글로벌 시장, Fear & Greed 지수', glow: '#8b5cf6', borderColor: '#8b5cf6' },
                { path: '/speech', icon: '🏛️', title: t('sidebar.speech'), desc: t('home.feature.speech') || 'FOMC 연설 AI 요약 및 매파/비둘기파 스코어', glow: '#06b6d4', borderColor: '#06b6d4' },
                { path: '/portfolio', icon: '💼', title: t('sidebar.portfolio'), desc: t('home.feature.portfolio') || '포트폴리오 관리, 대주주 경고, 양도세 시뮬레이터', glow: '#f59e0b', borderColor: '#f59e0b' },
              ].map((card) => (
                <Link
                  key={card.path}
                  to={card.path}
                  className="group relative rounded-2xl p-7 bg-surface-container border border-outline-variant/20 hover:border-outline-variant/40 overflow-hidden transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Glow effect */}
                  <div
                    className="absolute top-0 left-0 w-32 h-32 rounded-full blur-[60px] opacity-20 group-hover:opacity-30 transition-opacity"
                    style={{ background: card.glow }}
                  />
                  <div className="relative z-10">
                    <span className="text-5xl block mb-5">{card.icon}</span>
                    <h3 className="text-lg font-bold text-on-surface font-headline mb-2">{card.title}</h3>
                    <p className="text-sm text-on-surface-variant leading-relaxed mb-5">{card.desc}</p>
                    <span className="text-sm font-bold" style={{ color: card.borderColor }}>시작하기 →</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Footer CTA - 마지막 인상 */}
        <section className="py-40 bg-gradient-to-b from-transparent via-[#0070cc]/8 to-[#0070cc]/15 border-t border-white/5">
          <div className="container mx-auto px-6 text-center">
            <h2 className="text-6xl md:text-8xl font-black text-white mb-10 tracking-tighter uppercase leading-[0.9]">Elevate Your<br />Visibility</h2>
            <p className="text-gray-400 mb-16 max-w-2xl mx-auto text-lg font-semibold italic">{t('home.ctaQuote')}</p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link to="/login" className="px-12 py-5 bg-white text-black font-black uppercase text-sm rounded-[1.2rem] hover:bg-gray-200 transition-all shadow-[0_10px_30px_rgba(255,255,255,0.2)]">{t('home.ctaStart')}</Link>
              <Link to="/subscription" className="px-12 py-5 bg-white/5 border border-white/20 text-white font-black uppercase text-sm rounded-[1.2rem] hover:bg-white/10 transition-all backdrop-blur-md">{t('home.ctaPricing')}</Link>
            </div>

            <div className="mt-32 pt-16 border-t border-white/5">
              <div className="text-[11px] text-gray-500 font-black uppercase tracking-[0.4em] leading-loose">
                STOCKNAVI SYSTEMS © 2024 — REDEFINING MARKET INTELLIGENCE <br />
                PRECISION POWERED BY FRED & YAHOO DATA
              </div>
            </div>
          </div>
        </section>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes title {
          from { opacity: 0; transform: scale(0.95); filter: blur(10px); }
          to { opacity: 1; transform: scale(1); filter: blur(0); }
        }
        .animate-fade-in {
          animation: fade-in 1s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .animate-title {
          animation: title 1.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .animate-slide-up {
          animation: fade-in 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  )
}

export default Home

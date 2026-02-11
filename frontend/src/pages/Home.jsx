import { Link } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import apiService from '../services/api'
import ShelfDisplay from '../components/Shelf/ShelfDisplay'
import MarketTicker from '../components/Home/MarketTicker'
import Navbar from '../components/Layout/Navbar'
import CandleBackground from '../components/Home/CandleBackground'

function Home() {
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
    <div className="bg-[#020617] text-white min-h-screen selection:bg-blue-500/30 overflow-x-hidden">
      {/* 최상단 내비게이션 바 */}
      <Navbar />

      {/* 마켓 티커 (내비바 아래로 이동) */}
      <MarketTicker />

      {/* 배경 캔들차트 애니메이션 */}
      <CandleBackground />

      {/* 배경 장식 - 더욱 섬세한 조명 효과 */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[150px] animate-pulse"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-indigo-600/10 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '3s' }}></div>
        <div className="absolute top-[30%] left-[20%] w-[30%] h-[30%] bg-purple-600/5 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative z-10">
        {/* 히어로 섹션 - 더욱 대담한 타이포그래피 */}
        <section className="pt-32 pb-24 px-6">
          <div className="container mx-auto text-center max-w-5xl">
            <div className="inline-flex items-center gap-3 px-4 py-1.5 mb-10 rounded-full border border-blue-400/20 bg-blue-400/5 backdrop-blur-3xl animate-fade-in shadow-[0_0_20px_rgba(59,130,246,0.1)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              <span className="text-[11px] text-blue-300 font-black uppercase tracking-[0.2em]">The Future of Market Wisdom</span>
            </div>

            <h1 className="text-7xl md:text-[10rem] font-black mb-10 leading-[0.85] tracking-[-0.05em] animate-title">
              Precise<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-br from-white via-blue-100 to-blue-600/50">
                Intelligence
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-400/80 mb-16 max-w-3xl mx-auto font-medium leading-relaxed tracking-tight">
              가장 정교한 AI 터미널로 시장의 소음을 제거하고 <br className="hidden md:block" />
              숨겨진 투자 기회를 데이터를 통해 증명하세요.
            </p>

            {/* 통합 검색바 - 더욱 세련된 글래스모피즘 */}
            <div className="max-w-2xl mx-auto relative group" ref={searchRef}>
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-[2rem] blur opacity-20 group-focus-within:opacity-40 transition duration-1000"></div>
              <div className="relative flex items-center bg-white/[0.03] border border-white/10 p-2.5 rounded-[1.8rem] backdrop-blur-3xl focus-within:bg-white/[0.06] focus-within:border-blue-500/40 transition-all shadow-2xl">
                <div className="pl-6 text-blue-400/60">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <input
                  type="text"
                  value={searchSymbol}
                  onChange={(e) => setSearchSymbol(e.target.value.toUpperCase())}
                  placeholder="분석할 종목을 입력하세요 (AAPL, NVDA, 삼성전자...)"
                  className="w-full bg-transparent px-5 py-4 text-base font-medium focus:outline-none placeholder-gray-500"
                />
                <Link
                  to={searchSymbol ? `/company?symbol=${searchSymbol}` : '/company'}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-[1.2rem] text-sm font-black transition-all shadow-lg shadow-blue-900/40 hover:scale-[1.02] active:scale-[0.98]"
                >
                  분석 실행
                </Link>
              </div>

              {showSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-4 bg-[#0a0f1e]/95 border border-white/10 rounded-[1.5rem] overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.8)] z-50 backdrop-blur-2xl animate-slide-up">
                  {suggestions.map((s, i) => (
                    <Link
                      key={i}
                      to={`/company?symbol=${s.symbol}`}
                      className="flex items-center justify-between px-8 py-5 hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors"
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-black text-white text-lg tracking-tight">{s.symbol}</span>
                        <span className="text-xs text-blue-400/60 font-bold uppercase tracking-widest">{s.name}</span>
                      </div>
                      <div className="text-blue-500/40">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 선반 디스플레이 섹션 - 메인 콘텐츠로 격상 */}
        <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-blue-600/5 blur-[120px] rounded-full translate-y-1/2"></div>
          <div className="container mx-auto px-6 relative">
            <div className="text-center mb-24">
              <h2 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40">Market Insight</h2>
              <p className="text-blue-400 font-bold uppercase tracking-[0.4em] text-[10px]">데이터로 정밀하게 탐색하세요</p>
            </div>
            <ShelfDisplay />
          </div>
        </section>

        {/* Footer CTA - 마지막 인상 */}
        <section className="py-40 bg-gradient-to-b from-transparent via-blue-900/10 to-blue-900/20 border-t border-white/5">
          <div className="container mx-auto px-6 text-center">
            <h2 className="text-6xl md:text-8xl font-black text-white mb-10 tracking-tighter uppercase leading-[0.9]">Elevate Your<br />Visibility</h2>
            <p className="text-gray-400 mb-16 max-w-2xl mx-auto text-lg font-semibold italic">"시장은 소음으로 가득합니다. 우리는 당신이 행동할 수 있는 정적을 제공합니다."</p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link to="/login" className="px-12 py-5 bg-white text-black font-black uppercase text-sm rounded-[1.2rem] hover:bg-gray-200 transition-all shadow-[0_10px_30px_rgba(255,255,255,0.2)]">지금 시작하기</Link>
              <Link to="/subscription" className="px-12 py-5 bg-white/5 border border-white/20 text-white font-black uppercase text-sm rounded-[1.2rem] hover:bg-white/10 transition-all backdrop-blur-md">요금제 보기</Link>
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

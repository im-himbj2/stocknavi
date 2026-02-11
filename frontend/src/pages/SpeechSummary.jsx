import { useState, useEffect } from 'react'
import apiService from '../services/api'

function SpeechSummary() {
  const [fomcMeetings, setFomcMeetings] = useState([])
  const [recentSpeeches, setRecentSpeeches] = useState([])
  const [selectedSpeech, setSelectedSpeech] = useState(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('fomc') // 'fomc' or 'speeches'
  const [lastUpdated, setLastUpdated] = useState(null)

  // FOMC 회의록 로드
  const fetchFOMCMeetings = async (forceRefresh = false) => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiService.getFOMCMeetings(10, forceRefresh)
      setFomcMeetings(data.items || [])
      if (data.updated_at) {
        setLastUpdated(new Date(data.updated_at))
      }
    } catch (err) {
      setError(err.message || '회의록을 불러오지 못했습니다.')
      console.error('FOMC 회의록 조회 오류:', err)
    } finally {
      setLoading(false)
    }
  }

  // 최근 연설문 로드
  const fetchRecentSpeeches = async (forceRefresh = false) => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiService.getRecentSpeeches(10, forceRefresh)
      setRecentSpeeches(data.items || [])
      if (data.updated_at) {
        setLastUpdated(new Date(data.updated_at))
      }
    } catch (err) {
      setError(err.message || '연설문을 불러오지 못했습니다.')
      console.error('최근 연설문 조회 오류:', err)
    } finally {
      setLoading(false)
    }
  }

  // 새로고침 핸들러
  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      if (activeTab === 'fomc') {
        await fetchFOMCMeetings(true)
      } else {
        await fetchRecentSpeeches(true)
      }
    } finally {
      setRefreshing(false)
    }
  }

  // 업데이트 시간 포맷팅
  const formatUpdateTime = (date) => {
    if (!date) return ''
    const now = new Date()
    const diffMs = now - date
    const diffMinutes = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)

    if (diffMinutes < 1) return '방금 전'
    if (diffMinutes < 60) return `${diffMinutes}분 전`
    if (diffHours < 24) return `${diffHours}시간 전`
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }



  // 연설 요약 로드
  const fetchSpeechSummary = async (speechId, retryCount = 0) => {
    // 새로운 요약을 불러올 때 기존 선택 상태 초기화 (로딩 스피너 표시 유도)
    if (retryCount === 0) {
      setSelectedSpeech(null)
    }

    setLoading(true)
    setError(null)
    try {
      const summary = await apiService.getSpeechSummary(speechId, false)
      if (summary && summary.summary) {
        setSelectedSpeech(summary)
        setLoading(false) // 성공 시 로딩 해제
      } else {
        throw new Error('요약 데이터가 없습니다.')
      }
    } catch (err) {
      // 재시도 로직 (최대 2회)
      if (retryCount < 2) {
        console.log(`[Speech Summary] Retry ${retryCount + 1} for ${speechId}`)
        const timeoutId = setTimeout(() => {
          fetchSpeechSummary(speechId, retryCount + 1)
        }, 2000)
        return () => clearTimeout(timeoutId)
      } else {
        setError(err.response?.data?.detail || err.message || '요약을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
        setLoading(false) // 재시도 실패 시 로딩 해제
      }
    }
  }

  // 초기 로드
  useEffect(() => {
    fetchFOMCMeetings()
    fetchRecentSpeeches()
  }, [])

  // 탭 변경 시 데이터 로드
  useEffect(() => {
    if (activeTab === 'fomc') {
      fetchFOMCMeetings()
    } else {
      fetchRecentSpeeches()
    }
  }, [activeTab])

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive':
        return 'text-green-400 bg-green-400/20 border-green-400/50'
      case 'negative':
        return 'text-red-400 bg-red-400/20 border-red-400/50'
      default:
        return 'text-gray-400 bg-gray-400/20 border-gray-400/50'
    }
  }

  const getSentimentText = (sentiment) => {
    switch (sentiment) {
      case 'positive': return '긍정적 (Dovish)'
      case 'negative': return '부정적 (Hawkish)'
      default: return '중립적'
    }
  }

  // 매파/비둘기파 라벨 및 색상
  const getHawkDoveInfo = (score) => {
    if (score >= 70) return { label: '매파적 (Hawkish)', color: 'text-red-400', bg: 'bg-red-400/10' }
    if (score <= 30) return { label: '비둘기파적 (Dovish)', color: 'text-blue-400', bg: 'bg-blue-400/10' }
    return { label: '중립적 (Neutral)', color: 'text-gray-400', bg: 'bg-gray-400/10' }
  }

  return (
    <div className="relative min-h-screen bg-black pt-24 pb-12 overflow-hidden">
      {/* 배경 효과 */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[-5%] left-[-5%] w-[35%] h-[35%] bg-cyan-900/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-5%] right-[-5%] w-[35%] h-[35%] bg-blue-900/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="container mx-auto px-6 relative z-10 max-w-7xl">
        {/* 헤더 */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-3 tracking-tight">
              Fed <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Intelligence</span>
            </h1>
            <p className="text-gray-400 text-lg">연준 인사들의 목소리와 정책 방향성을 AI로 정밀 분석합니다</p>
          </div>
          <div className="flex items-center gap-4">
            {lastUpdated && (
              <div className="text-sm text-gray-500">
                <span className="text-gray-600">마지막 업데이트:</span> {formatUpdateTime(lastUpdated)}
              </div>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl text-sm font-medium text-gray-300 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {refreshing ? '새로고침 중...' : '새로고침'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-900/20 border border-red-500/50 rounded-xl flex items-center justify-between backdrop-blur-md">
            <p className="text-red-400 text-sm font-medium">{error}</p>
            <button
              onClick={() => activeTab === 'fomc' ? fetchFOMCMeetings() : fetchRecentSpeeches()}
              className="px-4 py-1.5 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-colors"
            >
              재시도
            </button>
          </div>
        )}

        <div className="grid lg:grid-cols-12 gap-8">
          {/* 목록 사이드바 */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-2 flex gap-1 backdrop-blur-md">
              <button
                onClick={() => { setActiveTab('fomc'); setSelectedSpeech(null); }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'fomc' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
              >
                FOMC MINUTES
              </button>
              <button
                onClick={() => { setActiveTab('speeches'); setSelectedSpeech(null); }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'speeches' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
              >
                SPEECHES
              </button>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md max-h-[70vh] overflow-y-auto custom-scrollbar">
              {loading && (fomcMeetings.length === 0 || recentSpeeches.length === 0) ? (
                <div className="flex justify-center py-10 opacity-50">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                </div>
              ) : (activeTab === 'fomc' ? fomcMeetings : recentSpeeches).map((item) => (
                <button
                  key={item.id}
                  onClick={() => fetchSpeechSummary(item.id)}
                  className={`w-full text-left p-4 rounded-xl mb-2 transition-all group ${selectedSpeech?.id === item.id
                    ? 'bg-blue-500/10 border border-blue-500/50'
                    : 'bg-white/5 border border-transparent hover:bg-white/10 hover:border-white/10'
                    }`}
                >
                  <div className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${selectedSpeech?.id === item.id ? 'text-blue-400' : 'text-gray-600 group-hover:text-gray-400'}`}>
                    {item.date}
                  </div>
                  <div className={`text-sm font-bold leading-snug line-clamp-2 ${selectedSpeech?.id === item.id ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>
                    {item.title}
                  </div>
                  {item.speaker && (
                    <div className="mt-2 text-[10px] text-gray-500 font-medium italic">by {item.speaker}</div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 메인 리포트 영역 */}
          <div className="lg:col-span-9">
            {loading && !selectedSpeech ? (
              <div className="bg-white/5 border border-white/10 rounded-3xl p-20 flex flex-col items-center justify-center backdrop-blur-md">
                <div className="relative w-20 h-20 mb-6">
                  <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin"></div>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Analyzing Report...</h3>
                <p className="text-gray-500">AI가 연설문의 맥락과 성향을 분석 중입니다.</p>
              </div>
            ) : selectedSpeech ? (
              <div className="space-y-6 animate-fade-in">
                {/* 리포트 탑 카드 */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pb-8 border-b border-white/10">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-500/30">
                          {selectedSpeech.type.toUpperCase()}
                        </span>
                        <span className="text-gray-600 font-bold text-xs uppercase tracking-widest">{selectedSpeech.date}</span>
                      </div>
                      <h2 className="text-3xl md:text-4xl font-black text-white leading-tight">{selectedSpeech.title}</h2>
                    </div>
                    {selectedSpeech.speaker && (
                      <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xl font-black text-white">
                          {selectedSpeech.speaker[0]}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white leading-none mb-1">{selectedSpeech.speaker}</div>
                          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{selectedSpeech.speaker_info?.role || 'FED Member'}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 주요 메트릭 그리드 */}
                  <div className="grid md:grid-cols-3 gap-4 mb-8">
                    {/* 매파/비둘기파 스케일 */}
                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10 relative overflow-hidden group">
                      <div className="relative z-10 text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Hawk-Dove Meter</div>
                      <div className="relative z-10 h-2 w-full bg-white/10 rounded-full mb-3 flex items-center">
                        <div
                          className="absolute h-full rounded-full bg-gradient-to-r from-blue-500 via-gray-400 to-red-500 transition-all duration-1000"
                          style={{ width: '100%' }}
                        ></div>
                        <div
                          className="absolute w-4 h-4 bg-white rounded-full shadow-lg border-2 border-black transition-all duration-1000 z-20"
                          style={{ left: `${selectedSpeech.hawk_dove_score}%`, transform: 'translateX(-50%)' }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-[9px] font-black text-gray-600 uppercase mb-2">
                        <span>Dovish</span>
                        <span>Hawkish</span>
                      </div>
                      <div className={`text-lg font-black ${getHawkDoveInfo(selectedSpeech.hawk_dove_score).color} relative z-10 uppercase tracking-tight`}>
                        {getHawkDoveInfo(selectedSpeech.hawk_dove_score).label}
                      </div>
                    </div>

                    {/* 시장 영향력 점수 */}
                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Market Impact</div>
                      <div className="flex items-end gap-1 mb-2">
                        <span className="text-4xl font-black text-white leading-none">{selectedSpeech.market_impact_score}</span>
                        <span className="text-gray-600 font-bold mb-1">/10</span>
                      </div>
                      <div className="flex gap-1">
                        {Array(10).fill(0).map((_, i) => (
                          <div key={i} className={`h-1 flex-1 rounded-full ${i < selectedSpeech.market_impact_score ? 'bg-cyan-500' : 'bg-white/10'}`}></div>
                        ))}
                      </div>
                    </div>

                    {/* 핵심 키워드 */}
                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Key Keywords</div>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedSpeech.keywords.map((tag, i) => (
                          <span key={i} className="px-2 py-0.5 bg-white/5 text-[9px] font-black text-gray-400 border border-white/10 rounded uppercase">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 요약 본문 - 2단 구성 느낌 */}
                  <div className="grid md:grid-cols-4 gap-8">
                    <div className="md:col-span-3">
                      <h3 className="text-xs font-black text-gray-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <span className="w-8 h-[1px] bg-gray-600"></span>
                        Executive Summary
                      </h3>
                      <div className="prose prose-invert max-w-none text-gray-300">
                        <p className="text-lg leading-relaxed font-medium whitespace-pre-wrap selection:bg-blue-500/30">
                          {selectedSpeech.summary}
                        </p>
                      </div>
                    </div>
                    <div className="md:col-span-1 border-l border-white/10 pl-8 hidden md:block">
                      <h3 className="text-xs font-black text-gray-600 uppercase tracking-[0.2em] mb-4">Analysis Context</h3>
                      <div className="space-y-6">
                        <div>
                          <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Bias Info</div>
                          <div className="text-xs text-gray-300 font-medium">{selectedSpeech.speaker_info?.bias || 'N/A'}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Sentiment</div>
                          <div className={`text-xs font-bold ${getSentimentColor(selectedSpeech.sentiment)}`}>{getSentimentText(selectedSpeech.sentiment)}</div>
                        </div>
                        <div className="pt-4 mt-4 border-t border-white/5">
                          <a
                            href={selectedSpeech.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] font-black text-blue-400 hover:text-blue-300 uppercase tracking-widest group flex items-center gap-1"
                          >
                            Source Documents
                            <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-3xl p-20 flex flex-col items-center justify-center backdrop-blur-md opacity-50 grayscale hover:grayscale-0 transition-all">
                <div className="p-6 bg-white/5 rounded-full mb-6 text-4xl">📚</div>
                <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">Ready to Analyze</h3>
                <p className="text-gray-500 max-w-xs text-center">왼쪽 목록에서 분석할 회의록이나 연설문을 선택하십시오. 인공지능이 즉시 맥락을 파헤칩니다.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SpeechSummary

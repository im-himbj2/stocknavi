import { useState, useEffect } from 'react'
import apiService from '../services/api'

function SpeechSummary() {
  const [fomcMeetings, setFomcMeetings] = useState([])
  const [recentSpeeches, setRecentSpeeches] = useState([])
  const [selectedSpeech, setSelectedSpeech] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('fomc') // 'fomc' or 'speeches'

  // FOMC 회의록 로드
  const fetchFOMCMeetings = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiService.getFOMCMeetings(10)
      setFomcMeetings(data.items || [])
    } catch (err) {
      setError(err.message || '회의록을 불러오지 못했습니다.')
      console.error('FOMC 회의록 조회 오류:', err)
    } finally {
      setLoading(false)
    }
  }

  // 최근 연설문 로드
  const fetchRecentSpeeches = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiService.getRecentSpeeches(10)
      setRecentSpeeches(data.items || [])
    } catch (err) {
      setError(err.message || '연설문을 불러오지 못했습니다.')
      console.error('최근 연설문 조회 오류:', err)
    } finally {
      setLoading(false)
    }
  }

  // 연설 요약 로드
  const fetchSpeechSummary = async (speechId, retryCount = 0) => {
    setLoading(true)
    setError(null)
    try {
      const summary = await apiService.getSpeechSummary(speechId, false)
      if (summary && summary.summary) {
        setSelectedSpeech(summary)
      } else {
        throw new Error('요약 데이터가 없습니다.')
      }
    } catch (err) {
      // 재시도 로직 (최대 2회)
      if (retryCount < 2) {
        const timeoutId = setTimeout(() => {
          fetchSpeechSummary(speechId, retryCount + 1)
        }, 2000)
        // 컴포넌트 언마운트 시 cleanup을 위해 ref 사용 (선택적)
        return () => clearTimeout(timeoutId)
      } else {
        setError(err.response?.data?.detail || err.message || '요약을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
      }
    } finally {
      if (retryCount >= 2) {
        setLoading(false)
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
      case 'positive':
        return '긍정적'
      case 'negative':
        return '부정적'
      default:
        return '중립적'
    }
  }

  return (
    <div className="relative min-h-screen">
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* 헤더 */}
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
            연설 요약
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            FOMC 회의록 및 경제 연설의 AI 기반 요약으로 핵심 정보를 빠르게 확인하세요
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-500 rounded-lg flex items-center justify-between gap-4">
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={() => {
                setError(null)
                activeTab === 'fomc' ? fetchFOMCMeetings() : fetchRecentSpeeches()
              }}
              className="px-3 py-1 text-xs bg-white text-black rounded-md hover:bg-gray-100"
            >
              재시도
            </button>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* 왼쪽: 목록 */}
          <div className="lg:col-span-1">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => {
                    setActiveTab('fomc')
                    setSelectedSpeech(null)
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'fomc'
                      ? 'bg-white text-black'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  FOMC 회의록
                </button>
                <button
                  onClick={() => {
                    setActiveTab('speeches')
                    setSelectedSpeech(null)
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'speeches'
                      ? 'bg-white text-black'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  연설문
                </button>
              </div>

              {loading && activeTab === 'fomc' && fomcMeetings.length === 0 ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
              ) : activeTab === 'fomc' ? (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {fomcMeetings.map((meeting) => (
                    <button
                      key={meeting.id}
                      onClick={() => fetchSpeechSummary(meeting.id)}
                      className={`w-full text-left p-4 rounded-lg border transition-all ${
                        selectedSpeech?.id === meeting.id
                          ? 'bg-white/10 border-white/20'
                          : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="text-sm font-semibold text-white mb-1">{meeting.title}</div>
                      <div className="text-xs text-gray-400">{meeting.date}</div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {loading && recentSpeeches.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                  ) : (
                    recentSpeeches.map((speech) => (
                      <button
                        key={speech.id}
                        onClick={() => fetchSpeechSummary(speech.id)}
                        className={`w-full text-left p-4 rounded-lg border transition-all ${
                          selectedSpeech?.id === speech.id
                            ? 'bg-white/10 border-white/20'
                            : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="text-sm font-semibold text-white mb-1 line-clamp-2">{speech.title}</div>
                        <div className="text-xs text-gray-400 mb-1">{speech.date}</div>
                        {speech.speaker && (
                          <div className="text-xs text-gray-500">{speech.speaker}</div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 오른쪽: 요약 */}
          <div className="lg:col-span-2">
            {loading && !selectedSpeech ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
                <p className="text-gray-400">요약을 생성하는 중...</p>
              </div>
            ) : selectedSpeech ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-white mb-2">{selectedSpeech.title}</h2>
                    <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                      <span>{selectedSpeech.date}</span>
                      {selectedSpeech.speaker && (
                        <>
                          <span>•</span>
                          <span>{selectedSpeech.speaker}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {selectedSpeech.sentiment && (
                    <div className={`px-3 py-1 rounded-lg text-xs font-semibold border ${getSentimentColor(selectedSpeech.sentiment)}`}>
                      {getSentimentText(selectedSpeech.sentiment)}
                    </div>
                  )}
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-3">요약</h3>
                  <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-white/10 rounded-xl p-6 shadow-lg">
                    <p className="text-gray-200 leading-relaxed whitespace-pre-wrap text-base">
                      {selectedSpeech.summary}
                    </p>
                  </div>
                </div>

                {selectedSpeech.keywords && selectedSpeech.keywords.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-white mb-3">주요 키워드</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedSpeech.keywords.map((keyword, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-white/10 border border-white/20 rounded-lg text-sm text-gray-300"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-6 border-t border-white/10">
                  <a
                    href={selectedSpeech.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    원문 보기 →
                  </a>
                  {selectedSpeech.cached && (
                    <span className="text-xs text-gray-500">캐시된 데이터</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
                <p className="text-gray-400 mb-4">왼쪽에서 회의록 또는 연설문을 선택하세요</p>
                <p className="text-sm text-gray-500">
                  AI가 자동으로 핵심 내용을 요약하고 주요 키워드를 추출합니다
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SpeechSummary

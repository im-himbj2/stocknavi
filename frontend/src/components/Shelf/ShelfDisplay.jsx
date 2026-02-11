import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FeatureCard from './FeatureCard';

const FEATURES = [
  {
    id: '01',
    title: 'DIVIDEND LAB',
    subtitle: '배당 분석 터미널',
    description: '배당 이력과 수익률을 심층 분석하여 안정적인 수익 기회를 발견하세요.',
    category: 'Analysis',
    color: 'from-emerald-900 via-emerald-700 to-emerald-500',
    iconType: 'dividend',
    link: '/dividend',
    details: [
      '10년간의 배당 성장률 히트맵',
      '배당 컷(Cut) 위험도 AI 예측',
      '섹터별 배당 수익률 비교 차트',
      '월별 예상 배당금 캘린더'
    ]
  },
  {
    id: '02',
    title: 'FINANCE LAB',
    subtitle: '기업 정밀 분석',
    description: 'AI 기반 재무 분석과 기술적 지표로 투자 가치를 정확히 평가하세요.',
    category: 'Core',
    color: 'from-blue-900 via-blue-700 to-blue-500',
    iconType: 'company',
    link: '/company',
    details: [
      'DCF 및 RIM 기반 적정 주가 산출',
      '재무제표 3개년 시각화 분석',
      '경쟁사 대비 PER/PBR 밸류에이션',
      '내부자 거래 실시간 알림'
    ]
  },
  {
    id: '03',
    title: 'MACRO PULSE',
    subtitle: '글로벌 경제 지표',
    description: '실시간 경제 데이터와 시장 동향을 한눈에 파악하세요.',
    category: 'Macro',
    color: 'from-purple-900 via-purple-700 to-purple-500',
    iconType: 'market',
    link: '/economic',
    details: [
      '미국채 금리 장단기 역전 감지',
      '공포 탐욕 지수(Fear & Greed) 추적',
      'VIX 지수 기반 변동성 경고',
      '주요 원자재(금, 오일) 상관관계 분석'
    ]
  },
  {
    id: '04',
    title: 'FED INTEL',
    subtitle: '중앙은행 인사이트',
    description: 'FOMC 회의록 및 경제 연설의 AI 기반 요약으로 핵심 정보를 확인하세요.',
    category: 'AI',
    color: 'from-cyan-900 via-cyan-700 to-cyan-500',
    iconType: 'speech',
    link: '/speech',
    details: [
      '파월 의장 연설 톤(Tone) 분석',
      '주요 키워드 빈도 워드클라우드',
      '매파/비둘기파 성향 점수화',
      '과거 발언 대비 변경점 하이라이트'
    ]
  },
  {
    id: '05',
    title: 'ASSET HUB',
    subtitle: '자산 관리 포트폴리오',
    description: '개인 포트폴리오를 체계적으로 관리하고 성과를 추적하세요.',
    category: 'Personal',
    color: 'from-amber-900 via-amber-700 to-amber-500',
    iconType: 'portfolio',
    link: '/portfolio',
    details: [
      '자산 배분 파이 차트 자동 생성',
      '벤치마크(S&P500) 대비 수익률 비교',
      '환율 변동에 따른 자산 가치 계산',
      '리밸런싱 필요 시점 알림'
    ]
  }
];

const ShelfDisplay = () => {
  const [selectedId, setSelectedId] = useState(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const navigate = useNavigate();

  // Body scroll locking when overlay is active
  useEffect(() => {
    if (selectedId) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedId]);

  // Close overlay on Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setSelectedId(null);
        setIsFlipped(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const handleCardClick = (id, link) => {
    if (selectedId === id) {
      // Already open
    } else {
      setSelectedId(id);
      setIsFlipped(false);
    }
  };

  const handleBackgroundClick = () => {
    setSelectedId(null);
    setIsFlipped(false);
  };

  const handleOverlayCardClick = (e) => {
    e.stopPropagation();
    setIsFlipped(!isFlipped);
  };

  const handleLaunchApp = (link) => {
    navigate(link);
    setSelectedId(null);
    setIsFlipped(false);
  };

  const selectedFeature = FEATURES.find(f => f.id === selectedId);

  return (
    <>
      {/* ================= MAIN SHELF GRID ================= */}
      <div className={`w-full relative py-20 px-4 md:px-8 max-w-[1800px] mx-auto transition-all duration-700 ${selectedId ? 'blur-sm scale-95 opacity-50 grayscale' : ''}`}>

        {/* 5-Column Grid Layout */}
        <div className="relative z-10 grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-10 lg:gap-16 w-full place-items-end h-[600px] mb-8">
          {FEATURES.map((feature, index) => (
            <div
              key={feature.id}
              className="w-full animate-entrance"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <FeatureCard
                item={feature}
                variant="shelf"
                onClick={() => handleCardClick(feature.id, feature.link)}
              />
            </div>
          ))}
        </div>

        {/* The Physical Shelf Visual */}
        <div className="absolute top-[600px] left-0 w-full h-12 z-0 pointer-events-none animate-entrance" style={{ animationDelay: '800ms' }}>
          <div className="absolute top-0 w-full h-[1px] bg-gradient-to-r from-white/10 via-white/40 to-white/10"></div>
          <div className="absolute top-[1px] w-full h-full bg-gradient-to-b from-[#111] to-[#050505]"></div>
          <div className="absolute top-full w-full h-32 bg-gradient-to-b from-black/80 to-transparent"></div>
        </div>
      </div>

      {/* ================= OVERLAY (FOCUS MODE) ================= */}
      <div
        className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-500 ${selectedId ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
      >
        {/* Backdrop (Darken & Blur) */}
        <div
          className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-500"
          onClick={handleBackgroundClick}
        ></div>

        {/* Centered Large Card */}
        {selectedFeature && (
          <div className={`transform transition-all duration-500 ${selectedId ? 'scale-100 translate-y-0' : 'scale-90 translate-y-20'}`}>
            <div onClick={handleOverlayCardClick}>
              <FeatureCard
                item={selectedFeature}
                variant="overlay"
                isFlipped={isFlipped}
                onClick={handleOverlayCardClick}
                link={isFlipped ? selectedFeature.link : null}
              />
            </div>
            <p className="text-center text-white/40 mt-8 text-sm animate-pulse tracking-widest uppercase font-light">
              {isFlipped ? 'Click card to flip back  |  Click background to close' : 'Click card for details  |  Click background to close'}
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default ShelfDisplay;


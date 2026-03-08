import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FeatureCard from './FeatureCard';
import { useLanguage } from '../../contexts/LanguageContext';

const FEATURE_BASES = [
  { id: '01', category: 'Core',     color: 'from-blue-900 via-blue-700 to-blue-500',   iconType: 'company',   link: '/company'    },
  { id: '02', category: 'Macro',    color: 'from-purple-900 via-purple-700 to-purple-500', iconType: 'market', link: '/economic'   },
  { id: '03', category: 'AI',       color: 'from-cyan-900 via-cyan-700 to-cyan-500',    iconType: 'speech',    link: '/speech'     },
  { id: '04', category: 'Personal', color: 'from-amber-900 via-amber-700 to-amber-500', iconType: 'portfolio', link: '/portfolio'  },
];

const ShelfDisplay = () => {
  const [selectedId, setSelectedId] = useState(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const features = FEATURE_BASES.map((base, i) => ({
    ...base,
    title: t(`shelf.features.${i}.title`),
    subtitle: t(`shelf.features.${i}.subtitle`),
    description: t(`shelf.features.${i}.description`),
    details: [0,1,2,3].map(j => t(`shelf.features.${i}.details.${j}`)),
  }));

  useEffect(() => {
    if (selectedId) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [selectedId]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') { setSelectedId(null); setIsFlipped(false); }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const handleCardClick = (id) => {
    if (selectedId !== id) { setSelectedId(id); setIsFlipped(false); }
  };

  const handleBackgroundClick = () => { setSelectedId(null); setIsFlipped(false); };
  const handleOverlayCardClick = (e) => { e.stopPropagation(); setIsFlipped(!isFlipped); };
  const handleLaunchApp = (link) => { navigate(link); setSelectedId(null); setIsFlipped(false); };

  const selectedFeature = features.find(f => f.id === selectedId);

  return (
    <>
      {/* ================= MAIN SHELF GRID ================= */}
      <div className={`w-full relative py-20 px-4 md:px-8 max-w-[1800px] mx-auto transition-all duration-700 ${selectedId ? 'blur-sm scale-95 opacity-50 grayscale' : ''}`}>
        <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-10 lg:gap-16 w-full place-items-end h-[600px] mb-8">
          {features.map((feature, index) => (
            <div
              key={feature.id}
              className="w-full animate-entrance"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <FeatureCard
                item={feature}
                variant="shelf"
                onClick={() => handleCardClick(feature.id)}
              />
            </div>
          ))}
        </div>

        {/* The Physical Shelf Visual */}
        <div className="absolute top-[600px] left-0 w-full h-12 z-0 pointer-events-none animate-entrance" style={{ animationDelay: '800ms' }}>
          <div className="absolute top-0 w-full h-[1px] bg-gradient-to-r from-white/10 via-white/40 to-white/10"></div>
          <div className="absolute top-[1px] w-full h-full bg-gradient-to-b from-[#1C1C20] to-[#0A090C]"></div>
          <div className="absolute top-full w-full h-32 bg-gradient-to-b from-black/80 to-transparent"></div>
        </div>
      </div>

      {/* ================= OVERLAY (FOCUS MODE) ================= */}
      <div
        className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-500 ${selectedId ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
      >
        <div
          className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-500"
          onClick={handleBackgroundClick}
        ></div>

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
              {isFlipped ? t('shelf.overlayFlipHint') : t('shelf.overlayHint')}
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default ShelfDisplay;

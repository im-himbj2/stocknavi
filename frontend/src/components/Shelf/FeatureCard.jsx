import { Link } from 'react-router-dom';
import { DividendIcon, CompanyIcon, MarketIcon, SpeechIcon, PortfolioIcon, ArrowRight } from './Icons';

const FeatureCard = ({ item, variant, isFlipped = false, onClick, link }) => {
  const getIcon = (sizeClass) => {
    switch (item.iconType) {
      case 'dividend': return <DividendIcon className={`${sizeClass} text-white/90 drop-shadow-md`} />;
      case 'company': return <CompanyIcon className={`${sizeClass} text-white/90 drop-shadow-md`} />;
      case 'market': return <MarketIcon className={`${sizeClass} text-white/90 drop-shadow-md`} />;
      case 'speech': return <SpeechIcon className={`${sizeClass} text-white/90 drop-shadow-md`} />;
      case 'portfolio': return <PortfolioIcon className={`${sizeClass} text-white/90 drop-shadow-md`} />;
      default: return null;
    }
  };

  const containerClasses = variant === 'shelf'
    ? "w-full cursor-pointer hover:-translate-y-6 hover:scale-105 transition-all duration-500 animate-float"
    : "w-[360px] md:w-[450px] cursor-pointer animate-fadeInUp";

  const aspectRatioClass = "aspect-[3/4]";

  const cardContent = (
    <div 
      className={`group relative flex flex-col items-center justify-end ${containerClasses} perspective-[1200px] z-50`}
      onClick={onClick}
    >
      {/* 3D Flip Container */}
      <div 
        className={`
          relative w-full ${aspectRatioClass}
          transition-all duration-700 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]
          [transform-style:preserve-3d]
        `}
        style={{
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          boxShadow: variant === 'overlay' ? '0 50px 100px -20px rgba(0,0,0,0.7)' : undefined
        }}
      >
        {/* ================= FRONT FACE ================= */}
        <div className={`
            absolute inset-0 w-full h-full
            rounded-xl overflow-hidden
            bg-gradient-to-br ${item.color}
            border border-white/10
            [backface-visibility:hidden]
            ${variant === 'shelf' ? 'shadow-2xl' : ''}
            overflow-hidden
        `}>
            {/* Holographic Sheen Effect (Diagonal Swipe) */}
            <div className="absolute inset-0 pointer-events-none z-20 mix-blend-soft-light opacity-50">
               <div className="absolute inset-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-shine"></div>
            </div>

            {/* Noise Texture */}
            <div className="absolute inset-0 opacity-[0.15] mix-blend-overlay pointer-events-none" 
                 style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
            </div>

            {/* Lighting */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/40 pointer-events-none"></div>
            
            {/* Content */}
            <div className="absolute inset-0 p-8 flex flex-col justify-between relative z-10">
                <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/90 border border-white/20 px-3 py-1.5 rounded-full backdrop-blur-md">
                    {item.category}
                    </span>
                    {variant === 'overlay' && !isFlipped && (
                       <span className="text-[10px] text-white/70 animate-pulse">Click to flip</span>
                    )}
                </div>
                
                <div className="flex flex-col items-center justify-center h-full">
                    <div className="transform transition-transform duration-700 group-hover:scale-110">
                        {getIcon(variant === 'overlay' ? 'w-32 h-32 mb-8' : 'w-20 h-20 mb-6')}
                    </div>
                    <h3 className={`${variant === 'overlay' ? 'text-5xl' : 'text-3xl'} font-bold text-white text-center leading-tight drop-shadow-xl`}>
                        {item.title}
                    </h3>
                </div>

                <div className="w-full flex justify-between items-end">
                    <span className="text-[10px] uppercase tracking-widest text-white/50">Vol. {item.id}</span>
                    {variant === 'shelf' && (
                        <div className="bg-white/10 p-2 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowRight className="w-4 h-4 text-white" />
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* ================= BACK FACE (Details) ================= */}
        <div className={`
            absolute inset-0 w-full h-full
            rounded-xl overflow-hidden
            bg-[#0f0f0f]
            border border-white/20
            [backface-visibility:hidden] [transform:rotateY(180deg)]
            flex flex-col
        `}>
            {/* Glossy overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
            
            <div className="p-8 h-full flex flex-col relative z-10">
                <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
                     <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
                         {item.subtitle}
                     </span>
                     <span className="text-xs text-gray-500 font-mono">{item.id}</span>
                </div>

                <div className="flex-grow space-y-6">
                    <p className="text-gray-300 leading-relaxed font-light text-sm md:text-base">
                        {item.description}
                    </p>

                    <ul className="space-y-3 mt-4">
                        {item.details.map((detail, idx) => (
                            <li key={idx} className="flex items-start gap-3 text-sm text-gray-400">
                                <span className={`mt-1.5 w-1.5 h-1.5 rounded-full bg-gradient-to-br ${item.color}`}></span>
                                <span>{detail}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="mt-auto pt-6 border-t border-white/10">
                    {link ? (
                        <Link 
                            to={link}
                            onClick={(e) => e.stopPropagation()}
                            className="block w-full py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors uppercase tracking-widest text-xs text-center"
                        >
                            Launch Application
                        </Link>
                    ) : (
                        <button 
                            onClick={(e) => e.stopPropagation()}
                            className="w-full py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors uppercase tracking-widest text-xs"
                        >
                            Launch Application
                        </button>
                    )}
                </div>
            </div>
        </div>
      </div>

      {/* Reflection Effect (Only show in Shelf mode) */}
      {variant === 'shelf' && (
        <div 
            className={`
                absolute -bottom-[102%] w-[98%] aspect-[3/4] rounded-xl overflow-hidden opacity-40 pointer-events-none
                transform scale-y-[-1]
                transition-all duration-700
                group-hover:translate-y-6 group-hover:scale-105
            `}
            style={{
                maskImage: 'linear-gradient(to top, rgba(0,0,0,0) 20%, rgba(0,0,0,0.6) 100%)',
                WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0) 20%, rgba(0,0,0,0.6) 100%)',
            }}
        >
            <div className={`w-full h-full bg-gradient-to-br ${item.color} blur-[2px]`}></div>
        </div>
      )}

      {/* Text Info Below Shelf (Only show in Shelf mode) */}
      {variant === 'shelf' && (
        <div className="mt-16 text-center transition-all duration-500 opacity-40 group-hover:opacity-100 group-hover:translate-y-0 translate-y-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500">{item.id} — Edition</p>
            <p className="text-base font-medium text-white mt-1 tracking-tight">{item.subtitle}</p>
        </div>
      )}
    </div>
  );

  return cardContent;
};

export default FeatureCard;


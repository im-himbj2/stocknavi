function Footer() {
  return (
    <footer className="bg-black border-t border-white/5 mt-auto">
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-white font-semibold mb-4">Trading Tools</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="/company" className="hover:text-white transition-colors">기업 분석</a></li>
                <li><a href="/dividend" className="hover:text-white transition-colors">배당 분석</a></li>
                <li><a href="/economic" className="hover:text-white transition-colors">경제 지표</a></li>
                <li><a href="/news" className="hover:text-white transition-colors">뉴스</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Get Started</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="/" className="hover:text-white transition-colors">홈</a></li>
                <li><a href="/portfolio" className="hover:text-white transition-colors">포트폴리오</a></li>
                <li><a href="/speech" className="hover:text-white transition-colors">연설 요약</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">이용약관</a></li>
                <li><a href="#" className="hover:text-white transition-colors">개인정보처리방침</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">About</h3>
              <p className="text-sm text-gray-400">
                StockNavi - 주식 투자 네비게이터로 더 나은 투자 결정을 내리세요.
              </p>
            </div>
          </div>
          
          <div className="border-t border-white/5 pt-8">
            <div className="text-xs text-gray-500 space-y-3 leading-relaxed">
              <p>
                Trading and investing involve significant risk of loss. StockNavi provides AI-powered analysis tools for educational purposes only and does not constitute financial advice. Always consult a licensed financial advisor before making investment decisions. Past performance is not indicative of future results.
              </p>
              <p>
                본 사이트는 <span className="text-gray-300">Yahoo Finance</span>, 
                <span className="text-gray-300"> Financial Modeling Prep (FMP)</span> 및 
                <span className="text-gray-300"> FRED</span> 데이터를 사용합니다.
              </p>
              <p>
                <strong className="text-gray-400">FRED API:</strong> FRED API 사용 시 
                <a 
                  href="https://fred.stlouisfed.org/docs/api/terms_of_use.html" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-white hover:text-gray-300 underline ml-1"
                >
                  FRED API 이용약관
                </a>
                을 준수합니다.
              </p>
            </div>
            <div className="mt-6 pt-6 border-t border-white/5">
              <p className="text-xs text-gray-500 text-center">
                © {new Date().getFullYear()} StockNavi. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer

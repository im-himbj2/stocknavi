import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Dividend from './pages/Dividend'
import CompanyAnalysis from './pages/CompanyAnalysis'
import EconomicIndicators from './pages/EconomicIndicators'
import SpeechSummary from './pages/SpeechSummary'
import Portfolio from './pages/Portfolio'
import News from './pages/News'
import Subscription from './pages/Subscription'
import Login from './pages/Login'
import Navbar from './components/Layout/Navbar'
import Footer from './components/Layout/Footer'

function App() {
  // 에러 바운더리 추가 (개발 환경에서 에러 확인)
  if (process.env.NODE_ENV === 'development') {
    window.addEventListener('error', (event) => {
      console.error('전역 에러:', event.error)
    })
    window.addEventListener('unhandledrejection', (event) => {
      console.error('처리되지 않은 Promise 거부:', event.reason)
    })
  }

  return (
    <AuthProvider>
      <Router>
        <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dividend" element={
          <ProtectedRoute>
            <div className="min-h-screen bg-black text-white flex flex-col">
              <Navbar />
              <main className="flex-1">
                <Dividend />
              </main>
              <Footer />
            </div>
          </ProtectedRoute>
        } />
        <Route path="/company" element={
          <ProtectedRoute>
            <div className="min-h-screen bg-black text-white flex flex-col">
              <Navbar />
              <main className="flex-1">
                <CompanyAnalysis />
              </main>
              <Footer />
            </div>
          </ProtectedRoute>
        } />
        <Route path="/economic" element={
          <div className="min-h-screen bg-black text-white flex flex-col">
            <Navbar />
            <main className="flex-1">
              <EconomicIndicators />
            </main>
            <Footer />
          </div>
        } />
        <Route path="/speech" element={
          <div className="min-h-screen bg-black text-white flex flex-col">
            <Navbar />
            <main className="flex-1">
              <SpeechSummary />
            </main>
            <Footer />
          </div>
        } />
        <Route path="/portfolio" element={
          <ProtectedRoute>
            <div className="min-h-screen bg-black text-white flex flex-col">
              <Navbar />
              <main className="flex-1">
                <Portfolio />
              </main>
              <Footer />
            </div>
          </ProtectedRoute>
        } />
        <Route path="/news" element={
          <ProtectedRoute>
            <div className="min-h-screen bg-black text-white flex flex-col">
              <Navbar />
              <main className="flex-1">
                <News />
              </main>
              <Footer />
            </div>
          </ProtectedRoute>
        } />
        <Route path="/subscription" element={
          <ProtectedRoute>
            <div className="min-h-screen bg-black text-white flex flex-col">
              <Navbar />
              <main className="flex-1">
                <Subscription />
              </main>
              <Footer />
            </div>
          </ProtectedRoute>
        } />
        <Route path="/subscription/success" element={
          <ProtectedRoute>
            <div className="min-h-screen bg-black text-white flex flex-col">
              <Navbar />
              <main className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-4xl font-bold mb-4 text-green-400">구독 완료!</h1>
                  <p className="text-gray-400 mb-8">프리미엄 기능을 사용할 수 있습니다.</p>
                  <a href="/" className="px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 transition-all">
                    홈으로 돌아가기
                  </a>
                </div>
              </main>
              <Footer />
            </div>
          </ProtectedRoute>
        } />
        <Route path="/subscription/cancel" element={
          <ProtectedRoute>
            <div className="min-h-screen bg-black text-white flex flex-col">
              <Navbar />
              <main className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-4xl font-bold mb-4 text-gray-400">구독 취소됨</h1>
                  <p className="text-gray-400 mb-8">구독이 취소되었습니다.</p>
                  <a href="/subscription" className="px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 transition-all">
                    구독 페이지로 돌아가기
                  </a>
                </div>
              </main>
              <Footer />
            </div>
          </ProtectedRoute>
        } />
        <Route path="/login" element={
          <div className="min-h-screen bg-black text-white flex flex-col">
            <Navbar />
            <main className="flex-1">
              <Login />
            </main>
            <Footer />
          </div>
        } />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App


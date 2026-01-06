import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import apiService from '../services/api'

function Subscription() {
  const [plans, setPlans] = useState([])
  const [subscriptionStatus, setSubscriptionStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  // 구독 플랜 로드
  const fetchPlans = async () => {
    try {
      const data = await apiService.getSubscriptionPlans()
      setPlans(data)
    } catch (err) {
      setError(err.message)
      console.error('구독 플랜 조회 오류:', err)
    }
  }

  // 구독 상태 로드
  const fetchSubscriptionStatus = async () => {
    try {
      const status = await apiService.getSubscriptionStatus()
      setSubscriptionStatus(status)
    } catch (err) {
      console.error('구독 상태 조회 오류:', err)
    }
  }

  // 결제 시작 (토스페이먼츠)
  const handleSubscribe = async (planId) => {
    setLoading(true)
    setError(null)
    try {
      // 결제 정보 가져오기
      const paymentInfo = await apiService.createPayment(planId)
      
      // 토스페이먼츠 위젯 초기화 및 결제 요청
      // 참고: 토스페이먼츠 SDK를 설치하고 통합해야 합니다
      // npm install @tosspayments/payment-widget-sdk
      
      // 예시 코드 (실제로는 토스페이먼츠 SDK 사용 필요):
      /*
      const { loadPaymentWidget } = await import('@tosspayments/payment-widget-sdk')
      const paymentWidget = loadPaymentWidget(paymentInfo.client_key, { customerKey: 'customer-key' })
      
      paymentWidget.renderPaymentMethods('#payment-widget', {
        value: paymentInfo.amount,
        currency: 'KRW',
        country: 'KR'
      })
      
      // 결제 요청
      paymentWidget.requestPayment({
        orderId: paymentInfo.order_id,
        orderName: planId === 'monthly' ? '월간 구독' : '연간 구독',
        successUrl: `${window.location.origin}/subscription/success`,
        failUrl: `${window.location.origin}/subscription/cancel`
      }).then((result) => {
        // 결제 승인
        apiService.confirmPayment(result.paymentKey, paymentInfo.order_id, planId)
          .then(() => {
            navigate('/subscription/success')
          })
      })
      */
      
      // 임시: 실제 토스페이먼츠 통합 전까지 에러 메시지
      setError('토스페이먼츠 SDK 통합이 필요합니다. 백엔드 API는 준비되었습니다.')
      setLoading(false)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  // 구독 취소
  const handleCancel = async () => {
    if (!window.confirm('정말 구독을 취소하시겠습니까? 현재 기간 종료 시 비활성화됩니다.')) {
      return
    }

    setLoading(true)
    setError(null)
    try {
      await apiService.cancelSubscription()
      await fetchSubscriptionStatus()
      alert('구독이 취소되었습니다. 현재 기간 종료 시 비활성화됩니다.')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlans()
    fetchSubscriptionStatus()
  }, [])

  return (
    <div className="relative min-h-screen">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* 헤더 */}
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
            구독 플랜
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            프리미엄 기능으로 더 나은 투자 결정을 내리세요
          </p>
        </div>

        {/* 현재 구독 상태 */}
        {subscriptionStatus && (
          <div className="mb-8 bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white mb-2">현재 구독 상태</h2>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                    subscriptionStatus.is_active && subscriptionStatus.tier === 'premium'
                      ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                      : 'bg-gray-500/20 text-gray-400 border border-gray-500/50'
                  }`}>
                    {subscriptionStatus.is_active && subscriptionStatus.tier === 'premium' ? '프리미엄' : '무료'}
                  </span>
                  {subscriptionStatus.current_period_end && (
                    <span className="text-sm text-gray-400">
                      만료일: {new Date(subscriptionStatus.current_period_end).toLocaleDateString('ko-KR')}
                    </span>
                  )}
                </div>
              </div>
              {subscriptionStatus.is_active && subscriptionStatus.tier === 'premium' && (
                <button
                  onClick={handleCancel}
                  disabled={loading}
                  className="px-6 py-3 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  구독 취소
                </button>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-500 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* 구독 플랜 */}
        <div className="grid md:grid-cols-2 gap-8">
          {plans.map((plan) => {
            const isAnnual = plan.interval === 'year'
            const monthlyPrice = isAnnual ? (plan.price / 12).toFixed(2) : plan.price
            const savings = isAnnual ? 58 : 0

            return (
              <div
                key={plan.id}
                className={`bg-white/5 border rounded-2xl p-8 relative ${
                  isAnnual ? 'border-yellow-500/50 border-2' : 'border-white/10'
                }`}
              >
                {isAnnual && (
                  <div className="absolute top-4 right-4 px-3 py-1 bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-xs font-semibold text-yellow-400">
                    추천
                  </div>
                )}
                
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-4xl font-bold text-white">${plan.price}</span>
                    <span className="text-gray-400">/{plan.interval === 'month' ? '월' : '년'}</span>
                  </div>
                  {isAnnual && (
                    <div className="text-sm text-gray-400">
                      월 ${monthlyPrice} (연간 ${plan.price} 결제)
                      <span className="ml-2 text-green-400 font-semibold">{savings}% 할인</span>
                    </div>
                  )}
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={loading || (subscriptionStatus?.is_active && subscriptionStatus?.tier === 'premium')}
                  className={`w-full py-3 rounded-lg font-semibold transition-all ${
                    subscriptionStatus?.is_active && subscriptionStatus?.tier === 'premium'
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : isAnnual
                      ? 'bg-yellow-500 text-black hover:bg-yellow-600'
                      : 'bg-white text-black hover:bg-gray-100'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading ? '처리 중...' : 
                   subscriptionStatus?.is_active && subscriptionStatus?.tier === 'premium' 
                     ? '이미 구독 중' 
                     : '구독하기'}
                </button>
              </div>
            )
          })}
        </div>

        {/* 기능 비교 */}
        <div className="mt-12 bg-white/5 border border-white/10 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">기능 비교</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">기능</th>
                  <th className="text-center py-3 px-4 text-gray-400 font-medium">무료</th>
                  <th className="text-center py-3 px-4 text-gray-400 font-medium">프리미엄</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-white/5">
                  <td className="py-3 px-4 text-white">일일 기업 분석</td>
                  <td className="py-3 px-4 text-center text-gray-400">5회</td>
                  <td className="py-3 px-4 text-center text-green-400 font-semibold">무제한</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-3 px-4 text-white">포트폴리오 종목 수</td>
                  <td className="py-3 px-4 text-center text-gray-400">10개</td>
                  <td className="py-3 px-4 text-center text-green-400 font-semibold">무제한</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-3 px-4 text-white">고급 차트 기능</td>
                  <td className="py-3 px-4 text-center text-gray-400">❌</td>
                  <td className="py-3 px-4 text-center text-green-400 font-semibold">✅</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-3 px-4 text-white">실시간 뉴스 알림</td>
                  <td className="py-3 px-4 text-center text-gray-400">❌</td>
                  <td className="py-3 px-4 text-center text-green-400 font-semibold">✅</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-white">AI 기반 투자 의견</td>
                  <td className="py-3 px-4 text-center text-gray-400">기본</td>
                  <td className="py-3 px-4 text-center text-green-400 font-semibold">고급</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Subscription








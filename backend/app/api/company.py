"""
기업 분석 API - 전문적이고 정확한 재무 및 기술적 분석
"""
import yfinance as yf
import pandas as pd
import numpy as np
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional, Dict, List, Any
from datetime import datetime, timedelta
from pydantic import BaseModel, Field
from app.api.auth import get_current_user_optional
from app.models.user import User
from app.models.subscription import Subscription
from sqlalchemy.orm import Session
from app.core.database import get_db, SessionLocal

router = APIRouter()

# 간단한 버전 - 필요한 의존성 확인
try:
    from app.models.chart_data import CandleData
    from app.data.stock_data_manager import StockDataManager
    from app.ai.indicators import TechnicalIndicatorsAnalyzer
    HAS_FULL_DEPENDENCIES = True
except ImportError:
    HAS_FULL_DEPENDENCIES = False
    print("[Company API] 일부 의존성이 없습니다. 기본 기능만 사용합니다.")


# Pydantic 모델
class FinancialMetric(BaseModel):
    """재무 지표"""
    name: str
    value: Optional[float] = None
    unit: Optional[str] = None
    interpretation: Optional[str] = None
    score: Optional[float] = None  # 0-100 점수


class CategoryAnalysis(BaseModel):
    """카테고리별 분석"""
    category: str
    score: float  # 0-100
    metrics: List[FinancialMetric]
    summary: str
    strengths: List[str] = []
    weaknesses: List[str] = []


class RiskAnalysis(BaseModel):
    """리스크 분석"""
    financial_risk: float  # 0-100
    liquidity_risk: float
    profitability_risk: float
    growth_risk: float
    volatility_risk: float
    overall_risk: float
    risk_factors: List[str] = []


class TechnicalIndicatorValue(BaseModel):
    """기술적 지표 값"""
    name: str
    value: float
    signal: str  # "buy", "sell", "neutral", "strong_buy", "strong_sell"
    interpretation: str
    level: Optional[str] = None  # "overbought", "oversold", "neutral"


class TechnicalAnalysis(BaseModel):
    """기술적 분석 결과"""
    overall_signal: str  # "strong_buy", "buy", "neutral", "sell", "strong_sell"
    overall_score: float  # 0-100
    indicators: List[TechnicalIndicatorValue]
    moving_averages: Dict[str, Any]
    key_levels: Dict[str, Any]  # support, resistance
    trend_strength: str  # "strong", "moderate", "weak"
    summary: str


class InvestmentOpinion(BaseModel):
    """투자 의견"""
    rating: str  # "Strong Buy", "Buy", "Hold", "Sell", "Strong Sell"
    score: float  # 0-100
    thesis: str
    key_points: List[str] = []
    risks: List[str] = []


class NewsItem(BaseModel):
    """뉴스 아이템 모델"""
    title: str
    publisher: str
    link: str
    published_at: str
    thumbnail: Optional[str] = None
    summary: Optional[str] = None
    sentiment: Optional[str] = None


class CompanyAnalysisResponse(BaseModel):
    """기업 분석 응답"""
    symbol: str
    company_info: Dict[str, Any]
    financial_metrics: List[FinancialMetric]
    category_analyses: List[CategoryAnalysis]
    risk_analysis: RiskAnalysis
    technical_analysis: Optional[TechnicalAnalysis] = None
    investment_opinion: InvestmentOpinion
    news: Optional[List[NewsItem]] = None  # 최근 뉴스
    data_quality: Dict[str, Any]  # 데이터 품질 정보
    updated_at: str


def validate_financial_data(data: Any, field_name: str) -> Optional[float]:
    """재무 데이터 검증"""
    if data is None:
        return None
    try:
        value = float(data)
        # 비정상적인 값 필터링
        if np.isnan(value) or np.isinf(value):
            return None
        # 극단적인 값 필터링 (예: 음수 시가총액 등)
        if field_name in ['marketCap', 'enterpriseValue', 'totalRevenue'] and value < 0:
            return None
        return value
    except (ValueError, TypeError):
        return None


def calculate_financial_metrics(ticker: yf.Ticker, info: Dict) -> List[FinancialMetric]:
    """재무 지표 계산 및 검증"""
    metrics = []
    
    # PER (Price-to-Earnings Ratio)
    pe_ratio = validate_financial_data(
        info.get('trailingPE') or info.get('forwardPE'),
        'peRatio'
    )
    if pe_ratio:
        pe_score = 100 - min(100, max(0, (pe_ratio - 15) * 2))  # 15 근처가 이상적
        pe_interp = "매우 저평가" if pe_ratio < 10 else "저평가" if pe_ratio < 15 else "적정" if pe_ratio < 25 else "고평가" if pe_ratio < 40 else "매우 고평가"
        metrics.append(FinancialMetric(
            name="PER (주가수익비율)",
            value=pe_ratio,
            interpretation=pe_interp,
            score=pe_score
        ))
    
    # PBR (Price-to-Book Ratio)
    pb_ratio = validate_financial_data(info.get('priceToBook'), 'pbRatio')
    if pb_ratio:
        pb_score = 100 - min(100, max(0, (pb_ratio - 1.5) * 20))  # 1.5 근처가 이상적
        pb_interp = "매우 저평가" if pb_ratio < 1 else "저평가" if pb_ratio < 1.5 else "적정" if pb_ratio < 3 else "고평가"
        metrics.append(FinancialMetric(
            name="PBR (주가순자산비율)",
            value=pb_ratio,
            interpretation=pb_interp,
            score=pb_score
        ))
    
    # ROE (Return on Equity)
    roe = validate_financial_data(info.get('returnOnEquity'), 'roe')
    if roe:
        roe_score = min(100, max(0, roe * 2))  # 50% 이상이면 만점
        roe_interp = "매우 우수" if roe > 0.2 else "우수" if roe > 0.15 else "양호" if roe > 0.1 else "보통" if roe > 0.05 else "낮음"
        metrics.append(FinancialMetric(
            name="ROE (자기자본이익률)",
            value=roe * 100,  # 퍼센트로 변환
            unit="%",
            interpretation=roe_interp,
            score=roe_score
        ))
    
    # ROA (Return on Assets)
    roa = validate_financial_data(info.get('returnOnAssets'), 'roa')
    if roa:
        roa_score = min(100, max(0, roa * 5))  # 20% 이상이면 만점
        roa_interp = "매우 우수" if roa > 0.1 else "우수" if roa > 0.07 else "양호" if roa > 0.05 else "보통" if roa > 0.03 else "낮음"
        metrics.append(FinancialMetric(
            name="ROA (총자산이익률)",
            value=roa * 100,
            unit="%",
            interpretation=roa_interp,
            score=roa_score
        ))
    
    # 부채비율 (Debt-to-Equity)
    debt_to_equity = validate_financial_data(info.get('debtToEquity'), 'debtToEquity')
    if debt_to_equity is not None:
        de_score = max(0, 100 - (debt_to_equity * 2))  # 낮을수록 좋음
        de_interp = "매우 우수" if debt_to_equity < 30 else "우수" if debt_to_equity < 50 else "양호" if debt_to_equity < 100 else "주의" if debt_to_equity < 200 else "위험"
        metrics.append(FinancialMetric(
            name="부채비율",
            value=debt_to_equity,
            unit="%",
            interpretation=de_interp,
            score=de_score
        ))
    
    # 유동비율 (Current Ratio)
    current_ratio = validate_financial_data(info.get('currentRatio'), 'currentRatio')
    if current_ratio:
        cr_score = min(100, max(0, (current_ratio - 1) * 25))  # 1 이상이면 좋음, 5 이상이면 만점
        cr_interp = "매우 우수" if current_ratio > 2 else "우수" if current_ratio > 1.5 else "양호" if current_ratio > 1 else "주의"
        metrics.append(FinancialMetric(
            name="유동비율",
            value=current_ratio,
            interpretation=cr_interp,
            score=cr_score
        ))
    
    # 매출 성장률
    revenue_growth = validate_financial_data(info.get('revenueGrowth'), 'revenueGrowth')
    if revenue_growth is not None:
        rg_score = min(100, max(0, revenue_growth * 200 + 50))  # 25% 이상이면 만점
        rg_interp = "매우 우수" if revenue_growth > 0.2 else "우수" if revenue_growth > 0.1 else "양호" if revenue_growth > 0.05 else "보통" if revenue_growth > 0 else "감소"
        metrics.append(FinancialMetric(
            name="매출 성장률",
            value=revenue_growth * 100,
            unit="%",
            interpretation=rg_interp,
            score=rg_score
        ))
    
    # 이익 성장률
    earnings_growth = validate_financial_data(info.get('earningsGrowth'), 'earningsGrowth')
    if earnings_growth is not None:
        eg_score = min(100, max(0, earnings_growth * 100 + 50))  # 50% 이상이면 만점
        eg_interp = "매우 우수" if earnings_growth > 0.3 else "우수" if earnings_growth > 0.15 else "양호" if earnings_growth > 0.05 else "보통" if earnings_growth > 0 else "감소"
        metrics.append(FinancialMetric(
            name="이익 성장률",
            value=earnings_growth * 100,
            unit="%",
            interpretation=eg_interp,
            score=eg_score
        ))
    
    # 배당 수익률
    dividend_yield = validate_financial_data(info.get('dividendYield'), 'dividendYield')
    if dividend_yield:
        dy_score = min(100, max(0, dividend_yield * 1000))  # 10% 이상이면 만점
        dy_interp = "매우 우수" if dividend_yield > 0.05 else "우수" if dividend_yield > 0.03 else "양호" if dividend_yield > 0.02 else "보통"
        metrics.append(FinancialMetric(
            name="배당 수익률",
            value=dividend_yield * 100,
            unit="%",
            interpretation=dy_interp,
            score=dy_score
        ))
    
    # Beta (변동성)
    beta = validate_financial_data(info.get('beta'), 'beta')
    if beta:
        beta_score = 50 + (1 - abs(beta - 1)) * 50  # 1에 가까울수록 좋음
        beta_interp = "안정적" if 0.8 < beta < 1.2 else "보통" if 0.6 < beta < 1.5 else "변동성 높음"
        metrics.append(FinancialMetric(
            name="Beta (시장 대비 변동성)",
            value=beta,
            interpretation=beta_interp,
            score=beta_score
        ))
    
    return metrics


def analyze_category(metrics: List[FinancialMetric], category: str, metric_names: List[str]) -> CategoryAnalysis:
    """카테고리별 분석"""
    category_metrics = [m for m in metrics if m.name in metric_names]
    
    if not category_metrics:
        return CategoryAnalysis(
            category=category,
            score=50.0,
            metrics=[],
            summary="데이터 부족으로 분석 불가",
            strengths=[],
            weaknesses=[]
        )
    
    # 점수 계산 (가중 평균)
    scores = [m.score for m in category_metrics if m.score is not None]
    avg_score = sum(scores) / len(scores) if scores else 50.0
    
    # 강점과 약점 파악
    strengths = [m.name for m in category_metrics if m.score and m.score > 70]
    weaknesses = [m.name for m in category_metrics if m.score and m.score < 40]
    
    # 요약 생성
    if avg_score >= 75:
        summary = f"{category} 영역이 매우 우수합니다."
    elif avg_score >= 60:
        summary = f"{category} 영역이 양호합니다."
    elif avg_score >= 40:
        summary = f"{category} 영역이 보통 수준입니다."
    else:
        summary = f"{category} 영역에 개선이 필요합니다."
    
    return CategoryAnalysis(
        category=category,
        score=avg_score,
        metrics=category_metrics,
        summary=summary,
        strengths=strengths,
        weaknesses=weaknesses
    )


def analyze_risk(metrics: List[FinancialMetric], info: Dict) -> RiskAnalysis:
    """리스크 분석"""
    # 재무 리스크 (부채비율, 유동비율)
    debt_metric = next((m for m in metrics if m.name == "부채비율"), None)
    current_metric = next((m for m in metrics if m.name == "유동비율"), None)
    financial_risk = 50.0
    if debt_metric and debt_metric.score is not None:
        financial_risk = 100 - debt_metric.score
    if current_metric and current_metric.score is not None:
        financial_risk = (financial_risk + (100 - current_metric.score)) / 2
    
    # 유동성 리스크
    liquidity_risk = 100 - (current_metric.score if current_metric and current_metric.score else 50)
    
    # 수익성 리스크
    roe_metric = next((m for m in metrics if m.name == "ROE (자기자본이익률)"), None)
    roa_metric = next((m for m in metrics if m.name == "ROA (총자산이익률)"), None)
    profitability_scores = [m.score for m in [roe_metric, roa_metric] if m and m.score is not None]
    profitability_risk = 100 - (sum(profitability_scores) / len(profitability_scores) if profitability_scores else 50)
    
    # 성장 리스크
    revenue_metric = next((m for m in metrics if m.name == "매출 성장률"), None)
    earnings_metric = next((m for m in metrics if m.name == "이익 성장률"), None)
    growth_scores = [m.score for m in [revenue_metric, earnings_metric] if m and m.score is not None]
    growth_risk = 100 - (sum(growth_scores) / len(growth_scores) if growth_scores else 50)
    
    # 변동성 리스크
    beta_metric = next((m for m in metrics if m.name == "Beta (시장 대비 변동성)"), None)
    volatility_risk = 100 - (beta_metric.score if beta_metric and beta_metric.score else 50)
    
    # 종합 리스크
    overall_risk = (financial_risk + liquidity_risk + profitability_risk + growth_risk + volatility_risk) / 5
    
    # 리스크 요인
    risk_factors = []
    if financial_risk > 60:
        risk_factors.append("재무 구조 취약")
    if liquidity_risk > 60:
        risk_factors.append("유동성 부족")
    if profitability_risk > 60:
        risk_factors.append("수익성 저하")
    if growth_risk > 60:
        risk_factors.append("성장 둔화")
    if volatility_risk > 60:
        risk_factors.append("높은 변동성")
    
    return RiskAnalysis(
        financial_risk=financial_risk,
        liquidity_risk=liquidity_risk,
        profitability_risk=profitability_risk,
        growth_risk=growth_risk,
        volatility_risk=volatility_risk,
        overall_risk=overall_risk,
        risk_factors=risk_factors
    )


def calculate_technical_indicators_simple(history_data: pd.DataFrame) -> Optional[TechnicalAnalysis]:
    """기술적 지표 계산 (간단한 버전)"""
    if history_data is None or history_data.empty or len(history_data) < 20:
        return None
    
    try:
        df = history_data.copy()
        if 'Close' not in df.columns:
            return None
        
        indicators = []
        signals = []
        scores = []
        
        # RSI 계산
        delta = df['Close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        rsi_value = float(rsi.iloc[-1]) if not rsi.empty and pd.notna(rsi.iloc[-1]) else 50.0
        
        if rsi_value >= 70:
            rsi_signal = "sell"
            rsi_level = "overbought"
            rsi_score = 20
        elif rsi_value <= 30:
            rsi_signal = "buy"
            rsi_level = "oversold"
            rsi_score = 80
        else:
            rsi_signal = "neutral"
            rsi_level = "neutral"
            rsi_score = 50
        
        indicators.append(TechnicalIndicatorValue(
            name="RSI (14)",
            value=rsi_value,
            signal=rsi_signal,
            interpretation=f"RSI {rsi_value:.1f} - {'과매수' if rsi_value >= 70 else '과매도' if rsi_value <= 30 else '중립'}",
            level=rsi_level
        ))
        signals.append(rsi_signal)
        scores.append(rsi_score)
        
        # MACD 계산
        ema12 = df['Close'].ewm(span=12, adjust=False).mean()
        ema26 = df['Close'].ewm(span=26, adjust=False).mean()
        macd_line = ema12 - ema26
        signal_line = macd_line.ewm(span=9, adjust=False).mean()
        histogram = macd_line - signal_line
        
        macd_value = float(macd_line.iloc[-1]) if not macd_line.empty and pd.notna(macd_line.iloc[-1]) else 0.0
        hist_value = float(histogram.iloc[-1]) if not histogram.empty and pd.notna(histogram.iloc[-1]) else 0.0
        
        if macd_value > 0 and hist_value > 0:
            macd_signal = "buy"
            macd_score = 70
        elif macd_value < 0 and hist_value < 0:
            macd_signal = "sell"
            macd_score = 30
        else:
            macd_signal = "neutral"
            macd_score = 50
        
        indicators.append(TechnicalIndicatorValue(
            name="MACD",
            value=macd_value,
            signal=macd_signal,
            interpretation=f"MACD {macd_value:.2f} - {'상승 추세' if macd_signal == 'buy' else '하락 추세' if macd_signal == 'sell' else '중립'}"
        ))
        signals.append(macd_signal)
        scores.append(macd_score)
        
        # 이동평균 계산
        current_price = float(df['Close'].iloc[-1])
        ma5 = float(df['Close'].rolling(window=5).mean().iloc[-1]) if len(df) >= 5 else current_price
        ma10 = float(df['Close'].rolling(window=10).mean().iloc[-1]) if len(df) >= 10 else current_price
        ma20 = float(df['Close'].rolling(window=20).mean().iloc[-1]) if len(df) >= 20 else current_price
        ma50 = float(df['Close'].rolling(window=50).mean().iloc[-1]) if len(df) >= 50 else None
        ma200 = float(df['Close'].rolling(window=200).mean().iloc[-1]) if len(df) >= 200 else None
        
        moving_averages = {
            "MA5": ma5,
            "MA10": ma10,
            "MA20": ma20,
            "MA50": ma50,
            "MA200": ma200,
            "current_price": current_price
        }
        
        # 이동평균 신호
        ma_signals = []
        if current_price > ma5 > ma10 > ma20:
            ma_signals.append("strong_buy")
            ma_score = 80
        elif current_price > ma5 > ma10:
            ma_signals.append("buy")
            ma_score = 65
        elif current_price < ma5 < ma10 < ma20:
            ma_signals.append("strong_sell")
            ma_score = 20
        elif current_price < ma5 < ma10:
            ma_signals.append("sell")
            ma_score = 35
        else:
            ma_signals.append("neutral")
            ma_score = 50
        
        if ma50 and current_price > ma50:
            ma_score += 5
        if ma200 and current_price > ma200:
            ma_score += 5
        
        signals.extend(ma_signals)
        scores.append(ma_score)
        
        # 종합 신호 및 점수
        buy_count = signals.count("buy") + signals.count("strong_buy") * 2
        sell_count = signals.count("sell") + signals.count("strong_sell") * 2
        overall_score = sum(scores) / len(scores) if scores else 50.0
        
        if buy_count > sell_count + 2:
            overall_signal = "strong_buy"
        elif buy_count > sell_count:
            overall_signal = "buy"
        elif sell_count > buy_count + 2:
            overall_signal = "strong_sell"
        elif sell_count > buy_count:
            overall_signal = "sell"
        else:
            overall_signal = "neutral"
        
        # 지지선/저항선 계산
        recent_highs = df['High'].tail(20).max() if len(df) >= 20 else df['High'].max()
        recent_lows = df['Low'].tail(20).min() if len(df) >= 20 else df['Low'].min()
        support = recent_lows * 0.98
        resistance = recent_highs * 1.02
        
        key_levels = {
            "support": float(support),
            "resistance": float(resistance),
            "current_price": current_price
        }
        
        # 추세 강도
        price_change_20 = (current_price - df['Close'].iloc[-20]) / df['Close'].iloc[-20] * 100 if len(df) >= 20 else 0
        if abs(price_change_20) > 10:
            trend_strength = "strong"
        elif abs(price_change_20) > 5:
            trend_strength = "moderate"
        else:
            trend_strength = "weak"
        
        # 요약 생성
        summary = f"기술적 지표 종합: {overall_signal.upper()} 신호 (점수: {overall_score:.1f}/100). "
        summary += f"RSI는 {rsi_value:.1f}로 {'과매수' if rsi_value >= 70 else '과매도' if rsi_value <= 30 else '중립'} 상태, "
        summary += f"MACD는 {macd_signal} 신호, "
        summary += f"이동평균선은 {'상승 추세' if ma_signals[0] in ['buy', 'strong_buy'] else '하락 추세' if ma_signals[0] in ['sell', 'strong_sell'] else '횡보'}입니다."
        
        return TechnicalAnalysis(
            overall_signal=overall_signal,
            overall_score=overall_score,
            indicators=indicators,
            moving_averages=moving_averages,
            key_levels=key_levels,
            trend_strength=trend_strength,
            summary=summary
        )
    except Exception as e:
        print(f"[Company Analysis] 기술적 지표 계산 오류: {e}")
        import traceback
        traceback.print_exc()
        return None


def analyze_news_sentiment(news_items: Optional[List]) -> Dict[str, Any]:
    """뉴스 감정 분석"""
    if not news_items or len(news_items) == 0:
        return {'score': 50.0, 'sentiment': 'neutral', 'positive_count': 0, 'negative_count': 0, 'neutral_count': 0}
    
    positive_count = sum(1 for item in news_items if item.sentiment == 'positive')
    negative_count = sum(1 for item in news_items if item.sentiment == 'negative')
    neutral_count = sum(1 for item in news_items if item.sentiment == 'neutral' or not item.sentiment)
    
    total = len(news_items)
    if total == 0:
        return {'score': 50.0, 'sentiment': 'neutral', 'positive_count': 0, 'negative_count': 0, 'neutral_count': 0}
    
    # 중립 비율을 줄이기 위해 가중치 적용
    positive_ratio = positive_count / total
    negative_ratio = negative_count / total
    
    # 점수 계산 (0-100, 50이 중립)
    if positive_ratio > negative_ratio:
        score = 50 + (positive_ratio * 40)  # 최대 90점
        sentiment = 'positive'
    elif negative_ratio > positive_ratio:
        score = 50 - (negative_ratio * 40)  # 최소 10점
        sentiment = 'negative'
    else:
        # 중립이 많으면 약간 부정적으로 처리 (중립 감소)
        if neutral_count / total > 0.7:
            score = 45  # 중립이 많으면 약간 낮은 점수
        else:
            score = 50
        sentiment = 'neutral'
    
    return {
        'score': score,
        'sentiment': sentiment,
        'positive_count': positive_count,
        'negative_count': negative_count,
        'neutral_count': neutral_count
    }


def generate_investment_opinion(
    category_analyses: List[CategoryAnalysis],
    risk_analysis: RiskAnalysis,
    technical_analysis: Optional[TechnicalAnalysis],
    metrics: List[FinancialMetric],
    news_items: Optional[List] = None
) -> InvestmentOpinion:
    """투자 의견 생성 (뉴스 분석 포함)"""
    # 종합 점수 계산
    category_score = sum(ca.score for ca in category_analyses) / len(category_analyses) if category_analyses else 50.0
    risk_score = 100 - risk_analysis.overall_risk
    technical_score = technical_analysis.overall_score if technical_analysis else 50.0
    
    # 뉴스 감정 분석
    news_analysis = analyze_news_sentiment(news_items)
    news_score = news_analysis['score']
    
    # 가중 평균 (재무 40%, 리스크 25%, 기술적 20%, 뉴스 15%)
    overall_score = category_score * 0.4 + risk_score * 0.25 + technical_score * 0.2 + news_score * 0.15
    
    # 점수 범위 확장 (더 극적인 평가)
    # 점수를 더 넓게 분산시키기 위해 조정
    if overall_score > 75:
        # 75 이상은 더 높게
        adjusted_score = 75 + (overall_score - 75) * 1.2
        adjusted_score = min(adjusted_score, 95)
    elif overall_score < 25:
        # 25 이하는 더 낮게
        adjusted_score = 25 - (25 - overall_score) * 1.2
        adjusted_score = max(adjusted_score, 5)
    else:
        # 중간 범위는 약간 확장
        if overall_score > 50:
            adjusted_score = 50 + (overall_score - 50) * 1.1
        else:
            adjusted_score = 50 - (50 - overall_score) * 1.1
    
    overall_score = adjusted_score
    
    # 등급 결정 (더 엄격한 기준)
    if overall_score >= 85:
        rating = "Strong Buy"
    elif overall_score >= 70:
        rating = "Buy"
    elif overall_score >= 55:
        rating = "Hold"
    elif overall_score >= 40:
        rating = "Sell"
    else:
        rating = "Strong Sell"
    
    # 투자 논리 생성
    thesis_parts = []
    
    # 재무 강점/약점 (더 명확하게)
    strong_categories = [ca for ca in category_analyses if ca.score >= 75]
    weak_categories = [ca for ca in category_analyses if ca.score < 40]
    
    if strong_categories:
        thesis_parts.append(f"{', '.join([ca.category for ca in strong_categories])} 영역에서 탁월한 성과를 보이고 있습니다.")
    if weak_categories:
        thesis_parts.append(f"{', '.join([ca.category for ca in weak_categories])} 영역에서 개선이 필요합니다.")
    
    # 리스크 평가 (더 구체적으로)
    if risk_analysis.overall_risk < 25:
        thesis_parts.append("매우 낮은 리스크로 안정적인 투자처입니다.")
    elif risk_analysis.overall_risk < 40:
        thesis_parts.append("낮은 리스크 수준으로 안정적입니다.")
    elif risk_analysis.overall_risk > 75:
        thesis_parts.append("매우 높은 리스크로 신중한 접근이 필수입니다.")
    elif risk_analysis.overall_risk > 60:
        thesis_parts.append("높은 리스크가 존재하므로 주의가 필요합니다.")
    
    # 기술적 분석 (더 구체적으로)
    if technical_analysis:
        if technical_analysis.overall_signal == "strong_buy":
            thesis_parts.append("기술적 지표가 강한 매수 신호를 보이고 있습니다.")
        elif technical_analysis.overall_signal == "buy":
            thesis_parts.append("기술적 지표가 매수 신호를 보이고 있습니다.")
        elif technical_analysis.overall_signal == "strong_sell":
            thesis_parts.append("기술적 지표가 강한 매도 신호를 보이고 있습니다.")
        elif technical_analysis.overall_signal == "sell":
            thesis_parts.append("기술적 지표가 매도 신호를 보이고 있습니다.")
    
    # 뉴스 분석 포함
    if news_analysis['positive_count'] > news_analysis['negative_count'] * 1.5:
        thesis_parts.append("최근 뉴스가 긍정적인 흐름을 보이고 있습니다.")
    elif news_analysis['negative_count'] > news_analysis['positive_count'] * 1.5:
        thesis_parts.append("최근 뉴스가 부정적인 흐름을 보이고 있습니다.")
    elif news_analysis['positive_count'] > 0:
        thesis_parts.append("최근 뉴스는 혼재된 반응을 보이고 있습니다.")
    
    thesis = " ".join(thesis_parts) if thesis_parts else "종합 분석 결과입니다."
    
    # 주요 포인트 (더 구체적으로)
    key_points = []
    for ca in category_analyses:
        if ca.score >= 70 and ca.strengths:
            key_points.extend([f"{ca.category}: {s}" for s in ca.strengths[:2]])
        elif ca.score < 40 and ca.weaknesses:
            key_points.extend([f"{ca.category}: {w}" for w in ca.weaknesses[:2]])
    
    # 뉴스 포인트 추가
    if news_analysis['positive_count'] > 2:
        key_points.append(f"긍정적 뉴스 {news_analysis['positive_count']}건")
    if news_analysis['negative_count'] > 2:
        key_points.append(f"부정적 뉴스 {news_analysis['negative_count']}건")
    
    # 리스크
    risks = risk_analysis.risk_factors.copy()
    if technical_analysis and technical_analysis.overall_signal in ["strong_sell", "sell"]:
        risks.append("기술적 하락 신호")
    if news_analysis['negative_count'] > news_analysis['positive_count']:
        risks.append("부정적 뉴스 우세")
    
    return InvestmentOpinion(
        rating=rating,
        score=round(overall_score, 1),
        thesis=thesis,
        key_points=key_points[:5],
        risks=risks[:5]
    )


@router.get("/company/{symbol}", response_model=CompanyAnalysisResponse)
async def get_company_analysis(
    symbol: str,
    include_technical: bool = Query(True, description="기술적 분석 포함 여부"),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    기업 종합 분석
    
    - **symbol**: 주식 심볼 (예: 'AAPL', 'MSFT', '005930' - 한국 종목은 숫자만 입력)
    - **include_technical**: 기술적 분석 포함 여부
    """
    try:
        print(f"[Company Analysis] ========== 기업 분석 시작 ==========")
        print(f"[Company Analysis] 심볼: {symbol}")
        
        # 한국 종목 처리
        symbol_clean = symbol.replace('.KS', '').replace('.KQ', '')
        if symbol_clean.isdigit() or symbol.endswith('.KS') or symbol.endswith('.KQ'):
            # 한국 종목
            if not symbol.endswith('.KS') and not symbol.endswith('.KQ'):
                ticker_symbol = f"{symbol_clean}.KS"
            else:
                ticker_symbol = symbol
        else:
            ticker_symbol = symbol_clean
        
        # yfinance로 데이터 조회
        ticker = yf.Ticker(ticker_symbol)
        
        # 기본 정보 조회 (재시도 로직 포함)
        max_retries = 3
        info = None
        for attempt in range(max_retries):
            try:
                info = ticker.info
                if info and isinstance(info, dict) and len(info) > 0:
                    break
            except Exception as e:
                if attempt < max_retries - 1:
                    print(f"[Company Analysis] 정보 조회 재시도 ({symbol}): {e}")
                    import time
                    time.sleep(1)
                else:
                    raise HTTPException(status_code=404, detail=f"기업 정보를 찾을 수 없습니다: {symbol}")
        
        if not info:
            raise HTTPException(status_code=404, detail=f"기업 정보를 찾을 수 없습니다: {symbol}")
        
        # 회사 정보
        company_info = {
            'name': info.get('longName', info.get('shortName', symbol)),
            'sector': info.get('sector', 'N/A'),
            'industry': info.get('industry', 'N/A'),
            'marketCap': validate_financial_data(info.get('marketCap'), 'marketCap'),
            'currentPrice': validate_financial_data(
                info.get('currentPrice') or info.get('regularMarketPrice'),
                'currentPrice'
            ),
            'website': info.get('website', 'N/A'),
            'description': info.get('longBusinessSummary', 'N/A')
        }
        
        # 재무 지표 계산
        print(f"[Company Analysis] 재무 지표 계산 중...")
        financial_metrics = calculate_financial_metrics(ticker, info)
        print(f"[Company Analysis] 재무 지표 계산 완료: {len(financial_metrics)}개")
        
        # 카테고리별 분석
        category_analyses = [
            analyze_category(financial_metrics, "수익성", ["ROE (자기자본이익률)", "ROA (총자산이익률)"]),
            analyze_category(financial_metrics, "안정성", ["부채비율", "유동비율"]),
            analyze_category(financial_metrics, "성장성", ["매출 성장률", "이익 성장률"]),
            analyze_category(financial_metrics, "배당", ["배당 수익률"]),
            analyze_category(financial_metrics, "밸류에이션", ["PER (주가수익비율)", "PBR (주가순자산비율)"])
        ]
        
        # 리스크 분석
        print(f"[Company Analysis] 리스크 분석 중...")
        risk_analysis = analyze_risk(financial_metrics, info)
        
        # 기술적 분석
        technical_analysis = None
        if include_technical:
            print(f"[Company Analysis] 기술적 분석 중...")
            try:
                # yfinance로 히스토리 데이터 조회
                history = ticker.history(period="1y", interval="1d")
                if history is not None and not history.empty and len(history) >= 20:
                    technical_analysis = calculate_technical_indicators_simple(history)
                    print(f"[Company Analysis] 기술적 분석 완료")
                else:
                    print(f"[Company Analysis] 기술적 분석 건너뜀 (데이터 부족)")
            except Exception as te:
                print(f"[Company Analysis] 기술적 분석 오류 (계속 진행): {te}")
        
        # 최근 뉴스 조회 (투자 의견 생성 전에 먼저 조회)
        news_items_for_analysis = None
        try:
            print(f"[Company Analysis] 뉴스 조회 중 (분석용)...")
            news_data = ticker.get_news()
            if news_data and len(news_data) > 0:
                news_items_for_analysis = []
                
                # 회사명 가져오기 (필터링용)
                company_name = company_info.get('name', '') or symbol_clean.upper()
                
                # 관련 뉴스 필터링
                filtered_news = []
                for item in news_data[:20]:  # 더 많이 가져와서 필터링
                    content = item.get('content', {}) if isinstance(item.get('content'), dict) else item
                    title = content.get('title', '') or item.get('title', '') or content.get('headline', '')
                    summary = content.get('summary', '') or content.get('description', '') or item.get('summary', '')
                    
                    search_text = (title + " " + summary).upper()
                    symbol_upper = symbol_clean.upper()
                    company_name_upper = company_name.upper()
                    
                    # 심볼이나 회사명이 포함되어 있는지 확인
                    is_relevant = False
                    if symbol_upper in search_text or company_name_upper in search_text:
                        is_relevant = True
                    elif company_name_upper:
                        name_words = [w for w in company_name_upper.split() if len(w) > 3]
                        if len(name_words) >= 2:
                            matched_words = sum(1 for word in name_words if word in search_text)
                            if matched_words >= 2:
                                is_relevant = True
                    
                    if is_relevant:
                        filtered_news.append(item)
                        if len(filtered_news) >= 10:
                            break
                
                # 관련 뉴스 파싱
                for item in filtered_news:
                    try:
                        content = item.get('content', {}) if isinstance(item.get('content'), dict) else item
                        title = content.get('title', '') or item.get('title', '') or content.get('headline', '')
                        summary = content.get('summary', '') or content.get('description', '') or item.get('summary', '')
                        
                        # 감정 분석 (중립 감소)
                        text = (title + " " + summary).lower()
                        positive_keywords = ['up', 'rise', 'gain', 'profit', 'growth', 'positive', 'beat', '상승', '증가', '성장', '호재', 'surge', 'rally', 'boost', 'strong']
                        negative_keywords = ['down', 'fall', 'loss', 'decline', 'negative', 'miss', '하락', '감소', '손실', '악재', 'plunge', 'crash', 'drop', 'warn', 'weak']
                        positive_count = sum(1 for kw in positive_keywords if kw in text)
                        negative_count = sum(1 for kw in negative_keywords if kw in text)
                        
                        # 중립 판별 기준 강화 (차이가 2 이상이어야 명확한 감정)
                        if positive_count > negative_count + 1:
                            sentiment = 'positive'
                        elif negative_count > positive_count + 1:
                            sentiment = 'negative'
                        elif positive_count > 0 or negative_count > 0:
                            # 약한 감정은 더 강한 쪽으로
                            sentiment = 'positive' if positive_count > negative_count else 'negative'
                        else:
                            sentiment = 'neutral'
                        
                        # link 처리
                        link = content.get('link', '') or item.get('link', '') or content.get('url', '')
                        if not link:
                            canonical_url = content.get('canonicalUrl', {}) or item.get('canonicalUrl', {})
                            if isinstance(canonical_url, dict):
                                link = canonical_url.get('url', '')
                            if not link:
                                click_through = content.get('clickThroughUrl', {}) or item.get('clickThroughUrl', {})
                                if isinstance(click_through, dict):
                                    link = click_through.get('url', '')
                        if not link and 'id' in item:
                            link = f"https://finance.yahoo.com/news/{item['id']}"
                        
                        # 발행 시간 처리
                        published_time = None
                        if 'pubDate' in content:
                            pub_date = content['pubDate']
                            if isinstance(pub_date, str):
                                try:
                                    pub_date = pub_date.replace('Z', '+00:00')
                                    published_time = datetime.fromisoformat(pub_date)
                                except:
                                    published_time = datetime.now()
                            elif isinstance(pub_date, (int, float)):
                                published_time = datetime.fromtimestamp(pub_date)
                            else:
                                published_time = datetime.now()
                        elif 'displayTime' in content:
                            display_time = content['displayTime']
                            if isinstance(display_time, str):
                                try:
                                    display_time = display_time.replace('Z', '+00:00')
                                    published_time = datetime.fromisoformat(display_time)
                                except:
                                    published_time = datetime.now()
                            else:
                                published_time = datetime.now()
                        else:
                            published_time = datetime.now()
                        
                        # 썸네일 처리
                        thumbnail = None
                        if 'thumbnail' in content and content['thumbnail']:
                            thumb_data = content['thumbnail']
                            if isinstance(thumb_data, dict):
                                resolutions = thumb_data.get('resolutions', [])
                                if resolutions and len(resolutions) > 0:
                                    thumbnail = resolutions[-1].get('url') if resolutions else None
                                    if not thumbnail:
                                        thumbnail = resolutions[0].get('url')
                            elif isinstance(thumb_data, str):
                                thumbnail = thumb_data
                        
                        # summary 처리 (HTML 태그 제거)
                        if summary:
                            import re
                            summary = re.sub(r'<[^>]+>', '', summary)
                            summary = summary.strip()
                        
                        # publisher 처리
                        publisher = content.get('publisher', '') or item.get('publisher', '') or 'Yahoo Finance'
                        provider = content.get('provider', {}) or item.get('provider', {})
                        if isinstance(provider, dict):
                            publisher = provider.get('displayName', publisher)
                        
                        news_items_for_analysis.append(NewsItem(
                            title=title,
                            publisher=publisher,
                            link=link,
                            published_at=published_time.isoformat(),
                            thumbnail=thumbnail,
                            summary=summary,
                            sentiment=sentiment
                        ))
                    except:
                        continue
        except Exception as ne:
            print(f"[Company Analysis] 뉴스 조회 오류 (계속 진행): {ne}")
        
        # 투자 의견 생성 (뉴스 포함)
        print(f"[Company Analysis] 투자 의견 생성 중...")
        investment_opinion = generate_investment_opinion(
            category_analyses,
            risk_analysis,
            technical_analysis,
            financial_metrics,
            news_items_for_analysis
        )
        
        # 최근 뉴스 조회 (표시용 - 이미 분석에 사용한 뉴스 재사용)
        news_items = news_items_for_analysis[:5] if news_items_for_analysis else None
        
        # 데이터 품질 평가
        data_quality = {
            'financial_metrics_count': len(financial_metrics),
            'has_technical': technical_analysis is not None,
            'completeness': len(financial_metrics) / 10 * 100  # 10개 지표 기준
        }
        
        result = CompanyAnalysisResponse(
            symbol=symbol.upper(),
            company_info=company_info,
            financial_metrics=financial_metrics,
            category_analyses=category_analyses,
            risk_analysis=risk_analysis,
            technical_analysis=technical_analysis,
            investment_opinion=investment_opinion,
            news=news_items,
            data_quality=data_quality,
            updated_at=datetime.now().isoformat()
        )
        
        print(f"[Company Analysis] ========== 분석 완료 ==========")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_detail = f"기업 분석 실패: {str(e)}"
        print(f"[Company Analysis] ❌ 오류: {error_detail}")
        print(f"[Company Analysis] 오류 상세:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=error_detail)










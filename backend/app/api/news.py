"""
뉴스 API - 한국 및 해외 주식 뉴스 제공
"""
import yfinance as yf
import re
import httpx
import feedparser
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from pydantic import BaseModel

router = APIRouter()


class NewsItem(BaseModel):
    """뉴스 아이템 모델"""
    title: str
    publisher: str
    link: str
    published_at: str
    thumbnail: Optional[str] = None
    summary: Optional[str] = None
    sentiment: Optional[str] = None  # positive, negative, neutral


class NewsResponse(BaseModel):
    """뉴스 응답 모델"""
    symbol: Optional[str] = None
    country: str  # 'kr' or 'us'
    news: List[NewsItem]
    total: int
    updated_at: str


def get_news_sentiment(title: str, summary: Optional[str] = None) -> Optional[str]:
    """
    간단한 감정 분석 (키워드 기반)
    실제로는 AI 모델을 사용하는 것이 좋지만, 간단한 버전으로 구현
    """
    text = (title + " " + (summary or "")).lower()
    
    positive_keywords = ['상승', '증가', '성장', '수익', '실적', '호재', '긍정', 'up', 'rise', 'gain', 'profit', 'growth', 'positive', 'beat']
    negative_keywords = ['하락', '감소', '손실', '실적', '부진', '악재', '부정', 'down', 'fall', 'loss', 'decline', 'negative', 'miss']
    
    positive_count = sum(1 for keyword in positive_keywords if keyword in text)
    negative_count = sum(1 for keyword in negative_keywords if keyword in text)
    
    if positive_count > negative_count:
        return 'positive'
    elif negative_count > positive_count:
        return 'negative'
    else:
        return 'neutral'


def is_korean_news(item: Dict) -> bool:
    """한국어 뉴스인지 확인"""
    content = item.get('content', {}) if isinstance(item.get('content'), dict) else item
    title = content.get('title', '') or item.get('title', '') or content.get('headline', '') or ''
    summary = content.get('summary', '') or content.get('description', '') or item.get('summary', '') or ''
    publisher = content.get('publisher', '') or item.get('publisher', '') or ''
    if not isinstance(publisher, str):
        publisher = ''
    
    # 한국어 키워드 확인 (더 많은 키워드 추가)
    korean_keywords = [
        '한국', 'Korea', 'South Korea', 'Seoul', 'KOSPI', '코스피', '코스닥', 'KOSDAQ', 
        'KRW', '원화', '삼성', '현대', 'LG', 'SK', '하이닉스', 'NAVER', '카카오',
        '포스코', 'KB금융', '신한', '기아', '대한항공', '미래에셋', '삼성전기', '현대모비스',
        'Samsung', 'Hyundai', 'Kia', 'POSCO', 'Korean', 'Seoul', 'KRX'
    ]
    text = (title + " " + summary + " " + publisher).upper()
    
    # 한국 출판사 확인 (더 많은 출판사 추가)
    korean_publishers = [
        'YAHOO FINANCE KOREA', 'YAHOO FINANCE UK', '한국경제', '매일경제', '조선일보', 
        '중앙일보', '동아일보', '한겨레', '서울신문', '경향신문', 'YTN', 'SBS', 'KBS', 'MBC'
    ]
    if any(pub in publisher.upper() for pub in korean_publishers):
        return True
    
    # 한국어 키워드 확인
    if any(keyword.upper() in text for keyword in korean_keywords):
        return True
    
    # 한글이 포함되어 있는지 확인
    full_text = title + summary
    if any('\uAC00' <= char <= '\uD7A3' for char in full_text):
        return True
    
    return False


def filter_relevant_news(news_items: List[Dict], symbol: str, symbol_name: str = None, limit: int = 20, country: str = 'us') -> List[Dict]:
    """특정 종목과 관련된 뉴스만 필터링"""
    if not symbol:
        # 심볼이 없으면 국가별 필터링만
        if country == 'kr':
            filtered = [item for item in news_items if is_korean_news(item)]
            return filtered[:limit]
        return news_items[:limit]
    
    filtered = []
    symbol_clean = symbol.replace('.KS', '').replace('.KQ', '').upper()
    symbol_name_upper = (symbol_name or '').upper()
    
    for item in news_items:
        # 국가별 필터링
        if country == 'kr' and not is_korean_news(item):
            continue
        
        content = item.get('content', {}) if isinstance(item.get('content'), dict) else item
        title = content.get('title', '') or item.get('title', '') or content.get('headline', '')
        summary = content.get('summary', '') or content.get('description', '') or item.get('summary', '')
        
        search_text = (title + " " + summary).upper()
        
        # 심볼이나 회사명이 포함되어 있는지 확인
        is_relevant = False
        
        # 심볼이 포함되어 있으면 관련 뉴스
        if symbol_clean in search_text:
            is_relevant = True
        # 회사명이 포함되어 있으면 관련 뉴스
        elif symbol_name_upper and symbol_name_upper in search_text:
            is_relevant = True
        # 회사명의 주요 단어가 포함되어 있는지 확인
        elif symbol_name_upper:
            name_words = [w for w in symbol_name_upper.split() if len(w) > 3]
            if len(name_words) >= 2:
                matched_words = sum(1 for word in name_words if word in search_text)
                if matched_words >= 2:
                    is_relevant = True
        
        if is_relevant:
            filtered.append(item)
            if len(filtered) >= limit:
                break
    
    # 관련 뉴스가 부족하면 일부 포함
    if len(filtered) < limit // 2:
        for item in news_items:
            if item not in filtered:
                # 국가 필터링 확인
                if country == 'kr' and not is_korean_news(item):
                    continue
                filtered.append(item)
                if len(filtered) >= limit:
                    break
    
    return filtered


def parse_news_item(item: Dict, symbol: str = None) -> Optional[NewsItem]:
    """뉴스 아이템 파싱"""
    try:
        # yfinance 뉴스 구조: {'id': ..., 'content': {...}}
        content = item.get('content', {}) if isinstance(item.get('content'), dict) else item
        
        # 뉴스 데이터 구조 확인 및 파싱
        title = content.get('title', '') or item.get('title', '') or content.get('headline', '')
        if not title:
            return None
        
        publisher = content.get('publisher', '') or item.get('publisher', '') or content.get('source', '')
        if not publisher:
            # provider에서 가져오기
            provider = content.get('provider', {}) or item.get('provider', {})
            if isinstance(provider, dict):
                publisher = provider.get('displayName', 'Yahoo Finance')
            else:
                publisher = 'Yahoo Finance'
        
        link = content.get('link', '') or item.get('link', '') or content.get('url', '')
        if not link:
            # canonicalUrl 또는 clickThroughUrl에서 가져오기
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
        # RSS 피드 형식 처리 (published 필드)
        if 'published' in item and isinstance(item['published'], str):
            try:
                # feedparser가 파싱한 날짜 형식 처리
                from email.utils import parsedate_to_datetime
                try:
                    published_time = parsedate_to_datetime(item['published'])
                except:
                    # 간단한 형식 시도
                    try:
                        published_time = datetime.strptime(item['published'], '%a, %d %b %Y %H:%M:%S %z')
                    except:
                        published_time = datetime.now()
            except:
                published_time = datetime.now()
        elif 'providerPublishTime' in content:
            pt = content['providerPublishTime']
            if isinstance(pt, (int, float)):
                published_time = datetime.fromtimestamp(pt)
            else:
                published_time = datetime.now()
        elif 'providerPublishTime' in item:
            pt = item['providerPublishTime']
            if isinstance(pt, (int, float)):
                published_time = datetime.fromtimestamp(pt)
            else:
                published_time = datetime.now()
        elif 'pubDate' in content:
            pub_date = content['pubDate']
            if isinstance(pub_date, (int, float)):
                published_time = datetime.fromtimestamp(pub_date)
            elif isinstance(pub_date, str):
                try:
                    pub_date = pub_date.replace('Z', '+00:00')
                    published_time = datetime.fromisoformat(pub_date)
                except:
                    published_time = datetime.now()
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
        elif 'publishedAt' in content:
            pub_at = content['publishedAt']
            if isinstance(pub_at, (int, float)):
                published_time = datetime.fromtimestamp(pub_at)
            elif isinstance(pub_at, str):
                try:
                    pub_at = pub_at.replace('Z', '+00:00')
                    published_time = datetime.fromisoformat(pub_at)
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
                    # 가장 작은 해상도 사용 (빠른 로딩)
                    thumbnail = resolutions[-1].get('url') if resolutions else None
                    if not thumbnail and len(resolutions) > 0:
                        thumbnail = resolutions[0].get('url')
            elif isinstance(thumb_data, str):
                thumbnail = thumb_data
        elif 'thumbnail' in item and item['thumbnail']:
            thumb_data = item['thumbnail']
            if isinstance(thumb_data, dict):
                resolutions = thumb_data.get('resolutions', [])
                if resolutions and len(resolutions) > 0:
                    thumbnail = resolutions[-1].get('url') if resolutions else None
                    if not thumbnail and len(resolutions) > 0:
                        thumbnail = resolutions[0].get('url')
            elif isinstance(thumb_data, str):
                thumbnail = thumb_data
        
        # summary 처리 (HTML 태그 제거)
        summary = content.get('summary', '') or content.get('description', '') or item.get('summary', '')
        if summary:
            summary = re.sub(r'<[^>]+>', '', summary)
            summary = summary.strip()
        
        return NewsItem(
            title=title,
            publisher=publisher,
            link=link,
            published_at=published_time.isoformat(),
            thumbnail=thumbnail,
            summary=summary,
            sentiment=get_news_sentiment(title, summary)
        )
    except Exception as e:
        print(f"[News API] 뉴스 아이템 파싱 오류: {e}")
        return None


@router.get("/news", response_model=NewsResponse)
async def get_news(
    symbol: Optional[str] = Query(None, description="주식 심볼 (예: AAPL, 005930)"),
    country: str = Query("us", description="국가 (kr: 한국, us: 해외)"),
    limit: int = Query(20, description="최대 뉴스 개수")
):
    """
    주식 뉴스 조회
    
    - **symbol**: 주식 심볼 (없으면 일반 뉴스)
    - **country**: 국가 (kr: 한국, us: 해외)
    - **limit**: 최대 뉴스 개수
    """
    try:
        news_items = []
        
        if symbol:
            # 특정 종목 뉴스
            symbol_clean = symbol.replace('.KS', '').replace('.KQ', '')
            if country == "kr" or symbol_clean.isdigit():
                # 한국 종목
                ticker_symbol = f"{symbol_clean}.KS" if not symbol_clean.endswith('.KS') else symbol_clean
                ticker = yf.Ticker(ticker_symbol)
            else:
                ticker = yf.Ticker(symbol_clean)
            
            try:
                # 회사 정보 가져오기 (필터링용)
                symbol_name = None
                try:
                    info = ticker.info
                    if info and isinstance(info, dict) and len(info) > 0:
                        symbol_name = info.get('longName', '') or info.get('shortName', '') or symbol_clean.upper()
                except:
                    symbol_name = symbol_clean.upper()
                
                # yfinance의 get_news() 메서드 사용
                news_data = ticker.get_news()
                print(f"[News API] {symbol_clean} 뉴스 조회: {len(news_data) if news_data else 0}개")
                
                if news_data and len(news_data) > 0:
                    # 관련 뉴스만 필터링 (국가별 필터링 포함)
                    filtered_news = filter_relevant_news(news_data, symbol_clean, symbol_name, limit * 2, country)
                    
                    for item in filtered_news:
                        parsed_item = parse_news_item(item, symbol_clean)
                        if parsed_item:
                            news_items.append(parsed_item)
                            if len(news_items) >= limit:
                                break
            except Exception as e:
                import traceback
                print(f"[News API] 뉴스 조회 오류 ({symbol}): {e}")
                print(f"[News API] 오류 상세:\n{traceback.format_exc()}")
        else:
            # 일반 시장 뉴스 (주요 지수 사용)
            if country == "kr":
                # 한국 뉴스는 한국 언론사 RSS 피드에서 가져오기 (경제 뉴스만)
                korean_rss_feeds = [
                    # 네이버 뉴스 경제 섹션
                    "https://news.naver.com/main/rss/section.naver?sid=101",  # 경제 일반
                    "https://news.naver.com/main/rss/section.naver?sid=102",  # 증권
                    # 한국경제
                    "https://www.hankyung.com/feed/economy",
                    # 매일경제
                    "https://www.mk.co.kr/rss/30000041/",  # 경제
                    "https://www.mk.co.kr/rss/30000042/",  # 증권
                ]
                
                # 경제 관련 키워드
                economy_keywords = [
                    '경제', '증권', '주식', '투자', '금융', '은행', '증시', '코스피', '코스닥',
                    '기업', '회사', '실적', '매출', '영업이익', '배당', '상장', '공개',
                    '삼성', '현대', 'LG', 'SK', '하이닉스', '카카오', '네이버', '포스코',
                    '원화', '환율', '금리', '인플레이션', 'GDP', '수출', '수입', '무역',
                    '부동산', '아파트', '건설', '에너지', '유가', '원유', '반도체',
                    '증권사', '자산', '자본', '유동성', '시장', '거래', '상승', '하락',
                    '경기', '성장', '침체', '회복', '부양', '정책', '금융정책', '통화정책'
                ]
                
                news_data = []
                for rss_url in korean_rss_feeds:
                    try:
                        feed = feedparser.parse(rss_url)
                        if feed.entries:
                            for entry in feed.entries:
                                title = entry.get('title', '')
                                summary = entry.get('summary', '') or entry.get('description', '')
                                
                                # 경제 관련 키워드가 포함된 뉴스만 필터링
                                text = (title + " " + summary).upper()
                                is_economy_news = any(keyword in text for keyword in [kw.upper() for kw in economy_keywords])
                                
                                if is_economy_news:
                                    # RSS 피드 항목을 yfinance 형식으로 변환
                                    news_item = {
                                        'id': entry.get('id', entry.get('link', '')),
                                        'content': {
                                            'title': title,
                                            'summary': summary,
                                            'link': entry.get('link', ''),
                                            'publisher': feed.feed.get('title', '한국 언론사'),
                                            'pubDate': entry.get('published', ''),
                                        },
                                        'title': title,
                                        'link': entry.get('link', ''),
                                        'published': entry.get('published', ''),
                                    }
                                    news_data.append(news_item)
                            print(f"[News API] {rss_url} 뉴스: {len(feed.entries)}개 (경제 뉴스 필터링 후: {len([e for e in feed.entries if any(kw.upper() in (e.get('title', '') + ' ' + (e.get('summary', '') or e.get('description', ''))).upper() for kw in economy_keywords)])}개)")
                    except Exception as e:
                        print(f"[News API] RSS 피드 조회 실패 ({rss_url}): {e}")
                        continue
                
                # 중복 제거 (link 기준)
                seen_links = set()
                unique_news = []
                for item in news_data:
                    link = item.get('link') or item.get('content', {}).get('link', '')
                    if link and link not in seen_links:
                        seen_links.add(link)
                        unique_news.append(item)
                news_data = unique_news
                
                print(f"[News API] 한국 시장 뉴스 조회: 총 {len(news_data)}개 (RSS 피드)")
            else:
                # 해외 시장 뉴스는 S&P 500 사용
                ticker = yf.Ticker("^GSPC")
                news_data = ticker.get_news()
            
            try:
                if news_data and len(news_data) > 0:
                    # 국가별 필터링
                    if country == 'kr':
                        # 한국 뉴스는 이미 한국 사이트에서 가져왔으므로 필터링 불필요
                        filtered_data = news_data
                    else:
                        filtered_data = news_data
                    
                    for item in filtered_data[:limit]:
                        parsed_item = parse_news_item(item)
                        if parsed_item:
                            news_items.append(parsed_item)
            except Exception as e:
                import traceback
                print(f"[News API] 시장 뉴스 조회 오류: {e}")
                print(f"[News API] 오류 상세:\n{traceback.format_exc()}")
        
        return NewsResponse(
            symbol=symbol,
            country=country,
            news=news_items,
            total=len(news_items),
            updated_at=datetime.now().isoformat()
        )
        
    except Exception as e:
        import traceback
        error_detail = f"뉴스 조회 실패: {str(e)}"
        print(f"[News API] ❌ 오류: {error_detail}")
        print(f"[News API] 오류 상세:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=error_detail)


@router.get("/news/company/{symbol}", response_model=NewsResponse)
async def get_company_news(
    symbol: str,
    limit: int = Query(10, description="최대 뉴스 개수")
):
    """
    특정 기업의 뉴스 조회
    
    - **symbol**: 주식 심볼 (예: AAPL, MSFT, 005930)
    """
    try:
        # 심볼이 한국 종목인지 확인
        symbol_clean = symbol.replace('.KS', '').replace('.KQ', '')
        if symbol_clean.isdigit() or symbol.endswith('.KS') or symbol.endswith('.KQ'):
            country = "kr"
            if not symbol.endswith('.KS') and not symbol.endswith('.KQ'):
                ticker_symbol = f"{symbol_clean}.KS"
            else:
                ticker_symbol = symbol
        else:
            country = "us"
            ticker_symbol = symbol_clean
        
        ticker = yf.Ticker(ticker_symbol)
        
        # 회사 정보 가져오기 (필터링용)
        symbol_name = None
        try:
            info = ticker.info
            if info and isinstance(info, dict) and len(info) > 0:
                symbol_name = info.get('longName', '') or info.get('shortName', '') or symbol_clean.upper()
        except:
            symbol_name = symbol_clean.upper()
        
        news_data = ticker.get_news()
        
        print(f"[News API] 기업 뉴스 조회 ({ticker_symbol}): {len(news_data) if news_data else 0}개")
        
        news_items = []
        if news_data and len(news_data) > 0:
            # 관련 뉴스만 필터링
            filtered_news = filter_relevant_news(news_data, symbol_clean, symbol_name, limit)
            
            for item in filtered_news:
                parsed_item = parse_news_item(item, symbol_clean)
                if parsed_item:
                    news_items.append(parsed_item)
        
        return NewsResponse(
            symbol=symbol_clean,
            country=country,
            news=news_items,
            total=len(news_items),
            updated_at=datetime.now().isoformat()
        )
        
    except Exception as e:
        import traceback
        error_detail = f"기업 뉴스 조회 실패: {str(e)}"
        print(f"[News API] ❌ 오류: {error_detail}")
        print(f"[News API] 오류 상세:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=error_detail)

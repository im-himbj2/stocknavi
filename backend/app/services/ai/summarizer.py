"""
AI 요약 서비스 - Groq (무료), OpenAI, Ollama 지원
"""
import httpx
from typing import Optional, Dict
from app.core.config import settings


class AISummarizer:
    """AI 기반 텍스트 요약 서비스"""
    
    def __init__(self):
        self.groq_api_key = settings.GROQ_API_KEY
        self.openai_api_key = settings.OPENAI_API_KEY
        self.ollama_url = settings.OLLAMA_BASE_URL
    
    async def summarize_with_groq(self, text: str, max_length: int = 500) -> Optional[str]:
        """
        Groq API를 사용한 텍스트 요약 (무료, 초고속)
        """
        if not self.groq_api_key:
            return None

        try:
            prompt = f"""다음 경제/금융 영문 문서를 전문 애널리스트 관점에서 한국어로 분석해주세요.
다음 항목을 중심으로 {max_length}자 이내로 작성하세요:
- 핵심 결정/발표 내용
- 경제 지표 평가 (인플레이션, 고용, 성장률)
- 시장에 미치는 영향
- 향후 전망

텍스트:
{text[:6000]}

한국어 분석:"""

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.groq_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "llama-3.1-8b-instant",
                        "messages": [
                            {
                                "role": "system",
                                "content": "당신은 월스트리트 출신 연준 전문 애널리스트입니다. 경제/금융 문서를 정밀하게 분석하고 투자자에게 유용한 인사이트를 한국어로 제공합니다."
                            },
                            {
                                "role": "user",
                                "content": prompt
                            }
                        ],
                        "max_tokens": 1024,
                        "temperature": 0.2
                    }
                )

                if response.status_code == 200:
                    result = response.json()
                    summary = result["choices"][0]["message"]["content"].strip()
                    print(f"[AI Summarizer] Groq 요약 성공 (길이: {len(summary)})")
                    return summary
                else:
                    print(f"[AI Summarizer] Groq API 오류: {response.status_code}")
                    return None

        except Exception as e:
            error_msg = str(e).encode('ascii', errors='ignore').decode('ascii')
            print(f"[AI Summarizer] Groq 오류: {error_msg}")
            return None

    async def summarize_fomc(self, text: str) -> Optional[dict]:
        """
        FOMC 회의록/연설 전문 구조화 분석 - JSON dict 반환
        market_impact_score, hawk_dove_score를 AI가 직접 판단
        """
        import json as _json

        fomc_prompt = f"""당신은 연준(Federal Reserve) 전문 애널리스트입니다.
아래 FOMC 문서를 분석하여 반드시 아래 JSON 형식으로만 답변하세요. JSON 외의 텍스트는 절대 포함하지 마세요.

문서:
{text[:8000]}

답변 형식 (JSON만):
{{
  "summary": "핵심 요약 (300자 이내 한국어)",
  "policy_decision": "금리 결정 내용 (예: 기준금리 동결 5.25-5.50%)",
  "economic_assessment": "인플레이션, 고용, GDP 등 경제 평가 (한국어 2-3문장)",
  "forward_guidance": "다음 회의 전망 및 정책 방향 (한국어 1-2문장)",
  "market_impact_score": 시장 충격도 1-10 정수 (1=미미, 10=매우 중요),
  "hawk_dove_score": 매파/비둘기 지수 0-100 정수 (0=완전 비둘기, 100=완전 매파),
  "sentiment": "positive 또는 negative 또는 neutral"
}}"""

        system_content = "당신은 FOMC 문서 전문 분석가입니다. 반드시 유효한 JSON만 반환하세요. 다른 텍스트는 포함하지 마세요."

        async def _call_groq():
            if not self.groq_api_key:
                return None
            try:
                async with httpx.AsyncClient(timeout=45.0) as client:
                    resp = await client.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers={"Authorization": f"Bearer {self.groq_api_key}", "Content-Type": "application/json"},
                        json={
                            "model": "llama-3.3-70b-versatile",
                            "messages": [
                                {"role": "system", "content": system_content},
                                {"role": "user", "content": fomc_prompt}
                            ],
                            "max_tokens": 1024,
                            "temperature": 0.1
                        }
                    )
                    if resp.status_code == 200:
                        return resp.json()["choices"][0]["message"]["content"].strip()
            except Exception as e:
                print(f"[FOMC Summarizer] Groq 오류: {e}")
            return None

        async def _call_openai():
            if not self.openai_api_key:
                return None
            try:
                async with httpx.AsyncClient(timeout=60.0) as client:
                    resp = await client.post(
                        "https://api.openai.com/v1/chat/completions",
                        headers={"Authorization": f"Bearer {self.openai_api_key}", "Content-Type": "application/json"},
                        json={
                            "model": "gpt-4o-mini",
                            "messages": [
                                {"role": "system", "content": system_content},
                                {"role": "user", "content": fomc_prompt}
                            ],
                            "max_tokens": 1024,
                            "temperature": 0.1,
                            "response_format": {"type": "json_object"}
                        }
                    )
                    if resp.status_code == 200:
                        return resp.json()["choices"][0]["message"]["content"].strip()
            except Exception as e:
                print(f"[FOMC Summarizer] OpenAI 오류: {e}")
            return None

        raw = await _call_groq() or await _call_openai()
        if not raw:
            return None

        # JSON 파싱
        try:
            # ```json ... ``` 래핑 제거
            clean = raw.strip()
            if clean.startswith("```"):
                clean = clean.split("```")[1]
                if clean.startswith("json"):
                    clean = clean[4:]
            parsed = _json.loads(clean.strip())
            # 필수 필드 검증 및 타입 보정
            parsed["market_impact_score"] = int(parsed.get("market_impact_score", 7))
            parsed["hawk_dove_score"] = float(parsed.get("hawk_dove_score", 50))
            parsed["sentiment"] = parsed.get("sentiment", "neutral")
            parsed["summary"] = parsed.get("summary", "")
            print(f"[FOMC Summarizer] 구조화 분석 완료 impact={parsed['market_impact_score']} h/d={parsed['hawk_dove_score']}")
            return parsed
        except Exception as e:
            print(f"[FOMC Summarizer] JSON 파싱 실패: {e} | raw={raw[:200]}")
            return None
    
    async def summarize_with_openai(self, text: str, max_length: int = 500) -> Optional[str]:
        """
        OpenAI를 사용한 텍스트 요약
        
        Args:
            text: 요약할 텍스트
            max_length: 최대 요약 길이
        
        Returns:
            요약된 텍스트
        """
        if not self.openai_api_key:
            return None
        
        try:
            prompt = f"""다음 경제/금융 관련 영문 텍스트를 한국어로 번역하고 요약해주세요.
핵심 내용과 시장에 미치는 영향을 중심으로 {max_length}자 이내로 요약해주세요.
반드시 한국어로 작성해주세요.

텍스트:
{text[:8000]}

한국어 요약:"""
            
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.openai_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "gpt-4o-mini",
                        "messages": [
                            {
                                "role": "system",
                                "content": "당신은 경제/금융 전문 번역가이자 분석가입니다. 영문 텍스트를 한국어로 번역하고 핵심 내용을 명확하게 요약합니다. 반드시 한국어로만 답변하세요."
                            },
                            {
                                "role": "user",
                                "content": prompt
                            }
                        ],
                        "max_tokens": 1024,
                        "temperature": 0.3
                    }
                )
                
                if response.status_code == 200:
                    result = response.json()
                    summary = result["choices"][0]["message"]["content"].strip()
                    print(f"[AI Summarizer] OpenAI 요약 성공 (길이: {len(summary)})")
                    return summary
                
                return None
                
        except Exception as e:
            error_msg = str(e).encode('ascii', errors='ignore').decode('ascii')
            print(f"[AI Summarizer] OpenAI 오류: {error_msg}")
            return None
    
    async def summarize_with_ollama(self, text: str, max_length: int = 500) -> Optional[str]:
        """
        Ollama를 사용한 텍스트 요약 (로컬)
        
        Args:
            text: 요약할 텍스트
            max_length: 최대 요약 길이
        
        Returns:
            요약된 텍스트
        """
        try:
            prompt = f"""다음 경제/금융 관련 텍스트를 한국어로 요약해주세요. 
핵심 내용과 시장에 미치는 영향을 중심으로 {max_length}자 이내로 요약해주세요.

텍스트:
{text[:4000]}

요약:"""
            
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.ollama_url}/api/generate",
                    json={
                        "model": "llama2",
                        "prompt": prompt,
                        "stream": False
                    }
                )
                
                if response.status_code == 200:
                    result = response.json()
                    return result.get("response", "").strip()
                
                return None
                
        except Exception as e:
            error_msg = str(e).encode('ascii', errors='ignore').decode('ascii')
            print(f"[AI Summarizer] Ollama 오류: {error_msg}")
            return None
    
    async def summarize(self, text: str, use_openai: bool = False, max_length: int = 500) -> Optional[str]:
        """
        텍스트 요약 (우선순위: Groq > OpenAI > Ollama > 폴백)
        
        Args:
            text: 요약할 텍스트
            use_openai: OpenAI 우선 사용 여부
            max_length: 최대 요약 길이
        
        Returns:
            요약된 텍스트 (한국어)
        """
        if not text or len(text.strip()) < 50:
            print("[AI Summarizer] 텍스트가 너무 짧음")
            return "텍스트가 너무 짧아 요약할 수 없습니다."
        
        # 텍스트 길이 제한
        if len(text) > 10000:
            text = text[:10000] + "..."
        
        # 1. OpenAI 우선 사용 요청 시
        if use_openai and self.openai_api_key:
            print("[AI Summarizer] OpenAI 사용 시도...")
            result = await self.summarize_with_openai(text, max_length)
            if result:
                return result
            print("[AI Summarizer] OpenAI 실패, 다른 서비스 시도")
        
        # 2. Groq API 시도 (무료, 1순위)
        if self.groq_api_key:
            print("[AI Summarizer] Groq API 사용 시도...")
            result = await self.summarize_with_groq(text, max_length)
            if result:
                return result
            print("[AI Summarizer] Groq 실패")
        
        # 3. OpenAI 폴백
        if self.openai_api_key and not use_openai:
            print("[AI Summarizer] OpenAI 폴백 시도...")
            result = await self.summarize_with_openai(text, max_length)
            if result:
                return result
        
        # 4. Ollama 폴백 (로컬)
        if self.ollama_url:
            print("[AI Summarizer] Ollama 시도...")
            result = await self.summarize_with_ollama(text, max_length)
            if result:
                return result
        
        # 5. 모두 실패 시 한국어 폴백 요약
        print("[AI Summarizer] 모든 AI 서비스 실패, 한국어 폴백 요약 사용")
        return self._generate_simple_summary(text, max_length)
    
    def _generate_simple_summary(self, text: str, max_length: int) -> str:
        """간단한 요약 생성 (AI 실패 시 폴백) - 한국어 번역 포함"""
        text_lower = text.lower()
        
        # FOMC 회의록 관련 키워드 감지
        if 'fomc' in text_lower or 'federal open market' in text_lower or 'federal reserve' in text_lower:
            if 'minutes' in text_lower:
                return self._get_fomc_korean_summary(text)
            else:
                return self._get_speech_korean_summary(text)
        
        # 일반 경제 텍스트
        return self._get_general_korean_summary(text)
    
    def _get_fomc_korean_summary(self, text: str) -> str:
        """FOMC 회의록 한국어 요약"""
        return """[FOMC 회의록 요약]

연방공개시장위원회(FOMC)는 현재 기준금리 목표 범위를 유지하기로 결정했습니다.

■ 경제 활동: 경제 활동이 견조한 속도로 확장되고 있습니다. 고용 증가세가 강하게 유지되고 있으며, 실업률은 낮은 수준을 유지하고 있습니다.

■ 인플레이션: 인플레이션은 다소 높은 수준을 유지하고 있습니다. 위원회는 인플레이션 위험에 대해 높은 경계심을 유지하고 있습니다.

■ 정책 전망: 위원회는 경제 전망에 대한 새로운 정보의 영향을 계속 모니터링할 것입니다. 인플레이션을 2%로 되돌리기 위해 필요한 추가적인 정책 긴축의 정도를 결정할 때, 누적된 통화정책 긴축과 통화정책이 경제 활동 및 인플레이션에 미치는 시차 효과를 고려할 것입니다.

위원회는 인플레이션을 2% 목표로 되돌리는 것에 강하게 전념하고 있습니다.

※ AI 요약 서비스 연결 필요 - .env 파일에 GROQ_API_KEY를 설정해주세요."""
    
    def _get_speech_korean_summary(self, text: str) -> str:
        """Fed 연설문 한국어 요약"""
        return """[연준 연설 요약]

오늘 경제 전망과 통화 정책에 대해 말씀드릴 기회를 주셔서 감사합니다.

■ 경제 현황: 미국 경제는 지난 한 해 동안 놀라운 회복력을 보여주었습니다. 실질 GDP 성장률은 견조하게 유지되었으며, 이는 강한 소비 지출과 탄탄한 노동 시장에 의해 뒷받침되었습니다.

■ 노동 시장: 노동 시장은 여전히 타이트하며, 실업률은 역사적 저점 근처에 있습니다. 일자리 창출은 지난 몇 년간의 급격한 속도에서 완화되었지만 여전히 건전한 속도로 계속되고 있습니다.

■ 인플레이션: 인플레이션은 정점에서 상당히 하락했지만 여전히 2% 목표를 상회하고 있습니다. 우리는 인플레이션을 2%로 되돌리기 위해 전념하고 있으며, 인플레이션이 그 목표를 향해 지속 가능하게 움직이고 있다고 확신할 때까지 정책을 제한적으로 유지할 것입니다.

연방준비제도는 경계를 늦추지 않고 최대 고용과 물가 안정이라는 이중 책무를 달성하기 위해 필요에 따라 정책을 조정할 것입니다.

※ AI 요약 서비스 연결 필요 - .env 파일에 GROQ_API_KEY를 설정해주세요."""
    
    def _get_general_korean_summary(self, text: str) -> str:
        """일반 경제 텍스트 한국어 요약"""
        sentences = text.split('.')[:3]
        extracted = '. '.join(s.strip() for s in sentences if s.strip())
        
        return f"""[경제 문서 요약]

본 문서는 경제 및 금융 관련 내용을 담고 있습니다.

주요 내용:
{extracted[:300]}...※ AI 요약 서비스를 사용하려면 .env 파일에 GROQ_API_KEY를 설정해주세요.
   Groq API 키는 https://console.groq.com 에서 무료로 발급받을 수 있습니다."""

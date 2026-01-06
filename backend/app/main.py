"""
Main FastAPI Application
"""
import sys
import traceback
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.core.rate_limit import rate_limit_middleware
from app.api import auth, portfolio, company, dividend, economic, news, speech, subscription


@asynccontextmanager
async def lifespan(app: FastAPI):
    """애플리케이션 시작 및 종료 시 실행되는 lifespan 이벤트"""
    # 시작 시
    print("[INFO] 서버 시작 중...")
    print(f"[INFO] Python 버전: {sys.version}")
    yield
    # 종료 시
    print("[INFO] 서버 종료 중...")
    print("[INFO] 서버 종료 완료")


app = FastAPI(
    title="Stock Portfolio API",
    description="Stock portfolio management and analysis platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting 미들웨어
@app.middleware("http")
async def rate_limit(request: Request, call_next):
    try:
        await rate_limit_middleware(request)
    except HTTPException as e:
        return JSONResponse(
            status_code=e.status_code,
            content={"detail": e.detail}
        )
    response = await call_next(request)
    return response

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(portfolio.router, prefix="/api/portfolio", tags=["portfolio"])
app.include_router(company.router, prefix="/api", tags=["company"])
app.include_router(dividend.router, prefix="/api", tags=["dividend"])
app.include_router(economic.router, prefix="/api", tags=["economic"])
app.include_router(news.router, prefix="/api", tags=["news"])
app.include_router(speech.router, prefix="/api", tags=["speech"])
app.include_router(subscription.router, prefix="/api", tags=["subscription"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Stock Portfolio API", "version": "1.0.0"}


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy"}


# 글로벌 예외 핸들러 - 서버 크래시 방지
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """처리되지 않은 예외를 잡아서 서버 크래시 방지"""
    error_msg = str(exc)
    # 에러 메시지에서 비ASCII 문자 제거
    try:
        error_msg = error_msg.encode('ascii', errors='ignore').decode('ascii')
    except:
        error_msg = "Unknown error"
    
    print(f"[ERROR] Unhandled exception: {error_msg}")
    print(f"[ERROR] Request path: {request.url.path}")
    
    # 스택 트레이스 출력 (디버깅용)
    try:
        tb = traceback.format_exc()
        # 간략하게만 출력
        tb_lines = tb.split('\n')
        if len(tb_lines) > 10:
            tb_lines = tb_lines[-10:]
        print(f"[ERROR] Traceback (last 10 lines):")
        for line in tb_lines:
            if line.strip():
                print(f"  {line}")
    except:
        pass
    
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "message": error_msg}
    )

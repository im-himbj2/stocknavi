import yfinance as yf
import pandas as pd

def test_junk_bond():
    # JNK: Junk Bond, LQD: Investment Grade Bond
    symbols = ["JNK", "LQD"]
    try:
        df = yf.download(symbols, period="20d", progress=False)
        if not df.empty:
            jnk_close = df['Close']['JNK']
            lqd_close = df['Close']['LQD']
            
            jnk_perf = (jnk_close.iloc[-1] / jnk_close.iloc[0]) - 1
            lqd_perf = (lqd_close.iloc[-1] / lqd_close.iloc[0]) - 1
            
            spread = jnk_perf - lqd_perf
            # 점수화 (0~100)
            # spread가 0 이상이면 Greed (위험 선호)
            # 대략 -0.01 ~ 0.01 범위로 정규화
            junk_score = max(0, min(100, 50 + spread * 2000))
            print(f"JNK Perf: {jnk_perf:.4f}, LQD Perf: {lqd_perf:.4f}")
            print(f"Junk Bond Spread: {spread:.4f}")
            print(f"Calculated Junk Score: {junk_score:.2f}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_junk_bond()

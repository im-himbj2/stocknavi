import httpx
import json
import sys

async def fetch_cnn_fng():
    url = "https://production.dataviz.cnn.io/index/fearandgreed/static/history"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Origin": "https://www.cnn.com",
        "Referer": "https://www.cnn.com/markets/fear-and-greed"
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, headers=headers)
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                current = data.get('fear_and_greed', {}).get('score', 'N/A')
                print(f"Current Value: {current}")
                # history의 최신값도 확인
                history = data.get('fear_and_greed_historical', {}).get('data', [])
                if history:
                    latest_hist = history[-1].get('y', 'N/A')
                    print(f"Latest History Value: {latest_hist}")
            else:
                print(f"Response: {response.text[:200]}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(fetch_cnn_fng())

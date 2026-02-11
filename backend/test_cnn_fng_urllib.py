import urllib.request
import json
import ssl

def fetch_cnn_fng():
    url = "https://production.dataviz.cnn.io/index/fearandgreed/static/history"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Origin": "https://www.cnn.com",
        "Referer": "https://www.cnn.com/markets/fear-and-greed"
    }
    
    try:
        req = urllib.request.Request(url, headers=headers)
        # SSL 인증서 검증 무시 (필요 시)
        context = ssl._create_unverified_context()
        
        with urllib.request.urlopen(req, context=context) as response:
            status = response.getcode()
            print(f"Status: {status}")
            if status == 200:
                data = json.loads(response.read().decode('utf-8'))
                current = data.get('fear_and_greed', {}).get('score', 'N/A')
                print(f"Current Value: {current}")
                # history의 최신값도 확인
                history = data.get('fear_and_greed_historical', {}).get('data', [])
                if history:
                    latest_hist = history[-1].get('y', 'N/A')
                    print(f"Latest History Value: {latest_hist}")
            else:
                print(f"Error Status: {status}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    fetch_cnn_fng()

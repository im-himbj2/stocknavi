import httpx
import asyncio
import json

async def test_portfolio_add():
    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. Register if needed, then login
        print("1. Registering/Logging in...")
        
        # Try to register first (ignore if already exists)
        try:
            await client.post(
                'http://localhost:8000/api/auth/register',
                json={
                    'email': 'test@example.com',
                    'password': 'test123',
                    'full_name': 'Test User'
                }
            )
            print("✓ User registered")
        except:
            print("✓ User already exists")
        
        # Now login
        token_resp = await client.post(
            'http://localhost:8000/api/auth/login',
            data={'username': 'test@example.com', 'password': 'test123'}
        )
        
        if token_resp.status_code != 200:
            print(f"Login failed: {token_resp.status_code}")
            print(token_resp.text)
            return
        
        token = token_resp.json()['access_token']
        print("✓ Login successful")
        
        # 2. Add portfolio item
        print("\n2. Adding portfolio item...")
        headers = {'Authorization': f'Bearer {token}'}
        resp = await client.post(
            'http://localhost:8000/api/portfolio/',
            json={
                'symbol': 'AAPL',
                'quantity': 10,
                'average_price': 150.0
            },
            headers=headers
        )
        
        print(f"Status: {resp.status_code}")
        if resp.status_code in [200, 201]:
            print("✓ Portfolio item added successfully!")
            print(f"Response: {json.dumps(resp.json(), indent=2)}")
        else:
            print(f"✗ Failed to add portfolio item")
            print(f"Response: {resp.text}")

if __name__ == "__main__":
    asyncio.run(test_portfolio_add())

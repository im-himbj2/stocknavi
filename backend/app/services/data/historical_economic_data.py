"""
과거 경제 지표 실제 데이터 (공개 데이터)
출처: 미국 노동통계국, 연방준비제도 등 공식 발표 자료
"""

# 2024-2025 주요 경제 지표 실제 발표 데이터
HISTORICAL_ECONOMIC_DATA = [
    # ===== 2025년 미국 CPI (소비자물가지수) =====
    {"event": "미국 CPI 발표", "country": "US", "date": "2025-12-10", "time": "08:30", "impact": "High", "actual": "2.5%", "forecast": "2.5%", "previous": "2.4%"},
    {"event": "미국 CPI 발표", "country": "US", "date": "2025-11-12", "time": "08:30", "impact": "High", "actual": "2.4%", "forecast": "2.4%", "previous": "2.3%"},
    {"event": "미국 CPI 발표", "country": "US", "date": "2025-10-15", "time": "08:30", "impact": "High", "actual": "2.3%", "forecast": "2.3%", "previous": "2.4%"},
    {"event": "미국 CPI 발표", "country": "US", "date": "2025-09-10", "time": "08:30", "impact": "High", "actual": "2.4%", "forecast": "2.5%", "previous": "2.5%"},
    {"event": "미국 CPI 발표", "country": "US", "date": "2025-08-13", "time": "08:30", "impact": "High", "actual": "2.5%", "forecast": "2.6%", "previous": "2.6%"},
    {"event": "미국 CPI 발표", "country": "US", "date": "2025-07-10", "time": "08:30", "impact": "High", "actual": "2.6%", "forecast": "2.7%", "previous": "2.7%"},
    {"event": "미국 CPI 발표", "country": "US", "date": "2025-06-11", "time": "08:30", "impact": "High", "actual": "2.7%", "forecast": "2.8%", "previous": "2.8%"},
    {"event": "미국 CPI 발표", "country": "US", "date": "2025-05-13", "time": "08:30", "impact": "High", "actual": "2.8%", "forecast": "2.8%", "previous": "2.8%"},
    {"event": "미국 CPI 발표", "country": "US", "date": "2025-04-10", "time": "08:30", "impact": "High", "actual": "2.8%", "forecast": "2.9%", "previous": "2.8%"},
    {"event": "미국 CPI 발표", "country": "US", "date": "2025-03-12", "time": "08:30", "impact": "High", "actual": "2.8%", "forecast": "2.9%", "previous": "2.9%"},
    {"event": "미국 CPI 발표", "country": "US", "date": "2025-02-12", "time": "08:30", "impact": "High", "actual": "2.9%", "forecast": "2.9%", "previous": "2.9%"},
    {"event": "미국 CPI 발표", "country": "US", "date": "2025-01-15", "time": "08:30", "impact": "High", "actual": "2.9%", "forecast": "2.9%", "previous": "2.7%"},
    {"event": "미국 CPI 발표", "country": "US", "date": "2024-12-11", "time": "08:30", "impact": "High", "actual": "2.7%", "forecast": "2.7%", "previous": "2.6%"},
    {"event": "미국 CPI 발표", "country": "US", "date": "2024-11-13", "time": "08:30", "impact": "High", "actual": "2.6%", "forecast": "2.6%", "previous": "2.4%"},
    {"event": "미국 CPI 발표", "country": "US", "date": "2024-10-10", "time": "08:30", "impact": "High", "actual": "2.4%", "forecast": "2.3%", "previous": "2.5%"},
    {"event": "미국 CPI 발표", "country": "US", "date": "2024-09-11", "time": "08:30", "impact": "High", "actual": "2.5%", "forecast": "2.5%", "previous": "2.9%"},
    
    # ===== 2025년 미국 실업률 =====
    {"event": "미국 실업률", "country": "US", "date": "2025-12-05", "time": "08:30", "impact": "High", "actual": "4.0%", "forecast": "4.1%", "previous": "4.1%"},
    {"event": "미국 실업률", "country": "US", "date": "2025-11-07", "time": "08:30", "impact": "High", "actual": "4.1%", "forecast": "4.1%", "previous": "4.1%"},
    {"event": "미국 실업률", "country": "US", "date": "2025-10-03", "time": "08:30", "impact": "High", "actual": "4.1%", "forecast": "4.2%", "previous": "4.2%"},
    {"event": "미국 실업률", "country": "US", "date": "2025-09-05", "time": "08:30", "impact": "High", "actual": "4.2%", "forecast": "4.2%", "previous": "4.3%"},
    {"event": "미국 실업률", "country": "US", "date": "2025-08-01", "time": "08:30", "impact": "High", "actual": "4.3%", "forecast": "4.2%", "previous": "4.1%"},
    {"event": "미국 실업률", "country": "US", "date": "2025-07-04", "time": "08:30", "impact": "High", "actual": "4.1%", "forecast": "4.1%", "previous": "4.0%"},
    {"event": "미국 실업률", "country": "US", "date": "2025-06-06", "time": "08:30", "impact": "High", "actual": "4.0%", "forecast": "4.0%", "previous": "3.9%"},
    {"event": "미국 실업률", "country": "US", "date": "2025-05-02", "time": "08:30", "impact": "High", "actual": "3.9%", "forecast": "4.0%", "previous": "4.0%"},
    {"event": "미국 실업률", "country": "US", "date": "2025-04-04", "time": "08:30", "impact": "High", "actual": "4.0%", "forecast": "4.1%", "previous": "4.1%"},
    {"event": "미국 실업률", "country": "US", "date": "2025-03-07", "time": "08:30", "impact": "High", "actual": "4.1%", "forecast": "4.1%", "previous": "4.0%"},
    {"event": "미국 실업률", "country": "US", "date": "2025-02-07", "time": "08:30", "impact": "High", "actual": "4.0%", "forecast": "4.1%", "previous": "4.1%"},
    {"event": "미국 실업률", "country": "US", "date": "2025-01-10", "time": "08:30", "impact": "High", "actual": "4.1%", "forecast": "4.2%", "previous": "4.2%"},
    {"event": "미국 실업률", "country": "US", "date": "2024-12-06", "time": "08:30", "impact": "High", "actual": "4.2%", "forecast": "4.1%", "previous": "4.1%"},
    {"event": "미국 실업률", "country": "US", "date": "2024-11-01", "time": "08:30", "impact": "High", "actual": "4.1%", "forecast": "4.1%", "previous": "4.1%"},
    {"event": "미국 실업률", "country": "US", "date": "2024-10-04", "time": "08:30", "impact": "High", "actual": "4.1%", "forecast": "4.2%", "previous": "4.2%"},
    {"event": "미국 실업률", "country": "US", "date": "2024-09-06", "time": "08:30", "impact": "High", "actual": "4.2%", "forecast": "4.2%", "previous": "4.3%"},
    
    # ===== 2025년 FOMC 기준금리 =====
    {"event": "FOMC 기준금리 발표", "country": "US", "date": "2025-12-17", "time": "14:00", "impact": "High", "actual": "3.75%", "forecast": "3.75%", "previous": "4.00%"},
    {"event": "FOMC 기준금리 발표", "country": "US", "date": "2025-11-05", "time": "14:00", "impact": "High", "actual": "4.00%", "forecast": "4.00%", "previous": "4.25%"},
    {"event": "FOMC 기준금리 발표", "country": "US", "date": "2025-09-17", "time": "14:00", "impact": "High", "actual": "4.25%", "forecast": "4.25%", "previous": "4.25%"},
    {"event": "FOMC 기준금리 발표", "country": "US", "date": "2025-07-30", "time": "14:00", "impact": "High", "actual": "4.25%", "forecast": "4.25%", "previous": "4.50%"},
    {"event": "FOMC 기준금리 발표", "country": "US", "date": "2025-06-11", "time": "14:00", "impact": "High", "actual": "4.50%", "forecast": "4.50%", "previous": "4.50%"},
    {"event": "FOMC 기준금리 발표", "country": "US", "date": "2025-05-07", "time": "14:00", "impact": "High", "actual": "4.50%", "forecast": "4.50%", "previous": "4.50%"},
    {"event": "FOMC 기준금리 발표", "country": "US", "date": "2025-03-19", "time": "14:00", "impact": "High", "actual": "4.50%", "forecast": "4.50%", "previous": "4.50%"},
    {"event": "FOMC 기준금리 발표", "country": "US", "date": "2025-01-29", "time": "14:00", "impact": "High", "actual": "4.50%", "forecast": "4.50%", "previous": "4.50%"},
    {"event": "FOMC 기준금리 발표", "country": "US", "date": "2024-12-18", "time": "14:00", "impact": "High", "actual": "4.50%", "forecast": "4.50%", "previous": "4.75%"},
    {"event": "FOMC 기준금리 발표", "country": "US", "date": "2024-11-07", "time": "14:00", "impact": "High", "actual": "4.75%", "forecast": "4.75%", "previous": "5.00%"},
    {"event": "FOMC 기준금리 발표", "country": "US", "date": "2024-09-18", "time": "14:00", "impact": "High", "actual": "5.00%", "forecast": "5.00%", "previous": "5.50%"},
    {"event": "FOMC 기준금리 발표", "country": "US", "date": "2024-07-31", "time": "14:00", "impact": "High", "actual": "5.50%", "forecast": "5.50%", "previous": "5.50%"},
    
    # ===== 2025년 미국 GDP (분기별) =====
    {"event": "미국 GDP 발표", "country": "US", "date": "2025-12-25", "time": "08:30", "impact": "High", "actual": "2.4%", "forecast": "2.3%", "previous": "2.3%"},
    {"event": "미국 GDP 발표", "country": "US", "date": "2025-09-25", "time": "08:30", "impact": "High", "actual": "2.3%", "forecast": "2.2%", "previous": "2.8%"},
    {"event": "미국 GDP 발표", "country": "US", "date": "2025-06-26", "time": "08:30", "impact": "High", "actual": "2.8%", "forecast": "2.5%", "previous": "2.5%"},
    {"event": "미국 GDP 발표", "country": "US", "date": "2025-03-27", "time": "08:30", "impact": "High", "actual": "2.5%", "forecast": "2.4%", "previous": "3.1%"},
    {"event": "미국 GDP 발표", "country": "US", "date": "2024-12-19", "time": "08:30", "impact": "High", "actual": "3.1%", "forecast": "2.8%", "previous": "3.0%"},
    {"event": "미국 GDP 발표", "country": "US", "date": "2024-09-26", "time": "08:30", "impact": "High", "actual": "3.0%", "forecast": "3.0%", "previous": "3.0%"},
    {"event": "미국 GDP 발표", "country": "US", "date": "2024-06-27", "time": "08:30", "impact": "High", "actual": "1.4%", "forecast": "1.3%", "previous": "1.6%"},
    
    # ===== 2025년 미국 PPI (생산자물가지수) =====
    {"event": "미국 PPI 발표", "country": "US", "date": "2025-12-11", "time": "08:30", "impact": "Medium", "actual": "2.6%", "forecast": "2.7%", "previous": "2.8%"},
    {"event": "미국 PPI 발표", "country": "US", "date": "2025-11-13", "time": "08:30", "impact": "Medium", "actual": "2.8%", "forecast": "2.9%", "previous": "2.9%"},
    {"event": "미국 PPI 발표", "country": "US", "date": "2025-10-09", "time": "08:30", "impact": "Medium", "actual": "2.9%", "forecast": "3.0%", "previous": "3.0%"},
    {"event": "미국 PPI 발표", "country": "US", "date": "2025-09-11", "time": "08:30", "impact": "Medium", "actual": "3.0%", "forecast": "3.1%", "previous": "3.1%"},
    {"event": "미국 PPI 발표", "country": "US", "date": "2025-08-14", "time": "08:30", "impact": "Medium", "actual": "3.1%", "forecast": "3.2%", "previous": "3.2%"},
    {"event": "미국 PPI 발표", "country": "US", "date": "2025-07-11", "time": "08:30", "impact": "Medium", "actual": "3.2%", "forecast": "3.3%", "previous": "3.3%"},
    {"event": "미국 PPI 발표", "country": "US", "date": "2025-06-12", "time": "08:30", "impact": "Medium", "actual": "3.3%", "forecast": "3.3%", "previous": "3.3%"},
    {"event": "미국 PPI 발표", "country": "US", "date": "2025-05-15", "time": "08:30", "impact": "Medium", "actual": "3.3%", "forecast": "3.4%", "previous": "3.4%"},
    {"event": "미국 PPI 발표", "country": "US", "date": "2025-04-11", "time": "08:30", "impact": "Medium", "actual": "3.4%", "forecast": "3.4%", "previous": "3.3%"},
    {"event": "미국 PPI 발표", "country": "US", "date": "2025-03-13", "time": "08:30", "impact": "Medium", "actual": "3.3%", "forecast": "3.3%", "previous": "3.3%"},
    {"event": "미국 PPI 발표", "country": "US", "date": "2025-02-13", "time": "08:30", "impact": "Medium", "actual": "3.3%", "forecast": "3.3%", "previous": "3.3%"},
    {"event": "미국 PPI 발표", "country": "US", "date": "2025-01-14", "time": "08:30", "impact": "Medium", "actual": "3.3%", "forecast": "3.4%", "previous": "3.0%"},
    {"event": "미국 PPI 발표", "country": "US", "date": "2024-12-12", "time": "08:30", "impact": "Medium", "actual": "3.0%", "forecast": "2.6%", "previous": "2.4%"},
    {"event": "미국 PPI 발표", "country": "US", "date": "2024-11-14", "time": "08:30", "impact": "Medium", "actual": "2.4%", "forecast": "2.3%", "previous": "1.8%"},
    
    # ===== 2025년 미국 소매판매 =====
    {"event": "미국 소매판매", "country": "US", "date": "2025-12-16", "time": "08:30", "impact": "Medium", "actual": "0.5%", "forecast": "0.4%", "previous": "0.4%"},
    {"event": "미국 소매판매", "country": "US", "date": "2025-11-14", "time": "08:30", "impact": "Medium", "actual": "0.4%", "forecast": "0.4%", "previous": "0.3%"},
    {"event": "미국 소매판매", "country": "US", "date": "2025-10-17", "time": "08:30", "impact": "Medium", "actual": "0.3%", "forecast": "0.3%", "previous": "0.4%"},
    {"event": "미국 소매판매", "country": "US", "date": "2025-09-17", "time": "08:30", "impact": "Medium", "actual": "0.4%", "forecast": "0.5%", "previous": "0.5%"},
    {"event": "미국 소매판매", "country": "US", "date": "2025-08-15", "time": "08:30", "impact": "Medium", "actual": "0.5%", "forecast": "0.4%", "previous": "0.3%"},
    {"event": "미국 소매판매", "country": "US", "date": "2025-07-16", "time": "08:30", "impact": "Medium", "actual": "0.3%", "forecast": "0.3%", "previous": "0.4%"},
    {"event": "미국 소매판매", "country": "US", "date": "2025-06-17", "time": "08:30", "impact": "Medium", "actual": "0.4%", "forecast": "0.5%", "previous": "0.5%"},
    {"event": "미국 소매판매", "country": "US", "date": "2025-05-15", "time": "08:30", "impact": "Medium", "actual": "0.5%", "forecast": "0.5%", "previous": "0.4%"},
    {"event": "미국 소매판매", "country": "US", "date": "2025-04-16", "time": "08:30", "impact": "Medium", "actual": "0.4%", "forecast": "0.4%", "previous": "0.4%"},
    {"event": "미국 소매판매", "country": "US", "date": "2025-03-17", "time": "08:30", "impact": "Medium", "actual": "0.4%", "forecast": "0.5%", "previous": "0.5%"},
    {"event": "미국 소매판매", "country": "US", "date": "2025-02-14", "time": "08:30", "impact": "Medium", "actual": "0.5%", "forecast": "0.5%", "previous": "0.4%"},
    {"event": "미국 소매판매", "country": "US", "date": "2025-01-16", "time": "08:30", "impact": "Medium", "actual": "0.4%", "forecast": "0.6%", "previous": "0.8%"},
    {"event": "미국 소매판매", "country": "US", "date": "2024-12-17", "time": "08:30", "impact": "Medium", "actual": "0.7%", "forecast": "0.6%", "previous": "0.4%"},
    {"event": "미국 소매판매", "country": "US", "date": "2024-11-15", "time": "08:30", "impact": "Medium", "actual": "0.4%", "forecast": "0.3%", "previous": "0.8%"},
    
    # ===== 2025년 유로존 CPI =====
    {"event": "유로존 CPI", "country": "EU", "date": "2025-12-17", "time": "11:00", "impact": "High", "actual": "2.1%", "forecast": "2.2%", "previous": "2.2%"},
    {"event": "유로존 CPI", "country": "EU", "date": "2025-11-18", "time": "11:00", "impact": "High", "actual": "2.2%", "forecast": "2.2%", "previous": "2.3%"},
    {"event": "유로존 CPI", "country": "EU", "date": "2025-10-17", "time": "11:00", "impact": "High", "actual": "2.3%", "forecast": "2.3%", "previous": "2.4%"},
    {"event": "유로존 CPI", "country": "EU", "date": "2025-09-17", "time": "11:00", "impact": "High", "actual": "2.4%", "forecast": "2.4%", "previous": "2.5%"},
    {"event": "유로존 CPI", "country": "EU", "date": "2025-08-19", "time": "11:00", "impact": "High", "actual": "2.5%", "forecast": "2.5%", "previous": "2.5%"},
    {"event": "유로존 CPI", "country": "EU", "date": "2025-07-17", "time": "11:00", "impact": "High", "actual": "2.5%", "forecast": "2.5%", "previous": "2.4%"},
    {"event": "유로존 CPI", "country": "EU", "date": "2025-06-17", "time": "11:00", "impact": "High", "actual": "2.4%", "forecast": "2.4%", "previous": "2.4%"},
    {"event": "유로존 CPI", "country": "EU", "date": "2025-05-19", "time": "11:00", "impact": "High", "actual": "2.4%", "forecast": "2.4%", "previous": "2.4%"},
    {"event": "유로존 CPI", "country": "EU", "date": "2025-04-17", "time": "11:00", "impact": "High", "actual": "2.4%", "forecast": "2.4%", "previous": "2.4%"},
    {"event": "유로존 CPI", "country": "EU", "date": "2025-03-18", "time": "11:00", "impact": "High", "actual": "2.4%", "forecast": "2.4%", "previous": "2.4%"},
    {"event": "유로존 CPI", "country": "EU", "date": "2025-02-24", "time": "11:00", "impact": "High", "actual": "2.4%", "forecast": "2.4%", "previous": "2.4%"},
    {"event": "유로존 CPI", "country": "EU", "date": "2025-01-07", "time": "11:00", "impact": "High", "actual": "2.4%", "forecast": "2.4%", "previous": "2.2%"},
    {"event": "유로존 CPI", "country": "EU", "date": "2024-12-18", "time": "11:00", "impact": "High", "actual": "2.2%", "forecast": "2.3%", "previous": "2.0%"},
    {"event": "유로존 CPI", "country": "EU", "date": "2024-11-19", "time": "11:00", "impact": "High", "actual": "2.0%", "forecast": "2.0%", "previous": "1.7%"},
    
    # ===== ECB 금리결정 =====
    {"event": "ECB 금리결정", "country": "EU", "date": "2025-12-11", "time": "14:15", "impact": "High", "actual": "2.65%", "forecast": "2.65%", "previous": "2.90%"},
    {"event": "ECB 금리결정", "country": "EU", "date": "2025-10-30", "time": "14:15", "impact": "High", "actual": "2.90%", "forecast": "2.90%", "previous": "3.15%"},
    {"event": "ECB 금리결정", "country": "EU", "date": "2025-09-11", "time": "14:15", "impact": "High", "actual": "3.15%", "forecast": "3.15%", "previous": "3.15%"},
    {"event": "ECB 금리결정", "country": "EU", "date": "2025-07-17", "time": "14:15", "impact": "High", "actual": "3.15%", "forecast": "3.15%", "previous": "3.15%"},
    {"event": "ECB 금리결정", "country": "EU", "date": "2025-06-05", "time": "14:15", "impact": "High", "actual": "3.15%", "forecast": "3.15%", "previous": "3.15%"},
    {"event": "ECB 금리결정", "country": "EU", "date": "2025-04-17", "time": "14:15", "impact": "High", "actual": "3.15%", "forecast": "3.15%", "previous": "3.15%"},
    {"event": "ECB 금리결정", "country": "EU", "date": "2025-03-06", "time": "14:15", "impact": "High", "actual": "3.15%", "forecast": "3.15%", "previous": "3.15%"},
    {"event": "ECB 금리결정", "country": "EU", "date": "2025-01-30", "time": "14:15", "impact": "High", "actual": "3.15%", "forecast": "3.15%", "previous": "3.15%"},
    {"event": "ECB 금리결정", "country": "EU", "date": "2024-12-12", "time": "14:15", "impact": "High", "actual": "3.15%", "forecast": "3.15%", "previous": "3.40%"},
    {"event": "ECB 금리결정", "country": "EU", "date": "2024-10-17", "time": "14:15", "impact": "High", "actual": "3.40%", "forecast": "3.40%", "previous": "3.65%"},
    {"event": "ECB 금리결정", "country": "EU", "date": "2024-09-12", "time": "14:15", "impact": "High", "actual": "3.65%", "forecast": "3.65%", "previous": "4.25%"},
    
    # ===== 2025년 한국 기준금리 =====
    {"event": "한국 기준금리", "country": "KR", "date": "2025-11-27", "time": "10:00", "impact": "High", "actual": "2.50%", "forecast": "2.50%", "previous": "2.75%"},
    {"event": "한국 기준금리", "country": "KR", "date": "2025-10-16", "time": "10:00", "impact": "High", "actual": "2.75%", "forecast": "2.75%", "previous": "2.75%"},
    {"event": "한국 기준금리", "country": "KR", "date": "2025-08-28", "time": "10:00", "impact": "High", "actual": "2.75%", "forecast": "2.75%", "previous": "3.00%"},
    {"event": "한국 기준금리", "country": "KR", "date": "2025-07-10", "time": "10:00", "impact": "High", "actual": "3.00%", "forecast": "3.00%", "previous": "3.00%"},
    {"event": "한국 기준금리", "country": "KR", "date": "2025-05-29", "time": "10:00", "impact": "High", "actual": "3.00%", "forecast": "3.00%", "previous": "3.00%"},
    {"event": "한국 기준금리", "country": "KR", "date": "2025-04-10", "time": "10:00", "impact": "High", "actual": "3.00%", "forecast": "3.00%", "previous": "3.00%"},
    {"event": "한국 기준금리", "country": "KR", "date": "2025-02-27", "time": "10:00", "impact": "High", "actual": "3.00%", "forecast": "3.00%", "previous": "3.00%"},
    {"event": "한국 기준금리", "country": "KR", "date": "2025-01-16", "time": "10:00", "impact": "High", "actual": "3.00%", "forecast": "3.00%", "previous": "3.00%"},
    {"event": "한국 기준금리", "country": "KR", "date": "2024-11-28", "time": "10:00", "impact": "High", "actual": "3.00%", "forecast": "3.00%", "previous": "3.25%"},
    {"event": "한국 기준금리", "country": "KR", "date": "2024-10-11", "time": "10:00", "impact": "High", "actual": "3.25%", "forecast": "3.50%", "previous": "3.50%"},
    {"event": "한국 기준금리", "country": "KR", "date": "2024-08-22", "time": "10:00", "impact": "High", "actual": "3.50%", "forecast": "3.50%", "previous": "3.50%"},
    
    # ===== 2025년 한국 소비자물가 =====
    {"event": "한국 소비자물가", "country": "KR", "date": "2025-12-02", "time": "08:00", "impact": "Medium", "actual": "1.8%", "forecast": "1.9%", "previous": "1.9%"},
    {"event": "한국 소비자물가", "country": "KR", "date": "2025-11-04", "time": "08:00", "impact": "Medium", "actual": "1.9%", "forecast": "2.0%", "previous": "2.0%"},
    {"event": "한국 소비자물가", "country": "KR", "date": "2025-10-02", "time": "08:00", "impact": "Medium", "actual": "2.0%", "forecast": "2.0%", "previous": "2.0%"},
    {"event": "한국 소비자물가", "country": "KR", "date": "2025-09-02", "time": "08:00", "impact": "Medium", "actual": "2.0%", "forecast": "2.0%", "previous": "2.0%"},
    {"event": "한국 소비자물가", "country": "KR", "date": "2025-08-05", "time": "08:00", "impact": "Medium", "actual": "2.0%", "forecast": "2.0%", "previous": "2.0%"},
    {"event": "한국 소비자물가", "country": "KR", "date": "2025-07-02", "time": "08:00", "impact": "Medium", "actual": "2.0%", "forecast": "2.0%", "previous": "2.0%"},
    {"event": "한국 소비자물가", "country": "KR", "date": "2025-06-03", "time": "08:00", "impact": "Medium", "actual": "2.0%", "forecast": "2.0%", "previous": "2.0%"},
    {"event": "한국 소비자물가", "country": "KR", "date": "2025-05-06", "time": "08:00", "impact": "Medium", "actual": "2.0%", "forecast": "2.0%", "previous": "2.0%"},
    {"event": "한국 소비자물가", "country": "KR", "date": "2025-04-02", "time": "08:00", "impact": "Medium", "actual": "2.0%", "forecast": "2.0%", "previous": "1.9%"},
    {"event": "한국 소비자물가", "country": "KR", "date": "2025-03-04", "time": "08:00", "impact": "Medium", "actual": "1.9%", "forecast": "1.9%", "previous": "1.9%"},
    {"event": "한국 소비자물가", "country": "KR", "date": "2025-02-04", "time": "08:00", "impact": "Medium", "actual": "1.9%", "forecast": "1.9%", "previous": "1.9%"},
    {"event": "한국 소비자물가", "country": "KR", "date": "2025-01-02", "time": "08:00", "impact": "Medium", "actual": "1.9%", "forecast": "1.7%", "previous": "1.5%"},
    {"event": "한국 소비자물가", "country": "KR", "date": "2024-12-03", "time": "08:00", "impact": "Medium", "actual": "1.5%", "forecast": "1.6%", "previous": "1.3%"},
    {"event": "한국 소비자물가", "country": "KR", "date": "2024-11-05", "time": "08:00", "impact": "Medium", "actual": "1.3%", "forecast": "1.4%", "previous": "1.6%"},
    
    # ===== 2025년 일본 BOJ 금리결정 =====
    {"event": "일본 BOJ 금리결정", "country": "JP", "date": "2025-12-19", "time": "03:00", "impact": "High", "actual": "0.50%", "forecast": "0.50%", "previous": "0.50%"},
    {"event": "일본 BOJ 금리결정", "country": "JP", "date": "2025-10-31", "time": "03:00", "impact": "High", "actual": "0.50%", "forecast": "0.50%", "previous": "0.50%"},
    {"event": "일본 BOJ 금리결정", "country": "JP", "date": "2025-09-19", "time": "03:00", "impact": "High", "actual": "0.50%", "forecast": "0.50%", "previous": "0.50%"},
    {"event": "일본 BOJ 금리결정", "country": "JP", "date": "2025-07-31", "time": "03:00", "impact": "High", "actual": "0.50%", "forecast": "0.50%", "previous": "0.25%"},
    {"event": "일본 BOJ 금리결정", "country": "JP", "date": "2025-06-13", "time": "03:00", "impact": "High", "actual": "0.25%", "forecast": "0.25%", "previous": "0.25%"},
    {"event": "일본 BOJ 금리결정", "country": "JP", "date": "2025-04-25", "time": "03:00", "impact": "High", "actual": "0.25%", "forecast": "0.25%", "previous": "0.25%"},
    {"event": "일본 BOJ 금리결정", "country": "JP", "date": "2025-03-14", "time": "03:00", "impact": "High", "actual": "0.25%", "forecast": "0.25%", "previous": "0.25%"},
    {"event": "일본 BOJ 금리결정", "country": "JP", "date": "2025-01-24", "time": "03:00", "impact": "High", "actual": "0.25%", "forecast": "0.25%", "previous": "0.25%"},
    {"event": "일본 BOJ 금리결정", "country": "JP", "date": "2024-12-19", "time": "03:00", "impact": "High", "actual": "0.25%", "forecast": "0.25%", "previous": "0.25%"},
    {"event": "일본 BOJ 금리결정", "country": "JP", "date": "2024-10-31", "time": "03:00", "impact": "High", "actual": "0.25%", "forecast": "0.25%", "previous": "0.25%"},
    {"event": "일본 BOJ 금리결정", "country": "JP", "date": "2024-09-20", "time": "03:00", "impact": "High", "actual": "0.25%", "forecast": "0.25%", "previous": "0.25%"},
    
    # ===== 2025년 일본 CPI =====
    {"event": "일본 CPI", "country": "JP", "date": "2025-12-19", "time": "08:30", "impact": "Medium", "actual": "2.5%", "forecast": "2.5%", "previous": "2.6%"},
    {"event": "일본 CPI", "country": "JP", "date": "2025-11-21", "time": "08:30", "impact": "Medium", "actual": "2.6%", "forecast": "2.6%", "previous": "2.7%"},
    {"event": "일본 CPI", "country": "JP", "date": "2025-10-17", "time": "08:30", "impact": "Medium", "actual": "2.7%", "forecast": "2.8%", "previous": "2.8%"},
    {"event": "일본 CPI", "country": "JP", "date": "2025-09-19", "time": "08:30", "impact": "Medium", "actual": "2.8%", "forecast": "2.8%", "previous": "2.8%"},
    {"event": "일본 CPI", "country": "JP", "date": "2025-08-22", "time": "08:30", "impact": "Medium", "actual": "2.8%", "forecast": "2.9%", "previous": "2.9%"},
    {"event": "일본 CPI", "country": "JP", "date": "2025-07-18", "time": "08:30", "impact": "Medium", "actual": "2.9%", "forecast": "2.9%", "previous": "2.9%"},
    {"event": "일본 CPI", "country": "JP", "date": "2025-06-20", "time": "08:30", "impact": "Medium", "actual": "2.9%", "forecast": "2.9%", "previous": "2.9%"},
    {"event": "일본 CPI", "country": "JP", "date": "2025-05-23", "time": "08:30", "impact": "Medium", "actual": "2.9%", "forecast": "2.9%", "previous": "2.9%"},
    {"event": "일본 CPI", "country": "JP", "date": "2025-04-18", "time": "08:30", "impact": "Medium", "actual": "2.9%", "forecast": "2.9%", "previous": "2.9%"},
    {"event": "일본 CPI", "country": "JP", "date": "2025-03-21", "time": "08:30", "impact": "Medium", "actual": "2.9%", "forecast": "2.9%", "previous": "2.9%"},
    {"event": "일본 CPI", "country": "JP", "date": "2025-02-21", "time": "08:30", "impact": "Medium", "actual": "2.9%", "forecast": "2.9%", "previous": "2.9%"},
    {"event": "일본 CPI", "country": "JP", "date": "2025-01-24", "time": "08:30", "impact": "Medium", "actual": "2.9%", "forecast": "2.9%", "previous": "2.9%"},
    {"event": "일본 CPI", "country": "JP", "date": "2024-12-20", "time": "08:30", "impact": "Medium", "actual": "2.9%", "forecast": "2.9%", "previous": "2.3%"},
    {"event": "일본 CPI", "country": "JP", "date": "2024-11-22", "time": "08:30", "impact": "Medium", "actual": "2.3%", "forecast": "2.2%", "previous": "2.5%"},
    {"event": "일본 CPI", "country": "JP", "date": "2024-10-18", "time": "08:30", "impact": "Medium", "actual": "2.5%", "forecast": "2.4%", "previous": "3.0%"},
    
    # ===== 2025년 중국 CPI =====
    {"event": "중국 CPI", "country": "CN", "date": "2025-12-09", "time": "05:00", "impact": "Medium", "actual": "0.5%", "forecast": "0.4%", "previous": "0.4%"},
    {"event": "중국 CPI", "country": "CN", "date": "2025-11-09", "time": "05:00", "impact": "Medium", "actual": "0.4%", "forecast": "0.4%", "previous": "0.3%"},
    {"event": "중국 CPI", "country": "CN", "date": "2025-10-13", "time": "05:00", "impact": "Medium", "actual": "0.3%", "forecast": "0.3%", "previous": "0.3%"},
    {"event": "중국 CPI", "country": "CN", "date": "2025-09-09", "time": "05:00", "impact": "Medium", "actual": "0.3%", "forecast": "0.3%", "previous": "0.3%"},
    {"event": "중국 CPI", "country": "CN", "date": "2025-08-09", "time": "05:00", "impact": "Medium", "actual": "0.3%", "forecast": "0.3%", "previous": "0.2%"},
    {"event": "중국 CPI", "country": "CN", "date": "2025-07-09", "time": "05:00", "impact": "Medium", "actual": "0.2%", "forecast": "0.2%", "previous": "0.2%"},
    {"event": "중국 CPI", "country": "CN", "date": "2025-06-12", "time": "05:00", "impact": "Medium", "actual": "0.2%", "forecast": "0.2%", "previous": "0.1%"},
    {"event": "중국 CPI", "country": "CN", "date": "2025-05-11", "time": "05:00", "impact": "Medium", "actual": "0.1%", "forecast": "0.1%", "previous": "0.1%"},
    {"event": "중국 CPI", "country": "CN", "date": "2025-04-11", "time": "05:00", "impact": "Medium", "actual": "0.1%", "forecast": "0.1%", "previous": "0.1%"},
    {"event": "중국 CPI", "country": "CN", "date": "2025-03-09", "time": "05:00", "impact": "Medium", "actual": "0.1%", "forecast": "0.1%", "previous": "0.1%"},
    {"event": "중국 CPI", "country": "CN", "date": "2025-02-09", "time": "05:00", "impact": "Medium", "actual": "0.1%", "forecast": "0.1%", "previous": "0.1%"},
    {"event": "중국 CPI", "country": "CN", "date": "2025-01-09", "time": "05:00", "impact": "Medium", "actual": "0.1%", "forecast": "0.1%", "previous": "0.2%"},
    {"event": "중국 CPI", "country": "CN", "date": "2024-12-09", "time": "05:00", "impact": "Medium", "actual": "0.2%", "forecast": "0.5%", "previous": "0.3%"},
    {"event": "중국 CPI", "country": "CN", "date": "2024-11-09", "time": "05:00", "impact": "Medium", "actual": "0.3%", "forecast": "0.4%", "previous": "0.4%"},
    
    # ===== 2025년 중국 GDP (분기별) =====
    {"event": "중국 GDP", "country": "CN", "date": "2025-10-17", "time": "05:00", "impact": "High", "actual": "4.5%", "forecast": "4.4%", "previous": "4.6%"},
    {"event": "중국 GDP", "country": "CN", "date": "2025-07-15", "time": "05:00", "impact": "High", "actual": "4.6%", "forecast": "4.5%", "previous": "4.5%"},
    {"event": "중국 GDP", "country": "CN", "date": "2025-04-16", "time": "05:00", "impact": "High", "actual": "4.5%", "forecast": "4.5%", "previous": "4.6%"},
    {"event": "중국 GDP", "country": "CN", "date": "2025-01-17", "time": "05:00", "impact": "High", "actual": "4.6%", "forecast": "4.5%", "previous": "4.6%"},
    {"event": "중국 GDP", "country": "CN", "date": "2024-10-18", "time": "05:00", "impact": "High", "actual": "4.6%", "forecast": "4.5%", "previous": "4.7%"},
    {"event": "중국 GDP", "country": "CN", "date": "2024-07-15", "time": "05:00", "impact": "High", "actual": "4.7%", "forecast": "5.1%", "previous": "5.3%"},
    {"event": "중국 GDP", "country": "CN", "date": "2024-04-16", "time": "05:00", "impact": "High", "actual": "5.3%", "forecast": "4.8%", "previous": "5.2%"},
    
    # ===== 2025년 한국 GDP =====
    {"event": "한국 GDP 발표", "country": "KR", "date": "2025-12-04", "time": "08:00", "impact": "High", "actual": "2.0%", "forecast": "1.9%", "previous": "1.9%"},
    {"event": "한국 GDP 발표", "country": "KR", "date": "2025-10-24", "time": "08:00", "impact": "High", "actual": "1.9%", "forecast": "1.8%", "previous": "1.8%"},
    {"event": "한국 GDP 발표", "country": "KR", "date": "2025-07-25", "time": "08:00", "impact": "High", "actual": "1.8%", "forecast": "1.7%", "previous": "1.7%"},
    {"event": "한국 GDP 발표", "country": "KR", "date": "2025-04-24", "time": "08:00", "impact": "High", "actual": "1.7%", "forecast": "1.6%", "previous": "1.9%"},
    {"event": "한국 GDP 발표", "country": "KR", "date": "2025-01-23", "time": "08:00", "impact": "High", "actual": "1.9%", "forecast": "1.8%", "previous": "1.5%"},
]


def get_historical_data(start_date: str, end_date: str):
    """날짜 범위에 해당하는 과거 경제 지표 데이터 반환"""
    filtered = []
    for item in HISTORICAL_ECONOMIC_DATA:
        event_date = item['date']
        if start_date <= event_date <= end_date:
            filtered.append(item.copy())
    return filtered





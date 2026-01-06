"""
Web Scraping Services
"""
from app.services.scraper.fomc_scraper import FOMCScraper
from app.services.scraper.fed_speech_scraper import FedSpeechScraper
from app.services.scraper.investing_calendar_scraper import InvestingCalendarScraper
from app.services.scraper.economic_calendar_scraper import EconomicCalendarScraper

__all__ = ["FOMCScraper", "FedSpeechScraper", "InvestingCalendarScraper", "EconomicCalendarScraper"]

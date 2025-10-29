"""
PrimeLeague Team Scraper
Extracts team information and confirmed players from PrimeLeague team pages
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from bs4 import BeautifulSoup
from typing import Dict, List, Optional
import time


class PrimeLeagueScraper:
    def __init__(self, headless=True):
        """Initialize Selenium WebDriver"""
        chrome_options = Options()
        if headless:
            chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')

        self.driver = webdriver.Chrome(options=chrome_options)

    def scrape_team(self, url: str) -> Optional[Dict]:
        """
        Scrape PrimeLeague team page and extract:
        - Team Name
        - Team Tag
        - Team Logo/Image
        - Confirmed Players (Name and Tag)

        Args:
            url: PrimeLeague team URL

        Returns:
            Dictionary with team info and players list, or None on error
        """
        try:
            print(f"Loading page: {url}")
            self.driver.get(url)

            # Wait for page to load
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_all_elements_located((By.TAG_NAME, "body"))
            )

            # Wait for dynamic content
            time.sleep(3)

            # Get page source
            page_source = self.driver.page_source
            soup = BeautifulSoup(page_source, 'html.parser')

            # Extract team information
            team_info = self._extract_team_info(soup)

            # Extract players
            players = self._extract_players(soup)

            return {
                'team': team_info,
                'players': players
            }
        except Exception as e:
            print(f"Error scraping: {e}")
            return None
        finally:
            self.driver.quit()

    def _extract_team_info(self, soup: BeautifulSoup) -> Dict:
        """Extract Team Name, Tag and Logo"""

        team_data = {
            'name': None,
            'tag': None,
            'image_url': None
        }

        # Team Name from quick-info
        quick_info = soup.find('ul', class_='quick-info')
        if quick_info:
            for li in quick_info.find_all('li'):
                label = li.find('div', class_='qi-label')
                if label and 'Team:' in label.get_text():
                    value = li.find('div', class_='qi-value')
                    if value:
                        team_name_elem = value.find('a')
                        if team_name_elem:
                            team_data['name'] = team_name_elem.get_text(strip=True)

        # Team Logo/Image
        content_portrait = soup.find('div', class_='content-portrait-head')
        if content_portrait:
            img_container = content_portrait.find('div', class_='img-front')
            if img_container:
                img = img_container.find('img')
                if img:
                    src = img.get('src')
                    if src:
                        team_data['image_url'] = src

        # Team Tag from breadcrumbs (last element)
        breadcrumbs = soup.find('ul', class_='breadcrumbs')
        if breadcrumbs:
            items = breadcrumbs.find_all('li', class_='breadcrumbs-item')
            if len(items) > 0:
                last_item = items[-1]
                div = last_item.find('div')
                if div:
                    span = div.find('span')
                    if span:
                        team_data['tag'] = span.get_text(strip=True)

        return team_data

    def _extract_players(self, soup: BeautifulSoup) -> List[Dict]:
        """Extract only confirmed players with Name and Tag"""

        players = []

        # Find player grid
        player_grid = soup.find('ul', class_='content-portrait-grid-l')

        if not player_grid:
            print("Warning: Player grid not found")
            return players

        # Find all player items
        player_items = player_grid.find_all('li')

        for item in player_items:
            # Check for "Bestätigter Spieler" status
            status_elem = item.find('span', class_='txt-status-positive')

            if not status_elem:
                continue

            status_text = status_elem.get_text(strip=True).lower()
            if 'bestätigter spieler' not in status_text:
                continue

            # Extract player name and tag
            gameaccount_elem = item.find('span', class_='gameaccount-name')

            if gameaccount_elem:
                full_identifier = gameaccount_elem.get_text(strip=True)

                # Parse Name and Tag
                player_info = self._parse_player_identifier(full_identifier)

                if player_info:
                    players.append(player_info)

        return players

    def _parse_player_identifier(self, text: str) -> Optional[Dict]:
        """
        Parse player identifier in format: Name#Tag or Name Tag
        """
        text = text.strip()

        if '#' in text:
            # Format: Name#Tag
            parts = text.split('#')
            if len(parts) == 2:
                return {
                    'name': parts[0].strip(),
                    'tag': parts[1].strip(),
                    'full_identifier': text.strip()
                }
        elif ' ' in text:
            # Format: Name Tag
            parts = text.split()
            if len(parts) >= 2:
                # Last part is probably the tag
                name = ' '.join(parts[:-1])
                tag = parts[-1]
                return {
                    'name': name,
                    'tag': tag,
                    'full_identifier': f"{name}#{tag}"
                }
        else:
            # Only name present
            return {
                'name': text,
                'tag': None,
                'full_identifier': text
            }

        return None


def scrape_primeleague_team(url: str) -> Optional[Dict]:
    """
    Helper function to scrape a PrimeLeague team

    Args:
        url: PrimeLeague team URL

    Returns:
        Dictionary with team and players data, or None on error
    """
    scraper = PrimeLeagueScraper(headless=True)
    return scraper.scrape_team(url)

"""
Riot Games API Client with rate limiting
"""
import requests
import time
from collections import deque
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from flask import current_app


class RateLimiter:
    """
    Rate limiter for Riot API
    Implements token bucket algorithm
    """

    def __init__(self, requests_per_second: int, requests_per_two_minutes: int):
        self.requests_per_second = requests_per_second
        self.requests_per_two_minutes = requests_per_two_minutes

        # Token buckets
        self.short_term_requests = deque()  # Last second
        self.long_term_requests = deque()  # Last 2 minutes

    def wait_if_needed(self):
        """Wait if rate limit would be exceeded"""
        now = time.time()

        # Clean old requests from short-term bucket (1 second window)
        while self.short_term_requests and self.short_term_requests[0] < now - 1:
            self.short_term_requests.popleft()

        # Clean old requests from long-term bucket (2 minutes window)
        while self.long_term_requests and self.long_term_requests[0] < now - 120:
            self.long_term_requests.popleft()

        # Check if we need to wait
        if len(self.short_term_requests) >= self.requests_per_second:
            # Wait until oldest request in short-term bucket is > 1 second old
            wait_time = 1 - (now - self.short_term_requests[0])
            if wait_time > 0:
                current_app.logger.debug(f'Rate limit: waiting {wait_time:.2f}s (short-term)')
                time.sleep(wait_time)
                return self.wait_if_needed()  # Re-check after waiting

        if len(self.long_term_requests) >= self.requests_per_two_minutes:
            # Wait until oldest request in long-term bucket is > 2 minutes old
            wait_time = 120 - (now - self.long_term_requests[0])
            if wait_time > 0:
                current_app.logger.warning(f'Rate limit: waiting {wait_time:.2f}s (long-term)')
                time.sleep(wait_time)
                return self.wait_if_needed()  # Re-check after waiting

        # Record this request
        now = time.time()
        self.short_term_requests.append(now)
        self.long_term_requests.append(now)


class RiotAPIClient:
    """
    Riot Games API Client
    Handles all API requests with rate limiting
    """

    def __init__(self, api_key: Optional[str] = None, region: Optional[str] = None,
                 platform: Optional[str] = None):
        """
        Initialize Riot API Client

        Args:
            api_key: Riot API key (defaults to app config)
            region: Region for routing (e.g., 'europe')
            platform: Platform for endpoints (e.g., 'euw1')
        """
        self.api_key = api_key or current_app.config['RIOT_API_KEY']
        self.region = region or current_app.config['RIOT_REGION']
        self.platform = platform or current_app.config['RIOT_PLATFORM']

        if not self.api_key:
            raise ValueError('Riot API key not configured')

        # Rate limiter
        self.rate_limiter = RateLimiter(
            current_app.config['RIOT_RATE_LIMIT_PER_SECOND'],
            current_app.config['RIOT_RATE_LIMIT_PER_TWO_MINUTES']
        )

        # Base URLs
        self.platform_url = f'https://{self.platform}.api.riotgames.com'
        self.region_url = f'https://{self.region}.api.riotgames.com'

        # Session for connection pooling
        self.session = requests.Session()
        self.session.headers.update({'X-Riot-Token': self.api_key})

    def _make_request(self, url: str, params: Optional[Dict] = None,
                      max_retries: int = 3) -> Optional[Dict[str, Any]]:
        """
        Make API request with rate limiting and retries

        Args:
            url: Full URL to request
            params: Query parameters
            max_retries: Maximum number of retries on failure

        Returns:
            JSON response or None on failure
        """
        for attempt in range(max_retries):
            try:
                # Wait if rate limit would be exceeded
                self.rate_limiter.wait_if_needed()

                # Make request
                response = self.session.get(url, params=params, timeout=10)
                print(url)

                # Handle response
                if response.status_code == 200:
                    return response.json()

                elif response.status_code == 429:
                    # Rate limit exceeded (shouldn't happen with our rate limiter, but handle anyway)
                    retry_after = int(response.headers.get('Retry-After', 1))
                    current_app.logger.warning(f'Rate limit hit (429), waiting {retry_after}s')
                    time.sleep(retry_after)
                    continue

                elif response.status_code == 404:
                    # Not found
                    current_app.logger.debug(f'Resource not found (404): {url}')
                    return None

                elif response.status_code >= 500:
                    # Server error, retry
                    current_app.logger.warning(f'Server error ({response.status_code}), retrying...')
                    time.sleep(2 ** attempt)  # Exponential backoff
                    continue

                else:
                    # Other error
                    current_app.logger.error(f'API error {response.status_code}: {response.text}')
                    return None

            except requests.exceptions.Timeout:
                current_app.logger.warning(f'Request timeout, retrying... (attempt {attempt + 1}/{max_retries})')
                time.sleep(2 ** attempt)
                continue

            except requests.exceptions.RequestException as e:
                current_app.logger.error(f'Request failed: {e}')
                if attempt == max_retries - 1:
                    return None
                time.sleep(2 ** attempt)
                continue

        return None

    # ============================================================
    # ACCOUNT API (v1) - Preferred for Riot ID lookup
    # ============================================================

    def get_account_by_riot_id(self, game_name: str, tag_line: str) -> Optional[Dict[str, Any]]:
        """
        Get account by Riot ID (gameName#tagLine)

        Args:
            game_name: Game name (before the #)
            tag_line: Tag line (after the #, e.g., EUW)

        Returns:
            Account data with PUUID or None
        """
        url = f'{self.region_url}/riot/account/v1/accounts/by-riot-id/{game_name}/{tag_line}'
        return self._make_request(url)

    # ============================================================
    # SUMMONER API
    # ============================================================

    def get_summoner_by_name(self, summoner_name: str) -> Optional[Dict[str, Any]]:
        """
        Get summoner by name (DEPRECATED - use get_account_by_riot_id instead)

        Args:
            summoner_name: Summoner name

        Returns:
            Summoner data or None
        """
        current_app.logger.warning('Using deprecated get_summoner_by_name endpoint')
        url = f'{self.platform_url}/lol/summoner/v4/summoners/by-name/{summoner_name}'
        return self._make_request(url)

    def get_summoner_by_puuid(self, puuid: str) -> Optional[Dict[str, Any]]:
        """
        Get summoner by PUUID

        Args:
            puuid: Player UUID

        Returns:
            Summoner data or None
        """
        url = f'{self.platform_url}/lol/summoner/v4/summoners/by-puuid/{puuid}'
        return self._make_request(url)

    # ============================================================
    # MATCH API
    # ============================================================

    def get_match_history(self, puuid: str, start: int = 0, count: int = 20,
                          queue: Optional[int] = None, match_type: Optional[str] = None) -> Optional[List[str]]:
        """
        Get match history (match IDs)

        Args:
            puuid: Player UUID
            start: Start index
            count: Number of matches (max 100)
            queue: Queue ID filter (e.g., 420 for ranked solo, 440 for flex)
            match_type: Match type filter (e.g., 'ranked', 'normal', 'tourney', 'tutorial')
                        Note: Custom games don't have a queue, use type filter instead

        Returns:
            List of match IDs or None
        """
        url = f'{self.region_url}/lol/match/v5/matches/by-puuid/{puuid}/ids'
        params = {'start': start, 'count': min(count, 100)}
        if queue is not None:
            params['queue'] = queue
        if match_type is not None:
            params['type'] = match_type

        return self._make_request(url, params)

    def get_match(self, match_id: str) -> Optional[Dict[str, Any]]:
        """
        Get match details

        Args:
            match_id: Match ID (e.g., 'EUW1_6543210987')

        Returns:
            Match data or None
        """
        url = f'{self.region_url}/lol/match/v5/matches/{match_id}'
        return self._make_request(url)

    def get_match_timeline(self, match_id: str) -> Optional[Dict[str, Any]]:
        """
        Get match timeline (expensive!)

        Args:
            match_id: Match ID

        Returns:
            Timeline data or None
        """
        url = f'{self.region_url}/lol/match/v5/matches/{match_id}/timeline'
        current_app.logger.info(f'Fetching timeline for {match_id} (expensive API call)')
        return self._make_request(url)

    # ============================================================
    # CHAMPION MASTERY API
    # ============================================================

    def get_champion_mastery(self, summoner_id: str) -> Optional[List[Dict[str, Any]]]:
        """
        Get all champion masteries for a summoner

        Args:
            summoner_id: Summoner ID (encrypted)

        Returns:
            List of champion mastery data or None
        """
        url = f'{self.platform_url}/lol/champion-mastery/v4/champion-masteries/by-summoner/{summoner_id}'
        return self._make_request(url)

    def get_champion_mastery_by_champion(self, summoner_id: str,
                                         champion_id: int) -> Optional[Dict[str, Any]]:
        """
        Get champion mastery for specific champion

        Args:
            summoner_id: Summoner ID
            champion_id: Champion ID

        Returns:
            Champion mastery data or None
        """
        url = f'{self.platform_url}/lol/champion-mastery/v4/champion-masteries/by-summoner/{summoner_id}/by-champion/{champion_id}'
        return self._make_request(url)

    # ============================================================
    # LEAGUE API
    # ============================================================

    def get_league_entries(self, summoner_id: str) -> Optional[List[Dict[str, Any]]]:
        """
        Get ranked league entries for a summoner

        Args:
            summoner_id: Summoner ID

        Returns:
            List of league entries or None
        """
        url = f'{self.platform_url}/lol/league/v4/entries/by-summoner/{summoner_id}'
        return self._make_request(url)

    def get_league_entries_by_puuid(self, puuid: str) -> Optional[List[Dict[str, Any]]]:
        """
        Get ranked league entries for a summoner by PUUID

        This is an undocumented but working endpoint that allows fetching
        ranked data using PUUID instead of summoner_id.

        Args:
            puuid: Player UUID

        Returns:
            List of league entries or None
        """
        url = f'{self.platform_url}/lol/league/v4/entries/by-puuid/{puuid}'
        return self._make_request(url)

    # ============================================================
    # HELPER METHODS
    # ============================================================

    def is_tournament_game(self, match_data: Dict[str, Any]) -> bool:
        """
        Check if match is a tournament game

        Since we fetch matches using type=tourney filter,
        all matches returned are tournament games by definition.
        We just need basic validation.

        Args:
            match_data: Match data from Riot API

        Returns:
            True if tournament game (always true for type=tourney matches)
        """
        info = match_data.get('info', {})

        # Basic validation: must have participants and reasonable duration
        participants = info.get('participants', [])
        if not participants:
            return False

        # Filter out very short games (remakes, crashes, etc.)
        if info.get('gameDuration', 0) < 300:  # Less than 5 minutes
            return False

        # If fetched via type=tourney, it's a tournament game
        return True

    def close(self):
        """Close the session"""
        self.session.close()

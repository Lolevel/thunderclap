"""
Redis Cache Service for performance optimization

Provides intelligent caching for expensive database queries and API calls.
Handles cache invalidation when data changes.
"""

import redis
import json
import os
from functools import wraps
from flask import current_app
from typing import Optional, Any, Callable
import hashlib


class CacheService:
    """Redis-based caching service"""

    def __init__(self):
        """Initialize Redis connection"""
        redis_url = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
        cache_enabled = os.environ.get('CACHE_ENABLED', 'true').lower() == 'true'

        self.enabled = cache_enabled

        if self.enabled:
            try:
                self.redis_client = redis.from_url(redis_url, decode_responses=True)
                # Test connection
                self.redis_client.ping()
                current_app.logger.info(f"Redis cache initialized: {redis_url}")
            except Exception as e:
                current_app.logger.error(f"Failed to connect to Redis: {e}")
                self.enabled = False
                self.redis_client = None
        else:
            current_app.logger.info("Cache is disabled")
            self.redis_client = None

    def _make_key(self, prefix: str, *args, **kwargs) -> str:
        """
        Generate cache key from prefix and arguments

        Args:
            prefix: Key prefix (e.g., 'team_overview')
            *args: Positional arguments to include in key
            **kwargs: Keyword arguments to include in key

        Returns:
            Cache key string
        """
        # Combine all arguments into a deterministic string
        key_parts = [str(arg) for arg in args]

        # Sort kwargs for consistency
        for k in sorted(kwargs.keys()):
            key_parts.append(f"{k}={kwargs[k]}")

        key_suffix = "_".join(key_parts) if key_parts else "default"

        # Hash long keys to keep them manageable
        if len(key_suffix) > 100:
            key_suffix = hashlib.md5(key_suffix.encode()).hexdigest()

        return f"{prefix}:{key_suffix}"

    def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache

        Args:
            key: Cache key

        Returns:
            Cached value or None if not found/expired
        """
        if not self.enabled or not self.redis_client:
            return None

        try:
            value = self.redis_client.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            current_app.logger.warning(f"Cache get failed for {key}: {e}")
            return None

    def set(self, key: str, value: Any, ttl: int = 1800) -> bool:
        """
        Set value in cache with TTL

        Args:
            key: Cache key
            value: Value to cache (must be JSON-serializable)
            ttl: Time-to-live in seconds (default: 30 minutes)

        Returns:
            True if successful, False otherwise
        """
        if not self.enabled or not self.redis_client:
            return False

        try:
            serialized = json.dumps(value)
            self.redis_client.setex(key, ttl, serialized)
            return True
        except Exception as e:
            current_app.logger.warning(f"Cache set failed for {key}: {e}")
            return False

    def delete(self, key: str) -> bool:
        """
        Delete value from cache

        Args:
            key: Cache key

        Returns:
            True if successful, False otherwise
        """
        if not self.enabled or not self.redis_client:
            return False

        try:
            self.redis_client.delete(key)
            return True
        except Exception as e:
            current_app.logger.warning(f"Cache delete failed for {key}: {e}")
            return False

    def delete_pattern(self, pattern: str) -> int:
        """
        Delete all keys matching a pattern

        Args:
            pattern: Redis key pattern (e.g., 'team_*')

        Returns:
            Number of keys deleted
        """
        if not self.enabled or not self.redis_client:
            return 0

        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                return self.redis_client.delete(*keys)
            return 0
        except Exception as e:
            current_app.logger.warning(f"Cache delete pattern failed for {pattern}: {e}")
            return 0

    def invalidate_team(self, team_id: str):
        """
        Invalidate all cache entries for a team

        Args:
            team_id: Team UUID
        """
        patterns = [
            f"team_overview:{team_id}*",
            f"team_roster:{team_id}*",
            f"team_stats:{team_id}*",
            f"team_champions:{team_id}*",
            f"team_draft:{team_id}*",
            f"team_matches:{team_id}*",
            f"team_full_data:{team_id}*",
            f"scouting_report:{team_id}*",
        ]

        deleted = 0
        for pattern in patterns:
            deleted += self.delete_pattern(pattern)

        if deleted > 0:
            current_app.logger.info(f"Invalidated {deleted} cache entries for team {team_id}")

    def invalidate_player(self, player_id: str):
        """
        Invalidate all cache entries for a player

        Args:
            player_id: Player UUID
        """
        patterns = [
            f"player_champions:{player_id}*",
            f"player_matches:{player_id}*",
            f"player_stats:{player_id}*",
        ]

        deleted = 0
        for pattern in patterns:
            deleted += self.delete_pattern(pattern)

        if deleted > 0:
            current_app.logger.info(f"Invalidated {deleted} cache entries for player {player_id}")


def cached(prefix: str, ttl: int = 1800):
    """
    Decorator for caching function results

    Usage:
        @cached('team_overview', ttl=1800)
        def get_team_overview(team_id):
            # Expensive computation
            return result

    Args:
        prefix: Cache key prefix
        ttl: Time-to-live in seconds (default: 30 minutes)
    """
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Initialize cache service
            cache = CacheService()

            # Generate cache key from function arguments
            cache_key = cache._make_key(prefix, *args, **kwargs)

            # Try to get from cache
            cached_value = cache.get(cache_key)
            if cached_value is not None:
                current_app.logger.debug(f"Cache HIT: {cache_key}")
                return cached_value

            # Cache miss - execute function
            current_app.logger.debug(f"Cache MISS: {cache_key}")
            result = func(*args, **kwargs)

            # Store in cache
            cache.set(cache_key, result, ttl)

            return result

        return wrapper
    return decorator


# Global cache instance (initialized per request)
_cache_instance = None


def get_cache() -> CacheService:
    """
    Get or create cache service instance

    Returns:
        CacheService instance
    """
    global _cache_instance
    if _cache_instance is None:
        _cache_instance = CacheService()
    return _cache_instance

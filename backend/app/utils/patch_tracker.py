"""
Patch Version Tracker
Tracks the current/latest League of Legends patch version from match data
"""

from app import db
from app.models.match import Match
from typing import Optional
import re


def get_latest_patch_from_matches() -> Optional[str]:
    """
    Get the latest patch version from stored matches

    Returns:
        Patch version string (e.g., "14.24") or None
    """
    # Get most recent match
    latest_match = Match.query.order_by(Match.game_creation.desc()).first()

    if not latest_match or not latest_match.game_version:
        return None

    # Extract major.minor from game_version
    # game_version format: "14.24.123.4567" -> extract "14.24"
    match = re.match(r'(\d+)\.(\d+)', latest_match.game_version)
    if match:
        return f"{match.group(1)}.{match.group(2)}"

    return None


def get_current_patch() -> str:
    """
    Get current patch version with fallback

    Priority:
    1. Latest patch from matches
    2. Fallback to "latest" (for Community Dragon CDN)

    Returns:
        Patch version string
    """
    patch = get_latest_patch_from_matches()
    return patch if patch else "latest"


def update_patch_from_match(game_version: str) -> None:
    """
    Called when importing new matches to track patch updates

    This is a placeholder for future implementation where we might
    want to store patch info in a separate table or cache

    Args:
        game_version: Full game version from Riot API
    """
    # For now, we just rely on get_latest_patch_from_matches()
    # In the future, we could store this in Redis or a settings table
    pass


def format_patch_for_cdragon(patch: Optional[str] = None) -> str:
    """
    Format patch version for Community Dragon CDN URLs

    Args:
        patch: Patch version (e.g., "14.24") or None for auto-detect

    Returns:
        Formatted patch string for CDN (e.g., "14.24.1" or "latest")
    """
    if not patch:
        patch = get_current_patch()

    if patch == "latest":
        return "latest"

    # Community Dragon expects format like "14.24.1"
    # If we only have "14.24", append ".1"
    if re.match(r'^\d+\.\d+$', patch):
        return f"{patch}.1"

    return patch

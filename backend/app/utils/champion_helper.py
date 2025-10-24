"""
Champion Helper Functions
Enriches champion data with names and images from database
"""

from typing import Dict, Optional
from app.models.champion import Champion
from app.utils.patch_tracker import get_current_patch


def enrich_champion_data(champion_id: int, include_images: bool = True) -> Dict:
    """
    Enrich champion ID with name and images from database

    Args:
        champion_id: Champion ID
        include_images: Whether to include image URLs

    Returns:
        {
            'id': int,
            'name': str,
            'key': str,
            'icon_url': str (if include_images),
            'splash_url': str (if include_images),
            'loading_url': str (if include_images)
        }
    """
    champion = Champion.query.filter_by(id=champion_id).first()

    if not champion:
        # Fallback if champion not found
        result = {
            'id': champion_id,
            'name': f'Champion {champion_id}',
            'key': f'Champion{champion_id}'
        }
    else:
        result = {
            'id': champion.id,
            'name': champion.name,
            'key': champion.key
        }

        if include_images:
            # Use latest version for all assets
            result['icon_url'] = get_champion_icon_url(champion_id, "latest")
            result['splash_url'] = get_champion_splash_url(champion_id, "latest")
            result['loading_url'] = get_champion_loading_url(champion_id, "latest")

    return result


def get_champion_icon_url(champion_id: int, patch: Optional[str] = None) -> str:
    """
    Get champion icon URL for specific patch

    Args:
        champion_id: Champion ID
        patch: Patch version (e.g., "14.24") or None for latest

    Returns:
        CDN URL for champion icon
    """
    if not patch:
        patch = "latest"  # Always use latest to avoid outdated assets

    return f"https://raw.communitydragon.org/{patch}/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/{champion_id}.png"


def get_champion_splash_url(champion_id: int, patch: Optional[str] = None, skin_id: int = 0) -> str:
    """
    Get champion splash art URL for specific patch

    Args:
        champion_id: Champion ID
        patch: Patch version or None for latest
        skin_id: Skin ID (0 = default)

    Returns:
        CDN URL for splash art
    """
    if not patch:
        patch = "latest"  # Always use latest to avoid outdated assets

    return f"https://raw.communitydragon.org/{patch}/plugins/rcp-be-lol-game-data/global/default/v1/champion-splashes/{champion_id}/{champion_id}{skin_id:03d}.jpg"


def get_champion_loading_url(champion_id: int, patch: Optional[str] = None, skin_id: int = 0) -> str:
    """
    Get champion loading screen URL for specific patch

    Args:
        champion_id: Champion ID
        patch: Patch version or None for latest
        skin_id: Skin ID (0 = default)

    Returns:
        CDN URL for loading screen
    """
    if not patch:
        patch = "latest"  # Always use latest to avoid outdated assets

    return f"https://raw.communitydragon.org/{patch}/plugins/rcp-be-lol-game-data/global/default/v1/champion-splashes/{champion_id}/{champion_id}{skin_id:03d}.jpg"


def batch_enrich_champions(champion_ids: list, include_images: bool = True) -> Dict[int, Dict]:
    """
    Enrich multiple champions at once (efficient batch query)

    Args:
        champion_ids: List of champion IDs
        include_images: Whether to include image URLs

    Returns:
        Dictionary mapping champion_id -> enriched data
    """
    # Query all champions in one go
    champions = Champion.query.filter(Champion.id.in_(champion_ids)).all()
    champion_map = {c.id: c for c in champions}

    result = {}
    patch = "latest" if include_images else None

    for champ_id in champion_ids:
        champion = champion_map.get(champ_id)

        if not champion:
            result[champ_id] = {
                'id': champ_id,
                'name': f'Champion {champ_id}',
                'key': f'Champion{champ_id}'
            }
        else:
            result[champ_id] = {
                'id': champion.id,
                'name': champion.name,
                'key': champion.key
            }

            if include_images:
                result[champ_id]['icon_url'] = get_champion_icon_url(champ_id, patch)
                result[champ_id]['splash_url'] = get_champion_splash_url(champ_id, patch)
                result[champ_id]['loading_url'] = get_champion_loading_url(champ_id, patch)

    return result

"""
Community Dragon API Integration
Fetches champion data from Community Dragon (Raw CDN)
Uses Wukong instead of MonkeyKing (corrects Riot's naming)
"""

import requests
import logging
from typing import Dict, List, Optional
from app import db
from app.models.champion import Champion

logger = logging.getLogger(__name__)

# Community Dragon CDN Base URLs
CDRAGON_BASE = "https://raw.communitydragon.org"
LATEST_VERSION = "latest"  # Always use latest patch


def get_champion_icon_url(champion_id: int) -> str:
    """
    Get champion square icon URL from Community Dragon

    Args:
        champion_id: Champion ID (e.g., 157)

    Returns:
        CDN URL for champion icon
    """
    return f"{CDRAGON_BASE}/{LATEST_VERSION}/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/{champion_id}.png"


def get_champion_splash_url(champion_id: int, skin_id: int = 0) -> str:
    """
    Get champion splash art URL from Community Dragon

    Args:
        champion_id: Champion ID
        skin_id: Skin ID (0 = default)

    Returns:
        CDN URL for splash art
    """
    return f"{CDRAGON_BASE}/{LATEST_VERSION}/plugins/rcp-be-lol-game-data/global/default/v1/champion-splashes/{champion_id}/{champion_id}{skin_id:03d}.jpg"


def get_champion_loading_url(champion_id: int, skin_id: int = 0) -> str:
    """
    Get champion loading screen URL from Community Dragon

    Args:
        champion_id: Champion ID
        skin_id: Skin ID (0 = default)

    Returns:
        CDN URL for loading screen
    """
    return f"{CDRAGON_BASE}/{LATEST_VERSION}/plugins/rcp-be-lol-game-data/global/default/v1/champion-splashes/{champion_id}/{champion_id}{skin_id:03d}.jpg"


def fetch_champion_summary() -> List[Dict]:
    """
    Fetch champion summary data from Community Dragon

    Returns:
        List of champion dictionaries with basic info

    Example response:
        [
            {
                "id": 157,
                "name": "Yasuo",
                "alias": "Yasuo",
                "title": "the Unforgiven",
                "roles": ["Fighter", "Assassin"]
            },
            ...
        ]
    """
    url = f"{CDRAGON_BASE}/{LATEST_VERSION}/plugins/rcp-be-lol-game-data/global/default/v1/champion-summary.json"

    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        logger.error(f"Failed to fetch champion summary from Community Dragon: {e}")
        return []


def sync_champions_from_community_dragon() -> Dict:
    """
    Sync all champions from Community Dragon to database

    Returns:
        {
            'total': int,
            'created': int,
            'updated': int,
            'errors': List[str]
        }
    """
    logger.info("Starting champion sync from Community Dragon")

    champion_data = fetch_champion_summary()

    if not champion_data:
        return {
            'total': 0,
            'created': 0,
            'updated': 0,
            'errors': ['Failed to fetch champion data']
        }

    stats = {
        'total': len(champion_data),
        'created': 0,
        'updated': 0,
        'errors': []
    }

    for champ_data in champion_data:
        try:
            champ_id = champ_data.get('id')
            champ_key = champ_data.get('alias')  # "alias" is the champion key
            champ_name = champ_data.get('name')

            if not champ_id or not champ_key or not champ_name:
                stats['errors'].append(f"Missing data for champion: {champ_data}")
                continue

            # Fix MonkeyKing -> Wukong
            if champ_key == 'MonkeyKing':
                champ_key = 'Wukong'
            if champ_name == 'MonkeyKing':
                champ_name = 'Wukong'

            # Check if champion exists
            champion = Champion.query.filter_by(id=champ_id).first()

            if champion:
                # Update existing
                champion.key = champ_key
                champion.name = champ_name
                champion.title = champ_data.get('title', '')
                champion.roles = champ_data.get('roles', [])
                champion.icon_url = get_champion_icon_url(champ_id)
                champion.splash_url = get_champion_splash_url(champ_id)
                champion.loading_url = get_champion_loading_url(champ_id)
                stats['updated'] += 1
            else:
                # Create new
                champion = Champion(
                    id=champ_id,
                    key=champ_key,
                    name=champ_name,
                    title=champ_data.get('title', ''),
                    roles=champ_data.get('roles', []),
                    icon_url=get_champion_icon_url(champ_id),
                    splash_url=get_champion_splash_url(champ_id),
                    loading_url=get_champion_loading_url(champ_id),
                    patch_version=LATEST_VERSION
                )
                db.session.add(champion)
                stats['created'] += 1

            # Commit in batches of 20
            if (stats['created'] + stats['updated']) % 20 == 0:
                db.session.commit()

        except Exception as e:
            logger.error(f"Error processing champion {champ_data.get('name', 'unknown')}: {e}")
            stats['errors'].append(f"Error: {champ_data.get('name')}: {str(e)}")

    # Final commit
    try:
        db.session.commit()
        logger.info(f"Champion sync complete: {stats['created']} created, {stats['updated']} updated")
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to commit champion sync: {e}")
        stats['errors'].append(f"Commit failed: {str(e)}")

    return stats


def get_champion_by_id(champion_id: int) -> Optional[Champion]:
    """
    Get champion from database by ID

    Args:
        champion_id: Champion ID

    Returns:
        Champion object or None
    """
    return Champion.query.filter_by(id=champion_id).first()


def get_champion_by_key(champion_key: str) -> Optional[Champion]:
    """
    Get champion from database by key

    Args:
        champion_key: Champion key (e.g., "Yasuo")

    Returns:
        Champion object or None
    """
    return Champion.query.filter_by(key=champion_key).first()

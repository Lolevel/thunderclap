"""
Rank Calculator Utility
Converts League of Legends ranks to numeric values for averaging
Each division step = 100 points
"""

from typing import Optional, Dict, List


# Rank tier to base points (before division calculation)
TIER_BASE_POINTS = {
    'IRON': 0,
    'BRONZE': 400,      # 4 divisions * 100
    'SILVER': 800,      # 8 divisions * 100
    'GOLD': 1200,       # 12 divisions * 100
    'PLATINUM': 1600,   # 16 divisions * 100
    'EMERALD': 2000,    # 20 divisions * 100
    'DIAMOND': 2400,    # 24 divisions * 100
    'MASTER': 2800,     # 28 divisions * 100
    'GRANDMASTER': 2900,  # No divisions, single tier
    'CHALLENGER': 3000    # No divisions, single tier
}

# Division to points offset (within a tier)
DIVISION_POINTS = {
    'IV': 0,
    'III': 100,
    'II': 200,
    'I': 300
}

# Rank tier icons (using Community Dragon or static assets)
RANK_ICON_BASE_URL = "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default"


def get_rank_icon_url(tier: str, division: Optional[str] = None) -> str:
    """
    Get rank icon URL for a specific tier/division

    Args:
        tier: Rank tier (e.g., "DIAMOND", "MASTER")
        division: Division (e.g., "II") or None for Master+

    Returns:
        URL to rank icon
    """
    # Community Dragon rank icons path
    tier_lower = tier.lower()

    # Master+ doesn't have divisions
    if tier in ['MASTER', 'GRANDMASTER', 'CHALLENGER']:
        return f"{RANK_ICON_BASE_URL}/{tier_lower}.png"

    # Other tiers have divisions
    return f"{RANK_ICON_BASE_URL}/{tier_lower}.png"


def rank_to_points(tier: str, division: Optional[str] = None, lp: int = 0) -> int:
    """
    Convert rank to numeric points for comparison/averaging

    Calculation:
    - Each tier has a base value
    - Each division adds 100 points
    - LP adds 0-99 points within division

    Examples:
        Iron IV 0 LP = 0
        Iron I 50 LP = 350
        Bronze IV 0 LP = 400
        Diamond II 75 LP = 2675
        Master 100 LP = 2900

    Args:
        tier: Rank tier (IRON, BRONZE, etc.)
        division: Division (IV, III, II, I) or None for Master+
        lp: League Points (0-100)

    Returns:
        Numeric point value
    """
    if not tier or tier == 'UNRANKED':
        return 0

    tier = tier.upper()

    # Get base points for tier
    base = TIER_BASE_POINTS.get(tier, 0)

    # Add division points (if applicable)
    division_bonus = 0
    if division and tier not in ['MASTER', 'GRANDMASTER', 'CHALLENGER']:
        division_bonus = DIVISION_POINTS.get(division.upper(), 0)

    # Add LP (capped at 99 to stay within division)
    lp_bonus = min(lp, 99)

    return base + division_bonus + lp_bonus


def points_to_rank(points: int) -> Dict[str, str]:
    """
    Convert points back to rank tier/division

    Args:
        points: Numeric point value

    Returns:
        {
            'tier': str,
            'division': str or None,
            'display': str (e.g., "Diamond II")
        }
    """
    if points <= 0:
        return {'tier': 'UNRANKED', 'division': None, 'display': 'Unranked'}

    # Find tier
    tier = 'IRON'
    for t, base in sorted(TIER_BASE_POINTS.items(), key=lambda x: x[1], reverse=True):
        if points >= base:
            tier = t
            break

    # Master+ has no divisions
    if tier in ['MASTER', 'GRANDMASTER', 'CHALLENGER']:
        return {
            'tier': tier,
            'division': None,
            'display': tier.capitalize()
        }

    # Calculate division
    points_in_tier = points - TIER_BASE_POINTS[tier]

    if points_in_tier >= 300:
        division = 'I'
    elif points_in_tier >= 200:
        division = 'II'
    elif points_in_tier >= 100:
        division = 'III'
    else:
        division = 'IV'

    return {
        'tier': tier,
        'division': division,
        'display': f"{tier.capitalize()} {division}"
    }


def calculate_average_rank(ranks: List[Dict]) -> Dict:
    """
    Calculate average rank from list of player ranks

    Args:
        ranks: List of rank dictionaries with 'tier', 'division', 'lp'
               Example: [{'tier': 'DIAMOND', 'division': 'II', 'lp': 50}, ...]

    Returns:
        {
            'average_points': int,
            'tier': str,
            'division': str or None,
            'display': str,
            'icon_url': str
        }
    """
    if not ranks:
        return {
            'average_points': 0,
            'tier': 'UNRANKED',
            'division': None,
            'display': 'Unranked',
            'icon_url': None
        }

    # Convert all ranks to points
    total_points = 0
    valid_ranks = 0

    for rank in ranks:
        if rank.get('tier') and rank['tier'] != 'UNRANKED':
            points = rank_to_points(
                tier=rank['tier'],
                division=rank.get('division'),
                lp=rank.get('lp', 0)
            )
            total_points += points
            valid_ranks += 1

    if valid_ranks == 0:
        return {
            'average_points': 0,
            'tier': 'UNRANKED',
            'division': None,
            'display': 'Unranked',
            'icon_url': None
        }

    # Calculate average
    avg_points = total_points // valid_ranks

    # Convert back to rank
    rank_info = points_to_rank(avg_points)

    # Add icon URL
    rank_info['average_points'] = avg_points
    rank_info['icon_url'] = get_rank_icon_url(rank_info['tier'], rank_info.get('division'))

    return rank_info


# Example usage and tests
if __name__ == '__main__':
    # Test conversions
    print("Iron IV 0 LP:", rank_to_points('IRON', 'IV', 0))  # Should be 0
    print("Bronze IV 0 LP:", rank_to_points('BRONZE', 'IV', 0))  # Should be 400
    print("Diamond II 75 LP:", rank_to_points('DIAMOND', 'II', 75))  # Should be 2675
    print("Master 100 LP:", rank_to_points('MASTER', None, 100))  # Should be 2900

    # Test average calculation
    team_ranks = [
        {'tier': 'DIAMOND', 'division': 'III', 'lp': 50},
        {'tier': 'DIAMOND', 'division': 'II', 'lp': 75},
        {'tier': 'DIAMOND', 'division': 'I', 'lp': 20},
        {'tier': 'EMERALD', 'division': 'I', 'lp': 80},
        {'tier': 'DIAMOND', 'division': 'IV', 'lp': 30}
    ]

    avg = calculate_average_rank(team_ranks)
    print("\nAverage rank:", avg['display'])
    print("Points:", avg['average_points'])

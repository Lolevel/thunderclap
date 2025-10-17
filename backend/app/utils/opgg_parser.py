"""
OP.GG URL Parser
"""
from typing import List, Optional
from urllib.parse import urlparse, parse_qs


def parse_opgg_url(url: str) -> Optional[List[str]]:
    """
    Parse OP.GG URL to extract summoner names
    Supports both multi-search and single summoner URLs

    Args:
        url: OP.GG URL
            Multi: https://www.op.gg/multisearch/euw?summoners=Name1,Name2,Name3
            Single: https://op.gg/summoners/euw/Faker-KR1 or https://www.op.gg/summoner/userName=Faker

    Returns:
        List of summoner names (Riot ID format: gameName#tagLine) or None if invalid

    Examples:
        >>> parse_opgg_url('https://www.op.gg/multisearch/euw?summoners=Faker%23KR1,Caps%23EUW')
        ['Faker#KR1', 'Caps#EUW']
        >>> parse_opgg_url('https://op.gg/summoners/euw/Faker-KR1')
        ['Faker#KR1']
    """
    try:
        # Parse URL
        parsed = urlparse(url)

        # Check if it's an OP.GG URL
        if 'op.gg' not in parsed.netloc:
            return None

        # Check if it's a multisearch URL
        if 'multisearch' in parsed.path:
            # Extract query parameters
            params = parse_qs(parsed.query)

            # Get summoners parameter
            summoners_param = params.get('summoners', [])
            if not summoners_param:
                return None

            # Split by comma and clean up
            summoner_names = [name.strip() for name in summoners_param[0].split(',')]

            # Filter empty names
            summoner_names = [name for name in summoner_names if name]

            return summoner_names if summoner_names else None

        # Check if it's a single summoner URL (new format: /summoners/region/name-tag)
        elif 'summoners' in parsed.path or 'summoner' in parsed.path:
            # Format: /summoners/euw/Faker-KR1 or /summoner/userName=Faker
            path_parts = [p for p in parsed.path.split('/') if p]

            # Try new format first: /summoners/region/name-tag
            if 'summoners' in path_parts:
                idx = path_parts.index('summoners')
                if len(path_parts) > idx + 2:
                    # name-tag format where - separates name and tag
                    name_tag = path_parts[idx + 2]
                    # Replace last - with # for Riot ID format
                    if '-' in name_tag:
                        parts = name_tag.rsplit('-', 1)
                        riot_id = f"{parts[0]}#{parts[1]}"
                        return [riot_id]

            # Try old format: /summoner/userName=Faker or query param
            params = parse_qs(parsed.query)
            if 'userName' in params:
                summoner_name = params['userName'][0]
                # Assume EUW if no tag specified
                if '#' not in summoner_name:
                    summoner_name = f"{summoner_name}#EUW"
                return [summoner_name]

            return None

        return None

    except Exception as e:
        return None


def build_opgg_url(summoner_names: List[str], region: str = 'euw') -> str:
    """
    Build OP.GG multi-search URL from summoner names

    Args:
        summoner_names: List of summoner names
        region: Region (default: 'euw')

    Returns:
        OP.GG URL

    Examples:
        >>> build_opgg_url(['Faker', 'Caps', 'Perkz'])
        'https://www.op.gg/multisearch/euw?summoners=Faker,Caps,Perkz'
    """
    summoners_str = ','.join(summoner_names)
    return f'https://www.op.gg/multisearch/{region}?summoners={summoners_str}'

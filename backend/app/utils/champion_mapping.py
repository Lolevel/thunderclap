"""
Champion ID to Name Mapping Utility
Maps Riot champion IDs to champion names using database
Falls back to static mapping if database is not available
"""

from typing import Optional

# Static fallback mapping (used if database is unavailable)
# Kept for backwards compatibility and offline operation
CHAMPION_ID_TO_NAME = {
    -1: "Unknown",  # Used when champion is not banned (championId = -1)
    1: "Annie",
    2: "Olaf",
    3: "Galio",
    4: "Twisted Fate",
    5: "Xin Zhao",
    6: "Urgot",
    7: "LeBlanc",
    8: "Vladimir",
    9: "Fiddlesticks",
    10: "Kayle",
    11: "Master Yi",
    12: "Alistar",
    13: "Ryze",
    14: "Sion",
    15: "Sivir",
    16: "Soraka",
    17: "Teemo",
    18: "Tristana",
    19: "Warwick",
    20: "Nunu",
    21: "Miss Fortune",
    22: "Ashe",
    23: "Tryndamere",
    24: "Jax",
    25: "Morgana",
    26: "Zilean",
    27: "Singed",
    28: "Evelynn",
    29: "Twitch",
    30: "Karthus",
    31: "Cho'Gath",
    32: "Amumu",
    33: "Rammus",
    34: "Anivia",
    35: "Shaco",
    36: "Dr. Mundo",
    37: "Sona",
    38: "Kassadin",
    39: "Irelia",
    40: "Janna",
    41: "Gangplank",
    42: "Corki",
    43: "Karma",
    44: "Taric",
    45: "Veigar",
    46: "Trundle",
    48: "Ezreal",
    50: "Swain",
    51: "Caitlyn",
    53: "Blitzcrank",
    54: "Malphite",
    55: "Katarina",
    56: "Nocturne",
    57: "Maokai",
    58: "Renekton",
    59: "Jarvan IV",
    60: "Elise",
    61: "Orianna",
    62: "Wukong",
    63: "Brand",
    64: "Lee Sin",
    67: "Vayne",
    68: "Rumble",
    69: "Cassiopeia",
    72: "Skarner",
    74: "Heimerdinger",
    75: "Nasus",
    76: "Nidalee",
    77: "Udyr",
    78: "Poppy",
    79: "Gragas",
    80: "Pantheon",
    81: "Ezreal",
    82: "Mordekaiser",
    83: "Yorick",
    84: "Akali",
    85: "Kennen",
    86: "Garen",
    89: "Leona",
    90: "Malzahar",
    91: "Talon",
    92: "Riven",
    96: "Kog'Maw",
    98: "Shen",
    99: "Lux",
    101: "Xerath",
    102: "Shyvana",
    103: "Ahri",
    104: "Graves",
    105: "Fizz",
    106: "Volibear",
    107: "Rengar",
    110: "Varus",
    111: "Nautilus",
    112: "Viktor",
    113: "Sejuani",
    114: "Fiora",
    115: "Ziggs",
    117: "Lulu",
    119: "Draven",
    120: "Hecarim",
    121: "Kha'Zix",
    122: "Darius",
    123: "Jayce",
    126: "Jayce",
    127: "Lissandra",
    131: "Diana",
    133: "Quinn",
    134: "Syndra",
    136: "Aurelion Sol",
    141: "Kayn",
    142: "Zoe",
    143: "Zyra",
    145: "Kai'Sa",
    147: "Seraphine",
    150: "Gnar",
    154: "Zac",
    157: "Yasuo",
    161: "Vel'Koz",
    163: "Taliyah",
    164: "Camille",
    166: "Akshan",
    200: "Bel'Veth",
    201: "Braum",
    202: "Jhin",
    203: "Kindred",
    221: "Zeri",
    222: "Jinx",
    223: "Tahm Kench",
    234: "Viego",
    235: "Senna",
    236: "Lucian",
    238: "Zed",
    240: "Kled",
    245: "Ekko",
    246: "Qiyana",
    254: "Vi",
    266: "Aatrox",
    267: "Nami",
    268: "Azir",
    350: "Yuumi",
    360: "Samira",
    412: "Thresh",
    420: "Illaoi",
    421: "Rek'Sai",
    427: "Ivern",
    429: "Kalista",
    432: "Bard",
    497: "Rakan",
    498: "Xayah",
    516: "Ornn",
    517: "Sylas",
    518: "Neeko",
    523: "Aphelios",
    526: "Rell",
    555: "Pyke",
    777: "Yone",
    799: "Ambessa",
    875: "Sett",
    876: "Lillia",
    887: "Gwen",
    888: "Renata Glasc",
    895: "Nilah",
    897: "K'Sante",
    902: "Milio",
    910: "Hwei",
    950: "Naafiri",
    233: "Briar",
    893: "Aurora",
    901: "Smolder",
}


def get_champion_name(champion_id: int) -> str:
    """
    Get champion name from champion ID
    Tries database first, falls back to static mapping

    Args:
        champion_id: Riot champion ID (e.g., 157 for Yasuo)

    Returns:
        Champion name string or "Unknown" if ID not found

    Example:
        >>> get_champion_name(157)
        'Yasuo'
        >>> get_champion_name(-1)
        'Unknown'
    """
    # Handle special case
    if champion_id == -1:
        return "Unknown"

    # Try database first
    try:
        from app.models.champion import Champion
        champion = Champion.query.filter_by(id=champion_id).first()
        if champion:
            return champion.name
    except Exception:
        # Database not available or error occurred, use fallback
        pass

    # Fallback to static mapping
    return CHAMPION_ID_TO_NAME.get(champion_id, f"Champion {champion_id}")


def get_champion_id(champion_name: str) -> int:
    """
    Get champion ID from champion name (reverse lookup)

    Args:
        champion_name: Champion name (e.g., "Yasuo")

    Returns:
        Champion ID or -1 if not found

    Example:
        >>> get_champion_id("Yasuo")
        157
    """
    name_to_id = {v: k for k, v in CHAMPION_ID_TO_NAME.items()}
    return name_to_id.get(champion_name, -1)

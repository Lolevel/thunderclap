"""
Match Data Extractor
Extracts and stores complete match data from Riot API to database
"""

from app import db
from app.models.match import Match, MatchParticipant, MatchTeamStats
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


def store_complete_match_data(
    match_data: Dict,
    tracked_team_puuids: Optional[List[str]] = None
) -> Match:
    """
    Store complete match data efficiently from Riot API

    Args:
        match_data: Full match data from Riot API (MATCH-V5 endpoint)
        tracked_team_puuids: List of PUUIDs we're tracking (to link match to teams)

    Returns:
        Match object with all relationships

    Example:
        >>> from utils.riot_api import RiotAPI
        >>> riot_api = RiotAPI()
        >>> match_data = riot_api.get_match('EUW1_7573575334')
        >>> match = store_complete_match_data(match_data, tracked_team_puuids=['abc...', 'def...'])
    """

    info = match_data['info']

    # Check if match already exists
    existing_match = Match.query.filter_by(
        match_id=match_data['metadata']['matchId']
    ).first()

    if existing_match:
        logger.info(f"Match {existing_match.match_id} already exists, skipping")
        return existing_match

    # 1. CREATE MATCH RECORD
    match = Match(
        match_id=match_data['metadata']['matchId'],
        game_creation=info['gameCreation'],
        game_duration=info['gameDuration'],
        game_version=info['gameVersion'],
        map_id=info.get('mapId', 11),
        queue_id=info['queueId'],
        platform_id=info.get('platformId', 'EUW1'),

        # Tournament info
        is_tournament_game=(info['queueId'] == 0),
        tournament_code=info.get('tournamentCode'),

        # Game state
        game_ended_in_surrender=info.get('gameEndedInSurrender', False),
        game_ended_in_early_surrender=info.get('gameEndedInEarlySurrender', False),

        # Team IDs will be set later after we determine which teams participated
    )

    db.session.add(match)
    db.session.flush()  # Get match.id for foreign keys

    logger.info(f"Created match {match.match_id} (ID: {match.id})")

    # 2. CREATE TEAM STATS (both blue and red)
    team_stats_records = []

    # Determine which team got first blood by checking participants
    first_blood_team_id = None
    for participant in info['participants']:
        if participant.get('firstBloodKill', False):
            first_blood_team_id = participant['teamId']
            break

    for team_data in info['teams']:
        riot_team_id = team_data['teamId']  # 100 or 200
        objectives = team_data['objectives']

        # First blood: check if this team got it
        first_blood = (riot_team_id == first_blood_team_id)

        team_stats = MatchTeamStats(
            match_id=match.id,
            riot_team_id=riot_team_id,
            win=team_data['win'],

            # Objective counts
            baron_kills=objectives['baron']['kills'],
            dragon_kills=objectives['dragon']['kills'],
            herald_kills=objectives['riftHerald']['kills'],
            tower_kills=objectives['tower']['kills'],
            inhibitor_kills=objectives['inhibitor']['kills'],
            atakhan_kills=objectives.get('atakhan', {}).get('kills', 0),
            horde_kills=objectives.get('horde', {}).get('kills', 0),

            # First flags
            first_baron=objectives['baron']['first'],
            first_dragon=objectives['dragon']['first'],
            first_herald=objectives['riftHerald']['first'],
            first_tower=objectives['tower']['first'],
            first_inhibitor=objectives['inhibitor']['first'],
            first_atakhan=objectives.get('atakhan', {}).get('first', False),
            first_horde=objectives.get('horde', {}).get('first', False),
            first_blood=first_blood,

            # Bans (store complete JSONB)
            bans=team_data['bans']
        )

        db.session.add(team_stats)
        team_stats_records.append(team_stats)

    logger.info(f"Created team stats for both sides (blue/red)")

    # 3. CREATE PARTICIPANTS
    participant_records = []

    for participant in info['participants']:
        puuid = participant['puuid']

        # Calculate CS per minute
        game_duration_minutes = info['gameDuration'] / 60
        cs_total = participant['totalMinionsKilled'] + participant['neutralMinionsKilled']
        cs_per_min = cs_total / game_duration_minutes if game_duration_minutes > 0 else 0

        # Get challenges data (may not exist in all matches)
        challenges = participant.get('challenges', {})

        participant_record = MatchParticipant(
            match_id=match.id,
            # player_id and team_id will be linked later
            puuid=puuid,
            summoner_name=participant.get('summonerName', ''),
            riot_game_name=participant.get('riotIdGameName'),
            riot_tagline=participant.get('riotIdTagline'),

            # Champion & Position
            champion_id=participant['championId'],
            champion_name=participant['championName'],
            team_position=participant['teamPosition'],
            individual_position=participant.get('individualPosition'),
            lane=participant.get('lane'),
            role=participant.get('role'),

            # Team
            riot_team_id=participant['teamId'],
            participant_id=participant['participantId'],

            # Core stats
            kills=participant['kills'],
            deaths=participant['deaths'],
            assists=participant['assists'],

            # CS & Gold
            total_minions_killed=participant['totalMinionsKilled'],
            neutral_minions_killed=participant['neutralMinionsKilled'],
            cs_per_min=round(cs_per_min, 2),
            gold_earned=participant['goldEarned'],
            gold_spent=participant['goldSpent'],

            # Damage
            total_damage_dealt_to_champions=participant['totalDamageDealtToChampions'],
            physical_damage_dealt_to_champions=participant['physicalDamageDealtToChampions'],
            magic_damage_dealt_to_champions=participant['magicDamageDealtToChampions'],
            true_damage_dealt_to_champions=participant['trueDamageDealtToChampions'],
            total_damage_taken=participant['totalDamageTaken'],
            damage_self_mitigated=participant['damageSelfMitigated'],

            # Vision
            vision_score=participant['visionScore'],
            wards_placed=participant['wardsPlaced'],
            wards_killed=participant['wardsKilled'],
            control_wards_placed=participant['detectorWardsPlaced'],
            vision_score_per_min=challenges.get('visionScorePerMinute', 0),

            # Combat
            first_blood=participant['firstBloodKill'],
            first_blood_assist=participant['firstBloodAssist'],
            first_tower=participant.get('firstTowerKill', False),
            first_tower_assist=participant.get('firstTowerAssist', False),
            double_kills=participant['doubleKills'],
            triple_kills=participant['tripleKills'],
            quadra_kills=participant['quadraKills'],
            penta_kills=participant['pentaKills'],
            largest_killing_spree=participant['largestKillingSpree'],
            largest_multi_kill=participant['largestMultiKill'],

            # Objectives
            baron_kills=participant.get('baronKills', 0),
            dragon_kills=participant.get('dragonKills', 0),
            turret_kills=participant.get('turretKills', 0),
            inhibitor_kills=participant.get('inhibitorKills', 0),

            # Items
            item0=participant['item0'],
            item1=participant['item1'],
            item2=participant['item2'],
            item3=participant['item3'],
            item4=participant['item4'],
            item5=participant['item5'],
            item6=participant['item6'],
            items_purchased=participant['itemsPurchased'],

            # Summoners
            summoner1_id=participant['summoner1Id'],
            summoner2_id=participant['summoner2Id'],
            summoner1_casts=participant.get('summoner1Casts', 0),
            summoner2_casts=participant.get('summoner2Casts', 0),

            # Spells
            spell1_casts=participant.get('spell1Casts', 0),
            spell2_casts=participant.get('spell2Casts', 0),
            spell3_casts=participant.get('spell3Casts', 0),
            spell4_casts=participant.get('spell4Casts', 0),

            # Runes
            perks=participant['perks'],

            # Advanced stats from challenges
            kda=challenges.get('kda', 0),
            kill_participation=challenges.get('killParticipation', 0),
            damage_per_minute=challenges.get('damagePerMinute', 0),
            gold_per_minute=challenges.get('goldPerMinute', 0),
            team_damage_percentage=challenges.get('teamDamagePercentage', 0),
            solo_kills=challenges.get('soloKills', 0),
            time_ccing_others=participant.get('timeCCingOthers', 0),

            # Result
            win=participant['win'],
            team_early_surrendered=participant.get('teamEarlySurrendered', False)
        )

        db.session.add(participant_record)
        participant_records.append(participant_record)

    logger.info(f"Created {len(participant_records)} participant records")

    # 4. LINK PARTICIPANTS TO TRACKED TEAMS (if applicable)
    if tracked_team_puuids:
        from app.models.player import Player
        from app.models.team import Team

        # Find which team won
        winning_team_id = 100 if info['teams'][0]['win'] else 200
        losing_team_id = 200 if winning_team_id == 100 else 100

        # Get participant PUUIDs grouped by team
        blue_team_puuids = [p.puuid for p in participant_records if p.riot_team_id == 100]
        red_team_puuids = [p.puuid for p in participant_records if p.riot_team_id == 200]

        # Check overlap with tracked teams
        blue_overlap = len(set(blue_team_puuids) & set(tracked_team_puuids))
        red_overlap = len(set(red_team_puuids) & set(tracked_team_puuids))

        logger.info(f"Blue team overlap: {blue_overlap}, Red team overlap: {red_overlap}")

        # Link participants to players
        for participant in participant_records:
            player = Player.query.filter_by(puuid=participant.puuid).first()
            if player:
                participant.player_id = player.id
                # Link to team if player is on a team
                if player.team_memberships:
                    participant.team_id = player.team_memberships[0].team_id

    # 5. COMMIT ALL CHANGES
    db.session.commit()

    logger.info(f"Successfully stored complete match data for {match.match_id}")

    return match


def get_match_statistics_summary(match: Match) -> Dict:
    """
    Generate a summary of match statistics

    Args:
        match: Match object

    Returns:
        Dictionary with match summary
    """
    team_stats = MatchTeamStats.query.filter_by(match_id=match.id).all()

    blue_team = next((t for t in team_stats if t.riot_team_id == 100), None)
    red_team = next((t for t in team_stats if t.riot_team_id == 200), None)

    if not blue_team or not red_team:
        return {}

    participants = MatchParticipant.query.filter_by(match_id=match.id).all()
    blue_participants = [p for p in participants if p.riot_team_id == 100]
    red_participants = [p for p in participants if p.riot_team_id == 200]

    return {
        'match_id': match.match_id,
        'game_duration': match.game_duration,
        'game_duration_formatted': f"{match.game_duration // 60}:{match.game_duration % 60:02d}",
        'tournament_code': match.tournament_code,
        'winner': 'blue' if blue_team.win else 'red',

        'blue_team': {
            'win': blue_team.win,
            'kills': sum(p.kills for p in blue_participants),
            'objectives': {
                'baron': blue_team.baron_kills,
                'dragon': blue_team.dragon_kills,
                'herald': blue_team.herald_kills,
                'towers': blue_team.tower_kills,
            },
            'firsts': {
                'blood': blue_team.first_blood,
                'dragon': blue_team.first_dragon,
                'herald': blue_team.first_herald,
                'tower': blue_team.first_tower,
                'baron': blue_team.first_baron,
            },
            'bans_phase1': blue_team.get_bans_by_phase(1),
            'bans_phase2': blue_team.get_bans_by_phase(2),
        },

        'red_team': {
            'win': red_team.win,
            'kills': sum(p.kills for p in red_participants),
            'objectives': {
                'baron': red_team.baron_kills,
                'dragon': red_team.dragon_kills,
                'herald': red_team.herald_kills,
                'towers': red_team.tower_kills,
            },
            'firsts': {
                'blood': red_team.first_blood,
                'dragon': red_team.first_dragon,
                'herald': red_team.first_herald,
                'tower': red_team.first_tower,
                'baron': red_team.first_baron,
            },
            'bans_phase1': red_team.get_bans_by_phase(1),
            'bans_phase2': red_team.get_bans_by_phase(2),
        },

        'top_performers': {
            'most_kills': max(participants, key=lambda p: p.kills).to_dict(),
            'most_damage': max(participants, key=lambda p: p.total_damage_dealt_to_champions).to_dict(),
            'best_vision': max(participants, key=lambda p: p.vision_score).to_dict(),
        }
    }


def analyze_draft_phase(match: Match) -> Dict:
    """
    Analyze the draft phase (bans and picks) for a match

    Args:
        match: Match object

    Returns:
        Dictionary with draft analysis
    """
    team_stats = MatchTeamStats.query.filter_by(match_id=match.id).all()
    participants = MatchParticipant.query.filter_by(match_id=match.id).all()

    blue_team = next((t for t in team_stats if t.riot_team_id == 100), None)
    red_team = next((t for t in team_stats if t.riot_team_id == 200), None)

    blue_participants = [p for p in participants if p.riot_team_id == 100]
    red_participants = [p for p in participants if p.riot_team_id == 200]

    return {
        'blue_side': {
            'bans': {
                'phase1': blue_team.get_bans_by_phase(1),  # Turns 1, 3, 5
                'phase2': blue_team.get_bans_by_phase(2),  # Turns 8, 10
            },
            'picks': [
                {
                    'champion_id': p.champion_id,
                    'champion_name': p.champion_name,
                    'position': p.team_position,
                    'player': p.riot_game_name or p.summoner_name,
                }
                for p in sorted(blue_participants, key=lambda x: x.participant_id)
            ],
        },
        'red_side': {
            'bans': {
                'phase1': red_team.get_bans_by_phase(1),  # Turns 2, 4, 6
                'phase2': red_team.get_bans_by_phase(2),  # Turns 7, 9
            },
            'picks': [
                {
                    'champion_id': p.champion_id,
                    'champion_name': p.champion_name,
                    'position': p.team_position,
                    'player': p.riot_game_name or p.summoner_name,
                }
                for p in sorted(red_participants, key=lambda x: x.participant_id)
            ],
        },
        'winner': 'blue' if blue_team.win else 'red',
    }

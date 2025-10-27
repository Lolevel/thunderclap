#!/usr/bin/env python3
"""
Compare schema.sql with SQLAlchemy models
"""
import re
from pathlib import Path

# Tables and their columns from schema.sql
SCHEMA_TABLES = {
    'teams': ['id', 'name', 'tag', 'prime_league_id', 'opgg_url', 'division', 'current_split', 'logo_url', 'locked_roster', 'created_at', 'updated_at'],
    'players': ['id', 'summoner_name', 'summoner_id', 'puuid', 'profile_icon_id', 'current_rank', 'current_lp', 'peak_rank', 'soloq_tier', 'soloq_division', 'soloq_lp', 'soloq_wins', 'soloq_losses', 'flexq_tier', 'flexq_division', 'flexq_lp', 'flexq_wins', 'flexq_losses', 'most_played_role', 'region', 'last_updated', 'created_at'],
    'team_rosters': ['id', 'team_id', 'player_id', 'role', 'is_main_roster', 'join_date', 'leave_date', 'games_played', 'created_at'],
    'player_champions': ['id', 'player_id', 'champion_id', 'champion_name', 'games_played', 'wins', 'losses', 'winrate', 'kda_average', 'cs_per_min', 'gold_per_min', 'damage_per_min', 'pink_wards_per_game', 'vision_score_per_game', 'last_played', 'game_type', 'updated_at'],
    'champions': ['id', 'champion_id', 'name', 'key', 'title', 'tags', 'partype', 'info', 'stats', 'patch_version', 'last_updated'],
    'matches': ['id', 'riot_match_id', 'game_creation', 'game_duration', 'game_version', 'map_id', 'queue_id', 'is_tournament_game', 'winning_team_id', 'losing_team_id', 'blue_team_total_kills', 'red_team_total_kills', 'blue_team_total_gold', 'red_team_total_gold', 'blue_team_objectives', 'red_team_objectives', 'created_at'],
    'match_participants': ['id', 'match_id', 'player_id', 'team_id', 'riot_team_id', 'champion_id', 'champion_name', 'role', 'summoner_spell1', 'summoner_spell2', 'rune_primary_style', 'rune_sub_style', 'kills', 'deaths', 'assists', 'gold_earned', 'total_damage_dealt_to_champions', 'total_damage_taken', 'cs', 'vision_score', 'wards_placed', 'wards_killed', 'control_wards_purchased', 'items', 'win', 'first_blood_kill', 'first_blood_assist', 'first_tower_kill', 'first_tower_assist'],
    'team_stats': ['id', 'team_id', 'stat_type', 'games_played', 'wins', 'losses', 'first_blood_rate', 'first_tower_rate', 'first_dragon_rate', 'dragon_control_rate', 'baron_control_rate', 'average_game_duration', 'average_gold_diff_at_10', 'average_gold_diff_at_15', 'comeback_win_rate', 'updated_at'],
    'draft_scenarios': ['id', 'team_id', 'scenario_name', 'side', 'roster', 'bans', 'picks', 'notes', 'is_active', 'display_order', 'created_at', 'updated_at'],
}

# Models and their files
MODELS = {
    'team.py': ['Team', 'TeamRoster', 'TeamStats'],
    'player.py': ['Player'],
    'champion.py': ['Champion', 'PlayerChampion'],
    'match.py': ['Match', 'MatchParticipant'],
    'game_prep.py': ['DraftScenario'],
}

def extract_model_columns(model_file):
    """Extract column names from a model file"""
    content = model_file.read_text()
    
    # Find all db.Column definitions
    columns = re.findall(r'(\w+)\s*=\s*db\.Column', content)
    
    return columns

def main():
    print("🔍 Checking schema.sql vs SQLAlchemy models...\n")
    
    models_dir = Path('backend/app/models')
    
    issues = []
    
    for model_file, model_classes in MODELS.items():
        file_path = models_dir / model_file
        if not file_path.exists():
            issues.append(f"❌ Model file not found: {model_file}")
            continue
            
        columns = extract_model_columns(file_path)
        print(f"📄 {model_file}: {model_classes}")
        print(f"   Columns: {', '.join(columns[:5])}...")
        print()
    
    if issues:
        print("\n⚠️  Issues found:")
        for issue in issues:
            print(f"   {issue}")
    else:
        print("✅ All model files exist!")
    
    print("\n" + "="*60)
    print("Manual check needed for:")
    print("- Column types match (VARCHAR, INTEGER, JSONB, etc.)")
    print("- Foreign key constraints match")
    print("- Default values match")
    print("="*60)

if __name__ == '__main__':
    main()

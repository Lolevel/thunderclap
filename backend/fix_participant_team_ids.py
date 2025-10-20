#!/usr/bin/env python3
"""
Fix missing team_id in match_participants
"""
from app import create_app, db
from app.models import Match, MatchParticipant, Team

def main():
    app = create_app()

    with app.app_context():
        # Get all teams
        teams = Team.query.all()

        print(f"Found {len(teams)} teams\n")

        for team in teams:
            print(f"{'='*60}")
            print(f"Team: {team.name} ({team.tag})")
            print(f"{'='*60}")

            # Get all matches for this team
            matches = Match.query.filter(
                db.or_(
                    Match.winning_team_id == team.id,
                    Match.losing_team_id == team.id
                )
            ).all()

            print(f"Found {len(matches)} matches for this team")

            # Get team player IDs
            team_player_ids = {r.player_id for r in team.rosters}
            print(f"Team has {len(team_player_ids)} players")

            updated = 0
            for match in matches:
                # Update participants
                for participant in match.participants:
                    if participant.player_id in team_player_ids:
                        if participant.team_id != team.id:
                            participant.team_id = team.id
                            updated += 1

            db.session.commit()
            print(f"✅ Updated {updated} participants\n")

        print("All done!")

if __name__ == '__main__':
    main()

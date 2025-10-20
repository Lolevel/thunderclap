#!/usr/bin/env python3
"""
Simple script to load ranks for all players
"""
from app import create_app, db
from app.models import Team
from app.utils.rank_fetcher import fetch_team_ranks

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

            result = fetch_team_ranks(str(team.id))

            print(f"✅ Success: {result.get('success', 0)}")
            print(f"❌ Failed: {result.get('failed', 0)}")

            if result.get('error'):
                print(f"⚠️  Error: {result['error']}")
            print()

        print("All done!")

if __name__ == '__main__':
    main()

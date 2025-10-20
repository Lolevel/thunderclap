#!/usr/bin/env python3
"""
Script to load ranks for all teams
"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app import create_app, db
from app.models import Team
from app.utils.rank_fetcher import fetch_team_ranks

def main():
    app = create_app()

    with app.app_context():
        # Get all teams
        teams = Team.query.all()

        print(f"Found {len(teams)} teams")

        for team in teams:
            print(f"\n{'='*60}")
            print(f"Loading ranks for: {team.name} ({team.tag})")
            print(f"{'='*60}")

            result = fetch_team_ranks(str(team.id))

            print(f"✅ Success: {result.get('success', 0)}")
            print(f"❌ Failed: {result.get('failed', 0)}")

            if result.get('error'):
                print(f"⚠️  Error: {result['error']}")

        print(f"\n{'='*60}")
        print("All done!")
        print(f"{'='*60}")

if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""
Create a new access token
"""
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app, db
from app.models import AccessToken

def create_token(name=None, days=None):
    """Create a new access token"""
    app = create_app()

    with app.app_context():
        token = AccessToken.create_token(name=name, expires_in_days=days)

        print("=" * 60)
        print("ACCESS TOKEN CREATED SUCCESSFULLY")
        print("=" * 60)
        print(f"Token: {token.token}")
        print(f"Name: {token.name or 'N/A'}")
        print(f"Expires: {token.expires_at.isoformat() if token.expires_at else 'Never'}")
        print("=" * 60)
        print("\nIMPORTANT: Save this token somewhere safe!")
        print("You won't be able to see it again.\n")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='Create a new access token')
    parser.add_argument('--name', type=str, help='Optional name for the token')
    parser.add_argument('--days', type=int, help='Days until expiration (omit for never expires)')

    args = parser.parse_args()
    create_token(name=args.name, days=args.days)

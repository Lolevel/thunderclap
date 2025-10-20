"""
Champion Model
Stores champion data from Community Dragon API
"""

from app import db
from datetime import datetime


class Champion(db.Model):
    """Champion data from Community Dragon"""
    __tablename__ = 'champions'

    id = db.Column(db.Integer, primary_key=True)  # Champion ID (e.g., 157 for Yasuo)
    key = db.Column(db.String(50), unique=True, nullable=False)  # Champion key (e.g., "Yasuo")
    name = db.Column(db.String(100), nullable=False)  # Display name

    # Community Dragon image URLs (never store images, only links)
    icon_url = db.Column(db.String(500))  # Square icon
    splash_url = db.Column(db.String(500))  # Splash art
    loading_url = db.Column(db.String(500))  # Loading screen

    # Basic info
    title = db.Column(db.String(200))  # Champion title (e.g., "the Unforgiven")
    roles = db.Column(db.ARRAY(db.String(50)))  # Primary roles (e.g., ["Fighter", "Assassin"])

    # Patch info
    patch_version = db.Column(db.String(20))  # Patch this data is from (e.g., "14.24")

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<Champion {self.name} (ID: {self.id})>'

    def to_dict(self):
        return {
            'id': self.id,
            'key': self.key,
            'name': self.name,
            'title': self.title,
            'roles': self.roles,
            'icon_url': self.icon_url,
            'splash_url': self.splash_url,
            'loading_url': self.loading_url,
            'patch_version': self.patch_version
        }

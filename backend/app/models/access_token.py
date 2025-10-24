"""
Access Token Model for simple token-based authentication
"""
import uuid
from datetime import datetime, timedelta
from app import db
from sqlalchemy.dialects.postgresql import UUID


class AccessToken(db.Model):
    """Simple token-based authentication"""
    __tablename__ = 'access_tokens'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    token = db.Column(db.String(64), unique=True, nullable=False, index=True)
    name = db.Column(db.String(100))  # Optional name/description for the token
    expires_at = db.Column(db.DateTime, nullable=True)  # None = never expires
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    last_used_at = db.Column(db.DateTime)
    use_count = db.Column(db.Integer, default=0)

    def is_valid(self):
        """Check if token is valid (active and not expired)"""
        if not self.is_active:
            return False
        if self.expires_at and datetime.utcnow() > self.expires_at:
            return False
        return True

    def record_use(self):
        """Record token usage"""
        self.last_used_at = datetime.utcnow()
        self.use_count = (self.use_count or 0) + 1
        db.session.commit()

    def to_dict(self):
        return {
            'id': str(self.id),
            'token': self.token,
            'name': self.name,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat(),
            'last_used_at': self.last_used_at.isoformat() if self.last_used_at else None,
            'use_count': self.use_count
        }

    @staticmethod
    def generate_token():
        """Generate a random 64-character token"""
        return str(uuid.uuid4().hex) + str(uuid.uuid4().hex)

    @staticmethod
    def create_token(name=None, expires_in_days=None):
        """
        Create a new access token

        Args:
            name: Optional name/description
            expires_in_days: Number of days until expiration (None = never expires)

        Returns:
            AccessToken instance
        """
        token = AccessToken(
            token=AccessToken.generate_token(),
            name=name,
            expires_at=datetime.utcnow() + timedelta(days=expires_in_days) if expires_in_days else None
        )
        db.session.add(token)
        db.session.commit()
        return token

"""
Prediction-related models
"""
from datetime import datetime
from app import db
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid


class LineupPrediction(db.Model):
    """Lineup predictions"""
    __tablename__ = 'lineup_predictions'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id = db.Column(UUID(as_uuid=True), db.ForeignKey('teams.id', ondelete='CASCADE'), nullable=False)
    match_date = db.Column(db.Date)
    predicted_top = db.Column(UUID(as_uuid=True), db.ForeignKey('players.id'))
    predicted_jungle = db.Column(UUID(as_uuid=True), db.ForeignKey('players.id'))
    predicted_mid = db.Column(UUID(as_uuid=True), db.ForeignKey('players.id'))
    predicted_adc = db.Column(UUID(as_uuid=True), db.ForeignKey('players.id'))
    predicted_support = db.Column(UUID(as_uuid=True), db.ForeignKey('players.id'))
    confidence_score = db.Column(db.Numeric(5, 2))
    prediction_factors = db.Column(JSONB)  # detailed breakdown
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<LineupPrediction {self.team_id} {self.match_date}>'

    def to_dict(self):
        """Convert model to dictionary"""
        return {
            'id': str(self.id),
            'team_id': str(self.team_id),
            'match_date': self.match_date.isoformat() if self.match_date else None,
            'predicted_lineup': {
                'top': str(self.predicted_top) if self.predicted_top else None,
                'jungle': str(self.predicted_jungle) if self.predicted_jungle else None,
                'mid': str(self.predicted_mid) if self.predicted_mid else None,
                'adc': str(self.predicted_adc) if self.predicted_adc else None,
                'support': str(self.predicted_support) if self.predicted_support else None,
            },
            'confidence_score': float(self.confidence_score) if self.confidence_score else None,
            'prediction_factors': self.prediction_factors,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

"""
Lineup Prediction Service
Predicts starting lineup using weighted algorithm
Best Practice: Encapsulates complex prediction logic in dedicated service
"""
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from collections import defaultdict
from flask import current_app
from app import db
from app.models import (
    Team, Player, TeamRoster, Match, MatchParticipant,
    LineupPrediction
)


class LineupPredictor:
    """
    Service for predicting team lineups
    Uses 65/35 weighting algorithm (tournament games + role coverage)
    No API calls required - only uses existing DB data
    """

    # Prediction weights (from project spec)
    WEIGHTS = {
        'recent_tournament_games': 0.65,  # Tournament history (HIGHEST)
        'role_coverage': 0.35,            # Role distribution
        'solo_queue_activity': 0.00,      # Removed - not needed (no API calls)
        'performance_rating': 0.00        # Removed - not used
    }

    ROLES = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY']

    def __init__(self):
        pass

    def predict_lineup(self, team: Team, match_date: Optional[datetime] = None) -> Dict:
        """
        Predict starting lineup for a team

        Args:
            team: Team model instance
            match_date: Date of match (default: today)

        Returns:
            {
                'team_id': str,
                'predicted_lineup': {
                    'TOP': (player_id, confidence),
                    'JUNGLE': (player_id, confidence),
                    ...
                },
                'overall_confidence': float,
                'prediction_factors': dict
            }
        """
        current_app.logger.info(f'Predicting lineup for {team.name}')

        match_date = match_date or datetime.utcnow()

        # Get eligible players (active roster)
        eligible_players = self._get_eligible_players(team)

        if not eligible_players:
            current_app.logger.warning(f'No eligible players found for {team.name}')
            return None

        # Calculate scores for each player-role combination
        player_role_scores = self._calculate_player_role_scores(
            eligible_players,
            team,
            match_date
        )

        # Select best lineup ensuring role coverage
        predicted_lineup = self._select_best_lineup(player_role_scores)

        if not predicted_lineup:
            current_app.logger.warning(f'Could not predict lineup for {team.name}')
            return None

        # Calculate overall confidence
        overall_confidence = self._calculate_lineup_confidence(
            team,
            predicted_lineup,
            player_role_scores
        )

        # Build result
        result = {
            'team_id': str(team.id),
            'team_name': team.name,
            'match_date': match_date.isoformat(),
            'predicted_lineup': {
                role: {
                    'player_id': str(player_id),
                    'player_name': Player.query.get(player_id).summoner_name,
                    'confidence': round(confidence * 100, 2)
                }
                for role, (player_id, confidence) in predicted_lineup.items()
            },
            'overall_confidence': round(overall_confidence * 100, 2),
            'prediction_factors': self._get_prediction_factors(
                team,
                predicted_lineup,
                player_role_scores
            )
        }

        current_app.logger.info(
            f'Predicted lineup for {team.name} with {result["overall_confidence"]:.1f}% confidence'
        )

        return result

    def predict_multiple_lineups(self, team: Team, match_date: Optional[datetime] = None, max_variants: int = 3) -> List[Dict]:
        """
        Predict multiple possible lineups (alternatives)

        Args:
            team: Team model instance
            match_date: Date of match (default: today)
            max_variants: Maximum number of lineup variants to return

        Returns:
            List of lineup predictions, ordered by confidence
        """
        current_app.logger.info(f'Predicting multiple lineups for {team.name}')

        match_date = match_date or datetime.utcnow()

        # Get eligible players
        eligible_players = self._get_eligible_players(team)

        if not eligible_players:
            return []

        # Calculate scores for each player-role combination
        player_role_scores = self._calculate_player_role_scores(
            eligible_players,
            team,
            match_date
        )

        # Generate multiple lineup variants
        variants = []

        # Variant 1: Best overall lineup (greedy)
        best_lineup = self._select_best_lineup(player_role_scores)
        if best_lineup:
            confidence = self._calculate_lineup_confidence(team, best_lineup, player_role_scores)
            variants.append({
                'lineup': best_lineup,
                'confidence': confidence,
                'method': 'best_overall'
            })

        # Variant 2: Alternative with second-best players for uncertain roles
        alternative_lineup = self._select_alternative_lineup(player_role_scores, best_lineup)
        if alternative_lineup:
            # Check if alternative is identical to best lineup
            is_identical = all(
                best_lineup.get(role, (None, None))[0] == alternative_lineup.get(role, (None, None))[0]
                for role in self.ROLES
            )

            if not is_identical:
                confidence = self._calculate_lineup_confidence(team, alternative_lineup, player_role_scores)
                variants.append({
                    'lineup': alternative_lineup,
                    'confidence': confidence,
                    'method': 'alternative'
                })

        # Sort by confidence
        variants.sort(key=lambda x: x['confidence'], reverse=True)

        # If only one variant, cap confidence at 99%
        if len(variants) == 1:
            variants[0]['confidence'] = min(variants[0]['confidence'], 0.99)

        # Build results
        results = []
        for idx, variant in enumerate(variants[:max_variants]):
            lineup = variant['lineup']
            result = {
                'team_id': str(team.id),
                'team_name': team.name,
                'variant_rank': idx + 1,
                'match_date': match_date.isoformat(),
                'predicted_lineup': {
                    role: {
                        'player_id': str(player_id),
                        'player_name': Player.query.get(player_id).summoner_name,
                        'confidence': round(confidence * 100, 2),
                        'role': role
                    }
                    for role, (player_id, confidence) in lineup.items()
                },
                'overall_confidence': round(variant['confidence'] * 100, 2),
                'prediction_method': variant['method']
            }
            results.append(result)

        return results

    def _select_alternative_lineup(self, player_role_scores: Dict, primary_lineup: Dict) -> Optional[Dict]:
        """
        Select an alternative lineup by picking second-best options for roles with close scores
        """
        lineup = {}
        used_players = set()

        # Identify roles with competitive alternatives (close scores)
        for role in self.ROLES:
            # Get top 2 players for this role
            candidates = []
            for player_id, role_scores in player_role_scores.items():
                score = role_scores.get(role, 0)
                candidates.append((player_id, score))

            candidates.sort(key=lambda x: x[1], reverse=True)

            # If we have at least 2 candidates and the difference is < 0.2, consider alternative
            if len(candidates) >= 2 and (candidates[0][1] - candidates[1][1]) < 0.2:
                # Use second best if primary lineup used the first
                primary_player_id = primary_lineup.get(role, (None, None))[0]
                if primary_player_id == candidates[0][0]:
                    # Try second best
                    second_best = candidates[1][0]
                    if second_best not in used_players:
                        lineup[role] = (second_best, candidates[1][1])
                        used_players.add(second_best)
                        continue

            # Otherwise use best available
            for player_id, score in candidates:
                if player_id not in used_players:
                    lineup[role] = (player_id, score)
                    used_players.add(player_id)
                    break

        if len(lineup) == len(self.ROLES):
            return lineup
        return None

    def save_prediction(self, team: Team, prediction_result: Dict) -> LineupPrediction:
        """
        Save prediction to database

        Args:
            team: Team model instance
            prediction_result: Result from predict_lineup()

        Returns:
            LineupPrediction model instance
        """
        lineup = prediction_result['predicted_lineup']

        prediction = LineupPrediction(
            team_id=team.id,
            match_date=datetime.fromisoformat(prediction_result['match_date']).date(),
            predicted_top=lineup.get('TOP', {}).get('player_id'),
            predicted_jungle=lineup.get('JUNGLE', {}).get('player_id'),
            predicted_mid=lineup.get('MIDDLE', {}).get('player_id'),
            predicted_adc=lineup.get('BOTTOM', {}).get('player_id'),
            predicted_support=lineup.get('UTILITY', {}).get('player_id'),
            confidence_score=prediction_result['overall_confidence'],
            prediction_factors=prediction_result['prediction_factors']
        )

        db.session.add(prediction)
        db.session.commit()

        return prediction

    # ============================================================
    # PRIVATE HELPER METHODS
    # ============================================================

    def _get_eligible_players(self, team: Team) -> List[Player]:
        """Get active roster players"""
        active_roster = TeamRoster.query.filter_by(
            team_id=team.id
        ).filter(
            TeamRoster.leave_date.is_(None)
        ).all()

        return [roster.player for roster in active_roster]

    def _calculate_player_role_scores(self, players: List[Player],
                                      team: Team,
                                      match_date: datetime) -> Dict:
        """
        Calculate score for each player-role combination

        Returns:
            {
                player_id: {
                    'TOP': score,
                    'JUNGLE': score,
                    ...
                }
            }
        """
        scores = {}

        for player in players:
            player_scores = {}

            for role in self.ROLES:
                # Calculate weighted score
                tournament_score = self._tournament_games_score(player, team, role)
                role_coverage_score = self._role_coverage_score(player, role)

                # Weighted sum (solo queue activity and performance rating removed)
                total_score = (
                    tournament_score * self.WEIGHTS['recent_tournament_games'] +
                    role_coverage_score * self.WEIGHTS['role_coverage']
                )

                player_scores[role] = total_score

            scores[player.id] = player_scores

        return scores

    def _tournament_games_score(self, player: Player, team: Team, role: str) -> float:
        """
        Score based on recent tournament games with strong recency bias
        Weight: 65%
        More recent games count significantly more (exponential decay)
        """
        # Get last 30 tournament games for this team (increased from 15)
        recent_tournament_games = Match.query.filter(
            Match.is_tournament_game == True,
            db.or_(
                Match.winning_team_id == team.id,
                Match.losing_team_id == team.id
            )
        ).order_by(Match.game_creation.desc()).limit(30).all()

        if not recent_tournament_games:
            return 0.0

        # Calculate weighted score with strong recency bias
        total_weight = 0
        weighted_appearances = 0

        for idx, match in enumerate(recent_tournament_games):
            # Strong exponential decay: most recent game has weight 1.0, oldest ~0.1
            # Decay factor 0.78 (stronger than previous 0.85)
            recency_weight = 1.0 * (0.78 ** idx)
            total_weight += recency_weight

            participant = MatchParticipant.query.filter_by(
                match_id=match.id,
                player_id=player.id
            ).first()

            if participant and participant.team_position == role:
                weighted_appearances += recency_weight

        # Score = weighted percentage
        score = weighted_appearances / total_weight if total_weight > 0 else 0.0
        return score

    def _role_coverage_score(self, player: Player, role: str) -> float:
        """
        Score based on role match
        Weight: 30%
        """
        # Check assigned role in roster
        roster_entry = TeamRoster.query.filter_by(
            player_id=player.id
        ).filter(
            TeamRoster.leave_date.is_(None)
        ).first()

        if not roster_entry or not roster_entry.role:
            # No assigned role - check recent games
            recent_participations = MatchParticipant.query.filter_by(
                player_id=player.id
            ).join(Match).order_by(
                Match.game_creation.desc()
            ).limit(20).all()

            if not recent_participations:
                return 0.5  # Neutral score

            # Calculate role frequency
            role_counts = defaultdict(int)
            for p in recent_participations:
                if p.team_position:
                    role_counts[p.team_position] += 1

            if not role_counts:
                return 0.5

            # Score based on how often they played this role
            total_games = len(recent_participations)
            role_frequency = role_counts.get(role, 0) / total_games

            return role_frequency

        # Has assigned role
        if roster_entry.role == role:
            return 1.0  # Perfect match
        else:
            return 0.1  # Wrong role

    def _solo_queue_activity_score(self, player: Player) -> float:
        """
        Score based on recent solo queue activity
        Weight: 0% (REMOVED - not used to avoid API calls)
        """
        # Not used anymore - return 0
        return 0.0

    def _performance_rating_score(self, player: Player, role: str) -> float:
        """
        Score based on recent performance
        Weight: 2% (benching is rare)
        """
        # Get last 10 games in this role
        recent_participations = MatchParticipant.query.filter_by(
            player_id=player.id
        ).filter(
            MatchParticipant.team_position == role
        ).join(Match).order_by(
            Match.game_creation.desc()
        ).limit(10).all()

        if not recent_participations:
            return 0.75  # Neutral-positive score (benching rare)

        # Calculate average KDA and winrate
        total_kda = 0
        wins = 0

        for p in recent_participations:
            # KDA calculation
            kills = p.kills or 0
            deaths = max(p.deaths or 1, 1)
            assists = p.assists or 0
            kda = (kills + assists) / deaths
            total_kda += kda

            if p.win:
                wins += 1

        avg_kda = total_kda / len(recent_participations)
        winrate = wins / len(recent_participations)

        # Score: KDA + winrate (normalized)
        # Good KDA: 3.0+, Good WR: 55%+
        kda_score = min(avg_kda / 4.0, 1.0)  # 4.0 KDA = 1.0 score
        wr_score = winrate

        score = (kda_score + wr_score) / 2
        return score

    def _select_best_lineup(self, player_role_scores: Dict) -> Optional[Dict]:
        """
        Select best lineup ensuring each role is covered
        Uses greedy algorithm with role constraints

        Returns:
            {
                'TOP': (player_id, confidence),
                'JUNGLE': (player_id, confidence),
                ...
            }
        """
        lineup = {}
        used_players = set()

        # For each role, pick the best available player
        for role in self.ROLES:
            best_player = None
            best_score = -1

            for player_id, role_scores in player_role_scores.items():
                # Skip if player already assigned
                if player_id in used_players:
                    continue

                score = role_scores.get(role, 0)
                if score > best_score:
                    best_score = score
                    best_player = player_id

            if best_player is not None:
                lineup[role] = (best_player, best_score)
                used_players.add(best_player)
            else:
                current_app.logger.warning(f'Could not find player for role {role}')
                return None

        return lineup

    def _calculate_lineup_confidence(self, team: Team, lineup: Dict,
                                     player_role_scores: Dict) -> float:
        """
        Calculate overall confidence in the prediction

        Factors:
        - Games together as unit
        - Role clarity
        - Recent activity
        - Historical accuracy
        """
        # Average of individual role confidences
        avg_confidence = sum(conf for _, conf in lineup.values()) / len(lineup)

        # Bonus for games together
        players_together_bonus = self._calculate_games_together_bonus(
            team,
            [player_id for player_id, _ in lineup.values()]
        )

        # Final confidence
        confidence = avg_confidence * 0.7 + players_together_bonus * 0.3
        return confidence

    def _calculate_games_together_bonus(self, team: Team, player_ids: List) -> float:
        """
        Calculate bonus for players who have played together recently
        """
        # Get recent tournament games
        recent_games = Match.query.filter(
            Match.is_tournament_game == True,
            db.or_(
                Match.winning_team_id == team.id,
                Match.losing_team_id == team.id
            )
        ).order_by(Match.game_creation.desc()).limit(10).all()

        if not recent_games:
            return 0.5

        # Count games where all 5 played together
        games_together = 0

        for match in recent_games:
            participants = MatchParticipant.query.filter_by(
                match_id=match.id
            ).filter(
                MatchParticipant.player_id.in_(player_ids)
            ).all()

            if len(participants) == 5:  # All 5 played together
                games_together += 1

        # Score based on how often they played together
        score = games_together / len(recent_games)
        return score

    def _get_prediction_factors(self, team: Team, lineup: Dict,
                               player_role_scores: Dict) -> Dict:
        """
        Get detailed breakdown of prediction factors for transparency
        """
        factors = {}

        for role, (player_id, confidence) in lineup.items():
            player = Player.query.get(player_id)
            scores = player_role_scores[player_id]

            factors[role] = {
                'player_name': player.summoner_name,
                'total_score': round(confidence, 3),
                'breakdown': {
                    'tournament_games': round(
                        self._tournament_games_score(player, team, role), 3
                    ),
                    'role_coverage': round(
                        self._role_coverage_score(player, role), 3
                    )
                }
            }

        return factors

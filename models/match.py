from extensions import db


class Match(db.Model):
    __tablename__ = 'matches'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    type = db.Column(db.Text, nullable=False)
    match_time = db.Column(db.Integer, nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    team_id = db.Column(db.Integer, db.ForeignKey('teams.id'), nullable=True)
    deleted = db.Column(db.Integer, default=0, nullable=False)
    created_at = db.Column(db.Integer, nullable=False)

    players = db.relationship('MatchPlayer', backref='match', lazy='dynamic')
    scores = db.relationship('MatchScore', backref='match', lazy='dynamic')

    def to_dict(self, include_details=False):
        result = {
            "id": self.id,
            "type": self.type,
            "match_time": self.match_time,
            "created_by": self.created_by,
            "team_id": self.team_id,
            "created_at": self.created_at
        }
        if include_details:
            result["players"] = [mp.to_dict() for mp in self.players.all()]
            result["scores"] = [ms.to_dict() for ms in self.scores.order_by(MatchScore.game_number).all()]
        return result

    def to_public_dict(self):
        return {
            "id": self.id,
            "type": self.type,
            "match_time": self.match_time,
            "players": [mp.to_dict() for mp in self.players.all()],
            "scores": [ms.to_dict() for ms in self.scores.order_by(MatchScore.game_number).all()]
        }


class MatchPlayer(db.Model):
    __tablename__ = 'match_players'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    match_id = db.Column(db.Integer, db.ForeignKey('matches.id'), nullable=False)
    player_id = db.Column(db.Integer, db.ForeignKey('players.id'), nullable=False)
    team = db.Column(db.Integer, nullable=False)
    is_winner = db.Column(db.Integer, default=0, nullable=False)

    player = db.relationship('Player', lazy='joined')

    def to_dict(self):
        return {
            "id": self.id,
            "match_id": self.match_id,
            "player_id": self.player_id,
            "player_name": self.player.name if self.player else None,
            "player_gender": self.player.gender if self.player else None,
            "team": self.team,
            "is_winner": self.is_winner
        }


class MatchScore(db.Model):
    __tablename__ = 'match_scores'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    match_id = db.Column(db.Integer, db.ForeignKey('matches.id'), nullable=False)
    game_number = db.Column(db.Integer, nullable=False)
    team1_score = db.Column(db.Integer, nullable=False)
    team2_score = db.Column(db.Integer, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "match_id": self.match_id,
            "game_number": self.game_number,
            "team1_score": self.team1_score,
            "team2_score": self.team2_score
        }

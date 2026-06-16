from extensions import db


class TeamPlayer(db.Model):
    __tablename__ = 'team_players'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.Text, nullable=False)
    gender = db.Column(db.Text, nullable=False)
    team_id = db.Column(db.Integer, db.ForeignKey('teams.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    role = db.Column(db.Text, default='member', nullable=False)
    deleted = db.Column(db.Integer, default=0, nullable=False)
    created_at = db.Column(db.Integer, nullable=False)

    team = db.relationship('Team', backref='team_players')
    bound_user = db.relationship('User', foreign_keys=[user_id])

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "gender": self.gender,
            "team_id": self.team_id,
            "user_id": self.user_id,
            "role": self.role,
            "deleted": self.deleted,
            "created_at": self.created_at
        }

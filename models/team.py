from extensions import db


class Team(db.Model):
    __tablename__ = 'teams'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.Text, nullable=False)
    creator_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    invite_code = db.Column(db.Text, unique=True, nullable=False)
    invite_expires_at = db.Column(db.Integer, default=0, nullable=False)
    deleted = db.Column(db.Integer, default=0, nullable=False)
    created_at = db.Column(db.Integer, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "creator_id": self.creator_id,
            "invite_code": self.invite_code,
            "invite_expires_at": self.invite_expires_at,
            "deleted": self.deleted,
            "created_at": self.created_at
        }


class TeamMember(db.Model):
    __tablename__ = 'team_members'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    team_id = db.Column(db.Integer, db.ForeignKey('teams.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    joined_at = db.Column(db.Integer, nullable=False)

    __table_args__ = (
        db.UniqueConstraint('team_id', 'user_id'),
    )

    user = db.relationship('User', lazy='joined')

    def to_dict(self):
        return {
            "id": self.id,
            "team_id": self.team_id,
            "user_id": self.user_id,
            "username": self.user.username if self.user else None,
            "joined_at": self.joined_at
        }

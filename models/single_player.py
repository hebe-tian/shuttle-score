from extensions import db


class SinglePlayer(db.Model):
    __tablename__ = 'single_players'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.Text, nullable=False)
    gender = db.Column(db.Text, nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    deleted = db.Column(db.Integer, default=0, nullable=False)
    invite_expires_at = db.Column(db.Integer, default=0, nullable=False)
    created_at = db.Column(db.Integer, nullable=False)

    creator = db.relationship('User', foreign_keys=[created_by], backref='single_players')
    bound_user = db.relationship('User', foreign_keys=[user_id])

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "gender": self.gender,
            "created_by": self.created_by,
            "user_id": self.user_id,
            "deleted": self.deleted,
            "invite_expires_at": self.invite_expires_at,
            "created_at": self.created_at
        }

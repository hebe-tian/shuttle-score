from extensions import db


class Setting(db.Model):
    __tablename__ = 'settings'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    key = db.Column(db.Text, unique=True, nullable=False)
    value = db.Column(db.Text, default='', nullable=False)
    updated_at = db.Column(db.Integer, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "key": self.key,
            "value": self.value,
            "updated_at": self.updated_at
        }

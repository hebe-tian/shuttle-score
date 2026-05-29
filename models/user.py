from extensions import db
from werkzeug.security import generate_password_hash, check_password_hash


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    account = db.Column(db.Text, unique=True, nullable=False)
    password_hash = db.Column(db.Text, nullable=False)
    username = db.Column(db.Text, unique=True, nullable=False)
    gender = db.Column(db.Text, default='')
    status = db.Column(db.Integer, default=1, nullable=False)
    created_at = db.Column(db.Integer, nullable=False)
    updated_at = db.Column(db.Integer, nullable=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "account": self.account,
            "username": self.username,
            "gender": self.gender,
            "status": self.status,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }


class Admin(db.Model):
    __tablename__ = 'admins'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    account = db.Column(db.Text, unique=True, nullable=False)
    password_hash = db.Column(db.Text, nullable=False)
    role = db.Column(db.Text, nullable=False, default='admin')
    status = db.Column(db.Integer, default=1, nullable=False)
    created_by = db.Column(db.Integer, default=0, nullable=False)
    created_at = db.Column(db.Integer, nullable=False)
    updated_at = db.Column(db.Integer, nullable=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "account": self.account,
            "role": self.role,
            "status": self.status,
            "created_by": self.created_by,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }

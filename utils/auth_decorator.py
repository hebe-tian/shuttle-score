from functools import wraps
from flask import request, current_app
import jwt
from utils.response import unauthorized, forbidden
from models.user import User, Admin


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization', '')
        if not token or not token.startswith('Bearer '):
            return unauthorized("未登录或Token过期")
        token = token[7:]
        try:
            secret = current_app.config['JWT_SECRET_KEY']
            data = jwt.decode(token, secret, algorithms=['HS256'])
            if data.get('type') != 'user':
                return forbidden("无权限访问")
            user = User.query.get(data['user_id'])
            if not user or user.status != 1:
                return unauthorized("账号已被禁用")
            request.current_user = user
        except jwt.ExpiredSignatureError:
            return unauthorized("Token已过期，请重新登录")
        except jwt.InvalidTokenError:
            return unauthorized("无效的Token")
        return f(*args, **kwargs)
    return decorated


def admin_token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization', '')
        if not token or not token.startswith('Bearer '):
            return unauthorized("未登录或Token过期")
        token = token[7:]
        try:
            secret = current_app.config['JWT_SECRET_KEY']
            data = jwt.decode(token, secret, algorithms=['HS256'])
            if data.get('type') != 'admin':
                return forbidden("无权限访问")
            admin = Admin.query.get(data['admin_id'])
            if not admin or admin.status != 1:
                return unauthorized("管理员账号已被禁用")
            request.current_admin = admin
        except jwt.ExpiredSignatureError:
            return unauthorized("Token已过期，请重新登录")
        except jwt.InvalidTokenError:
            return unauthorized("无效的Token")
        return f(*args, **kwargs)
    return decorated


def super_admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization', '')
        if not token or not token.startswith('Bearer '):
            return unauthorized("未登录或Token过期")
        token = token[7:]
        try:
            secret = current_app.config['JWT_SECRET_KEY']
            data = jwt.decode(token, secret, algorithms=['HS256'])
            if data.get('type') != 'admin':
                return forbidden("无权限访问")
            admin = Admin.query.get(data['admin_id'])
            if not admin or admin.status != 1:
                return unauthorized("管理员账号已被禁用")
            if admin.role != 'super_admin':
                return forbidden("仅超级管理员可执行此操作")
            request.current_admin = admin
        except jwt.ExpiredSignatureError:
            return unauthorized("Token已过期，请重新登录")
        except jwt.InvalidTokenError:
            return unauthorized("无效的Token")
        return f(*args, **kwargs)
    return decorated

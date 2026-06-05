from flask import Blueprint
from models.setting import Setting
from utils.response import success

settings_bp = Blueprint('settings', __name__)

PUBLIC_SETTINGS_KEYS = ['github_issue_url', 'contact_email']


@settings_bp.route('', methods=['GET'])
def get_public_settings():
    settings = Setting.query.filter(Setting.key.in_(PUBLIC_SETTINGS_KEYS)).all()
    result = {}
    for s in settings:
        result[s.key] = s.value
    for key in PUBLIC_SETTINGS_KEYS:
        if key not in result:
            result[key] = ''
    return success(result)

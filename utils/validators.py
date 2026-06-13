import re
import random
import string


def validate_account(account):
    if not account or not isinstance(account, str):
        return False, "账号不能为空"
    if len(account) < 4 or len(account) > 20:
        return False, "账号长度需为4-20位"
    if not re.match(r'^[a-zA-Z][a-zA-Z0-9]*$', account):
        return False, "账号需字母开头，仅支持字母和数字"
    return True, ""


def validate_password(password):
    if not password or not isinstance(password, str):
        return False, "密码不能为空"
    if len(password) < 6 or len(password) > 20:
        return False, "密码长度需为6-20位"
    return True, ""


def validate_username(username):
    if not username or not isinstance(username, str):
        return False, "用户名不能为空"
    if len(username) < 2 or len(username) > 8:
        return False, "用户名长度需为2-8位"
    return True, ""


def validate_player_name(name):
    if not name or not isinstance(name, str):
        return False, "选手名称不能为空"
    if len(name) < 2 or len(name) > 20:
        return False, "选手名称长度需为2-20位"
    return True, ""


def validate_gender(gender):
    if gender not in ('male', 'female'):
        return False, "性别需为male或female"
    return True, ""


VALID_MATCH_TYPES = ('ms', 'ws', 'os', 'md', 'wd', 'xd', 'od')


def validate_match_type(match_type):
    if match_type not in VALID_MATCH_TYPES:
        return False, f"比赛类型需为: {', '.join(VALID_MATCH_TYPES)}"
    return True, ""


MATCH_TYPE_GENDER = {
    'ms': 'male',
    'ws': 'female',
    'os': None,
    'md': 'male',
    'wd': 'female',
    'xd': None,
    'od': None,
}

MATCH_TYPE_CATEGORY = {
    'ms': 'singles',
    'ws': 'singles',
    'os': 'singles',
    'md': 'doubles',
    'wd': 'doubles',
    'xd': 'doubles',
    'od': 'doubles',
}

MATCH_TYPE_LABELS = {
    'ms': '男单',
    'ws': '女单',
    'os': '无限制单打',
    'md': '男双',
    'wd': '女双',
    'xd': '混双',
    'od': '无限制双打',
}


def validate_score(score):
    if not isinstance(score, int) or score < 0:
        return False, "得分需为非负整数"
    return True, ""


def validate_page(page):
    try:
        page = int(page)
        if page < 1:
            return 1
        return page
    except (ValueError, TypeError):
        return 1


def validate_page_size(page_size):
    try:
        page_size = int(page_size)
        if page_size < 1:
            return 10
        if page_size > 50:
            return 50
        return page_size
    except (ValueError, TypeError):
        return 10


def validate_team_name(name):
    if not name or not isinstance(name, str):
        return False, "Team名称不能为空"
    name = name.strip()
    if len(name) < 2 or len(name) > 20:
        return False, "Team名称长度需为2-20位"
    return True, ""


def validate_invite_code(code):
    if not code or not isinstance(code, str):
        return False, "邀请码不能为空"
    if not re.match(r'^[a-zA-Z0-9]{8}$', code):
        return False, "邀请码格式错误"
    return True, ""


def generate_invite_code():
    return ''.join(random.choices(string.ascii_letters + string.digits, k=8))

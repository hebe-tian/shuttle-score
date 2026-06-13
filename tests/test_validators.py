from utils.validators import (
    validate_account, validate_password, validate_username,
    validate_player_name, validate_gender, validate_match_type,
    validate_score, validate_page, validate_page_size,
    validate_team_name, validate_invite_code, generate_invite_code,
    VALID_MATCH_TYPES
)


class TestValidateAccount:
    def test_valid(self):
        ok, msg = validate_account('test1234')
        assert ok is True
        assert msg == ''

    def test_too_short(self):
        ok, msg = validate_account('ab')
        assert ok is False

    def test_too_long(self):
        ok, msg = validate_account('a' * 21)
        assert ok is False

    def test_not_start_with_letter(self):
        ok, msg = validate_account('1account')
        assert ok is False

    def test_empty(self):
        ok, msg = validate_account('')
        assert ok is False

    def test_none(self):
        ok, msg = validate_account(None)
        assert ok is False

    def test_non_string(self):
        ok, msg = validate_account(123)
        assert ok is False

    def test_special_chars(self):
        ok, msg = validate_account('test@123')
        assert ok is False


class TestValidatePassword:
    def test_valid(self):
        ok, msg = validate_password('123456')
        assert ok is True
        assert msg == ''

    def test_too_short(self):
        ok, msg = validate_password('12345')
        assert ok is False

    def test_too_long(self):
        ok, msg = validate_password('a' * 21)
        assert ok is False

    def test_empty(self):
        ok, msg = validate_password('')
        assert ok is False

    def test_none(self):
        ok, msg = validate_password(None)
        assert ok is False

    def test_non_string(self):
        ok, msg = validate_password(123456)
        assert ok is False


class TestValidateUsername:
    def test_valid(self):
        ok, msg = validate_username('张三')
        assert ok is True
        assert msg == ''

    def test_too_short(self):
        ok, msg = validate_username('a')
        assert ok is False

    def test_too_long(self):
        ok, msg = validate_username('a' * 9)
        assert ok is False

    def test_empty(self):
        ok, msg = validate_username('')
        assert ok is False

    def test_none(self):
        ok, msg = validate_username(None)
        assert ok is False

    def test_non_string(self):
        ok, msg = validate_username(123)
        assert ok is False


class TestValidatePlayerName:
    def test_valid(self):
        ok, msg = validate_player_name('选手A')
        assert ok is True
        assert msg == ''

    def test_too_short(self):
        ok, msg = validate_player_name('a')
        assert ok is False

    def test_too_long(self):
        ok, msg = validate_player_name('a' * 21)
        assert ok is False

    def test_empty(self):
        ok, msg = validate_player_name('')
        assert ok is False

    def test_none(self):
        ok, msg = validate_player_name(None)
        assert ok is False


class TestValidateGender:
    def test_male(self):
        ok, msg = validate_gender('male')
        assert ok is True

    def test_female(self):
        ok, msg = validate_gender('female')
        assert ok is True

    def test_invalid(self):
        ok, msg = validate_gender('other')
        assert ok is False

    def test_empty(self):
        ok, msg = validate_gender('')
        assert ok is False


class TestValidateMatchType:
    def test_all_valid_types(self):
        for mt in VALID_MATCH_TYPES:
            ok, msg = validate_match_type(mt)
            assert ok is True, f"{mt} should be valid"

    def test_invalid(self):
        ok, msg = validate_match_type('invalid')
        assert ok is False

    def test_empty(self):
        ok, msg = validate_match_type('')
        assert ok is False


class TestValidateScore:
    def test_valid(self):
        ok, msg = validate_score(21)
        assert ok is True
        assert msg == ''

    def test_zero(self):
        ok, msg = validate_score(0)
        assert ok is True

    def test_negative(self):
        ok, msg = validate_score(-1)
        assert ok is False

    def test_float(self):
        ok, msg = validate_score(1.5)
        assert ok is False

    def test_string(self):
        ok, msg = validate_score('21')
        assert ok is False


class TestValidatePage:
    def test_valid(self):
        assert validate_page(1) == 1
        assert validate_page(5) == 5

    def test_less_than_one(self):
        assert validate_page(0) == 1
        assert validate_page(-1) == 1

    def test_invalid_string(self):
        assert validate_page('abc') == 1

    def test_none(self):
        assert validate_page(None) == 1

    def test_string_number(self):
        assert validate_page('3') == 3


class TestValidatePageSize:
    def test_valid(self):
        assert validate_page_size(10) == 10

    def test_less_than_one(self):
        assert validate_page_size(0) == 10

    def test_greater_than_fifty(self):
        assert validate_page_size(100) == 50

    def test_invalid_string(self):
        assert validate_page_size('abc') == 10

    def test_none(self):
        assert validate_page_size(None) == 10

    def test_string_number(self):
        assert validate_page_size('20') == 20


class TestValidateTeamName:
    def test_valid(self):
        ok, msg = validate_team_name('队伍A')
        assert ok is True
        assert msg == ''

    def test_too_short(self):
        ok, msg = validate_team_name('a')
        assert ok is False

    def test_too_long(self):
        ok, msg = validate_team_name('a' * 21)
        assert ok is False

    def test_empty(self):
        ok, msg = validate_team_name('')
        assert ok is False

    def test_none(self):
        ok, msg = validate_team_name(None)
        assert ok is False

    def test_whitespace_only(self):
        ok, msg = validate_team_name('   ')
        assert ok is False


class TestValidateInviteCode:
    def test_valid(self):
        ok, msg = validate_invite_code('abc12345')
        assert ok is True
        assert msg == ''

    def test_too_short(self):
        ok, msg = validate_invite_code('abc123')
        assert ok is False

    def test_too_long(self):
        ok, msg = validate_invite_code('abc123456')
        assert ok is False

    def test_special_chars(self):
        ok, msg = validate_invite_code('abc-1234')
        assert ok is False

    def test_empty(self):
        ok, msg = validate_invite_code('')
        assert ok is False

    def test_none(self):
        ok, msg = validate_invite_code(None)
        assert ok is False


class TestGenerateInviteCode:
    def test_length(self):
        code = generate_invite_code()
        assert len(code) == 8

    def test_alphanumeric(self):
        code = generate_invite_code()
        assert code.isalnum()

    def test_uniqueness(self):
        codes = {generate_invite_code() for _ in range(100)}
        assert len(codes) > 90

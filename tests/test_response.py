import json
from utils.response import (
    success, bad_request, unauthorized, forbidden,
    not_found, conflict, server_error
)


def _get_json(response):
    return json.loads(response.data)


class TestSuccess:
    def test_with_data(self, app_context):
        resp = success({"key": "value"})
        data = _get_json(resp)
        assert data["code"] == 200
        assert data["data"] == {"key": "value"}

    def test_without_data(self, app_context):
        resp = success()
        data = _get_json(resp)
        assert data["code"] == 200
        assert "data" not in data

    def test_with_none_data(self, app_context):
        resp = success(None)
        data = _get_json(resp)
        assert data["code"] == 200
        assert "data" not in data

    def test_with_list_data(self, app_context):
        resp = success([1, 2, 3])
        data = _get_json(resp)
        assert data["data"] == [1, 2, 3]


class TestBadRequest:
    def test_code_and_msg(self, app_context):
        resp = bad_request("参数错误")
        data = _get_json(resp)
        assert data["code"] == 400
        assert data["msg"] == "参数错误"
        assert "traceId" in data


class TestUnauthorized:
    def test_default_msg(self, app_context):
        resp = unauthorized()
        data = _get_json(resp)
        assert data["code"] == 401
        assert data["msg"] == "未登录或Token过期"

    def test_custom_msg(self, app_context):
        resp = unauthorized("自定义")
        data = _get_json(resp)
        assert data["msg"] == "自定义"


class TestForbidden:
    def test_default_msg(self, app_context):
        resp = forbidden()
        data = _get_json(resp)
        assert data["code"] == 403
        assert data["msg"] == "无权限访问"

    def test_custom_msg(self, app_context):
        resp = forbidden("禁止")
        data = _get_json(resp)
        assert data["msg"] == "禁止"


class TestNotFound:
    def test_default_msg(self, app_context):
        resp = not_found()
        data = _get_json(resp)
        assert data["code"] == 404
        assert data["msg"] == "资源不存在"

    def test_custom_msg(self, app_context):
        resp = not_found("找不到")
        data = _get_json(resp)
        assert data["msg"] == "找不到"


class TestConflict:
    def test_default_msg(self, app_context):
        resp = conflict()
        data = _get_json(resp)
        assert data["code"] == 409
        assert data["msg"] == "资源冲突"

    def test_custom_msg(self, app_context):
        resp = conflict("已存在")
        data = _get_json(resp)
        assert data["msg"] == "已存在"


class TestServerError:
    def test_default_msg(self, app_context):
        resp = server_error()
        data = _get_json(resp)
        assert data["code"] == 500
        assert data["msg"] == "服务器内部错误"

    def test_custom_msg(self, app_context):
        resp = server_error("出错了")
        data = _get_json(resp)
        assert data["msg"] == "出错了"

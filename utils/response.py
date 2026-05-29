from flask import jsonify
import uuid


def success(data=None):
    response = {"code": 200}
    if data is not None:
        response["data"] = data
    return jsonify(response)


def error(code, msg):
    trace_id = str(uuid.uuid4())
    return jsonify({
        "code": code,
        "msg": msg,
        "traceId": trace_id
    })


def bad_request(msg):
    return error(400, msg)


def unauthorized(msg="未登录或Token过期"):
    return error(401, msg)


def forbidden(msg="无权限访问"):
    return error(403, msg)


def not_found(msg="资源不存在"):
    return error(404, msg)


def conflict(msg="资源冲突"):
    return error(409, msg)


def server_error(msg="服务器内部错误"):
    return error(500, msg)

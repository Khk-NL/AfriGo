const MAX_NICKNAME_LENGTH = 20;

/**
 * 校验用户自己提交的资料。头像只接受 HTTPS 绝对地址（本地存储模式由服务端生成，
 * 因此不会出现 wxfile:// 之类的临时路径）。
 * @param {object} payload 请求体，字段为 nickName / avatarUrl。
 * @returns {{nickName: string, avatarUrl: string}}
 */
function sanitizeProfilePayload(payload = {}) {
  const nickName = String(payload.nickName === undefined || payload.nickName === null ? '' : payload.nickName).trim();
  if (!nickName) {
    throw Object.assign(new Error('请填写昵称'), { statusCode: 400 });
  }
  if ([...nickName].length > MAX_NICKNAME_LENGTH) {
    throw Object.assign(new Error(`昵称不能超过 ${MAX_NICKNAME_LENGTH} 个字`), { statusCode: 400 });
  }
  const avatarUrl = String(payload.avatarUrl === undefined || payload.avatarUrl === null ? '' : payload.avatarUrl).trim();
  if (avatarUrl && !/^https:\/\/[^\s]+$/.test(avatarUrl)) {
    throw Object.assign(new Error('头像地址必须使用 HTTPS'), { statusCode: 400 });
  }
  return { nickName, avatarUrl };
}

module.exports = { MAX_NICKNAME_LENGTH, sanitizeProfilePayload };

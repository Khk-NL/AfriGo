const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const users = db.collection('users');

// 你可以在这里维护管理员 OpenID；也可以在云数据库 users 集合里手动把 role 改为 admin。
const ADMIN_OPENIDS = [];

const toPlainUser = (doc, openid) => ({
  _id: doc && doc._id,
  openid: doc && doc.openid ? doc.openid : openid,
  nickName: doc && doc.nickName ? doc.nickName : '',
  avatarUrl: doc && doc.avatarUrl ? doc.avatarUrl : '',
  role: doc && doc.role ? doc.role : 'user',
  createdAt: doc && doc.createdAt ? doc.createdAt : null,
  updatedAt: doc && doc.updatedAt ? doc.updatedAt : null,
  lastLoginAt: doc && doc.lastLoginAt ? doc.lastLoginAt : null,
  isAdmin: doc && doc.role === 'admin'
});

exports.main = async (event = {}) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const action = event.action || 'me';

  if (!openid) {
    return {
      ok: false,
      message: 'openid unavailable'
    };
  }

  if (action === 'me') {
    const current = await users.where({ openid }).limit(1).get();
    const doc = current.data && current.data[0];
    return {
      ok: true,
      user: doc ? toPlainUser(doc, openid) : null,
      openid
    };
  }

  if (action === 'login') {
    const profile = event.profile || {};
    const current = await users.where({ openid }).limit(1).get();
    const doc = current.data && current.data[0];
    const shouldBeAdmin = ADMIN_OPENIDS.includes(openid) || (doc && doc.role === 'admin');
    const now = db.serverDate();

    const payload = {
      openid,
      nickName: profile.nickName || (doc && doc.nickName) || '',
      avatarUrl: profile.avatarUrl || (doc && doc.avatarUrl) || '',
      role: shouldBeAdmin ? 'admin' : (doc && doc.role) || 'user',
      updatedAt: now,
      lastLoginAt: now
    };

    if (doc && doc._id) {
      await users.doc(doc._id).update({
        data: payload
      });

      return {
        ok: true,
        user: toPlainUser({ ...doc, ...payload }, openid),
        openid
      };
    }

    const addRes = await users.add({
      data: {
        ...payload,
        createdAt: now
      }
    });

    return {
      ok: true,
      user: toPlainUser({ _id: addRes._id, ...payload, createdAt: now }, openid),
      openid
    };
  }

  if (action === 'logout') {
    return {
      ok: true,
      openid
    };
  }

  throw new Error(`Unsupported action: ${action}`);
};


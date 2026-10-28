import { syncWeChatLogin } from '../../utils/cloud-service.js';
import { request } from '../../utils/api.js';

Page({
  data: { challengeId: '', busy: false, message: '' },

  onLoad(query) {
    const challengeId = decodeURIComponent(query.scene || '');
    this.setData({
      challengeId,
      message: challengeId ? '' : '二维码信息缺失，请返回网页重新扫码。'
    });
  },

  async confirmLogin() {
    if (!this.data.challengeId || this.data.busy) return;
    this.setData({ busy: true, message: '' });
    try {
      await syncWeChatLogin();
      await request('/api/web-login/confirm', {
        method: 'POST',
        data: { id: this.data.challengeId }
      });
      this.setData({ message: '已确认，网页将自动完成登录。' });
    } catch (error) {
      this.setData({ message: error.message || '确认失败，请返回网页重新扫码。' });
    } finally {
      this.setData({ busy: false });
    }
  }
});

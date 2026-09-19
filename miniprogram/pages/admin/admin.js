import { addDocument, getStoredCurrentUser, isAdminUser, loadCollection, removeDocument, updateDocument } from '../../utils/cloud-service.js';

const COLLECTIONS = [
  { key: 'users', label: '用户数据' },
  { key: 'posts', label: '社区帖子' },
  { key: 'attractions', label: '景点攻略' },
  { key: 'recommend', label: '出行推荐' },
  { key: 'service_providers', label: '服务方审核' },
  { key: 'service_leads', label: '服务意向单' },
  { key: 'risk_alerts', label: '风险提醒' },
  { key: 'content_corrections', label: '用户纠错' }
];

Page({
  data: {
    activeCollection: 'users',
    collectionOptions: COLLECTIONS,
    docs: [],
    selectedDocId: '',
    editorText: '',
    isAdmin: false,
    statusText: '正在校验管理员身份...'
  },

  onLoad() {
    this.refreshAccess();
  },

  onShow() {
    this.refreshAccess();
  },

  refreshAccess() {
    const currentUser = getStoredCurrentUser();
    const isAdmin = isAdminUser(currentUser);

    if (!isAdmin) {
      this.setData({
        isAdmin: false,
        statusText: '仅管理员可进入后台'
      });
      return;
    }

    this.setData({
      isAdmin: true,
      statusText: `当前操作集合：${this.data.activeCollection}`
    });
    this.loadDocs(this.data.activeCollection);
  },

  async loadDocs(collectionName) {
    try {
      const docs = await loadCollection(collectionName);
      const firstDoc = docs[0] || null;

      this.setData({
        activeCollection: collectionName,
        docs,
        selectedDocId: firstDoc ? firstDoc._id : '',
        editorText: firstDoc ? JSON.stringify(firstDoc, null, 2) : '',
        statusText: `已加载 ${collectionName}，共 ${docs.length} 条`
      });
    } catch (error) {
      console.error('admin: load docs failed', error);
      this.setData({
        docs: [],
        selectedDocId: '',
        editorText: '',
        statusText: `加载 ${collectionName} 失败`
      });
    }
  },

  onCollectionTap(e) {
    const { collection } = e.currentTarget.dataset;
    if (!collection || collection === this.data.activeCollection) {
      return;
    }

    this.loadDocs(collection);
  },

  onDocTap(e) {
    const { id } = e.currentTarget.dataset;
    const selected = this.data.docs.find((item) => item._id === id);
    if (!selected) {
      return;
    }

    this.setData({
      selectedDocId: id,
      editorText: JSON.stringify(selected, null, 2),
      statusText: `已选中 ${id}`
    });
  },

  onEditorInput(e) {
    this.setData({
      editorText: e.detail.value || ''
    });
  },

  parseEditorData() {
    if (!this.data.editorText.trim()) {
      throw new Error('编辑内容不能为空');
    }

    const parsed = JSON.parse(this.data.editorText);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('请输入有效的 JSON 对象');
    }

    return parsed;
  },

  async onAddTap() {
    if (!this.data.isAdmin) {
      return;
    }

    try {
      const payload = this.parseEditorData();
      delete payload._id;
      const result = await addDocument(this.data.activeCollection, payload);
      this.setData({ statusText: `新增成功：${result._id}` });
      await this.loadDocs(this.data.activeCollection);
    } catch (error) {
      console.error('admin: add failed', error);
      wx.showToast({
        title: error.message || '新增失败',
        icon: 'none'
      });
    }
  },

  async onUpdateTap() {
    if (!this.data.isAdmin) {
      return;
    }

    if (!this.data.selectedDocId) {
      wx.showToast({ title: '请先选择一条记录', icon: 'none' });
      return;
    }

    try {
      const payload = this.parseEditorData();
      delete payload._id;
      await updateDocument(this.data.activeCollection, this.data.selectedDocId, payload);
      this.setData({ statusText: `更新成功：${this.data.selectedDocId}` });
      await this.loadDocs(this.data.activeCollection);
    } catch (error) {
      console.error('admin: update failed', error);
      wx.showToast({
        title: error.message || '更新失败',
        icon: 'none'
      });
    }
  },

  async onDeleteTap() {
    if (!this.data.isAdmin) {
      return;
    }

    if (!this.data.selectedDocId) {
      wx.showToast({ title: '请先选择一条记录', icon: 'none' });
      return;
    }

    try {
      await removeDocument(this.data.activeCollection, this.data.selectedDocId);
      this.setData({ statusText: `删除成功：${this.data.selectedDocId}` });
      await this.loadDocs(this.data.activeCollection);
    } catch (error) {
      console.error('admin: delete failed', error);
      wx.showToast({
        title: error.message || '删除失败',
        icon: 'none'
      });
    }
  },

  onBackTap() {
    wx.navigateBack({
      fail: () => {
        wx.switchTab({ url: '/pages/profile/profile' });
      }
    });
  }
});


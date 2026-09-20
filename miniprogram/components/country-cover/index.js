import { getSelectedDestination } from '../../utils/countries.js';
import { getStoredLanguage, getCountryName, normalizeLanguage } from '../../utils/i18n.js';

/**
 * 当前目的地封面横幅。
 * 数据来自本地已选目的地（`selectedDestination`），页面不需要传参，
 * 因此内容页只要插一行 <country-cover /> 就有实景图。
 */
Component({
  options: {
    styleIsolation: 'apply-shared'
  },

  properties: {
    /** 覆盖本地目的地（例如详情页展示的不是当前目的地）。 */
    image: { type: String, value: '' },
    name: { type: String, value: '' },
    /** 紧凑模式：更矮、不带文字。 */
    compact: { type: Boolean, value: false }
  },

  data: {
    coverImage: '',
    coverName: ''
  },

  lifetimes: {
    attached() {
      this.refresh();
    }
  },

  pageLifetimes: {
    show() {
      this.refresh();
    }
  },

  methods: {
    refresh() {
      const destination = getSelectedDestination();
      const language = normalizeLanguage(getStoredLanguage());
      const zhName = this.data.name || destination.zhName || '';
      this.setData({
        coverImage: this.data.image || destination.image || '',
        coverName: zhName ? getCountryName(zhName, language) : ''
      });
    }
  }
});

const COUNTRY_CODE_BY_ZH = {
  '刚果(金)': 'CD',
  '刚果金': 'CD',
  '加纳': 'GH',
  '埃及': 'EG',
  '安哥拉': 'AO',
  '尼日利亚': 'NG',
  '南非': 'ZA',
  '马达加斯加': 'MG',
  '坦桑尼亚': 'TZ',
  '肯尼亚': 'KE',
  '科特迪瓦': 'CI',
  '赞比亚': 'ZM',
  '乌干达': 'UG',
  '几内亚': 'GN',
  '刚果(布)': 'CG',
  '刚果布': 'CG',
  '利比里亚': 'LR',
  '埃塞俄比亚': 'ET',
  '塞内加尔': 'SN',
  '津巴布韦': 'ZW',
  '摩洛哥': 'MA',
  '莫桑比克': 'MZ',
  '阿尔及利亚': 'DZ'
};

const DEFAULT_DESTINATION = {
  id: 'kenya',
  code: 'KE',
  zhName: '肯尼亚',
  enName: 'Kenya',
  image: '/assets/images/covers/kenya.jpg'
};

function normalizeCountryCode(value, countryZh = '') {
  const direct = String(value || '').trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(direct)) {
    return direct;
  }
  return COUNTRY_CODE_BY_ZH[String(countryZh || value || '').trim()] || '';
}

function getSelectedDestination() {
  try {
    const destination = wx.getStorageSync('selectedDestination') || {};
    return {
      ...DEFAULT_DESTINATION,
      ...destination,
      code: normalizeCountryCode(
        destination.code || destination.countryCode || DEFAULT_DESTINATION.code,
        destination.zhName || DEFAULT_DESTINATION.zhName
      )
    };
  } catch (error) {
    return { ...DEFAULT_DESTINATION };
  }
}

export {
  COUNTRY_CODE_BY_ZH,
  DEFAULT_DESTINATION,
  normalizeCountryCode,
  getSelectedDestination
};

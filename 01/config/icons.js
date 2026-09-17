// 在这里填写小程序包内图片路径或可访问的 HTTPS 图片 URL。
// 留空时，页面统一回退到对应 emoji，不使用网络占位图。
const ICON_IMAGES = Object.freeze({
  tabs: Object.freeze({ home: '', community: '', publish: '', message: '', profile: '' }),
  journey: Object.freeze({ map: '', translate: '', offline: '', emergency: '' }),
  features: Object.freeze({ visa: '', health: '', customs: '', 'local-info': '', recommend: '', labor: '', phrases: '', attractions: '' }),
  homeServices: Object.freeze({ review: '', services: '', trust: '' }),
  profile: Object.freeze({ visa: '', security: '', bookmarks: '', message: '', 'local-info': '', recommend: '', phrases: '', settings: '' }),
  localInfo: Object.freeze({ security: '', recommend: '', message: '' }),
  visa: Object.freeze({ default: '' })
});

export { ICON_IMAGES };

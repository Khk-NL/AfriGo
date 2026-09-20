/**
 * 生成 templates/icons.wxss。
 *
 * 为什么生成而不是手写：WXSS 的 background-image 不能用 currentColor，
 * 每条描边颜色都得烧进 SVG，手写 base64 没法维护。这里保留可读的 SVG 源码，
 * 跑 `npm run build:icons` 重新产出 wxss。
 *
 * 注意：小程序 <image> 不支持本地 SVG 文件，所以图标一律走 WXSS 背景图（base64）。
 */
const fs = require('fs');
const path = require('path');

const OUT_FILE = path.resolve(__dirname, '../templates/icons.wxss');

const INK = '#7b6f62';
const CLAY = '#8c3f22';
const ACACIA = '#4f6b52';
const TERRACOTTA = '#b4552f';
const WHITE = '#fffdf8';

/** 每个图标是 48x48 视图下的描边路径；COLOR 占位符会被替换成实际颜色。 */
const ICONS = {
  home: '<path d="M24 41V23"/><path d="M10 24q14-18 28 0"/><path d="M13 24q11-10 22 0"/>',
  community: '<path d="M10 12h24a5 5 0 0 1 5 5v11a5 5 0 0 1-5 5H20l-9 7v-7h-1a5 5 0 0 1-5-5V17a5 5 0 0 1 5-5z"/>'
    + '<circle cx="17.5" cy="22.5" r="1.7" fill="COLOR" stroke="none"/>'
    + '<circle cx="24" cy="22.5" r="1.7" fill="COLOR" stroke="none"/>'
    + '<circle cx="30.5" cy="22.5" r="1.7" fill="COLOR" stroke="none"/>',
  publish: '<circle cx="24" cy="24" r="16"/><path d="M24 16v16M16 24h16"/>',
  message: '<path d="M15 33h18l-2.5-5v-7.5a6.5 6.5 0 0 1-13 0V28z"/>'
    + '<path d="M21 38a3.2 3.2 0 0 0 6 0"/>',
  profile: '<circle cx="24" cy="18" r="7.5"/><path d="M10.5 39a13.5 13.5 0 0 1 27 0"/>',

  map: '<path d="M8 12l11-4 10 4 11-4v28l-11 4-10-4-11 4z"/><path d="M19 8v28M29 12v28"/>',
  translate: '<circle cx="24" cy="24" r="15"/><path d="M9 24h30"/><ellipse cx="24" cy="24" rx="7.5" ry="15"/>',
  offline: '<path d="M24 9v20M16 21l8 8 8-8"/><path d="M11 31v8h26v-8"/>',
  emergency: '<path d="M24 7l13 4.8V24c0 8.6-5.6 13.6-13 16.4C16.6 37.6 11 32.6 11 24V11.8z"/>'
    + '<path d="M24 17v9"/><circle cx="24" cy="31.5" r="1.8" fill="COLOR" stroke="none"/>',

  review: '<path d="M13 8h14l8 8v24H13z"/><path d="M27 8v8h8"/><path d="M19 29l4 4 8-8"/>',
  services: '<path d="M9 20h30v19H9z"/><path d="M7 20l3.5-10h27L41 20"/><path d="M19 39V28h10v11"/>',
  trust: '<circle cx="21" cy="21" r="11"/><path d="M29.5 29.5L40 40"/><path d="M16.5 21l3.5 3.5 6.5-6.5"/>'
};

function toDataUri(body, color) {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="' + color
    + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">'
    + body.split('COLOR').join(color)
    + '</svg>';
  return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
}

const lines = [
  '/* 由 scripts/build-icons.cjs 生成，请勿直接编辑；改图标请改源文件后重新生成 */',
  '',
  '.af-icon {',
  '  display: inline-block;',
  '  width: 44rpx;',
  '  height: 44rpx;',
  '  flex-shrink: 0;',
  '  background-repeat: no-repeat;',
  '  background-position: center;',
  '  background-size: contain;',
  '}',
  '',
  '.af-icon-lg { width: 56rpx; height: 56rpx; }',
  '.af-icon-sm { width: 34rpx; height: 34rpx; }',
  ''
];

// 底部导航：默认墨灰，选中态由 .tab-item.active 祖先选择器切成陶土色
lines.push('/* 底部导航图标 */');
for (const name of ['home', 'community', 'publish', 'message', 'profile']) {
  lines.push(`.af-tab-${name} { background-image: url("${toDataUri(ICONS[name], INK)}"); }`);
}
for (const name of ['home', 'community', 'publish', 'message', 'profile']) {
  lines.push(`.tab-item.active .af-tab-${name} { background-image: url("${toDataUri(ICONS[name], CLAY)}"); }`);
}
// 中间发布按钮是陶土底，图标要用暖白
lines.push(`.af-tab-publish-inverse { background-image: url("${toDataUri(ICONS.publish, WHITE)}"); }`);

lines.push('', '/* 旅中快捷工具 */');
for (const name of ['map', 'translate', 'offline', 'emergency']) {
  lines.push(`.af-icon-${name} { background-image: url("${toDataUri(ICONS[name], ACACIA)}"); }`);
}

lines.push('', '/* 行程服务 */');
for (const name of ['review', 'services', 'trust']) {
  lines.push(`.af-icon-${name} { background-image: url("${toDataUri(ICONS[name], TERRACOTTA)}"); }`);
}

lines.push('');
fs.writeFileSync(OUT_FILE, lines.join('\n'), 'utf8');

const size = fs.statSync(OUT_FILE).size;
console.log(`已生成 ${path.relative(path.resolve(__dirname, '..'), OUT_FILE)}（${(size / 1024).toFixed(1)} KB，12 个图标）`);

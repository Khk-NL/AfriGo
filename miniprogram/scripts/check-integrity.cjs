/**
 * 小程序结构自检：不需要开发者工具，也不需要真机，直接 `npm test` 运行。
 *
 * 检查项（errors 必须为 0）：
 *   1. 所有 json 都能解析
 *   2. usingComponents 指向的组件真实存在
 *   3. wxml 里用到的自定义标签都在 json 里声明过
 *   4. wxml 里绑定的事件处理函数在同名 js 里存在
 *   5. 已删除的标识符没有残留引用
 *
 * 另外给出 warnings（不阻塞）：未使用的 import、已经没人引用的依赖。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', 'miniprogram_npm', '.git']);

/** WXML 内置标签，出现这些不算未声明组件。 */
const BUILT_IN_TAGS = new Set([
  'view', 'text', 'image', 'scroll-view', 'canvas', 'button', 'input', 'textarea', 'picker', 'block',
  'template', 'import', 'include', 'navigator', 'switch', 'slider', 'checkbox', 'radio', 'form', 'label',
  'map', 'video', 'audio', 'web-view', 'movable-area', 'movable-view', 'cover-view', 'cover-image',
  'rich-text', 'progress', 'swiper', 'swiper-item', 'icon', 'page-meta', 'navigation-bar', 'wxs',
  'open-data', 'official-account', 'ad', 'camera', 'live-player', 'live-pusher', 'editor', 'match-media',
  'page-container', 'root-portal', 'share-element', 'slot', 'grid-view', 'list-view', 'sticky-section',
  'sticky-header', 'snapshot', 'custom-wrapper', 'voip-room', 'channel-live', 'channel-video', 'console'
]);

/** 已经不存在的标识符，任何文件里都不该再出现。 */
const REMOVED_TOKENS = [
  'lottie-canvas', 'handleTapElephant', 'isElephantRevealed', 'isChatOpen',
  'onOpenElephantChat', 'uiText.tooltip', 'EXCEL_PATH'
];

const EVENT_ATTR = /(?:bind|catch):?(?:tap|touchstart|touchmove|touchend|touchcancel|longpress|input|confirm|change|blur|focus|scroll|scrolltolower|refresherrefresh|load|error|submit|reset)="(\w+)"/g;

function listFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) listFiles(full, out);
    else out.push(full);
  }
  return out;
}

function readJson(file) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
}

const errors = [];
const warnings = [];
const files = listFiles(ROOT);
const app = readJson(path.join(ROOT, 'app.json'));

// 1) json 可解析
for (const file of files.filter((f) => f.endsWith('.json'))) {
  try {
    JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    errors.push(`JSON 解析失败: ${path.relative(ROOT, file)} (${error.message})`);
  }
}

const units = [
  ...app.pages.map((p) => ({ wxml: path.join(ROOT, `${p}.wxml`), js: path.join(ROOT, `${p}.js`), json: path.join(ROOT, `${p}.json`) })),
  ...files.filter((f) => f.endsWith('.wxml') && f.includes(`${path.sep}components${path.sep}`)).map((wxml) => ({
    wxml,
    js: wxml.replace(/\.wxml$/, '.js'),
    json: wxml.replace(/\.wxml$/, '.json')
  }))
];

for (const unit of units) {
  const label = path.relative(ROOT, unit.wxml);
  if (!fs.existsSync(unit.wxml)) {
    errors.push(`缺少 wxml: ${label}`);
    continue;
  }
  const json = readJson(unit.json);
  const declared = new Set(Object.keys(json.usingComponents || {}));
  const wxml = fs.readFileSync(unit.wxml, 'utf8');

  // 2) usingComponents 指向的组件存在
  for (const [name, target] of Object.entries(json.usingComponents || {})) {
    const resolved = target.startsWith('/')
      ? path.join(ROOT, target.slice(1))
      : path.resolve(path.dirname(unit.json), target);
    if (!fs.existsSync(`${resolved}.wxml`) && !fs.existsSync(`${resolved}.js`)) {
      errors.push(`组件不存在: ${path.relative(ROOT, unit.json)} -> ${name} (${target})`);
    }
  }

  // 3) 自定义标签已声明
  for (const match of wxml.matchAll(/<([a-z][a-z0-9-]*)[\s/>]/g)) {
    const tag = match[1];
    if (BUILT_IN_TAGS.has(tag) || declared.has(tag)) continue;
    errors.push(`未声明的标签: ${label} -> <${tag}>`);
  }

  // 4) 事件处理函数存在
  if (fs.existsSync(unit.js)) {
    const js = fs.readFileSync(unit.js, 'utf8').replace(/\/\/.*$/gm, '');
    const handlers = new Set([...wxml.matchAll(EVENT_ATTR)].map((m) => m[1]));
    for (const handler of handlers) {
      const defined = new RegExp(`(^|[\\s,{])${handler}\\s*[(:]`).test(js)
        || new RegExp(`(^|[\\s,{])${handler}\\s*:\\s*function`).test(js);
      if (!defined) errors.push(`事件处理函数不存在: ${label} -> ${handler}`);
    }
  }
}

// 5) 已删除标识符的残留引用
for (const file of files.filter((f) => /\.(js|wxml|wxss|json)$/.test(f))) {
  const text = fs.readFileSync(file, 'utf8');
  for (const token of REMOVED_TOKENS) {
    if (text.includes(token)) errors.push(`残留引用 ${token}: ${path.relative(ROOT, file)}`);
  }
}

// warnings：未使用的 import
const sources = files.filter((f) => f.endsWith('.js') && !f.endsWith('.cjs'));
for (const file of sources) {
  const src = fs.readFileSync(file, 'utf8');
  for (const match of src.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g)) {
    const body = src.replace(match[0], '');
    for (const raw of match[1].split(',')) {
      const name = raw.trim().split(/\s+as\s+/).pop();
      if (!name) continue;
      if (!new RegExp(`\\b${name}\\b`).test(body)) {
        warnings.push(`未使用的 import: ${path.relative(ROOT, file)} -> ${name}`);
      }
    }
  }
}

// warnings：已经没人 import 的依赖
const manifests = [path.join(ROOT, 'package.json')];
for (const manifest of manifests) {
  if (!fs.existsSync(manifest)) continue;
  const pkg = readJson(manifest);
  for (const dep of Object.keys(pkg.dependencies || {})) {
    const used = sources.some((file) => {
      const src = fs.readFileSync(file, 'utf8');
      return src.includes(`'${dep}`) || src.includes(`"${dep}`) || src.includes(`/${dep}/`);
    });
    if (!used) warnings.push(`依赖没有任何 import: ${dep}（可以清理 package.json 与 miniprogram_npm）`);
  }
}

console.log(`检查单元: ${units.length}；文件: ${files.length}`);
console.log(`错误: ${errors.length}`);
for (const item of errors) console.log(`  x ${item}`);
console.log(`提示: ${warnings.length}`);
for (const item of warnings) console.log(`  - ${item}`);
process.exit(errors.length ? 1 : 0);

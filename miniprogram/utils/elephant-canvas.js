import { ElephantRenderer } from './elephant-renderer.js';

/** 未指定尺寸时的画布边长（CSS px）。 */
export const ELEPHANT_DEFAULT_SIZE = 112;

export function getWindowMetrics() {
  const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
  return {
    pixelRatio: info.pixelRatio || 1,
    windowWidth: info.windowWidth || 375,
    windowHeight: info.windowHeight || 667,
    statusBarHeight: info.statusBarHeight || 20,
    safeAreaBottom: info.screenHeight && info.safeArea
      ? Math.max(0, info.screenHeight - info.safeArea.bottom)
      : 0
  };
}

/**
 * 把 750rpx 设计稿上的尺寸换算成 px。
 * @param {number} rpx
 * @param {number} [windowWidth]
 * @returns {number}
 */
export function rpxToPx(rpx, windowWidth = getWindowMetrics().windowWidth) {
  return (Number(rpx) * windowWidth) / 750;
}

/**
 * 在页面或组件里挂载一只小象。
 * 画布按 dpr 放大后再缩放上下文，避免高清屏发虚。
 *
 * @param {string} selector canvas 选择器，例如 '#pet-canvas'。
 * @param {{component?: object, size?: number, state?: string, frameIntervalMs?: number, autoStart?: boolean}} [options]
 *   component 传 this 以便在自定义组件内取节点。
 * @returns {Promise<ElephantRenderer|null>} 挂载失败返回 null，调用方按"没有小象"处理即可。
 */
export function mountElephant(selector, options = {}) {
  const size = Number(options.size) > 0 ? Number(options.size) : ELEPHANT_DEFAULT_SIZE;
  return new Promise((resolve) => {
    const query = options.component ? wx.createSelectorQuery().in(options.component) : wx.createSelectorQuery();
    query.select(selector).node((res) => {
      const canvas = res && res.node;
      if (!canvas) {
        resolve(null);
        return;
      }
      try {
        const { pixelRatio } = getWindowMetrics();
        canvas.width = size * pixelRatio;
        canvas.height = size * pixelRatio;
        const context = canvas.getContext('2d');
        if (!context) {
          resolve(null);
          return;
        }
        context.scale(pixelRatio, pixelRatio);
        const renderer = new ElephantRenderer(canvas, context, {
          size,
          frameIntervalMs: options.frameIntervalMs
        });
        renderer.setState(options.state || 'idle');
        if (options.autoStart !== false) {
          renderer.start();
        }
        resolve(renderer);
      } catch (error) {
        console.error(`elephant: 挂载失败 ${selector}`, error);
        resolve(null);
      }
    }).exec();
  });
}

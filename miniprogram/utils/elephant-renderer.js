// 动态小象交互 - Canvas 2D 渲染引擎 (更新版，支持吃东西、全像图、软阴影)
// 画布坐标系固定为 400x400，绘制时按 size 缩放，因此同一个渲染器可以铺在
// 首页角落、聊天页头像和全屏桌宠上。
const DESIGN_SIZE = 400;

export class ElephantRenderer {
  /**
   * @param {object} canvas 2d canvas 节点，需支持 requestAnimationFrame。
   * @param {object} context 2d 上下文。
   * @param {{size?: number, frameIntervalMs?: number}} [options]
   *   size 为 CSS 像素边长；frameIntervalMs 用于限制帧率，桌宠常驻时省电。
   */
  constructor(canvas, context, options = {}) {
    this.canvas = canvas;
    this.ctx = context;
    this.size = Number(options.size) > 0 ? Number(options.size) : 160;
    this.frameIntervalMs = Number(options.frameIntervalMs) > 0 ? Number(options.frameIntervalMs) : 0;
    this.state = 'peek'; // 'peek', 'idle', 'happy', 'eating', 'speaking'
    this.time = 0;
    this.animId = null;

    // 初始化渐变色
    this.skinGrad = this.ctx.createLinearGradient(80, 0, 320, 400);
    this.skinGrad.addColorStop(0, '#CBD5E1');
    this.skinGrad.addColorStop(1, '#94A3B8');

    this.skinDarkGrad = this.ctx.createLinearGradient(80, 0, 320, 400);
    this.skinDarkGrad.addColorStop(0, '#94A3B8');
    this.skinDarkGrad.addColorStop(1, '#64748B');

    this.innerEarGrad = this.ctx.createLinearGradient(0, 0, 400, 400);
    this.innerEarGrad.addColorStop(0, '#F1F5F9');
    this.innerEarGrad.addColorStop(1, '#CBD5E1');

    this.hatGrad = this.ctx.createLinearGradient(0, 0, 400, 400);
    this.hatGrad.addColorStop(0, '#F3EAD8');
    this.hatGrad.addColorStop(1, '#E8DCC4');
    
    this.bandGrad = this.ctx.createLinearGradient(0, 0, 400, 400);
    this.bandGrad.addColorStop(0, '#5C4033');
    this.bandGrad.addColorStop(1, '#3E2723');

    this.brassGrad = this.ctx.createLinearGradient(0, 0, 400, 400);
    this.brassGrad.addColorStop(0, '#FDE047');
    this.brassGrad.addColorStop(1, '#CA8A04');
  }

  setState(newState) {
    this.state = newState;
    this.time = 0; // 重置时间动画
  }

  start() {
    let lastTime = Date.now();
    let lastDraw = 0;
    const loop = () => {
      const now = Date.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      this.time += dt;

      if (!this.frameIntervalMs || now - lastDraw >= this.frameIntervalMs) {
        lastDraw = now;
        this.draw();
      }
      this.animId = this.canvas.requestAnimationFrame(loop);
    };
    this.animId = this.canvas.requestAnimationFrame(loop);
  }

  stop() {
    if (this.animId) {
      this.canvas.cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  setShadow(ctx, apply) {
    if (apply) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 6;
      ctx.shadowOffsetX = 0;
    } else {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
    }
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.size, this.size);

    const t = this.time;
    let leftEarRot = 0, rightEarRot = 0, bodyY = 0;
    let bodyTiltDeg = 0;
    let trunkCp1X = 150, trunkCp1Y = 280, trunkCp2X = 200, trunkCp2Y = 290, trunkEndX = 230, trunkEndY = 240;
    let leftArmRot = 0, leftArmX = 0, leftArmY = 0;

    if (this.state === 'peek') {
      leftEarRot = Math.sin(t * Math.PI * 2 / 4) * 3;
      rightEarRot = -Math.sin(t * Math.PI * 2 / 4) * 3;
      bodyTiltDeg = 11;
    } else if (this.state === 'idle') {
      leftEarRot = Math.sin(t * Math.PI * 2 / 4) * 3;
      rightEarRot = -Math.sin(t * Math.PI * 2 / 4) * 3;
    } else if (this.state === 'happy') {
      leftEarRot = Math.sin(t * Math.PI * 2 / 0.6) * 12;
      rightEarRot = -Math.sin(t * Math.PI * 2 / 0.6) * 12;
      bodyY = Math.sin(t * Math.PI * 2 / 0.4) * -7.5 - 7.5; 
      trunkCp1X = 150; trunkCp1Y = 290; trunkCp2X = 230; trunkCp2Y = 300; trunkEndX = 250; trunkEndY = 200;
    } else if (this.state === 'eating') {
      leftEarRot = Math.sin(t * Math.PI * 2 / 2) * 3;
      rightEarRot = -Math.sin(t * Math.PI * 2 / 2) * 3;
      bodyY = Math.sin(t * Math.PI * 2 / 1.5) * 1 + 1;
      trunkCp1X = 150; trunkCp1Y = 270; trunkCp2X = 150; trunkCp2Y = 270; trunkEndX = 150; trunkEndY = 240;
    } else if (this.state === 'speaking') {
      leftEarRot = Math.sin(t * Math.PI * 2 / 2) * 6;
      rightEarRot = -Math.sin(t * Math.PI * 2 / 2) * 6;
      bodyY = Math.sin(t * Math.PI * 2 / 1) * -1 - 1;
      trunkCp1X = 150; trunkCp1Y = 270; trunkCp2X = 190; trunkCp2Y = 280; trunkEndX = 220; trunkEndY = 235;
    }

    ctx.save();
    // 映射缩放：设计稿 400x400 -> 实际画布
    const scale = this.size / DESIGN_SIZE;
    ctx.scale(scale, scale);
    // 左耳路径会到负坐标，向右平移一点避免被 canvas 左边界裁切
    ctx.translate(DESIGN_SIZE * 0.12, 0);

    // 以双脚附近为旋转轴，让初始状态轻微向右倾斜
    if (bodyTiltDeg !== 0) {
      ctx.translate(150, 300);
      ctx.rotate(bodyTiltDeg * Math.PI / 180);
      ctx.translate(-150, -300);
    }

    // --- 全息问号 Hologram (仅 Speaking) ---
    if (this.state === 'speaking') {
      ctx.save();
      const holoY = Math.sin(t * Math.PI * 2 / 1.5) * -3;
      // 动画透明度和缩放
      const holoScale = 1 + Math.sin(t * Math.PI * 2 / 1.5) * 0.05;
      ctx.translate(280, 130 + holoY);
      ctx.scale(holoScale, holoScale);
      ctx.translate(-280, -130);

      // Rect
      ctx.fillStyle = 'rgba(6, 182, 212, 0.1)';
      ctx.strokeStyle = '#22D3EE';
      ctx.lineWidth = 2;
      ctx.beginPath();
      // x="250" y="90" width="100" height="80" rx="12"
      this.roundRectPath(ctx, 250, 90, 100, 80, 12);
      ctx.fill(); ctx.stroke();
      
      // 波浪线
      ctx.strokeStyle = '#67E8F9';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(265, 130);
      ctx.quadraticCurveTo(275, 110, 280, 130);
      ctx.quadraticCurveTo(287.5, 150, 295, 130);
      ctx.quadraticCurveTo(302.5, 110, 310, 130);
      ctx.stroke();

      // 圆点和折线
      ctx.fillStyle = '#A5F3FC';
      ctx.beginPath(); ctx.arc(275, 110, 4, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#A5F3FC';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(275, 114); ctx.lineTo(275, 120); ctx.lineTo(285, 120); ctx.lineTo(285, 110); ctx.stroke();

      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = '#A5F3FC';
      ctx.fillText('?', 320, 115);
      ctx.restore();
    }

    // 身体上下平移
    ctx.translate(0, bodyY);

    // --- 1. 后腿 BACK LEGS ---
    ctx.fillStyle = this.skinDarkGrad;
    this.setShadow(ctx, false);
    this.roundRect(ctx, 105, 240, 30, 55, 15);
    this.roundRect(ctx, 165, 240, 30, 55, 15);

    // 腿部白线
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.globalAlpha = 0.4;
    ctx.beginPath(); ctx.moveTo(110, 292); ctx.quadraticCurveTo(115, 288, 120, 292); ctx.moveTo(120, 292); ctx.quadraticCurveTo(125, 288, 130, 292); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(170, 292); ctx.quadraticCurveTo(175, 288, 180, 292); ctx.moveTo(180, 292); ctx.quadraticCurveTo(185, 288, 190, 292); ctx.stroke();
    ctx.globalAlpha = 1.0;

    // --- 2. 身体 BODY ---
    ctx.fillStyle = this.skinGrad;
    this.setShadow(ctx, true);
    ctx.beginPath();
    ctx.ellipse(150, 235, 60, 55, 0, 0, Math.PI * 2);
    ctx.fill();

    // --- 3. 耳朵 EARS ---
    // 左耳
    ctx.save();
    ctx.translate(80, 180);
    ctx.rotate(leftEarRot * Math.PI / 180);
    ctx.translate(-80, -180);
    
    ctx.fillStyle = this.skinGrad;
    this.setShadow(ctx, true);
    ctx.beginPath();
    ctx.moveTo(85, 150); ctx.bezierCurveTo(15, 110, -30, 180, 10, 260); ctx.bezierCurveTo(35, 310, 80, 280, 105, 230); ctx.fill();

    ctx.fillStyle = this.innerEarGrad;
    ctx.globalAlpha = 0.9;
    this.setShadow(ctx, false);
    ctx.beginPath();
    ctx.moveTo(80, 160); ctx.bezierCurveTo(25, 125, -10, 185, 20, 250); ctx.bezierCurveTo(40, 290, 75, 265, 95, 225); ctx.fill();
    ctx.globalAlpha = 1.0;
    ctx.restore();

    // 右耳
    ctx.save();
    ctx.translate(220, 180);
    ctx.rotate(rightEarRot * Math.PI / 180);
    ctx.translate(-220, -180);

    ctx.fillStyle = this.skinGrad;
    this.setShadow(ctx, true);
    ctx.beginPath();
    ctx.moveTo(215, 150); ctx.bezierCurveTo(285, 110, 330, 180, 290, 260); ctx.bezierCurveTo(265, 310, 220, 280, 195, 230); ctx.fill();

    ctx.fillStyle = this.innerEarGrad;
    ctx.globalAlpha = 0.9;
    this.setShadow(ctx, false);
    ctx.beginPath();
    ctx.moveTo(220, 160); ctx.bezierCurveTo(275, 125, 310, 185, 280, 250); ctx.bezierCurveTo(260, 290, 225, 265, 205, 225); ctx.fill();
    ctx.globalAlpha = 1.0;
    ctx.restore();

    // --- 4. 前腿 FRONT LEGS ---
    this.setShadow(ctx, true);
    ctx.fillStyle = this.skinGrad;

    // 右前腿
    ctx.save();
    this.roundRect(ctx, 151, 245, 34, 65, 17);
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.globalAlpha = 0.6;
    this.setShadow(ctx, false);
    ctx.beginPath(); ctx.moveTo(155, 306); ctx.quadraticCurveTo(160, 301, 165, 306); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(165, 306); ctx.quadraticCurveTo(170, 301, 175, 306); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(175, 306); ctx.quadraticCurveTo(180, 301, 181, 306); ctx.stroke();
    ctx.globalAlpha = 1.0;
    ctx.restore();

    // 左前腿 (保持直立)
    ctx.save();
    ctx.translate(132, 255);
    ctx.rotate(leftArmRot * Math.PI / 180);
    ctx.translate(-132 + leftArmX, -255 + leftArmY);

    this.setShadow(ctx, true);
    this.roundRect(ctx, 115, 245, 34, 65, 17);
    
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.globalAlpha = 0.6;
    this.setShadow(ctx, false);
    ctx.beginPath(); ctx.moveTo(120, 306); ctx.quadraticCurveTo(125, 301, 130, 306); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(130, 306); ctx.quadraticCurveTo(135, 301, 140, 306); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(140, 306); ctx.quadraticCurveTo(145, 301, 145, 306); ctx.stroke();
    ctx.globalAlpha = 1.0;
    ctx.restore();

    // --- 5. 头部 HEAD BASE ---
    this.setShadow(ctx, true);
    ctx.beginPath();
    ctx.ellipse(150, 175, 75, 65, 0, 0, Math.PI * 2);
    ctx.fill();

    // --- 6. 眼睛和腮红 EYES & BLUSH ---
    this.setShadow(ctx, false);
    if (this.state === 'happy') {
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(105, 175); ctx.quadraticCurveTo(115, 165, 125, 175); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(175, 175); ctx.quadraticCurveTo(185, 165, 195, 175); ctx.stroke();
      
      ctx.fillStyle = '#FCA5A5';
      ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.ellipse(100, 190, 12, 7, 0, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(200, 190, 12, 7, 0, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1.0;
    } else {
      ctx.fillStyle = '#1E293B';
      ctx.beginPath(); ctx.arc(115, 175, 8, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(185, 175, 8, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(112, 172, 2.5, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(182, 172, 2.5, 0, Math.PI*2); ctx.fill();
    }

    // --- 7. 鼻子 TRUNK ---
    this.setShadow(ctx, true);
    ctx.strokeStyle = '#94A3B8'; // 简化皮肤颜色，实际是阴影色
    ctx.lineWidth = 32;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(150, 185);
    ctx.bezierCurveTo(trunkCp1X, trunkCp1Y, trunkCp2X, trunkCp2Y, trunkEndX, trunkEndY);
    ctx.stroke();

    this.setShadow(ctx, false);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 14;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(150, 185);
    ctx.bezierCurveTo(trunkCp1X, trunkCp1Y, trunkCp2X, trunkCp2Y, trunkEndX, trunkEndY);
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    // --- 8. 帽子 SAFARI HAT ---
    ctx.save();
    ctx.translate(0, 10);
    ctx.fillStyle = this.hatGrad;
    this.setShadow(ctx, true);
    ctx.beginPath(); ctx.ellipse(150, 100, 60, 18, 0, 0, Math.PI*2); ctx.fill();
    
    this.setShadow(ctx, false);
    ctx.beginPath();
    ctx.moveTo(115, 100);
    ctx.bezierCurveTo(115, 50, 125, 40, 150, 40);
    ctx.bezierCurveTo(175, 40, 185, 50, 185, 100);
    ctx.fill();

    ctx.fillStyle = this.bandGrad;
    ctx.beginPath();
    ctx.moveTo(116, 88); 
    ctx.quadraticCurveTo(150, 102, 184, 88);
    ctx.lineTo(185, 100);
    ctx.quadraticCurveTo(150, 114, 115, 100);
    ctx.fill();
    
    // 金色圆纽扣
    this.setShadow(ctx, true);
    ctx.fillStyle = this.brassGrad;
    ctx.beginPath(); ctx.arc(150, 86, 8, 0, Math.PI*2); ctx.fill();
    this.setShadow(ctx, false);
    ctx.fillStyle = '#1E293B';
    ctx.beginPath(); ctx.arc(150, 86, 6, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#EF4444';
    ctx.beginPath(); ctx.moveTo(150, 81); ctx.lineTo(152, 86); ctx.lineTo(150, 91); ctx.lineTo(148, 86); ctx.fill();

    ctx.restore();
    ctx.restore();
  }

  roundRectPath(ctx, x, y, width, height, radius) {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    this.roundRectPath(ctx, x, y, width, height, radius);
    ctx.fill();
  }
}

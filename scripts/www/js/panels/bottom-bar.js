(function(G) {
  class BottomBar {
    constructor() {
      this.height = G.UI.bottomBar.height;
      this.visible = false;
      this.alpha = 0;
      this.targetAlpha = 0;
      this.time = 0;
      this.buttons = [
        { id: 'bag', name: '背包', icon: '🎒', x: 0 },
        { id: 'task', name: '任务', icon: '📋', x: 0 },
        { id: 'adventure', name: '冒险', icon: '🗺️', x: 0, isCenter: true },
        { id: 'team', name: '队伍', icon: '👥', x: 0 },
        { id: 'settings', name: '设置', icon: '⚙️', x: 0 },
      ];
      this.activeButton = null;
      this.buttonWidth = G.UI.bottomBar.buttonWidth;
      this.centerButtonWidth = G.UI.bottomBar.centerButtonWidth;
      this.buttonGap = G.UI.bottomBar.buttonGap;
      this.pulsePhase = 0;
    }

    show() {
      this.visible = true;
      this.targetAlpha = 1;
    }

    hide() {
      this.targetAlpha = 0;
    }

    update(dt) {
      this.time += dt;
      this.pulsePhase = Math.sin(this.time * 3) * 0.1;
      this.alpha = G.lerp(this.alpha, this.targetAlpha, dt * 8);
      if (this.alpha < 0.01 && this.targetAlpha === 0) {
        this.visible = false;
      }
      this.calculateButtonPositions();
    }

    calculateButtonPositions() {
      let totalWidth = 0;
      this.buttons.forEach(btn => {
        totalWidth += btn.isCenter ? this.centerButtonWidth : this.buttonWidth;
      });
      totalWidth += (this.buttons.length - 1) * this.buttonGap;

      const startX = (G.W - totalWidth) / 2;
      let currentX = startX;

      this.buttons.forEach((btn) => {
        const btnW = btn.isCenter ? this.centerButtonWidth : this.buttonWidth;
        btn.x = currentX + btnW / 2;
        currentX += btnW + this.buttonGap;
      });
    }

    draw(ctx) {
      if (!this.visible || this.alpha < 0.01) return;

      ctx.save();
      ctx.globalAlpha = this.alpha;

      const style = G.UI.bottomBar;
      const barY = G.H - this.height;

      const bgGrad = ctx.createLinearGradient(0, barY, 0, G.H);
      bgGrad.addColorStop(0, style.bgColorStart);
      bgGrad.addColorStop(1, style.bgColorEnd);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, barY, G.W, this.height);

      const lineGrad = ctx.createLinearGradient(0, 0, G.W, 0);
      lineGrad.addColorStop(0, 'rgba(180, 160, 120, 0)');
      lineGrad.addColorStop(0.3, G.UI.topBar.lineColor);
      lineGrad.addColorStop(0.7, G.UI.topBar.lineColor);
      lineGrad.addColorStop(1, 'rgba(180, 160, 120, 0)');
      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, barY + 0.5);
      ctx.lineTo(G.W, barY + 0.5);
      ctx.stroke();

      for (const btn of this.buttons) {
        this.drawButton(ctx, btn, barY);
      }

      ctx.restore();
    }

    drawButton(ctx, btn, barY) {
      const style = G.UI.bottomBar;
      const btnY = barY + this.height / 2;
      const isCenterBtn = btn.isCenter;
      const btnW = isCenterBtn ? this.centerButtonWidth : this.buttonWidth;
      const btnH = isCenterBtn ? style.centerBtnHeight : style.normalBtnHeight;
      const isActive = this.activeButton === btn.id;
      const pulse = isActive ? this.pulsePhase : 0;

      ctx.fillStyle = isActive ? style.activeBgColor : style.inactiveBgColor;
      ctx.beginPath();
      ctx.roundRect(btn.x - btnW / 2, btnY - btnH / 2, btnW, btnH, style.btnRadius);
      ctx.fill();

      if (isActive) {
        const glowGrad = ctx.createRadialGradient(btn.x, btnY, 0, btn.x, btnY, btnW * 0.7);
        glowGrad.addColorStop(0, `${style.glowColor.replace('0.15', `${0.15 + pulse}`)}`);
        glowGrad.addColorStop(1, 'rgba(255, 200, 120, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.roundRect(btn.x - btnW / 2, btnY - btnH / 2, btnW, btnH, style.btnRadius);
        ctx.fill();
      }

      ctx.strokeStyle = isActive ? style.activeBorderColor : style.inactiveBorderColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(btn.x - btnW / 2, btnY - btnH / 2, btnW, btnH, style.btnRadius);
      ctx.stroke();

      // 图标大小根据按钮类型调整
      const iconSize = isCenterBtn ? Math.min(G.W * 0.065, 28) : Math.min(G.W * 0.055, 24);
      ctx.font = `${iconSize}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(btn.icon, btn.x, btnY - (isCenterBtn ? 10 : 8));

      // 文字大小根据按钮类型调整
      ctx.fillStyle = isActive ? style.activeTextColor : style.inactiveTextColor;
      const fontSize = isCenterBtn ? Math.min(G.W * 0.03, G.UI.fonts.normal.size) : Math.min(G.W * 0.028, G.UI.fonts.small.size);
      ctx.font = `${fontSize}px ${G.UI.fonts.normal.family}`;
      ctx.fillText(btn.name, btn.x, btnY + (isCenterBtn ? 16 : 14));
    }

    handleClick(x, y) {
      if (!this.visible || this.alpha < 0.5) return null;

      const barY = G.H - this.height;
      if (y < barY) return null;

      const style = G.UI.bottomBar;
      for (const btn of this.buttons) {
        const isCenterBtn = btn.isCenter;
        const btnW = isCenterBtn ? this.centerButtonWidth : this.buttonWidth;
        const btnH = isCenterBtn ? style.centerBtnHeight : style.normalBtnHeight;
        const btnY = barY + this.height / 2;
        if (x >= btn.x - btnW / 2 && x <= btn.x + btnW / 2 &&
            y >= btnY - btnH / 2 && y <= btnY + btnH / 2) {
          this.activeButton = btn.id;
          return btn.id;
        }
      }
      return null;
    }

    getHeight() { return this.height; }

    isPointInside(x, y) { return y >= G.H - this.height; }
  }

  G.BottomBar = BottomBar;
})(window.GameApp);
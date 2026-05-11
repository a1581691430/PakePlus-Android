(function(G) {
  class TopBar {
    constructor() {
      this.height = G.UI.topBar.height;
      this.visible = false;
      this.alpha = 0;
      this.targetAlpha = 0;
      this.time = 0;
      this.avatarPulse = 0;
    }

    show() {
      this.visible = true;
      this.alpha = 1;
      this.targetAlpha = 1;
    }

    hide() {
      this.targetAlpha = 0;
    }

    update(dt) {
      this.time += dt;
      this.avatarPulse = Math.sin(this.time * 2) * 0.1 + 0.9;
      this.alpha = G.lerp(this.alpha, this.targetAlpha, dt * 8);
      if (this.alpha < 0.01 && this.targetAlpha === 0) {
        this.visible = false;
      }
    }

    draw(ctx) {
      if (!this.visible || this.alpha < 0.01) return;

      ctx.save();
      ctx.globalAlpha = this.alpha;

      const style = G.UI.topBar;
      const barHeight = style.height;
      const padding = style.padding;
      const avatarSize = style.avatarSize;

      // 顶栏背景渐变
      const bgGrad = ctx.createLinearGradient(0, 0, 0, barHeight);
      bgGrad.addColorStop(0, style.bgColorStart);
      bgGrad.addColorStop(1, style.bgColorEnd);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, G.W, barHeight);

      // 底部装饰线
      const lineGrad = ctx.createLinearGradient(0, 0, G.W, 0);
      lineGrad.addColorStop(0, 'rgba(180, 160, 120, 0)');
      lineGrad.addColorStop(0.3, style.lineColor);
      lineGrad.addColorStop(0.7, style.lineColor);
      lineGrad.addColorStop(1, 'rgba(180, 160, 120, 0)');
      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, barHeight - 0.5);
      ctx.lineTo(G.W, barHeight - 0.5);
      ctx.stroke();

      // 头像区域
      const avatarX = padding + avatarSize / 2;
      const avatarY = barHeight / 2;

      // 头像外框光晕
      const avatarGlow = ctx.createRadialGradient(avatarX, avatarY, avatarSize * 0.3, avatarX, avatarY, avatarSize * 0.8);
      avatarGlow.addColorStop(0, `${style.avatarGlowColor.replace('0.15', `${0.15 * this.avatarPulse}`)}`);
      avatarGlow.addColorStop(1, 'rgba(255, 200, 120, 0)');
      ctx.fillStyle = avatarGlow;
      ctx.beginPath();
      ctx.arc(avatarX, avatarY, avatarSize * 0.8, 0, Math.PI * 2);
      ctx.fill();

      // 头像背景
      ctx.fillStyle = style.avatarBgColor;
      ctx.beginPath();
      ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
      ctx.fill();

      // 头像边框
      ctx.strokeStyle = style.avatarBorderColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
      ctx.stroke();

      // 头像内部图案（简化的猎人图标）
      ctx.fillStyle = G.UI.colors.textNormal;
      ctx.font = `${avatarSize * 0.5}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🎯', avatarX, avatarY);

      // 等级显示
      const levelX = avatarX + avatarSize / 2 + 8;
      const levelY = avatarY - 6;

      // 等级背景
      ctx.fillStyle = style.levelBgColor;
      ctx.beginPath();
      ctx.roundRect(levelX - 2, levelY - style.levelBgHeight / 2 - 1, style.levelBgWidth, style.levelBgHeight, style.levelBgRadius);
      ctx.fill();

      // 等级文字
      ctx.fillStyle = style.levelTextColor;
      ctx.font = `bold ${Math.min(G.W * 0.032, G.UI.fonts.medium.size)}px ${G.UI.fonts.medium.family}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const gs = G.getGameState();
      ctx.fillText(`Lv.${gs.playerData.level}`, levelX + 2, levelY);

      // 玩家名称
      ctx.fillStyle = style.nameTextColor;
      ctx.font = `${Math.min(G.W * 0.03, G.UI.fonts.normal.size)}px ${G.UI.fonts.normal.family}`;
      ctx.fillText(gs.playerData.name, levelX, levelY + 14);

      // 货币区域（右侧）
      const rightPadding = 15;
      const currencyGap = 12;

      // 普通币
      const goldX = G.W - rightPadding;
      const goldY = barHeight / 2;
      this.drawCurrency(ctx, goldX, goldY, '💰', gs.playerData.gold, G.UI.colors.gold, G.UI.colors.goldDark);

      // 钻石
      const diamondX = goldX - 85 - currencyGap;
      this.drawCurrency(ctx, diamondX, goldY, '💎', gs.playerData.diamond, G.UI.colors.diamond, G.UI.colors.diamondDark);

      ctx.restore();
    }

    drawCurrency(ctx, x, y, icon, value, colorLight, colorDark) {
      const style = G.UI.topBar;
      const boxWidth = style.currencyBoxWidth;
      const boxHeight = style.currencyBoxHeight;

      // 货币背景
      ctx.fillStyle = style.currencyBgColor;
      ctx.beginPath();
      ctx.roundRect(x - boxWidth, y - boxHeight / 2, boxWidth, boxHeight, style.currencyBoxRadius);
      ctx.fill();

      // 边框
      ctx.strokeStyle = `rgba(${parseInt(colorDark.slice(1,3),16)}, ${parseInt(colorDark.slice(3,5),16)}, ${parseInt(colorDark.slice(5,7),16)}, 0.4)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x - boxWidth, y - boxHeight / 2, boxWidth, boxHeight, style.currencyBoxRadius);
      ctx.stroke();

      // 图标
      ctx.font = `${Math.min(G.W * 0.04, G.UI.fonts.large.size)}px ${G.UI.fonts.large.family}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(icon, x - boxWidth + 6, y);

      // 数值
      ctx.fillStyle = colorLight;
      ctx.font = `bold ${Math.min(G.W * 0.032, G.UI.fonts.medium.size)}px ${G.UI.fonts.medium.family}`;
      const displayValue = value >= 10000 ? (value / 10000).toFixed(1) + 'w' : value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value;
      ctx.fillText(displayValue, x - boxWidth + 26, y);
    }

    getHeight() { return this.height; }

    isPointInside(x, y) { return y <= this.height; }
  }

  G.TopBar = TopBar;
})(window.GameApp);
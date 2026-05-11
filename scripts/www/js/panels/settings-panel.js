(function(G) {
  class SettingsPanel {
    constructor() {
      this.visible = false;
      this.alpha = 0;
      this.targetAlpha = 0;
      this.time = 0;
    }

    show() { this.visible = true; this.targetAlpha = 1; }
    
    hide() { this.targetAlpha = 0; }

    update(dt) {
      this.time += dt;
      this.alpha = G.lerp(this.alpha, this.targetAlpha, dt * 10);
      if (this.alpha < 0.01 && this.targetAlpha === 0) this.visible = false;
    }

    draw(ctx) {
      if (!this.visible || this.alpha < 0.01) return;
      
      ctx.save();
      ctx.globalAlpha = this.alpha;

      const bgGrad = ctx.createLinearGradient(0, 0, 0, G.H);
      bgGrad.addColorStop(0, 'rgba(25, 23, 35, 0.98)');
      bgGrad.addColorStop(1, 'rgba(20, 18, 28, 0.98)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, G.W, G.H);

      ctx.fillStyle = '#f0e0c0';
      ctx.font = `bold ${Math.min(G.W * 0.05, 20)}px "STKaiti","KaiTi",sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚙️ 设置面板', G.W / 2, G.H / 2);

      const closeBtnX = 25;
      const closeBtnY = 37;
      ctx.fillStyle = 'rgba(255, 100, 100, 0.7)';
      ctx.beginPath();
      ctx.arc(closeBtnX, closeBtnY, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.min(G.W * 0.04, 18)}px sans-serif`;
      ctx.fillText('×', closeBtnX, closeBtnY + 1);

      ctx.restore();
    }

    handleClick(x, y) {
      if (!this.visible || this.alpha < 0.5) return null;
      
      if (G.dist(x, y, 25, 37) < 16) {
        this.hide();
        return 'close';
      }
      return null;
    }
  }

  G.SettingsPanel = SettingsPanel;
})(window.GameApp);
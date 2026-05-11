(function(G) {
  class LoadingScene {
    constructor() { this.progress = 0; }
    enter() { this.progress = 0; }
    exit() {}
    update(dt) { this.progress += dt * 20; }
    draw(ctx) {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, G.W, G.H);
      
      ctx.fillStyle = '#f0e0c0';
      ctx.font = `bold ${Math.min(G.W * 0.05, 20)}px "STKaiti","KaiTi",sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('加载中...', G.W / 2, G.H / 2 - 30);

      const barW = G.W * 0.6;
      const barH = 12;
      const barX = (G.W - barW) / 2;
      const barY = G.H / 2;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW, barH, 6);
      ctx.fill();

      const progressW = (this.progress / 100) * barW;
      const grad = ctx.createLinearGradient(barX, barY, barX + progressW, barY);
      grad.addColorStop(0, '#4ecdc4');
      grad.addColorStop(1, '#44a08d');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(barX, barY, progressW, barH, 6);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.font = `${Math.min(G.W * 0.03, 12)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.floor(Math.min(100, this.progress))}%`, G.W / 2, barY + barH + 25);
    }
  }
  G.LoadingScene = LoadingScene;
})(window.GameApp);
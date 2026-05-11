(function(G) {
  class WorldScene {
    constructor() { this.time = 0; }
    enter() {}
    exit() {}
    update(dt) { this.time += dt; }
    draw(ctx) {
      const bgGrad = ctx.createLinearGradient(0, 0, 0, G.H);
      bgGrad.addColorStop(0, '#1e3c72');
      bgGrad.addColorStop(1, '#2a5298');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, G.W, G.H);

      ctx.fillStyle = '#f0e0c0';
      ctx.font = `bold ${Math.min(G.W * 0.06, 24)}px "STKaiti","KaiTi",sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🗺️ 世界地图', G.W / 2, G.H / 3);
      
      ctx.font = `${Math.min(G.W * 0.03, 12)}px "STKaiti","KaiTi",sans-serif`;
      ctx.fillStyle = '#c8b898';
      ctx.fillText('点击区域进行探索', G.W / 2, G.H / 2);
    }
    handleClick(x, y) { return null; }
  }
  G.WorldScene = WorldScene;
})(window.GameApp);
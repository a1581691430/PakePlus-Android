(function(G) {
  class HomeScene {
    constructor() { this.time = 0; }
    enter() {}
    exit() {}
    update(dt) { this.time += dt; }
    draw(ctx) {
      const bgGrad = ctx.createLinearGradient(0, 0, 0, G.H);
      bgGrad.addColorStop(0, '#4776e6');
      bgGrad.addColorStop(1, '#8e54e9');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, G.W, G.H);

      ctx.fillStyle = '#f0e0c0';
      ctx.font = `bold ${Math.min(G.W * 0.06, 24)}px "STKaiti","KaiTi",sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🏠 我的家园', G.W / 2, G.H / 3);
      
      ctx.font = `${Math.min(G.W * 0.03, 12)}px "STKaiti","KaiTi",sans-serif`;
      ctx.fillStyle = '#c8b898';
      ctx.fillText('管理你的宠物和家园', G.W / 2, G.H / 2);
    }
    handleClick(x, y) { return null; }
  }
  G.HomeScene = HomeScene;
})(window.GameApp);
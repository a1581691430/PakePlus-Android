(function(G) {
  class StartScene {
    constructor() { this.time = 0; }
    enter() {}
    exit() {}
    update(dt) { this.time += dt; }
    draw(ctx) {
      const bgGrad = ctx.createLinearGradient(0, 0, 0, G.H);
      bgGrad.addColorStop(0, '#1a0a2e');
      bgGrad.addColorStop(1, '#16213e');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, G.W, G.H);

      const pulse = Math.sin(this.time * 2) * 10;
      
      ctx.fillStyle = '#f0e0c0';
      ctx.font = `bold ${Math.min(G.W * 0.08, 32)}px "STKaiti","KaiTi",sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('秘境猎人', G.W / 2, G.H / 3);

      ctx.font = `${Math.min(G.W * 0.04, 16)}px "STKaiti","KaiTi",sans-serif`;
      ctx.fillStyle = '#c8b898';
      ctx.fillText('点击屏幕开始', G.W / 2, G.H * 2 / 3 + Math.sin(this.time) * 5);
    }
    handleClick(x, y) { return 'start'; }
  }
  G.StartScene = StartScene;
})(window.GameApp);
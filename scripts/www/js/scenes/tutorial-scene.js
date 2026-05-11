(function(G) {
  class TutorialScene {
    constructor() { this.step = 0; }
    enter() { this.step = 0; }
    exit() {}
    update(dt) {}
    draw(ctx) {
      const bgGrad = ctx.createLinearGradient(0, 0, 0, G.H);
      bgGrad.addColorStop(0, '#2d132c');
      bgGrad.addColorStop(1, '#801336');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, G.W, G.H);

      ctx.fillStyle = '#f0e0c0';
      ctx.font = `bold ${Math.min(G.W * 0.05, 20)}px "STKaiti","KaiTi",sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('📚 新手教程', G.W / 2, G.H / 4);
      
      ctx.font = `${Math.min(G.W * 0.03, 12)}px "STKaiti","KaiTi",sans-serif`;
      ctx.fillStyle = '#c8b898';
      ctx.fillText('选择你的初始宠物', G.W / 2, G.H / 2);
    }
    handleClick(x, y) { return 'select_pet'; }
  }
  G.TutorialScene = TutorialScene;
})(window.GameApp);
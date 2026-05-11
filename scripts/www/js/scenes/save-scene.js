(function(G) {
  class SaveScene {
    constructor() { this.selectedSlot = null; }
    enter() {}
    exit() {}
    update(dt) {}
    draw(ctx) {
      ctx.fillStyle = 'rgba(26, 26, 46, 0.95)';
      ctx.fillRect(0, 0, G.W, G.H);

      ctx.fillStyle = '#f0e0c0';
      ctx.font = `bold ${Math.min(G.W * 0.05, 20)}px "STKaiti","KaiTi",sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('💾 存档管理', G.W / 2, 60);
    }
    handleClick(x, y) { return null; }
  }
  G.SaveScene = SaveScene;
})(window.GameApp);
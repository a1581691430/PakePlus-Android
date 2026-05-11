(function(G) {
  class BattleScene {
    constructor() { this.time = 0; }
    enter() {}
    exit() {}
    update(dt) { this.time += dt; }
    draw(ctx) {
      const bgGrad = ctx.createLinearGradient(0, 0, 0, G.H);
      bgGrad.addColorStop(0, '#434343');
      bgGrad.addColorStop(1, '#000000');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, G.W, G.H);

      ctx.fillStyle = '#ff6b6b';
      ctx.font = `bold ${Math.min(G.W * 0.06, 24)}px "STKaiti","KaiTi",sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚔️ 战斗中', G.W / 2, G.H / 3);
      
      ctx.font = `${Math.min(G.W * 0.03, 12)}px "STKaiti","KaiTi",sans-serif`;
      ctx.fillStyle = '#fff';
      ctx.fillText('回合制战斗系统', G.W / 2, G.H / 2);
    }
    handleClick(x, y) { return null; }
  }
  G.BattleScene = BattleScene;
})(window.GameApp);
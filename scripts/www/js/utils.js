(function(G) {
  G.generateUUID = function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  G.lerp = function(a, b, t) { return a + (b - a) * t; };

  G.clamp = function(v, min, max) { return Math.max(min, Math.min(max, v)); };

  G.dist = function(x1, y1, x2, y2) { return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2); };

  G.easeInOutCubic = function(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

  G.easeOutExpo = function(t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); };

  // 简单伪随机（用于粒子等）
  G.seededRandom = function(seed) {
    let s = seed;
    return function() {
      s = (s * 16807 + 0) % 2147483647;
      return (s - 1) / 2147483646;
    };
  };
})(window.GameApp);
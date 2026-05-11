(function(G) {
  G.Element = {
    WOOD: { id: 'wood', name: '木', color: '#4CAF50', icon: '🌿', strongAgainst: ['water', 'earth', 'ice'], weakAgainst: ['fire', 'flying', 'machine', 'mystery'] },
    WATER: { id: 'water', name: '水', color: '#2196F3', icon: '💧', strongAgainst: ['fire', 'earth', 'ice'], weakAgainst: ['wood', 'electric', 'dark'] },
    FIRE: { id: 'fire', name: '火', color: '#FF5722', icon: '🔥', strongAgainst: ['wood', 'ice', 'machine'], weakAgainst: ['water', 'earth', 'dragon'] },
    EARTH: { id: 'earth', name: '土', color: '#795548', icon: '⛰️', strongAgainst: ['fire', 'electric', 'machine'], weakAgainst: ['wood', 'water', 'ice', 'flying'] },
    ICE: { id: 'ice', name: '冰', color: '#00BCD4', icon: '❄️', strongAgainst: ['wood', 'flying', 'earth'], weakAgainst: ['fire', 'water', 'machine', 'fight'] },
    ELECTRIC: { id: 'electric', name: '电', color: '#FF9800', icon: '⚡', strongAgainst: ['water', 'flying', 'machine'], weakAgainst: ['wood', 'earth', 'dragon', 'dark'] },
    DIGITAL: { id: 'digital', name: '数码', color: '#9C27B0', icon: '🤖', strongAgainst: ['machine', 'mystery', 'flying'], weakAgainst: ['dark', 'ancient'] },
    MACHINE: { id: 'machine', name: '机械', color: '#607D8B', icon: '🔧', strongAgainst: ['ice', 'flying', 'mystery'], weakAgainst: ['fire', 'earth', 'electric', 'fight'] },
    MYSTERY: { id: 'mystery', name: '神秘', color: '#673AB7', icon: '🔮', strongAgainst: ['wood', 'digital', 'fight'], weakAgainst: ['dark', 'ancient'] },
    FLYING: { id: 'flying', name: '飞行', color: '#03A9F4', icon: '🦅', strongAgainst: ['wood', 'fight', 'earth'], weakAgainst: ['electric', 'ice', 'machine'] },
    REPTILE: { id: 'reptile', name: '爬行', color: '#8BC34A', icon: '🦎', strongAgainst: ['fire', 'electric', 'machine'], weakAgainst: ['water', 'wood', 'ice', 'fight'] },
    ANCIENT: { id: 'ancient', name: '上古', color: '#FFC107', icon: '🏛️', strongAgainst: ['mystery', 'dragon', 'dark'], weakAgainst: ['machine', 'flying', 'reptile'] },
    FIGHT: { id: 'fight', name: '格斗', color: '#F44336', icon: '🥊', strongAgainst: ['ice', 'machine', 'dark', 'dragon'], weakAgainst: ['flying', 'mystery', 'reptile', 'ancient'] },
    DARK: { id: 'dark', name: '暗黑', color: '#3F51B5', icon: '🌑', strongAgainst: ['electric', 'mystery', 'flying', 'dragon'], weakAgainst: ['light', 'fight', 'ancient'] },
    LIGHT: { id: 'light', name: '光明', color: '#FFEB3B', icon: '☀️', strongAgainst: ['dark', 'ancient'], weakAgainst: ['wood', 'fight', 'dragon'] },
    DRAGON: { id: 'dragon', name: '龙', color: '#E91E63', icon: '🐉', strongAgainst: ['fire', 'electric', 'flying'], weakAgainst: ['water', 'ice', 'ancient', 'fight', 'dark'] },
    NORMAL: { id: 'normal', name: '普通', color: '#9E9E9E', icon: '⚪', strongAgainst: [], weakAgainst: [] },
  };

  // 属性克制计算函数
  G.getEffectiveness = function(atkElementId, defElementId) {
    const elements = Object.values(G.Element);
    const atkElement = elements.find(e => e.id === atkElementId);
    const defElement = elements.find(e => e.id === defElementId);
    
    if (!atkElement || !defElement) return 1.0;
    
    // 强效条件：攻击克制防御 或 防御弱攻击
    const atkStrong = atkElement.strongAgainst.includes(defElementId);
    const defWeak = defElement.weakAgainst.includes(atkElementId);
    if (atkStrong || defWeak) return 2.0;
    
    // 弱效条件：攻击被防御克制 或 防御抵抗攻击
    const atkWeak = atkElement.weakAgainst.includes(defElementId);
    const defStrong = defElement.strongAgainst.includes(atkElementId);
    if (atkWeak || defStrong) return 0.5;
    
    return 1.0; // 正常
  };

  // 双属性倍率计算（相乘）
  G.getDoubleEffectiveness = function(atkElementId, defElementIds) {
    if (!Array.isArray(defElementIds) || defElementIds.length === 0) {
      return G.getEffectiveness(atkElementId, defElementIds);
    }
    
    let multiplier = 1.0;
    for (const defId of defElementIds) {
      multiplier *= G.getEffectiveness(atkElementId, defId);
    }
    return multiplier;
  };
})(window.GameApp);
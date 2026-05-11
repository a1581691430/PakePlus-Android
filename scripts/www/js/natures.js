(function(G) {
  G.Natures = [
    // 攻击↑系列
    { id: 'lonely', name: '孤僻', atkMod: 1.1, defMod: 0.9, spaMod: 1.0, resMod: 1.0, spdMod: 1.0 },
    { id: 'adamant', name: '固执', atkMod: 1.1, defMod: 1.0, spaMod: 0.9, resMod: 1.0, spdMod: 1.0 },
    { id: 'naughty', name: '调皮', atkMod: 1.1, defMod: 1.0, spaMod: 1.0, resMod: 0.9, spdMod: 1.0 },
    { id: 'brave', name: '勇敢', atkMod: 1.1, defMod: 1.0, spaMod: 1.0, resMod: 1.0, spdMod: 0.9 },
    
    // 防御↑系列
    { id: 'bold', name: '大胆', atkMod: 0.9, defMod: 1.1, spaMod: 1.0, resMod: 1.0, spdMod: 1.0 },
    { id: 'impish', name: '淘气', atkMod: 1.0, defMod: 1.1, spaMod: 0.9, resMod: 1.0, spdMod: 1.0 },
    { id: 'lax', name: '无虑', atkMod: 1.0, defMod: 1.1, spaMod: 1.0, resMod: 0.9, spdMod: 1.0 },
    { id: 'relaxed', name: '悠闲', atkMod: 1.0, defMod: 1.1, spaMod: 1.0, resMod: 1.0, spdMod: 0.9 },
    
    // 特攻↑系列
    { id: 'modest', name: '保守', atkMod: 0.9, defMod: 1.0, spaMod: 1.1, resMod: 1.0, spdMod: 1.0 },
    { id: 'mild', name: '稳重', atkMod: 1.0, defMod: 0.9, spaMod: 1.1, resMod: 1.0, spdMod: 1.0 },
    { id: 'rash', name: '马虎', atkMod: 1.0, defMod: 1.0, spaMod: 1.1, resMod: 0.9, spdMod: 1.0 },
    { id: 'quiet', name: '冷静', atkMod: 1.0, defMod: 1.0, spaMod: 1.1, resMod: 1.0, spdMod: 0.9 },
    
    // 特防↑系列
    { id: 'careful', name: '沉着', atkMod: 0.9, defMod: 1.0, spaMod: 1.0, resMod: 1.1, spdMod: 1.0 },
    { id: 'gentle', name: '温顺', atkMod: 1.0, defMod: 0.9, spaMod: 1.0, resMod: 1.1, spdMod: 1.0 },
    { id: 'sassy', name: '慎重', atkMod: 1.0, defMod: 1.0, spaMod: 0.9, resMod: 1.1, spdMod: 1.0 },
    { id: 'arrogant', name: '狂妄', atkMod: 1.0, defMod: 1.0, spaMod: 1.0, resMod: 1.1, spdMod: 0.9 },
    
    // 速度↑系列
    { id: 'timid', name: '胆小', atkMod: 0.9, defMod: 1.0, spaMod: 1.0, resMod: 1.0, spdMod: 1.1 },
    { id: 'hasty', name: '急躁', atkMod: 1.0, defMod: 0.9, spaMod: 1.0, resMod: 1.0, spdMod: 1.1 },
    { id: 'jolly', name: '开朗', atkMod: 1.0, defMod: 1.0, spaMod: 0.9, resMod: 1.0, spdMod: 1.1 },
    { id: 'naive', name: '天真', atkMod: 1.0, defMod: 1.0, spaMod: 1.0, resMod: 0.9, spdMod: 1.1 },
    
    // 平衡性格（无加成）
    { id: 'hardy', name: '坦率', atkMod: 1.0, defMod: 1.0, spaMod: 1.0, resMod: 1.0, spdMod: 1.0 },
    { id: 'bashful', name: '害羞', atkMod: 1.0, defMod: 1.0, spaMod: 1.0, resMod: 1.0, spdMod: 1.0 },
    { id: 'docile', name: '认真', atkMod: 1.0, defMod: 1.0, spaMod: 1.0, resMod: 1.0, spdMod: 1.0 },
    { id: 'quirky', name: '实干', atkMod: 1.0, defMod: 1.0, spaMod: 1.0, resMod: 1.0, spdMod: 1.0 },
    { id: 'serious', name: '浮躁', atkMod: 1.0, defMod: 1.0, spaMod: 1.0, resMod: 1.0, spdMod: 1.0 },
  ];
})(window.GameApp);
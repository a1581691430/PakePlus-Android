(function(G) {
  const SAVE_VERSION = 1;
  const SAVE_SLOTS = ['slot_1', 'slot_2', 'slot_3'];
  const AUTO_SAVE_SLOT = 'auto';
  const AUTO_SAVE_INTERVAL = 60;

  class GameState {
    constructor() {
      this.playerData = {
        name: '猎人',
        level: 1,
        exp: 0,
        expToNext: 100,
        gold: 500,
        diamond: 0,
        avatarSeed: Math.floor(Math.random() * 99999)
      };
      this.petManager = new G.PetManager();
      this.bagManager = new G.BagManager();
      this.tutorialCompleted = false;
      this.currentScene = 'tutorial';
      this.worldProgress = {
        unlockedRegions: [],
        areaStates: {}
      };
    }

    toJSON() {
      return {
        version: SAVE_VERSION,
        playerData: { ...this.playerData },
        petManager: this.petManager.toJSON(),
        bagManager: this.bagManager.toJSON(),
        tutorialCompleted: this.tutorialCompleted,
        currentScene: this.currentScene,
        worldProgress: this.worldProgress
      };
    }

    static fromJSON(data) {
      const state = new GameState();
      Object.assign(state.playerData, data.playerData);
      state.petManager = G.PetManager.fromJSON(data.petManager);
      state.bagManager = G.BagManager.fromJSON(data.bagManager);
      state.tutorialCompleted = data.tutorialCompleted;
      state.currentScene = data.currentScene;
      state.worldProgress = data.worldProgress || { unlockedRegions: [], areaStates: {} };
      return state;
    }

    static createNew() {
      return new GameState();
    }
  }

  class SaveManager {
    constructor() {
      this.currentSlotId = null;
      this.playTime = 0;
      this.lastAutoSaveTime = 0;
      this.autoSaveTimer = 0;
    }

    saveToSlot(slotId, slotName, gameState) {
      try {
        const saveData = {
          ...gameState.toJSON(),
          slotId: slotId,
          slotName: slotName || `冒险笔记 ${slotId.replace('slot_', '')}`,
          timestamp: Date.now(),
          playTime: this.playTime
        };
        localStorage.setItem(slotId, JSON.stringify(saveData));
        console.log(`✅ 存档成功: ${slotId}`);
        return { success: true };
      } catch (e) {
        console.error('❌ 存档失败:', e);
        return { success: false, reason: 'storage_full' };
      }
    }

    autoSave(gameState) {
      if (!this.currentSlotId) {
        console.warn('⚠️ 自动保存失败：未选择存档档位');
        return { success: false, reason: 'no_slot_selected' };
      }
      const result = this.saveToSlot(this.currentSlotId, null, gameState);
      if (result.success) {
        this.lastAutoSaveTime = Date.now();
        this.autoSaveTimer = 0;
      }
      return result;
    }

    loadFromSlot(slotId) {
      try {
        const json = localStorage.getItem(slotId);
        if (!json) return null;

        let data = JSON.parse(json);
        data = this.migrateSaveData(data);
        return data;
      } catch (e) {
        console.error('❌ 读档失败:', e);
        return null;
      }
    }

    migrateSaveData(data) {
      if (!data.version || data.version < SAVE_VERSION) {
        console.log(`🔄 升级存档版本: ${data.version || 0} → ${SAVE_VERSION}`);
        if (!data.worldProgress) {
          data.worldProgress = { unlockedRegions: [], areaStates: {} };
        }
        if (!data.playerData.avatarSeed) {
          data.playerData.avatarSeed = Math.floor(Math.random() * 99999);
        }
        data.version = SAVE_VERSION;
      }
      return data;
    }

    restoreGameState(saveData) {
      if (!saveData) return null;

      try {
        const state = GameState.fromJSON(saveData);
        this.playTime = saveData.playTime || 0;
        this.currentSlotId = saveData.slotId;
        console.log(`📂 存档恢复成功: ${saveData.slotName}`);
        return state;
      } catch (e) {
        console.error('❌ 恢复游戏状态失败:', e);
        return null;
      }
    }

    deleteSlot(slotId) {
      try {
        localStorage.removeItem(slotId);
        console.log(`🗑️ 删除存档: ${slotId}`);
        return true;
      } catch (e) {
        console.error('❌ 删除存档失败:', e);
        return false;
      }
    }

    getSlotInfo(slotId) {
      const data = this.loadFromSlot(slotId);
      if (!data) return null;

      return {
        slotId: data.slotId,
        slotName: data.slotName,
        timestamp: data.timestamp,
        playTime: data.playTime,
        playerLevel: data.playerData.level,
        playerName: data.playerData.name,
        avatarSeed: data.playerData.avatarSeed,
        teamSize: data.petManager.team.length,
        gold: data.playerData.gold,
        diamond: data.playerData.diamond
      };
    }

    hasSlot(slotId) {
      return localStorage.getItem(slotId) !== null;
    }

    updateAutoSaveTimer(dt, gameState) {
      this.autoSaveTimer += dt;
      this.playTime += dt;

      if (this.autoSaveTimer >= AUTO_SAVE_INTERVAL && gameState) {
        this.autoSave(gameState);
      }
    }

    resetAutoSaveTimer() {
      this.autoSaveTimer = 0;
    }

    formatPlayTime(seconds) {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      if (hours > 0) {
        return `${hours}小时${minutes}分`;
      }
      return `${minutes}分`;
    }

    formatTimestamp(timestamp) {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now - timestamp;

      if (diff < 60000) return '刚刚';
      if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
      if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;

      return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
    }
  }

  // 全局状态变量和访问函数
  let gs = null;

  function getGameState() {
    if (!gs) {
      console.warn('⚠️ 尝试访问未初始化的 GameState');
      return null;
    }
    return gs;
  }

  function setGameState(newState) {
    if (newState === null) {
      console.log('🗑️ GameState 已清空（返回开始场景）');
    } else if (!(newState instanceof GameState)) {
      console.error('❌ setGameState: 无效的状态对象');
      return false;
    } else {
      console.log('✅ GameState 已更新');
    }
    gs = newState;
    return true;
  }

  function requireGameState() {
    if (!gs) {
      throw new Error('GameState 未初始化，无法执行此操作');
    }
    return gs;
  }

  // 辅助函数
  function initTestPets() {
    console.log('🎮 新手引导模式：等待玩家选择初始宠物');
  }

  function giveStarterItems(gameState) {
    gameState.bagManager.addItem('normal_ball', 15);
    gameState.bagManager.addItem('great_ball', 5);
    gameState.bagManager.addItem('ultra_ball', 2);
    gameState.bagManager.addItem('hp_potion', 10);
    gameState.bagManager.addItem('super_potion', 3);
    gameState.bagManager.addItem('pp_restore', 5);
    gameState.bagManager.addItem('revive', 2);
    gameState.bagManager.addItem('normal_bait', 8);
    gameState.bagManager.addItem('skill_stone', 1);
    gameState.bagManager.addItem('exp_candy', 5);
  }

  // 挂载到 GameApp
  G.GameState = GameState;
  G.SaveManager = SaveManager;
  G.SAVE_VERSION = SAVE_VERSION;
  G.SAVE_SLOTS = SAVE_SLOTS;
  
  // 状态访问函数
  G.getGameState = getGameState;
  G.setGameState = setGameState;
  G.requireGameState = requireGameState;
  G.initTestPets = initTestPets;
  G.giveStarterItems = giveStarterItems;
})(window.GameApp);
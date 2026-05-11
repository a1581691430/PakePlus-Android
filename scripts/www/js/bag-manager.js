(function(G) {
  class BagManager {
    constructor() {
      this.items = {};
      this.maxSlots = 32;
    }

    addItem(itemId, count = 1) {
      const item = G.ItemsDB[itemId];
      if (!item) return { success: false, reason: 'invalid_item' };
      
      if (!this.items[itemId]) {
        if (this.getUsedSlots() >= this.maxSlots) {
          return { success: false, reason: 'bag_full' };
        }
        this.items[itemId] = 0;
      }
      
      const newCount = this.items[itemId] + count;
      this.items[itemId] = Math.min(newCount, item.maxStack);
      
      return { success: true, count: this.items[itemId] };
    }

    removeItem(itemId, count = 1) {
      if (!this.items[itemId] || this.items[itemId] < count) {
        return { success: false, reason: 'not_enough' };
      }
      this.items[itemId] -= count;
      if (this.items[itemId] <= 0) {
        delete this.items[itemId];
      }
      return { success: true };
    }

    getItemCount(itemId) {
      return this.items[itemId] || 0;
    }

    getUsedSlots() {
      return Object.keys(this.items).length;
    }

    getItemsByType(type) {
      const result = [];
      for (const itemId in this.items) {
        const item = G.ItemsDB[itemId];
        if (item && item.type === type) {
          result.push({ item, count: this.items[itemId] });
        }
      }
      return result;
    }

    getAllItems() {
      const result = [];
      for (const itemId in this.items) {
        const item = G.ItemsDB[itemId];
        if (item) {
          result.push({ item, count: this.items[itemId] });
        }
      }
      return result;
    }

    toJSON() {
      return { items: this.items };
    }

    static fromJSON(data) {
      const manager = new BagManager();
      if (data.items) {
        manager.items = data.items;
      }
      return manager;
    }
  }

  G.BagManager = BagManager;
})(window.GameApp);
(function(G) {
  class PetManager {
    constructor() {
      this.warehouse = [];
      this.team = [];
      this.maxTeamSize = 4;
      this.maxWarehouseSize = 50;
    }

    addToWarehouse(pet) {
      if (this.warehouse.length >= this.maxWarehouseSize) {
        return { success: false, reason: 'warehouse_full' };
      }
      this.warehouse.push(pet);
      return { success: true };
    }

    addToTeam(pet) {
      if (this.team.length >= this.maxTeamSize) {
        return { success: false, reason: 'team_full' };
      }
      const idx = this.warehouse.indexOf(pet);
      if (idx !== -1) {
        this.warehouse.splice(idx, 1);
      }
      this.team.push(pet);
      return { success: true };
    }

    removeFromTeam(petId) {
      if (this.warehouse.length >= this.maxWarehouseSize) {
        return { success: false, reason: 'warehouse_full' };
      }
      const idx = this.team.findIndex(p => p.id === petId);
      if (idx === -1) {
        return { success: false, reason: 'not_in_team' };
      }
      const pet = this.team.splice(idx, 1)[0];
      this.warehouse.push(pet);
      return { success: true, pet };
    }

    swapTeamMember(petId, newPet) {
      const idx = this.team.findIndex(p => p.id === petId);
      if (idx === -1) {
        return { success: false, reason: 'not_in_team' };
      }
      const oldPet = this.team[idx];
      const newIdx = this.warehouse.indexOf(newPet);
      if (newIdx !== -1) {
        this.warehouse.splice(newIdx, 1);
      }
      this.team[idx] = newPet;
      this.warehouse.push(oldPet);
      return { success: true, oldPet };
    }

    setCaptain(petId) {
      const idx = this.team.findIndex(p => p.id === petId);
      if (idx === -1) {
        return { success: false, reason: 'not_in_team' };
      }
      if (idx === 0) {
        return { success: false, reason: 'already_captain' };
      }
      const pet = this.team.splice(idx, 1)[0];
      this.team.unshift(pet);
      return { success: true };
    }

    getPetById(petId) {
      let pet = this.team.find(p => p.id === petId);
      if (pet) return pet;
      return this.warehouse.find(p => p.id === petId);
    }

    getFirstHealthyTeamMember() {
      return this.team.find(p => !p.isFainted());
    }

    healAllTeam() {
      for (const pet of this.team) {
        pet.healFully();
      }
    }

    sortWarehouse(by = 'time') {
      switch (by) {
        case 'time':
          this.warehouse.sort((a, b) => b.metTime - a.metTime);
          break;
        case 'level':
          this.warehouse.sort((a, b) => b.level - a.level);
          break;
        case 'name':
          this.warehouse.sort((a, b) => a.name.localeCompare(b.name));
          break;
      }
    }

    toJSON() {
      return {
        warehouse: this.warehouse.map(p => p.toJSON()),
        team: this.team.map(p => p.toJSON()),
      };
    }

    static fromJSON(data) {
      const manager = new PetManager();
      if (data.warehouse) {
        manager.warehouse = data.warehouse.map(p => G.Pet.fromJSON(p));
      }
      if (data.team) {
        manager.team = data.team.map(p => G.Pet.fromJSON(p));
      }
      return manager;
    }
  }

  G.PetManager = PetManager;
})(window.GameApp);
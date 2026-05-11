(function(G) {
  class Pet {
    constructor(options = {}) {
      this.id = options.id || G.generateUUID();
      this.speciesId = options.speciesId;
      this.species = G.SpeciesDB[options.speciesId];
      this.customName = options.customName || null;
      this.level = options.level || 1;
      this.exp = options.exp || 0;
      this.ivs = options.ivs || this.generateIVs();
      this.evs = options.evs || this.generateEVs();
      this.trainingPoints = options.trainingPoints || 0;
      this.nature = options.nature || G.Natures[Math.floor(Math.random() * G.Natures.length)];
      this.randomSkills = options.randomSkills || [];
      this.fixedSkillCooldown = options.fixedSkillCooldown || 0;
      this.currentHp = options.currentHp !== undefined ? options.currentHp : this.getMaxHp();
      this.status = options.status || null;
      this.metLocation = options.metLocation || '未知';
      this.metTime = options.metTime || Date.now();
      this.isNew = options.isNew !== undefined ? options.isNew : true;
    }

    generateEVs() {
      return { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, res: 0 };
    }

    getTotalEVs() {
      return Object.values(this.evs).reduce((sum, ev) => sum + ev, 0);
    }

    addEV(stat, amount) {
      const maxIndividual = 255;
      const maxTotal = 510;
      const currentTotal = this.getTotalEVs();
      const canAdd = Math.min(amount, maxIndividual - this.evs[stat], maxTotal - currentTotal);
      if (canAdd > 0) {
        this.evs[stat] += canAdd;
        return { success: true, added: canAdd };
      }
      return { success: false, reason: 'ev_max' };
    }

    resetEVs() {
      this.evs = this.generateEVs();
      return { success: true };
    }

    addTrainingPoints(amount) {
      this.trainingPoints += amount;
      return { success: true, added: amount };
    }

    allocateTrainingPoint(stat) {
      if (this.trainingPoints <= 0) {
        return { success: false, reason: '没有可分配的修行点' };
      }
      const result = this.addEV(stat, 1);
      if (result.success) {
        this.trainingPoints -= 1;
      }
      return result;
    }

    get name() {
      return this.customName || this.species.name;
    }

    generateIVs() {
      return {
        hp: Math.floor(Math.random() * 63),
        atk: Math.floor(Math.random() * 63),
        def: Math.floor(Math.random() * 63),
        spa: Math.floor(Math.random() * 63),
        spd: Math.floor(Math.random() * 63),
        res: Math.floor(Math.random() * 63),
      };
    }

    getBaseStat(stat) {
      return this.species.baseStats[stat] || 10;
    }

    getStat(stat) {
      const base = this.getBaseStat(stat);
      const iv = this.ivs[stat] || 0;
      const ev = this.evs[stat] || 0;
      const level = this.level;
      let value = Math.floor((base * 2 + iv + Math.floor(ev / 4)) * level / 100 + 5);
      if (stat === 'hp') {
        value = Math.floor((base * 2 + iv + Math.floor(ev / 4)) * level / 100 + level + 10);
      }
      if (stat === 'atk') value = Math.floor(value * this.nature.atkMod);
      if (stat === 'def') value = Math.floor(value * this.nature.defMod);
      if (stat === 'spa') value = Math.floor(value * this.nature.spaMod);
      if (stat === 'res') value = Math.floor(value * (this.nature.resMod || 1));
      if (stat === 'spd') value = Math.floor(value * this.nature.spdMod);
      return Math.max(1, value);
    }

    getMaxHp() { return this.getStat('hp'); }
    getAtk() { return this.getStat('atk'); }
    getDef() { return this.getStat('def'); }
    getSpa() { return this.getStat('spa'); }
    getRes() { return this.getStat('res'); }
    getSpd() { return this.getStat('spd'); }

    getExpToNextLevel() {
      if (this.level >= 100) return 0;
      return Math.floor(480 + this.level * this.level * 1.35);
    }

    getExpProgress() {
      const expToNext = this.getExpToNextLevel();
      if (expToNext === 0) return 1;
      return Math.min(1, this.exp / expToNext);
    }

    addExp(amount) {
      if (this.level >= 100) return false;
      this.exp += amount;
      let leveledUp = false;
      while (this.exp >= this.getExpToNextLevel() && this.level < 100) {
        this.exp -= this.getExpToNextLevel();
        this.level++;
        this.currentHp = this.getMaxHp();
        leveledUp = true;
      }
      return leveledUp;
    }

    getAllSkills() {
      const skills = [{ ...this.species.fixedSkill, isFixed: true, currentPp: this.species.fixedSkill.pp }];
      for (const skillId of this.randomSkills) {
        const skill = G.SkillsDB[skillId];
        if (skill) {
          skills.push({ ...skill, isFixed: false, currentPp: skill.pp });
        }
      }
      return skills;
    }

    getTalentRating() {
      const arr = Object.values(this.ivs);
      const sum = arr.reduce((a, b) => a + b, 0);
      const allHigh = arr.every(v => v >= 51);
      if (allHigh) return { rating: '王者无敌', color: '#FFD700' };
      if (sum >= 300) return { rating: '万众瞩目', color: '#9945FF' };
      if (sum >= 225) return { rating: '千载难逢', color: '#3B82F6' };
      if (sum >= 150) return { rating: '百里挑一', color: '#22C55E' };
      if (sum >= 75) return { rating: '十分常见', color: '#FFFFFF' };
      return { rating: '一无是处', color: '#9CA3AF' };
    }

    getTalentStars(statKey) {
      const v = this.ivs[statKey] || 0;
      if (v >= 50) return 5;
      if (v >= 38) return 4;
      if (v >= 26) return 3;
      if (v >= 14) return 2;
      return 1;
    }

    getTalentSum() {
      return Object.values(this.ivs).reduce((a, b) => a + b, 0);
    }

    getTalentBonus(stat) {
      const iv = this.ivs[stat] || 0;
      const level = this.level;
      if (stat === 'hp') {
        return Math.floor((iv * level) / 100) + level;
      }
      return Math.floor((iv * level) / 100);
    }

    learnSkill(skillId) {
      if (this.randomSkills.length >= 3) {
        return { success: false, reason: 'skill_full' };
      }
      if (this.randomSkills.includes(skillId)) {
        return { success: false, reason: 'already_learned' };
      }
      this.randomSkills.push(skillId);
      return { success: true };
    }

    replaceSkill(index, newSkillId) {
      if (index < 0 || index >= this.randomSkills.length) {
        return { success: false, reason: 'invalid_index' };
      }
      this.randomSkills[index] = newSkillId;
      return { success: true };
    }

    useSkill(skillIndex) {
      const skills = this.getAllSkills();
      const skill = skills[skillIndex];
      if (!skill) return { success: false, reason: 'no_skill' };
      if (skill.currentPp <= 0) {
        return { success: false, reason: 'no_pp' };
      }
      skill.currentPp--;
      return { success: true, skill };
    }

    rechargePp(amount = 2) {
      const skills = this.getAllSkills();
      for (const skill of skills) {
        skill.currentPp = Math.min(skill.pp, skill.currentPp + amount);
      }
    }

    resetCooldown() { this.fixedSkillCooldown = 0; }

    resetTalent() {
      this.ivs = this.generateIVs();
      return { success: true };
    }

    boostTalent() {
      const stats = ['hp', 'atk', 'def', 'spa', 'spd', 'res'];
      const availableStats = stats.filter(s => this.ivs[s] < 62);
      
      if (availableStats.length === 0) {
        return { success: false, reason: 'max_talent' };
      }
      
      const statToBoost = availableStats[Math.floor(Math.random() * availableStats.length)];
      const boostAmount = Math.floor(Math.random() * 10) + 5;
      this.ivs[statToBoost] = Math.min(62, this.ivs[statToBoost] + boostAmount);
      
      const statNames = { hp: 'HP', atk: '攻击', def: '防御', spa: '特攻', spd: '速度', res: '特防' };
      return { 
        success: true, 
        stat: statToBoost, 
        statName: statNames[statToBoost],
        amount: boostAmount,
        newValue: this.ivs[statToBoost]
      };
    }

    takeDamage(amount) {
      this.currentHp = Math.max(0, this.currentHp - amount);
      return this.currentHp <= 0;
    }

    heal(amount) {
      this.currentHp = Math.min(this.getMaxHp(), this.currentHp + amount);
    }

    healFully() {
      this.currentHp = this.getMaxHp();
      this.status = null;
      this.rechargePp(100);
      this.resetCooldown();
    }

    applyStatus(status) { this.status = status; }
    clearStatus() { this.status = null; }
    isFainted() { return this.currentHp <= 0; }
    rename(newName) { this.customName = newName; }

    getDisplayInfo() {
      return {
        id: this.id,
        name: this.name,
        speciesName: this.species.name,
        level: this.level,
        exp: this.exp,
        expToNext: this.getExpToNextLevel(),
        element: this.species.element,
        hp: this.currentHp,
        maxHp: this.getMaxHp(),
        atk: this.getAtk(),
        def: this.getDef(),
        spd: this.getSpd(),
        nature: this.nature,
        skills: this.getAllSkills(),
        status: this.status,
        isNew: this.isNew,
        metLocation: this.metLocation,
        metTime: this.metTime,
      };
    }

    toJSON() {
      return {
        id: this.id,
        speciesId: this.speciesId,
        customName: this.customName,
        level: this.level,
        exp: this.exp,
        ivs: this.ivs,
        evs: this.evs,
        trainingPoints: this.trainingPoints,
        natureId: this.nature.id,
        randomSkills: this.randomSkills,
        fixedSkillCooldown: this.fixedSkillCooldown,
        currentHp: this.currentHp,
        status: this.status,
        metLocation: this.metLocation,
        metTime: this.metTime,
        isNew: this.isNew,
      };
    }

    static fromJSON(data) {
      const nature = G.Natures.find(n => n.id === data.natureId) || G.Natures[0];
      
      const ivs = data.ivs || {};
      const evs = data.evs || {};
      
      const defaultIvs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, res: 0 };
      const defaultEvs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, res: 0 };
      
      return new Pet({
        id: data.id,
        speciesId: data.speciesId,
        customName: data.customName,
        level: data.level,
        exp: data.exp,
        ivs: { ...defaultIvs, ...ivs },
        evs: { ...defaultEvs, ...evs },
        trainingPoints: data.trainingPoints || 0,
        nature: nature,
        randomSkills: data.randomSkills || [],
        fixedSkillCooldown: data.fixedSkillCooldown || 0,
        currentHp: data.currentHp,
        status: data.status || null,
        metLocation: data.metLocation,
        metTime: data.metTime,
        isNew: data.isNew,
      });
    }

    static createRandom(speciesId, level = 1, location = '未知') {
      const species = G.SpeciesDB[speciesId];
      if (!species) return null;
      const pet = new Pet({
        speciesId: speciesId,
        level: level,
        metLocation: location,
      });
      const skillPool = [...species.skillPool];
      const numSkills = Math.min(2, skillPool.length);
      for (let i = 0; i < numSkills; i++) {
        const idx = Math.floor(Math.random() * skillPool.length);
        pet.learnSkill(skillPool.splice(idx, 1)[0]);
      }
      return pet;
    }
  }

  G.Pet = Pet;
})(window.GameApp);
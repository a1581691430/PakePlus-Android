(function(G) {
  class WarehousePanel {
    constructor() {
      this.visible = false;
      this.alpha = 0;
      this.targetAlpha = 0;
      this.scrollY = 0;
      this.targetScrollY = 0;
      this.maxScrollY = 0;
      this.gridCols = 4;
      this.cellSize = 70;
      this.cellGap = 8;
      this.selectedPet = null;
      this.showDetail = false;
      this.detailAlpha = 0;
      this.sortBy = 'time';
      this.filterElement = null;
      this.headerHeight = 75;
      this.footerHeight = 40;
      this.padding = 10;
      this.isDragging = false;
      this.dragStartY = 0;
      this.dragStartScroll = 0;
      this.time = 0;
      this.hoveredCell = null;
    }

    show() {
      this.visible = true;
      this.targetAlpha = 1;
      this.selectedPet = null;
      this.showDetail = false;
      this.scrollY = 0;
      this.targetScrollY = 0;
    }

    hide() {
      this.alpha = 0;
      this.targetAlpha = 0;
      this.visible = false;
      this.showDetail = false;
    }

    update(dt) {
      this.time += dt;
      this.alpha = G.lerp(this.alpha, this.targetAlpha, dt * 10);
      if (this.alpha < 0.01 && this.targetAlpha === 0) {
        this.visible = false;
      }
      this.scrollY = G.lerp(this.scrollY, this.targetScrollY, dt * 15);
      this.scrollY = G.clamp(this.scrollY, 0, this.maxScrollY);
      if (this.showDetail) {
        this.detailAlpha = G.lerp(this.detailAlpha, 1, dt * 8);
      } else {
        this.detailAlpha = G.lerp(this.detailAlpha, 0, dt * 10);
      }
    }

    getFilteredPets() {
      const gs = G.getGameState();
      let pets = [...gs.petManager.warehouse];
      if (this.filterElement) {
        pets = pets.filter(p => p.species.element.id === this.filterElement);
      }
      switch (this.sortBy) {
        case 'time':
          pets.sort((a, b) => b.metTime - a.metTime);
          break;
        case 'level':
          pets.sort((a, b) => b.level - a.level);
          break;
        case 'name':
          pets.sort((a, b) => a.name.localeCompare(b.name));
          break;
      }
      return pets;
    }

    draw(ctx) {
      if (!this.visible || this.alpha < 0.01) return;

      ctx.save();
      ctx.globalAlpha = this.alpha;

      const panelX = 0;
      const panelY = 0;
      const panelW = G.W;
      const panelH = G.H;

      const bgGrad = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
      bgGrad.addColorStop(0, 'rgba(30, 28, 40, 0.95)');
      bgGrad.addColorStop(1, 'rgba(25, 23, 35, 0.95)');
      ctx.fillStyle = bgGrad;
      ctx.beginPath();
      ctx.roundRect(panelX, panelY, panelW, panelH, 15);
      ctx.fill();

      ctx.strokeStyle = 'rgba(180, 160, 140, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(panelX, panelY, panelW, panelH, 15);
      ctx.stroke();

      this.drawHeader(ctx, panelX, panelY, panelW);

      const contentY = panelY + this.headerHeight;
      const contentH = panelH - this.headerHeight - this.footerHeight;
      
      ctx.save();
      ctx.beginPath();
      ctx.rect(panelX, contentY, panelW, contentH);
      ctx.clip();

      this.drawGrid(ctx, panelX, contentY, panelW, contentH);

      ctx.restore();

      this.drawFooter(ctx, panelX, panelY + panelH - this.footerHeight, panelW);

      if (this.detailAlpha > 0.01 && this.selectedPet) {
        this.drawDetailPanel(ctx, panelX, panelY, panelW, panelH);
      }

      ctx.restore();
    }

    drawHeader(ctx, x, y, w) {
      ctx.fillStyle = 'rgba(40, 38, 50, 0.8)';
      ctx.beginPath();
      ctx.roundRect(x + 5, y + 5, w - 10, this.headerHeight - 5, 10);
      ctx.fill();

      const closeBtnX = x + 25;
      const closeBtnY = y + this.headerHeight / 2;
      ctx.fillStyle = 'rgba(255, 100, 100, 0.6)';
      ctx.beginPath();
      ctx.arc(closeBtnX, closeBtnY, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.min(G.W * 0.03, 14)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('×', closeBtnX, closeBtnY + 1);

      ctx.fillStyle = '#f0e0c0';
      ctx.font = `bold ${Math.min(G.W * 0.04, 16)}px "STKaiti","KaiTi",sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('📦 仓库', x + 55, y + this.headerHeight / 2);

      const sortBtns = [
        { id: 'time', label: '时间' },
        { id: 'level', label: '等级' },
        { id: 'name', label: '名称' },
      ];
      let btnX = x + w - 20;
      ctx.font = `${Math.min(G.W * 0.025, 10)}px "STKaiti","KaiTi",sans-serif`;
      ctx.textAlign = 'right';
      for (const btn of sortBtns) {
        const isActive = this.sortBy === btn.id;
        ctx.fillStyle = isActive ? '#ffd700' : '#a0a0a0';
        ctx.fillText(btn.label, btnX, y + this.headerHeight / 2);
        btnX -= 45;
      }
      ctx.fillText('排序:', btnX, y + this.headerHeight / 2);
    }

    drawGrid(ctx, panelX, contentY, panelW, contentH) {
      const pets = this.getFilteredPets();
      const cols = this.gridCols;
      const cellW = (panelW - this.padding * 2 - this.cellGap * (cols - 1)) / cols;
      const cellH = cellW;
      const rows = Math.ceil(pets.length / cols);
      this.maxScrollY = Math.max(0, rows * (cellH + this.cellGap) - contentH + this.padding);

      for (let i = 0; i < pets.length; i++) {
        const pet = pets[i];
        const col = i % cols;
        const row = Math.floor(i / cols);
        const cellX = panelX + this.padding + col * (cellW + this.cellGap);
        const cellY = contentY + this.padding + row * (cellH + this.cellGap) - this.scrollY;

        if (cellY + cellH < contentY || cellY > contentY + contentH) continue;

        this.drawPetCell(ctx, pet, cellX, cellY, cellW, cellH, i);
      }

      if (pets.length === 0) {
        ctx.fillStyle = '#808080';
        ctx.font = `${Math.min(G.W * 0.035, 14)}px "STKaiti","KaiTi",sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('仓库空空如也...', panelX + panelW / 2, contentY + contentH / 2);
      }
    }

    drawPetCell(ctx, pet, x, y, w, h, index) {
      const isSelected = this.selectedPet && this.selectedPet.id === pet.id;
      const isHovered = this.hoveredCell === index;
      const pulse = Math.sin(this.time * 3 + index * 0.5) * 0.05;

      ctx.fillStyle = isSelected ? 'rgba(255, 200, 100, 0.2)' : 
                      isHovered ? 'rgba(100, 90, 80, 0.5)' : 
                      'rgba(50, 48, 60, 0.8)';
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 8);
      ctx.fill();

      if (isSelected) {
        ctx.strokeStyle = 'rgba(255, 200, 100, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 8);
        ctx.stroke();
      }

      if (pet.isNew) {
        ctx.fillStyle = `rgba(255, 215, 0, ${0.6 + pulse * 2})`;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 8);
        ctx.fill();
      }

      const element = pet.species.element;
      ctx.fillStyle = element.color;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h * 0.35, w * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.font = `${Math.min(G.W * 0.08, 32)}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const iconSize = Math.min(G.W * 0.08, 32) * 1.8;
      const iconX = x + w / 2;
      const iconY = y + h * 0.35;
      
      if (!G.drawCustomPetIcon(ctx, pet.speciesId, iconX, iconY, iconSize)) {
        const petIcon = this.getPetIcon(pet.speciesId);
        ctx.fillText(petIcon, iconX, iconY);
      }

      ctx.fillStyle = '#f0e0c0';
      ctx.font = `bold ${Math.min(G.W * 0.025, 10)}px "STKaiti","KaiTi",sans-serif`;
      ctx.fillText(pet.name, x + w / 2, y + h * 0.62);

      ctx.fillStyle = '#a0a0a0';
      ctx.font = `${Math.min(G.W * 0.022, 9)}px "STKaiti","KaiTi",sans-serif`;
      ctx.fillText(`Lv.${pet.level}`, x + w / 2, y + h * 0.78);

      ctx.fillStyle = element.color;
      ctx.beginPath();
      ctx.arc(x + w - 10, y + 10, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `${Math.min(G.W * 0.018, 7)}px sans-serif`;
      ctx.fillText(element.name[0], x + w - 10, y + 11);

      if (pet.isNew) {
        ctx.fillStyle = '#ff6b6b';
        ctx.font = `bold ${Math.min(G.W * 0.02, 8)}px sans-serif`;
        ctx.fillText('NEW', x + w / 2, y + h - 8);
      }
    }

    getPetIcon(speciesId) {
      const icons = {
        fire_fox: '🔥',
        ripple_turtle: '💧',
        sprout_deer: '🐰',
        shadow_mouse: '🐭',
        light_sparrow: '🐦',
      };
      return icons[speciesId] || '🐾';
    }

    drawFooter(ctx, x, y, w) {
      const gs = G.getGameState();
      ctx.fillStyle = 'rgba(40, 38, 50, 0.8)';
      ctx.beginPath();
      ctx.roundRect(x + 5, y + 5, w - 10, this.footerHeight - 5, 10);
      ctx.fill();

      const count = gs.petManager.warehouse.length;
      const max = gs.petManager.maxWarehouseSize;
      ctx.fillStyle = count >= max ? '#ff6b6b' : '#c8b898';
      ctx.font = `${Math.min(G.W * 0.028, 11)}px "STKaiti","KaiTi",sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`容量: ${count} / ${max}`, x + w / 2, y + this.footerHeight / 2);
    }

    drawDetailPanel(ctx, panelX, panelY, panelW, panelH) {
      ctx.globalAlpha = this.detailAlpha;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(panelX, panelY, panelW, panelH);

      const pet = this.selectedPet;
      const detailW = Math.min(320, panelW * 0.9);
      const detailH = Math.min(450, panelH * 0.85);  // 增加高度以容纳按钮
      const detailX = panelX + (panelW - detailW) / 2;
      const detailY = panelY + (panelH - detailH) / 2;

      const bgGrad = ctx.createLinearGradient(detailX, detailY, detailX, detailY + detailH);
      bgGrad.addColorStop(0, 'rgba(25, 23, 35, 0.98)');
      bgGrad.addColorStop(1, 'rgba(20, 18, 28, 0.98)');
      ctx.fillStyle = bgGrad;
      ctx.beginPath();
      ctx.roundRect(detailX, detailY, detailW, detailH, 15);
      ctx.fill();

      ctx.strokeStyle = 'rgba(100, 90, 80, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(detailX, detailY, detailW, detailH, 15);
      ctx.stroke();

      // 头部区域
      const headerH = 100;
      const element = pet.species.element;
      
      ctx.font = `${Math.min(G.W * 0.12, 48)}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const detailIconSize = Math.min(G.W * 0.12, 48) * 1.8;
      const detailIconX = detailX + detailW / 2;
      const detailIconY = detailY + 50;
      
      if (!G.drawCustomPetIcon(ctx, pet.speciesId, detailIconX, detailIconY, detailIconSize)) {
        ctx.fillText(this.getPetIcon(pet.speciesId), detailIconX, detailIconY);
      }
      
      ctx.fillStyle = '#f0e0c0';
      ctx.font = `bold ${Math.min(G.W * 0.04, 16)}px "STKaiti","KaiTi",sans-serif`;
      ctx.fillText(pet.name, detailX + detailW / 2, detailY + 85);
      
      const talentInfo = pet.getTalentRating();

      // 性格区域
      const natureY = detailY + headerH + 8;
      
      let natureDesc = pet.nature.name;
      let hasUpDown = false;
      let upDownStr = '(';
      
      if (pet.nature.atkMod > 1) { upDownStr += '攻击↑'; hasUpDown = true; }
      else if (pet.nature.atkMod < 1) { upDownStr += '攻击↓'; hasUpDown = true; }
      
      if (pet.nature.defMod > 1) { if (hasUpDown) upDownStr += ' '; upDownStr += '防御↑'; hasUpDown = true; }
      else if (pet.nature.defMod < 1) { if (hasUpDown) upDownStr += ' '; upDownStr += '防御↓'; hasUpDown = true; }
      
      if (pet.nature.spaMod > 1) { if (hasUpDown) upDownStr += ' '; upDownStr += '特攻↑'; hasUpDown = true; }
      else if (pet.nature.spaMod < 1) { if (hasUpDown) upDownStr += ' '; upDownStr += '特攻↓'; hasUpDown = true; }
      
      if (pet.nature.resMod > 1) { if (hasUpDown) upDownStr += ' '; upDownStr += '特防↑'; hasUpDown = true; }
      else if ((pet.nature.resMod || 1) < 1) { if (hasUpDown) upDownStr += ' '; upDownStr += '特防↓'; hasUpDown = true; }
      
      if (pet.nature.spdMod > 1) { if (hasUpDown) upDownStr += ' '; upDownStr += '速度↑'; hasUpDown = true; }
      else if (pet.nature.spdMod < 1) { if (hasUpDown) upDownStr += ' '; upDownStr += '速度↓'; hasUpDown = true; }
      
      if (hasUpDown) natureDesc += upDownStr + ')';
      
      ctx.fillStyle = '#ffd700';
      ctx.font = `bold ${Math.min(G.W * 0.028, 11)}px "STKaiti","KaiTi",sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(natureDesc, detailX + 15, natureY);
      
      ctx.fillStyle = '#ffd700';
      ctx.textAlign = 'right';
      ctx.fillText(`Lv.${pet.level}`, detailX + detailW - 15, natureY);

      // 属性区域
      const statsStartY = natureY + 25;
      const leftWidth = detailW * 0.48;
      const rightWidth = detailW - leftWidth - 20;
      const leftX = detailX + 10;
      const rightX = detailX + leftWidth + 15;

      const stats = [
        { label: 'HP', value: pet.getMaxHp(), color: '#ff6b6b', ivKey: 'hp', icon: '❤️' },
        { label: '攻击', value: pet.getAtk(), color: '#ffd93d', ivKey: 'atk', icon: '⚔️', hasUp: pet.nature.atkMod > 1, hasDown: pet.nature.atkMod < 1 },
        { label: '防御', value: pet.getDef(), color: '#4ecdc4', ivKey: 'def', icon: '🛡️', hasUp: pet.nature.defMod > 1, hasDown: pet.nature.defMod < 1 },
        { label: '特攻', value: pet.getSpa(), color: '#ff8c00', ivKey: 'spa', icon: '✨', hasUp: pet.nature.spaMod > 1, hasDown: pet.nature.spaMod < 1 },
        { label: '特防', value: pet.getRes(), color: '#9b59b6', ivKey: 'res', icon: '🌀', hasUp: (pet.nature.resMod || 1) > 1, hasDown: (pet.nature.resMod || 1) < 1 },
        { label: '速度', value: pet.getSpd(), color: '#a8e6cf', ivKey: 'spd', icon: '💨', hasUp: pet.nature.spdMod > 1, hasDown: pet.nature.spdMod < 1 },
      ];
      
      const statGap = Math.min(23, (detailH - 160) / 6.5);
      
      // 蓝色标签
      const labelW = 70;
      const labelH = 24;
      const detailStarOffset = 20;
      const detailStarsCenterX = rightX + detailStarOffset + (5 * 16) / 2;
      const detailLabelX = detailStarsCenterX - labelW / 2;
      const detailLabelY = statsStartY - 30;
      
      ctx.fillStyle = 'rgba(65, 105, 225, 0.9)';
      ctx.beginPath();
      ctx.roundRect(detailLabelX, detailLabelY, labelW, labelH, 6);
      ctx.fill();
      
      ctx.strokeStyle = 'rgba(100, 149, 237, 0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.min(G.W * 0.028, 11)}px "STKaiti","KaiTi",sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(talentInfo.rating, detailLabelX + labelW / 2, detailLabelY + labelH / 2 + 2);
      
      const detailBoxX = rightX + detailStarOffset - 8;
      const detailBoxY = statsStartY - 34;
      const detailBoxW = 5 * 16 + 16;
      const detailBoxH = 5 * statGap + 52;
      ctx.strokeStyle = 'rgba(100, 149, 237, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(detailBoxX, detailBoxY, detailBoxW, detailBoxH, 10);
      ctx.stroke();
      
      stats.forEach((stat, i) => {
        const statY = statsStartY + i * statGap;
        
        ctx.fillStyle = 'rgba(40, 38, 50, 0.4)';
        ctx.beginPath();
        ctx.roundRect(leftX, statY - 5, leftWidth, 18, 4);
        ctx.fill();
        
        ctx.font = `${Math.min(G.W * 0.032, 13)}px serif`;
        ctx.textAlign = 'left';
        ctx.fillText(stat.icon, leftX + 4, statY + 7);
        
        ctx.fillStyle = '#ffd700';
        ctx.font = `${Math.min(G.W * 0.028, 11)}px "STKaiti","KaiTi",sans-serif`;
        ctx.fillText(stat.label, leftX + 26, statY + 7);
        
        ctx.fillStyle = '#888';
        ctx.fillText(':', leftX + 50, statY + 7);
        
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.min(G.W * 0.03, 12)}px sans-serif`;
        ctx.fillText(stat.value, leftX + 60, statY + 7);
        
        let arrowX = leftX + 62 + ctx.measureText(stat.value).width;
        if (stat.hasUp) {
          ctx.fillStyle = '#2ecc71';
          ctx.font = `bold ${Math.min(G.W * 0.035, 14)}px sans-serif`;
          ctx.fillText('↑', arrowX, statY + 7);
        } else if (stat.hasDown) {
          ctx.fillStyle = '#e74c3c';
          ctx.font = `bold ${Math.min(G.W * 0.035, 14)}px sans-serif`;
          ctx.fillText('↓', arrowX, statY + 7);
        }
        
        const evIconX = leftX + leftWidth - 40;
        ctx.fillStyle = '#3498db';
        ctx.beginPath();
        ctx.arc(evIconX, statY + 4, 10, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#fff';
        ctx.font = `${Math.min(G.W * 0.02, 8)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('努力', evIconX, statY + 6);
        
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.min(G.W * 0.025, 10)}px sans-serif`;
        ctx.textAlign = 'left';
        ctx.fillText(pet.evs[stat.ivKey], evIconX + 14, statY + 7);
        
        const stars = pet.getTalentStars(stat.ivKey);
        const ivValue = pet.ivs[stat.ivKey] || 0;
        
        for (let s = 0; s < 5; s++) {
          const starX = rightX + detailStarOffset + s * 16;
          let starColor;
          if (s < stars) {
            if (ivValue >= 50) starColor = '#8b4513';
            else if (ivValue >= 38) starColor = '#ff8c00';
            else starColor = '#ffd700';
          } else {
            starColor = '#4a4a4a';
          }
          ctx.fillStyle = starColor;
          ctx.font = `${Math.min(G.W * 0.035, 14)}px sans-serif`;
          ctx.textAlign = 'left';
          ctx.fillText('★', starX, statY + 7);
        }
      });

      // 关闭按钮
      ctx.fillStyle = 'rgba(255, 100, 100, 0.7)';
      ctx.beginPath();
      ctx.arc(detailX + detailW - 18, detailY + 18, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.min(G.W * 0.035, 14)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('×', detailX + detailW - 18, detailY + 17);

      // 加入队伍按钮 - 确保在面板可视区域内
      const gs = G.getGameState();
      const canAddToTeam = gs.petManager.team.length < gs.petManager.maxTeamSize;

      const btnW = 120;
      const btnH = 36;
      const btnX = detailX + (detailW - btnW) / 2;
      const btnY = detailY + detailH - btnH - 20;  // 距离底部20px，确保可见

      // 按钮背景
      ctx.fillStyle = canAddToTeam ? 'rgba(78, 205, 196, 0.9)' : 'rgba(100, 100, 100, 0.6)';
      ctx.beginPath();
      ctx.roundRect(btnX, btnY, btnW, btnH, 8);
      ctx.fill();

      // 按钮边框
      ctx.strokeStyle = canAddToTeam ? 'rgba(78, 205, 196, 1)' : 'rgba(150, 150, 150, 0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 按钮文字
      ctx.fillStyle = canAddToTeam ? '#ffffff' : '#888888';
      ctx.font = `bold ${Math.min(G.W * 0.032, 13)}px "STKaiti","KaiTi",sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(canAddToTeam ? '📥 加入队伍' : '队伍已满', btnX + btnW / 2, btnY + btnH / 2);

      // 存储按钮位置供点击检测使用
      this._addToTeamBtn = { x: btnX, y: btnY, w: btnW, h: btnH };
    }

    handleClick(x, y) {
      if (!this.visible || this.alpha < 0.5) return null;

      const panelX = 0;
      const panelY = 0;
      const panelW = G.W;
      const panelH = G.H;

      const closeBtnX = panelX + 25;
      const closeBtnY = panelY + this.headerHeight / 2;
      if (G.dist(x, y, closeBtnX, closeBtnY) < 15) {
        this.hide();
        return 'close';
      }

      if (this.showDetail && this.detailAlpha > 0.5) {
        const detailW = Math.min(320, panelW * 0.9);
        const detailH = Math.min(450, panelH * 0.85);
        const detailX = panelX + (panelW - detailW) / 2;
        const detailY = panelY + (panelH - detailH) / 2;

        // 检测关闭按钮
        const closeBtnX = detailX + detailW - 18;
        const closeBtnY = detailY + 18;
        if (G.dist(x, y, closeBtnX, closeBtnY) < 15) {
          this.showDetail = false;
          return 'close_detail';
        }

        // 检测"加入队伍"按钮 - 使用绘制时存储的位置
        if (this._addToTeamBtn) {
          const btn = this._addToTeamBtn;
          if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
            const gs = G.getGameState();
            if (gs.petManager.team.length < gs.petManager.maxTeamSize && this.selectedPet) {
              const result = gs.petManager.addToTeam(this.selectedPet);
              if (result.success) {
                this.showDetail = false;
                this.selectedPet = null;
                return 'added_to_team';
              }
            }
            return 'team_full';
          }
        }

        return 'handled';
      }

      const sortBtns = ['name', 'level', 'time'];
      let btnX = panelX + panelW - 20;
      for (const btnId of sortBtns) {
        if (x >= btnX - 30 && x <= btnX + 5 && y >= panelY + 5 && y <= panelY + this.headerHeight) {
          this.sortBy = btnId;
          return 'sort:' + btnId;
        }
        btnX -= 45;
      }

      const contentY = panelY + this.headerHeight;
      const contentH = panelH - this.headerHeight - this.footerHeight;
      const pets = this.getFilteredPets();
      const cols = this.gridCols;
      const cellW = (panelW - this.padding * 2 - this.cellGap * (cols - 1)) / cols;
      const cellH = cellW;

      for (let i = 0; i < pets.length; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const cellX = panelX + this.padding + col * (cellW + this.cellGap);
        const cellY = contentY + this.padding + row * (cellH + this.cellGap) - this.scrollY;

        if (x >= cellX && x <= cellX + cellW && y >= cellY && y <= cellY + cellH) {
          this.selectedPet = pets[i];
          this.showDetail = true;
          return 'select:' + pets[i].id;
        }
      }

      return null;
    }

    handlePointerDown(x, y) {
      const panelX = 0;
      const panelY = 0;
      const panelW = G.W;
      const panelH = G.H;
      const contentY = panelY + this.headerHeight;
      const contentH = panelH - this.headerHeight - this.footerHeight;

      if (x >= panelX && x <= panelX + panelW && y >= contentY && y <= contentY + contentH) {
        this.isDragging = true;
        this.dragStartY = y;
        this.dragStartScroll = this.targetScrollY;
        return 'dragging';
      }
      return null;
    }

    handlePointerMove(x, y) {
      if (this.isDragging) {
        const dy = y - this.dragStartY;
        this.targetScrollY = this.dragStartScroll - dy;
        this.targetScrollY = G.clamp(this.targetScrollY, 0, this.maxScrollY);
      }

      const panelX = 0;
      const panelY = 0;
      const panelW = G.W;
      const panelH = G.H;
      const contentY = panelY + this.headerHeight;
      const contentH = panelH - this.headerHeight - this.footerHeight;
      const pets = this.getFilteredPets();
      const cols = this.gridCols;
      const cellW = (panelW - this.padding * 2 - this.cellGap * (cols - 1)) / cols;
      const cellH = cellW;

      this.hoveredCell = null;
      for (let i = 0; i < pets.length; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const cellX = panelX + this.padding + col * (cellW + this.cellGap);
        const cellY = contentY + this.padding + row * (cellH + this.cellGap) - this.scrollY;

        if (x >= cellX && x <= cellX + cellW && y >= cellY && y <= cellY + cellH) {
          this.hoveredCell = i;
          break;
        }
      }
    }

    handlePointerUp(x, y) {
      this.isDragging = false;
    }

    isPointInside(x, y) {
      if (!this.visible || this.alpha < 0.5) return false;
      return true;
    }
  }

  G.WarehousePanel = WarehousePanel;
})(window.GameApp);
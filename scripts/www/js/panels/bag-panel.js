(function(G) {
  class BagPanel {
    constructor() {
      this.visible = false;
      this.alpha = 0;
      this.targetAlpha = 0;
      this.currentTab = 'ball';
      this.selectedItem = null;
      this.showDetail = false;
      this.detailAlpha = 0;
      this.scrollY = 0;
      this.targetScrollY = 0;
      this.maxScrollY = 0;
      this.headerHeight = 75;
      this.tabHeight = 35;
      this.cellSize = 60;
      this.cellGap = 6;
      this.padding = 10;
      this.isDragging = false;
      this.dragStartY = 0;
      this.dragStartScroll = 0;
      this.time = 0;
      this.hoveredCell = null;
      this.showPetSelect = false;
      this.petSelectAlpha = 0;
      this.useMessage = null;
      this.messageTimer = 0;
      this.tabs = [
        { id: 'ball', name: '球', icon: '🔴' },
        { id: 'potion', name: '药剂', icon: '❤️' },
        { id: 'bait', name: '诱饵', icon: '🍞' },
        { id: 'material', name: '材料', icon: '💎' },
      ];
    }

    show() {
      this.visible = true;
      this.targetAlpha = 1;
      this.selectedItem = null;
      this.showDetail = false;
      this.scrollY = 0;
      this.targetScrollY = 0;
    }

    hide() {
      this.targetAlpha = 0;
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
      if (this.showPetSelect) {
        this.petSelectAlpha = G.lerp(this.petSelectAlpha, 1, dt * 8);
      } else {
        this.petSelectAlpha = G.lerp(this.petSelectAlpha, 0, dt * 10);
      }
      if (this.messageTimer > 0) {
        this.messageTimer -= dt;
        if (this.messageTimer <= 0) {
          this.useMessage = null;
        }
      }
    }

    getCurrentItems() {
      return G.getGameState().bagManager.getItemsByType(this.currentTab);
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
      bgGrad.addColorStop(0, 'rgba(25, 23, 35, 0.98)');
      bgGrad.addColorStop(1, 'rgba(20, 18, 28, 0.98)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(panelX, panelY, panelW, panelH);

      this.drawHeader(ctx, panelX, panelY, panelW);
      this.drawTabs(ctx, panelX, panelY, panelW);

      const contentY = panelY + this.headerHeight + this.tabHeight;
      const contentH = panelH - this.headerHeight - this.tabHeight - 40;
      
      ctx.save();
      ctx.beginPath();
      ctx.rect(panelX, contentY, panelW, contentH);
      ctx.clip();

      this.drawGrid(ctx, panelX, contentY, panelW, contentH);

      ctx.restore();

      this.drawFooter(ctx, panelX, panelY + panelH - 35, panelW);

      if (this.detailAlpha > 0.01 && this.selectedItem) {
        this.drawDetailPanel(ctx, panelX, panelY, panelW, panelH);
      }

      if (this.petSelectAlpha > 0.01) {
        this.drawPetSelectPanel(ctx, panelX, panelY, panelW, panelH);
      }

      if (this.useMessage && this.messageTimer > 0) {
        this.drawMessage(ctx);
      }

      ctx.restore();
    }

    drawPetSelectPanel(ctx, panelX, panelY, panelW, panelH) {
      ctx.globalAlpha = this.petSelectAlpha;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(panelX, panelY, panelW, panelH);

      const selectW = Math.min(300, panelW * 0.9);
      const selectH = 280;
      const selectX = panelX + (panelW - selectW) / 2;
      const selectY = panelY + (panelH - selectH) / 2;

      const bgGrad = ctx.createLinearGradient(selectX, selectY, selectX, selectY + selectH);
      bgGrad.addColorStop(0, 'rgba(45, 42, 55, 0.98)');
      bgGrad.addColorStop(1, 'rgba(35, 32, 45, 0.98)');
      ctx.fillStyle = bgGrad;
      ctx.beginPath();
      ctx.roundRect(selectX, selectY, selectW, selectH, 15);
      ctx.fill();

      ctx.strokeStyle = 'rgba(180, 160, 140, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(selectX, selectY, selectW, selectH, 15);
      ctx.stroke();

      ctx.fillStyle = '#f0e0c0';
      ctx.font = `bold ${Math.min(G.W * 0.04, 16)}px "STKaiti","KaiTi",sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('选择宠物', selectX + selectW / 2, selectY + 25);

      const gs = G.getGameState();
      const allPets = [...gs.petManager.team.filter(p => p), ...gs.petManager.warehouse];
      const petSize = 70;
      const cols = 3;
      const startX = selectX + 20;
      const startY = selectY + 50;

      for (let i = 0; i < allPets.length && i < 6; i++) {
        const pet = allPets[i];
        const col = i % cols;
        const row = Math.floor(i / cols);
        const px = startX + col * (petSize + 10);
        const py = startY + row * (petSize + 10);

        ctx.fillStyle = 'rgba(60, 55, 70, 0.8)';
        ctx.beginPath();
        ctx.roundRect(px, py, petSize, petSize, 8);
        ctx.fill();

        ctx.font = `${Math.min(G.W * 0.08, 28)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.getPetIcon(pet.speciesId), px + petSize / 2, py + petSize / 2 - 8);

        ctx.fillStyle = '#f0e0c0';
        ctx.font = `${Math.min(G.W * 0.02, 8)}px "STKaiti","KaiTi",sans-serif`;
        ctx.fillText(`Lv.${pet.level}`, px + petSize / 2, py + petSize - 10);
      }

      ctx.fillStyle = 'rgba(255, 100, 100, 0.6)';
      ctx.beginPath();
      ctx.arc(selectX + selectW - 15, selectY + 15, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.min(G.W * 0.03, 14)}px sans-serif`;
      ctx.fillText('×', selectX + selectW - 15, selectY + 16);

      ctx.globalAlpha = this.alpha;
    }

    getPetIcon(speciesId) {
      const icons = {
        fire_fox: '🦊',
        ripple_turtle: '🐢',
        sprout_deer: '🐰',
        shadow_mouse: '🐭',
        light_sparrow: '🐦',
      };
      return icons[speciesId] || '🐾';
    }

    drawMessage(ctx) {
      const msgW = 250;
      const msgH = 60;
      const msgX = (G.W - msgW) / 2;
      const msgY = G.H / 2 - msgH / 2;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.beginPath();
      ctx.roundRect(msgX, msgY, msgW, msgH, 10);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 200, 100, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(msgX, msgY, msgW, msgH, 10);
      ctx.stroke();

      ctx.fillStyle = '#ffd700';
      ctx.font = `bold ${Math.min(G.W * 0.035, 14)}px "STKaiti","KaiTi",sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.useMessage, msgX + msgW / 2, msgY + msgH / 2);
    }

    drawHeader(ctx, x, y, w) {
      const headerGrad = ctx.createLinearGradient(x, y, x, y + 75);
      headerGrad.addColorStop(0, 'rgba(35, 33, 48, 0.95)');
      headerGrad.addColorStop(1, 'rgba(30, 28, 40, 0.95)');
      ctx.fillStyle = headerGrad;
      ctx.fillRect(x, y, w, 75);

      const lineGrad = ctx.createLinearGradient(x, y + 74, x + w, y + 74);
      lineGrad.addColorStop(0, 'rgba(180, 160, 120, 0)');
      lineGrad.addColorStop(0.3, 'rgba(180, 160, 120, 0.5)');
      lineGrad.addColorStop(0.7, 'rgba(180, 160, 120, 0.5)');
      lineGrad.addColorStop(1, 'rgba(180, 160, 120, 0)');
      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y + 74.5);
      ctx.lineTo(x + w, y + 74.5);
      ctx.stroke;

      const closeBtnX = x + 25;
      const closeBtnY = y + 37;
      ctx.fillStyle = 'rgba(255, 100, 100, 0.7)';
      ctx.beginPath();
      ctx.arc(closeBtnX, closeBtnY, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.min(G.W * 0.04, 18)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('×', closeBtnX, closeBtnY + 1);

      ctx.fillStyle = '#f0e0c0';
      ctx.font = `bold ${Math.min(G.W * 0.05, 20)}px "STKaiti","KaiTi",sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🎒 背包', x + w / 2, y + 37);
    }

    drawTabs(ctx, x, y, w) {
      const tabY = y + this.headerHeight;
      const tabW = (w - 20) / this.tabs.length;
      
      for (let i = 0; i < this.tabs.length; i++) {
        const tab = this.tabs[i];
        const tabX = x + 10 + i * tabW;
        const isActive = this.currentTab === tab.id;

        ctx.fillStyle = isActive ? 'rgba(80, 70, 60, 0.8)' : 'rgba(40, 38, 50, 0.6)';
        ctx.beginPath();
        ctx.roundRect(tabX, tabY, tabW - 4, this.tabHeight - 5, 8);
        ctx.fill();

        if (isActive) {
          ctx.strokeStyle = 'rgba(255, 200, 100, 0.5)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(tabX, tabY, tabW - 4, this.tabHeight - 5, 8);
          ctx.stroke();
        }

        ctx.font = `${Math.min(G.W * 0.035, 14)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tab.icon, tabX + tabW / 2 - 10, tabY + this.tabHeight / 2 - 2);

        ctx.fillStyle = isActive ? '#f0e0c0' : '#a0a0a0';
        ctx.font = `${Math.min(G.W * 0.025, 10)}px "STKaiti","KaiTi",sans-serif`;
        ctx.fillText(tab.name, tabX + tabW / 2 + 10, tabY + this.tabHeight / 2 - 2);
      }
    }

    drawGrid(ctx, panelX, contentY, panelW, contentH) {
      const items = this.getCurrentItems();
      const cols = 4;
      const cellW = (panelW - this.padding * 2 - this.cellGap * (cols - 1)) / cols;
      const cellH = cellW;
      const rows = Math.ceil(items.length / cols);
      this.maxScrollY = Math.max(0, rows * (cellH + this.cellGap) - contentH + this.padding);

      for (let i = 0; i < items.length; i++) {
        const { item, count } = items[i];
        const col = i % cols;
        const row = Math.floor(i / cols);
        const cellX = panelX + this.padding + col * (cellW + this.cellGap);
        const cellY = contentY + this.padding + row * (cellH + this.cellGap) - this.scrollY;

        if (cellY + cellH < contentY || cellY > contentY + contentH) continue;

        this.drawItemCell(ctx, item, count, cellX, cellY, cellW, cellH, i);
      }

      if (items.length === 0) {
        ctx.fillStyle = '#606060';
        ctx.font = `${Math.min(G.W * 0.03, 12)}px "STKaiti","KaiTi",sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('该分类下没有道具', panelX + panelW / 2, contentY + contentH / 2);
      }
    }

    drawItemCell(ctx, item, count, x, y, w, h, index) {
      const isSelected = this.selectedItem && this.selectedItem.id === item.id;
      const isHovered = this.hoveredCell === index;

      ctx.fillStyle = isSelected ? 'rgba(255, 200, 100, 0.2)' :
                      isHovered ? 'rgba(80, 70, 60, 0.5)' :
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

      ctx.font = `${Math.min(G.W * 0.08, 28)}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.icon, x + w / 2, y + h * 0.4);

      ctx.fillStyle = '#f0e0c0';
      ctx.font = `bold ${Math.min(G.W * 0.022, 9)}px "STKaiti","KaiTi",sans-serif`;
      ctx.fillText(item.name, x + w / 2, y + h * 0.72);

      if (count > 1) {
        ctx.fillStyle = 'rgba(255, 200, 100, 0.9)';
        ctx.font = `bold ${Math.min(G.W * 0.025, 10)}px sans-serif`;
        ctx.textAlign = 'right';
        ctx.fillText(`×${count}`, x + w - 5, y + h - 8);
      }
    }

    drawFooter(ctx, x, y, w) {
      ctx.fillStyle = 'rgba(40, 38, 50, 0.8)';
      ctx.beginPath();
      ctx.roundRect(x + 5, y, w - 10, 30, 8);
      ctx.fill();

      const gs = G.getGameState();
      const usedSlots = gs.bagManager.getUsedSlots();
      const maxSlots = gs.bagManager.maxSlots;
      ctx.fillStyle = usedSlots >= maxSlots ? '#ff6b6b' : '#c8b898';
      ctx.font = `${Math.min(G.W * 0.025, 10)}px "STKaiti","KaiTi",sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`容量: ${usedSlots} / ${maxSlots}`, x + w / 2, y + 15);
    }

    drawDetailPanel(ctx, panelX, panelY, panelW, panelH) {
      ctx.globalAlpha = this.detailAlpha;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(panelX, panelY, panelW, panelH);

      const item = this.selectedItem;
      const canUse = item.resetTalent || item.boostTalent || item.teachSkill || item.expGain;
      const detailW = Math.min(250, panelW * 0.85);
      const detailH = canUse ? 240 : 200;
      const detailX = panelX + (panelW - detailW) / 2;
      const detailY = panelY + (panelH - detailH) / 2;

      const bgGrad = ctx.createLinearGradient(detailX, detailY, detailX, detailY + detailH);
      bgGrad.addColorStop(0, 'rgba(45, 42, 55, 0.98)');
      bgGrad.addColorStop(1, 'rgba(35, 32, 45, 0.98)');
      ctx.fillStyle = bgGrad;
      ctx.beginPath();
      ctx.roundRect(detailX, detailY, detailW, detailH, 15);
      ctx.fill();

      ctx.strokeStyle = 'rgba(180, 160, 140, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(detailX, detailY, detailW, detailH, 15);
      ctx.stroke();

      ctx.font = `${Math.min(G.W * 0.1, 40)}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.icon, detailX + detailW / 2, detailY + 50);

      ctx.fillStyle = '#f0e0c0';
      ctx.font = `bold ${Math.min(G.W * 0.04, 16)}px "STKaiti","KaiTi",sans-serif`;
      ctx.fillText(item.name, detailX + detailW / 2, detailY + 95);

      const gs = G.getGameState();
      const count = gs.bagManager.getItemCount(item.id);
      ctx.fillStyle = '#ffd700';
      ctx.font = `${Math.min(G.W * 0.03, 12)}px "STKaiti","KaiTi",sans-serif`;
      ctx.fillText(`持有: ${count} 个`, detailX + detailW / 2, detailY + 120);

      ctx.fillStyle = '#a0a0a0';
      ctx.font = `${Math.min(G.W * 0.025, 10)}px "STKaiti","KaiTi",sans-serif`;
      const desc = item.description;
      ctx.fillText(desc.substring(0, 15), detailX + detailW / 2, detailY + 150);
      if (desc.length > 15) {
        ctx.fillText(desc.substring(15, 30), detailX + detailW / 2, detailY + 168);
      }

      if (canUse) {
        const btnW = 80;
        const btnH = 28;
        const btnX = detailX + detailW / 2 - btnW / 2;
        const btnY = detailY + detailH - 55;
        
        ctx.fillStyle = 'rgba(100, 180, 100, 0.8)';
        ctx.beginPath();
        ctx.roundRect(btnX, btnY, btnW, btnH, 8);
        ctx.fill();
        
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.min(G.W * 0.03, 12)}px "STKaiti","KaiTi",sans-serif`;
        ctx.fillText('使用', btnX + btnW / 2, btnY + btnH / 2);
      }

      ctx.fillStyle = 'rgba(255, 100, 100, 0.6)';
      ctx.beginPath();
      ctx.arc(detailX + detailW - 15, detailY + 15, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.min(G.W * 0.03, 14)}px sans-serif`;
      ctx.fillText('×', detailX + detailW - 15, detailY + 16);

      ctx.globalAlpha = this.alpha;
    }

    handleClick(x, y) {
      if (!this.visible || this.alpha < 0.5) return null;

      const panelX = 0;
      const panelY = 0;
      const panelW = G.W;
      const panelH = G.H;

      const closeBtnX = panelX + 25;
      const closeBtnY = panelY + 37;
      if (G.dist(x, y, closeBtnX, closeBtnY) < 16) {
        this.hide();
        return 'close';
      }

      if (this.showPetSelect && this.petSelectAlpha > 0.5) {
        const selectW = Math.min(300, panelW * 0.9);
        const selectH = 280;
        const selectX = panelX + (panelW - selectW) / 2;
        const selectY = panelY + (panelH - selectH) / 2;

        const closeSelX = selectX + selectW - 15;
        const closeSelY = selectY + 15;
        if (G.dist(x, y, closeSelX, closeSelY) < 15) {
          this.showPetSelect = false;
          return 'close_pet_select';
        }

        const gs = G.getGameState();
        const allPets = [...gs.petManager.team.filter(p => p), ...gs.petManager.warehouse];
        const petSize = 70;
        const cols = 3;
        const startX = selectX + 20;
        const startY = selectY + 50;

        for (let i = 0; i < allPets.length && i < 6; i++) {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const px = startX + col * (petSize + 10);
          const py = startY + row * (petSize + 10);

          if (x >= px && x <= px + petSize && y >= py && y <= py + petSize) {
            this.useItemOnPet(allPets[i]);
            this.showPetSelect = false;
            this.showDetail = false;
            return 'use_item';
          }
        }
        return 'handled';
      }

      if (this.showDetail && this.detailAlpha > 0.5) {
        const item = this.selectedItem;
        const canUse = item && (item.resetTalent || item.boostTalent || item.teachSkill || item.expGain);
        const detailW = Math.min(250, panelW * 0.85);
        const detailH = canUse ? 240 : 200;
        const detailX = panelX + (panelW - detailW) / 2;
        const detailY = panelY + (panelH - detailH) / 2;

        const detailCloseX = detailX + detailW - 15;
        const detailCloseY = detailY + 15;
        if (G.dist(x, y, detailCloseX, detailCloseY) < 15) {
          this.showDetail = false;
          return 'close_detail';
        }

        if (canUse) {
          const btnW = 80;
          const btnH = 28;
          const btnX = detailX + detailW / 2 - btnW / 2;
          const btnY = detailY + detailH - 55;

          if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
            this.showPetSelect = true;
            return 'show_pet_select';
          }
        }
        return 'handled';
      }

      const tabY = panelY + this.headerHeight;
      const tabW = (panelW - 20) / this.tabs.length;
      for (let i = 0; i < this.tabs.length; i++) {
        const tabX = panelX + 10 + i * tabW;
        if (x >= tabX && x <= tabX + tabW - 4 && y >= tabY && y <= tabY + this.tabHeight - 5) {
          this.currentTab = this.tabs[i].id;
          this.scrollY = 0;
          this.targetScrollY = 0;
          this.selectedItem = null;
          return 'tab:' + this.tabs[i].id;
        }
      }

      const items = this.getCurrentItems();
      const contentY = panelY + this.headerHeight + this.tabHeight;
      const contentH = panelH - this.headerHeight - this.tabHeight - 40;
      const cols = 4;
      const cellW = (panelW - this.padding * 2 - this.cellGap * (cols - 1)) / cols;
      const cellH = cellW;

      for (let i = 0; i < items.length; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const cellX = panelX + this.padding + col * (cellW + this.cellGap);
        const cellY = contentY + this.padding + row * (cellH + this.cellGap) - this.scrollY;

        if (x >= cellX && x <= cellX + cellW && y >= cellY && y <= cellY + cellH) {
          this.selectedItem = items[i].item;
          this.showDetail = true;
          return 'select:' + items[i].item.id;
        }
      }

      return null;
    }

    useItemOnPet(pet) {
      const item = this.selectedItem;
      if (!item || !pet) return;

      const gs = G.getGameState();

      if (item.resetTalent) {
        const oldRating = pet.getTalentRating().rating;
        pet.resetTalent();
        const newRating = pet.getTalentRating().rating;
        gs.bagManager.removeItem(item.id, 1);
        this.useMessage = `天赋重组成功！${oldRating} → ${newRating}`;
        this.messageTimer = 2;
      } else if (item.boostTalent) {
        const result = pet.boostTalent();
        if (result.success) {
          gs.bagManager.removeItem(item.id, 1);
          this.useMessage = `${result.statName}+${result.amount}！(${result.newValue}/62)`;
          this.messageTimer = 2;
        } else {
          this.useMessage = '所有天赋已满！';
          this.messageTimer = 1.5;
        }
      } else if (item.expGain) {
        const leveledUp = pet.addExp(item.expGain);
        gs.bagManager.removeItem(item.id, 1);
        this.useMessage = `获得${item.expGain}经验！${leveledUp ? '升级了！' : ''}`;
        this.messageTimer = 2;
      } else if (item.teachSkill) {
        const skillIds = Object.keys(G.SkillsDB);
        const availableSkills = skillIds.filter(id => !pet.randomSkills.includes(id));
        if (availableSkills.length === 0) {
          this.useMessage = '没有可学的技能！';
          this.messageTimer = 1.5;
          return;
        }
        const newSkillId = availableSkills[Math.floor(Math.random() * availableSkills.length)];
        const result = pet.learnSkill(newSkillId);
        if (result.success) {
          gs.bagManager.removeItem(item.id, 1);
          this.useMessage = `学会了${G.SkillsDB[newSkillId].name}！`;
          this.messageTimer = 2;
        } else {
          this.useMessage = result.reason === 'skill_full' ? '技能已满！' : '学习失败';
          this.messageTimer = 1.5;
        }
      }
    }

    handlePointerDown(x, y) {
      const panelX = G.W * 0.05;
      const panelY = 85;
      const panelW = G.W * 0.9;
      const panelH = G.H - 115;
      const contentY = panelY + this.headerHeight + this.tabHeight;
      const contentH = panelH - this.headerHeight - this.tabHeight - 40;

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

      const panelX = G.W * 0.05;
      const panelY = 85;
      const panelW = G.W * 0.9;
      const panelH = G.H - 115;
      const contentY = panelY + this.headerHeight + this.tabHeight;
      const contentH = panelH - this.headerHeight - this.tabHeight - 40;
      const items = this.getCurrentItems();
      const cols = 4;
      const cellW = (panelW - this.padding * 2 - this.cellGap * (cols - 1)) / cols;
      const cellH = cellW;

      this.hoveredCell = null;
      for (let i = 0; i < items.length; i++) {
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

  G.BagPanel = BagPanel;
})(window.GameApp);
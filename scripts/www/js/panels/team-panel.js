(function(G) {
  class TeamPanel {
    constructor() {
      this.visible = false;
      this.alpha = 0;
      this.targetAlpha = 0;
      this.selectedIndex = 0;
      this.showReplace = false;
      this.replaceAlpha = 0;
      this.replaceScrollY = 0;
      this.targetReplaceScrollY = 0;
      this.maxReplaceScrollY = 0;
      this.headerHeight = 45;
      this.time = 0;
      this.hoveredSlot = null;
      this.hoveredReplaceSlot = null;
      this.isDragging = false;
      this.dragStartY = 0;
      this.dragStartScroll = 0;
      this.currentTab = 0;
      this.tabs = ['技能', '属性', '详情'];
      this.tabAnimProgress = 0;
      this.hoveredAllocBtn = null;
    }

    show() {
      this.visible = true;
      this.targetAlpha = 1;
      this.showReplace = false;
    }

    hide() {
      this.visible = false;
      this.alpha = 0;
      this.targetAlpha = 0;
      this.showReplace = false;
      this.replaceAlpha = 0;
    }

    update(dt) {
      this.time += dt;
      this.alpha = G.lerp(this.alpha, this.targetAlpha, dt * 10);
      if (this.alpha < 0.01 && this.targetAlpha === 0) {
        this.visible = false;
      }
      if (this.showReplace) {
        this.replaceAlpha = G.lerp(this.replaceAlpha, 1, dt * 8);
      } else {
        this.replaceAlpha = G.lerp(this.replaceAlpha, 0, dt * 10);
      }
      this.replaceScrollY = G.lerp(this.replaceScrollY, this.targetReplaceScrollY, dt * 15);
      this.replaceScrollY = G.clamp(this.replaceScrollY, 0, this.maxReplaceScrollY);
      this.tabAnimProgress = G.lerp(this.tabAnimProgress, this.currentTab, dt * 12);
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

      const headerH = 75;
      const contentY = headerH;
      const contentH = panelH - headerH;

      const detailH = contentH * 0.60;
      this.drawDetailArea(ctx, panelX + 10, contentY, panelW - 20, detailH);

      const listY = contentY + detailH + 10;
      const listH = contentH * 0.40 - 10;
      this.drawTeamList(ctx, panelX + 10, listY, panelW - 20, listH);

      if (this.replaceAlpha > 0.01) {
        this.drawReplacePanel(ctx, panelX, panelY, panelW, panelH);
      }

      ctx.restore();
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
      ctx.stroke();

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
      ctx.fillText('👥 队伍管理', x + w / 2, y + 37);

      const gs = G.getGameState();
      const teamCount = G.getGameState().petManager.team.length;
      const maxTeam = G.getGameState().petManager.maxTeamSize;
      ctx.fillStyle = '#a0a0a0';
      ctx.font = `${Math.min(G.W * 0.032, 13)}px "STKaiti","KaiTi",sans-serif`;
      ctx.textAlign = 'right';
      ctx.fillText(`${teamCount}/${maxTeam}`, x + w - 20, y + 37);
    }

    drawDetailArea(ctx, x, y, w, h) {
      ctx.fillStyle = 'rgba(35, 33, 48, 0.6)';
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 12);
      ctx.fill();

      ctx.strokeStyle = 'rgba(100, 90, 80, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 12);
      ctx.stroke();

      const gs = G.getGameState();
      const pet = G.getGameState().petManager.team[this.selectedIndex];
      if (!pet) {
        ctx.fillStyle = '#606060';
        ctx.font = `${Math.min(G.W * 0.045, 18)}px "STKaiti","KaiTi",sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('选择一只宠物查看详情', x + w / 2, y + h / 2);
        return;
      }

      const isSkillTab = this.currentTab === 0;
      let leftWidth, rightWidth, leftX, rightX;
      
      if (isSkillTab) {
        leftWidth = w * 0.35;
        rightWidth = w - leftWidth - 15;
        leftX = x + 10;
        rightX = x + leftWidth + 15;
        this.drawPetAvatar(ctx, leftX, y, leftWidth, h, pet);
      } else {
        leftWidth = 0;
        rightWidth = w - 20;
        leftX = x;
        rightX = x + 10;
      }

      const tabH = 36;
      const tabY = y + 8;
      const tabGap = 6;
      const tabWidth = (rightWidth - 10 - tabGap * 2) / 3;
      const tabStartX = rightX + 5;

      this.tabs.forEach((tabName, i) => {
        const tX = tabStartX + i * (tabWidth + tabGap);
        const isSelected = this.currentTab === i;

        if (isSelected) {
          const tabGrad = ctx.createLinearGradient(tX, tabY, tX, tabY + tabH);
          tabGrad.addColorStop(0, 'rgba(255, 200, 100, 0.9)');
          tabGrad.addColorStop(1, 'rgba(200, 150, 80, 0.9)');
          ctx.fillStyle = tabGrad;
          ctx.beginPath();
          ctx.roundRect(tX, tabY, tabWidth, tabH, 8);
          ctx.fill();

          ctx.strokeStyle = 'rgba(255, 220, 150, 0.8)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(tX, tabY, tabWidth, tabH, 8);
          ctx.stroke();
        } else {
          ctx.fillStyle = 'rgba(50, 48, 60, 0.7)';
          ctx.beginPath();
          ctx.roundRect(tX, tabY, tabWidth, tabH, 8);
          ctx.fill();

          ctx.strokeStyle = 'rgba(80, 78, 90, 0.5)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(tX, tabY, tabWidth, tabH, 8);
          ctx.stroke();
        }

        ctx.fillStyle = isSelected ? '#1a1a2e' : '#a0a0a0';
        ctx.font = `bold ${Math.min(G.W * 0.032, 13)}px "STKaiti","KaiTi",sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tabName, tX + tabWidth / 2, tabY + tabH / 2);
      });

      const contentY = tabY + tabH + 8;
      const contentH = h - tabH - 16;
      const contentX = rightX + 5;
      const contentW = rightWidth - 10;

      ctx.save();
      ctx.beginPath();
      ctx.rect(rightX, contentY, rightWidth, contentH);
      ctx.clip();

      switch (this.currentTab) {
        case 0:
          this.drawSkillsTab(ctx, contentX, contentY, contentW, contentH, pet);
          break;
        case 1:
          this.drawStatsTab(ctx, contentX, contentY, contentW, contentH, pet);
          break;
        case 2:
          this.drawInfoTab(ctx, contentX, contentY, contentW, contentH, pet);
          break;
      }

      ctx.restore();
    }

    drawPetAvatar(ctx, x, y, w, h, pet) {
      const element = pet.species.element;
      const centerX = x + w / 2;
      
      const avatarHeight = h * 0.55;
      const centerY = y + avatarHeight / 2;

      ctx.fillStyle = element.color;
      ctx.globalAlpha = 0.2;
      const glowRadius = Math.min(w * 0.35, avatarHeight * 0.3);
      ctx.beginPath();
      ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.font = `${Math.min(G.W * 0.12, 48)}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const teamIconSize = Math.min(G.W * 0.12, 48) * 1.8;
      
      if (!G.drawCustomPetIcon(ctx, pet.speciesId, centerX, centerY, teamIconSize)) {
        ctx.fillText(this.getPetIcon(pet.speciesId), centerX, centerY);
      }

      if (this.selectedIndex === 0) {
        ctx.font = `${Math.min(G.W * 0.045, 18)}px serif`;
        ctx.fillText('👑', centerX - w * 0.28, centerY - avatarHeight * 0.18);
      }

      const btnAreaY = y + avatarHeight;
      const btnAreaHeight = h - avatarHeight;

      const btnCols = 2;
      const btnRows = 2;
      const btnGap = 8;
      const btnWMax = (w - btnGap * (btnCols + 1)) / btnCols;
      const btnHMax = (btnAreaHeight - btnGap * (btnRows + 1)) / btnRows;
      const btnSize = Math.min(btnWMax, btnHMax);
      const btnW = btnSize;
      const btnH = btnSize;
      const btnStartY = btnAreaY + (btnAreaHeight - (btnH * btnRows + btnGap * (btnRows - 1))) / 2;

      // 存储按钮位置供点击检测使用
      this._avatarBtns = [
        { x: x + btnGap, y: btnStartY, w: btnW, h: btnH, action: 'captain' },
        { x: x + btnGap * 2 + btnW, y: btnStartY, w: btnW, h: btnH, action: 'store' },
        { x: x + btnGap, y: btnStartY + btnH + btnGap, w: btnW, h: btnH, action: 'heal' },
        { x: x + btnGap * 2 + btnW, y: btnStartY + btnH + btnGap, w: btnW, h: btnH, action: 'replace' }
      ];

      const isCaptain = this.selectedIndex === 0;

      ctx.fillStyle = isCaptain ? 'rgba(255, 200, 100, 0.8)' : 'rgba(100, 150, 200, 0.8)';
      ctx.beginPath();
      ctx.roundRect(x + btnGap, btnStartY, btnW, btnH, 6);
      ctx.fill();
      ctx.fillStyle = '#f0e0c0';
      ctx.font = `${Math.min(G.W * 0.026, 10)}px "STKaiti","KaiTi",sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isCaptain ? '👑 队长' : '设为队长', x + btnGap + btnW / 2, btnStartY + btnH / 2);

      ctx.fillStyle = 'rgba(100, 80, 60, 0.8)';
      ctx.beginPath();
      ctx.roundRect(x + btnGap * 2 + btnW, btnStartY, btnW, btnH, 6);
      ctx.fill();
      ctx.fillStyle = '#f0e0c0';
      ctx.fillText('📦 存仓', x + btnGap * 2 + btnW + btnW / 2, btnStartY + btnH / 2);

      const gs = G.getGameState();
      const hpPotionCount = G.getGameState().bagManager.getItemCount('hp_potion');
      const canHeal = hpPotionCount > 0 && pet.currentHp < pet.getMaxHp();
      ctx.fillStyle = canHeal ? 'rgba(100, 180, 100, 0.8)' : 'rgba(80, 80, 80, 0.6)';
      ctx.beginPath();
      ctx.roundRect(x + btnGap, btnStartY + btnH + btnGap, btnW, btnH, 6);
      ctx.fill();
      ctx.fillStyle = canHeal ? '#a0f0a0' : '#888';
      ctx.fillText(`❤️ 回血${hpPotionCount > 0 ? '(' + hpPotionCount + ')' : ''}`, x + btnGap + btnW / 2, btnStartY + btnH + btnGap + btnH / 2);

      ctx.fillStyle = 'rgba(80, 100, 80, 0.8)';
      ctx.beginPath();
      ctx.roundRect(x + btnGap * 2 + btnW, btnStartY + btnH + btnGap, btnW, btnH, 6);
      ctx.fill();
      ctx.fillStyle = '#f0e0c0';
      ctx.fillText('🔄 替换', x + btnGap * 2 + btnW + btnW / 2, btnStartY + btnH + btnGap + btnH / 2);
    }

    drawStatsTab(ctx, x, y, w, h, pet) {
      const element = pet.species.element;
      
      const leftWidth = w * 0.48;
      const rightWidth = w - leftWidth - 10;
      const leftX = x;
      const rightX = x + leftWidth + 10;

      ctx.fillStyle = '#ffd700';
      ctx.font = `bold ${Math.min(G.W * 0.035, 14)}px "STKaiti","KaiTi",sans-serif`;
      ctx.textAlign = 'left';
      
      let natureDesc = pet.nature.name;
      let upDownText = '';
      let hasAnyUpDown = false;
      
      if (pet.nature.atkMod > 1) { upDownText += '攻击↑'; hasAnyUpDown = true; }
      else if (pet.nature.atkMod < 1) { upDownText += '攻击↓'; hasAnyUpDown = true; }

      if (pet.nature.spaMod > 1) { if (hasAnyUpDown) upDownText += ' '; upDownText += '特攻↑'; hasAnyUpDown = true; }
      else if (pet.nature.spaMod < 1) { if (hasAnyUpDown) upDownText += ' '; upDownText += '特攻↓'; hasAnyUpDown = true; }

      if (pet.nature.defMod > 1) { if (hasAnyUpDown) upDownText += ' '; upDownText += '防御↑'; hasAnyUpDown = true; }
      else if (pet.nature.defMod < 1) { if (hasAnyUpDown) upDownText += ' '; upDownText += '防御↓'; hasAnyUpDown = true; }

      if (pet.nature.spdMod > 1) { if (hasAnyUpDown) upDownText += ' '; upDownText += '速度↑'; hasAnyUpDown = true; }
      else if (pet.nature.spdMod < 1) { if (hasAnyUpDown) upDownText += ' '; upDownText += '速度↓'; hasAnyUpDown = true; }
      
      if (hasAnyUpDown) {
        natureDesc += '(' + upDownText + ')';
      }
      
      ctx.fillText(natureDesc, x, y + 18);

      const talentInfo = pet.getTalentRating();

      const stats = [
        { label: '体力', value: pet.getMaxHp(), ivKey: 'hp', icon: '❤️', natureMod: 1, hasUp: false, hasDown: false },
        { label: '攻击', value: pet.getAtk(), ivKey: 'atk', icon: '⚔️', natureMod: pet.nature.atkMod, hasUp: pet.nature.atkMod > 1, hasDown: pet.nature.atkMod < 1 },
        { label: '防御', value: pet.getDef(), ivKey: 'def', icon: '🛡️', natureMod: pet.nature.defMod, hasUp: pet.nature.defMod > 1, hasDown: pet.nature.defMod < 1 },
        { label: '特攻', value: pet.getSpa(), ivKey: 'spa', icon: '✨', natureMod: pet.nature.spaMod || 1, hasUp: (pet.nature.spaMod || 1) > 1, hasDown: (pet.nature.spaMod || 1) < 1 },
        { label: '特防', value: pet.getRes(), ivKey: 'res', icon: '🌀', natureMod: 1, hasUp: false, hasDown: false },
        { label: '速度', value: pet.getSpd(), ivKey: 'spd', icon: '💨', natureMod: pet.nature.spdMod, hasUp: pet.nature.spdMod > 1, hasDown: pet.nature.spdMod < 1 }
      ];

      this._lastStats = stats;

      const trainingY = y + 38;
      ctx.fillStyle = '#c8b898';
      ctx.font = `bold ${Math.min(G.W * 0.03, 12)}px "STKaiti","KaiTi",sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(`📊 修行点: ${pet.trainingPoints}`, leftX, trainingY);

      const evTotal = pet.getTotalEVs();
      ctx.textAlign = 'right';
      ctx.fillText(`努力值: ${evTotal}/510`, leftX + leftWidth, trainingY);
      
      const statStartY = y + 58;
      const statGap = Math.min(22, (h - 78) / 7);

      const evRadius = 10;
      const btnW = 28;
      const btnH = 20;

      stats.forEach((stat, i) => {
        const statY = statStartY + i * statGap;

        ctx.fillStyle = 'rgba(40, 38, 50, 0.4)';
        ctx.beginPath();
        ctx.roundRect(leftX, statY - 4, leftWidth, 18, 4);
        ctx.fill();

        ctx.font = `${Math.min(G.W * 0.032, 13)}px serif`;
        ctx.textAlign = 'left';
        ctx.fillText(stat.icon, leftX + 4, statY + 10);

        ctx.fillStyle = '#ffd700';
        ctx.font = `${Math.min(G.W * 0.03, 12)}px "STKaiti","KaiTi",sans-serif`;
        ctx.fillText(stat.label, leftX + 26, statY + 10);

        ctx.fillStyle = '#888888';
        ctx.fillText(':', leftX + 50, statY + 10);

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.min(G.W * 0.035, 14)}px sans-serif`;
        ctx.fillText(stat.value, leftX + 60, statY + 10);

        const evValueStr = String(pet.evs[stat.ivKey]);
        ctx.font = `bold ${Math.min(G.W * 0.025, 10)}px sans-serif`;
        const evValueW = ctx.measureText(evValueStr).width;
        const totalEvBlockW = btnW + 4 + evValueW + 20;
        const evStartX = leftX + leftWidth - totalEvBlockW;

        const evIconX = evStartX;
        ctx.fillStyle = '#3498db';
        ctx.beginPath();
        ctx.arc(evIconX, statY + 6, evRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = `${Math.min(G.W * 0.02, 8)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('努力', evIconX, statY + 9);

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.min(G.W * 0.025, 10)}px sans-serif`;
        ctx.textAlign = 'left';
        ctx.fillText(pet.evs[stat.ivKey], evIconX + 14, statY + 10);

        const btnX = evIconX + 20 + evValueW + 4;
        const btnY = statY - 5;

        const isHovered = this.hoveredAllocBtn === i;
        const canAlloc = pet.trainingPoints > 0 && pet.evs[stat.ivKey] < 255 && evTotal < 510;

        ctx.fillStyle = isHovered && canAlloc ? 'rgba(78, 205, 196, 0.8)' : (canAlloc ? 'rgba(78, 205, 196, 0.5)' : 'rgba(100, 100, 100, 0.3)');
        ctx.beginPath();
        ctx.roundRect(btnX, statY - 5, btnW, btnH, 4);
        ctx.fill();

        ctx.strokeStyle = isHovered && canAlloc ? 'rgba(78, 205, 196, 1)' : (canAlloc ? 'rgba(78, 205, 196, 0.7)' : 'rgba(100, 100, 100, 0.5)');
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(btnX, statY - 5, btnW, btnH, 4);
        ctx.stroke();

        ctx.fillStyle = canAlloc ? '#ffffff' : '#666666';
        ctx.font = `bold ${Math.min(G.W * 0.03, 12)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+', btnX + btnW / 2, (statY - 5) + btnH / 2);

        stat._btnX = btnX;
        stat._btnY = statY - 5;
        stat._btnW = btnW;
        stat._btnH = btnH;
      });

      const starOffset = 20;
      const trainingStarsCenterX = rightX + starOffset + (5 * 16) / 2;
      const labelW = 70;
      const labelH = 24;
      const labelX = trainingStarsCenterX - labelW / 2;
      const labelY = statStartY - 30;
      
      ctx.fillStyle = 'rgba(65, 105, 225, 0.9)';
      ctx.beginPath();
      ctx.roundRect(labelX, labelY, labelW, labelH, 6);
      ctx.fill();
      
      ctx.strokeStyle = 'rgba(100, 149, 237, 0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.min(G.W * 0.028, 11)}px "STKaiti","KaiTi",sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(talentInfo.rating, labelX + labelW / 2, labelY + labelH / 2 + 2);
      
      const boxX = rightX + starOffset - 8;
      const boxY = statStartY - 34;
      const boxW = 5 * 16 + 16;
      const boxH = 5 * statGap + 52;
      ctx.strokeStyle = 'rgba(100, 149, 237, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 10);
      ctx.stroke();
      
      stats.forEach((stat, i) => {
        const statY = statStartY + i * statGap;
        const stars = pet.getTalentStars(stat.ivKey);
        const ivValue = pet.ivs[stat.ivKey];
        
        for (let s = 0; s < 5; s++) {
          const starX = rightX + starOffset + s * 16;
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
          ctx.fillText('★', starX, statY + 10);
        }
      });
    }

    drawSkillsTab(ctx, x, y, w, h, pet) {
      const skills = pet.getAllSkills();
      const getElementByKey = (key) => {
        for (const k in G.Element) {
          if (G.Element[k].id === key) return G.Element[k];
        }
        return G.Element.NORMAL;
      };

      ctx.fillStyle = '#c8b898';
      ctx.font = `bold ${Math.min(G.W * 0.035, 14)}px "STKaiti","KaiTi",sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText('已学会的技能', x, y + 18);

      const skillListY = y + 30;
      const skillListH = h - 50;
      const skillItemH = Math.min(65, (skillListH - 10) / Math.max(skills.length, 1));

      skills.forEach((skill, i) => {
        const sY = skillListY + i * skillItemH;
        if (sY + skillItemH > y + skillListH) return;

        ctx.fillStyle = skill.isFixed ? 'rgba(255, 200, 100, 0.15)' : 'rgba(50, 48, 60, 0.5)';
        ctx.beginPath();
        ctx.roundRect(x, sY, w, skillItemH - 6, 8);
        ctx.fill();

        if (skill.isFixed) {
          ctx.strokeStyle = 'rgba(255, 200, 100, 0.4)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(x, sY, w, skillItemH - 6, 8);
          ctx.stroke();
        }

        ctx.fillStyle = skill.isFixed ? '#ffd700' : '#f0e0c0';
        ctx.font = `bold ${Math.min(G.W * 0.035, 14)}px "STKaiti","KaiTi",sans-serif`;
        ctx.textAlign = 'left';
        ctx.fillText(skill.name, x + 12, sY + 20);

        if (skill.element) {
          const skillElement = getElementByKey(skill.element);
          ctx.fillStyle = skillElement.color;
          ctx.beginPath();
          ctx.arc(x + w - 30, sY + 15, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.font = `${Math.min(G.W * 0.018, 7)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(skillElement.name, x + w - 30, sY + 16);
        }

        ctx.fillStyle = '#a0a0a0';
        ctx.font = `${Math.min(G.W * 0.025, 10)}px "STKaiti","KaiTi",sans-serif`;
        ctx.textAlign = 'left';
        const desc = skill.description || '无描述';
        ctx.fillText(desc.length > 28 ? desc.substring(0, 28) + '...' : desc, x + 12, sY + 38);

        ctx.fillStyle = '#808080';
        ctx.font = `${Math.min(G.W * 0.022, 9)}px sans-serif`;
        const typeStr = skill.isFixed ? '固有技能' : '学习技能';
        ctx.fillText(typeStr, x + 12, sY + 52);

        if (skill.power) {
          ctx.fillStyle = '#ff6b6b';
          ctx.textAlign = 'right';
          ctx.fillText(`威力: ${skill.power}`, x + w - 12, sY + 52);
        }
      });

      if (skills.length === 0) {
        ctx.fillStyle = '#606060';
        ctx.font = `${Math.min(G.W * 0.032, 13)}px "STKaiti","KaiTi",sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('暂无技能', x + w / 2, y + skillListH / 2);
      }

      const expPercent = pet.getExpProgress();
      const expBarW = w;
      const expBarH = 8;
      const expBarX = x;
      const expBarY = y + h - 15;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.roundRect(expBarX, expBarY, expBarW, expBarH, 4);
      ctx.fill();

      const expGrad = ctx.createLinearGradient(expBarX, expBarY, expBarX + expBarW * expPercent, expBarY);
      expGrad.addColorStop(0, '#4ecdc4');
      expGrad.addColorStop(1, '#44a08d');
      ctx.fillStyle = expGrad;
      ctx.beginPath();
      ctx.roundRect(expBarX, expBarY, expBarW * expPercent, expBarH, 4);
      ctx.fill();

      ctx.fillStyle = '#a0a0a0';
      ctx.font = `${Math.min(G.W * 0.02, 8)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`EXP: ${pet.exp}/${pet.getExpToNextLevel()}`, expBarX + expBarW / 2, expBarY + 5);
    }

    drawInfoTab(ctx, x, y, w, h, pet) {
      const element = pet.species.element;
      const infoItems = [
        { label: '名称', value: pet.name, icon: '🏷️' },
        { label: '种族', value: pet.species.name, icon: '🐾' },
        { label: '等级', value: `Lv.${pet.level}`, icon: '⭐' },
        { label: '属性', value: element.name, color: element.color, icon: '🔮' },
        { label: '经验', value: `${pet.exp} / ${pet.getExpToNextLevel()}`, icon: '📊' },
        { label: 'ID', value: `#${pet.id.toString().padStart(4, '0')}`, icon: '🔢' },
      ];

      const itemH = Math.min(32, (h - 20) / infoItems.length);

      infoItems.forEach((item, i) => {
        const iY = y + i * itemH;

        ctx.fillStyle = 'rgba(50, 48, 60, 0.4)';
        ctx.beginPath();
        ctx.roundRect(x, iY, w, itemH - 4, 6);
        ctx.fill();

        ctx.font = `${Math.min(G.W * 0.03, 12)}px serif`;
        ctx.textAlign = 'left';
        ctx.fillText(item.icon, x + 8, iY + itemH / 2 - 1);

        ctx.fillStyle = '#a0a0a0';
        ctx.font = `${Math.min(G.W * 0.025, 10)}px "STKaiti","KaiTi",sans-serif`;
        ctx.fillText(item.label, x + 28, iY + itemH / 2 - 1);

        ctx.fillStyle = item.color || '#f0e0c0';
        ctx.font = `bold ${Math.min(G.W * 0.028, 11)}px "STKaiti","KaiTi",sans-serif`;
        ctx.textAlign = 'right';
        ctx.fillText(item.value, x + w - 10, iY + itemH / 2 - 1);
      });

      const talentInfo = pet.getTalentRating();
      const talentSum = pet.getTalentSum();
      const talentY = y + infoItems.length * itemH + 10;

      ctx.fillStyle = 'rgba(60, 55, 70, 0.5)';
      ctx.beginPath();
      ctx.roundRect(x, talentY, w, 40, 8);
      ctx.fill();

      ctx.fillStyle = talentInfo.color;
      ctx.font = `bold ${Math.min(G.W * 0.032, 13)}px "STKaiti","KaiTi",sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`★天赋评级: ${talentInfo.rating}`, x + w / 2, talentY + 16);

      ctx.fillStyle = '#a0a0a0';
      ctx.font = `${Math.min(G.W * 0.025, 10)}px sans-serif`;
      ctx.fillText(`总天赋值: ${talentSum} / 248`, x + w / 2, talentY + 32);
    }

    drawTeamList(ctx, x, y, w, h) {
      ctx.fillStyle = 'rgba(35, 33, 48, 0.4)';
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 12);
      ctx.fill();

      ctx.strokeStyle = 'rgba(100, 90, 80, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 12);
      ctx.stroke();

      ctx.fillStyle = '#a0a0a0';
      ctx.font = `${Math.min(G.W * 0.03, 12)}px "STKaiti","KaiTi",sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('队伍成员', x + w / 2, y + 18);

      const gs = G.getGameState();
      const slotCount = G.getGameState().petManager.maxTeamSize;
      const padding = 10;
      const slotGap = 8;
      const slotWidth = (w - padding * 2 - slotGap * (slotCount - 1)) / slotCount;
      const slotHeight = Math.min(h - 40, 130);
      const slotStartY = y + 28;

      for (let i = 0; i < slotCount; i++) {
        const pet = G.getGameState().petManager.team[i];
        const slotX = x + padding + i * (slotWidth + slotGap);
        const slotY = slotStartY;
        const isSelected = this.selectedIndex === i;
        const isHovered = this.hoveredSlot === i;

        if (isSelected) {
          ctx.fillStyle = 'rgba(255, 200, 100, 0.25)';
          ctx.beginPath();
          ctx.roundRect(slotX, slotY, slotWidth, slotHeight, 8);
          ctx.fill();
        }

        ctx.fillStyle = isHovered ? 'rgba(80, 70, 60, 0.6)' : 
                        pet ? 'rgba(50, 48, 60, 0.7)' : 'rgba(30, 28, 40, 0.5)';
        ctx.beginPath();
        ctx.roundRect(slotX, slotY, slotWidth, slotHeight, 8);
        ctx.fill();

        if (isSelected) {
          ctx.strokeStyle = 'rgba(255, 200, 100, 0.9)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(slotX, slotY, slotWidth, slotHeight, 8);
          ctx.stroke();
        } else if (pet) {
          ctx.strokeStyle = 'rgba(100, 90, 80, 0.4)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(slotX, slotY, slotWidth, slotHeight, 8);
          ctx.stroke();
        } else {
          ctx.strokeStyle = 'rgba(60, 58, 70, 0.5)';
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.roundRect(slotX, slotY, slotWidth, slotHeight, 8);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        if (pet) {
          const element = pet.species.element;
          const centerX = slotX + slotWidth / 2;

          ctx.fillStyle = element.color;
          ctx.globalAlpha = 0.2;
          const glowRadius = Math.min(slotWidth * 0.3, slotHeight * 0.25);
          ctx.beginPath();
          ctx.arc(centerX, slotY + slotHeight * 0.35, glowRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;

          ctx.font = `${Math.min(G.W * 0.08, 32)}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          const replaceIconSize = Math.min(G.W * 0.08, 32) * 1.8;
          const replaceIconX = centerX;
          const replaceIconY = slotY + slotHeight * 0.35;
          
          if (!G.drawCustomPetIcon(ctx, pet.speciesId, replaceIconX, replaceIconY, replaceIconSize)) {
            ctx.fillText(this.getPetIcon(pet.speciesId), replaceIconX, replaceIconY);
          }

          if (i === 0) {
            ctx.font = `${Math.min(G.W * 0.04, 16)}px serif`;
            ctx.fillText('👑', slotX + 12, slotY + 12);
          }

          ctx.fillStyle = '#f0e0c0';
          ctx.font = `bold ${Math.min(G.W * 0.028, 11)}px "STKaiti","KaiTi",sans-serif`;
          ctx.fillText(pet.name, centerX, slotY + slotHeight * 0.6);

          ctx.fillStyle = '#ffd700';
          ctx.font = `${Math.min(G.W * 0.024, 10)}px "STKaiti","KaiTi",sans-serif`;
          ctx.fillText(`Lv.${pet.level}`, centerX, slotY + slotHeight * 0.73);

          ctx.fillStyle = element.color;
          ctx.beginPath();
          ctx.arc(slotX + slotWidth - 10, slotY + 10, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.font = `${Math.min(G.W * 0.018, 7)}px sans-serif`;
          ctx.fillText(element.name[0], slotX + slotWidth - 10, slotY + 11);

          const hpPercent = pet.currentHp / pet.getMaxHp();
          const hpBarW = slotWidth - 12;
          const hpBarH = 5;
          const hpBarX = slotX + 6;
          const hpBarY = slotY + slotHeight * 0.85;

          ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
          ctx.beginPath();
          ctx.roundRect(hpBarX, hpBarY, hpBarW, hpBarH, 2);
          ctx.fill();

          ctx.fillStyle = hpPercent > 0.5 ? '#4ecdc4' : hpPercent > 0.2 ? '#ffd93d' : '#ff6b6b';
          ctx.beginPath();
          ctx.roundRect(hpBarX, hpBarY, hpBarW * hpPercent, hpBarH, 2);
          ctx.fill();
        } else {
          ctx.fillStyle = '#505050';
          ctx.font = `${Math.min(G.W * 0.05, 20)}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('+', slotX + slotWidth / 2, slotY + slotHeight / 2 - 8);
          ctx.fillStyle = '#404040';
          ctx.font = `${Math.min(G.W * 0.022, 9)}px "STKaiti","KaiTi",sans-serif`;
          ctx.fillText('空位', slotX + slotWidth / 2, slotY + slotHeight / 2 + 12);
        }
      }
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

    drawReplacePanel(ctx, panelX, panelY, panelW, panelH) {
      ctx.globalAlpha = this.replaceAlpha;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.fillRect(panelX, panelY, panelW, panelH);

      const replaceW = Math.min(320, panelW * 0.9);
      const replaceH = Math.min(450, panelH * 0.8);
      const replaceX = (panelW - replaceW) / 2;
      const replaceY = (panelH - replaceH) / 2;

      const bgGrad = ctx.createLinearGradient(replaceX, replaceY, replaceX, replaceY + replaceH);
      bgGrad.addColorStop(0, 'rgba(40, 38, 50, 0.98)');
      bgGrad.addColorStop(1, 'rgba(30, 28, 40, 0.98)');
      ctx.fillStyle = bgGrad;
      ctx.beginPath();
      ctx.roundRect(replaceX, replaceY, replaceW, replaceH, 15);
      ctx.fill();

      ctx.strokeStyle = 'rgba(180, 160, 140, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(replaceX, replaceY, replaceW, replaceH, 15);
      ctx.stroke();

      ctx.fillStyle = '#f0e0c0';
      ctx.font = `bold ${Math.min(G.W * 0.045, 18)}px "STKaiti","KaiTi",sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('选择替换的宠物', replaceX + replaceW / 2, replaceY + 30);

      const closeBtnX = replaceX + replaceW - 20;
      const closeBtnY = replaceY + 20;
      ctx.fillStyle = 'rgba(255, 100, 100, 0.7)';
      ctx.beginPath();
      ctx.arc(closeBtnX, closeBtnY, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.min(G.W * 0.035, 16)}px sans-serif`;
      ctx.fillText('×', closeBtnX, closeBtnY + 1);

      const gs = G.getGameState();
      const warehouse = G.getGameState().petManager.warehouse;
      const listY = replaceY + 60;
      const listH = replaceH - 80;
      const itemH = 60;
      this.maxReplaceScrollY = Math.max(0, warehouse.length * itemH - listH);

      ctx.save();
      ctx.beginPath();
      ctx.rect(replaceX + 15, listY, replaceW - 30, listH);
      ctx.clip();

      for (let i = 0; i < warehouse.length; i++) {
        const pet = warehouse[i];
        const itemY = listY + i * itemH - this.replaceScrollY;
        if (itemY + itemH < listY || itemY > listY + listH) continue;

        const isHovered = this.hoveredReplaceSlot === i;
        ctx.fillStyle = isHovered ? 'rgba(80, 70, 60, 0.7)' : 'rgba(50, 48, 60, 0.6)';
        ctx.beginPath();
        ctx.roundRect(replaceX + 20, itemY, replaceW - 40, itemH - 5, 10);
        ctx.fill();

        const element = pet.species.element;
        ctx.fillStyle = element.color;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(replaceX + 55, itemY + itemH / 2 - 2, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = this.replaceAlpha;

        ctx.font = `${Math.min(G.W * 0.07, 28)}px serif`;
        ctx.textAlign = 'center';
        
        const bagIconSize = Math.min(G.W * 0.07, 28) * 1.8;
        const bagIconX = replaceX + 55;
        const bagIconY = itemY + itemH / 2;
        
        if (!G.drawCustomPetIcon(ctx, pet.speciesId, bagIconX, bagIconY, bagIconSize)) {
          ctx.fillText(this.getPetIcon(pet.speciesId), bagIconX, bagIconY);
        }

        ctx.fillStyle = '#f0e0c0';
        ctx.font = `bold ${Math.min(G.W * 0.035, 14)}px "STKaiti","KaiTi",sans-serif`;
        ctx.textAlign = 'left';
        ctx.fillText(pet.name, replaceX + 90, itemY + 20);

        ctx.fillStyle = '#a0a0a0';
        ctx.font = `${Math.min(G.W * 0.028, 11)}px "STKaiti","KaiTi",sans-serif`;
        ctx.fillText(`Lv.${pet.level} · ${element.name}属性`, replaceX + 90, itemY + 40);
      }

      ctx.restore();

      if (warehouse.length === 0) {
        ctx.fillStyle = '#606060';
        ctx.font = `${Math.min(G.W * 0.035, 14)}px "STKaiti","KaiTi",sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('仓库空空如也...', replaceX + replaceW / 2, listY + listH / 2);
      }

      ctx.globalAlpha = this.alpha;
    }

    handleClick(x, y) {
      if (!this.visible || this.alpha < 0.5) return null;

      const panelX = 0;
      const panelY = 0;
      const panelW = G.W;
      const panelH = G.H;

      const closeBtnX = 25;
      const closeBtnY = 37;
      if (G.dist(x, y, closeBtnX, closeBtnY) < 20) {
        this.hide();
        return 'close';
      }

      const headerH = 75;
      const contentH = panelH - headerH;
      const detailH = contentH * 0.60;
      const detailAreaX = 10;
      const detailAreaY = headerH;
      const detailAreaW = panelW - 20;

      const isSkillTab = this.currentTab === 0;
      let leftWidth, rightWidth, rightX;
      
      if (isSkillTab) {
        leftWidth = detailAreaW * 0.35;
        rightWidth = detailAreaW - leftWidth - 15;
        rightX = detailAreaX + leftWidth + 15;
      } else {
        leftWidth = 0;
        rightWidth = detailAreaW - 20;
        rightX = detailAreaX + 10;
      }
      
      if (this.currentTab === 1) {
        const gs = G.getGameState();
        const pet = G.getGameState().petManager.team[this.selectedIndex];
        const stats = this._lastStats;
        if (pet && stats) {
          for (let i = 0; i < stats.length; i++) {
            const stat = stats[i];
            if (stat._btnX !== undefined && 
              x >= stat._btnX && x <= stat._btnX + stat._btnW &&
              y >= stat._btnY && y <= stat._btnY + stat._btnH) {
              pet.allocateTrainingPoint(stat.ivKey);
              return 'allocate_ev';
            }
          }
        }
      }

      const tabH = 36;
      const tabY = detailAreaY + 8;
      const tabGap = 6;
      const tabWidth = (rightWidth - 10 - tabGap * 2) / 3;
      const tabStartX = rightX + 5;

      if (y >= tabY && y <= tabY + tabH) {
        for (let i = 0; i < this.tabs.length; i++) {
          const tX = tabStartX + i * (tabWidth + tabGap);
          if (x >= tX && x <= tX + tabWidth) {
            this.currentTab = i;
            return 'tab_switch';
          }
        }
      }

      if (this.replaceAlpha > 0.5) {
        const replaceW = Math.min(320, panelW * 0.9);
        const replaceH = Math.min(450, panelH * 0.8);
        const replaceX = (panelW - replaceW) / 2;
        const replaceY = (panelH - replaceH) / 2;

        const closeBtnX = replaceX + replaceW - 20;
        const closeBtnY = replaceY + 20;
        if (G.dist(x, y, closeBtnX, closeBtnY) < 18) {
          this.showReplace = false;
          return 'close_replace';
        }

        const gs = G.getGameState();
        const warehouse = G.getGameState().petManager.warehouse;
        const listY = replaceY + 60;
        const itemH = 60;

        for (let i = 0; i < warehouse.length; i++) {
          const itemY = listY + i * itemH - this.replaceScrollY;
          if (x >= replaceX + 20 && x <= replaceX + replaceW - 20 &&
            y >= itemY && y <= itemY + itemH - 5) {
            const newPet = warehouse[i];
            const oldPet = G.getGameState().petManager.team[this.selectedIndex];
            if (oldPet) {
              G.getGameState().petManager.swapTeamMember(oldPet.id, newPet);
            }
            this.showReplace = false;
            return 'replaced';
          }
        }
        return 'handled';
      }

      const listY = headerH + detailH + 10;
      const listH = contentH * 0.40 - 10;

      const gs = G.getGameState();
      const pet = G.getGameState().petManager.team[this.selectedIndex];
      if (pet) {
        const isSkillTab = this.currentTab === 0;
        
        // 使用与绘制一致的坐标
        let actualLeftX, actualLeftWidth;
        if (isSkillTab) {
          actualLeftX = detailAreaX + 10;  // 与 drawDetailArea 中的 leftX 一致
          actualLeftWidth = detailAreaW * 0.35;
        } else {
          actualLeftX = detailAreaX;       // 非技能标签页
          actualLeftWidth = 0;
        }

        if (isSkillTab) {
          // 使用绘制时存储的按钮位置，确保坐标一致
          if (this._avatarBtns) {
            for (const btn of this._avatarBtns) {
              if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
                switch (btn.action) {
                  case 'captain':
                    if (this.selectedIndex !== 0) {
                      G.getGameState().petManager.setCaptain(pet.id);
                      this.selectedIndex = 0;
                    }
                    return 'set_captain';
                  case 'store':
                    G.getGameState().petManager.removeFromTeam(pet.id);
                    if (G.getGameState().petManager.team.length > 0) {
                      this.selectedIndex = Math.min(this.selectedIndex, G.getGameState().petManager.team.length - 1);
                    } else {
                      this.selectedIndex = 0;
                    }
                    return 'stored';
                  case 'heal': {
                    const hpPotionCount = G.getGameState().bagManager.getItemCount('hp_potion');
                    if (hpPotionCount > 0 && pet.currentHp < pet.getMaxHp()) {
                      const healAmount = G.ItemsDB.hp_potion.healHp;
                      pet.heal(healAmount);
                      G.getGameState().bagManager.removeItem('hp_potion', 1);
                      return 'healed';
                    }
                    return null;
                  }
                  case 'replace':
                    this.showReplace = true;
                    this.replaceScrollY = 0;
                    this.targetReplaceScrollY = 0;
                    return 'show_replace';
                }
              }
            }
          }
        } else {
          const btnAreaY = listY + listH;
          const btnAreaH = 100;

          const btnCols = 2;
          const btnRows = 2;
          const btnGap = 12;
          const btnW = (panelW - 40 - (btnCols - 1) * btnGap) / btnCols;
          const btnH = 38;
          const btnStartY = btnAreaY + 12;
          const startX = 20;

          if (y >= btnStartY && y <= btnStartY + btnH) {
            if (x >= startX && x <= startX + btnW) {
              if (this.selectedIndex !== 0) {
                G.getGameState().petManager.setCaptain(pet.id);
                this.selectedIndex = 0;
              }
              return 'set_captain';
            }

            if (x >= startX + btnW + btnGap && x <= startX + btnW + btnGap + btnW) {
              G.getGameState().petManager.removeFromTeam(pet.id);
              if (G.getGameState().petManager.team.length > 0) {
                this.selectedIndex = Math.min(this.selectedIndex, G.getGameState().petManager.team.length - 1);
              } else {
                this.selectedIndex = 0;
              }
              return 'stored';
            }
          }

          if (y >= btnStartY + btnH + btnGap && y <= btnStartY + btnH * 2 + btnGap) {
            if (x >= startX && x <= startX + btnW) {
              const hpPotionCount = G.getGameState().bagManager.getItemCount('hp_potion');
              if (hpPotionCount > 0 && pet.currentHp < pet.getMaxHp()) {
                const healAmount = G.ItemsDB.hp_potion.healHp;
                pet.heal(healAmount);
                G.getGameState().bagManager.removeItem('hp_potion', 1);
                return 'healed';
              }
              return null;
            }

            if (x >= startX + btnW + btnGap && x <= startX + btnW + btnGap + btnW) {
              this.showReplace = true;
              this.replaceScrollY = 0;
              this.targetReplaceScrollY = 0;
              return 'show_replace';
            }
          }
        }
      }

      const slotCount = G.getGameState().petManager.maxTeamSize;
      const padding = 10;
      const slotGap = 8;
      const slotWidth = (panelW - padding * 2 - slotGap * (slotCount - 1)) / slotCount;
      const slotHeight = listH - 40;
      const slotStartY = listY + 28;

      for (let i = 0; i < slotCount; i++) {
        const slotX = padding + i * (slotWidth + slotGap);
        if (x >= slotX && x <= slotX + slotWidth &&
          y >= slotStartY && y <= slotStartY + slotHeight) {
          if (G.getGameState().petManager.team[i]) {
            this.selectedIndex = i;
            return 'select:' + G.getGameState().petManager.team[i].id;
          }
        }
      }

      return null;
    }

    handlePointerMove(x, y) {
      const panelW = G.W;
      const panelH = G.H;

      if (this.replaceAlpha > 0.5) {
        const replaceW = Math.min(320, panelW * 0.9);
        const replaceH = Math.min(450, panelH * 0.8);
        const replaceX = (panelW - replaceW) / 2;
        const replaceY = (panelH - replaceH) / 2;
        const listY = replaceY + 60;
        const itemH = 60;
        const gs = G.getGameState();
        const warehouse = G.getGameState().petManager.warehouse;

        this.hoveredReplaceSlot = null;
        for (let i = 0; i < warehouse.length; i++) {
          const itemY = listY + i * itemH - this.replaceScrollY;
          if (x >= replaceX + 20 && x <= replaceX + replaceW - 20 &&
            y >= itemY && y <= itemY + itemH - 5) {
            this.hoveredReplaceSlot = i;
            break;
          }
        }
        return;
      }

      this.hoveredAllocBtn = null;
      if (this.currentTab === 1) {
        const gs = G.getGameState();
        const pet = G.getGameState().petManager.team[this.selectedIndex];
        const stats = this._lastStats;
        if (pet && stats) {
          for (let i = 0; i < stats.length; i++) {
            const stat = stats[i];
            if (stat._btnX !== undefined && 
              x >= stat._btnX && x <= stat._btnX + stat._btnW &&
              y >= stat._btnY && y <= stat._btnY + stat._btnH) {
              this.hoveredAllocBtn = i;
              break;
            }
          }
        }
      }
      
      const headerH = 75;
      const contentH = panelH - headerH;
      const detailH = contentH * 0.60;
      const listY = headerH + detailH + 10;
      const listH = contentH * 0.40 - 10;

      const gs = G.getGameState();
      const slotCount = G.getGameState().petManager.maxTeamSize;
      const padding = 10;
      const slotGap = 8;
      const slotWidth = (panelW - padding * 2 - slotGap * (slotCount - 1)) / slotCount;
      const slotHeight = listH - 40;
      const slotStartY = listY + 28;

      this.hoveredSlot = null;
      for (let i = 0; i < slotCount; i++) {
        const slotX = padding + i * (slotWidth + slotGap);
        if (x >= slotX && x <= slotX + slotWidth &&
          y >= slotStartY && y <= slotStartY + slotHeight) {
          this.hoveredSlot = i;
          break;
        }
      }
    }

    handlePointerDown(x, y) {
      if (this.replaceAlpha > 0.5) {
        return 'handled';
      }
      return null;
    }

    handlePointerUp(x, y) {
    }

    isPointInside(x, y) {
      if (!this.visible || this.alpha < 0.5) return false;
      const panelX = 0;
      const panelY = 0;
      const panelW = G.W;
      const panelH = G.H;
      return x >= panelX && x <= panelX + panelW && y >= panelY && y <= panelY + panelH;
    }
  }

  G.TeamPanel = TeamPanel;
})(window.GameApp);

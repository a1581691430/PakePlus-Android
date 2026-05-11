(function(G) {
  G.PetIconImages = {};
  G.PetIconPaths = {
    snow_hare: 'assets/images/pets/snow_hare.png',
    fire_fox: 'assets/images/pets/fire_fox.png',
    sprout_deer: 'assets/images/pets/sprout_deer.png',
    ripple_turtle: 'assets/images/pets/ripple_turtle.png',
    shadow_mouse: 'assets/images/pets/shadow_mouse.png',
    light_sparrow: 'assets/images/pets/light_sparrow.png'
  };

  let petIconsLoaded = false;

  G.preloadPetIcons = function(callback) {
    const speciesIds = Object.keys(G.PetIconPaths);
    let loadedCount = 0;
    let errorCount = 0;

    speciesIds.forEach(id => {
      const img = new Image();
      img.onload = () => {
        G.PetIconImages[id] = img;
        loadedCount++;
        if (loadedCount + errorCount === speciesIds.length) {
          petIconsLoaded = true;
          console.log(`✅ 宠物图标加载完成: ${loadedCount}/${speciesIds.length} 成功`);
          if (callback) callback(true);
        }
      };
      img.onerror = () => {
        errorCount++;
        console.warn(`⚠️ 宠物图标加载失败: ${G.PetIconPaths[id]}`);
        if (loadedCount + errorCount === speciesIds.length) {
          if (callback) callback(false);
        }
      };
      img.src = G.PetIconPaths[id];
    });
  };

  G.drawCustomPetIcon = function(ctx, speciesId, x, y, maxSize) {
    const img = G.PetIconImages[speciesId];
    if (img && img.complete) {
      ctx.save();
      const ratio = img.width / img.height;
      let drawW, drawH;
      if (ratio > 1) {
        drawW = maxSize;
        drawH = maxSize / ratio;
      } else {
        drawH = maxSize;
        drawW = maxSize * ratio;
      }
      ctx.drawImage(img, x - drawW / 2, y - drawH / 2, drawW, drawH);
      ctx.restore();
      return true;
    }
    return false;
  };

  G.hasCustomPetIcon = function(speciesId) {
    return !!G.PetIconPaths[speciesId];
  };

  // 预加载宠物图标
  G.preloadPetIcons();
})(window.GameApp);
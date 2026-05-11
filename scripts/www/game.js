(function() {
            // ============ Canvas 初始化 ============
            const canvas = document.getElementById('gameCanvas');
            const ctx = canvas.getContext('2d');

            let W, H;
            let dpr = Math.min(window.devicePixelRatio || 1, 2); // 限制像素比以保证性能

            function resizeCanvas() {
                W = window.innerWidth;
                H = window.innerHeight;
                canvas.width = W * dpr;
                canvas.height = H * dpr;
                canvas.style.width = W + 'px';
                canvas.style.height = H + 'px';
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.scale(dpr, dpr);
            }

            resizeCanvas();
            window.addEventListener('resize', () => {
                resizeCanvas();
                if (currentScene === 'world' && worldScene) {
                    worldScene.recalcDimensions();
                }
            });
            window.addEventListener('orientationchange', () => {
                setTimeout(() => {
                    resizeCanvas();
                    if (currentScene === 'world' && worldScene) {
                        worldScene.recalcDimensions();
                    }
                }, 300);
            });

            // ============ 场景管理器 ============
            let currentScene = 'start';
            let startScene, loadingScene, worldScene, homeScene;
            let sceneTransition = null; // 场景过渡状态
            let topBar = null; // 顶栏UI组件
            let bottomBar = null; // 底栏UI组件
            let warehousePanel = null; // 仓库界面（宠物）
            let teamPanel = null; // 队伍界面
            let bagPanel = null; // 背包界面（道具）
            let tutorialScene = null; // 新手引导场景
            let battleScene = null; // 战斗场景

            // ============ 玩家数据模型（已移至 GameState 内部） ============

            // ============ UUID生成器 ============
            function generateUUID() {
                return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                    const r = Math.random() * 16 | 0;
                    const v = c === 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                });
            }

            // ============ 16属性系统（奥拉星原版） ============
            const Element = {
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
            function getEffectiveness(atkElementId, defElementId) {
                const elements = Object.values(Element);
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
            }

            // 双属性倍率计算（相乘）
            function getDoubleEffectiveness(atkElementId, defElementIds) {
                if (!Array.isArray(defElementIds) || defElementIds.length === 0) {
                    return getEffectiveness(atkElementId, defElementIds);
                }
                
                let multiplier = 1.0;
                for (const defId of defElementIds) {
                    multiplier *= getEffectiveness(atkElementId, defId);
                }
                return multiplier;
            }

            // ============ 性格系统（奥拉星原版25种：只影响atk/def/spa/spd/res中的两项）============
            const Natures = [
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

            // ============ 技能类型 ============
            const SkillType = {
                DAMAGE: 'damage',
                CONTROL: 'control',
                DEBUFF: 'debuff',
                TACTICAL: 'tactical',
            };

            // ============ 技能数据库 ============
            const SkillsDB = {
                fire_breath: { id: 'fire_breath', name: '火焰吐息', type: SkillType.DAMAGE, element: 'fire', power: 45, accuracy: 95, pp: 5, cooldown: 0, attackType: 'spa', description: '吐出灼热的火焰攻击敌人' },
                flame_burst: { id: 'flame_burst', name: '烈焰爆发', type: SkillType.DAMAGE, element: 'fire', power: 70, accuracy: 90, pp: 5, cooldown: 0, attackType: 'spa', description: '释放强烈的火焰爆发' },
                inferno_strike: { id: 'inferno_strike', name: '炼狱冲击', type: SkillType.DAMAGE, element: 'fire', power: 100, accuracy: 85, pp: 5, cooldown: 0, attackType: 'spa', description: '召唤炼狱之火进行毁灭性打击' },
                water_jet: { id: 'water_jet', name: '水流喷射', type: SkillType.DAMAGE, element: 'water', power: 40, accuracy: 100, pp: 5, cooldown: 0, attackType: 'spa', description: '高速喷射水流攻击敌人' },
                aqua_vortex: { id: 'aqua_vortex', name: '水漩涡', type: SkillType.DAMAGE, element: 'water', power: 65, accuracy: 95, pp: 5, cooldown: 0, attackType: 'spa', description: '制造巨大的水漩涡吞噬敌人' },
                tsunami_wave: { id: 'tsunami_wave', name: '海啸巨浪', type: SkillType.DAMAGE, element: 'water', power: 95, accuracy: 88, pp: 5, cooldown: 0, attackType: 'spa', description: '召唤巨大的海啸波浪淹没敌人' },
                leaf_blade: { id: 'leaf_blade', name: '叶刃斩', type: SkillType.DAMAGE, element: 'wood', power: 45, accuracy: 95, pp: 5, cooldown: 0, attackType: 'atk', description: '用锋利的叶片斩击敌人' },
                nature_force: { id: 'nature_force', name: '自然之力', type: SkillType.DAMAGE, element: 'wood', power: 60, accuracy: 95, pp: 5, cooldown: 0, attackType: 'spa', description: '借助自然的力量攻击敌人' },
                forest_wrath: { id: 'forest_wrath', name: '森林之怒', type: SkillType.DAMAGE, element: 'wood', power: 90, accuracy: 90, pp: 5, cooldown: 0, attackType: 'spa', description: '召唤森林的愤怒，释放强力攻击' },
                ember: { id: 'ember', name: '火花', type: SkillType.DAMAGE, element: 'fire', power: 30, accuracy: 100, pp: 25, attackType: 'spa', description: '发射小火球攻击' },
                flame_wheel: { id: 'flame_wheel', name: '火焰轮', type: SkillType.DAMAGE, element: 'fire', power: 45, accuracy: 95, pp: 20, attackType: 'atk', description: '身体被火焰包围，高速旋转攻击' },
                fire_fang: { id: 'fire_fang', name: '火焰牙', type: SkillType.DAMAGE, element: 'fire', power: 55, accuracy: 90, pp: 18, attackType: 'atk', description: '用燃烧的牙齿撕咬敌人' },
                bubble: { id: 'bubble', name: '泡沫', type: SkillType.DAMAGE, element: 'water', power: 30, accuracy: 100, pp: 25, attackType: 'spa', description: '吐出泡沫攻击' },
                water_pulse: { id: 'water_pulse', name: '水波动', type: SkillType.DAMAGE, element: 'water', power: 45, accuracy: 95, pp: 20, attackType: 'spa', description: '发射水波攻击敌人' },
                aqua_tail: { id: 'aqua_tail', name: '水流尾', type: SkillType.DAMAGE, element: 'water', power: 55, accuracy: 90, pp: 18, attackType: 'atk', description: '用覆盖水流的尾巴攻击' },
                vine_whip: { id: 'vine_whip', name: '藤鞭', type: SkillType.DAMAGE, element: 'wood', power: 30, accuracy: 100, pp: 25, attackType: 'atk', description: '用藤蔓鞭打敌人' },
                razor_leaf: { id: 'razor_leaf', name: '飞叶快刀', type: SkillType.DAMAGE, element: 'wood', power: 45, accuracy: 95, pp: 20, attackType: 'atk', description: '发射锋利的叶片切割敌人' },
                seed_bomb: { id: 'seed_bomb', name: '种子炸弹', type: SkillType.DAMAGE, element: 'wood', power: 55, accuracy: 90, pp: 18, attackType: 'atk', description: '投掷爆炸性的种子' },
                tackle: { id: 'tackle', name: '撞击', type: SkillType.DAMAGE, element: 'normal', power: 25, accuracy: 100, pp: 30, attackType: 'atk', description: '用身体撞击敌人' },
                scratch: { id: 'scratch', name: '抓击', type: SkillType.DAMAGE, element: 'normal', power: 28, accuracy: 95, pp: 28, attackType: 'atk', description: '用爪子抓击敌人' },
                quick_attack: { id: 'quick_attack', name: '电光一闪', type: SkillType.DAMAGE, element: 'normal', power: 35, accuracy: 100, pp: 25, attackType: 'atk', description: '高速冲向敌人攻击' },
                bite: { id: 'bite', name: '咬住', type: SkillType.DAMAGE, element: 'normal', power: 40, accuracy: 100, pp: 22, attackType: 'atk', description: '用牙齿咬住敌人' },
                sleep_powder: { id: 'sleep_powder', name: '催眠粉', type: SkillType.CONTROL, element: 'wood', power: 0, accuracy: 75, pp: 15, description: '撒出催眠粉使敌人入睡' },
                paralyze_spore: { id: 'paralyze_spore', name: '麻痹孢子', type: SkillType.CONTROL, element: 'wood', power: 0, accuracy: 80, pp: 18, description: '释放麻痹孢子使敌人麻痹' },
                thunder_wave: { id: 'thunder_wave', name: '电磁波', type: SkillType.CONTROL, element: 'electric', power: 0, accuracy: 90, pp: 20, description: '释放电磁波使敌人麻痹' },
                shadow_sneak: { id: 'shadow_sneak', name: '暗影偷袭', type: SkillType.DAMAGE, element: 'dark', power: 35, accuracy: 100, pp: 20, attackType: 'atk', description: '从暗影中突袭敌人' },
                flash: { id: 'flash', name: '闪光', type: SkillType.DEBUFF, element: 'light', power: 0, accuracy: 70, pp: 18, description: '发出强光降低敌人命中率' },
                recover: { id: 'recover', name: '自我恢复', type: SkillType.TACTICAL, element: 'normal', power: 0, accuracy: 100, pp: 10, description: '恢复自身部分HP' },
                iron_defense: { id: 'iron_defense', name: '铁壁', type: SkillType.TACTICAL, element: 'normal', power: 0, accuracy: 100, pp: 15, description: '大幅提升自身防御' },
                agility: { id: 'agility', name: '高速移动', type: SkillType.TACTICAL, element: 'normal', power: 0, accuracy: 100, pp: 20, description: '大幅提升自身速度' },

                // ============ 寒冰玉兔专属技能 ============
                snowball: { id: 'snowball', name: '寒冰环', type: SkillType.DAMAGE, element: 'ice', power: 45, accuracy: 95, pp: 25, attackType: 'spa', description: '释放冰环攻击敌人' },
                ice_bloom_flower: { id: 'ice_bloom_flower', name: '冰瀑寒花', type: SkillType.DAMAGE, element: 'ice', power: 85, accuracy: 90, pp: 5, attackType: 'spa', description: '绽放冰花造成强力冰系伤害' },
                freeze_current: { id: 'freeze_current', name: '急冻寒流', type: SkillType.DAMAGE, element: 'ice', power: 65, accuracy: 95, pp: 20, attackType: 'spa', description: '释放极寒冷气攻击' },
                reckless: { id: 'reckless', name: '鲁莽', type: SkillType.TACTICAL, element: 'normal', power: 1, accuracy: 95, pp: 10, description: '无视防御给予固定伤害，威力等于已损失HP' },
                ability_boost: { id: 'ability_boost', name: '异能强化', type: SkillType.TACTICAL, element: 'normal', power: 0, accuracy: 100, pp: 15, description: '强化自身防御与特防' },
                frost_fang: { id: 'frost_fang', name: '霜冻牙', type: SkillType.DAMAGE, element: 'ice', power: 55, accuracy: 95, pp: 18, attackType: 'atk', description: '用冻结的牙齿撕咬敌人' },
                cold_wind: { id: 'cold_wind', name: '寒光缠绕', type: SkillType.DAMAGE, element: 'ice', power: 50, accuracy: 100, pp: 22, attackType: 'spa', description: '寒气缠绕降低对手速度' },
            };

            // ============ 种族数据库 ============
            const SpeciesDB = {
                fire_fox: {
                    id: 'fire_fox',
                    name: '爆焰吉拉',
                    element: Element.FIRE,
                    baseStats: { hp: 80, atk: 110, def: 70, spa: 110, spd: 100, res: 70 },
                    fixedSkill: SkillsDB.inferno_strike,
                    skillPool: ['flame_wheel', 'fire_fang', 'bite', 'quick_attack', 'agility', 'iron_defense'],
                    catchRate: 45,
                    expYield: 240,
                    evYield: { atk: 2, spa: 1 },
                    description: '火系三主宠之一，拥有强大的双攻能力，速度极快',
                    appearance: '全身燃烧着火焰的龙型生物，眼神锐利而充满力量',
                    personality: '热情奔放，战斗中充满激情与爆发力',
                    rarity: 'starter',
                },
                ripple_turtle: {
                    id: 'ripple_turtle',
                    name: '露西亚',
                    element: Element.WATER,
                    baseStats: { hp: 90, atk: 90, def: 90, spa: 90, spd: 90, res: 90 },
                    fixedSkill: SkillsDB.tsunami_wave,
                    skillPool: ['water_pulse', 'aqua_tail', 'bite', 'iron_defense', 'recover', 'agility'],
                    catchRate: 45,
                    expYield: 238,
                    evYield: { hp: 1, def: 1, res: 1 },
                    description: '水系三主宠之一，各项能力均衡发展，全能型战士',
                    appearance: '优雅的水精灵形态，周身环绕着清澈的水流',
                    personality: '冷静沉着，在任何情况下都能保持平衡',
                    rarity: 'starter',
                },
                sprout_deer: {
                    id: 'sprout_deer',
                    name: '大师兔',
                    element: Element.WOOD,
                    baseStats: { hp: 80, atk: 90, def: 100, spa: 90, spd: 80, res: 100 },
                    fixedSkill: SkillsDB.forest_wrath,
                    skillPool: ['razor_leaf', 'seed_bomb', 'sleep_powder', 'paralyze_spore', 'quick_attack', 'agility'],
                    catchRate: 45,
                    expYield: 236,
                    evYield: { def: 2, res: 1 },
                    description: '草系三主宠之一，拥有超高的双防能力，是优秀的坦克',
                    appearance: '威武的兔型生物，身上覆盖着坚硬的草甲护盾',
                    personality: '稳重可靠，是值得信赖的守护者',
                    rarity: 'starter',
                },
                shadow_mouse: {
                    id: 'shadow_mouse',
                    name: '暗夜鼠',
                    element: Element.DARK,
                    baseStats: { hp: 55, atk: 68, def: 48, spa: 58, spd: 95, res: 42 },
                    fixedSkill: SkillsDB.shadow_sneak,
                    skillPool: ['scratch', 'quick_attack', 'bite', 'agility'],
                    catchRate: 180,
                    expYield: 90,
                    evYield: { atk: 2 },
                    description: '速度极快，能够在黑暗中自由穿梭',
                    appearance: '体型变大，全身被暗影包围',
                    personality: '敏捷而神秘，是出色的侦察者',
                    rarity: 'common',
                },
                light_sparrow: {
                    id: 'light_sparrow',
                    name: '辉光鸟',
                    element: Element.LIGHT,
                    baseStats: { hp: 58, atk: 62, def: 50, spa: 70, spd: 88, res: 45 },
                    fixedSkill: SkillsDB.flash,
                    skillPool: ['tackle', 'quick_attack', 'agility'],
                    catchRate: 120,
                    expYield: 105,
                    evYield: { spa: 2 },
                    description: '光芒更加耀眼，能够照亮黑暗',
                    appearance: '翅膀变得更加华丽，光芒四射',
                    personality: '高贵优雅，是光明使者',
                    rarity: 'common',
                },
                // ============ 寒冰玉兔（奥拉星异空间 - 艾夕区）============
                snow_hare: {
                    id: 'snow_hare',
                    name: '寒冰玉兔',
                    element: Element.ICE,
                    baseStats: { hp: 90, atk: 70, def: 80, spa: 50, spd: 90, res: 95 },
                    fixedSkill: SkillsDB.ice_bloom_flower,
                    skillPool: [
                        'reckless',           // 鲁莽
                        'freeze_current',     // 急冻寒流
                        'ability_boost',      // 异能强化
                        'frost_fang',         // 霜冻牙
                        'cold_wind',          // 寒光缠绕
                        'agility'             // 高速移动 (已有)
                    ],
                    catchRate: 160,
                    expYield: 125,
                    evYield: { spd: 2 },
                    description: '生活在艾夕区的冰兔，擅长用冰冻控制对手',
                    appearance: '雪白的兔型生物，双耳挂满冰晶',
                    personality: '机敏而灵动',
                    rarity: 'common',
                },
            };

            // ============ 宠物图标图片系统 ============
            const PetIconImages = {};
            const PetIconPaths = {
                snow_hare: 'assets/images/pets/snow_hare.png',
                fire_fox: 'assets/images/pets/fire_fox.png',
                sprout_deer: 'assets/images/pets/sprout_deer.png',
                ripple_turtle: 'assets/images/pets/ripple_turtle.png',
                shadow_mouse: 'assets/images/pets/shadow_mouse.png',
                light_sparrow: 'assets/images/pets/light_sparrow.png'
            };

            let petIconsLoaded = false;

            function preloadPetIcons(callback) {
                const speciesIds = Object.keys(PetIconPaths);
                let loadedCount = 0;
                let errorCount = 0;

                speciesIds.forEach(id => {
                    const img = new Image();
                    img.onload = () => {
                        PetIconImages[id] = img;
                        loadedCount++;
                        if (loadedCount + errorCount === speciesIds.length) {
                            petIconsLoaded = true;
                            console.log(`✅ 宠物图标加载完成: ${loadedCount}/${speciesIds.length} 成功`);
                            if (callback) callback(true);
                        }
                    };
                    img.onerror = () => {
                        errorCount++;
                        console.warn(`⚠️ 宠物图标加载失败: ${PetIconPaths[id]}`);
                        if (loadedCount + errorCount === speciesIds.length) {
                            if (callback) callback(false);
                        }
                    };
                    img.src = PetIconPaths[id];
                });
            }

            function drawCustomPetIcon(ctx, speciesId, x, y, maxSize) {
                const img = PetIconImages[speciesId];
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
            }

            function hasCustomPetIcon(speciesId) {
                return !!PetIconPaths[speciesId];
            }

            // 预加载宠物图标
            preloadPetIcons();

            // ============ 宠物名称生成器 ============
            const PetNamePrefixes = ['小', '大', '飞', '闪', '暗', '光', '烈', '冰', '炎', '风', '雷', '星', '月', '云', '雪', '影'];
            const PetNameSuffixes = ['球', '豆', '丸', '仔', '宝', '灵', '精', '怪', '兽', '龙', '凤', '虎', '狼', '猫', '犬', '鸟'];

            function generatePetName() {
                const prefix = PetNamePrefixes[Math.floor(Math.random() * PetNamePrefixes.length)];
                const suffix = PetNameSuffixes[Math.floor(Math.random() * PetNameSuffixes.length)];
                return prefix + suffix;
            }

            // ============ 宠物类 ============
            class Pet {
                constructor(options = {}) {
                    this.id = options.id || generateUUID();
                    this.speciesId = options.speciesId;
                    this.species = SpeciesDB[options.speciesId];
                    this.customName = options.customName || null;
                    this.level = options.level || 1;
                    this.exp = options.exp || 0;
                    this.ivs = options.ivs || this.generateIVs();
                    this.evs = options.evs || this.generateEVs();
                    this.trainingPoints = options.trainingPoints || 0; // 修行池
                    this.nature = options.nature || Natures[Math.floor(Math.random() * Natures.length)];
                    this.randomSkills = options.randomSkills || [];
                    this.fixedSkillCooldown = options.fixedSkillCooldown || 0;
                    this.currentHp = options.currentHp !== undefined ? options.currentHp : this.getMaxHp();
                    this.status = options.status || null;
                    this.metLocation = options.metLocation || '未知';
                    this.metTime = options.metTime || Date.now();
                    this.isNew = options.isNew !== undefined ? options.isNew : true;
                }

                generateEVs() {
                    return {
                        hp: 0,
                        atk: 0,
                        def: 0,
                        spa: 0,
                        spd: 0,
                        res: 0
                    };
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
                    // 奥拉星原版：性格影响atk/def/spa/res/spd（不影响hp）
                    if (stat === 'atk') value = Math.floor(value * this.nature.atkMod);
                    if (stat === 'def') value = Math.floor(value * this.nature.defMod);
                    if (stat === 'spa') value = Math.floor(value * this.nature.spaMod);
                    if (stat === 'res') value = Math.floor(value * (this.nature.resMod || 1));
                    if (stat === 'spd') value = Math.floor(value * this.nature.spdMod);
                    return Math.max(1, value);
                }

                getMaxHp() {
                    return this.getStat('hp');
                }

                getAtk() {
                    return this.getStat('atk');
                }

                getDef() {
                    return this.getStat('def');
                }

                getSpa() {
                    return this.getStat('spa');
                }

                getRes() {
                    return this.getStat('res');
                }

                getSpd() {
                    return this.getStat('spd');
                }

                // 统一经验系统：所有宠物1→100级共需50万经验
                // 公式：每级所需 = 480 + 等级² × 1.35（总计≈500,000）
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
                        const skill = SkillsDB[skillId];
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

                resetCooldown() {
                    this.fixedSkillCooldown = 0;
                }

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

                applyStatus(status) {
                    this.status = status;
                }

                clearStatus() {
                    this.status = null;
                }

                isFainted() {
                    return this.currentHp <= 0;
                }

                rename(newName) {
                    this.customName = newName;
                }

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
                    const nature = Natures.find(n => n.id === data.natureId) || Natures[0];
                    
                    // 兼容旧存档，确保 ivs 和 evs 有完整的6属性
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
                    const species = SpeciesDB[speciesId];
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

            // ============ 宠物管理器 ============
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
                        manager.warehouse = data.warehouse.map(p => Pet.fromJSON(p));
                    }
                    if (data.team) {
                        manager.team = data.team.map(p => Pet.fromJSON(p));
                    }
                    return manager;
                }
            }

            // ============ 道具类型 ============
            const ItemType = {
                BALL: 'ball',
                POTION: 'potion',
                BAIT: 'bait',
                MATERIAL: 'material',
            };

            // ============ 道具数据库 ============
            const ItemsDB = {
                normal_ball: {
                    id: 'normal_ball',
                    name: '普通球',
                    type: ItemType.BALL,
                    icon: '🔴',
                    description: '最基础的捕捉球，捕捉率一般',
                    catchRate: 1.0,
                    price: 100,
                    stackable: true,
                    maxStack: 99,
                },
                great_ball: {
                    id: 'great_ball',
                    name: '高级球',
                    type: ItemType.BALL,
                    icon: '🔵',
                    description: '性能更好的捕捉球，捕捉率较高',
                    catchRate: 1.5,
                    price: 300,
                    stackable: true,
                    maxStack: 99,
                },
                ultra_ball: {
                    id: 'ultra_ball',
                    name: '超级球',
                    type: ItemType.BALL,
                    icon: '🟣',
                    description: '高性能捕捉球，捕捉率很高',
                    catchRate: 2.0,
                    price: 600,
                    stackable: true,
                    maxStack: 99,
                },
                master_ball: {
                    id: 'master_ball',
                    name: '大师球',
                    type: ItemType.BALL,
                    icon: '🟡',
                    description: '传说中的捕捉球，必定成功',
                    catchRate: 255,
                    price: 0,
                    stackable: true,
                    maxStack: 10,
                },
                hp_potion: {
                    id: 'hp_potion',
                    name: '生命药剂',
                    type: ItemType.POTION,
                    icon: '❤️',
                    description: '恢复宠物30点HP',
                    healHp: 30,
                    price: 50,
                    stackable: true,
                    maxStack: 99,
                },
                super_potion: {
                    id: 'super_potion',
                    name: '高级药剂',
                    type: ItemType.POTION,
                    icon: '💖',
                    description: '恢复宠物60点HP',
                    healHp: 60,
                    price: 120,
                    stackable: true,
                    maxStack: 99,
                },
                full_heal: {
                    id: 'full_heal',
                    name: '完全恢复',
                    type: ItemType.POTION,
                    icon: '💝',
                    description: '完全恢复宠物HP并治愈异常状态',
                    healHp: 999,
                    cureStatus: true,
                    price: 300,
                    stackable: true,
                    maxStack: 99,
                },
                pp_restore: {
                    id: 'pp_restore',
                    name: '能量果',
                    type: ItemType.POTION,
                    icon: '⚡',
                    description: '恢复所有技能5点PP',
                    restorePp: 5,
                    price: 80,
                    stackable: true,
                    maxStack: 99,
                },
                revive: {
                    id: 'revive',
                    name: '复活草',
                    type: ItemType.POTION,
                    icon: '🌿',
                    description: '复活倒下的宠物并恢复一半HP',
                    revive: true,
                    price: 200,
                    stackable: true,
                    maxStack: 99,
                },
                normal_bait: {
                    id: 'normal_bait',
                    name: '普通诱饵',
                    type: ItemType.BAIT,
                    icon: '🍞',
                    description: '增加遇到普通宠物的概率',
                    encounterMod: 1.2,
                    price: 30,
                    stackable: true,
                    maxStack: 99,
                },
                rare_bait: {
                    id: 'rare_bait',
                    name: '稀有诱饵',
                    type: ItemType.BAIT,
                    icon: '🧀',
                    description: '增加遇到稀有宠物的概率',
                    rareMod: 1.5,
                    price: 100,
                    stackable: true,
                    maxStack: 99,
                },
                shiny_lure: {
                    id: 'shiny_lure',
                    name: '闪光诱饵',
                    type: ItemType.BAIT,
                    icon: '✨',
                    description: '大幅增加遇到闪光宠物的概率',
                    shinyMod: 3.0,
                    price: 500,
                    stackable: true,
                    maxStack: 30,
                },
                skill_stone: {
                    id: 'skill_stone',
                    name: '技能石',
                    type: ItemType.MATERIAL,
                    icon: '💎',
                    description: '让宠物随机学习一个新技能',
                    teachSkill: true,
                    price: 200,
                    stackable: true,
                    maxStack: 10,
                },
                mark_stone: {
                    id: 'mark_stone',
                    name: '标记石',
                    type: ItemType.MATERIAL,
                    icon: '🔖',
                    description: '在替换宠物时保留原宠物',
                    markPet: true,
                    price: 150,
                    stackable: true,
                    maxStack: 20,
                },
                exp_candy: {
                    id: 'exp_candy',
                    name: '经验糖果',
                    type: ItemType.MATERIAL,
                    icon: '🍬',
                    description: '让宠物获得100点经验值',
                    expGain: 100,
                    price: 50,
                    stackable: true,
                    maxStack: 99,
                },
                talent_reset: {
                    id: 'talent_reset',
                    name: '天赋重组胶囊',
                    type: ItemType.MATERIAL,
                    icon: '💊',
                    description: '随机重新生成宠物的所有天赋值',
                    resetTalent: true,
                    price: 500,
                    stackable: true,
                    maxStack: 10,
                },
                talent_boost: {
                    id: 'talent_boost',
                    name: '天赋精华',
                    type: ItemType.MATERIAL,
                    icon: '⭐',
                    description: '随机提升一项天赋值(最高62)',
                    boostTalent: true,
                    price: 300,
                    stackable: true,
                    maxStack: 20,
                },
            };

            // ============ 背包管理器 ============
            class BagManager {
                constructor() {
                    this.items = {};
                    this.maxSlots = 32;
                }

                addItem(itemId, count = 1) {
                    const item = ItemsDB[itemId];
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
                        const item = ItemsDB[itemId];
                        if (item && item.type === type) {
                            result.push({ item, count: this.items[itemId] });
                        }
                    }
                    return result;
                }

                getAllItems() {
                    const result = [];
                    for (const itemId in this.items) {
                        const item = ItemsDB[itemId];
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

            // ============ GameState 容器（多存档隔离核心） ============
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
                    this.petManager = new PetManager();
                    this.bagManager = new BagManager();
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
                    state.petManager = PetManager.fromJSON(data.petManager);
                    state.bagManager = BagManager.fromJSON(data.bagManager);
                    state.tutorialCompleted = data.tutorialCompleted;
                    state.currentScene = data.currentScene;
                    state.worldProgress = data.worldProgress || { unlockedRegions: [], areaStates: {} };
                    return state;
                }

                static createNew() {
                    return new GameState();
                }
            }

            let gs = null;

            // ============ GameState 安全访问封装 ============
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

            // ============ 初始化背包管理器（已移至 GameState 内部） ============

            // ============ 初始化宠物管理器（已移至 GameState 内部） ============

            // 添加测试宠物数据
            function initTestPets() {
                console.log('🎮 新手引导模式：等待玩家选择初始宠物');
            }

            // 添加测试道具数据（在新手引导完成后调用）
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

            // ============ 存档管理器 ============
            const SAVE_VERSION = 1;
            const SAVE_SLOTS = ['slot_1', 'slot_2', 'slot_3'];
            const AUTO_SAVE_SLOT = 'auto';
            const AUTO_SAVE_INTERVAL = 60; // 1分钟（秒）

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

            const saveManager = new SaveManager();

            // ============ 工具函数 ============
            function lerp(a, b, t) { return a + (b - a) * t; }

            function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

            function dist(x1, y1, x2, y2) { return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2); }

            function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

            function easeOutExpo(t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); }

            // 简单伪随机（用于粒子等）
            function seededRandom(seed) {
                let s = seed;
                return function() {
                    s = (s * 16807 + 0) % 2147483647;
                    return (s - 1) / 2147483646;
                };
            }

            // ============ 顶栏UI组件 ============
            // ============ UI 样式常量（集中管理） ============
            const UI = {
                topBar: {
                    height: 50,
                    padding: 12,
                    avatarSize: 36,
                    bgColorStart: 'rgba(25, 22, 35, 0.92)',
                    bgColorEnd: 'rgba(20, 18, 28, 0.88)',
                    lineColor: 'rgba(180, 160, 120, 0.4)',
                    avatarBgColor: '#2a2535',
                    avatarBorderColor: 'rgba(200, 180, 140, 0.7)',
                    avatarGlowColor: 'rgba(255, 200, 120, 0.15)',
                    levelBgWidth: 38,
                    levelBgHeight: 18,
                    levelBgRadius: 9,
                    levelBgColor: 'rgba(60, 50, 40, 0.8)',
                    levelTextColor: '#f0e0c0',
                    nameTextColor: '#e8d8b8',
                    currencyBoxWidth: 75,
                    currencyBoxHeight: 28,
                    currencyBoxRadius: 14,
                    currencyBgColor: 'rgba(40, 35, 30, 0.75)',
                },
                bottomBar: {
                    height: 65,
                    buttonWidth: 60,
                    centerButtonWidth: 80,
                    buttonGap: 5,
                    normalBtnHeight: 50,
                    centerBtnHeight: 58,
                    btnRadius: 12,
                    bgColorStart: 'rgba(20, 18, 28, 0.88)',
                    bgColorEnd: 'rgba(25, 22, 35, 0.92)',
                    activeBgColor: 'rgba(60, 50, 40, 0.9)',
                    inactiveBgColor: 'rgba(35, 30, 40, 0.85)',
                    activeBorderColor: 'rgba(200, 180, 140, 0.6)',
                    inactiveBorderColor: 'rgba(100, 90, 80, 0.4)',
                    activeTextColor: '#f0e0c0',
                    inactiveTextColor: '#c8b898',
                    glowColor: 'rgba(255, 200, 120, 0.15)',
                },
                colors: {
                    gold: '#ffd700',
                    goldDark: '#c8a030',
                    diamond: '#a0d8f0',
                    diamondDark: '#60a8c8',
                    textLight: '#f0e0c0',
                    textMedium: '#e8d8b8',
                    textNormal: '#c8b898',
                },
                fonts: {
                    small: { size: 11, family: '"STKaiti","KaiTi",sans-serif' },
                    normal: { size: 12, family: '"STKaiti","KaiTi",sans-serif' },
                    medium: { size: 13, family: '"STKaiti","KaiTi",sans-serif' },
                    large: { size: 16, family: 'serif' },
                }
            };

            class TopBar {
                constructor() {
                    this.height = UI.topBar.height;
                    this.visible = false;
                    this.alpha = 0;
                    this.targetAlpha = 0;
                    this.time = 0;
                    this.avatarPulse = 0;
                }

                show() {
                    this.visible = true;
                    this.alpha = 1;
                    this.targetAlpha = 1;
                }

                hide() {
                    this.targetAlpha = 0;
                }

                update(dt) {
                    this.time += dt;
                    this.avatarPulse = Math.sin(this.time * 2) * 0.1 + 0.9;
                    this.alpha = lerp(this.alpha, this.targetAlpha, dt * 8);
                    if (this.alpha < 0.01 && this.targetAlpha === 0) {
                        this.visible = false;
                    }
                }

                draw(ctx) {
                    if (!this.visible || this.alpha < 0.01) {
                        if (this.visible && this.alpha < 0.01) {
                            console.log('⚠️ AreaScene.draw() 跳过: visible=true, alpha=', this.alpha.toFixed(3));
                        }
                        return;
                    }

                    ctx.save();
                    ctx.globalAlpha = this.alpha;

                    const style = UI.topBar;
                    const barHeight = style.height;
                    const padding = style.padding;
                    const avatarSize = style.avatarSize;

                    // 顶栏背景渐变
                    const bgGrad = ctx.createLinearGradient(0, 0, 0, barHeight);
                    bgGrad.addColorStop(0, style.bgColorStart);
                    bgGrad.addColorStop(1, style.bgColorEnd);
                    ctx.fillStyle = bgGrad;
                    ctx.fillRect(0, 0, W, barHeight);

                    // 底部装饰线
                    const lineGrad = ctx.createLinearGradient(0, 0, W, 0);
                    lineGrad.addColorStop(0, 'rgba(180, 160, 120, 0)');
                    lineGrad.addColorStop(0.3, style.lineColor);
                    lineGrad.addColorStop(0.7, style.lineColor);
                    lineGrad.addColorStop(1, 'rgba(180, 160, 120, 0)');
                    ctx.strokeStyle = lineGrad;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(0, barHeight - 0.5);
                    ctx.lineTo(W, barHeight - 0.5);
                    ctx.stroke();

                    // 头像区域
                    const avatarX = padding + avatarSize / 2;
                    const avatarY = barHeight / 2;

                    // 头像外框光晕
                    const avatarGlow = ctx.createRadialGradient(avatarX, avatarY, avatarSize * 0.3, avatarX, avatarY, avatarSize * 0.8);
                    avatarGlow.addColorStop(0, `${style.avatarGlowColor.replace('0.15', `${0.15 * this.avatarPulse}`)}`);
                    avatarGlow.addColorStop(1, 'rgba(255, 200, 120, 0)');
                    ctx.fillStyle = avatarGlow;
                    ctx.beginPath();
                    ctx.arc(avatarX, avatarY, avatarSize * 0.8, 0, Math.PI * 2);
                    ctx.fill();

                    // 头像背景
                    ctx.fillStyle = style.avatarBgColor;
                    ctx.beginPath();
                    ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
                    ctx.fill();

                    // 头像边框
                    ctx.strokeStyle = style.avatarBorderColor;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
                    ctx.stroke();

                    // 头像内部图案（简化的猎人图标）
                    ctx.fillStyle = UI.colors.textNormal;
                    ctx.font = `${avatarSize * 0.5}px serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('🎯', avatarX, avatarY);

                    // 等级显示
                    const levelX = avatarX + avatarSize / 2 + 8;
                    const levelY = avatarY - 6;

                    // 等级背景
                    ctx.fillStyle = style.levelBgColor;
                    ctx.beginPath();
                    ctx.roundRect(levelX - 2, levelY - style.levelBgHeight / 2 - 1, style.levelBgWidth, style.levelBgHeight, style.levelBgRadius);
                    ctx.fill();

                    // 等级文字
                    ctx.fillStyle = style.levelTextColor;
                    ctx.font = `bold ${Math.min(W * 0.032, UI.fonts.medium.size)}px ${UI.fonts.medium.family}`;
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(`Lv.${gs.playerData.level}`, levelX + 2, levelY);

                    // 玩家名称
                    ctx.fillStyle = style.nameTextColor;
                    ctx.font = `${Math.min(W * 0.03, UI.fonts.normal.size)}px ${UI.fonts.normal.family}`;
                    ctx.fillText(gs.playerData.name, levelX, levelY + 14);

                    // 货币区域（右侧）
                    const rightPadding = 15;
                    const currencyGap = 12;

                    // 普通币
                    const goldX = W - rightPadding;
                    const goldY = barHeight / 2;
                    this.drawCurrency(ctx, goldX, goldY, '💰', gs.playerData.gold, UI.colors.gold, UI.colors.goldDark);

                    // 钻石
                    const diamondX = goldX - 85 - currencyGap;
                    this.drawCurrency(ctx, diamondX, goldY, '💎', gs.playerData.diamond, UI.colors.diamond, UI.colors.diamondDark);

                    ctx.restore();
                }

                drawCurrency(ctx, x, y, icon, value, colorLight, colorDark) {
                    const style = UI.topBar;
                    const boxWidth = style.currencyBoxWidth;
                    const boxHeight = style.currencyBoxHeight;

                    // 货币背景
                    ctx.fillStyle = style.currencyBgColor;
                    ctx.beginPath();
                    ctx.roundRect(x - boxWidth, y - boxHeight / 2, boxWidth, boxHeight, style.currencyBoxRadius);
                    ctx.fill();

                    // 边框
                    ctx.strokeStyle = `rgba(${parseInt(colorDark.slice(1,3),16)}, ${parseInt(colorDark.slice(3,5),16)}, ${parseInt(colorDark.slice(5,7),16)}, 0.4)`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.roundRect(x - boxWidth, y - boxHeight / 2, boxWidth, boxHeight, style.currencyBoxRadius);
                    ctx.stroke();

                    // 图标
                    ctx.font = `${Math.min(W * 0.04, UI.fonts.large.size)}px ${UI.fonts.large.family}`;
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(icon, x - boxWidth + 6, y);

                    // 数值
                    ctx.fillStyle = colorLight;
                    ctx.font = `bold ${Math.min(W * 0.032, UI.fonts.medium.size)}px ${UI.fonts.medium.family}`;
                    const displayValue = value >= 10000 ? (value / 10000).toFixed(1) + 'w' : value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value;
                    ctx.fillText(displayValue, x - boxWidth + 26, y);
                }

                getHeight() {
                    return this.height;
                }

                isPointInside(x, y) {
                    return y <= this.height;
                }
            }

            // ============ 底栏UI组件 ============
            class BottomBar {
                constructor() {
                    this.height = UI.bottomBar.height;
                    this.visible = false;
                    this.alpha = 0;
                    this.targetAlpha = 0;
                    this.time = 0;
                    this.buttons = [
                        { id: 'bag', name: '背包', icon: '🎒', x: 0 },
                        { id: 'task', name: '任务', icon: '📋', x: 0 },
                        { id: 'adventure', name: '冒险', icon: '🗺️', x: 0, isCenter: true },
                        { id: 'team', name: '队伍', icon: '👥', x: 0 },
                        { id: 'settings', name: '设置', icon: '⚙️', x: 0 },
                    ];
                    this.activeButton = null;
                    this.buttonWidth = UI.bottomBar.buttonWidth;
                    this.centerButtonWidth = UI.bottomBar.centerButtonWidth;
                    this.buttonGap = UI.bottomBar.buttonGap;
                    this.pulsePhase = 0;
                }

                show() {
                    this.visible = true;
                    this.targetAlpha = 1;
                }

                hide() {
                    this.targetAlpha = 0;
                }

                update(dt) {
                    this.time += dt;
                    this.pulsePhase = Math.sin(this.time * 3) * 0.1;
                    this.alpha = lerp(this.alpha, this.targetAlpha, dt * 8);
                    if (this.alpha < 0.01 && this.targetAlpha === 0) {
                        this.visible = false;
                    }
                    this.calculateButtonPositions();
                }

                calculateButtonPositions() {
                    // 计算总宽度（考虑中间按钮更宽）
                    let totalWidth = 0;
                    this.buttons.forEach(btn => {
                        totalWidth += btn.isCenter ? this.centerButtonWidth : this.buttonWidth;
                    });
                    totalWidth += (this.buttons.length - 1) * this.buttonGap;

                    const startX = (W - totalWidth) / 2;
                    let currentX = startX;

                    this.buttons.forEach((btn) => {
                        const btnW = btn.isCenter ? this.centerButtonWidth : this.buttonWidth;
                        btn.x = currentX + btnW / 2;
                        currentX += btnW + this.buttonGap;
                    });
                }

                draw(ctx) {
                    if (!this.visible || this.alpha < 0.01) return;

                    ctx.save();
                    ctx.globalAlpha = this.alpha;

                    const style = UI.bottomBar;
                    const barY = H - this.height;

                    const bgGrad = ctx.createLinearGradient(0, barY, 0, H);
                    bgGrad.addColorStop(0, style.bgColorStart);
                    bgGrad.addColorStop(1, style.bgColorEnd);
                    ctx.fillStyle = bgGrad;
                    ctx.fillRect(0, barY, W, this.height);

                    const lineGrad = ctx.createLinearGradient(0, 0, W, 0);
                    lineGrad.addColorStop(0, 'rgba(180, 160, 120, 0)');
                    lineGrad.addColorStop(0.3, UI.topBar.lineColor);
                    lineGrad.addColorStop(0.7, UI.topBar.lineColor);
                    lineGrad.addColorStop(1, 'rgba(180, 160, 120, 0)');
                    ctx.strokeStyle = lineGrad;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(0, barY + 0.5);
                    ctx.lineTo(W, barY + 0.5);
                    ctx.stroke();

                    for (const btn of this.buttons) {
                        this.drawButton(ctx, btn, barY);
                    }

                    ctx.restore();
                }

                drawButton(ctx, btn, barY) {
                    const style = UI.bottomBar;
                    const btnY = barY + this.height / 2;
                    const isCenterBtn = btn.isCenter;
                    const btnW = isCenterBtn ? this.centerButtonWidth : this.buttonWidth;
                    const btnH = isCenterBtn ? style.centerBtnHeight : style.normalBtnHeight;
                    const isActive = this.activeButton === btn.id;
                    const pulse = isActive ? this.pulsePhase : 0;

                    ctx.fillStyle = isActive ? style.activeBgColor : style.inactiveBgColor;
                    ctx.beginPath();
                    ctx.roundRect(btn.x - btnW / 2, btnY - btnH / 2, btnW, btnH, style.btnRadius);
                    ctx.fill();

                    if (isActive) {
                        const glowGrad = ctx.createRadialGradient(btn.x, btnY, 0, btn.x, btnY, btnW * 0.7);
                        glowGrad.addColorStop(0, `${style.glowColor.replace('0.15', `${0.15 + pulse}`)}`);
                        glowGrad.addColorStop(1, 'rgba(255, 200, 120, 0)');
                        ctx.fillStyle = glowGrad;
                        ctx.beginPath();
                        ctx.roundRect(btn.x - btnW / 2, btnY - btnH / 2, btnW, btnH, style.btnRadius);
                        ctx.fill();
                    }

                    ctx.strokeStyle = isActive ? style.activeBorderColor : style.inactiveBorderColor;
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.roundRect(btn.x - btnW / 2, btnY - btnH / 2, btnW, btnH, style.btnRadius);
                    ctx.stroke();

                    // 图标大小根据按钮类型调整
                    const iconSize = isCenterBtn ? Math.min(W * 0.065, 28) : Math.min(W * 0.055, 24);
                    ctx.font = `${iconSize}px serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(btn.icon, btn.x, btnY - (isCenterBtn ? 10 : 8));

                    // 文字大小根据按钮类型调整
                    ctx.fillStyle = isActive ? style.activeTextColor : style.inactiveTextColor;
                    const fontSize = isCenterBtn ? Math.min(W * 0.03, UI.fonts.normal.size) : Math.min(W * 0.028, UI.fonts.small.size);
                    ctx.font = `${fontSize}px ${UI.fonts.normal.family}`;
                    ctx.fillText(btn.name, btn.x, btnY + (isCenterBtn ? 16 : 14));
                }

                handleClick(x, y) {
                    if (!this.visible || this.alpha < 0.5) return null;

                    const barY = H - this.height;
                    if (y < barY) return null;

                    const style = UI.bottomBar;
                    for (const btn of this.buttons) {
                        const isCenterBtn = btn.isCenter;
                        const btnW = isCenterBtn ? this.centerButtonWidth : this.buttonWidth;
                        const btnH = isCenterBtn ? style.centerBtnHeight : style.normalBtnHeight;
                        const btnY = barY + this.height / 2;
                        if (x >= btn.x - btnW / 2 && x <= btn.x + btnW / 2 &&
                            y >= btnY - btnH / 2 && y <= btnY + btnH / 2) {
                            this.activeButton = btn.id;
                            return btn.id;
                        }
                    }
                    return null;
                }

                getHeight() {
                    return this.height;
                }

                isPointInside(x, y) {
                    return y >= H - this.height;
                }
            }

            // ============ 仓库界面 ============
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
                    this.alpha = lerp(this.alpha, this.targetAlpha, dt * 10);
                    if (this.alpha < 0.01 && this.targetAlpha === 0) {
                        this.visible = false;
                    }
                    this.scrollY = lerp(this.scrollY, this.targetScrollY, dt * 15);
                    this.scrollY = clamp(this.scrollY, 0, this.maxScrollY);
                    if (this.showDetail) {
                        this.detailAlpha = lerp(this.detailAlpha, 1, dt * 8);
                    } else {
                        this.detailAlpha = lerp(this.detailAlpha, 0, dt * 10);
                    }
                }

                getFilteredPets() {
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
                    const panelW = W;
                    const panelH = H;

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
                    ctx.font = `bold ${Math.min(W * 0.03, 14)}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText('×', closeBtnX, closeBtnY + 1);

                    ctx.fillStyle = '#f0e0c0';
                    ctx.font = `bold ${Math.min(W * 0.04, 16)}px "STKaiti","KaiTi",sans-serif`;
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('📦 仓库', x + 55, y + this.headerHeight / 2);

                    const sortBtns = [
                        { id: 'time', label: '时间' },
                        { id: 'level', label: '等级' },
                        { id: 'name', label: '名称' },
                    ];
                    let btnX = x + w - 20;
                    ctx.font = `${Math.min(W * 0.025, 10)}px "STKaiti","KaiTi",sans-serif`;
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
                        ctx.font = `${Math.min(W * 0.035, 14)}px "STKaiti","KaiTi",sans-serif`;
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

                    ctx.font = `${Math.min(W * 0.08, 32)}px serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    
                    const iconSize = Math.min(W * 0.08, 32) * 1.8;
                    const iconX = x + w / 2;
                    const iconY = y + h * 0.35;
                    
                    if (!drawCustomPetIcon(ctx, pet.speciesId, iconX, iconY, iconSize)) {
                        const petIcon = this.getPetIcon(pet.speciesId);
                        ctx.fillText(petIcon, iconX, iconY);
                    }

                    ctx.fillStyle = '#f0e0c0';
                    ctx.font = `bold ${Math.min(W * 0.025, 10)}px "STKaiti","KaiTi",sans-serif`;
                    ctx.fillText(pet.name, x + w / 2, y + h * 0.62);

                    ctx.fillStyle = '#a0a0a0';
                    ctx.font = `${Math.min(W * 0.022, 9)}px "STKaiti","KaiTi",sans-serif`;
                    ctx.fillText(`Lv.${pet.level}`, x + w / 2, y + h * 0.78);

                    ctx.fillStyle = element.color;
                    ctx.beginPath();
                    ctx.arc(x + w - 10, y + 10, 6, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#fff';
                    ctx.font = `${Math.min(W * 0.018, 7)}px sans-serif`;
                    ctx.fillText(element.name[0], x + w - 10, y + 11);

                    if (pet.isNew) {
                        ctx.fillStyle = '#ff6b6b';
                        ctx.font = `bold ${Math.min(W * 0.02, 8)}px sans-serif`;
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
                    ctx.fillStyle = 'rgba(40, 38, 50, 0.8)';
                    ctx.beginPath();
                    ctx.roundRect(x + 5, y + 5, w - 10, this.footerHeight - 5, 10);
                    ctx.fill();

                    const count = gs.petManager.warehouse.length;
                    const max = gs.petManager.maxWarehouseSize;
                    ctx.fillStyle = count >= max ? '#ff6b6b' : '#c8b898';
                    ctx.font = `${Math.min(W * 0.028, 11)}px "STKaiti","KaiTi",sans-serif`;
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
                    const detailH = 360;
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

                    // ========== 头部区域 ==========
                    const headerH = 100;
                    const element = pet.species.element;
                    
                    // 宠物图标
                    ctx.font = `${Math.min(W * 0.12, 48)}px serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    
                    const detailIconSize = Math.min(W * 0.12, 48) * 1.8;
                    const detailIconX = detailX + detailW / 2;
                    const detailIconY = detailY + 50;
                    
                    if (!drawCustomPetIcon(ctx, pet.speciesId, detailIconX, detailIconY, detailIconSize)) {
                        ctx.fillText(this.getPetIcon(pet.speciesId), detailIconX, detailIconY);
                    }
                    
                    // 宠物名字
                    ctx.fillStyle = '#f0e0c0';
                    ctx.font = `bold ${Math.min(W * 0.04, 16)}px "STKaiti","KaiTi",sans-serif`;
                    ctx.fillText(pet.name, detailX + detailW / 2, detailY + 85);
                    
                    // 天赋信息（供星星上方标签使用）
                    const talentInfo = pet.getTalentRating();

                    // ========== 性格区域 ==========
                    const natureY = detailY + headerH + 8;
                    
                    // 构建性格修正文字
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
                    ctx.font = `bold ${Math.min(W * 0.028, 11)}px "STKaiti","KaiTi",sans-serif`;
                    ctx.textAlign = 'left';
                    ctx.fillText(natureDesc, detailX + 15, natureY);
                    
                    // 等级
                    ctx.fillStyle = '#ffd700';
                    ctx.textAlign = 'right';
                    ctx.fillText(`Lv.${pet.level}`, detailX + detailW - 15, natureY);

                    // ========== 属性区域（左右分栏） ==========
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
                    
                    // ========== 蓝色标签（移到星星上方，居中对齐） ==========
                    const labelW = 70;
                    const labelH = 24;
                    const detailStarOffset = 20; // 整体右移偏移量
                    const detailStarsCenterX = rightX + detailStarOffset + (5 * 16) / 2;
                    const detailLabelX = detailStarsCenterX - labelW / 2;
                    const detailLabelY = statsStartY - 30;
                    
                    // 绘制蓝色标签背景
                    ctx.fillStyle = 'rgba(65, 105, 225, 0.9)';
                    ctx.beginPath();
                    ctx.roundRect(detailLabelX, detailLabelY, labelW, labelH, 6);
                    ctx.fill();
                    
                    ctx.strokeStyle = 'rgba(100, 149, 237, 0.8)';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    
                    ctx.fillStyle = '#ffffff';
                    ctx.font = `bold ${Math.min(W * 0.028, 11)}px "STKaiti","KaiTi",sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText(talentInfo.rating, detailLabelX + labelW / 2, detailLabelY + labelH / 2 + 2);
                    
                    // 绘制整个星星区域的大外框（包含标签和星星）
                    const detailBoxX = rightX + detailStarOffset - 8;
                    const detailBoxY = statsStartY - 34; // 上移以包含标签
                    const detailBoxW = 5 * 16 + 16; // 5个星，每个16px + 边距
                    const detailBoxH = 5 * statGap + 52; // 底边对齐左边文字底边
                    ctx.strokeStyle = 'rgba(100, 149, 237, 0.9)';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.roundRect(detailBoxX, detailBoxY, detailBoxW, detailBoxH, 10);
                    ctx.stroke();
                    
                    stats.forEach((stat, i) => {
                        const statY = statsStartY + i * statGap;
                        
                        // ========== 左侧：属性信息 ==========
                        ctx.fillStyle = 'rgba(40, 38, 50, 0.4)';
                        ctx.beginPath();
                        ctx.roundRect(leftX, statY - 5, leftWidth, 18, 4);
                        ctx.fill();
                        
                        // 属性图标
                        ctx.font = `${Math.min(W * 0.032, 13)}px serif`;
                        ctx.textAlign = 'left';
                        ctx.fillText(stat.icon, leftX + 4, statY + 7);
                        
                        // 属性名（金色）
                        ctx.fillStyle = '#ffd700';
                        ctx.font = `${Math.min(W * 0.028, 11)}px "STKaiti","KaiTi",sans-serif`;
                        ctx.fillText(stat.label, leftX + 26, statY + 7);
                        
                        // 分隔符
                        ctx.fillStyle = '#888';
                        ctx.fillText(':', leftX + 50, statY + 7);
                        
                        // 数值（白色）
                        ctx.fillStyle = '#fff';
                        ctx.font = `bold ${Math.min(W * 0.03, 12)}px sans-serif`;
                        ctx.fillText(stat.value, leftX + 60, statY + 7);
                        
                        // 性格修正箭头
                        let arrowX = leftX + 62 + ctx.measureText(stat.value).width;
                        if (stat.hasUp) {
                            ctx.fillStyle = '#2ecc71';
                            ctx.font = `bold ${Math.min(W * 0.035, 14)}px sans-serif`;
                            ctx.fillText('↑', arrowX, statY + 7);
                        } else if (stat.hasDown) {
                            ctx.fillStyle = '#e74c3c';
                            ctx.font = `bold ${Math.min(W * 0.035, 14)}px sans-serif`;
                            ctx.fillText('↓', arrowX, statY + 7);
                        }
                        
                        // 努力值蓝色圆形标签
                        const evIconX = leftX + leftWidth - 40;
                        ctx.fillStyle = '#3498db';
                        ctx.beginPath();
                        ctx.arc(evIconX, statY + 4, 10, 0, Math.PI * 2);
                        ctx.fill();
                        
                        ctx.fillStyle = '#fff';
                        ctx.font = `${Math.min(W * 0.02, 8)}px sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.fillText('努力', evIconX, statY + 6);
                        
                        // 努力值数值
                        ctx.fillStyle = '#fff';
                        ctx.font = `bold ${Math.min(W * 0.025, 10)}px sans-serif`;
                        ctx.textAlign = 'left';
                        ctx.fillText(pet.evs[stat.ivKey], evIconX + 14, statY + 7);
                        
                        // ========== 右侧：天赋星级 ==========
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
                            ctx.font = `${Math.min(W * 0.035, 14)}px sans-serif`;
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
                    ctx.font = `bold ${Math.min(W * 0.035, 14)}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText('×', detailX + detailW - 18, detailY + 17);
                }

                handleClick(x, y) {
                    if (!this.visible || this.alpha < 0.5) return null;

                    const panelX = 0;
                    const panelY = 0;
                    const panelW = W;
                    const panelH = H;

                    const closeBtnX = panelX + 25;
                    const closeBtnY = panelY + this.headerHeight / 2;
                    if (dist(x, y, closeBtnX, closeBtnY) < 15) {
                        this.hide();
                        return 'close';
                    }

                    if (this.showDetail && this.detailAlpha > 0.5) {
                        const detailCloseX = panelX + (panelW - Math.min(320, panelW * 0.9)) / 2 + Math.min(320, panelW * 0.9) - 18;
                        const detailCloseY = panelY + (panelH - 360) / 2 + 18;
                        if (dist(x, y, detailCloseX, detailCloseY) < 15) {
                            this.showDetail = false;
                            return 'close_detail';
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
                    const panelW = W;
                    const panelH = H;
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
                        this.targetScrollY = clamp(this.targetScrollY, 0, this.maxScrollY);
                    }

                    const panelX = 0;
                    const panelY = 0;
                    const panelW = W;
                    const panelH = H;
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
                    // 全屏面板，任何位置都在内部
                    return true;
                }
            }

            // ============ 队伍界面 ============
            class TeamPanel {
                constructor() {
                    this.visible = false;
                    this.alpha = 0;
                    this.targetAlpha = 0;
                    this.selectedIndex = 0; // 默认选中第一个
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
                    this.currentTab = 0; // 0:技能 1:属性 2:详情
                    this.tabs = ['技能', '属性', '详情'];
                    this.tabAnimProgress = 0;
                    this.hoveredAllocBtn = null; // 修行点分配按钮悬停
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
                    this.alpha = lerp(this.alpha, this.targetAlpha, dt * 10);
                    if (this.alpha < 0.01 && this.targetAlpha === 0) {
                        this.visible = false;
                    }
                    if (this.showReplace) {
                        this.replaceAlpha = lerp(this.replaceAlpha, 1, dt * 8);
                    } else {
                        this.replaceAlpha = lerp(this.replaceAlpha, 0, dt * 10);
                    }
                    this.replaceScrollY = lerp(this.replaceScrollY, this.targetReplaceScrollY, dt * 15);
                    this.replaceScrollY = clamp(this.replaceScrollY, 0, this.maxReplaceScrollY);
                    this.tabAnimProgress = lerp(this.tabAnimProgress, this.currentTab, dt * 12);
                }

                draw(ctx) {
                    if (!this.visible || this.alpha < 0.01) return;

                    ctx.save();
                    ctx.globalAlpha = this.alpha;

                    // 全屏面板
                    const panelX = 0;
                    const panelY = 0;
                    const panelW = W;
                    const panelH = H;

                    // 全屏背景
                    const bgGrad = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
                    bgGrad.addColorStop(0, 'rgba(25, 23, 35, 0.98)');
                    bgGrad.addColorStop(1, 'rgba(20, 18, 28, 0.98)');
                    ctx.fillStyle = bgGrad;
                    ctx.fillRect(panelX, panelY, panelW, panelH);

                    this.drawHeader(ctx, panelX, panelY, panelW);

                    // 上下布局适配手机（移除了底部按钮栏）
                    const headerH = 75;
                    const contentY = headerH;
                    const contentH = panelH - headerH;

                    // 上部：详情区域（占60%高度）
                    const detailH = contentH * 0.60;
                    this.drawDetailArea(ctx, panelX + 10, contentY, panelW - 20, detailH);

                    // 下部：队伍列表（占40%高度）
                    const listY = contentY + detailH + 10;
                    const listH = contentH * 0.40 - 10;
                    this.drawTeamList(ctx, panelX + 10, listY, panelW - 20, listH);

                    if (this.replaceAlpha > 0.01) {
                        this.drawReplacePanel(ctx, panelX, panelY, panelW, panelH);
                    }

                    ctx.restore();
                }

                drawHeader(ctx, x, y, w) {
                    // 全屏头部背景
                    const headerGrad = ctx.createLinearGradient(x, y, x, y + 75);
                    headerGrad.addColorStop(0, 'rgba(35, 33, 48, 0.95)');
                    headerGrad.addColorStop(1, 'rgba(30, 28, 40, 0.95)');
                    ctx.fillStyle = headerGrad;
                    ctx.fillRect(x, y, w, 75);

                    // 底部装饰线
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

                    // 关闭按钮（左上角）
                    const closeBtnX = x + 25;
                    const closeBtnY = y + 37;
                    ctx.fillStyle = 'rgba(255, 100, 100, 0.7)';
                    ctx.beginPath();
                    ctx.arc(closeBtnX, closeBtnY, 16, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#fff';
                    ctx.font = `bold ${Math.min(W * 0.04, 18)}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText('×', closeBtnX, closeBtnY + 1);

                    ctx.fillStyle = '#f0e0c0';
                    ctx.font = `bold ${Math.min(W * 0.05, 20)}px "STKaiti","KaiTi",sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('👥 队伍管理', x + w / 2, y + 37);

                    const teamCount = gs.petManager.team.length;
                    const maxTeam = gs.petManager.maxTeamSize;
                    ctx.fillStyle = '#a0a0a0';
                    ctx.font = `${Math.min(W * 0.032, 13)}px "STKaiti","KaiTi",sans-serif`;
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

                    const pet = gs.petManager.team[this.selectedIndex];
                    if (!pet) {
                        ctx.fillStyle = '#606060';
                        ctx.font = `${Math.min(W * 0.045, 18)}px "STKaiti","KaiTi",sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('选择一只宠物查看详情', x + w / 2, y + h / 2);
                        return;
                    }

                    // 判断是否是技能tab（index 0），只有技能tab显示头像
                    const isSkillTab = this.currentTab === 0;
                    let leftWidth, rightWidth, leftX, rightX;
                    
                    if (isSkillTab) {
                        // 技能tab：左右布局，左侧显示头像
                        leftWidth = w * 0.35;
                        rightWidth = w - leftWidth - 15;
                        leftX = x + 10;
                        rightX = x + leftWidth + 15;

                        // ========== 左侧：头像区域 ==========
                        this.drawPetAvatar(ctx, leftX, y, leftWidth, h, pet);
                    } else {
                        // 属性和详情tab：不显示头像，给右侧全宽
                        leftWidth = 0;
                        rightWidth = w - 20;
                        leftX = x;
                        rightX = x + 10;
                    }

                    // ========== 右侧：内容区域 ==========
                    // Tab按钮
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
                        ctx.font = `bold ${Math.min(W * 0.032, 13)}px "STKaiti","KaiTi",sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(tabName, tX + tabWidth / 2, tabY + tabH / 2);
                    });

                    // Tab内容区域
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
                    
                    // 上半部分：头像区域
                    const avatarHeight = h * 0.55;
                    const centerY = y + avatarHeight / 2;

                    // 属性光晕
                    ctx.fillStyle = element.color;
                    ctx.globalAlpha = 0.2;
                    const glowRadius = Math.min(w * 0.35, avatarHeight * 0.3);
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.globalAlpha = 1;

                    // 头像
                    ctx.font = `${Math.min(W * 0.12, 48)}px serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    
                    const teamIconSize = Math.min(W * 0.12, 48) * 1.8;
                    
                    if (!drawCustomPetIcon(ctx, pet.speciesId, centerX, centerY, teamIconSize)) {
                        ctx.fillText(this.getPetIcon(pet.speciesId), centerX, centerY);
                    }

                    // 队长标识
                    if (this.selectedIndex === 0) {
                        ctx.font = `${Math.min(W * 0.045, 18)}px serif`;
                        ctx.fillText('👑', centerX - w * 0.28, centerY - avatarHeight * 0.18);
                    }

                    // 下半部分：按钮区域（2行2列布局）
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

                    const isCaptain = this.selectedIndex === 0;

                    // 第一行第1列：设为队长按钮
                    ctx.fillStyle = isCaptain ? 'rgba(255, 200, 100, 0.8)' : 'rgba(100, 150, 200, 0.8)';
                    ctx.beginPath();
                    ctx.roundRect(x + btnGap, btnStartY, btnW, btnH, 6);
                    ctx.fill();
                    ctx.fillStyle = '#f0e0c0';
                    ctx.font = `${Math.min(W * 0.026, 10)}px "STKaiti","KaiTi",sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(isCaptain ? '👑 队长' : '设为队长', x + btnGap + btnW / 2, btnStartY + btnH / 2);

                    // 第一行第2列：存入仓库按钮
                    ctx.fillStyle = 'rgba(100, 80, 60, 0.8)';
                    ctx.beginPath();
                    ctx.roundRect(x + btnGap * 2 + btnW, btnStartY, btnW, btnH, 6);
                    ctx.fill();
                    ctx.fillStyle = '#f0e0c0';
                    ctx.fillText('📦 存仓', x + btnGap * 2 + btnW + btnW / 2, btnStartY + btnH / 2);

                    // 第二行第1列：回血按钮
                    const hpPotionCount = gs.bagManager.getItemCount('hp_potion');
                    const canHeal = hpPotionCount > 0 && pet.currentHp < pet.getMaxHp();
                    ctx.fillStyle = canHeal ? 'rgba(100, 180, 100, 0.8)' : 'rgba(80, 80, 80, 0.6)';
                    ctx.beginPath();
                    ctx.roundRect(x + btnGap, btnStartY + btnH + btnGap, btnW, btnH, 6);
                    ctx.fill();
                    ctx.fillStyle = canHeal ? '#a0f0a0' : '#888';
                    ctx.fillText(`❤️ 回血${hpPotionCount > 0 ? '(' + hpPotionCount + ')' : ''}`, x + btnGap + btnW / 2, btnStartY + btnH + btnGap + btnH / 2);

                    // 第二行第2列：替换按钮
                    ctx.fillStyle = 'rgba(80, 100, 80, 0.8)';
                    ctx.beginPath();
                    ctx.roundRect(x + btnGap * 2 + btnW, btnStartY + btnH + btnGap, btnW, btnH, 6);
                    ctx.fill();
                    ctx.fillStyle = '#f0e0c0';
                    ctx.fillText('🔄 换', x + btnGap * 2 + btnW + btnW / 2, btnStartY + btnH + btnGap + btnH / 2);
                }

                drawStatsTab(ctx, x, y, w, h, pet) {
                    const element = pet.species.element;
                    
                    // 布局：左右分栏
                    const leftWidth = w * 0.48;
                    const rightWidth = w - leftWidth - 10;
                    const leftX = x;
                    const rightX = x + leftWidth + 10;

                    // ============== 顶部标题区域 ==============
                    // 性格标题（左侧）
                    ctx.fillStyle = '#ffd700';
                    ctx.font = `bold ${Math.min(W * 0.035, 14)}px "STKaiti","KaiTi",sans-serif`;
                    ctx.textAlign = 'left';
                    
                    // 构建性格修正描述
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

                    // 获取天赋信息
                    const talentInfo = pet.getTalentRating();

                    // ============== 属性列表区域（左侧） ==============
                    const stats = [
                        { 
                            label: '体力', 
                            value: pet.getMaxHp(), 
                            ivKey: 'hp', 
                            icon: '❤️',
                            natureMod: 1,
                            hasUp: false,
                            hasDown: false
                        },
                        { 
                            label: '攻击', 
                            value: pet.getAtk(), 
                            ivKey: 'atk', 
                            icon: '⚔️',
                            natureMod: pet.nature.atkMod,
                            hasUp: pet.nature.atkMod > 1,
                            hasDown: pet.nature.atkMod < 1
                        },
                        { 
                            label: '防御', 
                            value: pet.getDef(), 
                            ivKey: 'def', 
                            icon: '🛡️',
                            natureMod: pet.nature.defMod,
                            hasUp: pet.nature.defMod > 1,
                            hasDown: pet.nature.defMod < 1
                        },
                        { 
                            label: '特攻', 
                            value: pet.getSpa(), 
                            ivKey: 'spa', 
                            icon: '✨',
                            natureMod: pet.nature.spaMod || 1,
                            hasUp: (pet.nature.spaMod || 1) > 1,
                            hasDown: (pet.nature.spaMod || 1) < 1
                        },
                        { 
                            label: '特防', 
                            value: pet.getRes(), 
                            ivKey: 'res', 
                            icon: '🌀',
                            natureMod: 1,
                            hasUp: false,
                            hasDown: false
                        },
                        { 
                            label: '速度', 
                            value: pet.getSpd(), 
                            ivKey: 'spd', 
                            icon: '💨',
                            natureMod: pet.nature.spdMod,
                            hasUp: pet.nature.spdMod > 1,
                            hasDown: pet.nature.spdMod < 1
                        }
                    ];

                    this._lastStats = stats;

                    // 顶部显示修行点 - 调整到性格描述下方
                    const trainingY = y + 38;
                    ctx.fillStyle = '#c8b898';
                    ctx.font = `bold ${Math.min(W * 0.03, 12)}px "STKaiti","KaiTi",sans-serif`;
                    ctx.textAlign = 'left';
                    ctx.fillText(`📊 修行点: ${pet.trainingPoints}`, leftX, trainingY);
                    
                    const evTotal = pet.getTotalEVs();
                    ctx.textAlign = 'right';
                    ctx.fillText(`努力值: ${evTotal}/510`, leftX + leftWidth, trainingY);
                    
                    const statStartY = y + 58;
                    const statGap = Math.min(22, (h - 78) / 7);

                    // 努力值图标的半径和按钮尺寸（参考WarehousePanel的简单布局方式）
                    const evRadius = 10;
                    const btnW = 28;
                    const btnH = 20;

                    stats.forEach((stat, i) => {
                        const statY = statStartY + i * statGap;

                        // 绘制行背景（覆盖整行）
                        ctx.fillStyle = 'rgba(40, 38, 50, 0.4)';
                        ctx.beginPath();
                        ctx.roundRect(leftX, statY - 4, leftWidth, 18, 4);
                        ctx.fill();

                        // ========== 左侧属性信息（使用固定偏移，与WarehousePanel一致）==========
                        // 属性图标
                        ctx.font = `${Math.min(W * 0.032, 13)}px serif`;
                        ctx.textAlign = 'left';
                        ctx.fillText(stat.icon, leftX + 4, statY + 10);

                        // 属性名（金色）
                        ctx.fillStyle = '#ffd700';
                        ctx.font = `${Math.min(W * 0.03, 12)}px "STKaiti","KaiTi",sans-serif`;
                        ctx.fillText(stat.label, leftX + 26, statY + 10);

                        // 分隔符
                        ctx.fillStyle = '#888888';
                        ctx.fillText(':', leftX + 50, statY + 10);

                        // 数值（白色）
                        ctx.fillStyle = '#ffffff';
                        ctx.font = `bold ${Math.min(W * 0.035, 14)}px sans-serif`;
                        ctx.fillText(stat.value, leftX + 60, statY + 10);

                        // ========== 努力值蓝色圆形标签（从右侧固定偏移，与WarehousePanel一致）==========
                        // 布局：努力圆圈 + 数值 + 按钮，整体靠右对齐
                        const evValueStr = String(pet.evs[stat.ivKey]);
                        ctx.font = `bold ${Math.min(W * 0.025, 10)}px sans-serif`;
                        const evValueW = ctx.measureText(evValueStr).width;
                        // 从右往左算：右边距(0) + 按钮宽(28) + 间距(4) + 数值宽 + 圆形直径(20)
                        const totalEvBlockW = btnW + 4 + evValueW + 20;
                        const evStartX = leftX + leftWidth - totalEvBlockW;

                        const evIconX = evStartX;
                        ctx.fillStyle = '#3498db';
                        ctx.beginPath();
                        ctx.arc(evIconX, statY + 6, evRadius, 0, Math.PI * 2);
                        ctx.fill();

                        ctx.fillStyle = '#ffffff';
                        ctx.font = `${Math.min(W * 0.02, 8)}px sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.fillText('努力', evIconX, statY + 9);

                        // 努力值数值
                        ctx.fillStyle = '#ffffff';
                        ctx.font = `bold ${Math.min(W * 0.025, 10)}px sans-serif`;
                        ctx.textAlign = 'left';
                        ctx.fillText(pet.evs[stat.ivKey], evIconX + 14, statY + 10);

                        // ========== 分配按钮（紧跟在努力值数值后面）==========
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
                        ctx.font = `bold ${Math.min(W * 0.03, 12)}px sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('+', btnX + btnW / 2, (statY - 5) + btnH / 2);

                        // 保存按钮位置供点击检测使用（存储到 stat 对象上）
                        stat._btnX = btnX;
                        stat._btnY = statY - 5;
                        stat._btnW = btnW;
                        stat._btnH = btnH;
                    });

                    // ============== 天赋标签（蓝色标签，放在星星区域上方，居中对齐） ==============
                    const starOffset = 20; // 整体右移偏移量
                    const trainingStarsCenterX = rightX + starOffset + (5 * 16) / 2;
                    const trainingTalentSum = pet.getTalentSum();
                    const labelW = 70;
                    const labelH = 24;
                    const labelX = trainingStarsCenterX - labelW / 2;
                    const labelY = statStartY - 30;
                    
                    // 绘制蓝色标签背景
                    ctx.fillStyle = 'rgba(65, 105, 225, 0.9)';
                    ctx.beginPath();
                    ctx.roundRect(labelX, labelY, labelW, labelH, 6);
                    ctx.fill();
                    
                    ctx.strokeStyle = 'rgba(100, 149, 237, 0.8)';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    
                    ctx.fillStyle = '#ffffff';
                    ctx.font = `bold ${Math.min(W * 0.028, 11)}px "STKaiti","KaiTi",sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText(talentInfo.rating, labelX + labelW / 2, labelY + labelH / 2 + 2);
                    
                    // ============== 天赋星级区域（右侧） ==============
                    // 绘制整个星星区域的大外框（包含标签和星星）
                    const boxX = rightX + starOffset - 8;
                    const boxY = statStartY - 34; // 上移以包含标签
                    const boxW = 5 * 16 + 16; // 5个星，每个16px + 边距
                    const boxH = 5 * statGap + 52; // 底边对齐左边文字底边
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
                                if (ivValue >= 50) starColor = '#8b4513'; // 棕色（满星）
                                else if (ivValue >= 38) starColor = '#ff8c00'; // 橙色
                                else starColor = '#ffd700'; // 金色（普通）
                            } else {
                                starColor = '#4a4a4a'; // 灰色空星
                            }
                            
                            ctx.fillStyle = starColor;
                            ctx.font = `${Math.min(W * 0.035, 14)}px sans-serif`;
                            ctx.textAlign = 'left';
                            ctx.fillText('★', starX, statY + 10);
                        }
                    });
                }

                drawSkillsTab(ctx, x, y, w, h, pet) {
                    const skills = pet.getAllSkills();
                    const getElementByKey = (key) => {
                        for (const k in Element) {
                            if (Element[k].id === key) return Element[k];
                        }
                        return Element.NEUTRAL;
                    };

                    ctx.fillStyle = '#c8b898';
                    ctx.font = `bold ${Math.min(W * 0.035, 14)}px "STKaiti","KaiTi",sans-serif`;
                    ctx.textAlign = 'left';
                    ctx.fillText('已学会的技能', x, y + 18);

                    // 技能列表高度（留出底部经验条空间）
                    const skillListY = y + 30;
                    const skillListH = h - 50;
                    const skillItemH = Math.min(65, (skillListH - 10) / Math.max(skills.length, 1));

                    skills.forEach((skill, i) => {
                        const sY = skillListY + i * skillItemH;
                        if (sY + skillItemH > y + skillListH) return; // 超出范围不显示

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
                        ctx.font = `bold ${Math.min(W * 0.035, 14)}px "STKaiti","KaiTi",sans-serif`;
                        ctx.textAlign = 'left';
                        ctx.fillText(skill.name, x + 12, sY + 20);

                        if (skill.element) {
                            const skillElement = getElementByKey(skill.element);
                            ctx.fillStyle = skillElement.color;
                            ctx.beginPath();
                            ctx.arc(x + w - 30, sY + 15, 10, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.fillStyle = '#fff';
                            ctx.font = `${Math.min(W * 0.018, 7)}px sans-serif`;
                            ctx.textAlign = 'center';
                            ctx.fillText(skillElement.name, x + w - 30, sY + 16);
                        }

                        ctx.fillStyle = '#a0a0a0';
                        ctx.font = `${Math.min(W * 0.025, 10)}px "STKaiti","KaiTi",sans-serif`;
                        ctx.textAlign = 'left';
                        const desc = skill.description || '无描述';
                        ctx.fillText(desc.length > 28 ? desc.substring(0, 28) + '...' : desc, x + 12, sY + 38);

                        ctx.fillStyle = '#808080';
                        ctx.font = `${Math.min(W * 0.022, 9)}px sans-serif`;
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
                        ctx.font = `${Math.min(W * 0.032, 13)}px "STKaiti","KaiTi",sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.fillText('暂无技能', x + w / 2, y + skillListH / 2);
                    }

                    // 底部显示经验条
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
                    ctx.font = `${Math.min(W * 0.02, 8)}px sans-serif`;
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

                        ctx.font = `${Math.min(W * 0.03, 12)}px serif`;
                        ctx.textAlign = 'left';
                        ctx.fillText(item.icon, x + 8, iY + itemH / 2 - 1);

                        ctx.fillStyle = '#a0a0a0';
                        ctx.font = `${Math.min(W * 0.025, 10)}px "STKaiti","KaiTi",sans-serif`;
                        ctx.fillText(item.label, x + 28, iY + itemH / 2 - 1);

                        ctx.fillStyle = item.color || '#f0e0c0';
                        ctx.font = `bold ${Math.min(W * 0.028, 11)}px "STKaiti","KaiTi",sans-serif`;
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
                    ctx.font = `bold ${Math.min(W * 0.032, 13)}px "STKaiti","KaiTi",sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText(`✨ 天赋评级: ${talentInfo.rating}`, x + w / 2, talentY + 16);

                    ctx.fillStyle = '#a0a0a0';
                    ctx.font = `${Math.min(W * 0.025, 10)}px sans-serif`;
                    ctx.fillText(`总天赋值: ${talentSum} / 248`, x + w / 2, talentY + 32);
                }

                drawTeamList(ctx, x, y, w, h) {
                    // 队伍列表背景
                    ctx.fillStyle = 'rgba(35, 33, 48, 0.4)';
                    ctx.beginPath();
                    ctx.roundRect(x, y, w, h, 12);
                    ctx.fill();

                    ctx.strokeStyle = 'rgba(100, 90, 80, 0.3)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.roundRect(x, y, w, h, 12);
                    ctx.stroke();

                    // 标题
                    ctx.fillStyle = '#a0a0a0';
                    ctx.font = `${Math.min(W * 0.03, 12)}px "STKaiti","KaiTi",sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText('队伍成员', x + w / 2, y + 18);

                    // 水平排列的队伍槽位
                    const slotCount = gs.petManager.maxTeamSize;
                    const padding = 10;
                    const slotGap = 8;
                    const slotWidth = (w - padding * 2 - slotGap * (slotCount - 1)) / slotCount;
                    const slotHeight = Math.min(h - 40, 130);
                    const slotStartY = y + 28;

                    for (let i = 0; i < slotCount; i++) {
                        const pet = gs.petManager.team[i];
                        const slotX = x + padding + i * (slotWidth + slotGap);
                        const slotY = slotStartY;
                        const isSelected = this.selectedIndex === i;
                        const isHovered = this.hoveredSlot === i;

                        // 选中高亮
                        if (isSelected) {
                            ctx.fillStyle = 'rgba(255, 200, 100, 0.25)';
                            ctx.beginPath();
                            ctx.roundRect(slotX, slotY, slotWidth, slotHeight, 8);
                            ctx.fill();
                        }

                        // 槽位背景
                        ctx.fillStyle = isHovered ? 'rgba(80, 70, 60, 0.6)' : 
                                        pet ? 'rgba(50, 48, 60, 0.7)' : 'rgba(30, 28, 40, 0.5)';
                        ctx.beginPath();
                        ctx.roundRect(slotX, slotY, slotWidth, slotHeight, 8);
                        ctx.fill();

                        // 槽位边框
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

                            // 属性光晕（限制在槽位内）
                            ctx.fillStyle = element.color;
                            ctx.globalAlpha = 0.2;
                            const glowRadius = Math.min(slotWidth * 0.3, slotHeight * 0.25);
                            ctx.beginPath();
                            ctx.arc(centerX, slotY + slotHeight * 0.35, glowRadius, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.globalAlpha = 1;

                            // 头像
                            ctx.font = `${Math.min(W * 0.08, 32)}px serif`;
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            
                            const replaceIconSize = Math.min(W * 0.08, 32) * 1.8;
                            const replaceIconX = centerX;
                            const replaceIconY = slotY + slotHeight * 0.35;
                            
                            if (!drawCustomPetIcon(ctx, pet.speciesId, replaceIconX, replaceIconY, replaceIconSize)) {
                                ctx.fillText(this.getPetIcon(pet.speciesId), replaceIconX, replaceIconY);
                            }

                            // 队长标识
                            if (i === 0) {
                                ctx.font = `${Math.min(W * 0.04, 16)}px serif`;
                                ctx.fillText('👑', slotX + 12, slotY + 12);
                            }

                            // 名称
                            ctx.fillStyle = '#f0e0c0';
                            ctx.font = `bold ${Math.min(W * 0.028, 11)}px "STKaiti","KaiTi",sans-serif`;
                            ctx.fillText(pet.name, centerX, slotY + slotHeight * 0.6);

                            // 等级
                            ctx.fillStyle = '#ffd700';
                            ctx.font = `${Math.min(W * 0.024, 10)}px "STKaiti","KaiTi",sans-serif`;
                            ctx.fillText(`Lv.${pet.level}`, centerX, slotY + slotHeight * 0.73);

                            // 属性图标
                            ctx.fillStyle = element.color;
                            ctx.beginPath();
                            ctx.arc(slotX + slotWidth - 10, slotY + 10, 7, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.fillStyle = '#fff';
                            ctx.font = `${Math.min(W * 0.018, 7)}px sans-serif`;
                            ctx.fillText(element.name[0], slotX + slotWidth - 10, slotY + 11);

                            // HP条
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
                            // 空位
                            ctx.fillStyle = '#505050';
                            ctx.font = `${Math.min(W * 0.05, 20)}px serif`;
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillText('+', slotX + slotWidth / 2, slotY + slotHeight / 2 - 8);
                            ctx.fillStyle = '#404040';
                            ctx.font = `${Math.min(W * 0.022, 9)}px "STKaiti","KaiTi",sans-serif`;
                            ctx.fillText('空位', slotX + slotWidth / 2, slotY + slotHeight / 2 + 12);
                        }
                    }
                }

                drawBottomButtons(ctx, x, y, w) {
                    const pet = gs.petManager.team[this.selectedIndex];
                    if (!pet) return;

                    // 底部背景（加高以容纳2行按钮）
                    const bottomGrad = ctx.createLinearGradient(x, y, x, y + 100);
                    bottomGrad.addColorStop(0, 'rgba(30, 28, 40, 0.95)');
                    bottomGrad.addColorStop(1, 'rgba(25, 23, 35, 0.98)');
                    ctx.fillStyle = bottomGrad;
                    ctx.fillRect(x, y, w, 100);

                    // 顶部装饰线
                    const lineGrad = ctx.createLinearGradient(x, y + 0.5, x + w, y + 0.5);
                    lineGrad.addColorStop(0, 'rgba(180, 160, 120, 0)');
                    lineGrad.addColorStop(0.3, 'rgba(180, 160, 120, 0.5)');
                    lineGrad.addColorStop(0.7, 'rgba(180, 160, 120, 0.5)');
                    lineGrad.addColorStop(1, 'rgba(180, 160, 120, 0)');
                    ctx.strokeStyle = lineGrad;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(x, y + 0.5);
                    ctx.lineTo(x + w, y + 0.5);
                    ctx.stroke();

                    const btnCols = 2;
                    const btnRows = 2;
                    const btnGap = 12;
                    const btnWMax = (w - 40 - (btnCols - 1) * btnGap) / btnCols;
                    const btnHMax = 38;
                    const btnSize = Math.min(btnWMax, btnHMax);
                    const btnW = btnSize;
                    const btnH = btnSize;
                    const btnStartY = y + 12 + (80 - (btnH * btnRows + btnGap * (btnRows - 1))) / 2;
                    const startX = x + 20;

                    const isCaptain = this.selectedIndex === 0;

                    // 第一行第1列：设为队长按钮
                    ctx.fillStyle = isCaptain ? 'rgba(255, 200, 100, 0.8)' : 'rgba(100, 150, 200, 0.8)';
                    ctx.beginPath();
                    ctx.roundRect(startX, btnStartY, btnW, btnH, 10);
                    ctx.fill();
                    ctx.fillStyle = '#f0e0c0';
                    ctx.font = `${Math.min(W * 0.032, 13)}px "STKaiti","KaiTi",sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(isCaptain ? '👑 队长' : '设为队长', startX + btnW / 2, btnStartY + btnH / 2);

                    // 第一行第2列：存入仓库按钮
                    ctx.fillStyle = 'rgba(100, 80, 60, 0.8)';
                    ctx.beginPath();
                    ctx.roundRect(startX + btnW + btnGap, btnStartY, btnW, btnH, 10);
                    ctx.fill();
                    ctx.fillStyle = '#f0e0c0';
                    ctx.fillText('📦 存仓', startX + btnW + btnGap + btnW / 2, btnStartY + btnH / 2);

                    // 第二行第1列：回血按钮
                    const hpPotionCount = gs.bagManager.getItemCount('hp_potion');
                    const canHeal = hpPotionCount > 0 && pet.currentHp < pet.getMaxHp();
                    ctx.fillStyle = canHeal ? 'rgba(100, 180, 100, 0.8)' : 'rgba(80, 80, 80, 0.6)';
                    ctx.beginPath();
                    ctx.roundRect(startX, btnStartY + btnH + btnGap, btnW, btnH, 10);
                    ctx.fill();
                    ctx.fillStyle = canHeal ? '#a0f0a0' : '#888';
                    ctx.fillText(`❤️ 回血${hpPotionCount > 0 ? '(' + hpPotionCount + ')' : ''}`, startX + btnW / 2, btnStartY + btnH + btnGap + btnH / 2);

                    // 第二行第2列：替换按钮
                    ctx.fillStyle = 'rgba(80, 100, 80, 0.8)';
                    ctx.beginPath();
                    ctx.roundRect(startX + btnW + btnGap, btnStartY + btnH + btnGap, btnW, btnH, 10);
                    ctx.fill();
                    ctx.fillStyle = '#f0e0c0';
                    ctx.fillText('🔄 替换', startX + btnW + btnGap + btnW / 2, btnStartY + btnH + btnGap + btnH / 2);
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
                    ctx.font = `bold ${Math.min(W * 0.045, 18)}px "STKaiti","KaiTi",sans-serif`;
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
                    ctx.font = `bold ${Math.min(W * 0.035, 16)}px sans-serif`;
                    ctx.fillText('×', closeBtnX, closeBtnY + 1);

                    const warehouse = gs.petManager.warehouse;
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

                        ctx.font = `${Math.min(W * 0.07, 28)}px serif`;
                        ctx.textAlign = 'center';
                        
                        const bagIconSize = Math.min(W * 0.07, 28) * 1.8;
                        const bagIconX = replaceX + 55;
                        const bagIconY = itemY + itemH / 2;
                        
                        if (!drawCustomPetIcon(ctx, pet.speciesId, bagIconX, bagIconY, bagIconSize)) {
                            ctx.fillText(this.getPetIcon(pet.speciesId), bagIconX, bagIconY);
                        }

                        ctx.fillStyle = '#f0e0c0';
                        ctx.font = `bold ${Math.min(W * 0.035, 14)}px "STKaiti","KaiTi",sans-serif`;
                        ctx.textAlign = 'left';
                        ctx.fillText(pet.name, replaceX + 90, itemY + 20);

                        ctx.fillStyle = '#a0a0a0';
                        ctx.font = `${Math.min(W * 0.028, 11)}px "STKaiti","KaiTi",sans-serif`;
                        ctx.fillText(`Lv.${pet.level} · ${element.name}属性`, replaceX + 90, itemY + 40);
                    }

                    ctx.restore();

                    if (warehouse.length === 0) {
                        ctx.fillStyle = '#606060';
                        ctx.font = `${Math.min(W * 0.035, 14)}px "STKaiti","KaiTi",sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.fillText('仓库空空如也...', replaceX + replaceW / 2, listY + listH / 2);
                    }

                    ctx.globalAlpha = this.alpha;
                }

                handleClick(x, y) {
                    if (!this.visible || this.alpha < 0.5) return null;

                    // 全屏面板
                    const panelX = 0;
                    const panelY = 0;
                    const panelW = W;
                    const panelH = H;

                    // 关闭按钮（左上角）
                    const closeBtnX = 25;
                    const closeBtnY = 37;
                    if (dist(x, y, closeBtnX, closeBtnY) < 20) {
                        this.hide();
                        return 'close';
                    }

                    // Tab切换检测
                    const headerH = 75;
                    const contentH = panelH - headerH;
                    const detailH = contentH * 0.60;
                    const detailAreaX = 10;
                    const detailAreaY = headerH;
                    const detailAreaW = panelW - 20;

                    // 与 drawDetailArea 方法保持一致的布局计算
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
                    
                    // 修行点分配按钮检测（只在属性Tab）
                    if (this.currentTab === 1) {
                        const pet = gs.petManager.team[this.selectedIndex];
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

                    // 替换面板
                    if (this.replaceAlpha > 0.5) {
                        const replaceW = Math.min(320, panelW * 0.9);
                        const replaceH = Math.min(450, panelH * 0.8);
                        const replaceX = (panelW - replaceW) / 2;
                        const replaceY = (panelH - replaceH) / 2;

                        const closeBtnX = replaceX + replaceW - 20;
                        const closeBtnY = replaceY + 20;
                        if (dist(x, y, closeBtnX, closeBtnY) < 18) {
                            this.showReplace = false;
                            return 'close_replace';
                        }

                        const warehouse = gs.petManager.warehouse;
                        const listY = replaceY + 60;
                        const itemH = 60;

                        for (let i = 0; i < warehouse.length; i++) {
                            const itemY = listY + i * itemH - this.replaceScrollY;
                            if (x >= replaceX + 20 && x <= replaceX + replaceW - 20 &&
                                y >= itemY && y <= itemY + itemH - 5) {
                                const newPet = warehouse[i];
                                const oldPet = gs.petManager.team[this.selectedIndex];
                                if (oldPet) {
                                    gs.petManager.swapTeamMember(oldPet.id, newPet);
                                }
                                this.showReplace = false;
                                return 'replaced';
                            }
                        }
                        return 'handled';
                    }

                    // 队伍列表区域（先定义位置）
                    const listY = headerH + detailH + 10;
                    const listH = contentH * 0.40 - 10;

                    // 按钮区域检测：技能tab检测左侧，其他tab检测底部
                    const pet = gs.petManager.team[this.selectedIndex];
                    if (pet) {
                        if (isSkillTab) {
                            // 技能tab：检测左侧按钮区域（2行2列布局）
                            const leftX = detailAreaX;
                            const leftWidthActual = detailAreaW * 0.35;
                            const avatarHeight = detailH * 0.55;

                            const btnAreaY = detailAreaY + avatarHeight;
                            const btnAreaHeight = detailH - avatarHeight;

                            const btnCols = 2;
                            const btnRows = 2;
                            const btnGap = 5;
                            const btnW = (leftWidthActual - btnGap * (btnCols + 1)) / btnCols;
                            const btnH = (btnAreaHeight - btnGap * (btnRows + 1)) / btnRows;
                            const btnStartY = btnAreaY + btnGap;

                            // 第一行：队长、存仓
                            if (y >= btnStartY && y <= btnStartY + btnH) {
                                // 设为队长
                                if (x >= leftX + btnGap && x <= leftX + btnGap + btnW) {
                                    if (this.selectedIndex !== 0) {
                                        gs.petManager.setCaptain(pet.id);
                                        this.selectedIndex = 0;
                                    }
                                    return 'set_captain';
                                }

                                // 存入仓库
                                if (x >= leftX + btnGap * 2 + btnW && x <= leftX + btnGap * 2 + btnW * 2) {
                                    gs.petManager.removeFromTeam(pet.id);
                                    if (gs.petManager.team.length > 0) {
                                        this.selectedIndex = Math.min(this.selectedIndex, gs.petManager.team.length - 1);
                                    } else {
                                        this.selectedIndex = 0;
                                    }
                                    return 'stored';
                                }
                            }

                            // 第二行：回血、替换
                            if (y >= btnStartY + btnH + btnGap && y <= btnStartY + btnH * 2 + btnGap) {
                                // 回血按钮
                                if (x >= leftX + btnGap && x <= leftX + btnGap + btnW) {
                                    const hpPotionCount = gs.bagManager.getItemCount('hp_potion');
                                    if (hpPotionCount > 0 && pet.currentHp < pet.getMaxHp()) {
                                        // 使用生命药剂回血（支持复活晕厥宠物）
                                        const healAmount = ItemsDB.hp_potion.healHp;
                                        pet.heal(healAmount);
                                        gs.bagManager.removeItem('hp_potion', 1);
                                        return 'healed';
                                    }
                                    return null;
                                }

                                // 替换
                                if (x >= leftX + btnGap * 2 + btnW && x <= leftX + btnGap * 2 + btnW * 2) {
                                    this.showReplace = true;
                                    this.replaceScrollY = 0;
                                    this.targetReplaceScrollY = 0;
                                    return 'show_replace';
                                }
                            }
                        } else {
                            // 属性和详情tab：检测底部按钮区域（2行2列布局）
                            const btnAreaY = listY + listH;
                            const btnAreaH = 100;

                            const btnCols = 2;
                            const btnRows = 2;
                            const btnGap = 12;
                            const btnW = (panelW - 40 - (btnCols - 1) * btnGap) / btnCols;
                            const btnH = 38;
                            const btnStartY = btnAreaY + 12;
                            const startX = 20;

                            // 第一行：队长、存仓
                            if (y >= btnStartY && y <= btnStartY + btnH) {
                                // 设为队长
                                if (x >= startX && x <= startX + btnW) {
                                    if (this.selectedIndex !== 0) {
                                        gs.petManager.setCaptain(pet.id);
                                        this.selectedIndex = 0;
                                    }
                                    return 'set_captain';
                                }

                                // 存入仓库
                                if (x >= startX + btnW + btnGap && x <= startX + btnW + btnGap + btnW) {
                                    gs.petManager.removeFromTeam(pet.id);
                                    if (gs.petManager.team.length > 0) {
                                        this.selectedIndex = Math.min(this.selectedIndex, gs.petManager.team.length - 1);
                                    } else {
                                        this.selectedIndex = 0;
                                    }
                                    return 'stored';
                                }
                            }

                            // 第二行：回血、替换
                            if (y >= btnStartY + btnH + btnGap && y <= btnStartY + btnH * 2 + btnGap) {
                                // 回血按钮
                                if (x >= startX && x <= startX + btnW) {
                                    const hpPotionCount = gs.bagManager.getItemCount('hp_potion');
                                    if (hpPotionCount > 0 && pet.currentHp < pet.getMaxHp()) {
                                        // 使用生命药剂回血（支持复活晕厥宠物）
                                        const healAmount = ItemsDB.hp_potion.healHp;
                                        pet.heal(healAmount);
                                        gs.bagManager.removeItem('hp_potion', 1);
                                        return 'healed';
                                    }
                                    return null;
                                }

                                // 替换
                                if (x >= startX + btnW + btnGap && x <= startX + btnW + btnGap + btnW) {
                                    this.showReplace = true;
                                    this.replaceScrollY = 0;
                                    this.targetReplaceScrollY = 0;
                                    return 'show_replace';
                                }
                            }
                        }
                    }

                    const slotCount = gs.petManager.maxTeamSize;
                    const padding = 10;
                    const slotGap = 8;
                    const slotWidth = (panelW - padding * 2 - slotGap * (slotCount - 1)) / slotCount;
                    const slotHeight = listH - 40;
                    const slotStartY = listY + 28;

                    for (let i = 0; i < slotCount; i++) {
                        const slotX = padding + i * (slotWidth + slotGap);
                        if (x >= slotX && x <= slotX + slotWidth &&
                            y >= slotStartY && y <= slotStartY + slotHeight) {
                            if (gs.petManager.team[i]) {
                                this.selectedIndex = i;
                                return 'select:' + gs.petManager.team[i].id;
                            }
                        }
                    }

                    return null;
                }

                handlePointerMove(x, y) {
                    // 全屏面板
                    const panelW = W;
                    const panelH = H;

                    // 替换面板
                    if (this.replaceAlpha > 0.5) {
                        const replaceW = Math.min(320, panelW * 0.9);
                        const replaceH = Math.min(450, panelH * 0.8);
                        const replaceX = (panelW - replaceW) / 2;
                        const replaceY = (panelH - replaceH) / 2;
                        const listY = replaceY + 60;
                        const itemH = 60;
                        const warehouse = gs.petManager.warehouse;

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

                    // 修行点分配按钮悬停检测（只在属性Tab）
                    this.hoveredAllocBtn = null;
                    if (this.currentTab === 1) {
                        const pet = gs.petManager.team[this.selectedIndex];
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
                    
                    // 队伍列表区域（水平排列）
                    const headerH = 75;
                    const contentH = panelH - headerH;
                    const detailH = contentH * 0.60;
                    const listY = headerH + detailH + 10;
                    const listH = contentH * 0.40 - 10;

                    const slotCount = gs.petManager.maxTeamSize;
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
                    const panelW = W;
                    const panelH = H;
                    return x >= panelX && x <= panelX + panelW && y >= panelY && y <= panelY + panelH;
                }
            }

            // ============ 设置面板 ============
            class SettingsPanel {
                constructor() {
                    this.visible = false;
                    this.alpha = 0;
                    this.targetAlpha = 0;
                    this.time = 0;
                    this.inputValue = '';
                    this.notification = null;
                    this.confirmDialog = null;
                    
                    // 音乐控制相关属性
                    this.musicControlBounds = {};
                    this.volumeSliderBounds = {};
                    this.isDraggingVolume = false;
                }

                show() {
                    this.visible = true;
                    this.targetAlpha = 1;
                    this.inputValue = gs.playerData.name || '';
                }

                hide() {
                    this.targetAlpha = 0;
                }

                update(dt) {
                    this.time += dt;
                    this.alpha = lerp(this.alpha, this.targetAlpha, dt * 8);
                    if (this.alpha < 0.01 && this.targetAlpha === 0) {
                        this.visible = false;
                    }
                    if (this.notification) {
                        this.notification.timer -= dt;
                        if (this.notification.timer <= 0) {
                            this.notification = null;
                        }
                    }
                }

                draw(ctx) {
                    if (!this.visible || this.alpha < 0.01) return;

                    ctx.save();
                    ctx.globalAlpha = this.alpha;

                    ctx.fillStyle = 'rgba(0,0,0,0.6)';
                    ctx.fillRect(0, 0, W, H);

                    const pw = Math.min(W * 0.88, 360);
                    const ph = Math.min(H * 0.75, 520);
                    const px = (W - pw) / 2;
                    const py = (H - ph) / 2;

                    const panelGrad = ctx.createLinearGradient(px, py, px, py + ph);
                    panelGrad.addColorStop(0, 'rgba(45,50,80,0.98)');
                    panelGrad.addColorStop(1, 'rgba(30,35,60,0.98)');
                    ctx.fillStyle = panelGrad;
                    ctx.beginPath();
                    ctx.roundRect(px, py, pw, ph, 18);
                    ctx.fill();

                    ctx.strokeStyle = 'rgba(160,170,200,0.5)';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();

                    ctx.fillStyle = 'rgba(232,213,176,0.95)';
                    ctx.font = `bold ${Math.min(W*0.045,20)}px "STKaiti","KaiTi",serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText('⚙️ 系统设置', px + pw / 2, py + 38);

                    ctx.fillStyle = 'rgba(180,100,100,0.7)';
                    ctx.font = `${Math.min(W*0.04,18)}px sans-serif`;
                    ctx.textAlign = 'right';
                    ctx.fillText('❌', px + pw - 15, py + 32);

                    // 保存关闭按钮边界用于点击检测（增大点击区域）
                    this.closeBtnBounds = { x: px + pw - 35, y: py + 10, w: 45, h: 45 };

                    let yOffset = py + 65;

                    ctx.fillStyle = 'rgba(150,160,185,0.85)';
                    ctx.font = `${Math.min(W*0.03,13)}px sans-serif`;
                    ctx.textAlign = 'left';
                    const slotLabel = saveManager.currentSlotId ? `当前存档：${saveManager.currentSlotId.replace('slot_', '槽位')}` : '未选择存档';
                    ctx.fillText(slotLabel, px + 25, yOffset);
                    yOffset += 35;

                    ctx.fillStyle = 'rgba(232,213,176,0.9)';
                    ctx.font = `${Math.min(W*0.032,14)}px "STKaiti","KaiTi",serif`;
                    ctx.fillText('玩家名称', px + 25, yOffset);
                    yOffset += 22;

                    const inputW = pw - 50;
                    const inputH = 38;
                    ctx.fillStyle = 'rgba(25,30,50,0.95)';
                    ctx.beginPath();
                    ctx.roundRect(px + 25, yOffset, inputW, inputH, 8);
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(120,140,180,0.6)';
                    ctx.stroke();

                    ctx.fillStyle = this.inputValue ? 'rgba(230,225,215,0.95)' : 'rgba(140,145,160,0.6)';
                    ctx.font = `${Math.min(W*0.035,15)}px sans-serif`;
                    ctx.textBaseline = 'middle';
                    ctx.fillText(this.inputValue || '点击输入名称...', px + 37, yOffset + inputH / 2);
                    ctx.textBaseline = 'top';

                    if (this.inputValue && Math.sin(this.time * 4) > 0) {
                        const textWidth = ctx.measureText(this.inputValue).width;
                        ctx.fillStyle = 'rgba(200,210,240,0.9)';
                        ctx.fillRect(px + 39 + textWidth, yOffset + 10, 2, inputH - 20);
                    }

                    yOffset += inputH + 28;

                    const btnW = Math.min(pw - 50, 260);
                    const btnH = 42;
                    const btnX = px + (pw - btnW) / 2;

                    ctx.fillStyle = 'rgba(60,110,80,0.95)';
                    ctx.beginPath();
                    ctx.roundRect(btnX, yOffset, btnW, btnH, 10);
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(100,170,130,0.6)';
                    ctx.stroke();

                    ctx.fillStyle = 'rgba(255,255,255,0.95)';
                    ctx.font = `bold ${Math.min(W*0.034,15)}px "STKaiti","KaiTi",serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('💾 保存游戏', btnX + btnW / 2, yOffset + btnH / 2);

                    this.saveButtonBounds = { x: btnX, y: yOffset, w: btnW, h: btnH };
                    yOffset += btnH + 18;

                    ctx.fillStyle = 'rgba(140,70,70,0.95)';
                    ctx.beginPath();
                    ctx.roundRect(btnX, yOffset, btnW, btnH, 10);
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(180,120,120,0.6)';
                    ctx.stroke();

                    ctx.fillStyle = 'rgba(255,255,255,0.95)';
                    ctx.fillText('🏠 返回主菜单', btnX + btnW / 2, yOffset + btnH / 2);

                    this.menuButtonBounds = { x: btnX, y: yOffset, w: btnW, h: btnH };
                    yOffset += btnH + 25;

                    // 音乐控制区域
                    this.drawMusicControl(ctx, px, pw, yOffset);
                    yOffset += 70;

                    if (this.confirmDialog) {
                        this.drawConfirmDialog(ctx, px, py, pw, ph);
                    }

                    if (this.notification) {
                        this.drawNotification(ctx);
                    }

                    ctx.restore();
                }

                drawConfirmDialog(ctx, panelX, panelY, panelW, panelH) {
                    const dialog = this.confirmDialog;
                    const dw = Math.min(panelW * 0.85, 280);
                    const dh = 130;
                    const dx = (panelX + panelW / 2) - dw / 2;
                    const dy = (panelY + panelH / 2) - dh / 2;

                    ctx.save();

                    const dlgGrad = ctx.createLinearGradient(dx, dy, dx, dy + dh);
                    dlgGrad.addColorStop(0, 'rgba(55,60,90,0.99)');
                    dlgGrad.addColorStop(1, 'rgba(40,45,70,0.99)');
                    ctx.fillStyle = dlgGrad;
                    ctx.beginPath();
                    ctx.roundRect(dx, dy, dw, dh, 12);
                    ctx.fill();

                    ctx.strokeStyle = 'rgba(170,180,210,0.6)';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();

                    ctx.fillStyle = 'rgba(232,213,176,0.95)';
                    ctx.font = `bold ${Math.min(W*0.038,17)}px "STKaiti","KaiTi",serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText(dialog.title, dx + dw / 2, dy + 32);

                    ctx.fillStyle = 'rgba(175,180,200,0.9)';
                    ctx.font = `${Math.min(W*0.03,13)}px sans-serif`;
                    ctx.fillText(dialog.message, dx + dw / 2, dy + 62);

                    const btnW = 80;
                    const btnH = 32;
                    const btnY = dy + dh - 42;
                    const cancelX = dx + dw / 2 - btnW - 12;
                    const confirmX = dx + dw / 2 + 12;

                    ctx.fillStyle = 'rgba(70,80,110,0.95)';
                    ctx.beginPath();
                    ctx.roundRect(cancelX, btnY, btnW, btnH, 8);
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(140,150,180,0.5)';
                    ctx.stroke();
                    ctx.fillStyle = 'rgba(200,200,210,0.9)';
                    ctx.font = `${Math.min(W*0.029,13)}px sans-serif`;
                    ctx.textBaseline = 'middle';
                    ctx.fillText('取消', cancelX + btnW / 2, btnY + btnH / 2);

                    ctx.fillStyle = 'rgba(150,70,70,0.95)';
                    ctx.beginPath();
                    ctx.roundRect(confirmX, btnY, btnW, btnH, 8);
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(190,130,130,0.5)';
                    ctx.stroke();
                    ctx.fillStyle = 'rgba(245,245,250,0.95)';
                    ctx.fillText('确认', confirmX + btnW / 2, btnY + btnH / 2);

                    dialog.cancelBounds = { x: cancelX, y: btnY, w: btnW, h: btnH };
                    dialog.confirmBounds = { x: confirmX, y: btnY, w: btnW, h: btnH };

                    ctx.restore();
                }

                drawMusicControl(ctx, panelX, panelW, startY) {
                    if (!homeScene) return;
                    
                    const musicState = {
                        isPlaying: homeScene.isMusicPlaying,
                        volume: homeScene.musicVolume
                    };
                    
                    ctx.save();
                    
                    // 分隔线
                    ctx.strokeStyle = 'rgba(120,130,160,0.3)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(panelX + 20, startY);
                    ctx.lineTo(panelX + panelW - 20, startY);
                    ctx.stroke();
                    
                    // 标题
                    const titleY = startY + 22;
                    ctx.fillStyle = 'rgba(232,213,176,0.9)';
                    ctx.font = `${Math.min(W*0.032,14)}px "STKaiti","KaiTi",serif`;
                    ctx.textAlign = 'left';
                    ctx.fillText('🎵 背景音乐', panelX + 25, titleY);
                    
                    // 播放/暂停按钮
                    const btnSize = 36;
                    const btnX = panelX + 25;
                    const btnY = startY + 35;
                    
                    this.musicControlBounds = { x: btnX, y: btnY, w: btnSize, h: btnSize };
                    
                    ctx.fillStyle = musicState.isPlaying ? 'rgba(60,120,180,0.9)' : 'rgba(80,85,110,0.9)';
                    ctx.beginPath();
                    ctx.roundRect(btnX, btnY, btnSize, btnSize, 8);
                    ctx.fill();
                    ctx.strokeStyle = musicState.isPlaying ? 'rgba(100,170,230,0.7)' : 'rgba(140,145,170,0.5)';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                    
                    ctx.fillStyle = 'rgba(255,255,255,0.95)';
                    ctx.font = `${btnSize * 0.55}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(musicState.isPlaying ? '⏸️' : '▶️', btnX + btnSize/2, btnY + btnSize/2);
                    
                    // 音量滑块
                    const sliderX = btnX + btnSize + 15;
                    const sliderY = btnY + btnSize/2 - 4;
                    const sliderW = panelW - 70 - btnSize;
                    const sliderH = 8;
                    
                    this.volumeSliderBounds = { x: sliderX, y: sliderY, w: sliderW, h: sliderH };
                    
                    // 滑块背景
                    ctx.fillStyle = 'rgba(40,45,65,0.95)';
                    ctx.beginPath();
                    ctx.roundRect(sliderX, sliderY, sliderW, sliderH, 4);
                    ctx.fill();
                    
                    // 已填充部分
                    const fillW = sliderW * musicState.volume;
                    if (fillW > 0) {
                        ctx.fillStyle = 'rgba(80,150,220,0.9)';
                        ctx.beginPath();
                        ctx.roundRect(sliderX, sliderY, fillW, sliderH, 4);
                        ctx.fill();
                    }
                    
                    // 滑块手柄
                    const handleX = sliderX + fillW;
                    const handleY = sliderY + sliderH/2;
                    ctx.fillStyle = 'rgba(255,255,255,0.95)';
                    ctx.beginPath();
                    ctx.arc(handleX, handleY, 7, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(100,160,220,0.8)';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    
                    // 音量百分比文字
                    ctx.fillStyle = 'rgba(180,185,200,0.8)';
                    ctx.font = `${Math.min(W*0.028,12)}px sans-serif`;
                    ctx.textAlign = 'right';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(`${Math.round(musicState.volume * 100)}%`, panelX + panelW - 25, handleY);
                    
                    ctx.restore();
                }

                drawNotification(ctx) {
                    const notif = this.notification;
                    const alpha = notif.timer > 0.5 ? 1 : notif.timer * 2;

                    ctx.save();
                    ctx.globalAlpha *= alpha;

                    const nw = Math.min(W * 0.65, 260);
                    const nh = 42;
                    const nx = (W - nw) / 2;
                    const ny = H * 0.18;

                    ctx.fillStyle = notif.isSuccess ? 'rgba(55,115,75,0.94)' : 'rgba(135,65,65,0.94)';
                    ctx.beginPath();
                    ctx.roundRect(nx, ny, nw, nh, 10);
                    ctx.fill();

                    ctx.fillStyle = 'rgba(255,255,255,0.96)';
                    ctx.font = `${Math.min(W*0.034,14)}px "STKaiti","KaiTi",serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(notif.message, nx + nw / 2, ny + nh / 2);

                    ctx.restore();
                }

                handleClick(x, y) {
                    if (!this.visible || this.alpha < 0.5) return false;

                    if (this.confirmDialog) {
                        if (x >= this.confirmDialog.cancelBounds.x && x <= this.confirmDialog.cancelBounds.x + this.confirmDialog.cancelBounds.w &&
                            y >= this.confirmDialog.cancelBounds.y && y <= this.confirmDialog.cancelBounds.y + this.confirmDialog.cancelBounds.h) {
                            this.confirmDialog = null;
                            return true;
                        }
                        if (x >= this.confirmDialog.confirmBounds.x && x <= this.confirmDialog.confirmBounds.x + this.confirmDialog.confirmBounds.w &&
                            y >= this.confirmDialog.confirmBounds.y && y <= this.confirmDialog.confirmBounds.y + this.confirmDialog.confirmBounds.h) {
                            switchScene('start');
                            this.confirmDialog = null;
                            this.hide();
                            return true;
                        }
                        return true;
                    }

                    const closeBtn = this.closeBtnBounds || { x: 0, y: 0, w: 0, h: 0 };
                    if (x >= closeBtn.x && x <= closeBtn.x + closeBtn.w &&
                        y >= closeBtn.y && y <= closeBtn.y + closeBtn.h) {
                        this.hide();
                        return true;
                    }

                    if (this.saveButtonBounds &&
                        x >= this.saveButtonBounds.x && x <= this.saveButtonBounds.x + this.saveButtonBounds.w &&
                        y >= this.saveButtonBounds.y && y <= this.saveButtonBounds.y + this.saveButtonBounds.h) {

                        if (this.inputValue.trim()) {
                            gs.playerData.name = this.inputValue.trim();
                        }

                        if (saveManager.currentSlotId) {
                            const result = saveManager.saveToSlot(saveManager.currentSlotId, null, gs);
                            if (result.success) {
                                saveManager.autoSave(gs);
                                saveManager.resetAutoSaveTimer();
                                this.showNotification('保存成功！', true);
                            } else {
                                this.showNotification('保存失败，存储空间不足', false);
                            }
                        } else {
                            this.showNotification('请先在存档界面选择槽位', false);
                        }
                        return true;
                    }

                    if (this.menuButtonBounds &&
                        x >= this.menuButtonBounds.x && x <= this.menuButtonBounds.x + this.menuButtonBounds.w &&
                        y >= this.menuButtonBounds.y && y <= this.menuButtonBounds.y + this.menuButtonBounds.h) {

                        this.confirmDialog = {
                            title: '⚠️ 确认返回',
                            message: '确定要返回主菜单吗？\n记得先保存游戏！'
                        };
                        return true;
                    }

                    // 音乐控制点击处理
                    if (homeScene) {
                        // 播放/暂停按钮
                        if (this.musicControlBounds &&
                            x >= this.musicControlBounds.x && x <= this.musicControlBounds.x + this.musicControlBounds.w &&
                            y >= this.musicControlBounds.y && y <= this.musicControlBounds.y + this.musicControlBounds.h) {
                            
                            homeScene.toggleBackgroundMusic();
                            return true;
                        }
                        
                        // 音量滑块点击
                        if (this.volumeSliderBounds &&
                            x >= this.volumeSliderBounds.x - 10 && x <= this.volumeSliderBounds.x + this.volumeSliderBounds.w + 10 &&
                            y >= this.volumeSliderBounds.y - 15 && y <= this.volumeSliderBounds.y + this.volumeSliderBounds.h + 15) {
                            
                            const newVolume = Math.max(0, Math.min(1, 
                                (x - this.volumeSliderBounds.x) / this.volumeSliderBounds.w));
                            homeScene.setMusicVolume(newVolume);
                            return true;
                        }
                    }

                    const inputW = (Math.min(W * 0.88, 360)) - 50;
                    const inputX = (W - (Math.min(W * 0.88, 360))) / 2 + 25;
                    const inputY = (H - (Math.min(H * 0.75, 520))) / 2 + 127;

                    if (x >= inputX && x <= inputX + inputW && y >= inputY && y <= inputY + 38) {
                        return true;
                    }

                    return true;
                }

                handleInput(key) {
                    if (key === 'Backspace') {
                        this.inputValue = this.inputValue.slice(0, -1);
                    } else if (key === 'Enter') {
                        if (this.inputValue.trim()) {
                            gs.playerData.name = this.inputValue.trim();
                        }
                    } else if (key.length === 1 && this.inputValue.length < 10) {
                        this.inputValue += key;
                    }
                }

                showNotification(message, isSuccess) {
                    this.notification = {
                        message,
                        isSuccess,
                        timer: 2.0
                    };
                }

                handlePointerDown(x, y) {
                    if (!this.visible || this.alpha < 0.5) return;
                    
                    // 检查是否点击了音量滑块（开始拖拽）
                    if (homeScene && this.volumeSliderBounds &&
                        x >= this.volumeSliderBounds.x - 10 && x <= this.volumeSliderBounds.x + this.volumeSliderBounds.w + 10 &&
                        y >= this.volumeSliderBounds.y - 15 && y <= this.volumeSliderBounds.y + this.volumeSliderBounds.h + 15) {
                        
                        this.isDraggingVolume = true;
                        const newVolume = Math.max(0, Math.min(1, 
                            (x - this.volumeSliderBounds.x) / this.volumeSliderBounds.w));
                        homeScene.setMusicVolume(newVolume);
                    }
                    
                    this.handleClick(x, y);
                }

                handlePointerMove(x, y) {
                    if (!this.visible || !this.isDraggingVolume || !homeScene) return;
                    
                    if (this.volumeSliderBounds) {
                        const newVolume = Math.max(0, Math.min(1, 
                            (x - this.volumeSliderBounds.x) / this.volumeSliderBounds.w));
                        homeScene.setMusicVolume(newVolume);
                    }
                }

                handlePointerUp() {
                    if (this.isDraggingVolume) {
                        this.isDraggingVolume = false;
                    }
                }
            }

            let settingsPanel = new SettingsPanel();

            // ============ 背包界面 ============
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
                    this.alpha = lerp(this.alpha, this.targetAlpha, dt * 10);
                    if (this.alpha < 0.01 && this.targetAlpha === 0) {
                        this.visible = false;
                    }
                    this.scrollY = lerp(this.scrollY, this.targetScrollY, dt * 15);
                    this.scrollY = clamp(this.scrollY, 0, this.maxScrollY);
                    if (this.showDetail) {
                        this.detailAlpha = lerp(this.detailAlpha, 1, dt * 8);
                    } else {
                        this.detailAlpha = lerp(this.detailAlpha, 0, dt * 10);
                    }
                    if (this.showPetSelect) {
                        this.petSelectAlpha = lerp(this.petSelectAlpha, 1, dt * 8);
                    } else {
                        this.petSelectAlpha = lerp(this.petSelectAlpha, 0, dt * 10);
                    }
                    if (this.messageTimer > 0) {
                        this.messageTimer -= dt;
                        if (this.messageTimer <= 0) {
                            this.useMessage = null;
                        }
                    }
                }

                getCurrentItems() {
                    return gs.bagManager.getItemsByType(this.currentTab);
                }

                draw(ctx) {
                    if (!this.visible || this.alpha < 0.01) return;

                    ctx.save();
                    ctx.globalAlpha = this.alpha;

                    const panelX = 0;
                    const panelY = 0;
                    const panelW = W;
                    const panelH = H;

                    // 全屏背景
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
                    ctx.font = `bold ${Math.min(W * 0.04, 16)}px "STKaiti","KaiTi",sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText('选择宠物', selectX + selectW / 2, selectY + 25);

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

                        ctx.font = `${Math.min(W * 0.08, 28)}px serif`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(this.getPetIcon(pet.speciesId), px + petSize / 2, py + petSize / 2 - 8);

                        ctx.fillStyle = '#f0e0c0';
                        ctx.font = `${Math.min(W * 0.02, 8)}px "STKaiti","KaiTi",sans-serif`;
                        ctx.fillText(`Lv.${pet.level}`, px + petSize / 2, py + petSize - 10);
                    }

                    ctx.fillStyle = 'rgba(255, 100, 100, 0.6)';
                    ctx.beginPath();
                    ctx.arc(selectX + selectW - 15, selectY + 15, 12, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#fff';
                    ctx.font = `bold ${Math.min(W * 0.03, 14)}px sans-serif`;
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
                    const msgX = (W - msgW) / 2;
                    const msgY = H / 2 - msgH / 2;

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
                    ctx.font = `bold ${Math.min(W * 0.035, 14)}px "STKaiti","KaiTi",sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(this.useMessage, msgX + msgW / 2, msgY + msgH / 2);
                }

                drawHeader(ctx, x, y, w) {
                    // 全屏头部背景
                    const headerGrad = ctx.createLinearGradient(x, y, x, y + 75);
                    headerGrad.addColorStop(0, 'rgba(35, 33, 48, 0.95)');
                    headerGrad.addColorStop(1, 'rgba(30, 28, 40, 0.95)');
                    ctx.fillStyle = headerGrad;
                    ctx.fillRect(x, y, w, 75);

                    // 底部装饰线
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

                    // 关闭按钮（左上角）
                    const closeBtnX = x + 25;
                    const closeBtnY = y + 37;
                    ctx.fillStyle = 'rgba(255, 100, 100, 0.7)';
                    ctx.beginPath();
                    ctx.arc(closeBtnX, closeBtnY, 16, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#fff';
                    ctx.font = `bold ${Math.min(W * 0.04, 18)}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText('×', closeBtnX, closeBtnY + 1);

                    // 标题（居中）
                    ctx.fillStyle = '#f0e0c0';
                    ctx.font = `bold ${Math.min(W * 0.05, 20)}px "STKaiti","KaiTi",sans-serif`;
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

                        ctx.font = `${Math.min(W * 0.035, 14)}px serif`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(tab.icon, tabX + tabW / 2 - 10, tabY + this.tabHeight / 2 - 2);

                        ctx.fillStyle = isActive ? '#f0e0c0' : '#a0a0a0';
                        ctx.font = `${Math.min(W * 0.025, 10)}px "STKaiti","KaiTi",sans-serif`;
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
                        ctx.font = `${Math.min(W * 0.03, 12)}px "STKaiti","KaiTi",sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('该分类下没有道具', panelX + panelW / 2, contentY + contentH / 2);
                    }
                }

                drawItemCell(ctx, item, count, x, y, w, h, index) {
                    const isSelected = this.selectedItem && this.selectedItem.id === item.id;
                    const isHovered = this.hoveredCell === index;
                    const pulse = Math.sin(this.time * 3 + index * 0.5) * 0.03;

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

                    ctx.font = `${Math.min(W * 0.08, 28)}px serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(item.icon, x + w / 2, y + h * 0.4);

                    ctx.fillStyle = '#f0e0c0';
                    ctx.font = `bold ${Math.min(W * 0.022, 9)}px "STKaiti","KaiTi",sans-serif`;
                    ctx.fillText(item.name, x + w / 2, y + h * 0.72);

                    if (count > 1) {
                        ctx.fillStyle = 'rgba(255, 200, 100, 0.9)';
                        ctx.font = `bold ${Math.min(W * 0.025, 10)}px sans-serif`;
                        ctx.textAlign = 'right';
                        ctx.fillText(`×${count}`, x + w - 5, y + h - 8);
                    }
                }

                drawFooter(ctx, x, y, w) {
                    ctx.fillStyle = 'rgba(40, 38, 50, 0.8)';
                    ctx.beginPath();
                    ctx.roundRect(x + 5, y, w - 10, 30, 8);
                    ctx.fill();

                    const usedSlots = gs.bagManager.getUsedSlots();
                    const maxSlots = gs.bagManager.maxSlots;
                    ctx.fillStyle = usedSlots >= maxSlots ? '#ff6b6b' : '#c8b898';
                    ctx.font = `${Math.min(W * 0.025, 10)}px "STKaiti","KaiTi",sans-serif`;
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

                    ctx.font = `${Math.min(W * 0.1, 40)}px serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(item.icon, detailX + detailW / 2, detailY + 50);

                    ctx.fillStyle = '#f0e0c0';
                    ctx.font = `bold ${Math.min(W * 0.04, 16)}px "STKaiti","KaiTi",sans-serif`;
                    ctx.fillText(item.name, detailX + detailW / 2, detailY + 95);

                    const count = gs.bagManager.getItemCount(item.id);
                    ctx.fillStyle = '#ffd700';
                    ctx.font = `${Math.min(W * 0.03, 12)}px "STKaiti","KaiTi",sans-serif`;
                    ctx.fillText(`持有: ${count} 个`, detailX + detailW / 2, detailY + 120);

                    ctx.fillStyle = '#a0a0a0';
                    ctx.font = `${Math.min(W * 0.025, 10)}px "STKaiti","KaiTi",sans-serif`;
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
                        ctx.font = `bold ${Math.min(W * 0.03, 12)}px "STKaiti","KaiTi",sans-serif`;
                        ctx.fillText('使用', btnX + btnW / 2, btnY + btnH / 2);
                    }

                    ctx.fillStyle = 'rgba(255, 100, 100, 0.6)';
                    ctx.beginPath();
                    ctx.arc(detailX + detailW - 15, detailY + 15, 12, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#fff';
                    ctx.font = `bold ${Math.min(W * 0.03, 14)}px sans-serif`;
                    ctx.fillText('×', detailX + detailW - 15, detailY + 16);

                    ctx.globalAlpha = this.alpha;
                }

                handleClick(x, y) {
                    if (!this.visible || this.alpha < 0.5) return null;

                    const panelX = 0;
                    const panelY = 0;
                    const panelW = W;
                    const panelH = H;

                    const closeBtnX = panelX + 25;
                    const closeBtnY = panelY + 37;
                    if (dist(x, y, closeBtnX, closeBtnY) < 16) {
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
                        if (dist(x, y, closeSelX, closeSelY) < 15) {
                            this.showPetSelect = false;
                            return 'close_pet_select';
                        }

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
                        if (dist(x, y, detailCloseX, detailCloseY) < 15) {
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
                        const skillIds = Object.keys(SkillsDB);
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
                            this.useMessage = `学会了${SkillsDB[newSkillId].name}！`;
                            this.messageTimer = 2;
                        } else {
                            this.useMessage = result.reason === 'skill_full' ? '技能已满！' : '学习失败';
                            this.messageTimer = 1.5;
                        }
                    }
                }

                handlePointerDown(x, y) {
                    const panelX = W * 0.05;
                    const panelY = topBar.getHeight() + 10;
                    const panelW = W * 0.9;
                    const panelH = H - topBar.getHeight() - bottomBar.getHeight() - 20;
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
                        this.targetScrollY = clamp(this.targetScrollY, 0, this.maxScrollY);
                    }

                    const panelX = W * 0.05;
                    const panelY = topBar.getHeight() + 10;
                    const panelW = W * 0.9;
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
                    const panelX = W * 0.05;
                    const panelY = topBar.getHeight() + 10;
                    const panelW = W * 0.9;
                    const panelH = H - topBar.getHeight() - bottomBar.getHeight() - 20;
                    return x >= panelX && x <= panelX + panelW && y >= panelY && y <= panelY + panelH;
                }
            }

            // ============ 场景1：开始场景 ============
            class StartScene {
                constructor() {
                    this.time = 0;
                    this.titleAlpha = 1;
                    this.subtitleAlpha = 1;
                    this.hintAlpha = 1;
                    this.phase = 'idle'; // fadeIn | idle
                    this.phaseTimer = 0;
                    this.stars = [];
                    this.trees = [];
                    this.groundHills = [];
                    this.glowPulse = 0;
                    this.clickable = true;
                    this.clickAlpha = 0;

                    // 生成星星
                    const starSeed = seededRandom(42);
                    for (let i = 0; i < 80; i++) {
                        this.stars.push({
                            x: starSeed() * W,
                            y: starSeed() * H * 0.55,
                            size: starSeed() * 1.8 + 0.3,
                            twinkleSpeed: starSeed() * 3 + 1,
                            twinkleOffset: starSeed() * Math.PI * 2,
                        });
                    }

                    // 生成树木剪影（背景）
                    const treeSeed = seededRandom(137);
                    for (let i = 0; i < 25; i++) {
                        this.trees.push({
                            x: treeSeed() * W,
                            baseY: H * 0.55 + treeSeed() * H * 0.2,
                            height: treeSeed() * H * 0.30 + H * 0.10,
                            width: treeSeed() * 25 + 18,
                            sway: treeSeed() * 0.4 + 0.1,
                            swayOffset: treeSeed() * Math.PI * 2,
                        });
                    }

                    // 地面起伏
                    const hillSeed = seededRandom(251);
                    for (let i = 0; i < 6; i++) {
                        this.groundHills.push({
                            cx: hillSeed() * W,
                            width: hillSeed() * W * 0.5 + W * 0.2,
                            height: hillSeed() * H * 0.08 + H * 0.03,
                        });
                    }
                }

                init() {
                    this.time = 0;
                    this.titleAlpha = 1;
                    this.subtitleAlpha = 1;
                    this.hintAlpha = 1;
                    this.phase = 'idle';
                    this.phaseTimer = 0;
                    this.clickable = true;
                    this.clickAlpha = 0;
                }

                update(dt) {
                    this.time += dt;

                    // 提示文字脉冲
                    this.clickAlpha = 0.5 + Math.sin(this.time * 2.5) * 0.4;
                }

                draw(ctx) {
                    const gradSky = ctx.createLinearGradient(0, 0, 0, H);
                    gradSky.addColorStop(0, '#0a0a1e');
                    gradSky.addColorStop(0.4, '#111133');
                    gradSky.addColorStop(0.7, '#1a1a3a');
                    gradSky.addColorStop(1, '#1a2a20');
                    ctx.fillStyle = gradSky;
                    ctx.fillRect(0, 0, W, H);



                    // 星星
                    for (const s of this.stars) {
                        const twinkle = 0.5 + 0.5 * Math.sin(this.time * s.twinkleSpeed + s.twinkleOffset);
                        const alpha = 0.35 + twinkle * 0.55;
                        ctx.fillStyle = `rgba(255,255,240,${alpha})`;
                        ctx.beginPath();
                        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
                        ctx.fill();
                        // 光晕
                        if (twinkle > 0.7) {
                            ctx.fillStyle = `rgba(255,255,220,${alpha*0.3})`;
                            ctx.beginPath();
                            ctx.arc(s.x, s.y, s.size * 2.5, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    }

                    // 月亮
                    const moonX = W * 0.78;
                    const moonY = H * 0.14;
                    const moonR = Math.min(W, H) * 0.07;
                    ctx.fillStyle = 'rgba(255,245,220,0.9)';
                    ctx.beginPath();
                    ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = 'rgba(255,250,235,0.35)';
                    ctx.beginPath();
                    ctx.arc(moonX, moonY, moonR * 2.2, 0, Math.PI * 2);
                    ctx.fill();

                    // 远山
                    ctx.fillStyle = '#0d0d25';
                    ctx.beginPath();
                    ctx.moveTo(0, H * 0.6);
                    ctx.bezierCurveTo(W * 0.2, H * 0.42, W * 0.5, H * 0.48, W * 0.75, H * 0.44);
                    ctx.bezierCurveTo(W * 0.9, H * 0.41, W, H * 0.5, W, H * 0.55);
                    ctx.lineTo(W, H);
                    ctx.lineTo(0, H);
                    ctx.fill();

                    // 略近的山
                    ctx.fillStyle = '#0f0f2a';
                    ctx.beginPath();
                    ctx.moveTo(0, H * 0.64);
                    ctx.bezierCurveTo(W * 0.15, H * 0.5, W * 0.35, H * 0.55, W * 0.5, H * 0.52);
                    ctx.bezierCurveTo(W * 0.65, H * 0.49, W * 0.85, H * 0.53, W, H * 0.56);
                    ctx.lineTo(W, H);
                    ctx.lineTo(0, H);
                    ctx.fill();

                    // 树木剪影
                    for (const tree of this.trees) {
                        const sway = Math.sin(this.time * tree.sway + tree.swayOffset) * tree.sway * 3;
                        const tx = tree.x + sway;
                        const ty = tree.baseY;
                        const th = tree.height;
                        const tw = tree.width;

                        ctx.fillStyle = '#0c0c20';
                        // 树冠（多层三角）
                        for (let l = 0; l < 3; l++) {
                            const ly = ty - th * (0.5 + l * 0.25);
                            const lw = tw * (1.2 - l * 0.25);
                            const lh = th * 0.45;
                            ctx.beginPath();
                            ctx.moveTo(tx, ly - lh);
                            ctx.lineTo(tx - lw, ly + lh * 0.4);
                            ctx.lineTo(tx + lw, ly + lh * 0.4);
                            ctx.closePath();
                            ctx.fill();
                        }
                        // 树干
                        ctx.fillStyle = '#0a0a18';
                        ctx.fillRect(tx - tw * 0.12, ty - th * 0.1, tw * 0.24, th * 0.3);
                    }

                    // 地面
                    const groundGrad = ctx.createLinearGradient(0, H * 0.6, 0, H);
                    groundGrad.addColorStop(0, '#0f1f15');
                    groundGrad.addColorStop(0.5, '#0d1a10');
                    groundGrad.addColorStop(1, '#0a140c');
                    ctx.fillStyle = groundGrad;
                    ctx.fillRect(0, H * 0.6, W, H * 0.4);

                    // 地面起伏
                    for (const hill of this.groundHills) {
                        ctx.fillStyle = 'rgba(14,28,18,0.5)';
                        ctx.beginPath();
                        ctx.ellipse(hill.cx, H * 0.6, hill.width, hill.height, 0, Math.PI, 0);
                        ctx.fill();
                    }

                    // 中央祭坛光点
                    const altarX = W / 2;
                    const altarY = H * 0.62;
                    const altarGrad = ctx.createRadialGradient(altarX, altarY, 0, altarX, altarY, 80);
                    altarGrad.addColorStop(0, 'rgba(255,200,120,0.25)');
                    altarGrad.addColorStop(0.5, 'rgba(200,150,80,0.1)');
                    altarGrad.addColorStop(1, 'rgba(150,100,40,0)');
                    ctx.fillStyle = altarGrad;
                    ctx.beginPath();
                    ctx.arc(altarX, altarY, 80, 0, Math.PI * 2);
                    ctx.fill();

                    // 祭坛石块
                    ctx.fillStyle = 'rgba(30,25,35,0.7)';
                    ctx.beginPath();
                    ctx.ellipse(altarX - 25, altarY + 8, 22, 10, -0.2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.ellipse(altarX + 28, altarY + 5, 20, 9, 0.15, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = 'rgba(40,35,45,0.6)';
                    ctx.beginPath();
                    ctx.ellipse(altarX, altarY - 2, 30, 12, 0, 0, Math.PI * 2);
                    ctx.fill();

                    // 标题
                    const titleY = H * 0.22;
                    ctx.save();
                    ctx.globalAlpha = this.titleAlpha;
                    // 标题光晕
                    const titleGlow = ctx.createRadialGradient(W / 2, titleY, 0, W / 2, titleY, W * 0.5);
                    titleGlow.addColorStop(0, 'rgba(255,220,150,0.3)');
                    titleGlow.addColorStop(0.6, 'rgba(200,150,80,0.08)');
                    titleGlow.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = titleGlow;
                    ctx.fillRect(0, titleY - H * 0.2, W, H * 0.4);

                    // 标题文字
                    ctx.fillStyle = '#f5e6c8';
                    ctx.font = `bold ${Math.min(W*0.09,48)}px "STKaiti","KaiTi","STSong","Songti SC",serif`;
                    ctx.textAlign = 'center';
                    ctx.shadowColor = 'rgba(255,200,100,0.6)';
                    ctx.shadowBlur = 20;
                    ctx.fillText('秘境猎人', W / 2, titleY);
                    ctx.shadowBlur = 0;

                    // 装饰线
                    const lineY = titleY + Math.min(W * 0.035, 20);
                    ctx.strokeStyle = 'rgba(255,200,140,0.5)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(W / 2 - 80, lineY);
                    ctx.lineTo(W / 2 + 80, lineY);
                    ctx.stroke();
                    // 小菱形
                    ctx.fillStyle = 'rgba(255,200,140,0.7)';
                    ctx.beginPath();
                    ctx.moveTo(W / 2, lineY - 5);
                    ctx.lineTo(W / 2 + 6, lineY);
                    ctx.lineTo(W / 2, lineY + 5);
                    ctx.lineTo(W / 2 - 6, lineY);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();

                    // 副标题
                    ctx.save();
                    ctx.globalAlpha = this.subtitleAlpha;
                    ctx.fillStyle = '#c8b89a';
                    ctx.font = `${Math.min(W*0.04,18)}px "STKaiti","KaiTi","STSong",serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText('每一次遇见，都是未知的惊喜', W / 2, titleY + Math.min(W * 0.07, 36));
                    ctx.restore();

                    // 点击提示
                    ctx.save();
                    ctx.globalAlpha = this.hintAlpha * (this.clickable ? this.clickAlpha : 0.7);
                    ctx.fillStyle = '#e8d5b0';
                    ctx.font = `${Math.min(W*0.035,16)}px "STKaiti","KaiTi","STSong",serif`;
                    ctx.textAlign = 'center';
                    const hintY = H * 0.78;
                    ctx.fillText('— 点击屏幕开始冒险 —', W / 2, hintY);
                    // 下方小箭头
                    const arrowY = hintY + 18;
                    const arrowBob = Math.sin(this.time * 3) * 3;
                    ctx.strokeStyle = 'rgba(232,213,176,0.6)';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(W / 2 - 10, arrowY + arrowBob - 3);
                    ctx.lineTo(W / 2, arrowY + arrowBob + 6);
                    ctx.lineTo(W / 2 + 10, arrowY + arrowBob - 3);
                    ctx.stroke();
                    ctx.restore();
                }

                handleClick(x, y) {
                    // 检查是否点击了跳过按钮
                    if (x >= 15 && x <= 70 && y >= 15 && y <= 43) {
                        return 'next';
                    }
                    if (this.clickable && this.phase === 'idle') {
                        return 'next';
                    }
                    return null;
                }
            }

            // ============ 场景2：加载场景 ============
            class LoadingScene {
                constructor() {
                    this.progress = 0;
                    this.targetProgress = 0;
                    this.time = 0;
                    this.ringRotation = 0;
                    this.ringParticles = [];
                    this.quoteAlpha = 0;
                    this.finished = false;
                    this.finishTimer = 0;
                    this.readyToTransition = false;

                    this.resources = [];
                    this.loadedCount = 0;
                    this.totalResources = 0;
                    this.loadingStarted = false;
                }

                init() {
                    this.progress = 0;
                    this.targetProgress = 0;
                    this.time = 0;
                    this.ringRotation = 0;
                    this.quoteAlpha = 0;
                    this.finished = false;
                    this.finishTimer = 0;
                    this.readyToTransition = false;
                    this.ringParticles = [];
                    this.loadedCount = 0;
                    this.loadingStarted = false;

                    for (let i = 0; i < 20; i++) {
                        this.ringParticles.push({
                            angle: (i / 20) * Math.PI * 2,
                            radius: 55 + Math.random() * 20,
                            speed: 1.2 + Math.random() * 1.5,
                            size: 1 + Math.random() * 2,
                            alpha: 0.5 + Math.random() * 0.5,
                            phase: Math.random() * Math.PI * 2,
                        });
                    }

                    this.startResourceLoading();
                }

                startResourceLoading() {
                    this.loadingStarted = true;
                    this.loadedCount = 0;

                    const resourceList = [
                        { type: 'audio', src: 'assets/audio/bgm/home_bgm.mp3', name: '背景音乐', weight: 3 },
                        { type: 'init', name: '游戏数据初始化', weight: 2, action: () => this.initGameData() },
                        { type: 'init', name: '场景资源准备', weight: 2, action: () => this.prepareScenes() },
                        { type: 'init', name: '粒子系统预热', weight: 1, action: () => this.warmupParticles() },
                        { type: 'init', name: '音频系统初始化', weight: 2, action: () => this.initAudioSystem() },
                    ];

                    this.totalResources = resourceList.length;
                    this.resources = resourceList.map(r => ({ ...r, loaded: false, progress: 0 }));

                    resourceList.forEach((resource, index) => {
                        if (resource.type === 'audio') {
                            this.loadAudio(resource, index);
                        } else if (resource.type === 'init') {
                            this.runInitTask(resource, index);
                        }
                    });

                    if (this.totalResources === 0) {
                        this.onAllLoaded();
                    }
                }

                loadAudio(resource, index) {
                    try {
                        const audio = new Audio();
                        audio.preload = 'auto';

                        audio.addEventListener('progress', (e) => {
                            if (e.lengthComputable) {
                                this.resources[index].progress = e.loaded / e.total;
                                this.updateOverallProgress();
                            }
                        });

                        audio.addEventListener('canplaythrough', () => {
                            this.resources[index].loaded = true;
                            this.resources[index].progress = 1;
                            this.loadedCount++;
                            console.log(`✅ ${resource.name} 加载完成`);
                            this.updateOverallProgress();
                            this.checkAllLoaded();
                        });

                        audio.addEventListener('error', () => {
                            console.warn(`⚠️ ${resource.name} 加载失败，使用默认设置`);
                            this.resources[index].loaded = true;
                            this.resources[index].progress = 1;
                            this.loadedCount++;
                            this.updateOverallProgress();
                            this.checkAllLoaded();
                        });

                        audio.src = resource.src;
                        audio.load();
                    } catch (e) {
                        console.warn(`⚠️ ${resource.name} 初始化失败:`, e);
                        this.resources[index].loaded = true;
                        this.resources[index].progress = 1;
                        this.loadedCount++;
                        this.updateOverallProgress();
                        this.checkAllLoaded();
                    }
                }

                runInitTask(resource, index) {
                    try {
                        if (resource.action) {
                            resource.action();
                        }
                    } catch (e) {
                        console.warn(`⚠️ ${resource.name} 执行失败:`, e);
                    }

                    this.resources[index].progress = 1;
                    this.resources[index].loaded = true;
                    this.loadedCount++;
                    console.log(`✅ ${resource.name} 完成`);
                    this.updateOverallProgress();
                    this.checkAllLoaded();
                }

                initGameData() {
                    if (homeScene && typeof homeScene.initBuildings === 'function') {
                        homeScene.initBuildings();
                    }
                    if (homeScene && typeof homeScene.initPets === 'function') {
                        homeScene.initPets();
                    }
                    if (homeScene && typeof homeScene.initDecorations === 'function') {
                        homeScene.initDecorations();
                    }
                    if (homeScene && typeof homeScene.initClouds === 'function') {
                        homeScene.initClouds();
                    }
                }

                prepareScenes() {
                    if (worldScene && typeof worldScene.init === 'function') {
                        worldScene.init();
                    }
                    if (tutorialScene && typeof tutorialScene.init === 'function') {
                        tutorialScene.init();
                    }
                }

                initAudioSystem() {
                    if (homeScene && typeof homeScene.initBackgroundMusic === 'function') {
                        homeScene.initBackgroundMusic();
                    }
                }

                updateOverallProgress() {
                    let totalWeight = 0;
                    let weightedProgress = 0;

                    for (const r of this.resources) {
                        totalWeight += r.weight;
                        weightedProgress += r.progress * r.weight;
                    }

                    this.targetProgress = totalWeight > 0 ? weightedProgress / totalWeight : 0;
                }

                checkAllLoaded() {
                    if (this.loadedCount >= this.totalResources && !this.finished) {
                        this.onAllLoaded();
                    }
                }

                onAllLoaded() {
                    this.targetProgress = 1;
                    this.finished = true;
                    this.finishTimer = 0;
                    console.log('🎉 所有资源加载完成！');
                }

                update(dt) {
                    this.time += dt;
                    this.ringRotation += dt * 0.8;

                    if (!this.finished) {
                        this.progress = lerp(this.progress, this.targetProgress, dt * 8);

                        if (!this.loadingStarted) {
                            this.startResourceLoading();
                        }
                    } else {
                        this.progress = lerp(this.progress, 1, dt * 12);
                        this.finishTimer += dt;
                        if (this.finishTimer > 0.1) {
                            this.readyToTransition = true;
                        }
                    }

                    this.quoteAlpha = Math.min(1, this.time / 1.5);
                }

                draw(ctx) {
                    // 深色背景
                    const bgGrad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
                    bgGrad.addColorStop(0, '#1a1a35');
                    bgGrad.addColorStop(1, '#080818');
                    ctx.fillStyle = bgGrad;
                    ctx.fillRect(0, 0, W, H);

                    const cx = W / 2;
                    const cy = H / 2;

                    // 传送阵外环
                    ctx.save();
                    ctx.translate(cx, cy);

                    // 外环旋转
                    ctx.save();
                    ctx.rotate(this.ringRotation);
                    ctx.strokeStyle = 'rgba(180,200,220,0.4)';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([8, 12]);
                    ctx.lineDashOffset = -this.time * 30;
                    ctx.beginPath();
                    ctx.arc(0, 0, 70, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.restore();

                    // 内环
                    ctx.save();
                    ctx.rotate(-this.ringRotation * 0.7);
                    ctx.strokeStyle = 'rgba(200,180,220,0.5)';
                    ctx.lineWidth = 1.5;
                    ctx.setLineDash([4, 8]);
                    ctx.lineDashOffset = this.time * 20;
                    ctx.beginPath();
                    ctx.arc(0, 0, 50, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.restore();

                    // 中心光点
                    const centerGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, 35);
                    centerGlow.addColorStop(0, 'rgba(220,210,255,0.8)');
                    centerGlow.addColorStop(0.5, 'rgba(180,160,220,0.3)');
                    centerGlow.addColorStop(1, 'rgba(100,80,160,0)');
                    ctx.fillStyle = centerGlow;
                    ctx.beginPath();
                    ctx.arc(0, 0, 35, 0, Math.PI * 2);
                    ctx.fill();

                    // 环绕粒子
                    for (const rp of this.ringParticles) {
                        const angle = rp.angle + this.ringRotation * rp.speed;
                        const rx = Math.cos(angle) * rp.radius;
                        const ry = Math.sin(angle) * rp.radius;
                        const alpha = rp.alpha * (0.6 + 0.4 * Math.sin(this.time * 3 + rp.phase));
                        ctx.fillStyle = `rgba(200,210,240,${alpha})`;
                        ctx.beginPath();
                        ctx.arc(rx, ry, rp.size, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    ctx.restore();

                    // 进度条
                    const barWidth = Math.min(W * 0.55, 250);
                    const barHeight = 5;
                    const barX = cx - barWidth / 2;
                    const barY = cy + 80;
                    const barGrad = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
                    barGrad.addColorStop(0, '#8090c0');
                    barGrad.addColorStop(0.5, '#b0c0e0');
                    barGrad.addColorStop(1, '#8090c0');
                    ctx.fillStyle = 'rgba(40,40,60,0.6)';
                    ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);
                    ctx.fillStyle = barGrad;
                    ctx.fillRect(barX, barY, barWidth * this.progress, barHeight);
                    // 进度光点
                    if (this.progress > 0) {
                        const dotX = barX + barWidth * this.progress;
                        ctx.fillStyle = 'rgba(220,230,255,0.9)';
                        ctx.beginPath();
                        ctx.arc(dotX, barY + barHeight / 2, 5, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.fillStyle = 'rgba(200,210,240,0.3)';
                        ctx.beginPath();
                        ctx.arc(dotX, barY + barHeight / 2, 10, 0, Math.PI * 2);
                        ctx.fill();
                    }

                    // 文字
                    ctx.fillStyle = '#c8c0d8';
                    ctx.font = `${Math.min(W*0.035,15)}px "STKaiti","KaiTi","STSong",serif`;
                    ctx.textAlign = 'center';
                    if (!this.finished) {
                        ctx.fillText('正在连接秘境...', cx, barY - 18);
                    } else {
                        ctx.fillText('连接成功！', cx, barY - 18);
                    }

                    // 格言
                    ctx.save();
                    ctx.globalAlpha = this.quoteAlpha;
                    ctx.fillStyle = '#a098b8';
                    ctx.font = `${Math.min(W*0.032,14)}px "STKaiti","KaiTi","STSong",serif`;
                    ctx.fillText('「每一次遇见，都是未知的惊喜」', cx, cy - 110);
                    ctx.restore();
                }

                handleClick(x, y) {
                    if (this.readyToTransition) {
                        return 'next';
                    }
                    return null;
                }

                isComplete() {
                    return this.readyToTransition;
                }
            }

            // ============ 场景3：存档场景 ============
            class SaveScene {
                constructor() {
                    this.time = 0;
                    this.slots = [];
                    this.hoveredSlot = -1;
                    this.confirmDialog = null;
                    this.editDialog = null;
                    this.notification = null;
                    this.backButton = { x: 20, y: 20, w: 80, h: 36 };
                    this.scrollOffset = 0;
                    this.maxScrollOffset = 0;
                }

                init() {
                    this.time = 0;
                    this.slots = [];
                    this.hoveredSlot = -1;
                    this.confirmDialog = null;
                    this.editDialog = null;
                    this.notification = null;
                    this.scrollOffset = 0;

                    for (const slotId of SAVE_SLOTS) {
                        const info = saveManager.getSlotInfo(slotId);
                        this.slots.push({
                            slotId,
                            info,
                            hasData: saveManager.hasSlot(slotId)
                        });
                    }

                    this.calculateMaxScroll();
                }

                calculateMaxScroll() {
                    const slotHeight = 110;
                    const gap = 15;
                    const totalHeight = this.slots.length * slotHeight + (this.slots.length - 1) * gap;
                    const availableHeight = H * 0.65;
                    this.maxScrollOffset = Math.max(0, totalHeight - availableHeight);
                }

                update(dt) {
                    this.time += dt;

                    if (this.notification) {
                        this.notification.timer -= dt;
                        if (this.notification.timer <= 0) {
                            this.notification = null;
                        }
                    }
                }

                draw(ctx) {
                    const gradSky = ctx.createLinearGradient(0, 0, 0, H);
                    gradSky.addColorStop(0, '#0a0a1e');
                    gradSky.addColorStop(0.4, '#111133');
                    gradSky.addColorStop(0.7, '#1a1a3a');
                    gradSky.addColorStop(1, '#1a2a20');
                    ctx.fillStyle = gradSky;
                    ctx.fillRect(0, 0, W, H);

                    ctx.save();
                    ctx.translate(0, this.scrollOffset);

                    const startY = H * 0.18;
                    const slotWidth = Math.min(W * 0.88, 420);
                    const slotHeight = 110;
                    const gap = 15;
                    const centerX = W / 2;

                    ctx.fillStyle = 'rgba(232,213,176,0.95)';
                    ctx.font = `bold ${Math.min(W*0.055,26)}px "STKaiti","KaiTi","STSong",serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText('📜 冒险存档', centerX, startY - 10);

                    for (let i = 0; i < this.slots.length; i++) {
                        const slot = this.slots[i];
                        const y = startY + i * (slotHeight + gap);
                        this.drawSlot(ctx, slot, centerX - slotWidth / 2, y, slotWidth, slotHeight, i);
                    }

                    ctx.restore();

                    this.drawBackButton(ctx);

                    if (this.confirmDialog) {
                        this.drawConfirmDialog(ctx);
                    }

                    if (this.editDialog) {
                        this.drawEditDialog(ctx);
                    }

                    if (this.notification) {
                        this.drawNotification(ctx);
                    }
                }

                drawSlot(ctx, slot, x, y, w, h, index) {
                    const isHovered = this.hoveredSlot === index;
                    const hasData = slot.hasData;

                    ctx.save();

                    const cardGrad = ctx.createLinearGradient(x, y, x, y + h);
                    if (hasData) {
                        cardGrad.addColorStop(0, isHovered ? 'rgba(45,55,85,0.98)' : 'rgba(35,45,75,0.95)');
                        cardGrad.addColorStop(1, isHovered ? 'rgba(35,45,70,0.98)' : 'rgba(25,35,60,0.95)');
                    } else {
                        cardGrad.addColorStop(0, isHovered ? 'rgba(50,60,90,0.8)' : 'rgba(40,50,80,0.6)');
                        cardGrad.addColorStop(1, isHovered ? 'rgba(40,50,75,0.8)' : 'rgba(30,40,65,0.6)');
                    }

                    ctx.fillStyle = cardGrad;
                    ctx.beginPath();
                    ctx.roundRect(x, y, w, h, 12);
                    ctx.fill();

                    ctx.strokeStyle = isHovered ? 'rgba(180,200,255,0.7)' : 'rgba(120,140,180,0.4)';
                    ctx.lineWidth = isHovered ? 2 : 1;
                    ctx.stroke();

                    if (hasData && slot.info) {
                        const info = slot.info;
                        const avatarX = x + 18;
                        const avatarY = y + h / 2;
                        const avatarR = 32;

                        ctx.save();
                        ctx.beginPath();
                        ctx.arc(avatarX, avatarY, avatarR, 0, Math.PI * 2);
                        ctx.clip();

                        const hue = (info.avatarSeed % 360);
                        const avatarGrad = ctx.createRadialGradient(avatarX - 5, avatarY - 5, 0, avatarX, avatarY, avatarR);
                        avatarGrad.addColorStop(0, `hsl(${hue}, 60%, 70%)`);
                        avatarGrad.addColorStop(1, `hsl(${hue}, 50%, 45%)`);
                        ctx.fillStyle = avatarGrad;
                        ctx.fillRect(avatarX - avatarR, avatarY - avatarR, avatarR * 2, avatarR * 2);

                        ctx.fillStyle = 'rgba(255,255,255,0.9)';
                        ctx.font = `${avatarR * 0.9}px serif`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('🧙', avatarX, avatarY + 2);
                        ctx.restore();

                        const textX = avatarX + avatarR + 18;
                        ctx.fillStyle = 'rgba(232,213,176,0.95)';
                        ctx.font = `bold ${Math.min(W*0.038,17)}px "STKaiti","KaiTi",serif`;
                        ctx.textAlign = 'left';
                        ctx.textBaseline = 'top';
                        ctx.fillText(info.slotName, textX, y + 14);

                        ctx.fillStyle = 'rgba(160,170,200,0.9)';
                        ctx.font = `${Math.min(W*0.03,13)}px sans-serif`;
                        ctx.fillText(`Lv.${info.playerLevel}  🐾×${info.teamSize}`, textX, y + 38);

                        ctx.fillStyle = 'rgba(255,215,100,0.9)';
                        ctx.font = `${Math.min(W*0.03,13)}px sans-serif`;
                        ctx.fillText(`💰${info.gold.toLocaleString()}  💎${info.diamond}`, textX, y + 58);

                        ctx.fillStyle = 'rgba(130,145,175,0.85)';
                        ctx.font = `${Math.min(W*0.028,12)}px sans-serif`;
                        ctx.fillText(`⏱ ${saveManager.formatPlayTime(info.playTime)}  🕐 ${saveManager.formatTimestamp(info.timestamp)}`, textX, y + 78);

                        ctx.fillStyle = 'rgba(220,100,100,0.7)';
                        ctx.font = `${Math.min(W*0.032,14)}px sans-serif`;
                        ctx.textAlign = 'right';
                        ctx.fillText('🗑️', x + w - 12, y + 16);
                    } else {
                        ctx.fillStyle = 'rgba(150,165,195,0.7)';
                        ctx.font = `${Math.min(W*0.04,18)}px "STKaiti","KaiTi",serif`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('➕ 新建冒险', x + w / 2, y + h / 2);
                    }

                    ctx.restore();
                }

                drawBackButton(ctx) {
                    const btn = this.backButton;
                    const isHovered = this.isPointInButton(btn.x, btn.y, btn.w, btn.h);

                    ctx.save();
                    ctx.globalAlpha = isHovered ? 1 : 0.85;
                    ctx.fillStyle = isHovered ? 'rgba(60,70,100,0.95)' : 'rgba(40,50,80,0.9)';
                    ctx.beginPath();
                    ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 8);
                    ctx.fill();

                    ctx.strokeStyle = 'rgba(150,165,195,0.6)';
                    ctx.lineWidth = 1;
                    ctx.stroke();

                    ctx.fillStyle = 'rgba(232,213,176,0.95)';
                    ctx.font = `${Math.min(W*0.032,14)}px "STKaiti","KaiTi",serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('← 返回', btn.x + btn.w / 2, btn.y + btn.h / 2);
                    ctx.restore();
                }

                drawConfirmDialog(ctx) {
                    const dialog = this.confirmDialog;
                    const dw = Math.min(W * 0.82, 340);
                    const dh = 160;
                    const dx = (W - dw) / 2;
                    const dy = (H - dh) / 2;

                    ctx.save();
                    ctx.fillStyle = 'rgba(0,0,0,0.5)';
                    ctx.fillRect(0, 0, W, H);

                    const dlgGrad = ctx.createLinearGradient(dx, dy, dx, dy + dh);
                    dlgGrad.addColorStop(0, 'rgba(50,55,85,0.98)');
                    dlgGrad.addColorStop(1, 'rgba(35,40,65,0.98)');
                    ctx.fillStyle = dlgGrad;
                    ctx.beginPath();
                    ctx.roundRect(dx, dy, dw, dh, 15);
                    ctx.fill();

                    ctx.strokeStyle = 'rgba(180,190,220,0.6)';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();

                    ctx.fillStyle = 'rgba(232,213,176,0.95)';
                    ctx.font = `bold ${Math.min(W*0.04,18)}px "STKaiti","KaiTi",serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText(dialog.title, dx + dw / 2, dy + 35);

                    ctx.fillStyle = 'rgba(180,185,205,0.9)';
                    ctx.font = `${Math.min(W*0.032,14)}px sans-serif`;
                    ctx.fillText(dialog.message, dx + dw / 2, dy + 70);

                    const btnW = 90;
                    const btnH = 34;
                    const btnY = dy + dh - 45;
                    const cancelX = dx + dw / 2 - btnW - 15;
                    const confirmX = dx + dw / 2 + 15;

                    ctx.fillStyle = 'rgba(70,80,110,0.95)';
                    ctx.beginPath();
                    ctx.roundRect(cancelX, btnY, btnW, btnH, 8);
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(140,150,180,0.5)';
                    ctx.stroke();
                    ctx.fillStyle = 'rgba(200,200,210,0.9)';
                    ctx.font = `${Math.min(W*0.03,13)}px sans-serif`;
                    ctx.fillText('取消', cancelX + btnW / 2, btnY + btnH / 2);

                    ctx.fillStyle = dialog.isDelete ? 'rgba(160,70,70,0.95)' : 'rgba(70,120,90,0.95)';
                    ctx.beginPath();
                    ctx.roundRect(confirmX, btnY, btnW, btnH, 8);
                    ctx.fill();
                    ctx.strokeStyle = dialog.isDelete ? 'rgba(200,120,120,0.5)' : 'rgba(120,180,140,0.5)';
                    ctx.stroke();
                    ctx.fillStyle = 'rgba(240,240,245,0.95)';
                    ctx.fillText(dialog.isDelete ? '删除' : '确认', confirmX + btnW / 2, btnY + btnH / 2);

                    dialog.cancelBounds = { x: cancelX, y: btnY, w: btnW, h: btnH };
                    dialog.confirmBounds = { x: confirmX, y: btnY, w: btnW, h: btnH };

                    ctx.restore();
                }

                drawEditDialog(ctx) {
                    const dialog = this.editDialog;
                    const dw = Math.min(W * 0.85, 360);
                    const dh = 140;
                    const dx = (W - dw) / 2;
                    const dy = (H - dh) / 2;

                    ctx.save();
                    ctx.fillStyle = 'rgba(0,0,0,0.5)';
                    ctx.fillRect(0, 0, W, H);

                    const dlgGrad = ctx.createLinearGradient(dx, dy, dx, dy + dh);
                    dlgGrad.addColorStop(0, 'rgba(50,55,85,0.98)');
                    dlgGrad.addColorStop(1, 'rgba(35,40,65,0.98)');
                    ctx.fillStyle = dlgGrad;
                    ctx.beginPath();
                    ctx.roundRect(dx, dy, dw, dh, 15);
                    ctx.fill();

                    ctx.strokeStyle = 'rgba(180,190,220,0.6)';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();

                    ctx.fillStyle = 'rgba(232,213,176,0.95)';
                    ctx.font = `bold ${Math.min(W*0.04,18)}px "STKaiti","KaiTi",serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText('✏️ 修改名称', dx + dw / 2, dy + 32);

                    const inputX = dx + 25;
                    const inputY = dy + 48;
                    const inputW = dw - 50;
                    const inputH = 38;

                    ctx.fillStyle = 'rgba(30,35,55,0.95)';
                    ctx.beginPath();
                    ctx.roundRect(inputX, inputY, inputW, inputH, 8);
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(140,160,200,0.6)';
                    ctx.stroke();

                    ctx.fillStyle = 'rgba(230,225,215,0.95)';
                    ctx.font = `${Math.min(W*0.035,16)}px sans-serif`;
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'middle';
                    const displayText = dialog.inputValue || '输入存档名称...';
                    ctx.fillStyle = dialog.inputValue ? 'rgba(230,225,215,0.95)' : 'rgba(140,145,160,0.7)';
                    ctx.fillText(displayText, inputX + 12, inputY + inputH / 2);

                    if (dialog.inputValue && Math.sin(this.time * 4) > 0) {
                        const textWidth = ctx.measureText(displayText).width;
                        ctx.fillStyle = 'rgba(200,210,240,0.9)';
                        ctx.fillRect(inputX + 14 + textWidth, inputY + 10, 2, inputH - 20);
                    }

                    const btnW = 80;
                    const btnH = 32;
                    const btnY = dy + dh - 42;
                    const cancelX = dx + dw / 2 - btnW - 12;
                    const confirmX = dx + dw / 2 + 12;

                    ctx.fillStyle = 'rgba(70,80,110,0.95)';
                    ctx.beginPath();
                    ctx.roundRect(cancelX, btnY, btnW, btnH, 8);
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(140,150,180,0.5)';
                    ctx.stroke();
                    ctx.fillStyle = 'rgba(200,200,210,0.9)';
                    ctx.font = `${Math.min(W*0.029,13)}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('取消', cancelX + btnW / 2, btnY + btnH / 2);

                    ctx.fillStyle = 'rgba(70,120,90,0.95)';
                    ctx.beginPath();
                    ctx.roundRect(confirmX, btnY, btnW, btnH, 8);
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(120,180,140,0.5)';
                    ctx.stroke();
                    ctx.fillStyle = 'rgba(240,240,245,0.95)';
                    ctx.fillText('确定', confirmX + btnW / 2, btnY + btnH / 2);

                    dialog.cancelBounds = { x: cancelX, y: btnY, w: btnW, h: btnH };
                    dialog.confirmBounds = { x: confirmX, y: btnY, w: btnW, h: btnH };

                    ctx.restore();
                }

                drawNotification(ctx) {
                    const notif = this.notification;
                    const alpha = notif.timer > 0.5 ? 1 : notif.timer * 2;

                    ctx.save();
                    ctx.globalAlpha = alpha;

                    const nw = Math.min(W * 0.7, 280);
                    const nh = 44;
                    const nx = (W - nw) / 2;
                    const ny = H * 0.15;

                    ctx.fillStyle = notif.isSuccess ? 'rgba(60,120,80,0.92)' : 'rgba(140,70,70,0.92)';
                    ctx.beginPath();
                    ctx.roundRect(nx, ny, nw, nh, 10);
                    ctx.fill();

                    ctx.fillStyle = 'rgba(255,255,255,0.95)';
                    ctx.font = `${Math.min(W*0.035,15)}px "STKaiti","KaiTi",serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(notif.message, nx + nw / 2, ny + nh / 2);

                    ctx.restore();
                }

                isPointInButton(x, y, w, h) {
                    return pointerX >= x && pointerX <= x + w && pointerY >= y && pointerY <= y + h;
                }

                handleClick(x, y) {
                    if (this.confirmDialog) {
                        if (this.isPointInButton(this.confirmDialog.cancelBounds.x, this.confirmDialog.cancelBounds.y,
                            this.confirmDialog.cancelBounds.w, this.confirmDialog.cancelBounds.h)) {
                            this.confirmDialog = null;
                            return null;
                        }
                        if (this.isPointInButton(this.confirmDialog.confirmBounds.x, this.confirmDialog.confirmBounds.y,
                            this.confirmDialog.confirmBounds.w, this.confirmDialog.confirmBounds.h)) {
                            if (this.confirmDialog.isDelete) {
                                saveManager.deleteSlot(this.confirmDialog.slotId);
                                this.init();
                                this.showNotification('存档已删除', false);
                            } else {
                                try {
                                    const data = saveManager.loadFromSlot(this.confirmDialog.slotId);
                                    if (!data) {
                                        this.showNotification('存档数据为空或已损坏', false);
                                        console.error('❌ 存档数据为空:', this.confirmDialog.slotId);
                                        return null;
                                    }

                                    const restoredState = saveManager.restoreGameState(data);
                                    if (!restoredState) {
                                        this.showNotification('存档格式异常，无法恢复', false);
                                        console.error('❌ 恢复GameState失败，存档可能损坏');
                                        return null;
                                    }

                                    if (setGameState(restoredState)) {
                                        this.showNotification('读取成功！', true);
                                        setTimeout(() => {
                                            try {
                                                const currentState = getGameState();
                                                if (!currentState) {
                                                    throw new Error('GameState在延迟后变为null');
                                                }
                                                // 如果已完成新手引导但存档场景是tutorial，强制跳转到home
                                                let targetScene = data.currentScene || 'home';
                                                if (currentState.tutorialCompleted && targetScene === 'tutorial') {
                                                    targetScene = 'home';
                                                    console.log('📂 检测到已完成的存档，跳过新手引导');
                                                }
                                                switchScene(targetScene);
                                            } catch (delayError) {
                                                console.error('❌ 场景切换失败:', delayError);
                                                switchScene('start');
                                            }
                                        }, 500);
                                    } else {
                                        this.showNotification('状态设置失败', false);
                                    }
                                } catch (e) {
                                    console.error('❌ 存档读取过程中发生错误:', e);
                                    this.showNotification('存档读取失败，请重试', false);
                                }
                            }
                            this.confirmDialog = null;
                            return null;
                        }
                        return null;
                    }

                    if (this.editDialog) {
                        if (this.isPointInButton(this.editDialog.cancelBounds.x, this.editDialog.cancelBounds.y,
                            this.editDialog.cancelBounds.w, this.editDialog.cancelBounds.h)) {
                            this.editDialog = null;
                            return null;
                        }
                        if (this.isPointInButton(this.editDialog.confirmBounds.x, this.editDialog.confirmBounds.y,
                            this.editDialog.confirmBounds.w, this.editDialog.confirmBounds.h)) {
                            if (this.editDialog.inputValue.trim()) {
                                const data = saveManager.loadFromSlot(this.editDialog.slotId);
                                if (data) {
                                    data.slotName = this.editDialog.inputValue.trim();
                                    localStorage.setItem(this.editDialog.slotId, JSON.stringify(data));
                                    this.init();
                                    this.showNotification('名称已更新', true);
                                }
                            }
                            this.editDialog = null;
                            return null;
                        }
                        return null;
                    }

                    if (this.isPointInButton(this.backButton.x, this.backButton.y, this.backButton.w, this.backButton.h)) {
                        return 'back';
                    }

                    const slotWidth = Math.min(W * 0.88, 420);
                    const slotHeight = 110;
                    const gap = 15;
                    const startX = W / 2 - slotWidth / 2;
                    const startY = H * 0.18;

                    for (let i = 0; i < this.slots.length; i++) {
                        const slotY = startY + i * (slotHeight + gap) - this.scrollOffset;
                        if (x >= startX && x <= startX + slotWidth && y >= slotY && y <= slotY + slotHeight) {
                            const slot = this.slots[i];

                            if (slot.hasData) {
                                const deleteZone = { x: startX + slotWidth - 35, y: slotY, w: 35, h: 30 };
                                if (x >= deleteZone.x && x <= deleteZone.x + deleteZone.w &&
                                    y >= deleteZone.y && y <= deleteZone.y + deleteZone.h) {
                                    this.confirmDialog = {
                                        title: '⚠️ 确认删除',
                                        message: `确定要删除「${slot.info.slotName}」吗？\n此操作不可恢复！`,
                                        slotId: slot.slotId,
                                        isDelete: true
                                    };
                                    return null;
                                }

                                const editZone = { x: startX + slotWidth - 70, y: slotY, w: 35, h: 30 };
                                if (x >= editZone.x && x <= editZone.x + editZone.w &&
                                    y >= editZone.y && y <= editZone.y + editZone.h) {
                                    this.editDialog = {
                                        slotId: slot.slotId,
                                        inputValue: slot.info.slotName || ''
                                    };
                                    return null;
                                }

                                this.confirmDialog = {
                                    title: '📂 读取存档',
                                    message: `是否读取「${slot.info.slotName}」？`,
                                    slotId: slot.slotId,
                                    isDelete: false
                                };
                            } else {
                                const newGameState = GameState.createNew();
                                newGameState.playerData.avatarSeed = Math.floor(Math.random() * 99999);
                                setGameState(newGameState);
                                saveManager.currentSlotId = slot.slotId;
                                saveManager.playTime = 0;

                                switchScene('tutorial');
                            }
                            return null;
                        }
                    }

                    return null;
                }

                showNotification(message, isSuccess) {
                    this.notification = {
                        message,
                        isSuccess,
                        timer: 2.0
                    };
                }

                handleInput(key) {
                    if (this.editDialog) {
                        if (key === 'Backspace') {
                            this.editDialog.inputValue = this.editDialog.inputValue.slice(0, -1);
                        } else if (key === 'Enter') {
                            if (this.editDialog.inputValue.trim()) {
                                const data = saveManager.loadFromSlot(this.editDialog.slotId);
                                if (data) {
                                    data.slotName = this.editDialog.inputValue.trim();
                                    localStorage.setItem(this.editDialog.slotId, JSON.stringify(data));
                                    this.init();
                                    this.showNotification('名称已更新', true);
                                }
                            }
                            this.editDialog = null;
                        } else if (key.length === 1 && this.editDialog.inputValue.length < 12) {
                            this.editDialog.inputValue += key;
                        }
                    }
                }
            }

            let saveScene = new SaveScene();

            // ============ 场景4：世界场景（世界地图画卷） ============
            class WorldScene {
                constructor() {
                    this.worldWidth = W * 3; // 3倍屏幕宽
                    this.cameraX = 0; // 初始相机位置
                    this.targetCameraX = this.cameraX;
                    this.cameraVelocity = 0;
                    this.isDragging = false;
                    this.dragStartX = 0;
                    this.dragStartCam = 0;
                    this.lastDragX = 0;
                    this.lastDragTime = 0;
                    this.dragHistory = [];
                    this.time = 0;
                    this.birds = [];
                    this.clouds = [];
                    this.waterSparkles = [];
                    this.volcanoSmoke = [];
                    this.hintText = null;
                    this.hintTimer = 0;
                    this.fadeOverlay = 0;
                    this.fadeTarget = 0;
                    this.fadeText = '';
                    this.fadeSubtext = '';
                    this.longPressTimer = 0;
                    this.longPressTarget = null;
                    this.compassOpen = false;
                    this.compassAlpha = 0;
                    this.transitionTimer = 0;
                    this.transitionState = null; // null | 'fading' | 'showing' | 'fadingOut'
                    this.transitionRegion = null;
                    this.brushStrokeParticles = [];
                    this.isBackButtonPressed = false;

                    // 奥拉星异空间区域入口定义 - 矩形节点式布局（优化均匀分布）
                    this.regions = [
                        { id: 'ice_zone',   name: '艾夕区',    desc: '冰雕林立，寒风凛冽', x: 0.25, y: 0.15, type: 'ice',     unlocked: true,  icon: 'snowflake', connections: ['sand_zone','wood_zone'] },
                        { id: 'sand_zone',  name: '索里德区',  desc: '沙漠与遗迹交错',      x: 0.65, y: 0.15, type: 'sand',    unlocked: true,  icon: 'pyramid',  connections: ['ice_zone','water_zone'] },
                        { id: 'wood_zone',  name: '思伍德区',  desc: '原始森林，树木参天',  x: 0.25, y: 0.32, type: 'wood',    unlocked: false, icon: 'pine_tree',connections: ['ice_zone','water_zone','fire_zone'] },
                        { id: 'water_zone', name: '沃尔特区',  desc: '水下都市，贝壳城堡',  x: 0.65, y: 0.32, type: 'water',   unlocked: false, icon: 'water_drop',connections: ['sand_zone','wood_zone','fire_zone'] },
                        { id: 'fire_zone',  name: '费尔区',    desc: '火山脚下，熔岩流淌',  x: 0.25, y: 0.49, type: 'fire',    unlocked: false, icon: 'flame',   connections: ['wood_zone','water_zone','machine_zone'] },
                        { id: 'machine_zone',name: '比特区',   desc: '机械废墟，数码之城',  x: 0.65, y: 0.49, type: 'machine', unlocked: false, icon: 'gear',    connections: ['fire_zone','sky_zone'] },
                        { id: 'sky_zone',   name: '海文花园',  desc: '浮空大陆，永恒之瀑',  x: 0.25, y: 0.66, type: 'flying',  unlocked: false, icon: 'cloud',   connections: ['machine_zone','thunder_zone'] },
                        { id: 'thunder_zone',name:'雷鸣大陆',  desc: '雷鸣回响，悬崖峭壁',  x: 0.65, y: 0.66, type: 'electric',unlocked: false, icon: 'lightning',connections: ['sky_zone','art_zone'] },
                        { id: 'art_zone',   name: '艺术之都',  desc: '艺术长廊，名画密屋',  x: 0.25, y: 0.81, type: 'normal',  unlocked: false, icon: 'palette', connections: ['thunder_zone','invent_zone'] },
                        { id: 'invent_zone',name: '发明岛',    desc: '发明中心，武器基地',  x: 0.65, y: 0.81, type: 'machine', unlocked: false, icon: 'wrench',  connections: ['art_zone','ancient_zone'] },
                        { id: 'ancient_zone',name:'上古神殿',  desc: '崩坏神殿，灵兽之宫',  x: 0.45, y: 0.94, type: 'ancient', unlocked: false, icon: 'temple',  connections: ['invent_zone'] },
                    ];
                    // 矩形节点尺寸
                    this.nodeWidth = Math.min(W * 0.28, 180);
                    this.nodeHeight = Math.min(H * 0.10, 55);

                    this.initBirds();
                    this.initClouds();
                    this.initWaterSparkles();
                    this.initVolcanoSmoke();
                    this.initTerrainElements();
                }

                initTerrainElements() {
                    this.forestTrees = [];
                    this.meadowGrass = [];
                    this.mountainPeaks = [];
                    this.mountainRocks = [];
                    this.lakeReeds = [];
                    this.coastShells = [];
                    
                    const treeSeed = seededRandom(42);
                    const forestStart = 0;
                    const forestEnd = W * 0.7;
                    const treeCount = Math.floor((forestEnd - forestStart) / 35);
                    for (let i = 0; i < treeCount; i++) {
                        this.forestTrees.push({
                            x: forestStart + treeSeed() * (forestEnd - forestStart),
                            yOffset: treeSeed() * 25,
                            height: 30 + treeSeed() * 50,
                            width: 10 + treeSeed() * 16,
                            colorIdx1: Math.floor(treeSeed() * 5),
                            colorIdx2: Math.floor(treeSeed() * 5),
                        });
                    }
                    
                    const grassSeed = seededRandom(88);
                    const meadowStart = W * 0.5;
                    const meadowEnd = W * 1.3;
                    for (let i = 0; i < 40; i++) {
                        this.meadowGrass.push({
                            x: meadowStart + grassSeed() * (meadowEnd - meadowStart),
                            yOffset: grassSeed() * 15,
                            height: 6 + grassSeed() * 14,
                            r: 80 + grassSeed() * 40,
                            g: 140 + grassSeed() * 50,
                            b: 50 + grassSeed() * 30,
                        });
                    }
                    
                    const peakSeed = seededRandom(156);
                    const mountainStart = W * 1.1;
                    const mountainEnd = W * 2.0;
                    for (let i = 0; i < 5; i++) {
                        this.mountainPeaks.push({
                            x: mountainStart + peakSeed() * (mountainEnd - mountainStart),
                            height: 60 + peakSeed() * 100,
                            width: 40 + peakSeed() * 60,
                        });
                    }
                    
                    const rockSeed = seededRandom(157);
                    const rockCount = Math.floor((mountainEnd - mountainStart) / 50);
                    for (let i = 0; i < rockCount; i++) {
                        this.mountainRocks.push({
                            x: mountainStart + rockSeed() * (mountainEnd - mountainStart),
                            yOffset: rockSeed() * 30,
                            size: 8 + rockSeed() * 20,
                            shade: rockSeed(),
                        });
                    }
                    
                    const reedSeed = seededRandom(201);
                    const lakeStart = W * 1.7;
                    const lakeEnd = W * 2.5;
                    for (let i = 0; i < 25; i++) {
                        this.lakeReeds.push({
                            x: lakeStart + reedSeed() * (lakeEnd - lakeStart),
                            yOffset: reedSeed() * 20,
                            height: 15 + reedSeed() * 25,
                        });
                    }
                    
                    const shellSeed = seededRandom(333);
                    const coastStart = W * 2.3;
                    const coastEnd = W * 3.0;
                    for (let i = 0; i < 15; i++) {
                        this.coastShells.push({
                            x: coastStart + shellSeed() * (coastEnd - coastStart),
                            yOffset: shellSeed() * 15,
                            size: 4 + shellSeed() * 8,
                            type: Math.floor(shellSeed() * 3),
                        });
                    }
                }

                initBirds() {
                    this.birds = [];
                    const birdSeed = seededRandom(77);
                    for (let i = 0; i < 8; i++) {
                        this.birds.push({
                            x: birdSeed() * this.worldWidth,
                            y: H * 0.1 + birdSeed() * H * 0.2,
                            vx: (birdSeed() - 0.5) * 40 + 15,
                            wingPhase: birdSeed() * Math.PI * 2,
                            wingSpeed: birdSeed() * 3 + 2,
                            size: birdSeed() * 3 + 2,
                        });
                    }
                }

                initClouds() {
                    this.clouds = [];
                    const cloudSeed = seededRandom(199);
                    for (let i = 0; i < 10; i++) {
                        this.clouds.push({
                            x: cloudSeed() * this.worldWidth,
                            y: H * 0.05 + cloudSeed() * H * 0.2,
                            width: cloudSeed() * 120 + 60,
                            height: cloudSeed() * 25 + 15,
                            speed: cloudSeed() * 8 + 3,
                            alpha: cloudSeed() * 0.3 + 0.25,
                        });
                    }
                }

                initWaterSparkles() {
                    this.waterSparkles = [];
                    const wsSeed = seededRandom(313);
                    for (let i = 0; i < 30; i++) {
                        this.waterSparkles.push({
                            x: W * 1.85 + wsSeed() * W * 0.45,
                            y: H * 0.5 + wsSeed() * H * 0.2,
                            phase: wsSeed() * Math.PI * 2,
                            speed: wsSeed() * 2 + 1,
                            size: wsSeed() * 2 + 1,
                        });
                    }
                }

                initVolcanoSmoke() {
                    this.volcanoSmoke = [];
                }

                recalcDimensions() {
                    const oldWorldWidth = this.worldWidth;
                    this.worldWidth = W * 3;
                    const ratio = this.worldWidth / oldWorldWidth;
                    this.cameraX *= ratio;
                    this.targetCameraX = this.cameraX;
                    // regions现在使用相对坐标(0-1)，不需要缩放
                    // 重新计算节点尺寸
                    this.nodeWidth = Math.min(W * 0.28, 180);
                    this.nodeHeight = Math.min(H * 0.10, 55);
                    for (const b of this.birds) {
                        b.x *= ratio;
                    }
                    for (const c of this.clouds) {
                        c.x *= ratio;
                    }
                    for (const ws of this.waterSparkles) {
                        ws.x = W * 1.85 + (ws.x - W * 1.85) * ratio;
                    }
                    for (const t of this.forestTrees) {
                        t.x *= ratio;
                    }
                    for (const g of this.meadowGrass) {
                        g.x *= ratio;
                    }
                    for (const p of this.mountainPeaks) {
                        p.x *= ratio;
                    }
                    for (const r of this.mountainRocks) {
                        r.x *= ratio;
                    }
                    for (const r of this.lakeReeds) {
                        r.x *= ratio;
                    }
                    for (const s of this.coastShells) {
                        s.x *= ratio;
                    }
                }

                getProgress() {
                    const unlockedRegions = this.regions
                        .filter(r => r.unlocked)
                        .map(r => r.id);
                    return {
                        unlockedRegions,
                        areaStates: {}
                    };
                }

                init() {
                    this.time = 0;
                    this.cameraX = 0;
                    this.targetCameraX = this.cameraX;
                    this.cameraVelocity = 0;
                    this.isDragging = false;
                    this.hintText = null;
                    this.hintTimer = 0;
                    this.fadeOverlay = 0;
                    this.fadeTarget = 0;
                    this.fadeText = '';
                    this.fadeSubtext = '';
                    this.longPressTimer = 0;
                    this.longPressTarget = null;
                    this.compassOpen = false;
                    this.compassAlpha = 0;
                    this.transitionTimer = 0;
                    this.transitionState = null;
                    this.transitionRegion = null;
                    this.brushStrokeParticles = [];
                    this.initBirds();
                    this.initClouds();
                    this.initWaterSparkles();
                    this.initVolcanoSmoke();
                    this.recalcDimensions();
                    // 初始环境描述
                    this.showHint('拖动画面探索世界，发现区域入口', 3.5);
                }

                showHint(text, duration = 2.5) {
                    this.hintText = text;
                    this.hintTimer = duration;
                }

                getCameraBounds() {
                    const minX = 0;
                    const maxX = Math.max(0, this.worldWidth - W);
                    return { minX, maxX };
                }

                update(dt) {
                    this.time += dt;

                    // 相机物理
                    const bounds = this.getCameraBounds();
                    if (!this.isDragging) {
                        // 惯性
                        this.cameraVelocity *= Math.pow(0.03, dt);
                        if (Math.abs(this.cameraVelocity) < 0.5) this.cameraVelocity = 0;
                        this.targetCameraX += this.cameraVelocity * dt;

                        // 边界回弹
                        if (this.targetCameraX < bounds.minX) {
                            this.targetCameraX = lerp(this.targetCameraX, bounds.minX, dt * 8);
                            this.cameraVelocity *= 0.5;
                        }
                        if (this.targetCameraX > bounds.maxX) {
                            this.targetCameraX = lerp(this.targetCameraX, bounds.maxX, dt * 8);
                            this.cameraVelocity *= 0.5;
                        }
                        this.targetCameraX = clamp(this.targetCameraX, bounds.minX - 5, bounds.maxX + 5);
                    }

                    if (this.isDragging) {
                        this.cameraX = this.targetCameraX;
                    } else {
                        this.cameraX = lerp(this.cameraX, this.targetCameraX, dt * 12);
                    }
                    this.cameraX = clamp(this.cameraX, bounds.minX - 3, bounds.maxX + 3);

                    // 飞鸟更新
                    for (const bird of this.birds) {
                        bird.x += bird.vx * dt;
                        if (bird.x > this.worldWidth + 50) bird.x = -50;
                        if (bird.x < -50) bird.x = this.worldWidth + 50;
                    }

                    // 云更新
                    for (const cloud of this.clouds) {
                        cloud.x += cloud.speed * dt;
                        if (cloud.x > this.worldWidth + 150) cloud.x = -150;
                        if (cloud.x < -150) cloud.x = this.worldWidth + 150;
                    }

                    // 火山烟雾
                    const volcanoRegion = this.regions.find(r => r.id === 'volcano_peak');
                    if (volcanoRegion && Math.random() < 1.2 * dt && this.volcanoSmoke.length < 15) {
                        this.volcanoSmoke.push({
                            x: volcanoRegion.x + (Math.random() - 0.5) * 40,
                            y: volcanoRegion.y - 30 - Math.random() * 20,
                            vy: -15 - Math.random() * 25,
                            life: 1.5 + Math.random() * 2,
                            maxLife: 1.5 + Math.random() * 2,
                            size: 3 + Math.random() * 6,
                        });
                    }
                    for (let i = this.volcanoSmoke.length - 1; i >= 0; i--) {
                        const sm = this.volcanoSmoke[i];
                        sm.y += sm.vy * dt;
                        sm.life -= dt;
                        if (sm.life <= 0) this.volcanoSmoke.splice(i, 1);
                    }

                    // 奥拉星异空间 - 等级解锁检查
                    this.checkRegionUnlock();

                    // 提示计时器
                    if (this.hintTimer > 0) {
                        this.hintTimer -= dt;
                        if (this.hintTimer <= 0) this.hintText = null;
                    }

                    // 过渡状态
                    if (this.transitionState === 'fading') {
                        this.fadeTarget = 1;
                        this.fadeOverlay = lerp(this.fadeOverlay, this.fadeTarget, dt * 6);
                        if (this.fadeOverlay > 0.9) {
                            this.transitionState = null;
                            this.fadeOverlay = 0;
                            this.fadeTarget = 0;
                            const region = this.transitionRegion;
                            this.transitionRegion = null;
                            if (region && region.unlocked) {
                                areaScene.init(region.id);
                            } else if (region && !region.unlocked) {
                                this.showHint('🔒 区域未解锁', 3);
                            } else {
                                this.showHint('⚠️ region为空', 3);
                            }
                        }
                    } else {
                        this.fadeOverlay = lerp(this.fadeOverlay, this.fadeTarget, dt * 5);
                    }

                    // 罗盘alpha
                    this.compassAlpha = lerp(this.compassAlpha, this.compassOpen ? 1 : 0, dt * 8);
                }

                isRegionVisible(region) {
                    const sx = region.x - this.cameraX;
                    return sx > -80 && sx < W + 80;
                }

                drawSky(ctx) {
                    const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
                    skyGrad.addColorStop(0, '#2a2040');
                    skyGrad.addColorStop(0.3, '#3a3058');
                    skyGrad.addColorStop(0.55, '#4a3a5a');
                    skyGrad.addColorStop(0.75, '#5a4a50');
                    skyGrad.addColorStop(1, '#3a4038');
                    ctx.fillStyle = skyGrad;
                    ctx.fillRect(0, 0, W, H);

                    // 柔和的天空光晕（模拟黄昏/黎明）
                    const glowGrad = ctx.createRadialGradient(W * 0.6, H * 0.15, 0, W * 0.6, H * 0.15, W * 1.2);
                    glowGrad.addColorStop(0, 'rgba(255,180,120,0.12)');
                    glowGrad.addColorStop(0.5, 'rgba(200,140,100,0.04)');
                    glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = glowGrad;
                    ctx.fillRect(0, 0, W, H);
                }

                drawClouds(ctx) {
                    for (const cloud of this.clouds) {
                        const sx = cloud.x - this.cameraX;
                        if (sx < -cloud.width || sx > W + cloud.width) continue;
                        ctx.fillStyle = `rgba(200,190,210,${cloud.alpha})`;
                        const cy = cloud.y;
                        const cw = cloud.width;
                        const ch = cloud.height;
                        ctx.beginPath();
                        ctx.ellipse(sx, cy, cw * 0.5, ch, 0, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.beginPath();
                        ctx.ellipse(sx - cw * 0.25, cy + ch * 0.2, cw * 0.35, ch * 0.7, -0.3, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.beginPath();
                        ctx.ellipse(sx + cw * 0.3, cy + ch * 0.1, cw * 0.3, ch * 0.75, 0.2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }

                drawDistantMountains(ctx) {
                    // 远山
                    const baseY = H * 0.52;
                    ctx.fillStyle = '#2a2840';
                    ctx.beginPath();
                    ctx.moveTo(-10, H);
                    for (let x = -10; x <= W + 10; x += 3) {
                        const wx = x + this.cameraX;
                        const h = baseY - Math.sin(wx * 0.0004) * H * 0.1 - Math.sin(wx * 0.0011 + 1.5) * H * 0.08 -
                            Math.sin(wx * 0.0025 + 3) * H * 0.04;
                        ctx.lineTo(x, h);
                    }
                    ctx.lineTo(W + 10, H);
                    ctx.closePath();
                    ctx.fill();

                    // 略近的山
                    ctx.fillStyle = '#1f1d33';
                    ctx.beginPath();
                    ctx.moveTo(-10, H);
                    for (let x = -10; x <= W + 10; x += 3) {
                        const wx = x + this.cameraX;
                        const h = baseY + H * 0.04 - Math.sin(wx * 0.0006 + 1) * H * 0.13 - Math.sin(wx * 0.0015 + 2.5) * H *
                            0.07;
                        ctx.lineTo(x, h);
                    }
                    ctx.lineTo(W + 10, H);
                    ctx.closePath();
                    ctx.fill();
                }

                drawTerrain(ctx) {
                    const baseY = H * 0.55;
                    
                    this.drawGroundBase(ctx, 0, W * 3, baseY);
                    this.drawForestRegion(ctx, 0, W * 0.7, baseY);
                    this.drawMeadowRegion(ctx, W * 0.5, W * 1.3, baseY);
                    this.drawMountainRegion(ctx, W * 1.1, W * 2.0, baseY);
                    this.drawLakeRegion(ctx, W * 1.7, W * 2.5, baseY);
                    this.drawCoastRegion(ctx, W * 2.3, W * 3.0, baseY);
                }

                getGroundHeight(worldX, baseY) {
                    return baseY + Math.sin(worldX * 0.003) * 8 + Math.cos(worldX * 0.007) * 5;
                }

                drawGroundBase(ctx, startX, endX, baseY) {
                    const sx0 = startX - this.cameraX;
                    const sx1 = endX - this.cameraX;
                    
                    ctx.fillStyle = '#1a2a18';
                    ctx.beginPath();
                    ctx.moveTo(Math.max(-10, sx0), H);
                    for (let x = Math.max(-10, sx0); x <= Math.min(W + 10, sx1); x += 4) {
                        const wx = x + this.cameraX;
                        const h = this.getGroundHeight(wx, baseY);
                        ctx.lineTo(x, h);
                    }
                    ctx.lineTo(Math.min(W + 10, sx1), H);
                    ctx.closePath();
                    ctx.fill();
                }

                drawForestRegion(ctx, startX, endX, baseY) {
                    const sx0 = startX - this.cameraX;
                    const sx1 = endX - this.cameraX;
                    if (sx1 < -50 || sx0 > W + 50) return;

                    const crownColors = ['#1a3520', '#1d3a22', '#153018', '#1f4025', '#1a3020'];
                    for (const tree of this.forestTrees) {
                        const sx = tree.x - this.cameraX;
                        if (sx < -40 || sx > W + 40) continue;
                        const ty = baseY - tree.yOffset;
                        const th = tree.height;
                        const tw = tree.width;

                        ctx.fillStyle = '#1a1210';
                        ctx.fillRect(sx - tw * 0.12, ty, tw * 0.24, th * 0.45);

                        ctx.fillStyle = crownColors[tree.colorIdx1];
                        ctx.beginPath();
                        ctx.moveTo(sx, ty - th * 0.5);
                        ctx.lineTo(sx - tw * 0.55, ty + th * 0.2);
                        ctx.lineTo(sx + tw * 0.55, ty + th * 0.2);
                        ctx.closePath();
                        ctx.fill();
                        
                        ctx.fillStyle = crownColors[tree.colorIdx2];
                        ctx.beginPath();
                        ctx.moveTo(sx, ty - th * 0.35);
                        ctx.lineTo(sx - tw * 0.45, ty + th * 0.1);
                        ctx.lineTo(sx + tw * 0.45, ty + th * 0.1);
                        ctx.closePath();
                        ctx.fill();
                    }
                }

                drawMeadowRegion(ctx, startX, endX, baseY) {
                    const sx0 = startX - this.cameraX;
                    const sx1 = endX - this.cameraX;
                    if (sx1 < -50 || sx0 > W + 50) return;

                    for (const grass of this.meadowGrass) {
                        const sx = grass.x - this.cameraX;
                        if (sx < -20 || sx > W + 20) continue;
                        const gy = baseY - grass.yOffset;
                        const gh = grass.height;
                        ctx.strokeStyle = `rgba(${grass.r},${grass.g},${grass.b},0.7)`;
                        ctx.lineWidth = 1.2;
                        ctx.beginPath();
                        ctx.moveTo(sx, gy);
                        ctx.quadraticCurveTo(sx - 3, gy - gh * 0.6, sx - 2, gy - gh);
                        ctx.stroke();
                        ctx.beginPath();
                        ctx.moveTo(sx, gy);
                        ctx.quadraticCurveTo(sx + 3, gy - gh * 0.6, sx + 2, gy - gh);
                        ctx.stroke();
                    }
                }

                drawMountainRegion(ctx, startX, endX, baseY) {
                    const sx0 = startX - this.cameraX;
                    const sx1 = endX - this.cameraX;
                    if (sx1 < -80 || sx0 > W + 80) return;

                    for (const peak of this.mountainPeaks) {
                        const sx = peak.x - this.cameraX;
                        if (sx < -120 || sx > W + 120) continue;
                        const ph = peak.height;
                        const pw = peak.width;
                        const py = baseY - ph;

                        const peakGrad = ctx.createLinearGradient(0, py, 0, baseY);
                        peakGrad.addColorStop(0, '#3a3540');
                        peakGrad.addColorStop(0.4, '#2a2530');
                        peakGrad.addColorStop(1, '#1f1c22');
                        ctx.fillStyle = peakGrad;
                        ctx.beginPath();
                        ctx.moveTo(sx, py);
                        ctx.lineTo(sx - pw, baseY + 10);
                        ctx.lineTo(sx + pw, baseY + 10);
                        ctx.closePath();
                        ctx.fill();

                        if (ph > 100) {
                            ctx.fillStyle = 'rgba(220,215,225,0.5)';
                            ctx.beginPath();
                            ctx.moveTo(sx, py);
                            ctx.lineTo(sx - pw * 0.25, py + ph * 0.2);
                            ctx.lineTo(sx + pw * 0.25, py + ph * 0.2);
                            ctx.closePath();
                            ctx.fill();
                        }
                    }
                }

                drawLakeRegion(ctx, startX, endX, baseY) {
                    const sx0 = startX - this.cameraX;
                    const sx1 = endX - this.cameraX;
                    if (sx1 < -60 || sx0 > W + 60) return;

                    const lakeCx = (startX + endX) / 2 - this.cameraX;
                    const lakeCy = baseY + 20;
                    const lakeRx = (endX - startX) * 0.38;
                    const lakeRy = Math.min(H - lakeCy - 30, 90);

                    const lakeGrad = ctx.createLinearGradient(0, lakeCy - lakeRy, 0, lakeCy + lakeRy);
                    lakeGrad.addColorStop(0, 'rgba(40,80,100,0.7)');
                    lakeGrad.addColorStop(0.5, 'rgba(30,60,80,0.8)');
                    lakeGrad.addColorStop(1, 'rgba(20,40,55,0.7)');
                    ctx.fillStyle = lakeGrad;
                    ctx.beginPath();
                    ctx.ellipse(lakeCx, lakeCy, lakeRx, lakeRy, 0, 0, Math.PI * 2);
                    ctx.fill();

                    // 波光
                    for (const ws of this.waterSparkles) {
                        const sx = ws.x - this.cameraX;
                        if (sx < lakeCx - lakeRx || sx > lakeCx + lakeRx) continue;
                        const relX = (sx - lakeCx) / lakeRx;
                        if (Math.abs(relX) > 0.85) continue;
                        const maxYOffset = lakeRy * Math.sqrt(1 - relX * relX);
                        const sy = lakeCy + (Math.sin(ws.phase + this.time * ws.speed) * maxYOffset * 0.7);
                        const sparkleAlpha = 0.3 + 0.5 * Math.abs(Math.sin(this.time * ws.speed + ws.phase));
                        ctx.fillStyle = `rgba(180,210,230,${sparkleAlpha})`;
                        ctx.fillRect(sx - ws.size / 2, sy - 0.5, ws.size, 1.5);
                    }

                    // 湖边雾气
                    const mistGrad = ctx.createRadialGradient(lakeCx, lakeCy - lakeRy * 0.3, lakeRx * 0.2, lakeCx, lakeCy,
                        lakeRx * 1.2);
                    mistGrad.addColorStop(0, 'rgba(200,210,215,0.15)');
                    mistGrad.addColorStop(1, 'rgba(180,190,200,0)');
                    ctx.fillStyle = mistGrad;
                    ctx.beginPath();
                    ctx.ellipse(lakeCx, lakeCy - lakeRy * 0.3, lakeRx * 1.2, lakeRy * 0.8, 0, 0, Math.PI * 2);
                    ctx.fill();
                }

                drawCoastRegion(ctx, startX, endX, baseY) {
                    const sx0 = startX - this.cameraX;
                    const sx1 = endX - this.cameraX;
                    if (sx1 < -50 || sx0 > W + 50) return;

                    const sandGrad = ctx.createLinearGradient(0, baseY, 0, baseY + 40);
                    sandGrad.addColorStop(0, '#c8b898');
                    sandGrad.addColorStop(1, '#a89878');
                    ctx.fillStyle = sandGrad;
                    ctx.beginPath();
                    ctx.moveTo(Math.max(-10, sx0), baseY);
                    for (let x = Math.max(-10, sx0); x <= Math.min(W + 10, sx1); x += 4) {
                        const wx = x + this.cameraX;
                        const h = this.getGroundHeight(wx, baseY);
                        ctx.lineTo(x, h);
                    }
                    ctx.lineTo(Math.min(W + 10, sx1), baseY + 35);
                    ctx.lineTo(Math.max(-10, sx0), baseY + 35);
                    ctx.closePath();
                    ctx.fill();

                    const oceanGrad = ctx.createLinearGradient(0, baseY + 30, 0, H);
                    oceanGrad.addColorStop(0, '#3a6070');
                    oceanGrad.addColorStop(0.5, '#2a4858');
                    oceanGrad.addColorStop(1, '#1a3040');
                    ctx.fillStyle = oceanGrad;
                    ctx.fillRect(Math.max(0, sx0), baseY + 30, Math.min(W, sx1) - Math.max(0, sx0), H - baseY - 30);

                    ctx.strokeStyle = 'rgba(180,210,220,0.4)';
                    ctx.lineWidth = 1;
                    for (let wy = baseY + 30; wy < H; wy += 25) {
                        ctx.beginPath();
                        for (let x = Math.max(0, sx0); x <= Math.min(W, sx1); x += 6) {
                            const wx = x + this.cameraX;
                            const sy = wy + Math.sin(wx * 0.01 + this.time * 0.5) * 4;
                            if (x === Math.max(0, sx0)) ctx.moveTo(x, sy);
                            else ctx.lineTo(x, sy);
                        }
                        ctx.stroke();
                    }
                }

                drawRegionEntrances(ctx) {
                    const nw = this.nodeWidth;
                    const nh = this.nodeHeight;
                    // 先绘制所有连线
                    const drawnConnections = new Set();
                    for (const region of this.regions) {
                        if (!region.connections) continue;
                        const x1 = region.x * W;
                        const y1 = region.y * H;
                        for (const connId of region.connections) {
                            const connKey = [region.id, connId].sort().join('-');
                            if (drawnConnections.has(connKey)) continue;
                            drawnConnections.add(connKey);
                            const target = this.regions.find(r => r.id === connId);
                            if (target) {
                                const x2 = target.x * W;
                                const y2 = target.y * H;
                                this.drawConnectionLine(ctx, x1, y1, x2, y2, region.unlocked && target.unlocked);
                            }
                        }
                    }
                    // 再绘制所有矩形节点
                    for (const region of this.regions) {
                        const sx = region.x * W;
                        const sy = region.y * H;
                        if (region.unlocked) {
                            this.drawUnlockedNode(ctx, region, sx, sy, nw, nh);
                        } else {
                            this.drawLockedNode(ctx, region, sx, sy, nw, nh);
                        }
                    }
                }

                drawConnectionLine(ctx, x1, y1, x2, y2, bothUnlocked) {
                    ctx.save();
                    ctx.strokeStyle = bothUnlocked ? 'rgba(100,180,255,0.5)' : 'rgba(80,70,90,0.35)';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(x1, y1 + this.nodeHeight / 2);
                    // 贝塞尔曲线让连线更自然
                    const midY = (y1 + y2) / 2 + this.nodeHeight / 2;
                    ctx.quadraticCurveTo((x1 + x2) / 2, midY, x2, y2 - this.nodeHeight / 2);
                    ctx.stroke();
                    // 箭头
                    const angle = Math.atan2(y2 - y1, x2 - x1);
                    const arrowSize = 6;
                    const ax = x2 - Math.cos(angle) * (this.nodeWidth / 2 + 5);
                    const ay = y2 - this.nodeHeight / 2 - Math.sin(angle) * 5;
                    ctx.fillStyle = bothUnlocked ? 'rgba(100,180,255,0.6)' : 'rgba(80,70,90,0.4)';
                    ctx.beginPath();
                    ctx.moveTo(ax, ay);
                    ctx.lineTo(ax - arrowSize * Math.cos(angle - 0.4), ay - arrowSize * Math.sin(angle - 0.4));
                    ctx.lineTo(ax - arrowSize * Math.cos(angle + 0.4), ay - arrowSize * Math.sin(angle + 0.4));
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                }

                drawUnlockedNode(ctx, region, cx, cy, w, h) {
                    const x = cx - w / 2;
                    const y = cy - h / 2;
                    const pulse = 0.6 + 0.4 * Math.sin(this.time * 2.5 + region.x * 10);
                    const radius = 8;
                    // 外发光
                    ctx.save();
                    ctx.shadowColor = 'rgba(80,160,255,0.8)';
                    ctx.shadowBlur = 18 + pulse * 12;
                    ctx.strokeStyle = `rgba(100,190,255,${0.7 + pulse * 0.3})`;
                    ctx.lineWidth = 2.5;
                    this.roundRect(ctx, x, y, w, h, radius);
                    ctx.stroke();
                    ctx.restore();
                    // 内部填充
                    ctx.fillStyle = 'rgba(20,25,40,0.75)';
                    this.roundRect(ctx, x, y, w, h, radius);
                    ctx.fill();
                    // 边框
                    ctx.strokeStyle = `rgba(100,190,255,${0.6 + pulse * 0.4})`;
                    ctx.lineWidth = 2;
                    this.roundRect(ctx, x, y, w, h, radius);
                    ctx.stroke();
                    // 文字
                    ctx.fillStyle = '#e0e8f0';
                    ctx.font = `bold ${Math.min(h * 0.48, 22)}px "STKaiti","KaiTi","Microsoft YaHei",sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(region.name, cx, cy);
                }

                drawLockedNode(ctx, region, cx, cy, w, h) {
                    const x = cx - w / 2;
                    const y = cy - h / 2;
                    const radius = 8;
                    // 灰色边框
                    ctx.strokeStyle = 'rgba(70,65,80,0.6)';
                    ctx.lineWidth = 1.5;
                    this.roundRect(ctx, x, y, w, h, radius);
                    ctx.stroke();
                    // 暗色填充
                    ctx.fillStyle = 'rgba(15,13,25,0.7)';
                    this.roundRect(ctx, x, y, w, h, radius);
                    ctx.fill();
                    // 文字（灰色）
                    ctx.fillStyle = 'rgba(120,115,130,0.7)';
                    ctx.font = `bold ${Math.min(h * 0.48, 22)}px "STKaiti","KaiTi","Microsoft YaHei",sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(region.name, cx, cy);
                    // 锁图标
                    const lockX = x + w - 18;
                    const lockY = y + h - 14;
                    ctx.fillStyle = 'rgba(180,175,190,0.8)';
                    ctx.beginPath();
                    ctx.arc(lockX, lockY, 8, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = 'rgba(30,28,40,0.9)';
                    ctx.fillRect(lockX - 5, lockY + 1, 10, 8);
                    // 锁孔
                    ctx.fillStyle = 'rgba(50,45,60,0.9)';
                    ctx.beginPath();
                    ctx.arc(lockX, lockY + 3, 2, 0, Math.PI * 2);
                    ctx.fill();
                }

                roundRect(ctx, x, y, w, h, r) {
                    ctx.beginPath();
                    ctx.moveTo(x + r, y);
                    ctx.lineTo(x + w - r, y);
                    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
                    ctx.lineTo(x + w, y + h - r);
                    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
                    ctx.lineTo(x + r, y + h);
                    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
                    ctx.lineTo(x, y + r);
                    ctx.quadraticCurveTo(x, y, x + r, y);
                    ctx.closePath();
                }

                // 检查区域解锁条件
                checkRegionUnlock() {
                    if (!window.petManager || !gs.petManager.team || gs.petManager.team.length === 0) return;

                    let maxLevel = 1;
                    for (const pet of gs.petManager.team) {
                        if (pet.level > maxLevel) maxLevel = pet.level;
                    }

                    const unlockConditions = {
                        wood_zone:    { level: 15 },
                        water_zone:   { level: 20 },
                        fire_zone:    { level: 28 },
                        machine_zone: { level: 35 },
                        sky_zone:     { level: 45 },
                        thunder_zone: { level: 52 },
                        art_zone:     { level: 60 },
                        invent_zone:  { level: 70 },
                        ancient_zone: { level: 80 },
                    };

                    for (const region of this.regions) {
                        if (!region.unlocked && unlockConditions[region.id]) {
                            if (maxLevel >= unlockConditions[region.id].level) {
                                region.unlocked = true;
                                this.showHint(`${region.name}已经可以探索了！`, 4);
                            }
                        }
                    }
                }

                drawUnlockedEntrance(ctx, region, sx) {
                    const sy = region.y;
                    const pulse = 0.6 + 0.4 * Math.sin(this.time * 2.5 + region.x * 0.01);

                    // 光晕
                    const glowGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 55);
                    let glowColor;
                    switch (region.type) {
                        case 'ice':
                            glowColor = `rgba(150,220,255,${0.25*pulse})`;
                            break;
                        case 'sand':
                            glowColor = `rgba(230,200,120,${0.25*pulse})`;
                            break;
                        case 'wood':
                            glowColor = `rgba(100,180,80,${0.25*pulse})`;
                            break;
                        case 'water':
                            glowColor = `rgba(100,180,255,${0.25*pulse})`;
                            break;
                        case 'fire':
                            glowColor = `rgba(255,140,50,${0.25*pulse})`;
                            break;
                        case 'machine':
                            glowColor = `rgba(180,140,255,${0.25*pulse})`;
                            break;
                        case 'flying':
                            glowColor = `rgba(255,220,150,${0.25*pulse})`;
                            break;
                        case 'electric':
                            glowColor = `rgba(255,255,100,${0.3*pulse})`;
                            break;
                        case 'normal':
                            glowColor = `rgba(200,200,200,${0.2*pulse})`;
                            break;
                        case 'ancient':
                            glowColor = `rgba(200,150,100,${0.25*pulse})`;
                            break;
                        default:
                            glowColor = `rgba(200,200,180,${0.2*pulse})`;
                    }
                    glowGrad.addColorStop(0, glowColor);
                    glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = glowGrad;
                    ctx.beginPath();
                    ctx.arc(sx, sy, 55, 0, Math.PI * 2);
                    ctx.fill();

                    // 入口标记
                    switch (region.icon) {
                        case 'snowflake':
                            this.drawSnowflakeIcon(ctx, sx, sy, pulse);
                            break;
                        case 'pyramid':
                            this.drawPyramidIcon(ctx, sx, sy, pulse);
                            break;
                        case 'pine_tree':
                            this.drawPineTreeIcon(ctx, sx, sy, pulse);
                            break;
                        case 'water_drop':
                            this.drawWaterDropIcon(ctx, sx, sy, pulse);
                            break;
                        case 'flame':
                            this.drawFlameIcon(ctx, sx, sy, pulse);
                            break;
                        case 'gear':
                            this.drawGearIcon(ctx, sx, sy, pulse);
                            break;
                        case 'cloud':
                            this.drawCloudIcon(ctx, sx, sy, pulse);
                            break;
                        case 'lightning':
                            this.drawLightningIcon(ctx, sx, sy, pulse);
                            break;
                        case 'palette':
                            this.drawPaletteIcon(ctx, sx, sy, pulse);
                            break;
                        case 'wrench':
                            this.drawWrenchIcon(ctx, sx, sy, pulse);
                            break;
                        case 'temple':
                            this.drawTempleIcon(ctx, sx, sy, pulse);
                            break;
                        default:
                            this.drawDefaultIcon(ctx, sx, sy, pulse);
                    }
                }

                drawLockedEntrance(ctx, region, sx) {
                    const sy = region.y;
                    // 灰暗覆盖
                    ctx.fillStyle = 'rgba(40,35,45,0.5)';
                    ctx.beginPath();
                    ctx.arc(sx, sy, 40, 0, Math.PI * 2);
                    ctx.fill();

                    // 荆棘/藤蔓
                    ctx.strokeStyle = 'rgba(60,50,40,0.7)';
                    ctx.lineWidth = 2;
                    const thornSeed = seededRandom(region.x);
                    for (let i = 0; i < 4; i++) {
                        ctx.beginPath();
                        const startAngle = thornSeed() * Math.PI * 2;
                        const endAngle = startAngle + thornSeed() * 1.5 + 0.5;
                        const r = 28 + thornSeed() * 18;
                        ctx.arc(sx, sy, r, startAngle, endAngle);
                        ctx.stroke();
                        // 小刺
                        const midAngle = (startAngle + endAngle) / 2;
                        const mx = sx + Math.cos(midAngle) * r;
                        const my = sy + Math.sin(midAngle) * r;
                        ctx.beginPath();
                        ctx.moveTo(mx, my);
                        ctx.lineTo(mx + Math.cos(midAngle + 0.5) * 8, my + Math.sin(midAngle + 0.5) * 8);
                        ctx.stroke();
                    }

                    // 中心问号或雾气
                    const mistGrad = ctx.createRadialGradient(sx, sy, 5, sx, sy, 22);
                    mistGrad.addColorStop(0, 'rgba(180,170,190,0.6)');
                    mistGrad.addColorStop(1, 'rgba(150,140,160,0)');
                    ctx.fillStyle = mistGrad;
                    ctx.beginPath();
                    ctx.arc(sx, sy, 22, 0, Math.PI * 2);
                    ctx.fill();
                }

                drawGlowTrees(ctx, sx, sy, pulse) {
                    // 小树图标
                    ctx.fillStyle = `rgba(100,180,80,${0.7*pulse+0.3})`;
                    ctx.beginPath();
                    ctx.moveTo(sx, sy - 22);
                    ctx.lineTo(sx - 12, sy + 2);
                    ctx.lineTo(sx + 12, sy + 2);
                    ctx.closePath();
                    ctx.fill();
                    ctx.fillStyle = `rgba(70,130,50,0.8)`;
                    ctx.fillRect(sx - 2, sy + 2, 4, 10);
                }

                drawGlowGrass(ctx, sx, sy, pulse) {
                    // 发光草簇
                    for (let i = -2; i <= 2; i++) {
                        const gx = sx + i * 8;
                        const gh = 8 + Math.abs(i) * 5;
                        ctx.strokeStyle = `rgba(220,200,80,${0.6*pulse+0.3})`;
                        ctx.lineWidth = 1.5;
                        ctx.beginPath();
                        ctx.moveTo(gx, sy);
                        ctx.quadraticCurveTo(gx - 2, sy - gh * 0.7, gx, sy - gh);
                        ctx.stroke();
                    }
                }

                drawRedGlow(ctx, sx, sy, pulse) {
                    const glowGrad = ctx.createRadialGradient(sx, sy - 15, 0, sx, sy - 15, 20);
                    glowGrad.addColorStop(0, `rgba(255,120,30,${0.7*pulse})`);
                    glowGrad.addColorStop(1, 'rgba(255,80,20,0)');
                    ctx.fillStyle = glowGrad;
                    ctx.beginPath();
                    ctx.arc(sx, sy - 15, 20, 0, Math.PI * 2);
                    ctx.fill();
                    // 小山峰
                    ctx.fillStyle = 'rgba(80,50,40,0.8)';
                    ctx.beginPath();
                    ctx.moveTo(sx, sy - 25);
                    ctx.lineTo(sx - 14, sy + 5);
                    ctx.lineTo(sx + 14, sy + 5);
                    ctx.closePath();
                    ctx.fill();
                }

                drawMistIcon(ctx, sx, sy, pulse) {
                    for (let i = 0; i < 5; i++) {
                        const mx = sx + (i - 2) * 10;
                        const my = sy + Math.sin(i * 1.2) * 5;
                        ctx.fillStyle = `rgba(190,200,210,${0.4*pulse+0.2})`;
                        ctx.beginPath();
                        ctx.arc(mx, my, 6 + Math.abs(i - 2) * 2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }

                drawWavesIcon(ctx, sx, sy, pulse) {
                    ctx.strokeStyle = `rgba(150,200,220,${0.5*pulse+0.3})`;
                    ctx.lineWidth = 2;
                    for (let i = 0; i < 3; i++) {
                        const wy = sy + i * 7 - 7;
                        ctx.beginPath();
                        ctx.moveTo(sx - 15, wy);
                        ctx.quadraticCurveTo(sx - 7, wy - 5, sx, wy);
                        ctx.quadraticCurveTo(sx + 7, wy + 5, sx + 15, wy);
                        ctx.stroke();
                    }
                }

                // ============ 奥拉星异空间图标绘制函数 ============

                drawSnowflakeIcon(ctx, sx, sy, pulse) {
                    ctx.strokeStyle = `rgba(180,230,255,${0.6*pulse+0.4})`;
                    ctx.lineWidth = 2;
                    for (let i = 0; i < 6; i++) {
                        const angle = (i * Math.PI) / 3;
                        ctx.beginPath();
                        ctx.moveTo(sx, sy);
                        ctx.lineTo(sx + Math.cos(angle) * 18, sy + Math.sin(angle) * 18);
                        ctx.stroke();
                        const bx = sx + Math.cos(angle) * 12;
                        const by = sy + Math.sin(angle) * 12;
                        ctx.beginPath();
                        ctx.arc(bx, by, 3, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                    ctx.fillStyle = `rgba(200,240,255,${0.4*pulse+0.3})`;
                    ctx.beginPath();
                    ctx.arc(sx, sy, 4, 0, Math.PI * 2);
                    ctx.fill();
                }

                drawPyramidIcon(ctx, sx, sy, pulse) {
                    ctx.fillStyle = `rgba(220,190,120,${0.6*pulse+0.3})`;
                    ctx.beginPath();
                    ctx.moveTo(sx, sy - 18);
                    ctx.lineTo(sx + 16, sy + 10);
                    ctx.lineTo(sx - 16, sy + 10);
                    ctx.closePath();
                    ctx.fill();
                    ctx.strokeStyle = `rgba(180,150,80,${0.5*pulse+0.3})`;
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(sx, sy - 18);
                    ctx.lineTo(sx, sy + 10);
                    ctx.stroke();
                }

                drawPineTreeIcon(ctx, sx, sy, pulse) {
                    ctx.fillStyle = `rgba(80,160,60,${0.6*pulse+0.3})`;
                    ctx.beginPath();
                    ctx.moveTo(sx, sy - 20);
                    ctx.lineTo(sx + 14, sy + 8);
                    ctx.lineTo(sx - 14, sy + 8);
                    ctx.closePath();
                    ctx.fill();
                    ctx.fillStyle = `rgba(100,180,70,${0.5*pulse+0.3})`;
                    ctx.beginPath();
                    ctx.moveTo(sx, sy - 12);
                    ctx.lineTo(sx + 11, sy + 12);
                    ctx.lineTo(sx - 11, sy + 12);
                    ctx.closePath();
                    ctx.fill();
                    ctx.fillStyle = `rgba(120,80,40,${0.7*pulse+0.2})`;
                    ctx.fillRect(sx - 2, sy + 8, 4, 8);
                }

                drawWaterDropIcon(ctx, sx, sy, pulse) {
                    ctx.fillStyle = `rgba(100,180,255,${0.6*pulse+0.3})`;
                    ctx.beginPath();
                    ctx.moveTo(sx, sy - 18);
                    ctx.quadraticCurveTo(sx + 14, sy + 2, sx, sy + 16);
                    ctx.quadraticCurveTo(sx - 14, sy + 2, sx, sy - 18);
                    ctx.fill();
                    ctx.fillStyle = `rgba(200,230,255,${0.5*pulse+0.3})`;
                    ctx.beginPath();
                    ctx.arc(sx, sy + 6, 4, 0, Math.PI * 2);
                    ctx.fill();
                }

                drawFlameIcon(ctx, sx, sy, pulse) {
                    const flameHue = 20 + Math.sin(this.time * 3) * 10;
                    ctx.fillStyle = `hsla(${flameHue},100%,55%,${0.7*pulse+0.2})`;
                    ctx.beginPath();
                    ctx.moveTo(sx, sy - 20);
                    ctx.quadraticCurveTo(sx + 12, sy - 5, sx + 8, sy + 10);
                    ctx.quadraticCurveTo(sx, sy + 2, sx - 8, sy + 10);
                    ctx.quadraticCurveTo(sx - 12, sy - 5, sx, sy - 20);
                    ctx.fill();
                    ctx.fillStyle = `hsla(45,100%,70%,${0.6*pulse+0.3})`;
                    ctx.beginPath();
                    ctx.moveTo(sx, sy - 14);
                    ctx.quadraticCurveTo(sx + 6, sy - 2, sx + 4, sy + 6);
                    ctx.quadraticCurveTo(sx, sy, sx - 4, sy + 6);
                    ctx.quadraticCurveTo(sx - 6, sy - 2, sx, sy - 14);
                    ctx.fill();
                }

                drawGearIcon(ctx, sx, sy, pulse) {
                    ctx.strokeStyle = `rgba(180,150,255,${0.6*pulse+0.3})`;
                    ctx.lineWidth = 2.5;
                    const teeth = 8;
                    const outerR = 16;
                    const innerR = 10;
                    ctx.beginPath();
                    for (let i = 0; i <= teeth * 2; i++) {
                        const angle = (i * Math.PI) / teeth;
                        const r = i % 2 === 0 ? outerR : outerR - 4;
                        const px = sx + Math.cos(angle) * r;
                        const py = sy + Math.sin(angle) * r;
                        if (i === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                    }
                    ctx.closePath();
                    ctx.stroke();
                    ctx.fillStyle = `rgba(150,120,220,${0.4*pulse+0.2})`;
                    ctx.beginPath();
                    ctx.arc(sx, sy, innerR - 3, 0, Math.PI * 2);
                    ctx.fill();
                }

                drawCloudIcon(ctx, sx, sy, pulse) {
                    ctx.fillStyle = `rgba(255,250,240,${0.6*pulse+0.3})`;
                    ctx.beginPath();
                    ctx.arc(sx - 8, sy + 2, 10, 0, Math.PI * 2);
                    ctx.arc(sx + 8, sy + 2, 10, 0, Math.PI * 2);
                    ctx.arc(sx, sy - 6, 12, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = `rgba(200,230,255,${0.4*pulse+0.2})`;
                    ctx.beginPath();
                    ctx.arc(sx - 6, sy, 6, 0, Math.PI * 2);
                    ctx.arc(sx + 10, sy, 5, 0, Math.PI * 2);
                    ctx.fill();
                }

                drawLightningIcon(ctx, sx, sy, pulse) {
                    ctx.fillStyle = `rgba(255,255,120,${0.8*pulse+0.2})`;
                    ctx.beginPath();
                    ctx.moveTo(sx + 2, sy - 18);
                    ctx.lineTo(sx - 8, sy + 2);
                    ctx.lineTo(sx - 2, sy + 2);
                    ctx.lineTo(sx - 4, sy + 18);
                    ctx.lineTo(sx + 10, sy - 2);
                    ctx.lineTo(sx + 3, sy - 2);
                    ctx.closePath();
                    ctx.fill();
                    ctx.strokeStyle = `rgba(255,200,50,${0.6*pulse+0.2})`;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }

                drawPaletteIcon(ctx, sx, sy, pulse) {
                    ctx.fillStyle = `rgba(220,200,180,${0.6*pulse+0.3})`;
                    ctx.beginPath();
                    ctx.ellipse(sx, sy, 16, 12, Math.PI / 6, 0, Math.PI * 2);
                    ctx.fill();
                    const colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff'];
                    colors.forEach((color, i) => {
                        const angle = -Math.PI / 3 + (i * Math.PI / 5);
                        const cx = sx + Math.cos(angle) * 9;
                        const cy = sy + Math.sin(angle) * 6;
                        ctx.fillStyle = color;
                        ctx.beginPath();
                        ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
                        ctx.fill();
                    });
                }

                drawWrenchIcon(ctx, sx, sy, pulse) {
                    ctx.strokeStyle = `rgba(180,180,190,${0.7*pulse+0.2})`;
                    ctx.lineWidth = 3;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(sx - 12, sy - 14);
                    ctx.lineTo(sx + 10, sy + 14);
                    ctx.stroke();
                    ctx.fillStyle = `rgba(160,160,170,${0.6*pulse+0.2})`;
                    ctx.beginPath();
                    ctx.arc(sx - 13, sy - 15, 6, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = `rgba(240,240,245,${0.8*pulse+0.1})`;
                    ctx.beginPath();
                    ctx.arc(sx - 13, sy - 15, 3, 0, Math.PI * 2);
                    ctx.fill();
                }

                drawTempleIcon(ctx, sx, sy, pulse) {
                    ctx.fillStyle = `rgba(200,170,130,${0.6*pulse+0.3})`;
                    ctx.beginPath();
                    ctx.moveTo(sx, sy - 20);
                    ctx.lineTo(sx + 18, sy);
                    ctx.lineTo(sx + 14, sy + 14);
                    ctx.lineTo(sx - 14, sy + 14);
                    ctx.lineTo(sx - 18, sy);
                    ctx.closePath();
                    ctx.fill();
                    ctx.fillStyle = `rgba(80,60,40,${0.7*pulse+0.2})`;
                    ctx.fillRect(sx - 6, sy + 2, 12, 12);
                    ctx.strokeStyle = `rgba(150,120,80,${0.5*pulse+0.2})`;
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(sx - 3, sy + 5, 6, 6);
                }

                drawDefaultIcon(ctx, sx, sy, pulse) {
                    ctx.strokeStyle = `rgba(200,200,200,${0.6*pulse+0.3})`;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(sx, sy, 14, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(sx, sy - 14);
                    ctx.lineTo(sx, sy + 14);
                    ctx.moveTo(sx - 14, sy);
                    ctx.lineTo(sx + 14, sy);
                    ctx.stroke();
                }

                drawBirds(ctx) {
                    for (const bird of this.birds) {
                        const sx = bird.x - this.cameraX;
                        if (sx < -20 || sx > W + 20) continue;
                        const wingFlap = Math.sin(this.time * bird.wingSpeed + bird.wingPhase);
                        const wingOffset = wingFlap * bird.size * 2;
                        ctx.strokeStyle = 'rgba(40,35,50,0.7)';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(sx - bird.size, bird.y);
                        ctx.quadraticCurveTo(sx - bird.size * 0.3, bird.y - wingOffset, sx, bird.y);
                        ctx.quadraticCurveTo(sx + bird.size * 0.3, bird.y - wingOffset, sx + bird.size, bird.y);
                        ctx.stroke();
                    }
                }

                drawVolcanoSmokeParticles(ctx) {
                    for (const sm of this.volcanoSmoke) {
                        const sx = sm.x - this.cameraX;
                        if (sx < -20 || sx > W + 20) continue;
                        const alpha = sm.life / sm.maxLife;
                        ctx.fillStyle = `rgba(120,110,100,${alpha*0.5})`;
                        ctx.beginPath();
                        ctx.arc(sx, sm.y, sm.size, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }

                drawHUD(ctx) {
                    // 左上返回按钮
                    const backX = 20;
                    const backY = 20;
                    const backR = 18;

                    // 按钮背景
                    ctx.fillStyle = 'rgba(20,18,30,0.55)';
                    ctx.beginPath();
                    ctx.roundRect(backX - 8, backY - 8, 50, 36, 22);
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(180,170,160,0.4)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.roundRect(backX - 8, backY - 8, 50, 36, 22);
                    ctx.stroke();

                    // 箭头图标
                    ctx.strokeStyle = 'rgba(220,210,190,0.8)';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(backX + 10, backY - 5);
                    ctx.lineTo(backX - 2, backY + 5);
                    ctx.lineTo(backX + 10, backY + 15);
                    ctx.stroke();

                    // 长按进度环
                    if (this.longPressTarget === 'back' && this.longPressTimer > 0.1) {
                        const progress = Math.min(1, this.longPressTimer / 0.5);
                        ctx.strokeStyle = `rgba(220,200,150,${0.5+progress*0.5})`;
                        ctx.lineWidth = 2.5;
                        ctx.beginPath();
                        ctx.arc(backX + 6, backY + 5, backR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
                        ctx.stroke();
                    }

                    // 右下罗盘
                    const compassX = W - 28;
                    const compassY = H - 70;
                    const compassR = 22;

                    ctx.fillStyle = 'rgba(20,18,30,0.55)';
                    ctx.beginPath();
                    ctx.arc(compassX, compassY, compassR, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(180,170,160,0.5)';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.arc(compassX, compassY, compassR, 0, Math.PI * 2);
                    ctx.stroke();

                    // 罗盘内部十字
                    ctx.strokeStyle = 'rgba(210,200,180,0.7)';
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    ctx.moveTo(compassX, compassY - 10);
                    ctx.lineTo(compassX, compassY + 10);
                    ctx.moveTo(compassX - 10, compassY);
                    ctx.lineTo(compassX + 10, compassY);
                    ctx.stroke();
                    // 小菱形
                    ctx.fillStyle = 'rgba(220,200,150,0.8)';
                    ctx.beginPath();
                    ctx.moveTo(compassX, compassY - 7);
                    ctx.lineTo(compassX + 4, compassY);
                    ctx.lineTo(compassX, compassY + 7);
                    ctx.lineTo(compassX - 4, compassY);
                    ctx.closePath();
                    ctx.fill();

                    // 罗盘展开面板
                    if (this.compassAlpha > 0.01) {
                        ctx.save();
                        ctx.globalAlpha = this.compassAlpha;
                        const panelW = 170;
                        const panelH = this.regions.length * 32 + 30;
                        const panelX = compassX - panelW - 10;
                        const panelY = compassY - panelH / 2;

                        ctx.fillStyle = 'rgba(18,16,28,0.9)';
                        ctx.beginPath();
                        ctx.roundRect(panelX, panelY, panelW, panelH, 12);
                        ctx.fill();
                        ctx.strokeStyle = 'rgba(150,140,130,0.5)';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.roundRect(panelX, panelY, panelW, panelH, 12);
                        ctx.stroke();

                        this.regions.forEach((r, i) => {
                            const ty = panelY + 18 + i * 32;
                            if (r.unlocked) {
                                ctx.fillStyle = '#d8cfb8';
                            } else {
                                ctx.fillStyle = '#6a6570';
                            }
                            ctx.font = '13px "STKaiti","KaiTi","STSong",serif';
                            ctx.textAlign = 'left';
                            ctx.fillText(r.unlocked ? r.name : r.name + ' 🔒', panelX + 14, ty + 4);
                        });
                        ctx.restore();
                    }
                }

                drawHintText(ctx) {
                    if (this.hintText && this.hintTimer > 0) {
                        const alpha = Math.min(1, this.hintTimer, this.hintTimer / 0.4);
                        ctx.save();
                        ctx.globalAlpha = alpha;
                        ctx.fillStyle = 'rgba(20,18,28,0.7)';
                        const textWidth = Math.min(W * 0.8, 350);
                        const textHeight = 36;
                        const tx = W / 2 - textWidth / 2;
                        const ty = H * 0.18;
                        ctx.beginPath();
                        ctx.roundRect(tx, ty, textWidth, textHeight, 18);
                        ctx.fill();
                        ctx.fillStyle = '#e0d5bb';
                        ctx.font = `${Math.min(W*0.033,14)}px "STKaiti","KaiTi","STSong",serif`;
                        ctx.textAlign = 'center';
                        ctx.fillText(this.hintText, W / 2, ty + textHeight / 2 + 5);
                        ctx.restore();
                    }
                }

                drawFadeOverlay(ctx) {
                    if (this.fadeOverlay > 0.005) {
                        ctx.fillStyle = `rgba(8,6,18,${this.fadeOverlay})`;
                        ctx.fillRect(0, 0, W, H);

                        if (this.transitionState === 'showing' && this.transitionRegion) {
                            const alpha = Math.min(1, this.transitionTimer / 0.5);
                            const fadeOutAlpha = this.transitionTimer > 1.7 ? Math.max(0, 1 - (this.transitionTimer - 1.7) /
                                0.5) : alpha;
                            ctx.save();
                            ctx.globalAlpha = fadeOutAlpha;
                            ctx.fillStyle = '#e8dcc8';
                            ctx.font =
                                `bold ${Math.min(W*0.07,32)}px "STKaiti","KaiTi","STSong","Songti SC",serif`;
                            ctx.textAlign = 'center';
                            ctx.fillText(this.transitionRegion.name, W / 2, H / 2 - 15);
                            ctx.fillStyle = '#c8b898';
                            ctx.font = `${Math.min(W*0.035,15)}px "STKaiti","KaiTi","STSong",serif`;
                            ctx.fillText(this.transitionRegion.desc, W / 2, H / 2 + 25);
                            ctx.restore();
                        }
                    }
                }

                draw(ctx) {
                    ctx.clearRect(0, 0, W, H);

                    this.drawSky(ctx);
                    this.drawClouds(ctx);
                    this.drawDistantMountains(ctx);
                    this.drawTerrain(ctx);
                    this.drawBirds(ctx);
                    this.drawVolcanoSmokeParticles(ctx);
                    this.drawRegionEntrances(ctx);
                    this.drawHUD(ctx);
                    this.drawHintText(ctx);
                    this.drawFadeOverlay(ctx);
                }

                handlePointerDown(x, y) {
                    // 检查返回按钮
                    const backX = 20;
                    const backY = 20;
                    if (dist(x, y, backX + 6, backY + 5) < 24) {
                        this.isBackButtonPressed = true;
                        return 'handled';
                    }

                    // 检查罗盘
                    const compassX = W - 28;
                    const compassY = H - 70;
                    if (dist(x, y, compassX, compassY) < 26) {
                        this.compassOpen = !this.compassOpen;
                        return 'handled';
                    }

                    // 检查罗盘面板
                    if (this.compassOpen) {
                        const panelW = 170;
                        const panelH = this.regions.length * 32 + 30;
                        const panelX = compassX - panelW - 10;
                        const panelY = compassY - panelH / 2;
                        if (x >= panelX && x <= panelX + panelW && y >= panelY && y <= panelY + panelH) {
                            const relY = y - panelY - 18;
                            const idx = Math.floor(relY / 32);
                            if (idx >= 0 && idx < this.regions.length) {
                                const region = this.regions[idx];
                                if (region.unlocked) {
                                    // 矩形节点模式下直接进入
                                    this.transitionState = 'fading';
                                    this.transitionRegion = region;
                                    this.fadeTarget = 1;
                                } else {
                                    this.showHint('这里似乎还无法通行...', 2);
                                }
                                this.compassOpen = false;
                                return 'handled';
                            }
                        }
                    }

                    // 检查矩形节点点击
                    for (const region of this.regions) {
                        const rx = region.x * W - this.nodeWidth / 2;
                        const ry = region.y * H - this.nodeHeight / 2;
                        if (x >= rx && x <= rx + this.nodeWidth && y >= ry && y <= ry + this.nodeHeight) {
                            if (region.unlocked && this.transitionState === null) {
                                this.transitionState = 'fading';
                                this.transitionRegion = region;
                                this.fadeTarget = 1;
                                this.compassOpen = false;
                                return 'handled';
                            } else if (!region.unlocked && this.transitionState === null) {
                                this.showHint('这里似乎还无法通行...', 2);
                                return 'handled';
                            }
                        }
                    }

                    // 开始拖动
                    this.isDragging = true;
                    this.dragStartX = x;
                    this.dragStartCam = this.targetCameraX;
                    this.lastDragX = x;
                    this.lastDragTime = performance.now() / 1000;
                    this.dragHistory = [{ x, t: this.lastDragTime }];
                    this.cameraVelocity = 0;
                    this.compassOpen = false;
                    return 'dragging';
                }

                handlePointerMove(x, y) {
                    if (this.isDragging) {
                        const dx = x - this.dragStartX;
                        this.targetCameraX = this.dragStartCam - dx;
                        const now = performance.now() / 1000;
                        this.dragHistory.push({ x, t: now });
                        if (this.dragHistory.length > 10) this.dragHistory.shift();
                        this.lastDragX = x;
                        this.lastDragTime = now;
                    }
                }

                handlePointerUp(x, y) {
                    if (this.isBackButtonPressed) {
                        this.isBackButtonPressed = false;
                        this.compassOpen = false;
                        return 'back_to_home';
                    }
                    
                    if (this.isDragging) {
                        this.isDragging = false;
                        // 计算惯性速度
                        if (this.dragHistory.length >= 2) {
                            const first = this.dragHistory[0];
                            const last = this.dragHistory[this.dragHistory.length - 1];
                            const dt = last.t - first.t;
                            if (dt > 0.01) {
                                const vx = -(last.x - first.x) / dt;
                                this.cameraVelocity = clamp(vx, -800, 800);
                            }
                        }
                        this.dragHistory = [];
                    }

                    return null;
                }

                handleClick(x, y) {
                    if (!this.isDragging && this.transitionState === null) {
                        for (const region of this.regions) {
                            const sx = region.x - this.cameraX;
                            if (Math.abs(sx - x) < 45 && Math.abs(region.y - y) < 50) {
                                if (region.unlocked) {
                                    areaScene.init(region.id);
                                    return 'area';
                                } else {
                                    this.showHint('这里似乎还无法通行...', 2);
                                    return 'handled';
                                }
                            }
                        }
                    }
                    return null;
                }
            }

            // ============ 新手引导场景 ============
            class TutorialScene {
                constructor() {
                    this.phase = 'intro';
                    this.time = 0;
                    this.phaseTimer = 0;
                    this.alpha = 0;
                    this.targetAlpha = 1;
                    
                    this.introPhase = 'fadeEnv';
                    this.introAlpha = 0;
                    this.envAlpha = 0;
                    this.altarGlow = 0;
                    this.guideText = '';
                    this.guideTextAlpha = 0;
                    
                    this.starterPets = [
                        { speciesId: 'fire_fox', x: W * 0.25, y: H * 0.5, selected: false, hover: false },
                        { speciesId: 'ripple_turtle', x: W * 0.5, y: H * 0.5, selected: false, hover: false },
                        { speciesId: 'sprout_deer', x: W * 0.75, y: H * 0.5, selected: false, hover: false },
                    ];
                    this.selectedStarter = null;
                    this.confirmPhase = false;
                    this.petNameInput = '';
                    this.showNameInput = false;
                    
                    this.battlePhase = 'start';
                    this.enemyPet = null;
                    this.playerPet = null;
                    this.battleLog = [];
                    this.showingBattleLog = false;
                    this.currentAction = null;
                    this.isTutorialBattle = false;
                    
                    this.completePhase = 'portal';
                    this.portalAlpha = 0;
                    
                    this.stars = [];
                    const starSeed = seededRandom(42);
                    for (let i = 0; i < 50; i++) {
                        this.stars.push({
                            x: starSeed() * W,
                            y: starSeed() * H * 0.6,
                            size: starSeed() * 1.5 + 0.5,
                            twinkleOffset: starSeed() * Math.PI * 2,
                        });
                    }
                }

                init() {
                    this.phase = 'intro';
                    this.time = 0;
                    this.phaseTimer = 0;
                    this.alpha = 0;
                    this.targetAlpha = 1;
                    this.introPhase = 'fadeEnv';
                    this.introAlpha = 0;
                    this.envAlpha = 0;
                    this.selectedStarter = null;
                    this.confirmPhase = false;
                    this.showNameInput = false;
                    this.petNameInput = '';
                    this.battlePhase = 'start';
                    this.battleLog = [];
                    this.completePhase = 'portal';
                    this.isTutorialBattle = false;
                    this.recalcStarterPositions();
                }

                startTutorial() {
                    this.init();
                    this.introPhase = 'fadeEnv';
                    this.phaseTimer = 0;
                }

                update(dt) {
                    this.time += dt;
                    this.phaseTimer += dt;
                    this.alpha = lerp(this.alpha, this.targetAlpha, dt * 5);

                    if (this.phase === 'intro') {
                        this.updateIntro(dt);
                    } else if (this.phase === 'select') {
                        this.updateSelect(dt);
                    } else if (this.phase === 'battle') {
                        this.updateBattle(dt);
                    } else if (this.phase === 'complete') {
                        this.updateComplete(dt);
                    }

                }

                updateIntro(dt) {
                    switch (this.introPhase) {
                        case 'fadeEnv':
                            this.envAlpha = lerp(this.envAlpha, 1, dt * 3);
                            if (this.envAlpha > 0.95) {
                                this.introPhase = 'showAltar';
                                this.phaseTimer = 0;
                            }
                            break;
                        case 'showAltar':
                            this.altarGlow = 0.5 + Math.sin(this.time * 2) * 0.3;
                            if (this.phaseTimer > 0.5) {
                                this.introPhase = 'guideSpeak';
                                this.phaseTimer = 0;
                                this.guideText = '欢迎来到秘境世界...';
                                this.guideTextAlpha = 0;
                            }
                            break;
                        case 'guideSpeak':
                            this.guideTextAlpha = lerp(this.guideTextAlpha, 1, dt * 2);
                            this.altarGlow = 0.5 + Math.sin(this.time * 2) * 0.3;
                            if (this.phaseTimer > 3) {
                                this.guideText = '选择你的第一只伙伴吧';
                                this.phaseTimer = 0;
                            }
                            if (this.phaseTimer > 2 && this.guideText === '选择你的第一只伙伴吧') {
                                this.introPhase = 'ready';
                                this.phaseTimer = 0;
                            }
                            break;
                        case 'ready':
                            this.guideTextAlpha = lerp(this.guideTextAlpha, 0, dt * 2);
                            this.altarGlow = 0.5 + Math.sin(this.time * 2) * 0.3;
                            if (this.phaseTimer > 1) {
                                this.phase = 'select';
                                this.phaseTimer = 0;
                            }
                            break;
                    }
                }

                updateSelect(dt) {
                    for (const pet of this.starterPets) {
                        pet.hover = false;
                    }
                }

                updateBattle(dt) {
                    // 战斗逻辑更新
                }

                updateComplete(dt) {
                    this.portalAlpha = 0.5 + Math.sin(this.time * 3) * 0.3;
                }

                draw(ctx) {
                    ctx.save();
                    ctx.globalAlpha = this.alpha;

                    if (this.phase === 'intro') {
                        this.drawIntro(ctx);
                    } else if (this.phase === 'select') {
                        this.drawSelect(ctx);
                    } else if (this.phase === 'battle') {
                        // BattleScene会处理绘制
                    } else if (this.phase === 'complete') {
                        this.drawComplete(ctx);
                    }

                    ctx.restore();

                    // 跳过按钮（在select阶段和complete阶段不显示）
                    if (this.phase !== 'select' && this.phase !== 'complete') {
                        ctx.save();
                        ctx.globalAlpha = 0.7;
                        ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
                        ctx.beginPath();
                        ctx.roundRect(15, 15, 55, 28, 14);
                        ctx.fill();
                        ctx.fillStyle = '#d0c0a0';
                        ctx.font = `${Math.min(W * 0.028, 11)}px "STKaiti","KaiTi","STSong",serif`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('跳过', 42, 29);
                        ctx.restore();
                    }
                }

                drawIntro(ctx) {
                    // 环境
                    ctx.globalAlpha = this.envAlpha;
                    
                    // 天空
                    const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
                    skyGrad.addColorStop(0, '#0a0a15');
                    skyGrad.addColorStop(0.5, '#151525');
                    skyGrad.addColorStop(1, '#1a1a2a');
                    ctx.fillStyle = skyGrad;
                    ctx.fillRect(0, 0, W, H);

                    for (const star of this.stars) {
                        const twinkle = Math.sin(this.time * 2 + star.twinkleOffset) * 0.5 + 0.5;
                        ctx.fillStyle = `rgba(255, 255, 255, ${twinkle * 0.8})`;
                        ctx.beginPath();
                        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                        ctx.fill();
                    }

                    // 远山
                    ctx.fillStyle = '#0f0f1a';
                    ctx.beginPath();
                    ctx.moveTo(0, H * 0.6);
                    for (let x = 0; x <= W; x += 20) {
                        const y = H * 0.6 + Math.sin(x * 0.005) * 30 + Math.sin(x * 0.01) * 20;
                        ctx.lineTo(x, y);
                    }
                    ctx.lineTo(W, H);
                    ctx.lineTo(0, H);
                    ctx.fill();

                    // 地面
                    ctx.fillStyle = '#0a0a12';
                    ctx.beginPath();
                    ctx.moveTo(0, H * 0.75);
                    for (let x = 0; x <= W; x += 15) {
                        const y = H * 0.75 + Math.sin(x * 0.008) * 15;
                        ctx.lineTo(x, y);
                    }
                    ctx.lineTo(W, H);
                    ctx.lineTo(0, H);
                    ctx.fill();

                    // 祭坛
                    const altarX = W / 2;
                    const altarY = H * 0.72;
                    
                    // 祭坛光晕
                    ctx.globalAlpha = this.envAlpha * this.altarGlow;
                    const altarGlow = ctx.createRadialGradient(altarX, altarY, 0, altarX, altarY, 80);
                    altarGlow.addColorStop(0, 'rgba(255, 200, 100, 0.4)');
                    altarGlow.addColorStop(0.5, 'rgba(255, 180, 80, 0.2)');
                    altarGlow.addColorStop(1, 'rgba(255, 150, 50, 0)');
                    ctx.fillStyle = altarGlow;
                    ctx.beginPath();
                    ctx.arc(altarX, altarY, 80, 0, Math.PI * 2);
                    ctx.fill();

                    // 祭坛基座
                    ctx.globalAlpha = this.envAlpha;
                    ctx.fillStyle = '#2a2a35';
                    ctx.beginPath();
                    ctx.moveTo(altarX - 50, altarY);
                    ctx.lineTo(altarX - 40, altarY - 30);
                    ctx.lineTo(altarX + 40, altarY - 30);
                    ctx.lineTo(altarX + 50, altarY);
                    ctx.fill();

                    // 祭坛顶部光点
                    ctx.globalAlpha = this.envAlpha * (0.6 + Math.sin(this.time * 3) * 0.4);
                    ctx.fillStyle = '#ffd700';
                    ctx.beginPath();
                    ctx.arc(altarX, altarY - 35, 5, 0, Math.PI * 2);
                    ctx.fill();

                    // 引导文字
                    if (this.guideTextAlpha > 0.01) {
                        ctx.globalAlpha = this.guideTextAlpha;
                        
                        // 文字背景
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                        ctx.beginPath();
                        ctx.roundRect(W * 0.15, H * 0.85, W * 0.7, 40, 10);
                        ctx.fill();

                        ctx.fillStyle = '#f0e0c0';
                        ctx.font = `${Math.min(W * 0.04, 16)}px "STKaiti","KaiTi",sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(this.guideText, W / 2, H * 0.85 + 20);
                    }

                    // 点击提示
                    if (this.introPhase === 'ready') {
                        ctx.globalAlpha = 0.5 + Math.sin(this.time * 4) * 0.3;
                        ctx.fillStyle = '#a0a0a0';
                        ctx.font = `${Math.min(W * 0.03, 12)}px "STKaiti","KaiTi",sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.fillText('点击继续', W / 2, H * 0.95);
                    }
                }

                drawSelect(ctx) {
                    // 背景
                    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
                    bgGrad.addColorStop(0, '#1a1a2a');
                    bgGrad.addColorStop(1, '#0f0f1a');
                    ctx.fillStyle = bgGrad;
                    ctx.fillRect(0, 0, W, H);

                    // 标题
                    ctx.fillStyle = '#f0e0c0';
                    ctx.font = `bold ${Math.min(W * 0.05, 20)}px "STKaiti","KaiTi",sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('选择你的初始伙伴', W / 2, H * 0.1);

                    // 三只宠物
                    for (const pet of this.starterPets) {
                        this.drawStarterPet(ctx, pet);
                    }

                    // 提示
                    ctx.fillStyle = '#808080';
                    ctx.font = `${Math.min(W * 0.028, 11)}px "STKaiti","KaiTi",sans-serif`;
                    ctx.fillText('点击选择一只宠物', W / 2, H * 0.92);
                }

                drawStarterPet(ctx, pet) {
                    const species = SpeciesDB[pet.speciesId];
                    const x = pet.x;
                    const y = pet.y;
                    const baseSize = this.getStarterSize();
                    const size = pet.selected ? baseSize + 10 : (pet.hover ? baseSize + 5 : baseSize);
                    const pulse = Math.sin(this.time * 3) * 3;

                    // 选中光晕
                    if (pet.selected) {
                        ctx.fillStyle = `rgba(255, 200, 100, ${0.2 + pulse * 0.02})`;
                        ctx.beginPath();
                        ctx.arc(x, y, size + baseSize * 0.33, 0, Math.PI * 2);
                        ctx.fill();
                    }

                    // 属性背景
                    ctx.fillStyle = species.element.color;
                    ctx.globalAlpha = 0.3;
                    ctx.beginPath();
                    ctx.arc(x, y, size, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.globalAlpha = 1;

                    // 边框
                    ctx.strokeStyle = pet.selected ? 'rgba(255, 200, 100, 0.8)' : 
                                       pet.hover ? 'rgba(200, 180, 140, 0.5)' : 
                                       'rgba(100, 90, 80, 0.3)';
                    ctx.lineWidth = pet.selected ? 3 : 2;
                    ctx.beginPath();
                    ctx.arc(x, y, size, 0, Math.PI * 2);
                    ctx.stroke();

                    // 宠物图标
                    ctx.font = `${size * 0.9}px serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    
                    const tutorialIconSize = size * 0.9 * 1.8;
                    
                    if (!drawCustomPetIcon(ctx, pet.speciesId, x, y - 5, tutorialIconSize)) {
                        const icon = this.getPetIcon(pet.speciesId);
                        ctx.fillText(icon, x, y - 5);
                    }

                    // 名称
                    ctx.fillStyle = '#f0e0c0';
                    ctx.font = `bold ${Math.min(W * 0.035, 14)}px "STKaiti","KaiTi",sans-serif`;
                    ctx.fillText(species.name, x, y + size + 15);

                    // 属性标签
                    ctx.fillStyle = species.element.color;
                    ctx.font = `${Math.min(W * 0.025, 10)}px "STKaiti","KaiTi",sans-serif`;
                    ctx.fillText(species.element.name + '属性', x, y + size + 32);

                    // 描述
                    ctx.fillStyle = '#808080';
                    ctx.font = `${Math.min(W * 0.02, 8)}px "STKaiti","KaiTi",sans-serif`;
                    const desc = species.description.substring(0, 10);
                    ctx.fillText(desc, x, y + size + 48);
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

                getStarterSize() {
                    if (W < 500) {
                        return Math.min(50, W * 0.12);
                    }
                    return 60;
                }

                getStarterHitRadius() {
                    return this.getStarterSize() + 12;
                }

                recalcStarterPositions() {
                    const size = this.getStarterSize();
                    const usableWidth = W * 0.85;
                    const leftMargin = (W - usableWidth) / 2;
                    const spacing = usableWidth / 3;

                    this.starterPets[0].x = leftMargin + spacing * 0.5;
                    this.starterPets[1].x = leftMargin + spacing * 1.5;
                    this.starterPets[2].x = leftMargin + spacing * 2.5;

                    this.starterPets.forEach(p => p.y = H * 0.5);
                }

                drawBattle(ctx) {
                    // 战斗背景
                    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
                    bgGrad.addColorStop(0, '#1a2a3a');
                    bgGrad.addColorStop(1, '#0f1a2a');
                    ctx.fillStyle = bgGrad;
                    ctx.fillRect(0, 0, W, H);

                    // 敌方宠物
                    if (this.enemyPet) {
                        this.drawBattlePet(ctx, this.enemyPet, W / 2, H * 0.25, true);
                    }

                    // 我方宠物
                    if (this.playerPet) {
                        this.drawBattlePet(ctx, this.playerPet, W / 2, H * 0.65, false);
                    }

                    // 战斗UI
                    this.drawBattleUI(ctx);
                }

                drawBattlePet(ctx, pet, x, y, isEnemy) {
                    const species = pet.species;
                    
                    // 属性光晕
                    ctx.fillStyle = species.element.color;
                    ctx.globalAlpha = 0.2;
                    ctx.beginPath();
                    ctx.arc(x, y, 50, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.globalAlpha = 1;

                    // 图标
                    ctx.font = '50px serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(this.getPetIcon(pet.speciesId), x, y);

                    // 信息条
                    const barY = isEnemy ? y + 60 : y - 60;
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                    ctx.beginPath();
                    ctx.roundRect(x - 60, barY - 12, 120, 24, 8);
                    ctx.fill();

                    ctx.fillStyle = '#f0e0c0';
                    ctx.font = `bold ${Math.min(W * 0.03, 12)}px "STKaiti","KaiTi",sans-serif`;
                    ctx.fillText(`${pet.name} Lv.${pet.level}`, x, barY);

                    // HP条
                    const hpBarY = barY + 18;
                    const hpPercent = pet.currentHp / pet.getMaxHp();
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                    ctx.beginPath();
                    ctx.roundRect(x - 50, hpBarY, 100, 8, 4);
                    ctx.fill();
                    ctx.fillStyle = hpPercent > 0.5 ? '#4ecdc4' : hpPercent > 0.2 ? '#ffd93d' : '#ff6b6b';
                    ctx.beginPath();
                    ctx.roundRect(x - 50, hpBarY, 100 * hpPercent, 8, 4);
                    ctx.fill();
                }

                drawBattleUI(ctx) {
                    // 技能按钮区域
                    const btnY = H - 80;
                    const btnW = 70;
                    const btnH = 35;
                    const startX = W * 0.15;

                    ctx.fillStyle = 'rgba(30, 28, 40, 0.9)';
                    ctx.beginPath();
                    ctx.roundRect(W * 0.1, btnY - 10, W * 0.8, 60, 10);
                    ctx.fill();

                    if (this.playerPet) {
                        const skills = this.playerPet.getAllSkills();
                        for (let i = 0; i < Math.min(4, skills.length); i++) {
                            const skill = skills[i];
                            const btnX = startX + i * (btnW + 10);
                            
                            ctx.fillStyle = skill.isFixed ? 'rgba(255, 180, 100, 0.3)' : 'rgba(60, 50, 40, 0.8)';
                            ctx.beginPath();
                            ctx.roundRect(btnX, btnY, btnW, btnH, 8);
                            ctx.fill();

                            ctx.strokeStyle = skill.isFixed ? 'rgba(255, 200, 100, 0.5)' : 'rgba(100, 90, 80, 0.5)';
                            ctx.lineWidth = 1;
                            ctx.beginPath();
                            ctx.roundRect(btnX, btnY, btnW, btnH, 8);
                            ctx.stroke();

                            ctx.fillStyle = '#f0e0c0';
                            ctx.font = `${Math.min(W * 0.025, 10)}px "STKaiti","KaiTi",sans-serif`;
                            ctx.textAlign = 'center';
                            ctx.fillText(skill.name, btnX + btnW / 2, btnY + btnH / 2 - 3);

                            ctx.fillStyle = skill.currentPp <= 0 ? '#ff6b6b' : (skill.isFixed ? '#ffd700' : '#a0a0a0');
                            ctx.font = `${Math.min(W * 0.02, 8)}px sans-serif`;
                            ctx.fillText(`PP:${skill.currentPp}/${skill.pp}`, btnX + btnW / 2, btnY + btnH / 2 + 10);
                        }
                    }
                }

                drawComplete(ctx) {
                    // 背景
                    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
                    bgGrad.addColorStop(0, '#1a2a3a');
                    bgGrad.addColorStop(1, '#0f1a2a');
                    ctx.fillStyle = bgGrad;
                    ctx.fillRect(0, 0, W, H);

                    // 传送门
                    const portalX = W / 2;
                    const portalY = H * 0.4;
                    const portalR = 60;

                    ctx.globalAlpha = this.portalAlpha;
                    const portalGrad = ctx.createRadialGradient(portalX, portalY, 0, portalX, portalY, portalR);
                    portalGrad.addColorStop(0, 'rgba(100, 200, 255, 0.8)');
                    portalGrad.addColorStop(0.5, 'rgba(80, 150, 255, 0.4)');
                    portalGrad.addColorStop(1, 'rgba(60, 100, 255, 0)');
                    ctx.fillStyle = portalGrad;
                    ctx.beginPath();
                    ctx.arc(portalX, portalY, portalR, 0, Math.PI * 2);
                    ctx.fill();

                    // 传送门旋转环
                    ctx.strokeStyle = 'rgba(150, 200, 255, 0.6)';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(portalX, portalY, portalR * 0.7, this.time, this.time + Math.PI * 1.5);
                    ctx.stroke();

                    ctx.globalAlpha = 1;

                    // 提示文字
                    ctx.fillStyle = '#f0e0c0';
                    ctx.font = `bold ${Math.min(W * 0.045, 18)}px "STKaiti","KaiTi",sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText('恭喜完成新手引导！', W / 2, H * 0.65);

                    ctx.fillStyle = '#a0a0a0';
                    ctx.font = `${Math.min(W * 0.03, 12)}px "STKaiti","KaiTi",sans-serif`;
                    ctx.fillText('点击传送门进入家园', W / 2, H * 0.72);

                    // 点击提示
                    ctx.globalAlpha = 0.5 + Math.sin(this.time * 4) * 0.3;
                    ctx.fillStyle = '#ffd700';
                    ctx.fillText('👆', W / 2, H * 0.4);
                }

                handleClick(x, y) {
                    // 检查是否点击了跳过按钮
                    if (x >= 15 && x <= 70 && y >= 15 && y <= 43) {
                        if (this.phase === 'select') {
                            // select阶段不允许跳过
                            return null;
                        } else if (this.phase === 'complete') {
                            // complete阶段不显示跳过按钮，但以防万一
                            return null;
                        } else if (this.phase === 'intro') {
                            // intro阶段跳过：只跳过开场动画，进入选择宠物阶段
                            this.phase = 'select';
                            this.phaseTimer = 0;
                            return 'select';
                        } else {
                            // 其他阶段（如battle）可以完全跳过
                            this.skipTutorial();
                            return 'complete';
                        }
                    }

                    if (this.phase === 'intro') {
                        if (this.introPhase === 'ready') {
                            this.phase = 'select';
                            this.phaseTimer = 0;
                            return 'next';
                        }
                    } else if (this.phase === 'select') {
                        for (const pet of this.starterPets) {
                            const dx = x - pet.x;
                            const dy = y - pet.y;
                            if (Math.sqrt(dx * dx + dy * dy) < this.getStarterHitRadius()) {
                                this.selectedStarter = pet.speciesId;
                                for (const p of this.starterPets) {
                                    p.selected = false;
                                }
                                pet.selected = true;
                                
                                const newPet = Pet.createRandom(pet.speciesId, 5, '初始祭坛');
                                if (newPet) {
                                    this.playerPet = newPet;
                                    gs.petManager.addToTeam(newPet);
                                    
                                    gs.bagManager.addItem('normal_ball', 10);
                                    gs.bagManager.addItem('hp_potion', 5);
                                    
                                    this.phase = 'battle';
                                    this.phaseTimer = 0;
                                    
                                    battleScene.init(this.playerPet, 'shadow_mouse', 3);
                                    this.isTutorialBattle = true;
                                }
                                return 'select:' + pet.speciesId;
                            }
                        }
                    } else if (this.phase === 'battle') {
                        return 'battle';
                    } else if (this.phase === 'complete') {
                        const portalX = W / 2;
                        const portalY = H * 0.4;
                        const dx = x - portalX;
                        const dy = y - portalY;
                        if (Math.sqrt(dx * dx + dy * dy) < 80) {
                            return 'complete';
                        }
                    }
                    return null;
                }

                skipTutorial() {
                    // 如果还没有选择初始宠物，随机给一只
                    if (!this.playerPet || gs.petManager.team.length === 0) {
                        const speciesIds = ['fire_fox', 'ripple_turtle', 'sprout_deer'];
                        const randomSpeciesId = speciesIds[Math.floor(Math.random() * speciesIds.length)];
                        const newPet = Pet.createRandom(randomSpeciesId, 5, '初始祭坛');
                        if (newPet) {
                            this.playerPet = newPet;
                            gs.petManager.addToTeam(newPet);
                        }
                    }
                    // 确保玩家获得新手奖励
                    gs.bagManager.addItem('normal_ball', 10);
                    gs.bagManager.addItem('hp_potion', 5);
                }

                handlePointerMove(x, y) {
                    if (this.phase === 'select') {
                        for (const pet of this.starterPets) {
                            const dx = x - pet.x;
                            const dy = y - pet.y;
                            pet.hover = Math.sqrt(dx * dx + dy * dy) < this.getStarterHitRadius();
                        }
                    }
                }

                isPointInside(x, y) {
                    return true;
                }
            }

            // ============ 区域地图场景（奥拉星异空间）============
            const AreaConfigs = {
                ice_zone: {
                    id: 'ice_zone',
                    name: '艾夕区',
                    desc: '冰雕广场与寒冰洞',
                    worldWidth: W * 2.0,
                    bgColor: ['#cceeff', '#e6f7ff', '#b3e0ff'],
                    groundColor: '#d9f2ff',
                    enemies: ['snow_hare', 'shadow_mouse'],
                    enemyLevelRange: [2, 8],
                    interestPoints: [
                        { type: 'ice_crystal', x: 0.15, name: '冰晶簇' },
                        { type: 'snow_pile',   x: 0.40, name: '雪堆' },
                        { type: 'ice_crystal', x: 0.65, name: '冰晶簇' },
                        { type: 'frozen_log',  x: 0.85, name: '冻住的树桩' },
                    ],
                    safePoints: [
                        { x: 0.45, name: '奇迹冰殿' }
                    ],
                },
                sand_zone: {
                    id: 'sand_zone',
                    name: '索里德区',
                    desc: '流沙与风暴之眼',
                    worldWidth: W * 2.5,
                    bgColor: ['#d4a76a', '#c2945a', '#e8c88a'],
                    groundColor: '#c29a5a',
                    enemies: ['shadow_mouse', 'light_sparrow'],
                    enemyLevelRange: [9, 18],
                    interestPoints: [
                        { type: 'quicksand',      x: 0.12, name: '流沙坑' },
                        { type: 'ancient_tablet', x: 0.38, name: '古老石碑' },
                        { type: 'sandstorm_vortex',x: 0.62, name: '沙尘漩涡' },
                        { type: 'quicksand',      x: 0.88, name: '流沙坑' },
                    ],
                    safePoints: [
                        { x: 0.55, name: '遗迹帐篷' }
                    ],
                },
                dark_forest: {
                    id: 'dark_forest',
                    name: '幽暗密林',
                    desc: '古老树木间萤火飞舞，深处似乎隐藏着什么...',
                    worldWidth: W * 2.5,
                    bgColor: ['#0a1510', '#152520', '#0d1a15'],
                    groundColor: '#1a2820',
                    enemies: ['shadow_mouse', 'light_sparrow'],
                    enemyLevelRange: [2, 6],
                    interestPoints: [
                        { type: 'shaking_bush', x: 0.15, name: '摇晃的树丛' },
                        { type: 'glowing_mushroom', x: 0.35, name: '发光蘑菇' },
                        { type: 'shaking_bush', x: 0.55, name: '摇晃的树丛' },
                        { type: 'mysterious_footprint', x: 0.75, name: '神秘足迹' },
                        { type: 'shaking_bush', x: 0.9, name: '摇晃的树丛' },
                    ],
                    safePoints: [
                        { x: 0.5, name: '古老树洞' },
                    ],
                },
                breeze_meadow: {
                    id: 'breeze_meadow',
                    name: '微风草地',
                    desc: '晨露中栖息着各种虫系宠物，草地泛着微光',
                    worldWidth: W * 2.5,
                    bgColor: ['#1a2520', '#253530', '#1a2a25'],
                    groundColor: '#2a3a30',
                    enemies: ['light_sparrow', 'shadow_mouse'],
                    enemyLevelRange: [1, 5],
                    interestPoints: [
                        { type: 'rustling_grass', x: 0.12, name: '沙沙作响的草丛' },
                        { type: 'flower_patch', x: 0.32, name: '花丛' },
                        { type: 'rustling_grass', x: 0.52, name: '沙沙作响的草丛' },
                        { type: 'bubbling_spring', x: 0.72, name: '冒泡的泉眼' },
                        { type: 'rustling_grass', x: 0.88, name: '沙沙作响的草丛' },
                    ],
                    safePoints: [
                        { x: 0.4, name: '清澈泉眼' },
                    ],
                },
                volcano_peak: {
                    id: 'volcano_peak',
                    name: '火山之巅',
                    desc: '山顶泛着红光，灼热的气息扑面而来',
                    worldWidth: W * 2,
                    bgColor: ['#201510', '#302015', '#251810'],
                    groundColor: '#352520',
                    enemies: ['fire_fox'],
                    enemyLevelRange: [8, 15],
                    interestPoints: [
                        { type: 'steaming_vent', x: 0.2, name: '冒烟的裂隙' },
                        { type: 'glowing_crack', x: 0.45, name: '发光的岩缝' },
                        { type: 'steaming_vent', x: 0.7, name: '冒烟的裂隙' },
                    ],
                    safePoints: [
                        { x: 0.55, name: '冷却岩台' },
                    ],
                },
                mist_lake: {
                    id: 'mist_lake',
                    name: '迷雾湖',
                    desc: '雾气缭绕的湖面，水边时有奇异身影',
                    worldWidth: W * 2.5,
                    bgColor: ['#151820', '#202830', '#182025'],
                    groundColor: '#252a30',
                    enemies: ['ripple_turtle', 'light_sparrow'],
                    enemyLevelRange: [5, 12],
                    interestPoints: [
                        { type: 'bubbling_water', x: 0.15, name: '冒泡的水面' },
                        { type: 'misty_shadow', x: 0.35, name: '雾中阴影' },
                        { type: 'bubbling_water', x: 0.55, name: '冒泡的水面' },
                        { type: 'ripple_spot', x: 0.75, name: '涟漪处' },
                        { type: 'bubbling_water', x: 0.9, name: '冒泡的水面' },
                    ],
                    safePoints: [
                        { x: 0.45, name: '湖心小岛' },
                    ],
                },
                coastline: {
                    id: 'coastline',
                    name: '远海之滨',
                    desc: '海浪轻拍礁石，远方是未知的海域',
                    worldWidth: W * 2.5,
                    bgColor: ['#152025', '#203035', '#182528'],
                    groundColor: '#2a3538',
                    enemies: ['ripple_turtle', 'light_sparrow'],
                    enemyLevelRange: [10, 18],
                    interestPoints: [
                        { type: 'tidal_pool', x: 0.12, name: '潮汐水潭' },
                        { type: 'shining_sand', x: 0.32, name: '闪光沙滩' },
                        { type: 'tidal_pool', x: 0.52, name: '潮汐水潭' },
                        { type: 'wave_splash', x: 0.72, name: '浪花处' },
                        { type: 'tidal_pool', x: 0.88, name: '潮汐水潭' },
                    ],
                    safePoints: [
                        { x: 0.5, name: '礁石平台' },
                    ],
                },
            };

            class AreaScene {
                constructor() {
                    this.visible = false;
                    this.alpha = 0;
                    this.targetAlpha = 0;
                    this.time = 0;
                    
                    this.currentArea = null;
                    this.areaConfig = null;
                    
                    this.worldWidth = W * 2.5;
                    this.cameraX = 0;
                    this.targetCameraX = 0;
                    this.cameraVelocity = 0;
                    this.isDragging = false;
                    this.dragStartX = 0;
                    this.dragStartCam = 0;
                    this.dragHistory = [];
                    
                    this.fireflies = [];
                    this.interestPoints = [];
                    this.safePoints = [];
                    
                    this.hoveredPoint = null;
                    this.enterAnimProgress = 0;
                    this.enterAnimDuration = 1.0;
                    
                    this.hintText = null;
                    this.hintTimer = 0;
                    this.hintAlpha = 0;
                    
                    this.transitionAlpha = 0;
                    this.transitionText = '';
                    
                    this.playerX = 0;
                    this.playerY = 0;
                    this.targetX = 0;
                    this.targetY = 0;
                    this.playerSpeed = 260;
                    this.playerMoving = false;
                    this.playerIcon = '🧑';

                    this.isBackButtonPressed = false;
                    this.pointerDownStartX = 0;
                    this.pointerDownStartY = 0;
                    this.hasSignificantDrag = false;

                    this.clickTargetX = null;
                    this.clickTargetY = null;
                    this.isClickMoving = false;
                    this.clickIndicatorAlpha = 0;
                }

                init(areaId) {
                    const config = AreaConfigs[areaId];
                    if (!config) return false;
                    
                    this.currentArea = areaId;
                    this.areaConfig = config;
                    this.worldWidth = config.worldWidth;
                    this.cameraX = 0;
                    this.targetCameraX = 0;
                    this.cameraVelocity = 0;
                    this.isDragging = false;
                    this.visible = true;
                    this.alpha = 1;
                    this.targetAlpha = 1;
                    this.time = 0;
                    this.hoveredPoint = null;
                    this.enterAnimProgress = 0;
                    this.hintText = null;
                    this.hintTimer = 0;
                    
                    this.initInterestPoints();
                    this.initSafePoints();
                    this.initFireflies();
                    
                    this.playerX = 100;
                    this.playerY = H * 0.4;
                    this.targetX = this.playerX;
                    this.targetY = this.playerY;
                    
                    this.showHint('🗺️ ' + config.name + ' - 点击地面移动', 5);
                    
                    return true;
                }

                initInterestPoints() {
                    this.interestPoints = [];
                    if (!this.areaConfig) return;
                    
                    for (const ip of this.areaConfig.interestPoints) {
                        this.interestPoints.push({
                            ...ip,
                            worldX: ip.x * this.worldWidth,
                            y: H * 0.5,
                            investigated: false,
                            hidden: false,
                            refreshTimer: 0,
                            animPhase: Math.random() * Math.PI * 2,
                        });
                    }
                }

                initSafePoints() {
                    this.safePoints = [];
                    if (!this.areaConfig) return;
                    
                    for (const sp of this.areaConfig.safePoints) {
                        this.safePoints.push({
                            ...sp,
                            worldX: sp.x * this.worldWidth,
                            y: H * 0.5,
                        });
                    }
                }

                initFireflies() {
                    this.fireflies = [];
                    const seed = seededRandom(this.currentArea ? this.currentArea.length * 100 : 42);
                    for (let i = 0; i < 25; i++) {
                        this.fireflies.push({
                            x: seed() * this.worldWidth,
                            y: H * 0.35 + seed() * H * 0.4,
                            phase: seed() * Math.PI * 2,
                            speed: seed() * 0.5 + 0.3,
                            size: seed() * 2 + 1,
                            brightness: seed(),
                        });
                    }
                }

                showHint(text, duration) {
                    this.hintText = text;
                    this.hintTimer = duration;
                    this.hintAlpha = 1;
                }

                update(dt) {
                    this.time += dt;
                    this.alpha = lerp(this.alpha, this.targetAlpha, dt * 8);

                    if (this.enterAnimProgress < 1) {
                        this.enterAnimProgress = Math.min(1, this.enterAnimProgress + dt / this.enterAnimDuration);
                    }

                    if (this.isClickMoving && this.clickTargetX !== null) {
                        const dx = this.clickTargetX - this.playerX;
                        const dy = this.clickTargetY - this.playerY;
                        const distance = Math.sqrt(dx * dx + dy * dy);

                        if (distance < 10) {
                            this.isClickMoving = false;
                            this.clickTargetX = null;
                            this.clickTargetY = null;
                            this.playerMoving = false;
                        } else {
                            this.playerMoving = true;
                            const moveDist = Math.min(this.playerSpeed * dt, distance);
                            this.playerX += (dx / distance) * moveDist;
                            this.playerY += (dy / distance) * moveDist;
                            this.playerX = clamp(this.playerX, 0, this.worldWidth);
                            this.playerY = clamp(this.playerY, H * 0.3, H);
                        }
                    } else {
                        this.playerMoving = false;
                    }
                    
                    if (this.clickTargetX !== null) {
                        this.clickIndicatorAlpha = lerp(this.clickIndicatorAlpha, 1, dt * 8);
                    } else {
                        this.clickIndicatorAlpha = lerp(this.clickIndicatorAlpha, 0, dt * 8);
                    }
                    
                    const targetCamX = this.playerX - W * 0.35;
                    this.targetCameraX = targetCamX;
                    
                    this.cameraX = lerp(this.cameraX, this.targetCameraX, dt * 12);
                    this.cameraX = clamp(this.cameraX, 0, this.worldWidth - W);
                    
                    if (this.hintText !== null) {
                        if (this.hintTimer > 0) {
                            // 显示阶段：倒计时 + 向上移动
                            this.hintTimer -= dt;
                            this.hintY -= 30 * dt;
                        } else {
                            // 淡出阶段：只做透明度渐变
                            this.hintAlpha = lerp(this.hintAlpha, 0, dt * 4);
                            this.hintY -= 20 * dt;  // 继续缓慢上飘
                            if (this.hintAlpha < 0.01) {
                                this.hintText = null;
                                this.hintAlpha = 0;
                            }
                        }
                    }
                    
                    for (const ip of this.interestPoints) {
                        ip.animPhase += dt * 3;
                        
                        if (ip.refreshTimer > 0) {
                            ip.refreshTimer -= dt;
                            if (ip.refreshTimer <= 0) {
                                ip.investigated = false;
                                ip.hidden = false;
                                ip.worldX = ip.x * this.worldWidth + (Math.random() - 0.5) * this.worldWidth * 0.3;
                                ip.y = H * 0.5 + (Math.random() - 0.5) * H * 0.2;
                                ip.animPhase = Math.random() * Math.PI * 2;
                            }
                        }
                    }
                    
                    for (const ff of this.fireflies) {
                        ff.phase += dt * ff.speed;
                        ff.x += Math.sin(ff.phase) * dt * 10;
                        ff.y += Math.cos(ff.phase * 0.7) * dt * 5;
                        if (ff.x < 0) ff.x += this.worldWidth;
                        if (ff.x > this.worldWidth) ff.x -= this.worldWidth;
                    }
                    
                    this.checkProximity();
                }

                draw(ctx) {
                    if (!this.visible || this.alpha < 0.01) {
                        if (this.visible && this.alpha < 0.01) {
                            console.log('⚠️ AreaScene.draw() 跳过: visible=true, alpha=', this.alpha.toFixed(3));
                        }
                        return;
                    }

                    ctx.save();
                    ctx.globalAlpha = this.alpha;
                    
                    this.drawBackground(ctx);
                    this.drawGround(ctx);
                    this.drawSafePoints(ctx);
                    this.drawInterestPoints(ctx);
                    
                    const playerScreenX = this.playerX - this.cameraX;
                    const playerScreenY = this.playerY;
                    this.drawPlayer(ctx, playerScreenX, playerScreenY);
                    
                    this.drawFireflies(ctx);
                    this.drawClickIndicator(ctx);
                    this.drawUI(ctx);

                    ctx.restore();
                }

                drawBackground(ctx) {
                    const colors = this.areaConfig ? this.areaConfig.bgColor : ['#0a1510', '#152520', '#0d1a15'];
                    const grad = ctx.createLinearGradient(0, 0, 0, H);
                    grad.addColorStop(0, colors[0]);
                    grad.addColorStop(0.5, colors[1]);
                    grad.addColorStop(1, colors[2]);
                    ctx.fillStyle = grad;
                    ctx.fillRect(0, 0, W, H);
                    
                    const seed = seededRandom(this.currentArea ? this.currentArea.charCodeAt(0) : 42);
                    for (let i = 0; i < 40; i++) {
                        const x = seed() * this.worldWidth - this.cameraX;
                        const y = seed() * H * 0.3;
                        const size = seed() * 1.5 + 0.5;
                        const twinkle = Math.sin(this.time * 2 + seed() * Math.PI * 2) * 0.5 + 0.5;
                        ctx.fillStyle = `rgba(255, 255, 255, ${twinkle * 0.4})`;
                        ctx.beginPath();
                        ctx.arc(x, y, size, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }

                drawGround(ctx) {
                    const groundColor = this.areaConfig ? this.areaConfig.groundColor : '#1a2820';
                    ctx.fillStyle = groundColor;
                    
                    ctx.beginPath();
                    ctx.moveTo(0, H);
                    const baseY = H * 0.3;
                    
                    for (let x = 0; x <= W; x += 5) {
                        const worldX = x + this.cameraX;
                        const wave = Math.sin(worldX * 0.01) * 8 + Math.sin(worldX * 0.025) * 4;
                        const y = baseY + wave;
                        ctx.lineTo(x, y);
                    }
                    
                    ctx.lineTo(W, H);
                    ctx.closePath();
                    ctx.fill();
                }
                
                drawPlayer(ctx, sx, sy) {
                    ctx.fillStyle = 'rgba(0,0,0,0.3)';
                    ctx.beginPath();
                    ctx.ellipse(sx, sy + 10, 12, 6, 0, 0, Math.PI * 2);
                    ctx.fill();
                    
                    ctx.font = '32px serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    ctx.fillText(this.playerIcon, sx, sy);
                }

                drawClickIndicator(ctx) {
                    if (this.clickTargetX === null || this.clickIndicatorAlpha < 0.01) return;
                    
                    const screenX = this.clickTargetX - this.cameraX;
                    const screenY = this.clickTargetY;
                    
                    ctx.save();
                    ctx.globalAlpha = this.clickIndicatorAlpha;
                    
                    const pulse = Math.sin(this.time * 4) * 0.3 + 0.7;
                    
                    ctx.strokeStyle = `rgba(100, 200, 255, ${pulse})`;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(screenX, screenY, 15 + Math.sin(this.time * 3) * 3, 0, Math.PI * 2);
                    ctx.stroke();
                    
                    ctx.fillStyle = `rgba(100, 200, 255, ${pulse * 0.3})`;
                    ctx.beginPath();
                    ctx.arc(screenX, screenY, 8, 0, Math.PI * 2);
                    ctx.fill();
                    
                    ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
                    ctx.beginPath();
                    ctx.arc(screenX, screenY, 4, 0, Math.PI * 2);
                    ctx.fill();
                    
                    ctx.restore();
                }

                drawInterestPoints(ctx) {
                    for (const ip of this.interestPoints) {
                        if (ip.hidden) continue;
                        
                        const screenX = ip.worldX - this.cameraX;
                        if (screenX < -100 || screenX > W + 100) continue;
                        
                        const isHovered = this.hoveredPoint === ip;
                        const wobble = Math.sin(ip.animPhase) * (ip.investigated ? 2 : 5);
                        const pulse = 0.5 + Math.sin(ip.animPhase * 0.8) * 0.3;
                        
                        ctx.save();
                        ctx.translate(screenX, ip.y);
                        
                        if (!ip.investigated) {
                            ctx.fillStyle = `rgba(150, 255, 150, ${pulse * 0.3})`;
                            ctx.beginPath();
                            ctx.arc(0, 0, 50, 0, Math.PI * 2);
                            ctx.fill();
                        }
                        
                        ctx.fillStyle = isHovered ? 'rgba(255, 220, 150, 0.5)' : 'rgba(100, 200, 100, 0.4)';
                        ctx.beginPath();
                        ctx.arc(0, 0, 35, 0, Math.PI * 2);
                        ctx.fill();
                        
                        ctx.strokeStyle = isHovered ? 'rgba(255, 220, 150, 0.8)' : 'rgba(150, 255, 150, 0.5)';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.arc(0, 0, 35, 0, Math.PI * 2);
                        ctx.stroke();
                        
                        ctx.font = '32px serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        
                        switch (ip.type) {
                            case 'shaking_bush':
                            case 'rustling_grass':
                                ctx.fillText('🌿', wobble, 0);
                                break;
                            case 'glowing_mushroom':
                                ctx.fillText('🍄', 0, Math.sin(ip.animPhase * 0.5) * 3);
                                break;
                            case 'mysterious_footprint':
                                ctx.fillText('🐾', 0, 0);
                                break;
                            case 'bubbling_spring':
                            case 'bubbling_water':
                            case 'tidal_pool':
                                ctx.fillText('💧', 0, Math.sin(ip.animPhase * 2) * 3);
                                break;
                            case 'flower_patch':
                                ctx.fillText('🌸', 0, Math.sin(ip.animPhase * 0.8) * 2);
                                break;
                            case 'misty_shadow':
                                ctx.fillText('👻', 0, Math.sin(ip.animPhase * 0.5) * 5);
                                break;
                            case 'ripple_spot':
                            case 'wave_splash':
                                ctx.fillText('🌊', 0, Math.sin(ip.animPhase) * 3);
                                break;
                            case 'steaming_vent':
                            case 'glowing_crack':
                                ctx.fillText('🔥', 0, Math.sin(ip.animPhase) * 2);
                                break;
                            case 'shining_sand':
                                ctx.fillText('✨', 0, 0);
                                break;
                            default:
                                ctx.fillText('❓', 0, 0);
                        }
                        
                        if (isHovered) {
                            ctx.fillStyle = '#f0e0c0';
                            ctx.font = `bold ${Math.min(W * 0.025, 10)}px "STKaiti","KaiTi",sans-serif`;
                            ctx.fillText(ip.name, 0, -50);
                            
                            if (!ip.investigated) {
                                ctx.fillStyle = '#ffd700';
                                ctx.font = `${Math.min(W * 0.02, 8)}px sans-serif`;
                                ctx.fillText('点击调查', 0, -38);
                            }
                        }
                        
                        if (ip.investigated) {
                            ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
                            ctx.beginPath();
                            ctx.arc(0, 0, 30, 0, Math.PI * 2);
                            ctx.fill();
                        }
                        
                        ctx.restore();
                    }
                }

                drawSafePoints(ctx) {
                    for (const sp of this.safePoints) {
                        const screenX = sp.worldX - this.cameraX;
                        if (screenX < -100 || screenX > W + 100) continue;
                        
                        const isHovered = this.hoveredPoint === sp;
                        
                        ctx.save();
                        ctx.translate(screenX, sp.y);
                        
                        ctx.fillStyle = 'rgba(255, 200, 100, 0.2)';
                        ctx.beginPath();
                        ctx.arc(0, 0, 45, 0, Math.PI * 2);
                        ctx.fill();
                        
                        const glow = 0.5 + Math.sin(this.time * 2) * 0.3;
                        ctx.fillStyle = `rgba(255, 180, 80, ${glow * 0.5})`;
                        ctx.beginPath();
                        ctx.arc(0, 0, 35, 0, Math.PI * 2);
                        ctx.fill();
                        
                        ctx.font = '32px serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('🏕️', 0, 0);
                        
                        if (isHovered) {
                            ctx.fillStyle = '#f0e0c0';
                            ctx.font = `bold ${Math.min(W * 0.025, 10)}px "STKaiti","KaiTi",sans-serif`;
                            ctx.fillText(sp.name, 0, -55);
                            ctx.fillStyle = '#a0d8f0';
                            ctx.font = `${Math.min(W * 0.02, 8)}px sans-serif`;
                            ctx.fillText('扎营休息', 0, -42);
                        }
                        
                        ctx.restore();
                    }
                }

                drawFireflies(ctx) {
                    for (const ff of this.fireflies) {
                        const screenX = ff.x - this.cameraX;
                        if (screenX < -20 || screenX > W + 20) continue;
                        
                        const brightness = (Math.sin(ff.phase) * 0.5 + 0.5) * ff.brightness;
                        ctx.fillStyle = `rgba(200, 255, 150, ${brightness * 0.8})`;
                        ctx.beginPath();
                        ctx.arc(screenX, ff.y, ff.size, 0, Math.PI * 2);
                        ctx.fill();
                        
                        ctx.fillStyle = `rgba(200, 255, 150, ${brightness * 0.3})`;
                        ctx.beginPath();
                        ctx.arc(screenX, ff.y, ff.size * 3, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }

                drawUI(ctx) {
                    if (this.hintAlpha > 0.01 && this.hintText) {
                        ctx.globalAlpha = this.hintAlpha;
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                        ctx.beginPath();
                        ctx.roundRect(W * 0.15, H * 0.08, W * 0.7, 30, 10);
                        ctx.fill();
                        
                        ctx.fillStyle = '#f0e0c0';
                        ctx.font = `${Math.min(W * 0.025, 10)}px "STKaiti","KaiTi",sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.fillText(this.hintText, W / 2, H * 0.08 + 18);
                        ctx.globalAlpha = this.alpha;
                    }
                    
                    ctx.fillStyle = 'rgba(30, 28, 40, 0.9)';
                    ctx.beginPath();
                    ctx.roundRect(W * 0.3, 20, W * 0.4, 32, 10);
                    ctx.fill();
                    
                    ctx.fillStyle = '#f0e0c0';
                    ctx.font = `bold ${Math.min(W * 0.03, 12)}px "STKaiti","KaiTi",sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText(this.areaConfig ? this.areaConfig.name : '未知区域', W / 2, 38);
                    
                    const backBtnX = 25;
                    const backBtnY = 25;
                    ctx.fillStyle = 'rgba(60, 50, 40, 0.8)';
                    ctx.beginPath();
                    ctx.arc(backBtnX, backBtnY, 18, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#f0e0c0';
                    ctx.font = '16px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('←', backBtnX, backBtnY + 5);
                    
                    if (this.hoveredPoint && !this.hoveredPoint.investigated) {
                        ctx.fillStyle = 'rgba(255,200,100,0.9)';
                        ctx.beginPath();
                        ctx.roundRect(W * 0.35, H - 105, W * 0.3, 40, 10);
                        ctx.fill();
                        ctx.fillStyle = '#1a1a2e';
                        ctx.font = `bold ${Math.min(W * 0.035, 18)}px "STKaiti"`;
                        ctx.textAlign = 'center';
                        ctx.fillText('调查', W / 2, H - 80);
                    }

                    if (this.hoveredPoint && this.safePoints.includes(this.hoveredPoint)) {
                        ctx.fillStyle = 'rgba(100,200,255,0.9)';
                        ctx.beginPath();
                        ctx.roundRect(W * 0.35, H - 105, W * 0.3, 40, 10);
                        ctx.fill();
                        ctx.fillStyle = '#1a1a2e';
                        ctx.font = `bold ${Math.min(W * 0.035, 18)}px "STKaiti"`;
                        ctx.textAlign = 'center';
                        ctx.fillText('扎营', W / 2, H - 80);
                    }

                    // 底部功能按钮栏：背包、队伍（紧凑设计）
                    const bottomBarY = H - 55;
                    const bottomBarH = 55;

                    // 固定宽度按钮，更紧凑
                    const btnWidth = Math.min(120, W * 0.28);  // 最大120px或屏幕28%
                    const btnHeight = 38;
                    const btnGap = 20;  // 两按钮之间的间距
                    const totalBtnWidth = btnWidth * 2 + btnGap;
                    const startX = (W - totalBtnWidth) / 2;  // 居中显示

                    const btnY = bottomBarY + (bottomBarH - btnHeight) / 2;

                    // 背包按钮
                    const bagBtnX = startX;
                    ctx.fillStyle = 'rgba(80, 100, 140, 0.85)';
                    ctx.beginPath();
                    ctx.roundRect(bagBtnX, btnY, btnWidth, btnHeight, 8);
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(150, 180, 220, 0.6)';
                    ctx.lineWidth = 2;
                    ctx.stroke();

                    ctx.fillStyle = '#f0e0c0';
                    ctx.font = `bold ${Math.min(W * 0.035, 14)}px "STKaiti","KaiTi",sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('🎒 背包', bagBtnX + btnWidth / 2, btnY + btnHeight / 2);

                    // 队伍按钮
                    const teamBtnX = startX + btnWidth + btnGap;
                    ctx.fillStyle = 'rgba(100, 140, 100, 0.85)';
                    ctx.beginPath();
                    ctx.roundRect(teamBtnX, btnY, btnWidth, btnHeight, 8);
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(150, 200, 150, 0.6)';
                    ctx.lineWidth = 2;
                    ctx.stroke();

                    ctx.fillStyle = '#f0e0c0';
                    ctx.fillText('👥 队伍', teamBtnX + btnWidth / 2, btnY + btnHeight / 2);
                }

                handlePointerDown(x, y) {
                    this.pointerDownStartX = x;
                    this.pointerDownStartY = y;
                    this.hasSignificantDrag = false;

                    const backBtnX = 25;
                    const backBtnY = 25;
                    if (Math.hypot(x - backBtnX, y - backBtnY) < 16) {
                        this.isBackButtonPressed = true;
                        return;
                    }

                    if (this.hoveredPoint && y > H - 110 && y < H - 60 &&
                        x > W * 0.35 && x < W * 0.65) {
                        return;
                    }

                    const bottomBarY = H - 55;
                    const bottomBarH = 55;
                    const btnWidth = Math.min(120, W * 0.28);
                    const btnHeight = 38;
                    const btnGap = 20;
                    const totalBtnWidth = btnWidth * 2 + btnGap;
                    const startX = (W - totalBtnWidth) / 2;
                    const btnY = bottomBarY + (bottomBarH - btnHeight) / 2;

                    if (y >= btnY && y <= btnY + btnHeight) {
                        return;
                    }
                }

                handlePointerMove(x, y) {
                    const dragDist = Math.hypot(x - this.pointerDownStartX, y - this.pointerDownStartY);
                    if (dragDist > 10) {
                        this.hasSignificantDrag = true;
                    }

                    this.hoveredPoint = null;
                    
                    for (const ip of this.interestPoints) {
                        const screenX = ip.worldX - this.cameraX;
                        const dist = Math.hypot(x - screenX, y - ip.y);
                        if (dist < 35) {
                            this.hoveredPoint = ip;
                            break;
                        }
                    }
                    
                    if (!this.hoveredPoint) {
                        for (const sp of this.safePoints) {
                            const screenX = sp.worldX - this.cameraX;
                            const dist = Math.hypot(x - screenX, y - sp.y);
                            if (dist < 45) {
                                this.hoveredPoint = sp;
                                break;
                            }
                        }
                    }
                }

                handlePointerUp(x, y) {
                    if (this.isBackButtonPressed && !this.hasSignificantDrag) {
                        this.isBackButtonPressed = false;
                        return 'back';
                    }
                    this.isBackButtonPressed = false;

                    // 检查底部功能按钮
                    const bottomBarY = H - 55;
                    const bottomBarH = 55;
                    const btnWidth = Math.min(120, W * 0.28);
                    const btnHeight = 38;
                    const btnGap = 20;
                    const totalBtnWidth = btnWidth * 2 + btnGap;
                    const startX = (W - totalBtnWidth) / 2;
                    const btnY = bottomBarY + (bottomBarH - btnHeight) / 2;

                    if (y >= btnY && y <= btnY + btnHeight) {
                        if (x >= startX && x <= startX + btnWidth) {
                            return 'open_bag';
                        }
                        if (x >= startX + btnWidth + btnGap && x <= startX + btnWidth + btnGap + btnWidth) {
                            return 'open_team';
                        }
                    }

                    const isInvestigateBtnArea = y > H - 110 && y < H - 60 &&
                        x > W * 0.35 && x < W * 0.65;

                    if (isInvestigateBtnArea && this.hoveredPoint && !this.hoveredPoint.investigated && this.interestPoints.includes(this.hoveredPoint)) {
                        const d = Math.hypot(this.playerX - this.hoveredPoint.worldX, this.playerY - this.hoveredPoint.y);
                        if (d < 50) {
                            return this.investigatePoint(this.hoveredPoint);
                        }
                    }

                    if (isInvestigateBtnArea && this.hoveredPoint && this.safePoints.includes(this.hoveredPoint)) {
                        const d = Math.hypot(this.playerX - this.hoveredPoint.worldX, this.playerY - this.hoveredPoint.y);
                        if (d < 50) {
                            return { action: 'camp', point: this.hoveredPoint };
                        }
                    }

                    const clickHoveredPoint = this.getPointAtPosition(x, y);

                    if (clickHoveredPoint && !clickHoveredPoint.investigated && this.interestPoints.includes(clickHoveredPoint)) {
                        const d = Math.hypot(this.playerX - clickHoveredPoint.worldX, this.playerY - clickHoveredPoint.y);
                        if (d < 50) {
                            return this.investigatePoint(clickHoveredPoint);
                        }
                    }

                    if (clickHoveredPoint && this.safePoints.includes(clickHoveredPoint)) {
                        const d = Math.hypot(this.playerX - clickHoveredPoint.worldX, this.playerY - clickHoveredPoint.y);
                        if (d < 50) {
                            return { action: 'camp', point: clickHoveredPoint };
                        }
                    }

                    if (!this.isInUIArea(x, y)) {
                        this.clickTargetX = x + this.cameraX;
                        this.clickTargetY = clamp(y, H * 0.3, H);
                        this.isClickMoving = true;
                    }

                    return null;
                }

                getPointAtPosition(x, y) {
                    for (const ip of this.interestPoints) {
                        const screenX = ip.worldX - this.cameraX;
                        const dist = Math.hypot(x - screenX, y - ip.y);
                        if (dist < 40) {
                            return ip;
                        }
                    }

                    for (const sp of this.safePoints) {
                        const screenX = sp.worldX - this.cameraX;
                        const dist = Math.hypot(x - screenX, y - sp.y);
                        if (dist < 50) {
                            return sp;
                        }
                    }

                    return null;
                }

                isInUIArea(x, y) {
                    if (y < 60) return true;
                    if (x < 50 && y < 55) return true;
                    if (y > H - 55) return true;

                    if (this.hoveredPoint && y > H - 110 && y < H - 60 &&
                        x > W * 0.35 && x < W * 0.65) {
                        return true;
                    }

                    return false;
                }
                
                checkProximity() {
                    const range = 50;
                    this.hoveredPoint = null;
                    
                    for (const ip of this.interestPoints) {
                        if (ip.investigated) continue;
                        const d = Math.hypot(this.playerX - ip.worldX, this.playerY - ip.y);
                        if (d < range) {
                            this.hoveredPoint = ip;
                            break;
                        }
                    }
                    
                    if (!this.hoveredPoint) {
                        for (const sp of this.safePoints) {
                            const d = Math.hypot(this.playerX - sp.worldX, this.playerY - sp.y);
                            if (d < range) {
                                this.hoveredPoint = sp;
                                break;
                            }
                        }
                    }
                }

                investigatePoint(ip) {
                    ip.investigated = true;
                    ip.hidden = true;
                    ip.refreshTimer = 5;
                    
                    const roll = Math.random();
                    if (roll < 0.7) {
                        const config = this.areaConfig;
                        const enemies = config.enemies;
                        const enemySpecies = enemies[Math.floor(Math.random() * enemies.length)];
                        const levelRange = config.enemyLevelRange;
                        const enemyLevel = levelRange[0] + Math.floor(Math.random() * (levelRange[1] - levelRange[0] + 1));
                        
                        return {
                            action: 'battle',
                            enemySpecies,
                            enemyLevel,
                        };
                    } else if (roll < 0.85) {
                        return { action: 'item', item: 'hp_potion' };
                    } else {
                        return { action: 'nothing' };
                    }
                }

                hide() {
                    this.targetAlpha = 0;
                    this.visible = false;
                }

                isPointInside(x, y) {
                    return this.visible && this.alpha > 0.5;
                }
            }

            // ============ 战斗场景 ============
            class BattleScene {
                constructor() {
                    this.visible = false;
                    this.alpha = 0;
                    this.targetAlpha = 0;
                    this.time = 0;
                    
                    this.phase = 'intro';
                    this.phaseTimer = 0;
                    
                    this.playerPet = null;
                    this.enemyPet = null;
                    this.enemyPetData = null;
                    
                    this.battleLog = [];
                    this.currentLog = '';
                    this.logAlpha = 0;
                    
                    this.playerPetX = W * 0.25;
                    this.playerPetY = H * 0.65;
                    this.enemyPetX = W * 0.75;
                    this.enemyPetY = H * 0.35;
                    this.playerPetOffset = { x: 0, y: 0 };
                    this.enemyPetOffset = { x: 0, y: 0 };
                    this.attackAnim = null;
                    
                    this.selectedAction = null;
                    this.selectedSkill = null;
                    this.skillButtons = [];
                    this.hoveredButton = null;
                    
                    this.showBagPanel = false;
                    this.bagPanelAlpha = 0;
                    this.bagScrollY = 0;
                    this.hoveredBagItem = null;
                    
                    this.showPetPanel = false;
                    this.petPanelAlpha = 0;
                    this.hoveredPetItem = null;
                    
                    this.catchAnim = null;
                    this.catchResult = null;
                    
                    this.battleResult = null;
                    this.expGained = 0;
                    this.evGained = 0;
                    
                    this.turnOrder = null;
                    this.currentTurnIndex = 0;
                    this.enemySkill = null;
                }

                init(playerPet, enemySpeciesId, enemyLevel) {
                    this.visible = true;
                    this.targetAlpha = 1;
                    this.time = 0;
                    this.phase = 'intro';
                    this.phaseTimer = 0;
                    this.battleLog = [];
                    this.currentLog = '';
                    this.logAlpha = 0;
                    this.selectedAction = null;
                    this.selectedSkill = null;
                    this.showBagPanel = false;
                    this.bagPanelAlpha = 0;
                    this.bagScrollY = 0;
                    this.showPetPanel = false;
                    this.petPanelAlpha = 0;
                    this.battleResult = null;
                    this.expGained = 0;
                    this.evGained = 0;
                    this.attackAnim = null;
                    this.catchAnim = null;
                    this.turnOrder = null;
                    this.currentTurnIndex = 0;
                    this.enemySkill = null;
                    
                    this.playerPet = playerPet;
                    this.playerPet.resetCooldown();
                    this.playerPet.rechargePp(999);

                    this.enemyPet = Pet.createRandom(enemySpeciesId, enemyLevel, '野外遭遇');
                    this.enemyPetData = {
                        speciesId: enemySpeciesId,
                        level: enemyLevel,
                    };
                    
                    this.updateSkillButtons();
                }

                updateSkillButtons() {
                    this.skillButtons = [];
                    if (this.playerPet) {
                        const skills = this.playerPet.getAllSkills();
                        for (let i = 0; i < 4; i++) {
                            if (skills[i]) {
                                this.skillButtons.push({
                                    skill: skills[i],
                                    index: i,
                                    x: 0,
                                    y: 0,
                                    width: 70,
                                    height: 40,
                                });
                            }
                        }
                    }
                }

                update(dt) {
                    this.time += dt;
                    this.phaseTimer += dt;
                    this.alpha = lerp(this.alpha, this.targetAlpha, dt * 8);

                    // 更新动画
                    this.updateAnimations(dt);

                    // 更新阶段（仅在战斗初始化后）
                    if (this.enemyPet) {
                        this.updatePhase(dt);
                    }

                    // 更新日志
                    if (this.logAlpha > 0) {
                        this.logAlpha = lerp(this.logAlpha, 0, dt * 0.5);
                    }
                }

                updateAnimations(dt) {
                    // 攻击动画
                    if (this.attackAnim) {
                        this.attackAnim.timer += dt;
                        const t = this.attackAnim.timer / this.attackAnim.duration;
                        
                        if (this.attackAnim.type === 'player') {
                            const progress = t < 0.5 ? t * 2 : 2 - t * 2;
                            this.playerPetOffset.x = progress * 50;
                        } else {
                            const progress = t < 0.5 ? t * 2 : 2 - t * 2;
                            this.enemyPetOffset.x = -progress * 50;
                        }
                        
                        if (t >= 1) {
                            this.attackAnim = null;
                            this.playerPetOffset = { x: 0, y: 0 };
                            this.enemyPetOffset = { x: 0, y: 0 };
                        }
                    }

                    // 捕捉动画
                    if (this.catchAnim) {
                        this.catchAnim.timer += dt;
                        const t = this.catchAnim.timer / this.catchAnim.duration;
                        
                        if (t >= 1) {
                            if (this.catchAnim.result === 'success') {
                                this.battleResult = 'catch';
                                this.phase = 'result';
                            } else {
                                this.catchAnim = null;
                                this.phase = 'enemyAttack';
                                this.phaseTimer = 0;
                            }
                        }
                    }
                }

                // ============ 战斗状态机配置 ============
                get phaseConfig() {
                    return {
                        intro: {
                            duration: 1.5,
                            waitForAnim: false,
                            nextState: 'selectAction',
                            onEnter: () => this.addLog(`野生的 ${this.enemyPet.name} 出现了！`),
                        },
                        selectAction: {
                            duration: Infinity,
                            waitForAnim: false,
                            isTerminal: true,  // 等待玩家选择技能，不自动转换
                        },
                        executeTurn: {
                            duration: 0.3,
                            waitForAnim: true,
                            action: () => this.executeTurnOrder(),
                        },
                        firstAttack: {
                            duration: 0.5,
                            waitForAnim: true,
                            action: () => this.executeFirstAttack(),
                        },
                        secondAttack: {
                            duration: 0.5,
                            waitForAnim: true,
                            action: () => this.executeSecondAttack(),
                        },
                        playerAttack: {
                            duration: 0.5,
                            waitForAnim: true,
                            action: () => this.executePlayerAttack(),
                        },
                        enemyAttack: {
                            duration: 0.5,
                            waitForAnim: true,
                            action: () => this.executeEnemyAttack(),
                        },
                        result: {
                            duration: Infinity,
                            waitForAnim: false,
                            isTerminal: true,
                        },
                    };
                }

                updatePhase(dt) {
                    const config = this.phaseConfig[this.phase];
                    if (!config) {
                        console.warn(`⚠️ 未知的战斗阶段: ${this.phase}`);
                        return;
                    }

                    // 终端状态不自动转换
                    if (config.isTerminal) return;

                    // 检查是否满足转换条件
                    const animComplete = !config.waitForAnim || !this.attackAnim;
                    const timeElapsed = this.phaseTimer >= config.duration;

                    if (animComplete && timeElapsed) {
                        // 记录当前phase，用于后续验证
                        const previousPhase = this.phase;

                        // 执行进入下一状态的回调或动作
                        if (config.onEnter) {
                            config.onEnter();
                        }
                        if (config.action) {
                            config.action();
                        }

                        // 状态转换：如果action中没有手动设置phase，则自动转换到nextState
                        if (config.nextState && this.phase === previousPhase) {
                            console.log(`🔄 战斗阶段转换: ${previousPhase} → ${config.nextState}`);
                            this.phase = config.nextState;
                            this.phaseTimer = 0;
                        }
                    }
                }

                executeTurnOrder() {
                    const playerSpd = this.playerPet.getSpd();
                    const enemySpd = this.enemyPet.getSpd();
                    
                    this.enemySkill = this.enemyPet.getAllSkills()[Math.floor(Math.random() * this.enemyPet.getAllSkills().length)];
                    
                    if (playerSpd >= enemySpd) {
                        this.turnOrder = ['player', 'enemy'];
                        this.addLog(`${this.playerPet.name} 速度更快，先手攻击！`);
                    } else {
                        this.turnOrder = ['enemy', 'player'];
                        this.addLog(`野生的 ${this.enemyPet.name} 速度更快，先手攻击！`);
                    }
                    
                    this.currentTurnIndex = 0;
                    this.phase = 'firstAttack';
                    this.phaseTimer = 0;
                }

                executeFirstAttack() {
                    const attacker = this.turnOrder[0];
                    if (attacker === 'player') {
                        this.executePlayerAttackInternal();
                    } else {
                        this.executeEnemyAttackInternal();
                    }
                }

                executeSecondAttack() {
                    const attacker = this.turnOrder[1];
                    if (attacker === 'player') {
                        if (this.playerPet.isFainted()) {
                            this.endTurn();
                            return;
                        }
                        this.executePlayerAttackInternal();
                    } else {
                        if (this.enemyPet.isFainted()) {
                            this.endTurn();
                            return;
                        }
                        this.executeEnemyAttackInternal();
                    }
                }

                executePlayerAttackInternal() {
                    const skill = this.selectedSkill;
                    if (!skill) {
                        this.endTurn();
                        return;
                    }
                    
                    if (skill.currentPp <= 0) {
                        this.addLog('PP不足！');
                        this.endTurn();
                        return;
                    }
                    if (skill.currentPp !== Infinity) {
                        skill.currentPp = Math.max(0, skill.currentPp - 1);
                    }
                    
                    const damage = this.calculateDamage(this.playerPet, this.enemyPet, skill);
                    this.enemyPet.takeDamage(damage);
                    
                    // 计算属性克制效果
                    const effectiveness = getEffectiveness(skill.element, this.enemyPet.species.element.id);
                    const effectText = effectiveness >= 2 ? '【强效】' : effectiveness <= 0.5 ? '【弱效】' : '';
                    
                    this.addLog(`${this.playerPet.name} 使用了 ${skill.name}！${effectText}`);
                    if (damage > 0) {
                        this.addLog(`造成了 ${damage} 点伤害！`);
                    }
                    
                    this.attackAnim = {
                        type: 'player',
                        timer: 0,
                        duration: 0.5,
                    };
                    
                    if (this.enemyPet.isFainted()) {
                        this.onEnemyFainted();
                    } else {
                        this.proceedToNextAttack();
                    }
                }

                executeEnemyAttackInternal() {
                    const skill = this.enemySkill;
                    const damage = this.calculateDamage(this.enemyPet, this.playerPet, skill);
                    this.playerPet.takeDamage(damage);
                    
                    // 计算属性克制效果
                    const effectiveness = getEffectiveness(skill.element, this.playerPet.species.element.id);
                    const effectText = effectiveness >= 2 ? '【强效】' : effectiveness <= 0.5 ? '【弱效】' : '';
                    
                    this.addLog(`野生的 ${this.enemyPet.name} 使用了 ${skill.name}！${effectText}`);
                    if (damage > 0) {
                        this.addLog(`${this.playerPet.name} 受到了 ${damage} 点伤害！`);
                    }
                    
                    this.attackAnim = {
                        type: 'enemy',
                        timer: 0,
                        duration: 0.5,
                    };
                    
                    if (this.playerPet.isFainted()) {
                        this.onPlayerFainted();
                    } else {
                        this.proceedToNextAttack();
                    }
                }

                proceedToNextAttack() {
                    if (this.currentTurnIndex === 0) {
                        this.currentTurnIndex = 1;
                        this.phase = 'secondAttack';
                        this.phaseTimer = 0;
                    } else {
                        this.endTurn();
                    }
                }

                endTurn() {
                    this.selectedSkill = null;
                    this.enemySkill = null;
                    this.turnOrder = null;
                    this.phase = 'selectAction';
                    this.phaseTimer = 0;
                }

                executePlayerAttack() {
                    if (!this.selectedSkill) return;

                    const skill = this.selectedSkill;

                    if (skill.currentPp <= 0) {
                        this.addLog('PP不足！');
                        this.phase = 'selectAction';
                        this.selectedSkill = null;
                        return;
                    }
                    if (skill.currentPp !== Infinity) {
                        skill.currentPp = Math.max(0, skill.currentPp - 1);
                    }
                    
                    const damage = this.calculateDamage(this.playerPet, this.enemyPet, skill);
                    this.enemyPet.takeDamage(damage);
                    
                    this.addLog(`${this.playerPet.name} 使用了 ${skill.name}！`);
                    if (damage > 0) {
                        this.addLog(`造成了 ${damage} 点伤害！`);
                    }
                    
                    this.attackAnim = {
                        type: 'player',
                        timer: 0,
                        duration: 0.5,
                    };
                    
                    if (this.enemyPet.isFainted()) {
                        this.onEnemyFainted();
                    } else {
                        this.phase = 'enemyAttack';
                        this.phaseTimer = 0;
                    }
                    
                    this.selectedSkill = null;
                }

                executeEnemyAttack() {
                    const skills = this.enemyPet.getAllSkills();
                    const skill = skills[Math.floor(Math.random() * skills.length)];
                    
                    const damage = this.calculateDamage(this.enemyPet, this.playerPet, skill);
                    this.playerPet.takeDamage(damage);
                    
                    this.addLog(`野生的 ${this.enemyPet.name} 使用了 ${skill.name}！`);
                    if (damage > 0) {
                        this.addLog(`${this.playerPet.name} 受到了 ${damage} 点伤害！`);
                    }
                    
                    this.attackAnim = {
                        type: 'enemy',
                        timer: 0,
                        duration: 0.5,
                    };
                    
                    if (this.playerPet.isFainted()) {
                        this.onPlayerFainted();
                    } else {
                        this.phase = 'selectAction';
                        this.phaseTimer = 0;
                    }
                }

                calculateDamage(attacker, defender, skill) {
                    if (skill.type !== SkillType.DAMAGE || !skill.power) return 0;

                    const LV = attacker.level;
                    const attackType = skill.attackType || 'atk';

                    const atk = attackType === 'spa' ? attacker.getSpa() : attacker.getAtk();
                    const def = attackType === 'spa' ? defender.getRes() : defender.getDef();

                    const baseDamage = (LV * 0.4 + 2) * skill.power * atk / def / 50 + 2;

                    let modifier = getEffectiveness(skill.element, defender.species.element.id);

                    const talentInfo = attacker.getTalentRating();
                    if (talentInfo.rating === '王者无敌' && skill.isFixed) {
                        modifier *= 1.05;
                    }

                    const random = (234 + Math.random() * 27) / 255;

                    const critical = Math.random() < 0.0625 ? 2 : 1;

                    const damage = Math.floor(baseDamage * modifier * random * critical);
                    return Math.max(1, damage);
                }

                onEnemyFainted() {
                    const expGain = this.enemyPet.species.expYield * this.enemyPet.level;
                    this.playerPet.addExp(expGain);
                    this.expGained = expGain;
                    
                    let evGain = 0;
                    const evYield = this.enemyPet.species.evYield;
                    if (evYield) {
                        for (const stat in evYield) {
                            evGain += evYield[stat];
                        }
                    }
                    this.evGained = evGain;
                    this.playerPet.addTrainingPoints(evGain);
                    
                    this.battleResult = 'win';
                    this.phase = 'result';
                    this.addLog(`野生的 ${this.enemyPet.name} 被击败了！`);
                    this.addLog(`${this.playerPet.name} 获得了 ${expGain} 点经验！`);
                    if (evGain > 0) {
                        this.addLog(`${this.playerPet.name} 获得了 ${evGain} 点修行点！`);
                    }
                }

                onPlayerFainted() {
                    this.battleResult = 'lose';
                    this.phase = 'result';
                    this.addLog(`${this.playerPet.name} 倒下了...`);
                }

                tryCatch(ballId) {
                    const ball = ItemsDB[ballId];
                    if (!ball || ball.type !== ItemType.BALL) return false;

                    // 先检查队伍是否已满
                    if (gs.petManager.team.length >= gs.petManager.maxTeamSize) {
                        this.addLog(`⚠️ 队伍已满（${gs.petManager.maxTeamSize}只），无法捕捉！`);
                        this.addLog('请先将宠物存入仓库');
                        return false;
                    }

                    gs.bagManager.removeItem(ballId, 1);
                    
                    const catchRate = this.calculateCatchRate(ball.catchRate);
                    const roll = Math.random() * 100;
                    
                    this.addLog(`使用了 ${ball.name}！`);
                    
                    this.catchAnim = {
                        timer: 0,
                        duration: 2,
                        result: roll < catchRate ? 'success' : 'fail',
                    };
                    this.phase = 'catch';
                    
                    if (this.catchAnim.result === 'success') {
                        this.enemyPet.metLocation = '野外捕捉';
                        this.enemyPet.metTime = Date.now();
                        this.enemyPet.isNew = true;

                        // 优先加入队伍
                        const teamResult = gs.petManager.addToTeam(this.enemyPet);
                        if (teamResult.success) {
                            this.addLog(`成功捕捉了 ${this.enemyPet.name}！已加入队伍`);
                            this.catchAnim.addTo = 'team';
                        } else if (teamResult.reason === 'team_full') {
                            // 队伍满了，提示无法捕捉
                            this.addLog(`队伍已满（${gs.petManager.maxTeamSize}只），无法捕捉 ${this.enemyPet.name}！`);
                            this.addLog('请先在队伍管理中将宠物存入仓库');
                            this.catchAnim.result = 'fail';
                            this.catchAnim.failReason = 'team_full';
                        } else {
                            this.addLog(`捕捉失败...`);
                        }
                    } else {
                        this.addLog(`捕捉失败...`);
                    }
                    
                    return true;
                }

                usePotion(potionId) {
                    const potion = ItemsDB[potionId];
                    if (!potion || potion.type !== ItemType.POTION) return false;
                    
                    gs.bagManager.removeItem(potionId, 1);
                    
                    const healAmount = potion.healAmount || 20;
                    const oldHp = this.playerPet.currentHp;
                    this.playerPet.heal(healAmount);
                    const actualHeal = this.playerPet.currentHp - oldHp;
                    
                    this.addLog(`使用了 ${potion.name}！`);
                    this.addLog(`${this.playerPet.name} 恢复了 ${actualHeal} HP！`);
                    
                    this.phase = 'enemyAttack';
                    this.phaseTimer = 0;
                    
                    return true;
                }

                switchPet(newPet) {
                    this.addLog(`${this.playerPet.name} 回来了！`);
                    this.playerPet = newPet;
                    this.addLog(`加油，${newPet.name}！`);
                    
                    this.updateSkillButtons();
                    
                    this.phase = 'enemyAttack';
                    this.phaseTimer = 0;
                    
                    return true;
                }

                calculateCatchRate(ballRate) {
                    const baseRate = this.enemyPet.species.catchRate;
                    const hpFactor = 1 - (this.enemyPet.currentHp / this.enemyPet.getMaxHp()) * 0.5;
                    const statusFactor = this.enemyPet.status ? 1.5 : 1;
                    
                    let talentFactor = 1;
                    const talentInfo = this.playerPet.getTalentRating();
                    if (talentInfo.rating === '王者无敌') {
                        talentFactor = 1.1;
                    } else if (talentInfo.rating === '万众瞩目') {
                        talentFactor = 1.08;
                    } else if (talentInfo.rating === '千载难逢') {
                        talentFactor = 1.05;
                    }
                    
                    return Math.min(100, baseRate * ballRate * hpFactor * statusFactor * talentFactor);
                }

                tryFlee() {
                    // 逃跑成功率
                    const fleeRate = 70 + (this.playerPet.getSpd() - this.enemyPet.getSpd()) * 2;
                    
                    if (Math.random() * 100 < fleeRate) {
                        this.battleResult = 'flee';
                        this.phase = 'result';
                        this.addLog('成功逃跑了！');
                        return true;
                    } else {
                        this.addLog('逃跑失败...');
                        this.phase = 'enemyAttack';
                        this.phaseTimer = 0;
                        return false;
                    }
                }

                addLog(text) {
                    this.currentLog = text;
                    this.logAlpha = 1;
                    this.battleLog.push(text);
                }

                draw(ctx) {
                    if (!this.visible || this.alpha < 0.01) return;

                    ctx.save();
                    ctx.globalAlpha = this.alpha;

                    this.drawBackground(ctx);

                    this.drawEnemyPet(ctx);

                    this.drawPlayerPet(ctx);

                    this.drawBattleUI(ctx);

                    this.drawBattleLog(ctx);

                    if (this.catchAnim) {
                        this.drawCatchAnimation(ctx);
                    }

                    if (this.phase === 'result') {
                        this.drawResult(ctx);
                    }

                    if (this.showBagPanel || this.bagPanelAlpha > 0.01) {
                        this.drawBattleBagPanel(ctx);
                    }

                    if (this.showPetPanel || this.petPanelAlpha > 0.01) {
                        this.drawBattlePetPanel(ctx);
                    }

                    ctx.restore();
                }

                drawBackground(ctx) {
                    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
                    bgGrad.addColorStop(0, '#1a2a3a');
                    bgGrad.addColorStop(0.5, '#2a3a4a');
                    bgGrad.addColorStop(1, '#1a2a2a');
                    ctx.fillStyle = bgGrad;
                    ctx.fillRect(0, 0, W, H);

                    // 地面
                    ctx.fillStyle = '#2a3a3a';
                    ctx.beginPath();
                    ctx.ellipse(W / 2, H * 0.75, W * 0.6, H * 0.15, 0, 0, Math.PI * 2);
                    ctx.fill();
                }

                drawEnemyPet(ctx) {
                    if (!this.enemyPet) return;
                    
                    // 宠物位置 - 右上方
                    const petX = W * 0.72 + this.enemyPetOffset.x;
                    const petY = H * 0.32 + this.enemyPetOffset.y;
                    const element = this.enemyPet.species.element;
                    
                    // 属性光晕
                    ctx.fillStyle = element.color;
                    ctx.globalAlpha = 0.2 + Math.sin(this.time * 2) * 0.1;
                    ctx.beginPath();
                    ctx.arc(petX, petY, 55, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.globalAlpha = 1;
                    
                    // 宠物图标 - 更大尺寸
                    ctx.font = '65px serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    
                    const battleEnemyIconSize = 65 * 1.8;
                    
                    if (!drawCustomPetIcon(ctx, this.enemyPet.speciesId, petX, petY, battleEnemyIconSize)) {
                        ctx.fillText(this.getPetIcon(this.enemyPet.speciesId), petX, petY);
                    }
                    
                    // 顶部状态栏 - 敌人侧（右侧）
                    const barWidth = W * 0.42;
                    const barHeight = 70;
                    const barX = W * 0.55;
                    const barY = 15;
                    
                    // 背景框
                    ctx.fillStyle = 'rgba(35, 32, 50, 0.95)';
                    ctx.beginPath();
                    ctx.roundRect(barX, barY, barWidth, barHeight, 12);
                    ctx.fill();
                    
                    // 边框
                    ctx.strokeStyle = 'rgba(255, 107, 107, 0.4)';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.roundRect(barX, barY, barWidth, barHeight, 12);
                    ctx.stroke();
                    
                    // 敌人HP条
                    const hpBarX = barX + 15;
                    const hpBarY = barY + 35;
                    const hpBarW = barWidth - 30;
                    const hpPercent = this.enemyPet.currentHp / this.enemyPet.getMaxHp();
                    
                    // HP条背景
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                    ctx.beginPath();
                    ctx.roundRect(hpBarX, hpBarY, hpBarW, 14, 4);
                    ctx.fill();
                    
                    // HP条
                    ctx.fillStyle = hpPercent > 0.5 ? '#4ecdc4' : hpPercent > 0.2 ? '#ffd93d' : '#ff6b6b';
                    ctx.beginPath();
                    ctx.roundRect(hpBarX, hpBarY, hpBarW * hpPercent, 14, 4);
                    ctx.fill();
                    
                    // HP数值
                    ctx.fillStyle = '#fff';
                    ctx.font = 'bold 12px sans-serif';
                    ctx.textAlign = 'right';
                    ctx.fillText(`${this.enemyPet.currentHp}/${this.enemyPet.getMaxHp()}`, barX + barWidth - 15, hpBarY + 10);
                    
                    // 名字和等级
                    ctx.fillStyle = '#f0e0c0';
                    ctx.font = 'bold 14px "STKaiti","KaiTi",sans-serif';
                    ctx.textAlign = 'left';
                    ctx.fillText(this.enemyPet.name, barX + 15, barY + 22);

                    // 属性图标（限制位置避免溢出）
                    const enemyElement = this.enemyPet.species.element;
                    if (enemyElement && enemyElement.icon) {
                        ctx.font = '16px serif';
                        const nameWidth = ctx.measureText(this.enemyPet.name).width;
                        const iconX = Math.min(barX + 15 + nameWidth + 8, barX + barWidth - 55);
                        ctx.fillText(enemyElement.icon, iconX, barY + 22);
                    }
                    
                    ctx.fillStyle = '#ffd700';
                    ctx.font = '12px sans-serif';
                    ctx.textAlign = 'right';
                    ctx.fillText(`Lv.${this.enemyPet.level}`, barX + barWidth - 15, barY + 22);
                }

                drawPlayerPet(ctx) {
                    if (!this.playerPet) return;
                    
                    // 宠物位置 - 左下方
                    const petX = W * 0.28 + this.playerPetOffset.x;
                    const petY = H * 0.58 + this.playerPetOffset.y;
                    const element = this.playerPet.species.element;
                    
                    // 属性光晕
                    ctx.fillStyle = element.color;
                    ctx.globalAlpha = 0.2 + Math.sin(this.time * 2) * 0.1;
                    ctx.beginPath();
                    ctx.arc(petX, petY, 55, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.globalAlpha = 1;
                    
                    // 宠物图标 - 更大尺寸
                    ctx.font = '65px serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    
                    const battlePlayerIconSize = 65 * 1.8;
                    
                    if (!drawCustomPetIcon(ctx, this.playerPet.speciesId, petX, petY, battlePlayerIconSize)) {
                        ctx.fillText(this.getPetIcon(this.playerPet.speciesId), petX, petY);
                    }
                    
                    // 顶部状态栏 - 玩家侧（左侧）
                    const barWidth = W * 0.42;
                    const barHeight = 70;
                    const barX = W * 0.03;
                    const barY = 15;
                    
                    // 背景框
                    ctx.fillStyle = 'rgba(35, 32, 50, 0.95)';
                    ctx.beginPath();
                    ctx.roundRect(barX, barY, barWidth, barHeight, 12);
                    ctx.fill();
                    
                    // 边框
                    ctx.strokeStyle = 'rgba(78, 205, 196, 0.4)';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.roundRect(barX, barY, barWidth, barHeight, 12);
                    ctx.stroke();
                    
                    // 玩家HP条
                    const hpBarX = barX + 15;
                    const hpBarY = barY + 35;
                    const hpBarW = barWidth - 30;
                    const hpPercent = this.playerPet.currentHp / this.playerPet.getMaxHp();
                    
                    // HP条背景
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                    ctx.beginPath();
                    ctx.roundRect(hpBarX, hpBarY, hpBarW, 14, 4);
                    ctx.fill();
                    
                    // HP条
                    ctx.fillStyle = hpPercent > 0.5 ? '#4ecdc4' : hpPercent > 0.2 ? '#ffd93d' : '#ff6b6b';
                    ctx.beginPath();
                    ctx.roundRect(hpBarX, hpBarY, hpBarW * hpPercent, 14, 4);
                    ctx.fill();
                    
                    // HP数值
                    ctx.fillStyle = '#fff';
                    ctx.font = 'bold 12px sans-serif';
                    ctx.textAlign = 'right';
                    ctx.fillText(`${this.playerPet.currentHp}/${this.playerPet.getMaxHp()}`, barX + barWidth - 15, hpBarY + 10);
                    
                    // 名字和等级
                    ctx.fillStyle = '#f0e0c0';
                    ctx.font = 'bold 14px "STKaiti","KaiTi",sans-serif';
                    ctx.textAlign = 'left';
                    ctx.fillText(this.playerPet.name, barX + 15, barY + 22);
                    
                    // 属性图标（限制位置避免溢出）
                    const playerElement = this.playerPet.species.element;
                    if (playerElement && playerElement.icon) {
                        ctx.font = '16px serif';
                        const nameWidth = ctx.measureText(this.playerPet.name).width;
                        const iconX = Math.min(barX + 15 + nameWidth + 8, barX + barWidth - 55);
                        ctx.fillText(playerElement.icon, iconX, barY + 22);
                    }
                    
                    ctx.fillStyle = '#ffd700';
                    ctx.font = '12px sans-serif';
                    ctx.textAlign = 'right';
                    ctx.fillText(`Lv.${this.playerPet.level}`, barX + barWidth - 15, barY + 22);
                    
                    // 经验条（放在底部面板上方）
                    const expBarY = barY + barHeight + 5;
                    const expPercent = this.playerPet.exp / this.playerPet.getExpToNextLevel();
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                    ctx.beginPath();
                    ctx.roundRect(barX, expBarY, barWidth, 6, 3);
                    ctx.fill();
                    ctx.fillStyle = '#a0d8f0';
                    ctx.beginPath();
                    ctx.roundRect(barX, expBarY, barWidth * expPercent, 6, 3);
                    ctx.fill();
                }

                drawBattleUI(ctx) {
                    if (this.phase === 'result' || this.phase === 'intro') return;
                    
                    // 底部面板 - 稍微加高
                    const panelY = H - 150;
                    ctx.fillStyle = 'rgba(25, 23, 35, 0.95)';
                    ctx.beginPath();
                    ctx.roundRect(0, panelY, W, 150, 15);
                    ctx.fill();
                    
                    // 顶部装饰线
                    const lineGrad = ctx.createLinearGradient(0, 0, W, 0);
                    lineGrad.addColorStop(0, 'rgba(180, 160, 120, 0)');
                    lineGrad.addColorStop(0.3, 'rgba(180, 160, 120, 0.4)');
                    lineGrad.addColorStop(0.7, 'rgba(180, 160, 120, 0.4)');
                    lineGrad.addColorStop(1, 'rgba(180, 160, 120, 0)');
                    ctx.strokeStyle = lineGrad;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(0, panelY + 0.5);
                    ctx.lineTo(W, panelY + 0.5);
                    ctx.stroke();
                    
                    if (this.phase === 'selectAction') {
                        this.drawActionButtons(ctx, panelY);
                    }
                }

                drawActionButtons(ctx, panelY) {
                    // 功能按钮 - 贴着上边
                    const funcBtnY = panelY + 2;
                    const funcBtnGap = 10;
                    const funcBtnW = (W - funcBtnGap * 5) / 4;
                    const funcBtns = [
                        { id: 'bag', name: '背包', icon: '🎒' },
                        { id: 'catch', name: '捕捉', icon: '🔴' },
                        { id: 'pet', name: '换宠', icon: '🔄' },
                        { id: 'flee', name: '逃跑', icon: '🏃' },
                    ];
                    
                    for (let i = 0; i < funcBtns.length; i++) {
                        const btn = funcBtns[i];
                        const btnX = funcBtnGap + i * (funcBtnW + funcBtnGap);
                        const isHovered = this.hoveredButton === btn.id;
                        
                        ctx.fillStyle = isHovered ? 'rgba(60, 50, 40, 0.9)' : 'rgba(40, 38, 50, 0.9)';
                        ctx.beginPath();
                        ctx.roundRect(btnX, funcBtnY, funcBtnW, 36, 10);
                        ctx.fill();
                        
                        ctx.strokeStyle = isHovered ? 'rgba(180, 160, 140, 0.5)' : 'rgba(100, 90, 80, 0.3)';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.roundRect(btnX, funcBtnY, funcBtnW, 36, 10);
                        ctx.stroke();
                        
                        ctx.font = '20px serif';
                        ctx.textAlign = 'center';
                        ctx.fillText(btn.icon, btnX + funcBtnW / 2 - 15, funcBtnY + 23);
                        
                        ctx.fillStyle = '#c8b898';
                        ctx.font = 'bold 13px "STKaiti","KaiTi",sans-serif';
                        ctx.fillText(btn.name, btnX + funcBtnW / 2 + 12, funcBtnY + 23);
                    }
                    
                    // 技能按钮 - 2行2列布局，紧凑设计防止溢出
                    const skillStartX = 10;
                    const skillY = funcBtnY + 38; // 紧凑间距
                    const cols = 2;
                    const btnGap = 6; // 减小行间距
                    const btnW = (W - skillStartX * 2 - btnGap * (cols - 1)) / cols;
                    const btnH = 50; // 优化高度

                    for (let i = 0; i < this.skillButtons.length; i++) {
                        const btn = this.skillButtons[i];
                        const col = i % cols;
                        const row = Math.floor(i / cols);
                        btn.x = skillStartX + col * (btnW + btnGap);
                        btn.y = skillY + row * (btnH + btnGap);
                        btn.width = btnW;
                        btn.height = btnH;
                        
                        const isHovered = this.hoveredButton === 'skill_' + i;
                        const skill = btn.skill;
                        const element = Element[skill.element.toUpperCase()] || Element.NEUTRAL;
                        const isDisabled = skill.currentPp <= 0;
                        
                        // 获取技能属性信息
                        const skillElement = Object.values(Element).find(e => e.id === skill.element) || Element.NORMAL;
                        const effectiveness = this.enemyPet ? getEffectiveness(skill.element, this.enemyPet.species.element.id) : 1;
                        const effectivenessText = effectiveness >= 2 ? '强效' : effectiveness <= 0.5 ? '弱效' : '';
                        const effectivenessColor = effectiveness >= 2 ? '#4CAF50' : effectiveness <= 0.5 ? '#FF5722' : 'transparent';
                        
                        ctx.fillStyle = isDisabled ? 'rgba(30, 28, 35, 0.95)' : 
                                        isHovered ? 'rgba(65, 55, 45, 0.95)' : 'rgba(45, 40, 55, 0.95)';
                        ctx.beginPath();
                        ctx.roundRect(btn.x, btn.y, btn.width, btn.height, 12);
                        ctx.fill();
                        
                        // 属性颜色边框
                        ctx.strokeStyle = skillElement.color || '#888';
                        ctx.globalAlpha = skill.isFixed ? 1 : (isHovered ? 0.8 : 0.5);
                        ctx.lineWidth = skill.isFixed ? 3 : 2;
                        ctx.beginPath();
                        ctx.roundRect(btn.x, btn.y, btn.width, btn.height, 12);
                        ctx.stroke();
                        ctx.globalAlpha = 1;
                        
                        // 属性图标（左上角）
                        if (skillElement.icon) {
                            ctx.font = '16px serif';
                            ctx.textAlign = 'left';
                            ctx.fillText(skillElement.icon, btn.x + 6, btn.y + 15);
                        }

                        // 技能名称
                        ctx.fillStyle = isDisabled ? '#666' : '#f5e6c8';
                        ctx.font = 'bold 13px "STKaiti","KaiTi",sans-serif';
                        ctx.textAlign = 'center';
                        ctx.fillText(skill.name, btn.x + btn.width / 2 + 5, btn.y + 17);

                        // 威力和克制提示
                        if (skill.power) {
                            ctx.fillStyle = isDisabled ? '#555' : '#a0d8f0';
                            ctx.font = '10px sans-serif';
                            ctx.textAlign = 'left';
                            ctx.fillText(`威力${skill.power}`, btn.x + 6, btn.y + 32);

                            // 攻击类型图标
                            const attackType = skill.attackType || 'atk';
                            const typeLabel = attackType === 'spa' ? '✨特' : '⚔物';
                            const typeColor = attackType === 'spa' ? (isDisabled ? '#555' : '#e0a0ff') : (isDisabled ? '#555' : '#ffb080');
                            ctx.fillStyle = typeColor;
                            ctx.font = '9px sans-serif';
                            ctx.textAlign = 'right';
                            const typeX = effectivenessText && !isDisabled ? btn.x + btn.width - 40 : btn.x + btn.width - 8;
                            ctx.fillText(typeLabel, typeX, btn.y + 32);

                            // 克制提示
                            if (effectivenessText && !isDisabled) {
                                ctx.fillStyle = effectivenessColor;
                                ctx.font = 'bold 9px sans-serif';
                                ctx.textAlign = 'right';
                                ctx.fillText(effectivenessText, btn.x + btn.width - 6, btn.y + 32);
                            }
                        }

                        // PP显示（统一格式）
                        ctx.fillStyle = skill.currentPp <= 0 ? '#ff6b6b' : (skill.isFixed ? '#ffd700' : '#88c8a0');
                        ctx.font = '9px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.fillText(`PP ${skill.currentPp}/${skill.pp}`, btn.x + btn.width / 2, btn.y + 44);
                    }
                }

                drawBattleLog(ctx) {
                    if (this.logAlpha < 0.01) return;
                    
                    ctx.globalAlpha = this.logAlpha;
                    
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                    ctx.beginPath();
                    ctx.roundRect(W * 0.15, H * 0.42, W * 0.7, 35, 10);
                    ctx.fill();
                    
                    ctx.fillStyle = '#f0e0c0';
                    ctx.font = `${Math.min(W * 0.03, 12)}px "STKaiti","KaiTi",sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(this.currentLog, W / 2, H * 0.42 + 17);
                    
                    ctx.globalAlpha = 1;
                }

                drawCatchAnimation(ctx) {
                    const t = this.catchAnim.timer / this.catchAnim.duration;
                    
                    // 球的动画
                    const ballX = this.enemyPetX;
                    const ballY = this.enemyPetY - 30 + Math.sin(t * Math.PI * 4) * 20;
                    
                    ctx.font = '40px serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('🔴', ballX, ballY);
                    
                    // 摇晃效果
                    if (t > 0.3 && t < 0.9) {
                        const shake = Math.sin(t * 20) * 5;
                        ctx.fillText('🔴', ballX + shake, ballY);
                    }
                }

                drawResult(ctx) {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                    ctx.fillRect(0, 0, W, H);
                    
                    const panelW = Math.min(280, W * 0.85);
                    const panelH = 200;
                    const panelX = (W - panelW) / 2;
                    const panelY = (H - panelH) / 2;
                    
                    ctx.fillStyle = 'rgba(35, 32, 45, 0.98)';
                    ctx.beginPath();
                    ctx.roundRect(panelX, panelY, panelW, panelH, 15);
                    ctx.fill();
                    
                    ctx.strokeStyle = 'rgba(180, 160, 140, 0.4)';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.roundRect(panelX, panelY, panelW, panelH, 15);
                    ctx.stroke();
                    
                    ctx.fillStyle = '#f0e0c0';
                    ctx.font = `bold ${Math.min(W * 0.045, 18)}px "STKaiti","KaiTi",sans-serif`;
                    ctx.textAlign = 'center';
                    
                    let resultText = '';
                    switch (this.battleResult) {
                        case 'win':
                            resultText = '🎉 战斗胜利！';
                            break;
                        case 'lose':
                            resultText = '💔 战斗失败...';
                            break;
                        case 'catch':
                            resultText = '🎊 捕捉成功！';
                            break;
                        case 'flee':
                            resultText = '🏃 成功逃跑！';
                            break;
                    }
                    ctx.fillText(resultText, W / 2, panelY + 40);
                    
                    if (this.battleResult === 'win' && this.expGained > 0) {
                        ctx.fillStyle = '#a0d8f0';
                        ctx.font = `${Math.min(W * 0.03, 12)}px "STKaiti","KaiTi",sans-serif`;
                        ctx.fillText(`获得经验: ${this.expGained}`, W / 2, panelY + 70);
                        
                        if (this.evGained > 0) {
                            ctx.fillStyle = '#87ceeb';
                            ctx.fillText(`获得修行点: ${this.evGained}`, W / 2, panelY + 95);
                        }
                    }
                    
                    if (this.battleResult === 'catch') {
                        ctx.fillStyle = '#ffd700';
                        ctx.font = `${Math.min(W * 0.03, 12)}px "STKaiti","KaiTi",sans-serif`;
                        if (this.catchAnim && this.catchAnim.addTo === 'team') {
                            ctx.fillText(`${this.enemyPet.name} 已加入队伍`, W / 2, panelY + 70);
                        } else {
                            ctx.fillText(`捕捉失败：队伍已满`, W / 2, panelY + 70);
                            ctx.fillStyle = '#ff6b6b';
                            ctx.font = `${Math.min(W * 0.026, 11)}px "STKaiti","KaiTi",sans-serif`;
                            ctx.fillText('请先将宠物存入仓库', W / 2, panelY + 90);
                        }
                    }
                    
                    // 确认按钮
                    const btnW = 100;
                    const btnH = 35;
                    const btnX = (W - btnW) / 2;
                    const btnY = panelY + panelH - 50;
                    
                    ctx.fillStyle = 'rgba(80, 100, 80, 0.8)';
                    ctx.beginPath();
                    ctx.roundRect(btnX, btnY, btnW, btnH, 8);
                    ctx.fill();
                    
                    ctx.fillStyle = '#f0e0c0';
                    ctx.font = `${Math.min(W * 0.03, 12)}px "STKaiti","KaiTi",sans-serif`;
                    ctx.fillText('确定', W / 2, btnY + btnH / 2);
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

                drawBattleBagPanel(ctx) {
                    this.bagPanelAlpha = lerp(this.bagPanelAlpha, this.showBagPanel ? 1 : 0, 0.15);
                    if (this.bagPanelAlpha < 0.01) return;
                    
                    ctx.globalAlpha = this.bagPanelAlpha * this.alpha;
                    
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                    ctx.fillRect(0, 0, W, H);
                    
                    const panelW = Math.min(280, W * 0.85);
                    const panelH = 250;
                    const panelX = (W - panelW) / 2;
                    const panelY = (H - panelH) / 2;
                    
                    const bgGrad = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
                    bgGrad.addColorStop(0, 'rgba(35, 32, 45, 0.98)');
                    bgGrad.addColorStop(1, 'rgba(30, 28, 40, 0.98)');
                    ctx.fillStyle = bgGrad;
                    ctx.beginPath();
                    ctx.roundRect(panelX, panelY, panelW, panelH, 15);
                    ctx.fill();
                    
                    ctx.strokeStyle = 'rgba(180, 160, 140, 0.4)';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.roundRect(panelX, panelY, panelW, panelH, 15);
                    ctx.stroke();
                    
                    ctx.fillStyle = '#f0e0c0';
                    ctx.font = `bold ${Math.min(W * 0.035, 14)}px "STKaiti","KaiTi",sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText('🎒 选择道具', W / 2, panelY + 25);
                    
                    const closeBtnX = panelX + panelW - 20;
                    const closeBtnY = panelY + 15;
                    ctx.fillStyle = 'rgba(255, 100, 100, 0.6)';
                    ctx.beginPath();
                    ctx.arc(closeBtnX, closeBtnY, 10, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#fff';
                    ctx.font = `bold ${Math.min(W * 0.025, 12)}px sans-serif`;
                    ctx.fillText('×', closeBtnX, closeBtnY + 1);
                    
                    const battleItems = this.getBattleItems();
                    const itemSize = 55;
                    const itemGap = 8;
                    const cols = 4;
                    const startX = panelX + 15;
                    const startY = panelY + 45;
                    
                    for (let i = 0; i < battleItems.length; i++) {
                        const item = battleItems[i];
                        const col = i % cols;
                        const row = Math.floor(i / cols);
                        const x = startX + col * (itemSize + itemGap);
                        const y = startY + row * (itemSize + itemGap);
                        
                        const isHovered = this.hoveredBagItem === item.id;
                        
                        ctx.fillStyle = isHovered ? 'rgba(60, 50, 40, 0.9)' : 'rgba(40, 38, 50, 0.9)';
                        ctx.beginPath();
                        ctx.roundRect(x, y, itemSize, itemSize, 8);
                        ctx.fill();
                        
                        ctx.strokeStyle = isHovered ? 'rgba(180, 160, 140, 0.5)' : 'rgba(100, 90, 80, 0.3)';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.roundRect(x, y, itemSize, itemSize, 8);
                        ctx.stroke();
                        
                        ctx.font = `${Math.min(W * 0.04, 20)}px serif`;
                        ctx.textAlign = 'center';
                        ctx.fillText(item.icon, x + itemSize / 2, y + itemSize / 2 - 5);
                        
                        ctx.fillStyle = '#a0a0a0';
                        ctx.font = `${Math.min(W * 0.02, 8)}px sans-serif`;
                        ctx.fillText(`×${item.count}`, x + itemSize / 2, y + itemSize - 8);
                    }
                    
                    if (battleItems.length === 0) {
                        ctx.fillStyle = '#666';
                        ctx.font = `${Math.min(W * 0.025, 10)}px "STKaiti","KaiTi",sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.fillText('没有可用的道具', W / 2, panelY + panelH / 2);
                    }
                    
                    ctx.globalAlpha = this.alpha;
                }

                getBattleItems() {
                    const items = [];
                    const balls = gs.bagManager.getItemsByType('ball');
                    const potions = gs.bagManager.getItemsByType('potion');
                    
                    for (const item of balls) {
                        items.push({
                            id: item.id,
                            name: item.name,
                            icon: item.icon,
                            count: item.count,
                            type: 'ball'
                        });
                    }
                    for (const item of potions) {
                        items.push({
                            id: item.id,
                            name: item.name,
                            icon: item.icon,
                            count: item.count,
                            type: 'potion'
                        });
                    }
                    return items;
                }

                getAvailablePets() {
                    const pets = [];
                    for (const pet of gs.petManager.team) {
                        if (pet.id !== this.playerPet.id && !pet.isFainted()) {
                            pets.push(pet);
                        }
                    }
                    return pets;
                }

                drawBattlePetPanel(ctx) {
                    this.petPanelAlpha = lerp(this.petPanelAlpha, this.showPetPanel ? 1 : 0, 0.15);
                    if (this.petPanelAlpha < 0.01) return;
                    
                    ctx.globalAlpha = this.petPanelAlpha * this.alpha;
                    
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                    ctx.fillRect(0, 0, W, H);
                    
                    const panelW = Math.min(280, W * 0.85);
                    const panelH = 200;
                    const panelX = (W - panelW) / 2;
                    const panelY = (H - panelH) / 2;
                    
                    const bgGrad = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
                    bgGrad.addColorStop(0, 'rgba(35, 32, 45, 0.98)');
                    bgGrad.addColorStop(1, 'rgba(30, 28, 40, 0.98)');
                    ctx.fillStyle = bgGrad;
                    ctx.beginPath();
                    ctx.roundRect(panelX, panelY, panelW, panelH, 15);
                    ctx.fill();
                    
                    ctx.strokeStyle = 'rgba(180, 160, 140, 0.4)';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.roundRect(panelX, panelY, panelW, panelH, 15);
                    ctx.stroke();
                    
                    ctx.fillStyle = '#f0e0c0';
                    ctx.font = `bold ${Math.min(W * 0.035, 14)}px "STKaiti","KaiTi",sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText('🔄 选择宠物', W / 2, panelY + 25);
                    
                    const closeBtnX = panelX + panelW - 20;
                    const closeBtnY = panelY + 15;
                    ctx.fillStyle = 'rgba(255, 100, 100, 0.6)';
                    ctx.beginPath();
                    ctx.arc(closeBtnX, closeBtnY, 10, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#fff';
                    ctx.font = `bold ${Math.min(W * 0.025, 12)}px sans-serif`;
                    ctx.fillText('×', closeBtnX, closeBtnY + 1);
                    
                    const availablePets = this.getAvailablePets();
                    const petSize = 80;
                    const petGap = 10;
                    const cols = 3;
                    const startX = panelX + 15;
                    const startY = panelY + 45;
                    
                    for (let i = 0; i < availablePets.length; i++) {
                        const pet = availablePets[i];
                        const col = i % cols;
                        const row = Math.floor(i / cols);
                        const x = startX + col * (petSize + petGap);
                        const y = startY + row * (petSize + petGap);
                        
                        const isHovered = this.hoveredPetItem === pet.id;
                        
                        ctx.fillStyle = isHovered ? 'rgba(60, 50, 40, 0.9)' : 'rgba(40, 38, 50, 0.9)';
                        ctx.beginPath();
                        ctx.roundRect(x, y, petSize, petSize, 8);
                        ctx.fill();
                        
                        ctx.strokeStyle = isHovered ? 'rgba(180, 160, 140, 0.5)' : 'rgba(100, 90, 80, 0.3)';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.roundRect(x, y, petSize, petSize, 8);
                        ctx.stroke();
                        
                        ctx.font = `${Math.min(W * 0.05, 24)}px serif`;
                        ctx.textAlign = 'center';
                        
                        const homeIconSize = Math.min(W * 0.05, 24) * 1.8;
                        const homeIconX = x + petSize / 2;
                        const homeIconY = y + 30;
                        
                        if (!drawCustomPetIcon(ctx, pet.speciesId, homeIconX, homeIconY, homeIconSize)) {
                            ctx.fillText(this.getPetIcon(pet.speciesId), homeIconX, homeIconY);
                        }
                        
                        ctx.fillStyle = '#f0e0c0';
                        ctx.font = `${Math.min(W * 0.02, 9)}px "STKaiti","KaiTi",sans-serif`;
                        ctx.fillText(pet.name, x + petSize / 2, y + 50);
                        
                        ctx.fillStyle = '#ffd700';
                        ctx.font = `${Math.min(W * 0.018, 8)}px sans-serif`;
                        ctx.fillText(`Lv.${pet.level}`, x + petSize / 2, y + 62);
                        
                        const hpPercent = pet.currentHp / pet.getMaxHp();
                        const hpBarX = x + 8;
                        const hpBarY = y + petSize - 15;
                        const hpBarW = petSize - 16;
                        
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                        ctx.beginPath();
                        ctx.roundRect(hpBarX, hpBarY, hpBarW, 6, 2);
                        ctx.fill();
                        
                        ctx.fillStyle = hpPercent > 0.5 ? '#4ecdc4' : hpPercent > 0.2 ? '#ffd93d' : '#ff6b6b';
                        ctx.beginPath();
                        ctx.roundRect(hpBarX, hpBarY, hpBarW * hpPercent, 6, 2);
                        ctx.fill();
                    }
                    
                    if (availablePets.length === 0) {
                        ctx.fillStyle = '#666';
                        ctx.font = `${Math.min(W * 0.025, 10)}px "STKaiti","KaiTi",sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.fillText('没有可替换的宠物', W / 2, panelY + panelH / 2);
                    }
                    
                    ctx.globalAlpha = this.alpha;
                }

                handleClick(x, y) {
                    if (this.phase === 'result') {
                        const btnW = 100;
                        const btnH = 35;
                        const panelH = 180;
                        const panelY = (H - panelH) / 2;
                        const btnX = (W - btnW) / 2;
                        const btnY = panelY + panelH - 50;
                        
                        if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
                            this.hide();
                            return 'end';
                        }
                        return null;
                    }
                    
                    if (this.showBagPanel) {
                        const panelW = Math.min(280, W * 0.85);
                        const panelH = 250;
                        const panelX = (W - panelW) / 2;
                        const panelY = (H - panelH) / 2;
                        
                        const closeBtnX = panelX + panelW - 20;
                        const closeBtnY = panelY + 15;
                        if (Math.hypot(x - closeBtnX, y - closeBtnY) < 15) {
                            this.showBagPanel = false;
                            return null;
                        }
                        
                        const battleItems = this.getBattleItems();
                        const itemSize = 55;
                        const itemGap = 8;
                        const cols = 4;
                        const startX = panelX + 15;
                        const startY = panelY + 45;
                        
                        for (let i = 0; i < battleItems.length; i++) {
                            const item = battleItems[i];
                            const col = i % cols;
                            const row = Math.floor(i / cols);
                            const ix = startX + col * (itemSize + itemGap);
                            const iy = startY + row * (itemSize + itemGap);
                            
                            if (x >= ix && x <= ix + itemSize && y >= iy && y <= iy + itemSize) {
                                this.showBagPanel = false;
                                if (item.type === 'ball') {
                                    this.tryCatch(item.id);
                                    return 'catch';
                                } else if (item.type === 'potion') {
                                    this.usePotion(item.id);
                                    return 'potion';
                                }
                                return null;
                            }
                        }
                        return null;
                    }
                    
                    if (this.showPetPanel) {
                        const panelW = Math.min(280, W * 0.85);
                        const panelH = 200;
                        const panelX = (W - panelW) / 2;
                        const panelY = (H - panelH) / 2;
                        
                        const closeBtnX = panelX + panelW - 20;
                        const closeBtnY = panelY + 15;
                        if (Math.hypot(x - closeBtnX, y - closeBtnY) < 15) {
                            this.showPetPanel = false;
                            return null;
                        }
                        
                        const availablePets = this.getAvailablePets();
                        const petSize = 80;
                        const petGap = 10;
                        const cols = 3;
                        const startX = panelX + 15;
                        const startY = panelY + 45;
                        
                        for (let i = 0; i < availablePets.length; i++) {
                            const pet = availablePets[i];
                            const col = i % cols;
                            const row = Math.floor(i / cols);
                            const px = startX + col * (petSize + petGap);
                            const py = startY + row * (petSize + petGap);
                            
                            if (x >= px && x <= px + petSize && y >= py && y <= py + petSize) {
                                this.showPetPanel = false;
                                this.switchPet(pet);
                                return 'switch';
                            }
                        }
                        return null;
                    }
                    
                    if (this.phase !== 'selectAction') return null;
                    
                    for (let i = 0; i < this.skillButtons.length; i++) {
                        const btn = this.skillButtons[i];
                        if (x >= btn.x && x <= btn.x + btn.width && y >= btn.y && y <= btn.y + btn.height) {
                            const skill = btn.skill;
                            const canUse = skill.currentPp > 0;
                            if (canUse) {
                                this.selectedSkill = skill;
                                this.phase = 'executeTurn';
                                this.phaseTimer = 0;
                                return 'skill:' + skill.id;
                            } else {
                                this.addLog('PP不足！');
                            }
                            return null;
                        }
                    }
                    
                    const panelY = H - 150;
                    const funcBtnY = panelY + 2;
                    const funcBtnGap = 10;
                    const funcBtnW = (W - funcBtnGap * 5) / 4;
                    const funcBtns = [
                        { id: 'bag' },
                        { id: 'catch' },
                        { id: 'pet' },
                        { id: 'flee' },
                    ];
                    
                    for (let i = 0; i < funcBtns.length; i++) {
                        const btn = funcBtns[i];
                        const btnX = funcBtnGap + i * (funcBtnW + funcBtnGap);
                        if (x >= btnX && x <= btnX + funcBtnW && y >= funcBtnY && y <= funcBtnY + 36) {
                            switch (btn.id) {
                                case 'bag':
                                    this.showBagPanel = true;
                                    return 'bag';
                                case 'catch':
                                    if (gs.bagManager.getItemCount('normal_ball') > 0) {
                                        this.tryCatch('normal_ball');
                                        return 'catch';
                                    }
                                    this.addLog('没有捕捉球了！');
                                    return null;
                                case 'flee':
                                    this.tryFlee();
                                    return 'flee';
                                case 'pet':
                                    const availablePets = this.getAvailablePets();
                                    if (availablePets.length > 0) {
                                        this.showPetPanel = true;
                                        return 'pet';
                                    }
                                    this.addLog('没有可替换的宠物！');
                                    return null;
                            }
                        }
                    }
                    
                    return null;
                }

                handlePointerMove(x, y) {
                    this.hoveredButton = null;
                    this.hoveredBagItem = null;
                    this.hoveredPetItem = null;
                    
                    if (this.showBagPanel) {
                        const panelW = Math.min(280, W * 0.85);
                        const panelH = 250;
                        const panelX = (W - panelW) / 2;
                        const panelY = (H - panelH) / 2;
                        
                        const battleItems = this.getBattleItems();
                        const itemSize = 55;
                        const itemGap = 8;
                        const cols = 4;
                        const startX = panelX + 15;
                        const startY = panelY + 45;
                        
                        for (let i = 0; i < battleItems.length; i++) {
                            const item = battleItems[i];
                            const col = i % cols;
                            const row = Math.floor(i / cols);
                            const ix = startX + col * (itemSize + itemGap);
                            const iy = startY + row * (itemSize + itemGap);
                            
                            if (x >= ix && x <= ix + itemSize && y >= iy && y <= iy + itemSize) {
                                this.hoveredBagItem = item.id;
                                return;
                            }
                        }
                        return;
                    }
                    
                    if (this.showPetPanel) {
                        const panelW = Math.min(280, W * 0.85);
                        const panelH = 200;
                        const panelX = (W - panelW) / 2;
                        const panelY = (H - panelH) / 2;
                        
                        const availablePets = this.getAvailablePets();
                        const petSize = 80;
                        const petGap = 10;
                        const cols = 3;
                        const startX = panelX + 15;
                        const startY = panelY + 45;
                        
                        for (let i = 0; i < availablePets.length; i++) {
                            const pet = availablePets[i];
                            const col = i % cols;
                            const row = Math.floor(i / cols);
                            const px = startX + col * (petSize + petGap);
                            const py = startY + row * (petSize + petGap);
                            
                            if (x >= px && x <= px + petSize && y >= py && y <= py + petSize) {
                                this.hoveredPetItem = pet.id;
                                return;
                            }
                        }
                        return;
                    }
                    
                    if (this.phase !== 'selectAction') return;
                    
                    for (let i = 0; i < this.skillButtons.length; i++) {
                        const btn = this.skillButtons[i];
                        if (x >= btn.x && x <= btn.x + btn.width && y >= btn.y && y <= btn.y + btn.height) {
                            this.hoveredButton = 'skill_' + i;
                            return;
                        }
                    }
                    
                    const panelY = H - 150;
                    const funcBtnY = panelY + 2;
                    const funcBtnGap = 10;
                    const funcBtnW = (W - funcBtnGap * 5) / 4;
                    const funcBtns = ['bag', 'catch', 'pet', 'flee'];
                    
                    for (let i = 0; i < funcBtns.length; i++) {
                        const btnX = funcBtnGap + i * (funcBtnW + funcBtnGap);
                        if (x >= btnX && x <= btnX + funcBtnW && y >= funcBtnY && y <= funcBtnY + 36) {
                            this.hoveredButton = funcBtns[i];
                            return;
                        }
                    }
                }

                hide() {
                    this.targetAlpha = 0;
                    this.visible = false;
                }

                isPointInside(x, y) {
                    return this.visible && this.alpha > 0.5;
                }
            }

            // ============ 场景实例化 ============
            startScene = new StartScene();
            loadingScene = new LoadingScene();
            worldScene = new WorldScene();
            topBar = new TopBar();
            bottomBar = new BottomBar();
            warehousePanel = new WarehousePanel();
            teamPanel = new TeamPanel();
            bagPanel = new BagPanel();
            tutorialScene = new TutorialScene();
            areaScene = new AreaScene();
            battleScene = new BattleScene();

            // ============ 激励视频广告管理器（带可视化界面）============
            class RewardAdManager {
                constructor() {
                    this.isShowing = false;
                    this.videoAd = null;
                    this.adConfig = {
                        adUnitId: '1056326'
                    };
                    this.callbacks = {
                        onReward: null,
                        onClose: null,
                        onError: null
                    };
                }

                setCallbacks(callbacks) {
                    Object.assign(this.callbacks, callbacks);
                }

                showAd() {
                    if (this.isShowing) {
                        return false;
                    }

                    const tapApi = typeof tap !== 'undefined' ? tap : (typeof tt !== 'undefined' ? tt : null);
                    if (!tapApi || typeof tapApi.createRewardedVideoAd !== 'function') {
                        if (this.callbacks.onError) {
                            this.callbacks.onError(-1, '非小游戏环境，无法播放广告');
                        }
                        return false;
                    }

                    this.isShowing = true;

                    try {
                        const videoAd = tapApi.createRewardedVideoAd({
                            adUnitId: this.adConfig.adUnitId
                        });

                        videoAd.onClose((res) => {
                            this.isShowing = false;
                            if (res && res.isEnded) {
                                if (this.callbacks.onReward) {
                                    this.callbacks.onReward(100, '金币');
                                }
                            }
                            if (this.callbacks.onClose) {
                                this.callbacks.onClose();
                            }
                        });

                        videoAd.onError((err) => {
                            this.isShowing = false;
                            if (this.callbacks.onError) {
                                this.callbacks.onError(err.errCode || -1, err.errMsg || '广告加载失败');
                            }
                        });

                        videoAd.show().catch(() => {
                            videoAd.load().then(() => {
                                videoAd.show().catch(() => {
                                    this.isShowing = false;
                                });
                            }).catch(() => {
                                this.isShowing = false;
                            });
                        });
                    } catch (e) {
                        this.isShowing = false;
                        if (this.callbacks.onError) {
                            this.callbacks.onError(-1, e.message);
                        }
                    }

                    return true;
                }
            }

            // 创建全局广告管理器实例
            const rewardAdManager = new RewardAdManager();

            // ============ 家园场景 ============
            const WORLD_WIDTH = 2400;

            class HomeScene {
                constructor() {
                    this.worldWidth = WORLD_WIDTH;
                    this.cameraX = 0;
                    this.targetCameraX = 0;
                    this.cameraVelocity = 0;
                    this.isDragging = false;
                    this.dragStartX = 0;
                    this.dragStartCam = 0;
                    this.dragHistory = [];
                    this.time = 0;
                    this.buildings = [];
                    this.pets = [];
                    this.decorations = [];
                    this.clouds = [];
                    this.hoveredBuilding = null;
                    this.buildingPulse = {};

                    // 提示系统
                    this.hintText = null;
                    this.hintTimer = 0;
                    this.hintAlpha = 0;
                    this.hintY = 0;           // Y坐标（用于向上移动）
                    this.hintStartY = 0;      // 初始Y坐标

                    // 背景音乐相关属性
                    this.bgMusic = null;
                    this.isMusicPlaying = false;
                    this.musicVolume = 0.5;
                    this.musicGuideShown = false;  // 是否已显示过音乐引导
                    this.showMusicGuide = false;   // 是否当前正在显示引导
                    this.musicGuideTimer = 0;      // 引导显示计时器

                    // 小屋领取普通球冷却系统
                    this.houseLastClaimTime = 0;   // 上次领取时间戳（毫秒）
                    this.HOUSE_COOLDOWN = 10 * 60 * 1000;  // 10分钟冷却时间（毫秒）
                    
                    this.initBuildings();
                    this.initPets();
                    this.initDecorations();
                    this.initClouds();
                }

                initBuildings() {
                    this.buildings = [
                        { id: 'warehouse', name: '仓库', x: 200, y: 400, width: 80, height: 70, icon: '🏠', color: '#8b7355' },
                        { id: 'shop', name: '商店', x: 520, y: 380, width: 70, height: 65, icon: '🛒', color: '#6b8e8e' },
                        { id: 'house', name: '小屋', x: 900, y: 360, width: 90, height: 80, icon: '🏡', color: '#a0522d' },
                        { id: 'hatchery', name: '孵蛋屋', x: 1260, y: 370, width: 75, height: 68, icon: '🥚', color: '#deb887' },
                        { id: 'collection', name: '图鉴', x: 1620, y: 385, width: 72, height: 63, icon: '📖', color: '#8fbc8f' },
                        { id: 'pond', name: '小池塘', x: 1980, y: 430, width: 65, height: 32, icon: '🌿', color: '#5f9ea0', isWater: true },
                        { id: 'tree', name: '古树', x: 2280, y: 340, width: 55, height: 90, icon: '🌳', color: '#228b22', isTree: true },
                    ];
                    this.buildings.forEach(b => {
                        this.buildingPulse[b.id] = 0;
                    });
                }

                initPets() {
                    this.pets = [];
                    const petSeed = seededRandom(999);
                    const petTypes = [
                        { color: '#ff6b6b', earColor: '#cc5555', name: '火尾狐' },
                        { color: '#4ecdc4', earColor: '#3ba89f', name: '涟漪龟' },
                        { color: '#95e1a3', earColor: '#6bc481', name: '芽芽鹿' },
                        { color: '#ffd93d', earColor: '#e6c235', name: '金翅鸟' },
                        { color: '#a8e6cf', earColor: '#8bc9b3', name: '叶精灵' },
                        { color: '#dda0dd', earColor: '#b87eb8', name: '紫藤猫' },
                    ];
                    for (let i = 0; i < 6; i++) {
                        const type = petTypes[i % petTypes.length];
                        this.pets.push({
                            x: petSeed() * this.worldWidth,
                            y: 470 + petSeed() * 55,
                            vx: (petSeed() - 0.5) * 20,
                            size: 10 + petSeed() * 4,
                            color: type.color,
                            earColor: type.earColor,
                            name: type.name,
                            phase: petSeed() * Math.PI * 2,
                            bouncePhase: petSeed() * Math.PI * 2,
                            tailPhase: petSeed() * Math.PI * 2,
                            direction: petSeed() > 0.5 ? 1 : -1,
                            blinkTimer: petSeed() * 3,
                            isBlinking: false,
                        });
                    }
                }

                initDecorations() {
                    this.decorations = [];
                    const decSeed = seededRandom(12345);
                    for (let i = 0; i < 25; i++) {
                        const type = decSeed() > 0.6 ? 'flower' : (decSeed() > 0.3 ? 'grass' : 'bush');
                        this.decorations.push({
                            x: decSeed() * this.worldWidth,
                            y: 415 + decSeed() * 105,
                            type: type,
                            size: 3 + decSeed() * 5,
                            phase: decSeed() * Math.PI * 2,
                            color: type === 'flower' ? `hsl(${decSeed() * 60 + 300}, 70%, 65%)` :
                                   type === 'grass' ? `hsl(${decSeed() * 30 + 100}, 50%, 45%)` :
                                   `hsl(${decSeed() * 20 + 90}, 40%, 35%)`,
                        });
                    }
                }

                initClouds() {
                    this.clouds = [];
                    const cloudSeed = seededRandom(54321);
                    for (let i = 0; i < 6; i++) {
                        this.clouds.push({
                            x: cloudSeed() * this.worldWidth,
                            y: 55 + cloudSeed() * 105,
                            width: 60 + cloudSeed() * 80,
                            speed: 3 + cloudSeed() * 8,
                            alpha: 0.3 + cloudSeed() * 0.3,
                        });
                    }
                }

                recalcDimensions() {
                    this.worldWidth = WORLD_WIDTH;
                    const bounds = this.getCameraBounds();
                    this.cameraX = clamp(this.cameraX, bounds.minX, bounds.maxX);
                    this.targetCameraX = clamp(this.targetCameraX, bounds.minX, bounds.maxX);
                }

                showHint(text, duration = 2.5) {
                    this.hintText = text;
                    this.hintTimer = duration;
                    this.hintAlpha = 1;
                    this.hintY = H * 0.45;           // 初始位置（屏幕中上部）
                    this.hintStartY = H * 0.45;
                }

                init() {
                    this.time = 0;
                    this.cameraX = 0;
                    this.targetCameraX = 0;
                    this.cameraVelocity = 0;
                    this.isDragging = false;
                    this.recalcDimensions();
                    this.initPets();
                    this.initDecorations();
                    this.initClouds();
                    this.initBackgroundMusic();
                }

                initBackgroundMusic() {
                    try {
                        if (this.bgMusic) {
                            this.bgMusic.pause();
                            this.bgMusic = null;
                        }
                        
                        this.bgMusic = new Audio('assets/audio/bgm/home_bgm.mp3');
                        this.bgMusic.loop = true;
                        this.bgMusic.volume = this.musicVolume;
                        
                        this.bgMusic.addEventListener('canplaythrough', () => {
                            console.log('🎵 背景音乐加载完成');
                            this.playBackgroundMusic();
                        });
                        
                        this.bgMusic.addEventListener('error', (e) => {
                            console.warn('⚠️ 背景音乐加载失败，请将音乐文件放入 music 文件夹:', e);
                        });
                        
                        this.bgMusic.load();
                    } catch (e) {
                        console.error('背景音乐初始化失败:', e);
                    }
                }

                playBackgroundMusic() {
                    if (this.bgMusic) {
                        const playPromise = this.bgMusic.play();
                        if (playPromise !== undefined) {
                            playPromise.then(() => {
                                this.isMusicPlaying = true;
                                console.log('🎵 背景音乐开始播放');
                            }).catch(error => {
                                console.log('⚠️ 自动播放被阻止，需要用户交互:', error);
                                this.isMusicPlaying = false;
                                // 首次失败时显示引导提示
                                if (!this.musicGuideShown) {
                                    this.musicGuideShown = true;
                                    this.showMusicGuide = true;
                                    this.musicGuideTimer = 0;
                                    console.log('💡 显示音乐引导提示');
                                }
                            });
                        }
                    }
                }

                pauseBackgroundMusic() {
                    if (this.bgMusic && this.isMusicPlaying) {
                        this.bgMusic.pause();
                        this.isMusicPlaying = false;
                        console.log('🔇 背景音乐已暂停');
                    }
                }

                toggleBackgroundMusic() {
                    if (!this.bgMusic) {
                        this.initBackgroundMusic();
                        return;
                    }
                    
                    if (this.isMusicPlaying) {
                        this.pauseBackgroundMusic();
                    } else {
                        this.playBackgroundMusic();
                    }
                }

                setMusicVolume(volume) {
                    this.musicVolume = Math.max(0, Math.min(1, volume));
                    if (this.bgMusic) {
                        this.bgMusic.volume = this.musicVolume;
                    }
                }

                drawMusicGuide(ctx) {
                    const guideAlpha = Math.min(1, this.musicGuideTimer * 2);  // 淡入效果
                    const pulseAlpha = 0.7 + Math.sin(this.musicGuideTimer * 3) * 0.3;  // 呼吸效果

                    ctx.save();
                    ctx.globalAlpha = guideAlpha * pulseAlpha;

                    const boxW = Math.min(W * 0.85, 320);
                    const boxH = 70;
                    const boxX = (W - boxW) / 2;
                    const boxY = H - UI.bottomBar.height - boxH - 20;

                    // 背景
                    ctx.fillStyle = 'rgba(30, 25, 40, 0.92)';
                    ctx.beginPath();
                    ctx.roundRect(boxX, boxY, boxW, boxH, 12);
                    ctx.fill();

                    // 边框（金色发光）
                    ctx.strokeStyle = `rgba(255, 200, 100, ${0.6 + pulseAlpha * 0.3})`;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.roundRect(boxX, boxY, boxW, boxH, 12);
                    ctx.stroke();

                    // 图标
                    ctx.font = `${Math.min(W * 0.07, 28)}px serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('🎵', boxX + 40, boxY + boxH / 2);

                    // 文字
                    ctx.fillStyle = '#f0e0c0';
                    ctx.font = `bold ${Math.min(W * 0.038, 15)}px "STKaiti","KaiTi",sans-serif`;
                    ctx.textAlign = 'left';
                    ctx.fillText('点击右上角 🎵 按钮开启音乐', boxX + 65, boxY + boxH / 2 - 10);

                    ctx.fillStyle = '#c8b898';
                    ctx.font = `${Math.min(W * 0.03, 12)}px "STKaiti","KaiTi",sans-serif`;
                    ctx.fillText('享受更沉浸的游戏体验', boxX + 65, boxY + boxH / 2 + 12);

                    // 关闭提示（点击任意位置或5秒后自动消失）
                    if (this.musicGuideTimer > 4) {
                        ctx.fillStyle = 'rgba(200, 180, 140, 0.5)';
                        ctx.font = `${Math.min(W * 0.025, 10)}px sans-serif`;
                        ctx.textAlign = 'right';
                        ctx.fillText('轻触关闭', boxX + boxW - 10, boxY + boxH - 10);
                    }

                    ctx.restore();
                }

                getCameraBounds() {
                    return { minX: 0, maxX: Math.max(0, this.worldWidth - W) };
                }

                update(dt) {
                    this.time += dt;

                    for (const cloud of this.clouds) {
                        cloud.x += cloud.speed * dt;
                        if (cloud.x > this.worldWidth + 100) cloud.x = -cloud.width;
                    }

                    const bounds = this.getCameraBounds();
                    if (!this.isDragging) {
                        this.cameraVelocity *= Math.pow(0.03, dt);
                        if (Math.abs(this.cameraVelocity) < 0.5) this.cameraVelocity = 0;
                        this.targetCameraX += this.cameraVelocity * dt;

                        if (this.targetCameraX < bounds.minX) {
                            this.targetCameraX = lerp(this.targetCameraX, bounds.minX, dt * 8);
                            this.cameraVelocity *= 0.5;
                        }
                        if (this.targetCameraX > bounds.maxX) {
                            this.targetCameraX = lerp(this.targetCameraX, bounds.maxX, dt * 8);
                            this.cameraVelocity *= 0.5;
                        }
                        this.targetCameraX = clamp(this.targetCameraX, bounds.minX - 5, bounds.maxX + 5);
                    }

                    if (this.isDragging) {
                        this.cameraX = this.targetCameraX;
                    } else {
                        this.cameraX = lerp(this.cameraX, this.targetCameraX, dt * 12);
                    }
                    this.cameraX = clamp(this.cameraX, bounds.minX - 3, bounds.maxX + 3);

                    for (const pet of this.pets) {
                        pet.x += pet.vx * dt;
                        if (pet.x > this.worldWidth + 30) pet.x = -30;
                        if (pet.x < -30) pet.x = this.worldWidth + 30;
                        pet.direction = pet.vx > 0 ? 1 : -1;
                        
                        pet.blinkTimer -= dt;
                        if (pet.blinkTimer <= 0) {
                            pet.isBlinking = true;
                            setTimeout(() => { pet.isBlinking = false; }, 100);
                            pet.blinkTimer = 2 + Math.random() * 4;
                        }
                    }

                    for (const key in this.buildingPulse) {
                        if (this.buildingPulse[key] > 0) {
                            this.buildingPulse[key] = Math.max(0, this.buildingPulse[key] - dt * 2);
                        }
                    }

                    // 更新音乐引导提示
                    if (this.showMusicGuide) {
                        this.musicGuideTimer += dt;
                        if (this.musicGuideTimer > 5) {  // 5秒后自动隐藏
                            this.showMusicGuide = false;
                        }
                    }

                    if (this.hintText !== null) {
                        if (this.hintTimer > 0) {
                            this.hintTimer -= dt;
                            this.hintY -= 30 * dt;
                        } else {
                            this.hintAlpha = lerp(this.hintAlpha, 0, dt * 4);
                            this.hintY -= 20 * dt;
                            if (this.hintAlpha < 0.01) {
                                this.hintText = null;
                                this.hintAlpha = 0;
                            }
                        }
                    }
                }

                draw(ctx) {
                    const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
                    skyGrad.addColorStop(0, '#87CEEB');
                    skyGrad.addColorStop(0.4, '#B0E2FF');
                    skyGrad.addColorStop(0.7, '#D4F1F9');
                    skyGrad.addColorStop(1, '#E8F5FF');
                    ctx.fillStyle = skyGrad;
                    ctx.fillRect(0, 0, W, H);

                    this.drawClouds(ctx);

                    const groundY = H * 0.55;
                    this.drawGround(ctx, groundY);

                    this.drawDecorations(ctx);

                    for (const building of this.buildings) {
                        const sx = building.x - this.cameraX;
                        if (sx < -150 || sx > W + 150) continue;
                        this.drawBuilding(ctx, building, sx, groundY);
                    }

                    for (const pet of this.pets) {
                        const sx = pet.x - this.cameraX;
                        if (sx < -50 || sx > W + 50) continue;
                        this.drawPet(ctx, pet, sx, pet.y);
                    }

                    if (this.hintAlpha > 0.01 && this.hintText) {
                        ctx.save();
                        ctx.globalAlpha = this.hintAlpha;

                        // 纯文字提示，向上淡出
                        ctx.fillStyle = '#ffd700';
                        ctx.font = `bold ${Math.min(W * 0.05, 20)}px "STKaiti","KaiTi",sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
                        ctx.shadowBlur = 4;
                        ctx.shadowOffsetX = 1;
                        ctx.shadowOffsetY = 1;
                        ctx.fillText(this.hintText, W / 2, this.hintY);

                        ctx.restore();
                    }

                    // 绘制音乐引导提示
                    if (this.showMusicGuide) {
                        this.drawMusicGuide(ctx);
                    }
                }

                drawClouds(ctx) {
                    for (const cloud of this.clouds) {
                        const sx = cloud.x - this.cameraX * 0.3;
                        if (sx < -cloud.width || sx > W + cloud.width) continue;

                        ctx.fillStyle = `rgba(255, 255, 255, ${cloud.alpha})`;
                        const y = cloud.y;
                        const w = cloud.width;
                        
                        ctx.beginPath();
                        ctx.arc(sx, y, w * 0.25, 0, Math.PI * 2);
                        ctx.arc(sx + w * 0.2, y - w * 0.08, w * 0.2, 0, Math.PI * 2);
                        ctx.arc(sx + w * 0.4, y, w * 0.22, 0, Math.PI * 2);
                        ctx.arc(sx + w * 0.25, y + w * 0.05, w * 0.18, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }

                drawGround(ctx, groundY) {
                    const groundGrad = ctx.createLinearGradient(0, groundY, 0, H);
                    groundGrad.addColorStop(0, '#4a7a4a');
                    groundGrad.addColorStop(0.2, '#3a6a3a');
                    groundGrad.addColorStop(0.5, '#2a5a2a');
                    groundGrad.addColorStop(1, '#1a4a1a');
                    ctx.fillStyle = groundGrad;
                    ctx.fillRect(0, groundY, W, H - groundY);

                    for (let x = 0; x < W; x += 4) {
                        const wx = x + this.cameraX;
                        const waveH = Math.sin(wx * 0.015 + this.time * 0.5) * 6 + Math.cos(wx * 0.008) * 4;
                        const h = groundY + waveH;
                        ctx.fillStyle = 'rgba(60, 100, 60, 0.4)';
                        ctx.fillRect(x, h, 4, H - h);
                    }

                    ctx.fillStyle = 'rgba(80, 120, 80, 0.3)';
                    ctx.fillRect(0, groundY + 5, W, 3);
                }

                drawDecorations(ctx) {
                    for (const dec of this.decorations) {
                        const sx = dec.x - this.cameraX;
                        if (sx < -20 || sx > W + 20) continue;

                        const sway = Math.sin(this.time * 2 + dec.phase) * 2;
                        ctx.save();
                        ctx.translate(sx, dec.y);
                        ctx.rotate(sway * 0.05);
                        
                        ctx.fillStyle = dec.color;
                        if (dec.type === 'flower') {
                            for (let i = 0; i < 5; i++) {
                                const angle = (i / 5) * Math.PI * 2;
                                ctx.beginPath();
                                ctx.arc(Math.cos(angle) * dec.size * 0.5, Math.sin(angle) * dec.size * 0.5 - dec.size, dec.size * 0.4, 0, Math.PI * 2);
                                ctx.fill();
                            }
                            ctx.fillStyle = '#ffd700';
                            ctx.beginPath();
                            ctx.arc(0, -dec.size, dec.size * 0.3, 0, Math.PI * 2);
                            ctx.fill();
                        } else if (dec.type === 'grass') {
                            for (let i = -1; i <= 1; i++) {
                                ctx.beginPath();
                                ctx.moveTo(i * 2, 0);
                                ctx.quadraticCurveTo(i * 2 + sway, -dec.size * 1.5, i * 2 + sway * 0.5, -dec.size * 2);
                                ctx.strokeStyle = dec.color;
                                ctx.lineWidth = 2;
                                ctx.stroke();
                            }
                        } else {
                            ctx.beginPath();
                            ctx.arc(0, -dec.size * 0.8, dec.size * 1.2, 0, Math.PI * 2);
                            ctx.fill();
                        }
                        ctx.restore();
                    }
                }

                drawPet(ctx, pet, sx, sy) {
                    const bobY = Math.sin(this.time * 4 + pet.bouncePhase) * 2;
                    const tailWag = Math.sin(this.time * 8 + pet.tailPhase) * 0.3;
                    const y = sy + bobY;
                    const size = pet.size;

                    ctx.save();
                    ctx.translate(sx, y);
                    ctx.scale(pet.direction, 1);

                    ctx.fillStyle = pet.earColor;
                    ctx.beginPath();
                    ctx.ellipse(-size * 0.5, -size * 0.8, size * 0.25, size * 0.4, -0.3, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.ellipse(size * 0.5, -size * 0.8, size * 0.25, size * 0.4, 0.3, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.fillStyle = pet.color;
                    ctx.beginPath();
                    ctx.arc(0, 0, size, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.fillStyle = pet.earColor;
                    ctx.save();
                    ctx.rotate(tailWag);
                    ctx.beginPath();
                    ctx.ellipse(size * 1.2, 0, size * 0.6, size * 0.25, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();

                    ctx.fillStyle = '#fff';
                    ctx.beginPath();
                    ctx.ellipse(-size * 0.3, -size * 0.2, size * 0.25, size * 0.3, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.ellipse(size * 0.3, -size * 0.2, size * 0.25, size * 0.3, 0, 0, Math.PI * 2);
                    ctx.fill();

                    if (!pet.isBlinking) {
                        ctx.fillStyle = '#333';
                        ctx.beginPath();
                        ctx.arc(-size * 0.3, -size * 0.15, size * 0.12, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.beginPath();
                        ctx.arc(size * 0.3, -size * 0.15, size * 0.12, 0, Math.PI * 2);
                        ctx.fill();

                        ctx.fillStyle = '#fff';
                        ctx.beginPath();
                        ctx.arc(-size * 0.35, -size * 0.2, size * 0.05, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.beginPath();
                        ctx.arc(size * 0.25, -size * 0.2, size * 0.05, 0, Math.PI * 2);
                        ctx.fill();
                    } else {
                        ctx.strokeStyle = '#333';
                        ctx.lineWidth = 1.5;
                        ctx.beginPath();
                        ctx.moveTo(-size * 0.45, -size * 0.15);
                        ctx.lineTo(-size * 0.15, -size * 0.15);
                        ctx.stroke();
                        ctx.beginPath();
                        ctx.moveTo(size * 0.15, -size * 0.15);
                        ctx.lineTo(size * 0.45, -size * 0.15);
                        ctx.stroke();
                    }

                    ctx.fillStyle = '#ffb6c1';
                    ctx.beginPath();
                    ctx.ellipse(0, size * 0.15, size * 0.15, size * 0.1, 0, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.restore();
                }

                drawBuilding(ctx, building, sx, sy) {
                    const bw = building.width;
                    const bh = building.height;
                    const pulse = this.buildingPulse[building.id] || 0;
                    const isHovered = this.hoveredBuilding === building.id;

                    if (isHovered || pulse > 0) {
                        const glowAlpha = Math.max(pulse, isHovered ? 0.3 : 0);
                        const glowGrad = ctx.createRadialGradient(sx, sy - bh / 2, 0, sx, sy - bh / 2, bw);
                        glowGrad.addColorStop(0, `rgba(255, 200, 100, ${glowAlpha})`);
                        glowGrad.addColorStop(1, 'rgba(255, 200, 100, 0)');
                        ctx.fillStyle = glowGrad;
                        ctx.beginPath();
                        ctx.arc(sx, sy - bh / 2, bw, 0, Math.PI * 2);
                        ctx.fill();
                    }

                    if (building.isTree) {
                        this.drawTree(ctx, building, sx, sy);
                        return;
                    }

                    if (building.isWater) {
                        this.drawPond(ctx, building, sx, sy);
                        return;
                    }

                    const baseColor = building.color || '#5a4a3a';
                    const shadowGrad = ctx.createLinearGradient(sx - bw / 2, sy - bh, sx + bw / 2, sy);
                    shadowGrad.addColorStop(0, 'rgba(0,0,0,0.3)');
                    shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = shadowGrad;
                    ctx.beginPath();
                    ctx.roundRect(sx - bw / 2 - 5, sy - bh + 5, bw + 10, bh, 10);
                    ctx.fill();

                    const bodyGrad = ctx.createLinearGradient(sx - bw / 2, sy - bh, sx + bw / 2, sy);
                    bodyGrad.addColorStop(0, this.lightenColor(baseColor, 20));
                    bodyGrad.addColorStop(0.5, baseColor);
                    bodyGrad.addColorStop(1, this.darkenColor(baseColor, 20));
                    ctx.fillStyle = bodyGrad;
                    ctx.beginPath();
                    ctx.roundRect(sx - bw / 2, sy - bh, bw, bh, 10);
                    ctx.fill();

                    ctx.strokeStyle = 'rgba(255, 220, 180, 0.3)';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.roundRect(sx - bw / 2, sy - bh, bw, bh, 10);
                    ctx.stroke();

                    ctx.fillStyle = 'rgba(255, 240, 200, 0.2)';
                    ctx.beginPath();
                    ctx.roundRect(sx - bw / 2 + 8, sy - bh + 8, bw * 0.35, bh * 0.4, 6);
                    ctx.fill();

                    if (bw > 70) {
                        ctx.fillStyle = 'rgba(100, 80, 60, 0.8)';
                        ctx.fillRect(sx - 8, sy - 15, 16, 20);
                        ctx.fillStyle = 'rgba(180, 150, 100, 0.6)';
                        ctx.beginPath();
                        ctx.arc(sx, sy - 5, 4, 0, Math.PI * 2);
                        ctx.fill();
                    }

                    ctx.font = `${Math.min(W * 0.055, 26)}px serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(building.icon, sx, sy - bh / 2 - 3);

                    ctx.fillStyle = '#f0e8d8';
                    ctx.font = `bold ${Math.min(W * 0.028, 11)}px "STKaiti","KaiTi",sans-serif`;
                    ctx.fillText(building.name, sx, sy + 15);
                }

                drawTree(ctx, building, sx, sy) {
                    const trunkH = building.height * 0.4;
                    const crownR = building.width * 0.6;

                    ctx.fillStyle = '#4a3525';
                    ctx.fillRect(sx - 8, sy - trunkH, 16, trunkH);

                    const crownGrad = ctx.createRadialGradient(sx, sy - trunkH - crownR * 0.5, 0, sx, sy - trunkH - crownR * 0.5, crownR);
                    crownGrad.addColorStop(0, '#3a8a3a');
                    crownGrad.addColorStop(0.7, '#2a6a2a');
                    crownGrad.addColorStop(1, '#1a4a1a');
                    ctx.fillStyle = crownGrad;
                    ctx.beginPath();
                    ctx.arc(sx, sy - trunkH - crownR * 0.3, crownR, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.fillStyle = 'rgba(100, 180, 100, 0.3)';
                    ctx.beginPath();
                    ctx.arc(sx - crownR * 0.3, sy - trunkH - crownR * 0.5, crownR * 0.4, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.font = `${Math.min(W * 0.028, 11)}px "STKaiti","KaiTi",sans-serif`;
                    ctx.fillStyle = '#f0e8d8';
                    ctx.textAlign = 'center';
                    ctx.fillText(building.name, sx, sy + 15);
                }

                drawPond(ctx, building, sx, sy) {
                    const w = building.width;
                    const h = building.height;

                    const pondGrad = ctx.createRadialGradient(sx, sy - h * 0.3, 0, sx, sy - h * 0.3, w * 0.6);
                    pondGrad.addColorStop(0, '#4a9aaa');
                    pondGrad.addColorStop(0.5, '#3a7a8a');
                    pondGrad.addColorStop(1, '#2a5a6a');
                    ctx.fillStyle = pondGrad;
                    ctx.beginPath();
                    ctx.ellipse(sx, sy - h * 0.3, w * 0.6, h * 0.6, 0, 0, Math.PI * 2);
                    ctx.fill();

                    const ripple = Math.sin(this.time * 2) * 3;
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.ellipse(sx, sy - h * 0.3, w * 0.3 + ripple, h * 0.2 + ripple * 0.5, 0, 0, Math.PI * 2);
                    ctx.stroke();

                    ctx.font = `${Math.min(W * 0.028, 11)}px "STKaiti","KaiTi",sans-serif`;
                    ctx.fillStyle = '#f0e8d8';
                    ctx.textAlign = 'center';
                    ctx.fillText(building.name, sx, sy + 10);
                }

                lightenColor(color, percent) {
                    const num = parseInt(color.replace('#', ''), 16);
                    const amt = Math.round(2.55 * percent);
                    const R = Math.min(255, (num >> 16) + amt);
                    const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
                    const B = Math.min(255, (num & 0x0000FF) + amt);
                    return `rgb(${R},${G},${B})`;
                }

                darkenColor(color, percent) {
                    const num = parseInt(color.replace('#', ''), 16);
                    const amt = Math.round(2.55 * percent);
                    const R = Math.max(0, (num >> 16) - amt);
                    const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
                    const B = Math.max(0, (num & 0x0000FF) - amt);
                    return `rgb(${R},${G},${B})`;
                }

                screenToLogic(screenX, screenY) {
                    return {
                        x: screenX + this.cameraX,
                        y: screenY
                    };
                }

                handlePointerDown(x, y) {
                    if (topBar.isPointInside(x, y)) {
                        return 'handled';
                    }
                    if (bottomBar.isPointInside(x, y)) {
                        return 'handled';
                    }
                    this.isDragging = true;
                    this.dragStartX = x;
                    this.dragStartCam = this.targetCameraX;
                    this.dragHistory = [{ x, t: performance.now() / 1000 }];
                    this.cameraVelocity = 0;
                    return 'dragging';
                }

                handlePointerMove(x, y) {
                    if (this.isDragging) {
                        const dx = x - this.dragStartX;
                        this.targetCameraX = this.dragStartCam - dx;
                        this.dragHistory.push({ x, t: performance.now() / 1000 });
                        if (this.dragHistory.length > 10) this.dragHistory.shift();
                    }

                    const logic = this.screenToLogic(x, y);
                    let found = null;
                    for (const building of this.buildings) {
                        if (Math.abs(building.x - logic.x) < building.width / 2 + 10 && logic.y > building.y - building.height - 10 && logic.y < building.y + 25) {
                            found = building.id;
                            break;
                        }
                    }
                    this.hoveredBuilding = found;
                }

                handlePointerUp(x, y) {
                    if (this.isDragging) {
                        this.isDragging = false;
                        if (this.dragHistory.length >= 2) {
                            const first = this.dragHistory[0];
                            const last = this.dragHistory[this.dragHistory.length - 1];
                            const dt = last.t - first.t;
                            if (dt > 0.01) {
                                const vx = -(last.x - first.x) / dt;
                                this.cameraVelocity = clamp(vx, -500, 500);
                            }
                        }
                        this.dragHistory = [];
                    }
                    return null;
                }

                handleClick(x, y) {
                    // 点击时关闭音乐引导提示
                    if (this.showMusicGuide) {
                        this.showMusicGuide = false;
                    }

                    const bottomBtn = bottomBar.handleClick(x, y);
                    if (bottomBtn) {
                        console.log(`点击了底栏按钮: ${bottomBtn}`);
                        return 'bottombar:' + bottomBtn;
                    }
                    const logic = this.screenToLogic(x, y);
                    const groundY = H * 0.55;
                    for (const building of this.buildings) {
                        if (Math.abs(building.x - logic.x) < building.width / 2 + 10 && logic.y > groundY - building.height - 10 && logic.y < groundY + 25) {
                            console.log(`点击了 ${building.name}`);
                            this.buildingPulse[building.id] = 1;
                            return 'building:' + building.id;
                        }
                    }
                    return null;
                }
            }

            homeScene = new HomeScene();

            // ============ 场景配置表 ============
            const SceneConfig = {
                loading: { requiresState: false, showTopBar: false, showBottomBar: false },
                world: { requiresState: true, showTopBar: false, showBottomBar: false },
                start: { requiresState: false, showTopBar: false, showBottomBar: false },
                home: { requiresState: true, showTopBar: true, showBottomBar: true },
                tutorial: { requiresState: true, showTopBar: false, showBottomBar: false },
                save: { requiresState: false, showTopBar: false, showBottomBar: false },
            };

            const SceneInstances = {
                loading: () => loadingScene,
                world: () => worldScene,
                start: () => startScene,
                home: () => homeScene,
                tutorial: () => tutorialScene,
                save: () => saveScene,
            };

            function switchScene(to) {
                const config = SceneConfig[to];
                if (!config) {
                    console.error(`❌ 未知场景: ${to}`);
                    return;
                }

                // 检查GameState依赖
                if (config.requiresState && !gs) {
                    console.error('GameState 尚未初始化，无法切换到', to);
                    return;
                }

                // 特殊处理：tutorial已完成时跳转到home
                if (to === 'tutorial' && gs && gs.tutorialCompleted) {
                    console.log('⚡ 新手引导已完成，跳转到家园');
                    to = 'home';
                }

                // 特殊处理：start场景需要清空GameState
                if (to === 'start') {
                    setGameState(null);
                    saveManager.currentSlotId = null;
                }

                // 更新当前场景标识
                currentScene = to;

                // 初始化目标场景
                const sceneInstance = SceneInstances[to];
                if (sceneInstance && sceneInstance()) {
                    sceneInstance().init();
                }

                // 统一控制UI栏显示
                if (config.showTopBar && topBar) {
                    topBar.show();
                } else if (topBar) {
                    topBar.hide();
                }

                if (config.showBottomBar && bottomBar) {
                    bottomBar.show();
                    bottomBar.activeButton = null;
                } else if (bottomBar) {
                    bottomBar.hide();
                }

                console.log(`🎬 场景切换: ${to}`);
            }

            // 初始场景
            startScene.init();
            currentScene = 'start';

            // ============ 输入处理 ============
            let pointerDown = false;
            let pointerX = 0;
            let pointerY = 0;
            let lastClickTime = 0;
            let clickX = 0;
            let clickY = 0;
            let hasMovedSinceDown = false;
            let battleSceneJustActive = false;

            function getEventPos(e) {
                const rect = canvas.getBoundingClientRect();
                let clientX, clientY;

                if (e.touches && e.touches.length > 0) {
                    clientX = e.touches[0].clientX;
                    clientY = e.touches[0].clientY;
                } else if (e.changedTouches && e.changedTouches.length > 0) {
                    clientX = e.changedTouches[0].clientX;
                    clientY = e.changedTouches[0].clientY;
                } else {
                    clientX = e.clientX;
                    clientY = e.clientY;
                }

                return {
                    x: clientX - rect.left,
                    y: clientY - rect.top
                };
            }

            canvas.addEventListener('pointerdown', function(e) {
                e.preventDefault();
                const pos = getEventPos(e);
                pointerDown = true;
                pointerX = pos.x;
                pointerY = pos.y;
                hasMovedSinceDown = false;
                clickX = pos.x;
                clickY = pos.y;
                battleSceneJustActive = false;

                if (battleScene.visible) {
                    battleSceneJustActive = true;
                    const result = battleScene.handleClick(pos.x, pos.y);
                    if (result === 'end') {
                        saveManager.autoSave(gs);
                        if (tutorialScene.isTutorialBattle) {
                            tutorialScene.isTutorialBattle = false;
                            tutorialScene.phase = 'complete';
                            tutorialScene.phaseTimer = 0;
                        }
                    }
                    return;
                }

                if (areaScene.visible) {
                    areaScene.handlePointerDown(pos.x, pos.y);
                    return;
                }

                if (currentScene === 'start') {
                    const result = startScene.handleClick(pos.x, pos.y);
                    if (result === 'next') {
                        switchScene('loading');
                    }
                } else if (currentScene === 'loading') {
                    const result = loadingScene.handleClick(pos.x, pos.y);
                    if (result === 'next') {
                        switchScene('save');
                    }
                } else if (currentScene === 'world') {
                    worldScene.handlePointerDown(pos.x, pos.y);
                } else if (currentScene === 'tutorial') {
                    const result = tutorialScene.handleClick(pos.x, pos.y);
                    if (result === 'complete') {
                        if (gs) {
                            gs.tutorialCompleted = true;
                            giveStarterItems(gs);
                        }
                        switchScene('home');
                    }
                } else if (currentScene === 'home') {
                    if (settingsPanel.visible) {
                        settingsPanel.handlePointerDown(pos.x, pos.y);
                    } else if (warehousePanel.visible) {
                        warehousePanel.handlePointerDown(pos.x, pos.y);
                    } else if (teamPanel.visible) {
                        teamPanel.handlePointerDown(pos.x, pos.y);
                    } else if (bagPanel.visible) {
                        bagPanel.handlePointerDown(pos.x, pos.y);
                    } else {
                        homeScene.handlePointerDown(pos.x, pos.y);
                    }
                } else if (currentScene === 'save') {
                    const result = saveScene.handleClick(pos.x, pos.y);
                    if (result === 'back') {
                        switchScene('start');
                    }
                }
            });

            canvas.addEventListener('pointermove', function(e) {
                e.preventDefault();
                if (!pointerDown) return;
                const pos = getEventPos(e);
                const dx = pos.x - pointerX;
                const dy = pos.y - pointerY;
                if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
                    hasMovedSinceDown = true;
                }
                pointerX = pos.x;
                pointerY = pos.y;

                if (battleScene.visible) {
                    battleScene.handlePointerMove(pos.x, pos.y);
                    return;
                }

                if (areaScene.visible) {
                    // 如果面板可见，优先让面板处理事件
                    if (bagPanel.visible) {
                        bagPanel.handlePointerMove(pos.x, pos.y);
                        return;
                    }
                    if (teamPanel.visible) {
                        teamPanel.handlePointerMove(pos.x, pos.y);
                        return;
                    }
                    if (warehousePanel.visible) {
                        warehousePanel.handlePointerMove(pos.x, pos.y);
                        return;
                    }

                    areaScene.handlePointerMove(pos.x, pos.y);
                    return;
                }

                if (currentScene === 'world') {
                    worldScene.handlePointerMove(pos.x, pos.y);
                } else if (currentScene === 'tutorial') {
                    tutorialScene.handlePointerMove(pos.x, pos.y);
                } else if (currentScene === 'home') {
                    if (settingsPanel.visible) {
                        settingsPanel.handlePointerMove(pos.x, pos.y);
                    } else if (warehousePanel.visible) {
                        warehousePanel.handlePointerMove(pos.x, pos.y);
                    } else if (teamPanel.visible) {
                        teamPanel.handlePointerMove(pos.x, pos.y);
                    } else if (bagPanel.visible) {
                        bagPanel.handlePointerMove(pos.x, pos.y);
                    } else {
                        homeScene.handlePointerMove(pos.x, pos.y);
                    }
                }
            });

            canvas.addEventListener('pointerup', function(e) {
                e.preventDefault();
                const pos = getEventPos(e);

                if (battleScene.visible || battleSceneJustActive) {
                    pointerDown = false;
                    hasMovedSinceDown = false;
                    battleSceneJustActive = false;
                    return;
                }

                if (areaScene.visible) {
                    // 如果面板可见，优先让面板处理事件
                    if (bagPanel.visible) {
                        bagPanel.handleClick(pos.x, pos.y);
                        pointerDown = false;
                        hasMovedSinceDown = false;
                        return;
                    }
                    if (teamPanel.visible) {
                        teamPanel.handleClick(pos.x, pos.y);
                        pointerDown = false;
                        hasMovedSinceDown = false;
                        return;
                    }
                    if (warehousePanel.visible) {
                        warehousePanel.handleClick(pos.x, pos.y);
                        pointerDown = false;
                        hasMovedSinceDown = false;
                        return;
                    }

                    // 面板都不可见，才处理区域地图事件
                    const result = areaScene.handlePointerUp(pos.x, pos.y);
                    if (result === 'back') {
                        areaScene.hide();
                    } else if (result && result.action === 'battle') {
                        const playerPet = gs.petManager.getFirstHealthyTeamMember();
                        if (playerPet) {
                            battleScene.init(playerPet, result.enemySpecies, result.enemyLevel);
                        } else {
                            areaScene.showHint('❌ 没有可战斗的宠物！', 3);
                        }
                    } else if (result && result.action === 'item') {
                        gs.bagManager.addItem(result.item, 1);
                    } else if (result && result.action === 'camp') {
                        for (const pet of gs.petManager.team) {
                            pet.rechargePp(2);
                            pet.resetCooldown();
                        }
                        areaScene.showHint('扎营休息，PP已恢复！', 2);
                    } else if (result === 'open_bag') {
                        bagPanel.show();
                    } else if (result === 'open_team') {
                        teamPanel.show();
                    }
                    pointerDown = false;
                    hasMovedSinceDown = false;
                    return;
                }

                if (currentScene === 'world') {
                    const result = worldScene.handlePointerUp(pos.x, pos.y);
                    if (result === 'back_to_home') {
                        saveManager.autoSave(gs);
                        switchScene('home');
                    }
                } else if (currentScene === 'home') {
                    if (settingsPanel.visible) {
                        settingsPanel.handlePointerUp();
                    } else if (warehousePanel.visible) {
                        warehousePanel.handlePointerUp(pos.x, pos.y);
                    } else if (teamPanel.visible) {
                        teamPanel.handlePointerUp(pos.x, pos.y);
                    } else if (bagPanel.visible) {
                        bagPanel.handlePointerUp(pos.x, pos.y);
                    } else {
                        homeScene.handlePointerUp(pos.x, pos.y);
                    }
                }

                if (!hasMovedSinceDown && currentScene === 'world') {
                    const result = worldScene.handleClick(clickX, clickY);
                    if (result === 'area') {
                        // 区域地图已初始化
                    }
                } else if (!hasMovedSinceDown && currentScene === 'home' && !areaScene.visible) {
                    let panelHandled = false;
                    if (settingsPanel.visible) {
                        settingsPanel.handleClick(clickX, clickY);
                        panelHandled = true;
                    } else if (warehousePanel.visible) {
                        warehousePanel.handleClick(clickX, clickY);
                        panelHandled = true;
                    } else if (teamPanel.visible) {
                        teamPanel.handleClick(clickX, clickY);
                        panelHandled = true;
                    } else if (bagPanel.visible) {
                        bagPanel.handleClick(clickX, clickY);
                        panelHandled = true;
                    }

                    if (!panelHandled) {
                        const result = homeScene.handleClick(clickX, clickY);
                        if (result && result.startsWith('bottombar:')) {
                            const btnId = result.split(':')[1];
                            if (btnId === 'adventure') {
                                switchScene('world');
                            } else if (btnId === 'bag') {
                                bagPanel.show();
                            } else if (btnId === 'task') {
                                console.log('打开任务');
                            } else if (btnId === 'team') {
                                teamPanel.show();
                            } else if (btnId === 'settings') {
                                settingsPanel.show();
                            }
                        } else if (result && result.startsWith('building:')) {
                            const buildingId = result.split(':')[1];
                            if (buildingId === 'warehouse') {
                                warehousePanel.show();
                            } else if (buildingId === 'shop') {
                                gs.bagManager.addItem('hp_potion', 1);
                                homeScene.showHint('🎁 获得生命药剂 x1', 2.5);
                                saveManager.autoSave(gs);
                            } else if (buildingId === 'house') {
                                // 小屋功能：每10分钟可领取一个普通球
                                const now = Date.now();
                                const elapsed = now - homeScene.houseLastClaimTime;
                                if (elapsed >= homeScene.HOUSE_COOLDOWN || homeScene.houseLastClaimTime === 0) {
                                    gs.bagManager.addItem('normal_ball', 1);
                                    homeScene.houseLastClaimTime = now;
                                    homeScene.showHint('🏡 获得普通球 x1', 2.5);
                                    saveManager.autoSave(gs);
                                } else {
                                    const remainingSec = Math.ceil((homeScene.HOUSE_COOLDOWN - elapsed) / 1000);
                                    const min = Math.floor(remainingSec / 60);
                                    const sec = remainingSec % 60;
                                    homeScene.showHint(`⏱️ 冷却中 ${min}:${sec.toString().padStart(2, '0')}`, 2.0);
                                }
                            } else if (buildingId === 'tree') {
                                rewardAdManager.setCallbacks({
                                    onReward: (amount) => {
                                        gs.playerData.gold += amount;
                                        homeScene.showHint(`💰 获得金币 x${amount}`, 2.5);
                                        saveManager.autoSave(gs);
                                    },
                                    onError: (code, msg) => {
                                        homeScene.showHint(`❌ 广告加载失败（${code}）`, 2.5);
                                    }
                                });
                                rewardAdManager.showAd();
                            }
                        }
                    }
                }

                pointerDown = false;
                hasMovedSinceDown = false;
            });

            canvas.addEventListener('pointerleave', function(e) {
                if (pointerDown && areaScene.visible) {
                    areaScene.isDragging = false;
                } else if (pointerDown && currentScene === 'world') {
                    worldScene.handlePointerUp(pointerX, pointerY);
                } else if (pointerDown && currentScene === 'home') {
                    homeScene.handlePointerUp(pointerX, pointerY);
                }
                pointerDown = false;
                hasMovedSinceDown = false;
                if (worldScene) {
                    worldScene.longPressTarget = null;
                    worldScene.longPressTimer = 0;
                }
            });

            // 防止双击缩放
            canvas.addEventListener('dblclick', function(e) {
                e.preventDefault();
            });

            // 键盘控制（调试/桌面端）
            window.addEventListener('keydown', function(e) {
                if (currentScene === 'world') {
                    const speed = 40;
                    if (e.key === 'ArrowLeft' || e.key === 'a') {
                        worldScene.targetCameraX -= speed;
                        worldScene.cameraVelocity = 0;
                    } else if (e.key === 'ArrowRight' || e.key === 'd') {
                        worldScene.targetCameraX += speed;
                        worldScene.cameraVelocity = 0;
                    } else if (e.key === 'Escape') {
                        switchScene('home');
                    } else if (e.key === 'm') {
                        worldScene.compassOpen = !worldScene.compassOpen;
                    }
                } else if (currentScene === 'home') {
                    const speed = 30;
                    if (e.key === 'ArrowLeft' || e.key === 'a') {
                        homeScene.targetCameraX -= speed;
                        homeScene.cameraVelocity = 0;
                    } else if (e.key === 'ArrowRight' || e.key === 'd') {
                        homeScene.targetCameraX += speed;
                        homeScene.cameraVelocity = 0;
                    } else if (e.key === 'Escape') {
                        if (settingsPanel.visible) {
                            settingsPanel.hide();
                        } else {
                            switchScene('start');
                        }
                    } else if (settingsPanel.visible) {
                        settingsPanel.handleInput(e.key);
                    }
                } else if (currentScene === 'start') {
                    if (e.key === 'Enter' || e.key === ' ') {
                        if (startScene.clickable && startScene.phase === 'idle') {
                            switchScene('loading');
                        }
                    }
                } else if (currentScene === 'loading') {
                    if (e.key === 'Enter' || e.key === ' ') {
                        if (loadingScene.isComplete()) {
                            switchScene('save');
                        }
                    }
                } else if (currentScene === 'save') {
                    if (saveScene.editDialog) {
                        e.preventDefault();
                        saveScene.handleInput(e.key);
                    } else if (e.key === 'Escape') {
                        switchScene('start');
                    }
                }
            });

            // ============ 游戏循环 ============
            let lastTime = performance.now() / 1000;
            let dt = 0;

            function gameLoop(timestamp) {
                const now = timestamp / 1000;
                dt = Math.min(now - lastTime, 0.1); // 防止大帧跳跃
                lastTime = now;

                if (dt <= 0) dt = 0.016;

                // 更新
                if (currentScene === 'start') {
                    startScene.update(dt);
                } else if (currentScene === 'loading') {
                    loadingScene.update(dt);
                    if (loadingScene.isComplete() && !loadingScene.readyToTransition) {
                        // 等待用户点击
                    } else if (loadingScene.readyToTransition && loadingScene.finishTimer > 1.5) {
                        // 自动过渡到存档场景
                        switchScene('save');
                    }
                } else if (currentScene === 'world') {
                    worldScene.update(dt);
                    const gameState = getGameState();
                    if (gameState) {
                        saveManager.updateAutoSaveTimer(dt, gameState);
                    }
                } else if (currentScene === 'home') {
                    homeScene.update(dt);
                    const gameState = getGameState();
                    if (gameState) {
                        saveManager.updateAutoSaveTimer(dt, gameState);
                    }
                } else if (currentScene === 'tutorial') {
                    tutorialScene.update(dt);
                    const gameState = getGameState();
                    if (gameState) {
                        saveManager.updateAutoSaveTimer(dt, gameState);
                    }
                } else if (currentScene === 'save') {
                    saveScene.update(dt);
                }

                // 顶栏更新
                topBar.update(dt);

                // 底栏更新
                bottomBar.update(dt);

                // 仓库界面更新
                warehousePanel.update(dt);

                // 队伍界面更新
                teamPanel.update(dt);

                // 背包界面更新
                bagPanel.update(dt);

                // 设置面板更新
                settingsPanel.update(dt);

                // 区域地图更新
                areaScene.update(dt);

                // 战斗场景更新
                battleScene.update(dt);

                // 渲染
                ctx.clearRect(0, 0, W, H);
                if (currentScene === 'start') {
                    startScene.draw(ctx);
                } else if (currentScene === 'loading') {
                    loadingScene.draw(ctx);
                } else if (currentScene === 'world') {
                    worldScene.draw(ctx);
                } else if (currentScene === 'home') {
                    homeScene.draw(ctx);
                    topBar.draw(ctx);
                    bottomBar.draw(ctx);
                    warehousePanel.draw(ctx);
                    teamPanel.draw(ctx);
                    bagPanel.draw(ctx);
                } else if (currentScene === 'tutorial') {
                    tutorialScene.draw(ctx);
                } else if (currentScene === 'save') {
                    saveScene.draw(ctx);
                }

                // 区域地图渲染（覆盖在世界地图之上）
                areaScene.draw(ctx);

                // 面板渲染（覆盖在区域地图之上）
                warehousePanel.draw(ctx);
                teamPanel.draw(ctx);
                bagPanel.draw(ctx);
                settingsPanel.draw(ctx);

                // 战斗场景渲染（覆盖在其他场景之上）
                battleScene.draw(ctx);

                requestAnimationFrame(gameLoop);
            }

            // ============ 启动 ============
            resizeCanvas();
            if (worldScene) worldScene.recalcDimensions();
            if (homeScene) homeScene.recalcDimensions();
            startScene.init();
            requestAnimationFrame(gameLoop);

            console.log('🌲 秘境猎人 - 游戏已就绪');
            console.log('  🖱️ 开始场景 → 点击进入加载场景');
            console.log('  ⏳ 加载场景 → 加载完成点击进入新手引导');
            console.log('  🎓 新手引导 → 选择宠物 → 战斗 → 进入家园');
            console.log('  🏠 家园场景：拖动探索，点击建筑');
            console.log('  🗺️ 点击冒险按钮进入世界地图 → 点击区域触发战斗');
            console.log('  ⌨️ 键盘：方向键移动 / M 罗盘 / Esc 返回');

        })();
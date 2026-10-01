// ============================================================================
// STELLAR TANK FRONTLINE - 核心游戏逻辑
// ============================================================================

'use strict';

// ===== CONFIG =====
const CONFIG = {
  CANVAS: { w: 1200, h: 800 },
  TILE: 40,
  PLAYER: {
    maxHp: 10, speed: 200, fireRate: 0.25,
    bulletSpeed: 500, bulletDmg: 2,
    maxSubWeapons: 3,
  },
  ENEMY_SPAWN_MAX_BASE: 5,
  ENEMY_SPAWN_MAX_ENDLESS: 12,
  DIFFICULTY_PER_LEVEL: { hpMul: 1.08, countAdd: 1, intervalMul: 0.95 },
  ENDLESS: {
    enabled: true,
    difficulty: { hpMul: 1.12, countAdd: 2, intervalMul: 0.93 },
    eliteStartLevel: 2,
    eliteProbFormula: (level) => Math.min(level / 15, 0.5),
    bossHpScale: (level) => 1 + level / 20,
    enhancedBossEvery: 10,
    rareUpgradeEvery: 5,
  },
  CREATIVE: {
    weaponChoices: 3,
    upgradeRounds: 30,
    maxUpgrades: 30,
    spawnTimer: 3,
    minOnField: 3,
    baseSpawnCount: 3,
    eliteBaseChance: 0.05,
    eliteChanceGrowth: 0.002,
    waveHpGrowth: 0.02,
  },
  CREATIVE_MAX_UPGRADES: 30,
  MODE: 'story',
};

// ===== WEAPON DEFINITIONS =====
const WEAPONS = {
  CANNON: { id: 'CANNON', name: '主炮', icon: '⚡', color: '#00f0ff', type: 'main',
    damage: 4, fireRate: 0.3, bulletSpeed: 600, pierce: 0, bulletRadius: 5 },
  LASER: { id: 'LASER', name: '激光', icon: '🔆', color: '#ff2e88', type: 'sub',
    damage: 6, fireRate: 2.0, isLaser: true, range: 0, reflect: 0, pierce: 0, instant: true },
  SHOTGUN: { id: 'SHOTGUN', name: '霰弹', icon: '💥', color: '#ffd700', type: 'sub',
    damage: 2, fireRate: 0.8, pellets: 5, spread: 0.3, bulletSpeed: 550, bulletRadius: 4 },
  MISSILE: { id: 'MISSILE', name: '导弹', icon: '🚀', color: '#00ff88', type: 'sub',
    damage: 8, fireRate: 1.2, bulletSpeed: 300, homing: true, explosionR: 60, bulletRadius: 6 },
  PLASMA: { id: 'PLASMA', name: '等离子', icon: '🔮', color: '#ff3b3b', type: 'sub',
    damage: 12, fireRate: 2.0, chargeTime: 1.0, bulletSpeed: 350, explosionR: 4, bulletRadius: 10 },
  FLAMETHROWER: { id: 'FLAMETHROWER', name: '火焰', icon: '🔥', color: '#ff6b00', type: 'sub',
    damage: 1, fireRate: 0.05, isFlame: true, range: 360, spread: 0.5 },
  LIGHTNING: { id: 'LIGHTNING', name: '闪电', icon: '⚡', color: '#a0ffff', type: 'sub',
    damage: 6, fireRate: 1.0, isLightning: true, chainCount: 3, chainRange: 150 },
  POISON: { id: 'POISON', name: '毒气', icon: '☣', color: '#88ff00', type: 'sub',
    damage: 0.6, fireRate: 1.5, isPoison: true, cloudRadius: 60, cloudDuration: 3 },
  DRONE: { id: 'DRONE', name: '无人机', icon: '🛩', color: '#00f0ff', type: 'independent',
    droneCount: 1, fireRate: 1.0, damage: 2, orbitRadius: 80, blockInterval: 3 },
  MINE: { id: 'MINE', name: '地雷', icon: '💣', color: '#ffd700', type: 'independent',
    damage: 20, triggerR: 40, explosionR: 120, maxMines: 5 },
};

const SUB_WEAPON_POOL = ['LASER', 'SHOTGUN', 'MISSILE', 'PLASMA', 'FLAMETHROWER', 'LIGHTNING', 'POISON'];

// ===== SYNERGY DEFINITIONS =====
const SYNERGY = {
  'DRONE+LASER': { desc: '激光蜂群', dmgMul: 1.4, droneLaser: true },
  'FLAMETHROWER+POISON': { desc: '剧毒爆燃', explosionDmg: 15, explosionR: 100, dmgMul: 1.5 },
  'LIGHTNING+DRONE': { desc: '能量共鸣', droneLightning: true },
  'LIGHTNING+LASER': { desc: '电光传导', chainDmg: 1, chainCount: 2 },
  'POISON+MINE': { desc: '腐蚀引爆', radiusMul: 2, poisonDur: 3 },
  'MISSILE+DRONE': { desc: '导航导弹', accuracyBonus: 0.3, explosionRBonus: 0.2 },
  'SHOTGUN+DRONE': { desc: '无人机散射', spreadSync: true },
  'FLAMETHROWER+MINE': { desc: '连锁爆炸', chainDmgMul: 1.5 },
  'PLASMA+POISON': { desc: '时空缓流', slowTime: 0.3 },
};

// ===== UPGRADE POOLS =====
const WEAPON_UPGRADES = [
  { id:'cannon_dmg', cat:'weapon', weapon:'CANNON', direction:'damage', maxLevel:5, name:'精准弹头', desc:'主炮伤害 +20%', apply:p=>{p.wLevels.CANNON.dmg++; p.cannonDmgMul*=1.2;} },
  { id:'cannon_firerate', cat:'weapon', weapon:'CANNON', direction:'firerate', maxLevel:5, name:'连发模块', desc:'主炮射速 -10%', apply:p=>{p.wLevels.CANNON.rate++; p.cannonRateMul*=0.9;} },
  { id:'cannon_multi', cat:'weapon', weapon:'CANNON', direction:'multi', maxLevel:3, name:'多重弹道', desc:'同时发射 +1 弹道', apply:p=>{p.wLevels.CANNON.multi++; p.cannonMulti++;} },
  { id:'cannon_explosive', cat:'weapon', weapon:'CANNON', direction:'explosive', maxLevel:1, name:'爆裂弹头', desc:'子弹附带小爆炸', apply:p=>{p.wLevels.CANNON.explosive++; p.cannonExplosive=true;} },
  { id:'laser_dmg', cat:'weapon', weapon:'LASER', direction:'damage', maxLevel:5, name:'聚焦激光', desc:'激光伤害 +20%', apply:p=>{p.wLevels.LASER.dmg++; p.subDmgMul.LASER*=1.2;} },
  { id:'laser_refract', cat:'weapon', weapon:'LASER', direction:'refract', maxLevel:5, name:'折射光束', desc:'激光折射 +1 次', apply:p=>{p.wLevels.LASER.refract++; p.laserRefract++;} },
  { id:'laser_pierce', cat:'weapon', weapon:'LASER', direction:'pierce', maxLevel:3, name:'穿透光束', desc:'激光穿透 +1', apply:p=>{p.wLevels.LASER.pierce++; p.laserPierce++;} },
  { id:'laser_focus', cat:'weapon', weapon:'LASER', direction:'focus', maxLevel:5, name:'集中光束', desc:'光束更集中+灼烧', apply:p=>{p.wLevels.LASER.focus++; p.laserFocusMul*=1.3;} },
  { id:'shotgun_pellets', cat:'weapon', weapon:'SHOTGUN', direction:'pellets', maxLevel:5, name:'霰弹扩散', desc:'弹丸 +2', apply:p=>{p.wLevels.SHOTGUN.pellets++; p.shotgunPellets+=2;} },
  { id:'shotgun_spread', cat:'weapon', weapon:'SHOTGUN', direction:'spread', maxLevel:3, name:'广域散射', desc:'散射角度 +10°', apply:p=>{p.wLevels.SHOTGUN.spread++; p.shotgunSpread+=0.17;} },
  { id:'shotgun_dmg', cat:'weapon', weapon:'SHOTGUN', direction:'damage', maxLevel:5, name:'重型霰弹', desc:'单弹伤害 +20%', apply:p=>{p.wLevels.SHOTGUN.dmg++; p.subDmgMul.SHOTGUN*=1.2;} },
  { id:'shotgun_condense', cat:'weapon', weapon:'SHOTGUN', direction:'condense', maxLevel:3, name:'凝聚射击', desc:'散射-10°，伤害+30%', apply:p=>{p.wLevels.SHOTGUN.condense++; p.shotgunCondense++;} },
  { id:'missile_dmg', cat:'weapon', weapon:'MISSILE', direction:'damage', maxLevel:5, name:'高爆弹头', desc:'导弹伤害 +25%', apply:p=>{p.wLevels.MISSILE.dmg++; p.subDmgMul.MISSILE*=1.25;} },
  { id:'missile_range', cat:'weapon', weapon:'MISSILE', direction:'range', maxLevel:5, name:'远程推进', desc:'导弹射程 +20%', apply:p=>{p.wLevels.MISSILE.range++; p.missileRangeMul*=1.2;} },
  { id:'missile_explode', cat:'weapon', weapon:'MISSILE', direction:'explode', maxLevel:3, name:'扩大爆炸', desc:'爆炸半径 +20px', apply:p=>{p.wLevels.MISSILE.explode++; p.missileExplodeR+=20;} },
  { id:'missile_guidance', cat:'weapon', weapon:'MISSILE', direction:'guidance', maxLevel:3, name:'精确制导', desc:'追踪精度 +20%', apply:p=>{p.wLevels.MISSILE.guidance++; p.missileHomingMul*=1.2;} },
  { id:'plasma_dmg', cat:'weapon', weapon:'PLASMA', direction:'damage', maxLevel:5, name:'等离子强化', desc:'伤害 +30%', apply:p=>{p.wLevels.PLASMA.dmg++; p.subDmgMul.PLASMA*=1.3;} },
  { id:'plasma_explode', cat:'weapon', weapon:'PLASMA', direction:'explode', maxLevel:3, name:'范围爆炸', desc:'爆炸半径 +20px', apply:p=>{p.wLevels.PLASMA.explode++; p.plasmaExplodeR+=20;} },
  { id:'plasma_charge', cat:'weapon', weapon:'PLASMA', direction:'charge', maxLevel:5, name:'快速蓄能', desc:'蓄力时间 -20%', apply:p=>{p.wLevels.PLASMA.charge++; p.plasmaChargeMul*=0.8;} },
  { id:'plasma_overload', cat:'weapon', weapon:'PLASMA', direction:'overload', maxLevel:1, name:'超载放电', desc:'释放弹射小等离子', apply:p=>{p.wLevels.PLASMA.overload++; p.plasmaOverload++;} },
  { id:'plasma_count', cat:'weapon', weapon:'PLASMA', direction:'count', maxLevel:3, name:'多重等离子', desc:'每次发射多1枚 (最多5枚)', apply:p=>{p.wLevels.PLASMA.count++; p.plasmaCount=Math.min(5,p.plasmaCount+1);} },
  { id:'flame_range', cat:'weapon', weapon:'FLAMETHROWER', direction:'range', maxLevel:5, name:'远距喷射', desc:'射程 +15%', apply:p=>{p.wLevels.FLAMETHROWER.range++; p.flameRangeMul*=1.15;} },
  { id:'flame_spread', cat:'weapon', weapon:'FLAMETHROWER', direction:'spread', maxLevel:3, name:'宽域喷射', desc:'扇角 +15°', apply:p=>{p.wLevels.FLAMETHROWER.spread++; p.flameSpreadMul*=1.15;} },
  { id:'flame_burn', cat:'weapon', weapon:'FLAMETHROWER', direction:'burn', maxLevel:5, name:'强化灼烧', desc:'灼烧伤害 +30%', apply:p=>{p.wLevels.FLAMETHROWER.burn++; p.flameBurnMul*=1.3;} },
  { id:'flame_burn_area', cat:'weapon', weapon:'FLAMETHROWER', direction:'burn_area', maxLevel:1, name:'灼烧区域', desc:'留下灼烧区域', apply:p=>{p.wLevels.FLAMETHROWER.burn_area++; p.flameBurnArea=true;} },
  { id:'flame_storm', cat:'weapon', weapon:'FLAMETHROWER', direction:'storm', maxLevel:5, name:'烈焰风暴', desc:'火焰范围 +15px', apply:p=>{p.wLevels.FLAMETHROWER.storm++; p.flameStormR+=15;} },
  { id:'lightning_chain', cat:'weapon', weapon:'LIGHTNING', direction:'chain', maxLevel:5, name:'连锁强化', desc:'跳跃数 +1', apply:p=>{p.wLevels.LIGHTNING.chain++; p.lightningChain++;} },
  { id:'lightning_dmg', cat:'weapon', weapon:'LIGHTNING', direction:'damage', maxLevel:5, name:'高压闪电', desc:'伤害 +25%', apply:p=>{p.wLevels.LIGHTNING.dmg++; p.subDmgMul.LIGHTNING*=1.25;} },
  { id:'lightning_stun', cat:'weapon', weapon:'LIGHTNING', direction:'stun', maxLevel:3, name:'麻痹强化', desc:'麻痹时间 +0.2s', apply:p=>{p.wLevels.LIGHTNING.stun++; p.lightningStun+=0.2;} },
  { id:'poison_dmg', cat:'weapon', weapon:'POISON', direction:'damage', maxLevel:5, name:'剧毒浓缩', desc:'毒云伤害 +30%', apply:p=>{p.wLevels.POISON.dmg++; p.subDmgMul.POISON*=1.3;} },
  { id:'poison_radius', cat:'weapon', weapon:'POISON', direction:'radius', maxLevel:3, name:'毒雾扩散', desc:'毒云半径 +15px', apply:p=>{p.wLevels.POISON.radius++; p.poisonR+=15;} },
  { id:'poison_dur', cat:'weapon', weapon:'POISON', direction:'duration', maxLevel:3, name:'持久毒雾', desc:'持续时间 +1s', apply:p=>{p.wLevels.POISON.duration++; p.poisonDur+=1;} },
  { id:'poison_spread', cat:'weapon', weapon:'POISON', direction:'spread', maxLevel:3, name:'剧毒扩散', desc:'减速效果 +10%', apply:p=>{p.wLevels.POISON.spread++; p.poisonSlowMul*=1.1;} },
  { id:'drone_count', cat:'weapon', weapon:'DRONE', direction:'count', maxLevel:4, name:'无人机增殖', desc:'数量 +1(上限5)', apply:p=>{p.wLevels.DRONE.count++; p.droneCount=Math.min(5,p.droneCount+1);} },
  { id:'drone_dmg', cat:'weapon', weapon:'DRONE', direction:'damage', maxLevel:5, name:'无人机火力', desc:'伤害 +25%', apply:p=>{p.wLevels.DRONE.dmg++; p.droneDmgMul*=1.25;} },
  { id:'drone_block', cat:'weapon', weapon:'DRONE', direction:'block', maxLevel:2, name:'防御拦截', desc:'拦截间隔 -1s', apply:p=>{p.wLevels.DRONE.block++; p.droneBlockInterval=Math.max(1,p.droneBlockInterval-1);} },
  { id:'mine_dmg', cat:'weapon', weapon:'MINE', direction:'damage', maxLevel:5, name:'强化地雷', desc:'伤害 +30%', apply:p=>{p.wLevels.MINE.dmg++; p.mineDmgMul*=1.3;} },
  { id:'mine_capacity', cat:'weapon', weapon:'MINE', direction:'capacity', maxLevel:3, name:'扩容部署', desc:'容量 +2', apply:p=>{p.wLevels.MINE.capacity++; p.maxMines+=2;} },
  { id:'mine_explode', cat:'weapon', weapon:'MINE', direction:'explode', maxLevel:3, name:'扩大爆区', desc:'爆炸半径 +20px', apply:p=>{p.wLevels.MINE.explode++; p.mineExplodeR+=20;} },
  { id:'mine_smart', cat:'weapon', weapon:'MINE', direction:'smart', maxLevel:1, name:'智能触发', desc:'预警 -0.2s', apply:p=>{p.wLevels.MINE.smart++; p.mineSmart=true;} },
  { id:'drone_unlock', cat:'independent', weapon:'DRONE', maxLevel:1, name:'解锁无人机', desc:'解锁独立武器：无人机，随后可出现其强化卡', apply:p=>{p.droneUnlocked=true; p.droneCount=Math.max(1,p.droneCount); if(!p.independentWeapons.includes('DRONE')) p.independentWeapons.push('DRONE');} },
  { id:'mine_unlock', cat:'independent', weapon:'MINE', maxLevel:1, name:'解锁地雷', desc:'解锁独立武器：地雷，随后可出现其强化卡', apply:p=>{p.mineUnlocked=true; if(!p.independentWeapons.includes('MINE')) p.independentWeapons.push('MINE');} },
];

const NON_WEAPON_UPGRADES = [
  { id:'synergy_drone_laser', cat:'synergy', maxLevel:3, name:'激光蜂群', desc:'无人机+激光联动(无人机发射激光)', apply:p=>{p.synergyUnlocks['DRONE+LASER']=true; p.synergyBonus['DRONE+LASER']=(p.synergyBonus['DRONE+LASER']||1)*1.4;} },
  { id:'synergy_flame_poison', cat:'synergy', maxLevel:3, name:'剧毒爆燃', desc:'火焰+毒气联动', apply:p=>{p.synergyUnlocks['FLAMETHROWER+POISON']=true; p.synergyBonus['FLAMETHROWER+POISON']=(p.synergyBonus['FLAMETHROWER+POISON']||1)*1.5;} },
  { id:'synergy_lightning_laser', cat:'synergy', maxLevel:3, name:'电光传导', desc:'闪电+激光联动', apply:p=>{p.synergyUnlocks['LIGHTNING+LASER']=true; p.synergyBonus['LIGHTNING+LASER']=(p.synergyBonus['LIGHTNING+LASER']||1)*1.3;} },
  { id:'synergy_chain', cat:'synergy', maxLevel:3, name:'能量共鸣', desc:'无人机+闪电联动(无人机发射小闪电)', apply:p=>{p.synergyUnlocks['LIGHTNING+DRONE']=true; p.synergyBonus['LIGHTNING+DRONE']=(p.synergyBonus['LIGHTNING+DRONE']||1)*1.3;} },
  { id:'synergy_flame_mine', cat:'synergy', maxLevel:3, name:'连锁爆炸', desc:'火焰+地雷联动', apply:p=>{p.synergyUnlocks['FLAMETHROWER+MINE']=true; p.synergyBonus['FLAMETHROWER+MINE']=(p.synergyBonus['FLAMETHROWER+MINE']||1)*1.5;} },
  { id:'synergy_missile_drone', cat:'synergy', maxLevel:3, name:'导航导弹', desc:'导弹+无人机联动', apply:p=>{p.synergyUnlocks['MISSILE+DRONE']=true; p.synergyBonus['MISSILE+DRONE']=(p.synergyBonus['MISSILE+DRONE']||1)*1.3;} },
  { id:'synergy_shotgun_drone', cat:'synergy', maxLevel:3, name:'广域制导', desc:'霰弹+无人机联动', apply:p=>{p.synergyUnlocks['SHOTGUN+DRONE']=true; p.synergyBonus['SHOTGUN+DRONE']=(p.synergyBonus['SHOTGUN+DRONE']||1)*1.3;} },
  { id:'synergy_poison_mine', cat:'synergy', maxLevel:3, name:'腐蚀引爆', desc:'毒气+地雷联动', apply:p=>{p.synergyUnlocks['POISON+MINE']=true; p.synergyBonus['POISON+MINE']=(p.synergyBonus['POISON+MINE']||1)*1.3;} },
  { id:'synergy_plasma_poison', cat:'synergy', maxLevel:3, name:'时空缓流', desc:'等离子+毒气联动', apply:p=>{p.synergyUnlocks['PLASMA+POISON']=true; p.synergyBonus['PLASMA+POISON']=(p.synergyBonus['PLASMA+POISON']||1)*1.3;} },
  { id:'hp', cat:'attr', maxLevel:5, name:'装甲强化', desc:'最大生命+2,立即回满', apply:p=>{p.maxHp+=2; p.hp=p.maxHp;} },
  { id:'speed', cat:'attr', maxLevel:5, name:'引擎过载', desc:'移动速度+20%', apply:p=>{p.speedMul*=1.2;} },
  { id:'firerate', cat:'attr', maxLevel:5, name:'连发模块', desc:'射速+25%', apply:p=>{p.fireRateMul*=1.25;} },
  { id:'bullet_speed', cat:'attr', maxLevel:5, name:'弹道加速', desc:'弹速+30%', apply:p=>{p.bulletSpeedMul*=1.3;} },
  { id:'max_shield', cat:'attr', maxLevel:3, name:'能量核心', desc:'护盾上限+1', apply:p=>{p.maxShield+=1; p.shield+=1;} },
  { id:'lifesteal', cat:'passive', maxLevel:5, name:'吸血纳米', desc:'击杀回0.2血', apply:p=>{p.passives.push('lifesteal');} },
  { id:'bounce', cat:'weapon', weapon:'CANNON', direction:'bounce', maxLevel:1, name:'弹射涂层', desc:'主炮子弹反弹1次', apply:p=>{p.cannonBounce=1; p.wLevels.CANNON.bounce=1;} },
  { id:'crit', cat:'passive', maxLevel:5, name:'暴击系统', desc:'暴击率+10%,伤害×2', apply:p=>{p.passives.push('crit'); p.critChance=(p.critChance||0)+0.1;} },
  { id:'armor', cat:'passive', maxLevel:5, name:'能量护盾', desc:'获得1层护盾', apply:p=>{p.shield+=1;} },
  { id:'ultimate_charge', cat:'passive', maxLevel:5, name:'快速充能', desc:'大招充能效率+20%', apply:p=>{p.chargePerKillBonus+=0.2;} },
  { id:'damage_reflect', cat:'passive', maxLevel:3, name:'伤害反弹', desc:'受到伤害反弹20%', apply:p=>{p.passives.push('reflect'); p.reflectDmg=0.2;} },
  { id:'dash_cd', cat:'passive', maxLevel:3, name:'快速闪避', desc:'闪避CD -30%', apply:p=>{p.dashCdMul*=0.7;} },
];

const ALL_UPGRADES = [...WEAPON_UPGRADES, ...NON_WEAPON_UPGRADES];

// ===== 图鉴数据 =====
const ENEMY_CODEX = [
  { id:'scout', name:'侦察兵', icon:'🚓', color:'#ff2e88', lock:1, tags:['高速追猎','无弹'], desc:'体积最小、速度最快，贴近玩家造成接触伤害' },
  { id:'bomber', name:'自爆兵', icon:'💣', color:'#ff3333', lock:1, tags:['接触自爆','威胁大'], desc:'不发射子弹，靠近目标后自爆，需优先清除' },
  { id:'sniper', name:'狙击手', icon:'🎯', color:'#e67e22', lock:2, tags:['远程','快速精准'], desc:'长炮管远程，子弹速度快、单发伤害高' },
  { id:'shotgun', name:'霰弹兵', icon:'💥', color:'#22eeaa', lock:3, tags:['近距离','扇面弹幕'], desc:'多管设计，近距离扇面散射' },
  { id:'heavy', name:'重甲兵', icon:'🛡', color:'#9b59b6', lock:4, tags:['高血高伤','慢速'], desc:'厚重装甲，单发瞄准高伤弹' },
];

const WEAPON_CODEX_DESC = {
  CANNON: '主武器：全能直射，可强化伤害 / 射速 / 多重弹道 / 爆炸 / 弹射',
  LASER: '副武器：瞬时光束，可折射、穿透',
  SHOTGUN: '副武器：近距离扇形散射',
  MISSILE: '副武器：追踪导弹，范围爆炸',
  PLASMA: '副武器：蓄力等离子，范围爆炸',
  FLAMETHROWER: '副武器：持续火焰喷射与灼烧',
  LIGHTNING: '副武器：链式闪电，跳跃传导',
  POISON: '副武器：毒气云，持续伤害减速',
  DRONE: '独立武器：环绕作战的无人机蜂群',
  MINE: '独立武器：定点部署地雷',
};
const CODEX_WEAPON_ORDER = ['CANNON','LASER','SHOTGUN','MISSILE','PLASMA','FLAMETHROWER','LIGHTNING','POISON','DRONE','MINE'];

const BOSS_CODEX = [
  { id:'boss1', name:'铁壁哨兵', icon:'🏰', color:'#ff4444', lock:5, tags:['旋转炮台','重火力'], desc:'守卫型四足旋转炮台：扇形 / 分裂 / 导弹 / 灼烧' },
  { id:'boss2', name:'裂空巡洋', icon:'🛸', color:'#ffd700', lock:10, tags:['轨道空袭','精准打击'], desc:'椭圆轨道悬浮要塞：瞄准 / 激光 / 射线 / 导弹，最多三阶段' },
  { id:'boss3', name:'量子双子', icon:'☯', color:'#a855f7', lock:15, tags:['双体协同','半血分离'], desc:'蓝紫旋转双体，半血后分裂为两个独立单位协同作战，最多三阶段' },
  { id:'boss4', name:'终焉引擎', icon:'☠', color:'#ff6600', lock:20, tags:['最终Boss','全弹幕'], desc:'三阶段形态，阶段3弱点闪烁，兼有全部攻击方式，最多三阶段' },
];

function openCodex(tab = 'weapon') {
  document.getElementById('codex-overlay').classList.remove('hidden');
  changeCodexTab(tab);
}
function closeCodex() {
  document.getElementById('codex-overlay').classList.add('hidden');
}
function changeCodexTab(tab) {
  document.querySelectorAll('.codex-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  const left = document.getElementById('codex-left');
  const right = document.getElementById('codex-right');
  left.classList.toggle('active', tab === 'weapon');
  right.classList.toggle('active', tab === 'enemy');
  if(tab === 'weapon') renderWeaponCodex();
  else renderEnemyCodex();
}
function renderWeaponCodex() {
  const box = document.getElementById('codex-weapon-list');
  if(!box) return;
  let html = '';
  for(const wid of CODEX_WEAPON_ORDER) {
    const w = WEAPONS[wid];
    if(!w) continue;
    const cards = ALL_UPGRADES.filter(u => u.weapon === wid);
    const typeLabel = w.type === 'main' ? '主武器' : w.type === 'independent' ? '独立武器' : '副武器';
    html += `<div class="codex-weapon-group">
      <div class="cw-head">
        <span class="cw-icon" style="color:${w.color}">${w.icon}</span>
        <span class="cw-name">${w.name}</span>
        <span class="cw-type">${typeLabel}</span>
      </div>
      <div class="cw-desc">${WEAPON_CODEX_DESC[wid] || ''}</div>
      ${cards.length ? `<div class="cw-cards">${cards.map(u => `<span class="codem-card"><i>${u.name}</i><em>Lv${u.maxLevel||99}</em></span>`).join('')}</div>` : ''}
    </div>`;
  }
  box.innerHTML = html;
}
function renderEnemyCodex() {
  const box = document.getElementById('codex-enemy-list');
  if(!box) return;
  let html = '';
  for(const e of ENEMY_CODEX) {
    html += `<div class="codex-enemy-group">
      <div class="ce-head">
        <span class="ce-icon" style="color:${e.color}">${e.icon}</span>
        <div class="ce-info">
          <div class="ce-name">${e.name}<em>Lv${e.lock} 解锁</em></div>
          <div class="ce-tags">${e.tags.map(t => `<span>${t}</span>`).join('')}</div>
        </div>
      </div>
      <div class="ce-desc">${e.desc}</div>
    </div>`;
  }
  // Boss 分节
  html += `<div class="codex-section-title">— BOSS —</div>`;
  for(const b of BOSS_CODEX) {
    html += `<div class="codex-enemy-group codex-boss">
      <div class="ce-head">
        <span class="ce-icon" style="color:${b.color}">${b.icon}</span>
        <div class="ce-info">
          <div class="ce-name">${b.name}<em>Lv${b.lock} Boss</em></div>
          <div class="ce-tags">${b.tags.map(t => `<span>${t}</span>`).join('')}</div>
        </div>
      </div>
      <div class="ce-desc">${b.desc}</div>
    </div>`;
  }
  box.innerHTML = html;
}

// ===== INPUT =====
const Input = {
  keys: {},
  mouse: { x: 0, y: 0, down: false, onUI: false, inNoFireZone: false },
  init(canvas) {
    window.addEventListener('keydown', e => { this.keys[e.code] = true; if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault(); });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; });
    canvas.addEventListener('mousemove', e => {
      const r = canvas.getBoundingClientRect();
      this.mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
      this.mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
      
      // 检测鼠标是否在按钮或交互元素上（仅检查真正的按钮元素）
      const el = document.elementFromPoint(e.clientX, e.clientY);
      let onButton = false;
      if(el && el.tagName === 'BUTTON') {
        onButton = true;
      } else if(el) {
        // 向上遍历查找按钮元素
        let checkEl = el;
        while(checkEl && checkEl !== document.body && checkEl.id !== 'game-container') {
          if(checkEl.tagName === 'BUTTON') {
            onButton = true;
            break;
          }
          checkEl = checkEl.parentNode;
        }
      }
      
      // 简化禁止开火区域：只检查左上角和右上角的设置按钮区域
      const hudH = 60;
      const cornerW = canvas.width * 0.15;  // 缩小检测区域到15%
      const inCornerZone = this.mouse.y < hudH && (this.mouse.x < cornerW || this.mouse.x > canvas.width - cornerW);
      
      this.mouse.onUI = onButton;
      this.mouse.inNoFireZone = inCornerZone;
    });
    canvas.addEventListener('mousedown', e => { 
      if(e.button === 0) {
        // 按下鼠标时检查是否在按钮上
        const el = document.elementFromPoint(e.clientX, e.clientY);
        let onButton = false;
        if(el && el.tagName === 'BUTTON') {
          onButton = true;
        } else if(el) {
          let checkEl = el;
          while(checkEl && checkEl !== document.body && checkEl.id !== 'game-container') {
            if(checkEl.tagName === 'BUTTON') {
              onButton = true;
              break;
            }
            checkEl = checkEl.parentNode;
          }
        }
        // 只有不在按钮上，且不在禁止开火区域时才触发开火
        if(!onButton && !this.mouse.inNoFireZone) {
          this.mouse.down = true;
        }
      }
    });
    canvas.addEventListener('mouseup', e => { if(e.button === 0) this.mouse.down = false; });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('mouseup', e => { if(e.button === 0) this.mouse.down = false; });
    // 添加全局mousedown监听，确保即使canvas没有捕获也能正常开火
    document.addEventListener('mousedown', e => {
      if(e.button === 0 && e.target === canvas) {
        const r = canvas.getBoundingClientRect();
        const x = (e.clientX - r.left) * (canvas.width / r.width);
        const y = (e.clientY - r.top) * (canvas.height / r.height);
        const hudH = 60;
        const cornerW = canvas.width * 0.15;
        const inCornerZone = y < hudH && (x < cornerW || x > canvas.width - cornerW);
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const onButton = el && el.tagName === 'BUTTON';
        if(!onButton && !inCornerZone) {
          this.mouse.down = true;
        }
      }
    });
  },
  isDown(code) { return !!this.keys[code]; },
  justPressed(code) { return this.keys[code] && !this._prev[code]; },
  update() { this._prev = { ...this.keys }; },
  _prev: {},
};

// ===== AUDIO SYSTEM =====
const AudioMgr = {
  ctx: null,
  musicMuted: false,
  sfxMuted: false,
  bgmPlaying: false,
  sounds: {},
  soundsLoaded: false,
  
  // 武器开火音频映射（实际音频文件）
  fireSoundMap: {
    fire_cannon: '主炮开火.mp3',
    fire_laser: '激光射击.mp3',
    fire_shotgun: '霰弹枪开火.mp3',
    fire_lightning: '闪电.mp3'
  },
  
  // 武器击中音频
  hitSoundMap: {
    hit_cannon: '爆炸.mp3',
    hit_missile: '爆炸.mp3',
    hit_mine: '爆炸.mp3'
  },
  
  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.preloadSounds();
      this.setupUnlockListener();
    } catch(e) {
      console.warn('Web Audio not supported');
    }
  },
  
  // 在用户交互时确保音频上下文激活（持久监听）
  setupUnlockListener() {
    this._unlockHandler = () => {
      if(this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().then(() => {
          console.log('AudioContext resumed');
        }).catch(err => {
          console.warn('Failed to resume AudioContext:', err);
        });
      }
    };
    
    document.addEventListener('click', this._unlockHandler);
    document.addEventListener('keydown', this._unlockHandler);
    document.addEventListener('touchstart', this._unlockHandler);
    window.addEventListener('keydown', this._unlockHandler);
    window.addEventListener('touchstart', this._unlockHandler);
    window.addEventListener('focus', this._unlockHandler);
  },
  
  // 预加载所有音频文件
  async preloadSounds() {
    const soundDir = 'sounds/';
    console.log('开始加载音频文件...');
    const firePromises = Object.entries(this.fireSoundMap).map(async ([key, filename]) => {
      try {
        const response = await fetch(soundDir + filename);
        if(!response.ok) throw new Error('HTTP ' + response.status);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
        this.sounds[key] = { buffer: audioBuffer, loaded: true };
        console.log('音频加载成功:', filename);
      } catch(e) {
        console.warn('音频加载失败:', filename, e.message);
        this.sounds[key] = { buffer: null, loaded: false };
      }
    });
    const hitPromises = Object.entries(this.hitSoundMap).map(async ([key, filename]) => {
      try {
        const response = await fetch(soundDir + filename);
        if(!response.ok) throw new Error('HTTP ' + response.status);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
        this.sounds[key] = { buffer: audioBuffer, loaded: true };
        console.log('击中音频加载成功:', filename);
      } catch(e) {
        console.warn('击中音频加载失败:', filename, e.message);
        this.sounds[key] = { buffer: null, loaded: false };
      }
    });
    await Promise.all([...firePromises, ...hitPromises]);
    this.soundsLoaded = true;
    console.log('音频加载完成');
  },
  
  // 播放音频文件（支持剪辑、支持并发）- 音效受sfxMuted控制
  playSound(soundKey, vol = 0.7, startTime = 0, duration = null) {
    if(!this.ctx || this.sfxMuted) return false;
    const soundData = this.sounds[soundKey];
    if(!soundData || !soundData.buffer) return false;
    
    if(this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    
    try {
      const source = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      
      source.buffer = soundData.buffer;
      
      const bufferDuration = soundData.buffer.duration;
      const actualDuration = duration ? Math.min(duration, bufferDuration - startTime) : bufferDuration - startTime;
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 8000;
      filter.Q.value = 0.7;
      
      const adjustedVol = vol * 0.6;
      gain.gain.setValueAtTime(adjustedVol, this.ctx.currentTime);
      
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      
      const now = this.ctx.currentTime;
      source.start(now, startTime, actualDuration);
      
      source.onended = () => {
        try { source.disconnect(); } catch(e) {}
        try { gain.disconnect(); } catch(e) {}
        try { filter.disconnect(); } catch(e) {}
      };
      
      return true;
    } catch(e) {
      console.error('playSound error:', soundKey, e);
      return false;
    }
  },
  
  // 循环播放音频文件（用于持续音效）
  playSoundLoop(soundKey, vol = 0.7) {
    if(!this.ctx || this.sfxMuted) return null;
    const soundData = this.sounds[soundKey];
    if(!soundData || !soundData.loaded || !soundData.buffer) return null;
    
    try {
      const source = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      
      source.buffer = soundData.buffer;
      source.loop = true;
      gain.gain.setValueAtTime(vol, this.ctx.currentTime);
      
      source.connect(gain);
      gain.connect(this.ctx.destination);
      
      source.start(0);
      return { source, gain };
    } catch(e) {
      return null;
    }
  },
  
  resume() {
    if(this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => {
        console.log('AudioContext resumed, state:', this.ctx.state);
      }).catch(err => {
        console.warn('Failed to resume AudioContext:', err);
      });
    }
    // 如果音频上下文丢失，尝试重新创建
    if(!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch(e) {
        console.warn('Failed to recreate AudioContext:', e);
      }
    }
  },
  
  // 设置静音状态
  setMusicMuted(m) { this.musicMuted = m; },
  setSfxMuted(m) { this.sfxMuted = m; },
  setMuted(m) { this.musicMuted = m; this.sfxMuted = m; },  // 兼容旧代码
  
  // 基础音效生成 - 受sfxMuted控制
  playTone(freq, dur, type='sine', vol=0.1, freqEnd=null) {
    if(!this.ctx || this.sfxMuted) return;
    if(this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    if(freqEnd !== null) {
      osc.frequency.exponentialRampToValueAtTime(freqEnd, this.ctx.currentTime + dur);
    }
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + dur);
  },
  
  // 噪声生成器 - 用于击中音效
  playNoise(dur, vol=0.1, filterFreq=2000, filterQ=1) {
    if(!this.ctx || this.sfxMuted) return;
    if(this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    const bufferSize = this.ctx.sampleRate * dur;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for(let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, this.ctx.currentTime);
    filter.Q.value = filterQ;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    source.start();
    source.stop(this.ctx.currentTime + dur);
  },
  
  // === 开火音效（按武器类型区分）===
  fire(weaponId) {
    const type = (weaponId || '').toLowerCase();
    // 导弹、地雷、毒气无开火音效
    if(type === 'missile' || type === 'mine' || type === 'poison') {
      return;
    }
    // 优先使用音频文件
    const fireKey = 'fire_' + type;
    if(this.sounds[fireKey] && this.sounds[fireKey].loaded && this.sounds[fireKey].buffer) {
      const configs = {
        cannon: { vol: 0.35, duration: 0.3 },
        laser: { vol: 0.3, duration: 0.15 },
        shotgun: { vol: 0.4, duration: 0.25 },
        lightning: { vol: 0.35, duration: 0.2 }
      };
      const config = configs[type] || { vol: 0.3, duration: 0.2 };
      if(this.playSound(fireKey, config.vol, 0, config.duration)) {
        return;
      }
    }
    // 回退到程序化合成
    this._fallbackFireSound(type);
  },
  
  // shoot方法 - fire的别名，兼容旧代码
  shoot(weaponId) {
    this.fire(weaponId);
  },
  
  // 回退开火音效
  _fallbackFireSound(weaponType) {
    switch(weaponType) {
      case 'cannon':
        this.playTone(50, 0.15, 'sine', 0.18, 25);
        setTimeout(() => this.playTone(40, 0.12, 'square', 0.12, 20), 3);
        setTimeout(() => this.playTone(80, 0.08, 'square', 0.1, 50), 8);
        setTimeout(() => this.playTone(30, 0.25, 'sawtooth', 0.1, 15), 12);
        break;
      case 'laser':
        this.playTone(2000, 0.08, 'sawtooth', 0.08, 800);
        setTimeout(() => this.playTone(1500, 0.06, 'sine', 0.05, 600), 5);
        break;
      case 'shotgun':
        this.playTone(250, 0.08, 'square', 0.12, 80);
        setTimeout(() => this.playTone(180, 0.05, 'sawtooth', 0.1, 60), 10);
        setTimeout(() => this.playTone(120, 0.06, 'square', 0.08, 50), 20);
        break;
      case 'missile':
      case 'mine':
      case 'poison':
        return;
      case 'plasma':
        this.playTone(400, 0.1, 'sine', 0.12, 150);
        setTimeout(() => this.playTone(300, 0.08, 'triangle', 0.1, 200), 8);
        setTimeout(() => this.playTone(500, 0.06, 'sine', 0.08, 100), 15);
        break;
      case 'flamethrower':
        // 烈焰风暴开火音效 - 已禁用
        return;
      case 'lightning':
        this.playTone(3000, 0.05, 'square', 0.1, 2000);
        setTimeout(() => this.playTone(2500, 0.04, 'sine', 0.08, 1500), 5);
        setTimeout(() => this.playTone(1800, 0.06, 'sawtooth', 0.06, 1000), 10);
        break;
      case 'drone':
        this.playTone(800, 0.04, 'sine', 0.06, 600);
        break;
      default:
        this.playTone(100, 0.1, 'square', 0.1, 50);
    }
  },
  
  // === 击中音效（按武器类型区分）===
  hit(weaponId, isExplosive = false) {
    const type = (weaponId || '').toLowerCase();
    
    // 毒气、等离子、霰弹、激光无击中音效
    if(type === 'poison' || type === 'plasma' || type === 'shotgun' || type === 'laser') {
      return;
    }
    
    // 检查是否有音频文件击中音效
    const hitKey = 'hit_' + type;
    if(this.sounds[hitKey] && this.sounds[hitKey].loaded && this.sounds[hitKey].buffer) {
      const configs = {
        cannon: { vol: 0.4, duration: 0.4 },
        missile: { vol: 0.5, duration: 0.6 },
        mine: { vol: 0.6, duration: 0.8 }
      };
      const config = configs[type] || { vol: 0.4, duration: 0.4 };
      if(this.playSound(hitKey, config.vol, 0, config.duration)) {
        return;
      }
    }
    
    switch(type) {
      case 'cannon':
        // 回退：金属撞击声
        this.playNoise(0.06, 0.12, 3000, 2);
        setTimeout(() => this.playTone(200, 0.04, 'square', 0.08, 100), 5);
        break;
      case 'missile':
        // 回退：导弹爆炸
        this._explosionHit('medium');
        break;
      case 'flamethrower':
        // 火焰灼烧 - 已禁用音效
        return;
      case 'lightning':
        // 闪电击穿
        this.playTone(1200, 0.03, 'square', 0.1, 600);
        setTimeout(() => this.playTone(800, 0.04, 'sine', 0.08, 400), 4);
        setTimeout(() => this.playNoise(0.04, 0.06, 4000, 2), 8);
        break;
      case 'mine':
        // 回退：地雷大爆炸
        this._explosionHit('boss');
        break;
      case 'drone':
        // 无人机小命中
        this.playTone(600, 0.03, 'sine', 0.08, 300);
        break;
      default:
        if(isExplosive) {
          this._explosionHit('small');
        } else {
          this.playNoise(0.05, 0.08, 2500, 2);
        }
    }
  },
  
  // 爆炸击中音效
  _explosionHit(size = 'small') {
    const configs = {
      small: { noiseDur: 0.15, noiseVol: 0.12, filterFreq: 800, toneFreq: 120, toneDur: 0.15 },
      medium: { noiseDur: 0.25, noiseVol: 0.15, filterFreq: 600, toneFreq: 80, toneDur: 0.25 },
      boss: { noiseDur: 0.5, noiseVol: 0.2, filterFreq: 400, toneFreq: 60, toneDur: 0.5 }
    };
    const c = configs[size] || configs.small;
    this.playNoise(c.noiseDur, c.noiseVol, c.filterFreq, 1);
    setTimeout(() => this.playTone(c.toneFreq, c.toneDur, 'sawtooth', c.noiseVol * 0.6, c.toneFreq * 0.3), 20);
    if(size === 'boss') {
      setTimeout(() => this.playTone(40, 0.4, 'square', 0.12, 15), 50);
      setTimeout(() => this.playTone(60, 0.3, 'triangle', 0.08, 20), 100);
    }
  },
  
  // === 通用音效 ===
  explosion(size='small') {
    // 爆炸音效 - 使用击中系统
    if(size === 'boss') {
      this.hit('mine', true);
    } else if(size === 'medium') {
      this.hit('missile', true);
    } else {
      this.hit('cannon', true);
    }
  },
  
  pickup(type='coin') {
    switch(type) {
      case 'heal':
        this.playTone(600, 0.1, 'sine', 0.1, 800);
        setTimeout(() => this.playTone(800, 0.1, 'sine', 0.1, 1000), 50);
        break;
      case 'shield':
        this.playTone(400, 0.15, 'triangle', 0.1, 600);
        break;
      case 'score':
      default:
        this.playTone(1000, 0.08, 'sine', 0.08, 1200);
    }
  },
  
  // 技能释放音效
  skill(type='dash') {
    switch(type) {
      case 'dash':
        this.playTone(200, 0.2, 'sine', 0.1, 600);
        break;
      case 'nuke':
        this.playTone(50, 0.8, 'sawtooth', 0.25, 10);
        setTimeout(() => this.playTone(30, 0.6, 'square', 0.2, 5), 100);
        break;
      case 'mine':
        this.playTone(80, 0.15, 'square', 0.1, 60);
        break;
      case 'ultimate':
        this.playTone(100, 0.3, 'sawtooth', 0.15, 200);
        setTimeout(() => this.playTone(200, 0.2, 'sine', 0.1, 400), 100);
        break;
      default:
        this.playTone(300, 0.15, 'triangle', 0.08);
    }
  },
  
  // 受伤音效
  hurt(serious=false) {
    if(serious) {
      this.playTone(200, 0.3, 'sawtooth', 0.15, 100);
    } else {
      this.playTone(400, 0.1, 'square', 0.1, 200);
    }
  },
  
  // BOSS音效
  bossAppear() {
    this.playTone(60, 0.8, 'sawtooth', 0.2, 30);
    setTimeout(() => this.playTone(80, 0.6, 'square', 0.15, 40), 200);
  },
  
  bossDefeated() {
    this.playTone(100, 0.5, 'sawtooth', 0.2, 200);
    setTimeout(() => this.playTone(200, 0.4, 'sine', 0.15, 400), 300);
    setTimeout(() => this.playTone(400, 0.3, 'triangle', 0.1, 600), 600);
  },
  
  // 背景音乐 - 简单循环（受musicMuted控制）
  startBGM(mode='normal') {
    if(this.bgmPlaying) return;
    if(!this.ctx || this.musicMuted) return;
    this.bgmPlaying = true;
    
    const bgmPatterns = {
    normal: [220, 262, 196, 174, 196, 220, 262, 196],
      boss: [110, 130, 98, 87, 98, 110, 130, 147],
      menu: [440, 523, 659, 523, 440, 523, 659, 784],
      endless: [147, 174, 130, 110, 130, 147, 174, 196],
      creative: [262, 330, 392, 330, 262, 330, 392, 440]
    };
    
    const pattern = bgmPatterns[mode] || bgmPatterns.normal;
    let noteIndex = 0;
    
    const playNote = () => {
      if(!this.bgmPlaying || this.musicMuted) return;
      const freq = pattern[noteIndex % pattern.length];
      const noteType = (mode === 'boss' || mode === 'endless') ? 'sawtooth' : 'triangle';
      const vol = mode === 'menu' ? 0.03 : 0.04;
      // BGM使用独立的playTone检查musicMuted，但由于playTone检查sfxMuted
      // 需要一个独立的BGM播放方法
      this._playBgmNote(freq, 0.25, noteType, vol);
      noteIndex++;
      setTimeout(playNote, 300);
    };
    
    playNote();
  },
  
  // BGM音符播放 - 独立于音效控制
  _playBgmNote(freq, dur, type='triangle', vol=0.04) {
    if(!this.ctx || this.musicMuted) return;
    if(this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + dur);
  },
  
  stopBGM() {
    this.bgmPlaying = false;
  }
};

// ===== UTILITIES =====
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function angle(a, b) { return Math.atan2(b.y - a.y, b.x - a.x); }
function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function rand(min, max) { return Math.random() * (max - min) + min; }
function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / len2;
  t = clamp(t, 0, 1);
  const cx = x1 + t * dx, cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ===== SPRITE MANAGER =====
const SpriteMgr = {
  sprites: {},
  basePath: 'enemies/',
  
  loadAll() {
    // 仅加载实际存在的精灵文件，避免 404 报错；
    // 敌人/玩家/Boss 均使用 Canvas 绘制，无需精灵图
    const spriteList = [
      '无人机', 'entity_mine', '导弹'
    ];
    spriteList.forEach(name => this.loadSprite(name, 0));
  },

  loadSprite(name, attempt) {
    const img = new Image();
    img.onload = () => {
      this.sprites[name] = img;
      this.spritesReadyMs = Date.now();
    };
    img.onerror = () => {
      // 偶发网络/缓存导致的加载失败：自动重试，最多 3 次尝试（每次递减间隔）
      if(attempt < 2) {
        const delay = 250 * (attempt + 1);
        setTimeout(() => this.loadSprite(name, attempt + 1), delay);
      } else {
        // 仍失败则置空，交给调用方走 canvas 占位绘制
        this.sprites[name] = null;
        console.warn(`[SpriteMgr] 加载失败: enemies/${name}.png`);
      }
    };
    img.src = this.basePath + name + '.png';
    // 先占位引用，drawSprite 会自动等待 complete
    this.sprites[name] = img;
  },

  get(name) {
    return this.sprites[name] || null;
  },
  
  drawSprite(ctx, name, x, y, size, rotation=0) {
    const img = this.sprites[name];
    if(!img || !img.complete || img.naturalWidth === 0) return false;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    const aspect = img.naturalHeight / img.naturalWidth;
    const w = size;
    const h = size * aspect;
    // 开启图像平滑，贴合显示尺寸，保证缩放后清晰
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, -w/2, -h/2, w, h);
    ctx.restore();
    return true;
  }
};

// ===== PARTICLE =====
class Particle {
  constructor(x, y, vx, vy, color, life, size, type='circle') {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.color = color; this.life = life; this.maxLife = life;
    this.size = size; this.type = type;
    this.gravity = 0; this.friction = 0.95;
  }
  update(dt) {
    this.vx *= this.friction; this.vy *= this.friction;
    this.vy += this.gravity * dt;
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.life -= dt;
  }
  draw(ctx) {
    const a = Math.max(0, this.life / this.maxLife);
    ctx.globalAlpha = a;
    if(this.type === 'circle') {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * a, 0, Math.PI * 2);
      ctx.fill();
    } else if(this.type === 'spark') {
      ctx.strokeStyle = this.color; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x - this.vx * 0.02, this.y - this.vy * 0.02);
      ctx.stroke();
    } else if(this.type === 'ring') {
      ctx.strokeStyle = this.color; ctx.lineWidth = 2;
      const r = (1 - a) * this.size * 3;
      ctx.beginPath();
      ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  get dead() { return this.life <= 0; }
}

// ===== FRAGMENT =====
class Fragment {
  constructor(x, y, vx, vy, color, life, size, angle) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.color = color; this.life = life; this.maxLife = life;
    this.size = size; this.angle = angle || 0;
    this.rotSpeed = rand(-8, 8);
    this.friction = 0.92;
  }
  update(dt) {
    this.vx *= this.friction; this.vy *= this.friction;
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.angle += this.rotSpeed * dt;
    this.life -= dt;
  }
  draw(ctx) {
    const a = Math.max(0, this.life / this.maxLife);
    ctx.globalAlpha = a;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color; ctx.shadowBlur = 5;
    ctx.beginPath();
    const s = this.size * a;
    ctx.moveTo(-s*0.5, -s*0.3);
    ctx.lineTo(s*0.4, -s*0.5);
    ctx.lineTo(s*0.6, s*0.2);
    ctx.lineTo(-s*0.2, s*0.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  get dead() { return this.life <= 0; }
}

// ===== FLOATING TEXT =====
class FloatingText {
  constructor(x, y, text, color='#fff', size=14) {
    this.x = x; this.y = y; this.text = text; this.color = color;
    this.size = size; this.life = 1; this.maxLife = 1;
    this.vy = -40;
  }
  update(dt) { this.y += this.vy * dt; this.life -= dt; }
  draw(ctx) {
    const a = Math.max(0, this.life / this.maxLife);
    ctx.globalAlpha = a;
    ctx.font = `bold ${this.size}px 'Segoe UI', sans-serif`;
    ctx.fillStyle = this.color;
    ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
    ctx.textAlign = 'center';
    ctx.strokeText(this.text, this.x, this.y);
    ctx.fillText(this.text, this.x, this.y);
    ctx.globalAlpha = 1;
  }
  get dead() { return this.life <= 0; }
}

// ===== BULLET =====
class Bullet {
  constructor(x, y, angle, speed, damage, radius, color, opts={}) {
    this.x = x; this.y = y;
    this.vx = Math.cos(angle) * speed; this.vy = Math.sin(angle) * speed;
    this.angle = angle;
    this.damage = damage; this.radius = radius; this.color = color;
    this.life = opts.life || 3;
    this.maxLife = opts.life || 3;
    this.pierce = opts.pierce || 0;
    this.explosionR = opts.explosionR || 0;
    this.maxRange = opts.maxRange || 0;
    this.homing = opts.homing || false;
    this.target = opts.target || null;
    this.isLaser = opts.isLaser || false;
    this.isFlame = opts.isFlame || false;
    this.isPoison = opts.isPoison || false;
    this.isLightning = opts.isLightning || false;
    this.isPlasma = opts.isPlasma || false;
    this.isCannonBullet = opts.isCannonBullet || false;
    this.crit = opts.crit || false;
    this.bounce = opts.bounce || false;
    this.bounceCount = opts.bounce ? 1 : 0;
    this.ref = opts.ref || false;
    this.targetX = opts.targetX || 0;
    this.targetY = opts.targetY || 0;
    this.hitEnemies = new Set();
    this.refractCount = opts.refractCount || 0;
    this.chainTargets = [];
    this.refractAngles = [];
    this.instant = opts.instant || false;
    this.beamEndX = opts.beamEndX || 0;
    this.beamEndY = opts.beamEndY || 0;
    this.weaponType = opts.weaponType || 'cannon';
    // 分裂弹：飞行指定时间后分裂为多颗子弹
    this.split = opts.split || false;
    this.splitCountdown = opts.splitTimer || 1.5;
    this.splitN = opts.splitN || 8;
    this.splitSpeed = opts.splitSpeed || 130;
    this.splitChildR = opts.splitChildR || 4;
    this.splitDmg = opts.splitDmg || this.damage * 0.7;
    this.splitChildColor = opts.splitChildColor || this.color;
    // 震荡麻痹：命中玩家后让其短暂眩晕减速
    this.stun = opts.stun || 0;
  }
  update(dt, game) {
    this.life -= dt;
    if(this.isLightning) {
      this.life -= dt * 8;
      return;
    }
    if(this.instant) {
      return;
    }
    if(this.homing && this.target && this.target.alive) {
      const a = angle(this, this.target);
      const speed = Math.hypot(this.vx, this.vy);
      const curA = Math.atan2(this.vy, this.vx);
      let diff = a - curA;
      while(diff > Math.PI) diff -= 2*Math.PI;
      while(diff < -Math.PI) diff += 2*Math.PI;
      const turn = 3 * dt;
      const newA = curA + clamp(diff, -turn, turn);
      this.vx = Math.cos(newA) * speed;
      this.vy = Math.sin(newA) * speed;
    }
    this.x += this.vx * dt; this.y += this.vy * dt;
    // 分裂弹触发（splitted 置位避免重复分裂）
    if(this.split && !this.splitted) {
      this.splitCountdown -= dt;
      if(this.splitCountdown <= 0) {
        this.splitted = true;
        const baseA = Math.atan2(this.vy, this.vx);
        for(let i = 0; i < this.splitN; i++) {
          const a = baseA + (i / this.splitN) * Math.PI * 2;
          game.enemyBullets.push(new Bullet(
            this.x, this.y, a, this.splitSpeed, this.splitDmg,
            this.splitChildR, this.splitChildColor, { life: 3.5 }
          ));
        }
        game.screenShake(0.2);
        this.life = 0;
      }
    }
  }
  draw(ctx) {
    const speed = Math.hypot(this.vx, this.vy);
    const angle = Math.atan2(this.vy, this.vx);
    
    if(this.isLaser) {
      ctx.save();
      const alpha = Math.max(0, this.life / (this.maxLife || 2));
      ctx.globalAlpha = alpha;
      let startX, startY, endX, endY;
      if(this.instant) {
        startX = this.x; startY = this.y;
        endX = this.beamEndX; endY = this.beamEndY;
      } else {
        const pAngle = Math.atan2(this.vy, this.vx);
        const len = 80;
        startX = this.x - Math.cos(pAngle) * len * 0.3;
        startY = this.y - Math.sin(pAngle) * len * 0.3;
        endX = this.x + Math.cos(pAngle) * len * 0.7;
        endY = this.y + Math.sin(pAngle) * len * 0.7;
      }
      const grad = ctx.createLinearGradient(startX, startY, endX, endY);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(0.3, this.color);
      grad.addColorStop(0.5, '#fff');
      grad.addColorStop(0.7, this.color);
      grad.addColorStop(1, 'transparent');
      ctx.strokeStyle = grad;
      ctx.lineWidth = this.instant ? 8 + this.radius : 3 + this.radius;
      ctx.shadowColor = this.color; ctx.shadowBlur = 20;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      if(this.instant) {
        ctx.lineWidth = 2 + this.radius;
        ctx.strokeStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
      ctx.restore();
    } else if(this.isLightning) {
      ctx.save();
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2;
      ctx.shadowColor = this.color; ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      if(this.ref) {
        const segs = 8;
        for(let s = 1; s <= segs; s++) {
          const t = s / segs;
          const px = lerp(this.x, this.targetX, t) + rand(-5, 5);
          const py = lerp(this.y, this.targetY, t) + rand(-5, 5);
          ctx.lineTo(px, py);
        }
      } else {
        ctx.lineTo(this.x + Math.cos(this.angle) * 40, this.y + Math.sin(this.angle) * 40);
      }
      ctx.stroke();
      ctx.restore();
    } else if(this.isPlasma) {
      const spriteDrawn = SpriteMgr.drawSprite(ctx, 'proj_plasma', this.x, this.y, this.radius * 6, angle);
      if(!spriteDrawn) {
        ctx.save();
        const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * 3);
        grad.addColorStop(0, '#fff');
        grad.addColorStop(0.2, this.color);
        grad.addColorStop(0.6, this.color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.shadowColor = this.color; ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    } else if(this.isFlame) {
      ctx.save();
      const alpha = 0.3 + Math.random() * 0.3;
      ctx.globalAlpha = alpha;
      const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * 2);
      grad.addColorStop(0, '#fff');
      grad.addColorStop(0.3, '#ff6b00');
      grad.addColorStop(0.6, 'rgba(255,107,0,0.8)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.shadowColor = '#ff6b00'; ctx.shadowBlur = 15;
      const size = this.radius * (1.5 + Math.sin(Date.now() * 0.02) * 0.5);
      ctx.beginPath();
      ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if(this.isPoison) {
      ctx.save();
      const alpha = 0.5 + Math.random() * 0.2;
      ctx.globalAlpha = alpha;
      const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * 1.5);
      grad.addColorStop(0, '#88ff00');
      grad.addColorStop(0.5, 'rgba(136,255,0,0.6)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.shadowColor = '#88ff00'; ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if(this.homing) {
      // 导弹 - 视觉改为主炮子弹一样大（小型发光弹体 + 拖尾）
      const trailLen = Math.min(22, speed * 0.045);
      const trailX = this.x - Math.cos(angle) * trailLen;
      const trailY = this.y - Math.sin(angle) * trailLen;
      ctx.save();
      const trailGrad = ctx.createLinearGradient(trailX, trailY, this.x, this.y);
      trailGrad.addColorStop(0, 'transparent');
      trailGrad.addColorStop(1, this.color);
      ctx.strokeStyle = trailGrad;
      ctx.lineWidth = this.radius * 1.6;
      ctx.shadowColor = this.color; ctx.shadowBlur = 12;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(trailX, trailY);
      ctx.lineTo(this.x, this.y);
      ctx.stroke();
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.color; ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
        // 主炮弹体视觉（已按需求减半，采用接近普通的粗细）
        const cannonScale = this.isCannonBullet ? 1.0 : 1.0;
        ctx.save();
        const trailLen = Math.min(22, speed * 0.045);
        const trailX = this.x - Math.cos(angle) * trailLen;
        const trailY = this.y - Math.sin(angle) * trailLen;
        const trailGrad = ctx.createLinearGradient(trailX, trailY, this.x, this.y);
        trailGrad.addColorStop(0, 'transparent');
        trailGrad.addColorStop(1, this.color);
        ctx.strokeStyle = trailGrad;
        ctx.lineWidth = this.radius * 1.6 * cannonScale;
        ctx.shadowColor = this.color; ctx.shadowBlur = 12 * cannonScale;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(trailX, trailY);
        ctx.lineTo(this.x, this.y);
        ctx.stroke();
        
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color; ctx.shadowBlur = 16 * cannonScale;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * cannonScale, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.5 * cannonScale, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
  }
  get dead() {
    return this.life <= 0 ||
           this.x < -50 || this.x > CONFIG.CANVAS.w + 50 ||
           this.y < -50 || this.y > CONFIG.CANVAS.h + 50;
  }
}

// ===== DRONE =====
class Drone {
  constructor(x, y, player, index, total) {
    this.x = x; this.y = y; this.player = player;
    this.index = index; this.total = total;
    this.angle = 0;
    this.fireTimer = 0;
    this.blockTimer = rand(1, CONFIG.PLAYER.fireRate);
    this.blocking = false;
    this.damage = WEAPONS.DRONE.damage;
    this.fireRate = WEAPONS.DRONE.fireRate;
    this.orbitRadius = WEAPONS.DRONE.orbitRadius;
    this.blockInterval = WEAPONS.DRONE.blockInterval;
    this.laser = false;
    this.alive = true;
    this.hp = 2;
  }
  update(dt, game) {
    this.angle += dt * (0.5 + this.index * 0.1);
    const r = this.orbitRadius + this.player.droneOrbitBonus;
    const a = (this.index / this.total) * Math.PI * 2 + this.angle;
    this.x = this.player.x + Math.cos(a) * r;
    this.y = this.player.y + Math.sin(a) * r;
    
    this.fireTimer -= dt;
    if(this.fireTimer <= 0) {
      const target = game.findNearestEnemy(this.x, this.y, 300);
      if(target) {
        const ang = angle(this, target);
        const p = this.player;
        // 无人机+激光 联动：无人机（已解锁时）发射微型激光，且受激光强化卡加成
        if(game.activeSynergyKey('DRONE+LASER')) {
          const laserDmg = this.damage * game.synergyMul('DRONE+LASER') * (p.subDmgMul.LASER || 1);
          game.bullets.push(new Bullet(this.x, this.y, ang, 800, laserDmg, 3, '#00f0ff', {isLaser: true, life: 1.5, pierce: p.laserPierce || 0}));
          this.fireTimer = this.fireRate;
        }
        // 无人机+闪电 联动：无人机（已解锁时）发射小闪电，且受闪电强化卡加成
        else if(game.activeSynergyKey('LIGHTNING+DRONE')) {
          const ltnDmg = this.damage * (p.subDmgMul.LIGHTNING || 1);
          const jumps = 1 + Math.min(1, Math.floor((p.lightningChain || 0) / 2));
          let lx = this.x, ly = this.y;
          for(let i = 0; i < jumps; i++) {
            const t2 = game.findNearestEnemy(lx, ly, 350);
            if(!t2) break;
            game.bullets.push(new Bullet(lx, ly, 0, 0, ltnDmg, 2, '#a0ffff', {isLightning: true, life: 0.2, ref: true, targetX: t2.x, targetY: t2.y}));
            if(t2.alive) t2.takeDamage(ltnDmg, game);
            lx = t2.x; ly = t2.y;
          }
          this.fireTimer = this.fireRate;
        }
        // 无对应联动解锁时，发射普通无人机子弹
        else {
          game.bullets.push(new Bullet(this.x, this.y, ang, 600, this.damage, 3, '#00f0ff'));
          this.fireTimer = this.fireRate;
        }
      }
    }
    if(this.blocking) {
      this.blockTimer -= dt;
      if(this.blockTimer <= 0) {
        this.blocking = false;
      }
    } else {
      this.blockTimer -= dt;
      if(this.blockTimer <= 0) {
        this.blocking = true;
        this.blockTimer = 0.5;
      }
    }
  }
  draw(ctx) {
    const spriteDrawn = SpriteMgr.drawSprite(ctx, '无人机', this.x, this.y, 66, this.angle);
    
    if(!spriteDrawn) {
      // 图片未加载时的最小占位，避免不可见
      ctx.save();
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.color; ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if(this.blocking) {
      ctx.save();
      ctx.strokeStyle = 'rgba(0,240,255,0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
  canBlock(bullet) {
    if(!this.blocking) return false;
    return dist(this, bullet) < 22;
  }
  takeDamage(d) {
    this.hp -= d;
    if(this.hp <= 0) this.alive = false;
  }
}

// ===== MINE =====
class Mine {
  constructor(x, y, damage, explosionR) {
    this.x = x; this.y = y;
    this.damage = damage; this.explosionR = explosionR;
    this.triggerR = 40;
    this.armed = true;
    this.wobble = 0;
    this.alive = true;
  }
  update(dt, game) {
    this.wobble += dt * 3;
    for(const e of game.enemies) {
      if(!e.alive) continue;
      if(dist(this, e) < this.triggerR) {
        this.explode(game);
        return;
      }
    }
  }
  explode(game) {
    this.alive = false;
    // 腐蚀引爆：毒气+地雷 联动，爆炸范围翻倍并附带毒雾
    const radiusMul = game.activeSynergyKey('POISON+MINE') ? 2 : 1;
    // 连锁爆炸：火焰+地雷 联动，伤害提升
    const dmgMul = game.synergyMul('FLAMETHROWER+MINE');
    const R = this.explosionR * radiusMul;
    game.screenShake(0.3);
    game.addExplosion(this.x, this.y, R, '#ffd700');
    for(const e of game.enemies) {
      if(!e.alive) continue;
      const d = dist(this, e);
      if(d < R) {
        const dmg = this.damage * dmgMul * (1 - d / R);
        e.takeDamage(dmg, game);
        // 腐蚀引爆：让敌人附带短暂中毒减速
        if(radiusMul === 2) e.applySlow(0.5, 1.5);
      }
    }
    if(game.player.passives.includes('reflect')) {
      const d = dist(this, game.player);
      if(d < R) {
        game.player.takeDamage(this.damage * 0.1 * (1 - d / R), game);
      }
    }
  }
  draw(ctx) {
    if(!this.armed) return;
    const wobble = Math.sin(this.wobble) * 2;
    const spriteDrawn = SpriteMgr.drawSprite(ctx, 'entity_mine', this.x, this.y + wobble, 48, this.wobble);
    
    if(!spriteDrawn) {
      ctx.save();
      ctx.translate(this.x, this.y + wobble);
      ctx.fillStyle = '#ffd700';
      ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ff6600'; ctx.lineWidth = 2;
      for(let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + this.wobble;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 5, Math.sin(a) * 5);
        ctx.lineTo(Math.cos(a) * 12, Math.sin(a) * 12);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}

// ===== PLAYER =====
class Player {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.size = 20;
    this.angle = 0;
    this.moveAngle = 0;
    this.speed = CONFIG.PLAYER.speed;
    
    this.maxHp = CONFIG.PLAYER.maxHp;
    this.hp = this.maxHp;
    this.maxShield = 0;
    this.shield = 0;
    
    this.mainWeapon = CONFIG.MODE === 'creative' ? null : 'CANNON';
    this.subWeapons = [];
    this.independentWeapons = [];
    this.maxSubWeapons = CONFIG.MODE === 'endless' || CONFIG.MODE === 'creative' ? Infinity : CONFIG.PLAYER.maxSubWeapons;
    
    this.fireTimer = 0;
    this.subFireTimers = {};
    this.dashCd = 0;
    this.dashInvuln = 0;
    this.dashCdMul = 1;
    this.hitInvuln = 0;
    
    this.ultimate = 0;
    this.stunTimer = 0;
    this.passives = [];
    this.upgradeTakenCounts = {};
    
    this.score = 0;
    this.combo = 0; this.comboTimer = 0;
    
    this.speedMul = 1;
    this.fireRateMul = 1;
    this.bulletSpeedMul = 1;
    
    // Weapon levels
    this.wLevels = {};
    for(const w of Object.values(WEAPONS)) {
      this.wLevels[w.id] = { dmg: 0, rate: 0, pierce: 0, multi: 0, explosive: 0, refract: 0, range: 0, focus: 0, pellets: 0, spread: 0, condense: 0, explode: 0, guidance: 0, charge: 0, overload: 0, burn: 0, burn_area: 0, storm: 0, chain: 0, stun: 0, radius: 0, duration: 0, count: 0, block: 0, formation: 0, capacity: 0, smart: 0 };
    }
    
    // Dmg multipliers
    this.subDmgMul = {};
    for(const w of Object.values(WEAPONS)) this.subDmgMul[w.id] = 1;
    
    // Cannon upgrades
    this.cannonDmgMul = 1;
    this.cannonRateMul = 1;
    this.cannonPierce = 0;
    this.cannonMulti = 0;
    this.cannonExplosive = false;
    this.cannonBounce = 0;
    
    // Laser upgrades
    this.laserRefract = 0;
    this.laserPierce = 0;
    this.laserRangeMul = 1;
    this.laserFocusMul = 1;
    
    // Shotgun upgrades
    this.shotgunPellets = 5;
    this.shotgunSpread = 0.3;
    this.shotgunCondense = false;
    
    // Missile upgrades
    this.missileRangeMul = 1;
    this.missileExplodeR = 0;
    this.missileHomingMul = 1;
    
    // Plasma upgrades
    this.plasmaExplodeR = 0;
    this.plasmaChargeMul = 1;
    this.plasmaOverload = false;
    this.plasmaCount = 2;
    
    // Flame upgrades
    this.flameRangeMul = 1;
    this.flameSpreadMul = 1;
    this.flameBurnMul = 1;
    this.flameBurnArea = false;
    this.flameStormR = 0;
    
    // Lightning upgrades
    this.lightningChain = 0;
    this.lightningStun = 0;
    this.lightningRange = 0;
    
    // Poison upgrades
    this.poisonR = 0;
    this.poisonDur = 0;
    this.poisonSlowMul = 1;
    
    // Drone upgrades
    this.droneCount = 0;
    this.droneDmgMul = 1;
    this.droneBlockInterval = 3;
    this.droneLaser = false;
    this.droneOrbitBonus = 0;
    this.droneUnlocked = false;
    
    // Mine upgrades
    this.maxMines = 5;
    this.mineDmgMul = 1;
    this.mineExplodeR = 0;
    this.mineSmart = false;
    this.mineUnlocked = false;
    
    // Synergy bonuses
    this.synergyBonus = {};
    this.synergyUnlocks = {};
    
    // Magnet
    this.magnetRange = 50;
    this.pickupRangeMul = 1;  // 可调节拾取范围倍数
    this.pickupSpeedMul = 1;
    
    // Crit
    this.critChance = 0;
    this.reflectDmg = 0;
    
    // Charge
    this.chargePerKillBonus = 0;
    
    // Mine placement
    this.minePlaceCd = 0;
    
    // Creative initial weapons
    this.initialWeapons = [];
    // 隐藏设置：无敌模式
    this.invincible = false;
  }
  takeDamage(dmg, game) {
    if(this.invincible) return;
    if(this.hitInvuln > 0) return;
    if(this.dashInvuln > 0) return;
    if(this.shield > 0) {
      this.shield--;
      game.addExplosion(this.x, this.y, 30, '#00f0ff');
      game.screenShake(0.1);
      AudioMgr.hurt(false);
      return;
    }
    this.hp -= dmg;
    this.hitInvuln = 0.3;
    game.damageFlash();
    game.screenShake(0.2);
    AudioMgr.hurt(this.hp <= 1);
    if(this.passives.includes('reflect')) {
      game.reflectDamage = dmg * this.reflectDmg;
    }
    if(this.hp <= 0) {
      this.hp = 0;
      game.gameOver();
    }
  }
  update(dt, game) {
    this.comboTimer -= dt;
    if(this.comboTimer <= 0) this.combo = 0;
    
    this.fireTimer -= dt;
    this.dashCd -= dt;
    this.dashInvuln -= dt;
    this.hitInvuln -= dt;
    this.minePlaceCd -= dt;
    if(this.stunTimer > 0) this.stunTimer -= dt;
    
    if(this.hp <= 0) return;
    
    // Movement
    let mx = 0, my = 0;
    if(Input.isDown('KeyW') || Input.isDown('ArrowUp')) my -= 1;
    if(Input.isDown('KeyS') || Input.isDown('ArrowDown')) my += 1;
    if(Input.isDown('KeyA') || Input.isDown('ArrowLeft')) mx -= 1;
    if(Input.isDown('KeyD') || Input.isDown('ArrowRight')) mx += 1;
    if(mx || my) {
      const len = Math.hypot(mx, my);
      mx /= len; my /= len;
      this.moveAngle = Math.atan2(my, mx);
    }
    // 震荡麻痹：眩晕期间移动大幅受限
    const stunFactor = this.stunTimer > 0 ? 0.25 : 1;
    const spd = this.speed * this.speedMul * (this.dashInvuln > 0 ? 3 : 1) * stunFactor;
    this.x += mx * spd * dt;
    this.y += my * spd * dt;
    this.x = clamp(this.x, 30, CONFIG.CANVAS.w - 30);
    this.y = clamp(this.y, 30, CONFIG.CANVAS.h - 30);
    
    // Aim
    this.angle = Math.atan2(Input.mouse.y - this.y, Input.mouse.x - this.x);
    
    // Dash (空格键闪避)
    if(this.dashCd <= 0 && Input.justPressed('Space')) {
      this.dashCd = 1.0 * this.dashCdMul;
      this.dashInvuln = 0.3;
      AudioMgr.skill('dash');
    }
    
    // Main weapon fire (mouse-controlled, disabled in no-fire zone)
    if(this.mainWeapon && Input.mouse.down && !Input.mouse.onUI && !Input.mouse.inNoFireZone && this.fireTimer <= 0) {
      this.fireMainWeapon(game);
      this.fireTimer = WEAPONS[this.mainWeapon].fireRate * this.fireRateMul;
    }
    
    // Sub weapons fire (auto, not affected by mouse position)
    for(const subId of this.subWeapons) {
      if(!this.subFireTimers[subId]) this.subFireTimers[subId] = 0;
      this.subFireTimers[subId] -= dt;
      if(this.subFireTimers[subId] <= 0) {
        this.fireSubWeapon(subId, game);
        this.subFireTimers[subId] = WEAPONS[subId].fireRate * this.fireRateMul;
      }
    }
    
    // Mine placement
    if(this.mineUnlocked && this.minePlaceCd <= 0 && Input.isDown('KeyR')) {
      const mines = game.mines.filter(m => m.alive).length;
      if(mines < this.maxMines) {
        const mdmg = WEAPONS.MINE.damage * this.mineDmgMul;
        const mr = WEAPONS.MINE.explosionR + this.mineExplodeR;
        game.mines.push(new Mine(this.x, this.y, mdmg, mr));
        this.minePlaceCd = 0.5;
        AudioMgr.skill('mine');
      }
    }
    
    // Ult
    if(this.ultimate >= 20 && Input.isDown('KeyE')) {
      this.useUltimate(game);
      this.ultimate = 0;
      AudioMgr.skill('ultimate');
    }
    
    // Nuke (支持多个，消耗1个)
    if(game.nukeCount > 0 && Input.isDown('KeyQ')) {
      game.nukeExplosion();
      game.nukeCount = Math.max(0, game.nukeCount - 1);
      AudioMgr.skill('nuke');
    }
    
    // Pickups
    for(const p of game.pickups) {
      if(!p.alive) continue;
      const effectiveRange = this.magnetRange * this.pickupRangeMul;
      if(dist(this, p) < effectiveRange) {
        const a = angle(p, this);
        const pickupSpeed = this.speed * 1.5 * this.pickupSpeedMul;
        p.x += Math.cos(a) * pickupSpeed * dt;
        p.y += Math.sin(a) * pickupSpeed * dt;
      }
      if(dist(this, p) < this.size) {
        this.collectPickup(p, game);
        p.alive = false;
      }
    }
  }
  fireMainWeapon(game) {
    const id = this.mainWeapon;
    const w = WEAPONS[id];
    const isCannon = id === 'CANNON';
    
    // 播放射击音效（导弹、毒气、烈焰无开火音效）
    const weaponSoundMap = { CANNON: 'cannon', LASER: 'laser', SHOTGUN: 'shotgun', MISSILE: 'missile', PLASMA: 'plasma', FLAMETHROWER: 'flamethrower', LIGHTNING: 'lightning', POISON: 'poison' };
    const noFireSound = ['MISSILE', 'FLAMETHROWER', 'POISON'];
    if(!noFireSound.includes(id)) {
      AudioMgr.shoot(weaponSoundMap[id] || 'cannon');
    }
    
    if(isCannon) {
      const baseDmg = w.damage * this.cannonDmgMul * (critRoll(this) ? 2 : 1);
      const speed = w.bulletSpeed * this.bulletSpeedMul;
      const pierce = w.pierce + this.cannonPierce;
      const count = 1 + this.cannonMulti;
      
      for(let i = 0; i < count; i++) {
        const spread = count > 1 ? (i - (count - 1) / 2) * 0.08 : 0;
        const a = this.angle + spread;
        // 多重弹道时按垂直方向错开，避免多颗子弹重叠成一团导致图案消失
        const perp = a + Math.PI / 2;
        const lane = count > 1 ? (i - (count - 1) / 2) * 7 : 0;
        const sx = this.x + Math.cos(a) * 25 + Math.cos(perp) * lane;
        const sy = this.y + Math.sin(a) * 25 + Math.sin(perp) * lane;
        const opts = {
          pierce: pierce,
          life: 2,
          explosionR: this.cannonExplosive ? 30 : 0,
          bounce: this.cannonBounce > 0,
          crit: this.passives.includes('crit'),
          isCannonBullet: true,
        };
        game.bullets.push(new Bullet(sx, sy, a, speed, baseDmg, w.bulletRadius, w.color, opts));
      }
      game.addMuzzleFlash(this.x + Math.cos(this.angle) * 30, this.y + Math.sin(this.angle) * 30, this.angle);
    } else {
      const dmg = w.damage * (this.subDmgMul[id] || 1) * (critRoll(this) ? 2 : 1);
      const speed = w.bulletSpeed ? w.bulletSpeed * this.bulletSpeedMul : 0;
      const count = (this.wLevels[id]?.count || 1);
      
      if(id === 'SHOTGUN') {
        const pellets = this.shotgunPellets;
        // 无人机散射：有无人机时散射更集中
        const spread = this.shotgunSpread * (game.activeSynergyKey('SHOTGUN+DRONE') ? 0.6 : 1);
        for(let i = 0; i < pellets; i++) {
          const a = this.angle + rand(-spread, spread);
          game.bullets.push(new Bullet(
            this.x, this.y, a, speed, dmg, 4, w.color,
            { life: 1.2 }
          ));
        }
      } else if(id === 'MISSILE') {
        const target = game.findNearestEnemy(this.x, this.y, 9999);
        let r = w.explosionR + this.missileExplodeR;
        let mdmg = dmg;
        // 导航导弹：无人机+导弹 联动，爆炸范围提升20%，命中附带额外伤害
        if(game.activeSynergyKey('MISSILE+DRONE')) { r *= 1.2; mdmg += 2; }
        game.bullets.push(new Bullet(
          this.x, this.y, this.angle, speed, mdmg, w.bulletRadius, w.color,
          { homing: true, target: target, explosionR: r, life: 5 }
        ));
      } else if(id === 'LASER') {
        // 激光 - 只锁定最近1个目标
        const lockCount = 1;
        const targets = game.findNearestEnemies(this.x, this.y, 9999, lockCount);
        const hitEnemies = [];
        const processed = new Set();
        
        for(const target of targets) {
          const a = target ? Math.atan2(target.y - this.y, target.x - this.x) : this.angle;
          const endX = this.x + Math.cos(a) * CONFIG.CANVAS.w;
          const endY = this.y + Math.sin(a) * CONFIG.CANVAS.h;
          game.bullets.push(new Bullet(
            this.x, this.y, a, 0, dmg, 4, w.color,
            { isLaser: true, instant: true, life: 0.3, beamEndX: endX, beamEndY: endY, refractCount: this.laserRefract, pierce: 0 }
          ));
          const hits = game.getEnemiesAlongLine(this.x, this.y, endX, endY, 20);
          for(const e of hits) {
            if(processed.has(e)) continue;
            processed.add(e);
            hitEnemies.push(e);
          }
        }
        
        // 如果没有锁定目标，发射一道基础激光
        if(targets.length === 0) {
          const a = this.angle;
          const endX = this.x + Math.cos(a) * CONFIG.CANVAS.w;
          const endY = this.y + Math.sin(a) * CONFIG.CANVAS.h;
          game.bullets.push(new Bullet(
            this.x, this.y, a, 0, dmg, 4, w.color,
            { isLaser: true, instant: true, life: 0.3, beamEndX: endX, beamEndY: endY, refractCount: this.laserRefract, pierce: 0 }
          ));
          const hits = game.getEnemiesAlongLine(this.x, this.y, endX, endY, 20);
          for(const e of hits) {
            if(processed.has(e)) continue;
            processed.add(e);
            hitEnemies.push(e);
          }
        }
        
        for(const e of hitEnemies) {
          e.takeDamage(dmg, game);
          if(this.laserRefract > 0) {
            game.spawnInstantLaserRefract(e, dmg, this.laserRefract - 1, processed);
          }
        }
      } else if(id === 'LIGHTNING') {
        let lastX = this.x, lastY = this.y;
        const targets = [];
        // 电光传导：闪电+激光 联动，额外跳跃2次、每次+1伤害
        const chainBonus = game.activeSynergyKey('LIGHTNING+LASER') ? 2 : 0;
        const maxJumps = w.chainCount + this.lightningChain + chainBonus;
        const hitDmg = dmg * 0.6 + (chainBonus ? 1 : 0);
        for(let i = 0; i < maxJumps; i++) {
          const t = game.findNearestEnemy(lastX, lastY, 4000);
          if(!t) break;
          targets.push({x: t.x, y: t.y});
          game.bullets.push(new Bullet(
            lastX, lastY, 0, 0, hitDmg, 3, w.color,
            { isLightning: true, life: 0.25, ref: true, targetX: t.x, targetY: t.y }
          ));
          if(t.alive) t.takeDamage(hitDmg, game);
          lastX = t.x; lastY = t.y;
        }
        if(targets.length > 0) {
          game.bullets.push(new Bullet(
            this.x, this.y, 0, 0, 0, 3, w.color,
            { isLightning: true, life: 0.25, ref: true, targetX: targets[0].x, targetY: targets[0].y }
          ));
        }
      } else if(id === 'FLAMETHROWER') {
        const range = w.range * this.flameRangeMul;
        const spread = w.spread * this.flameSpreadMul;
        // 剧毒爆燃：火焰+毒气 联动，伤害提升
        const fdmg = dmg * game.synergyMul('FLAMETHROWER+POISON');
        for(let i = 0; i < 3; i++) {
          const a = this.angle + rand(-spread, spread);
          game.bullets.push(new Bullet(
            this.x, this.y, a, rand(150, 300) * this.bulletSpeedMul, fdmg, 8, w.color,
            { isFlame: true, life: range / 300, explosionR: this.flameStormR }
          ));
        }
      } else if(id === 'PLASMA') {
        const r = w.explosionR + this.plasmaExplodeR;
        const enemies = game.enemies.filter(e => e.alive);
        if(enemies.length > 0) {
          for(const e of enemies.slice(0, this.plasmaCount)) {
            const a = Math.atan2(e.y - this.y, e.x - this.x);
            game.bullets.push(new Bullet(
              this.x, this.y, a, speed, dmg, w.bulletRadius, w.color,
              { isPlasma: true, explosionR: r, life: 5, slow: game.activeSynergyKey('PLASMA+POISON') ? 0.3 : 0 }
            ));
          }
        } else {
          game.bullets.push(new Bullet(
            this.x, this.y, this.angle, speed, dmg, w.bulletRadius, w.color,
            { isPlasma: true, explosionR: r, life: 5, slow: game.activeSynergyKey('PLASMA+POISON') ? 0.3 : 0 }
          ));
        }
      } else if(id === 'POISON') {
        const enemies = game.enemies.filter(e => e.alive);
        if(enemies.length > 0) {
          for(const e of enemies.slice(0, 3)) {
            game.bullets.push(new Bullet(
              e.x, e.y, 0, 0, dmg, 12, w.color,
              { isPoison: true, life: 2, explosionR: w.cloudRadius + this.poisonR }
            ));
          }
        } else {
          for(let i = 0; i < 3; i++) {
            const a = this.angle + rand(-0.3, 0.3);
            // 扩散速度降低至当前的30%
            game.bullets.push(new Bullet(
              this.x, this.y, a, rand(6, 12) * 0.3, dmg, 12, w.color,
              { isPoison: true, life: 2, explosionR: w.cloudRadius + this.poisonR }
            ));
          }
        }
      } else {
        game.bullets.push(new Bullet(
          this.x, this.y, this.angle, speed, dmg, w.bulletRadius, w.color,
          { life: 2 }
        ));
      }
      game.addMuzzleFlash(this.x + Math.cos(this.angle) * 30, this.y + Math.sin(this.angle) * 30, this.angle);
    }
  }
  fireSubWeapon(id, game) {
    const w = WEAPONS[id];
    const dmg = w.damage * this.subDmgMul[id] * (critRoll(this) ? 2 : 1);
    const speed = w.bulletSpeed ? w.bulletSpeed * this.bulletSpeedMul : 0;
    
    // 播放开火音效
    const weaponSoundMap = { CANNON: 'cannon', LASER: 'laser', SHOTGUN: 'shotgun', MISSILE: 'missile', PLASMA: 'plasma', FLAMETHROWER: 'flamethrower', LIGHTNING: 'lightning', POISON: 'poison' };
    const noFireSound = ['MISSILE', 'FLAMETHROWER', 'POISON'];
    if(!noFireSound.includes(id)) {
      AudioMgr.shoot(weaponSoundMap[id] || 'cannon');
    }
    
    if(id === 'LASER') {
      // 激光 - 只锁定最近1个目标
      const lockCount = 1;
      const targets = game.findNearestEnemies(this.x, this.y, 9999, lockCount);
      const hitEnemies = [];
      const processed = new Set();
      
      for(const target of targets) {
        const a = target ? Math.atan2(target.y - this.y, target.x - this.x) : this.angle;
        const endX = this.x + Math.cos(a) * CONFIG.CANVAS.w;
        const endY = this.y + Math.sin(a) * CONFIG.CANVAS.h;
        game.bullets.push(new Bullet(
          this.x, this.y, a, 0, dmg, 4, w.color,
          { isLaser: true, instant: true, life: 0.3, beamEndX: endX, beamEndY: endY, refractCount: this.laserRefract, pierce: 0 }
        ));
        const hits = game.getEnemiesAlongLine(this.x, this.y, endX, endY, 20);
        for(const e of hits) {
          if(processed.has(e)) continue;
          processed.add(e);
          hitEnemies.push(e);
        }
      }
      
      if(targets.length === 0) {
        const a = this.angle;
        const endX = this.x + Math.cos(a) * CONFIG.CANVAS.w;
        const endY = this.y + Math.sin(a) * CONFIG.CANVAS.h;
        game.bullets.push(new Bullet(
          this.x, this.y, a, 0, dmg, 4, w.color,
          { isLaser: true, instant: true, life: 0.3, beamEndX: endX, beamEndY: endY, refractCount: this.laserRefract, pierce: 0 }
        ));
        const hits = game.getEnemiesAlongLine(this.x, this.y, endX, endY, 20);
        for(const e of hits) {
          if(processed.has(e)) continue;
          processed.add(e);
          hitEnemies.push(e);
        }
      }
      
      for(const e of hitEnemies) {
        e.takeDamage(dmg, game);
        if(this.laserRefract > 0) {
          game.spawnInstantLaserRefract(e, dmg, this.laserRefract - 1, processed);
        }
      }
    } else if(id === 'SHOTGUN') {
      const pellets = this.shotgunPellets;
      // 无人机散射：有无人机时散射更集中
      const spread = this.shotgunSpread * (game.activeSynergyKey('SHOTGUN+DRONE') ? 0.6 : 1);
      for(let i = 0; i < pellets; i++) {
        const a = this.angle + rand(-spread, spread);
        game.bullets.push(new Bullet(
          this.x, this.y, a, speed, dmg, 4, w.color,
          { life: 1.2 }
        ));
      }
    } else if(id === 'MISSILE') {
      const target = game.findNearestEnemy(this.x, this.y, 9999);
      let r = w.explosionR + this.missileExplodeR;
      let mdmg = dmg;
      // 导航导弹：无人机+导弹 联动，爆炸范围提升20%，命中附带额外伤害
      if(game.activeSynergyKey('MISSILE+DRONE')) { r *= 1.2; mdmg += 2; }
      game.bullets.push(new Bullet(
        this.x, this.y, this.angle, speed, mdmg, w.bulletRadius, w.color,
        { homing: true, target: target, explosionR: r, life: 5 }
      ));
    } else if(id === 'PLASMA') {
      const r = w.explosionR + this.plasmaExplodeR;
      const enemies = game.enemies.filter(e => e.alive);
      if(enemies.length > 0) {
        for(const e of enemies.slice(0, this.plasmaCount)) {
          const a = Math.atan2(e.y - this.y, e.x - this.x);
          game.bullets.push(new Bullet(
            this.x, this.y, a, speed, dmg, w.bulletRadius, w.color,
            { isPlasma: true, explosionR: r, life: 5, slow: game.activeSynergyKey('PLASMA+POISON') ? 0.3 : 0 }
          ));
        }
      } else {
        game.bullets.push(new Bullet(
          this.x, this.y, this.angle, speed, dmg, w.bulletRadius, w.color,
          { isPlasma: true, explosionR: r, life: 5, slow: game.activeSynergyKey('PLASMA+POISON') ? 0.3 : 0 }
        ));
      }
    } else if(id === 'FLAMETHROWER') {
      const range = w.range * this.flameRangeMul;
      const spread = w.spread * this.flameSpreadMul;
      // 剧毒爆燃：火焰+毒气 联动，伤害提升
      const fdmg = dmg * game.synergyMul('FLAMETHROWER+POISON');
      for(let i = 0; i < 3; i++) {
        const a = this.angle + rand(-spread, spread);
        game.bullets.push(new Bullet(
          this.x, this.y, a, rand(150, 300) * this.bulletSpeedMul, fdmg, 8, w.color,
          { isFlame: true, life: range / 300, explosionR: this.flameStormR }
        ));
      }
    } else if(id === 'LIGHTNING') {
      let lastX = this.x, lastY = this.y;
      const targets = [];
      let currentX = this.x, currentY = this.y;
      // 电光传导：闪电+激光 联动，额外跳跃2次、每次+1伤害
      const chainBonus = game.activeSynergyKey('LIGHTNING+LASER') ? 2 : 0;
      const maxJumps = w.chainCount + this.lightningChain + chainBonus;
      const hitDmg = dmg * 0.6 + (chainBonus ? 1 : 0);
      for(let i = 0; i < maxJumps; i++) {
        const t = game.findNearestEnemy(currentX, currentY, 4000);
        if(!t) break;
        targets.push({x: t.x, y: t.y});
        game.bullets.push(new Bullet(
          lastX, lastY, 0, 0, hitDmg, 3, w.color,
          { isLightning: true, life: 0.25, ref: true, targetX: t.x, targetY: t.y }
        ));
        if(t.alive) t.takeDamage(hitDmg, game);
        lastX = t.x; lastY = t.y;
        currentX = t.x; currentY = t.y;
      }
      if(targets.length > 0) {
        game.bullets.push(new Bullet(
          this.x, this.y, 0, 0, 0, 3, w.color,
          { isLightning: true, life: 0.25, ref: true, targetX: targets[0].x, targetY: targets[0].y }
        ));
      }
    } else if(id === 'POISON') {
      const enemies = game.enemies.filter(e => e.alive);
      if(enemies.length > 0) {
        for(const e of enemies.slice(0, 3)) {
          game.bullets.push(new Bullet(
            e.x, e.y, 0, 0, dmg, 12, w.color,
            { isPoison: true, life: 2, explosionR: w.cloudRadius + this.poisonR }
          ));
        }
      } else {
        for(let i = 0; i < 3; i++) {
          const a = this.angle + rand(-0.3, 0.3);
          // 扩散速度减慢至原来的20% (原80-150 → 6-12)
          game.bullets.push(new Bullet(
            this.x, this.y, a, rand(6, 12), dmg, 12, w.color,
            { isPoison: true, life: 2, explosionR: w.cloudRadius + this.poisonR }
          ));
        }
      }
    }
  }
  useUltimate(game) {
    game.screenFlash(0.3);
    game.screenShake(0.5);
    // 大招伤害随关卡提升，保证对高血量BOSS依然有效
    const ultDmg = 60 + game.level * 10;
    for(const e of game.enemies) {
      if(!e.alive) continue;
      e.takeDamage(ultDmg, game);
    }
    if(game.boss && game.boss.alive) {
      game.boss.takeDamage(ultDmg, game);
    }
  }
  collectPickup(p, game) {
    // 播放拾取音效
    AudioMgr.pickup(p.type);
    
    if(p.type === 'heal') {
      this.hp = Math.min(this.maxHp, this.hp + 1);
      game.floatingTexts.push(new FloatingText(this.x, this.y - 20, '+1 HP', '#00ff88', 16));
    } else if(p.type === 'shield') {
      this.shield++;
      game.floatingTexts.push(new FloatingText(this.x, this.y - 20, '+1 SHIELD', '#00f0ff', 16));
    } else if(p.type === 'nuke') {
      // 兼容旧字段，增加nukeCount
      game.nukeCount = Math.min(3, (game.nukeCount || 0) + 1);
      game.floatingTexts.push(new FloatingText(this.x, this.y - 20, '☢ NUKE+' + (game.nukeCount), '#ffaa00', 16));
    }
  }
  damageDealt(dmg, game) {
    this.combo++;
    this.comboTimer = 2;
    this.score += Math.floor(dmg * 10);
    this.ultimate = Math.min(20, this.ultimate + 0.5 + this.chargePerKillBonus);
    if(this.passives.includes('lifesteal')) {
      this.hp = Math.min(this.maxHp, this.hp + 0.2);
    }
  }
  draw(ctx) {
    // Shield
    if(this.shield > 0) {
      ctx.save();
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.3 + 0.3 * Math.sin(Date.now() / 200);
      ctx.beginPath();
      ctx.arc(this.x, this.y, 25, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    
    // Stun effect (震荡麻痹) - 黄色脉冲虚线光环 + 旋转星芒，表示移动受限
    if(this.stunTimer > 0) {
      ctx.save();
      const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 130);
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = '#ffaa00';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      ctx.lineDashOffset = -Date.now() / 60;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 28, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      // 旋转星芒
      const spin = Date.now() / 300;
      ctx.fillStyle = '#ffaa00';
      for(let i = 0; i < 4; i++) {
        const a = spin + (i / 4) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(this.x + Math.cos(a) * 20, this.y + Math.sin(a) * 20);
        ctx.lineTo(this.x + Math.cos(a + 0.5) * 32, this.y + Math.sin(a + 0.5) * 32);
        ctx.lineTo(this.x + Math.cos(a + Math.PI) * 20, this.y + Math.sin(a + Math.PI) * 20);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    
    // Tank sprite
    const spriteDrawn = SpriteMgr.drawSprite(ctx, 'player_tank', this.x, this.y, 50, this.angle - Math.PI/2);
    
    if(!spriteDrawn) {
      // Fallback canvas drawing
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      ctx.fillStyle = '#1a3a5c';
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-18, -15); ctx.lineTo(15, -12); ctx.lineTo(20, 0);
      ctx.lineTo(15, 12); ctx.lineTo(-18, 15); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff'; ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      const wId = this.mainWeapon;
      if(wId === 'CANNON') {
        ctx.fillStyle = '#00f0ff';
        ctx.fillRect(5, -3, 22, 6);
        ctx.fillStyle = '#00a0b0';
        ctx.fillRect(25, -2, 8, 4);
      } else if(wId) {
        const w = WEAPONS[wId];
        ctx.fillStyle = w.color || '#00f0ff';
        ctx.shadowColor = w.color || '#00f0ff'; ctx.shadowBlur = 6;
        ctx.fillRect(5, -4, 20, 8);
        ctx.shadowBlur = 0;
      }
      ctx.fillStyle = '#334';
      ctx.fillRect(-16, -18, 28, 3);
      ctx.fillRect(-16, 15, 28, 3);
      ctx.restore();
    }
    
    // Dash invuln effect
    if(this.dashInvuln > 0) {
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 25, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    
    // Hit invuln flash
    if(this.hitInvuln > 0) {
      ctx.save();
      ctx.globalAlpha = Math.sin(this.hitInvuln * 30) * 0.5 + 0.5;
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

function critRoll(p) {
  return p.passives.includes('crit') && Math.random() < p.critChance;
}

// ===== ENEMY =====
// ===== Custom enemy drawing utilities (from 新建 文本文档.txt) =====

function drawTankBase(ctx, x, y, size, rot, fillColor, strokeColor, drawBody) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = fillColor;
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 2;
  drawBody(ctx, size);
  ctx.restore();
}

function drawScoutTank(ctx, cx, cy, size, rotation = 0) {
  drawTankBase(ctx, cx, cy, size, rotation, "#301028", "#ff2e88", (ctx, s) => {
    ctx.beginPath();
    ctx.moveTo(-s*0.4, -s*0.35);
    ctx.lineTo(s*0.4, -s*0.25);
    ctx.lineTo(s*0.35, s*0.35);
    ctx.lineTo(-s*0.38, s*0.28);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0,0,s*0.18,0,Math.PI*2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s*0.18, 0);
    ctx.lineTo(s*0.48, 0);
    ctx.lineWidth = 3;
    ctx.stroke();
  })
}

function drawHeavyTank(ctx, cx, cy, size, rotation = 0) {
  drawTankBase(ctx, cx, cy, size, rotation, "#281838", "#9b59b6", (ctx, s) => {
    ctx.beginPath();
    ctx.moveTo(-s*0.55, -s*0.48);
    ctx.lineTo(s*0.58, -s*0.42);
    ctx.lineTo(s*0.52, s*0.48);
    ctx.lineTo(-s*0.58, s*0.44);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0,0,s*0.28,0,Math.PI*2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s*0.28, 0);
    ctx.lineTo(s*0.62, 0);
    ctx.lineWidth =5;
    ctx.stroke();
  })
}

function drawSniperTank(ctx, cx, cy, size, rotation = 0) {
  drawTankBase(ctx, cx, cy, size, rotation, "#332211", "#e67e22", (ctx, s) => {
    ctx.beginPath();
    ctx.moveTo(-s*0.42, -s*0.34);
    ctx.lineTo(s*0.44, -s*0.30);
    ctx.lineTo(s*0.40, s*0.34);
    ctx.lineTo(-s*0.45, s*0.30);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0,0,s*0.20,0,Math.PI*2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s*0.20, 0);
    ctx.lineTo(s*0.95, 0);
    ctx.lineWidth =2;
    ctx.stroke();
  })
}

function drawBomberTank(ctx, cx, cy, size, rotation =0){
  drawTankBase(ctx, cx, cy, size, rotation, "#301212", "#ff3333", (ctx, s)=>{
    ctx.beginPath();
    ctx.moveTo(-s*0.48, -s*0.45);
    ctx.lineTo(s*0.48, -s*0.40);
    ctx.lineTo(s*0.44, s*0.45);
    ctx.lineTo(-s*0.44, s*0.40);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0,0,s*0.24,0,Math.PI*2);
    ctx.fill();
    ctx.stroke();
  })
}

function drawShotgunTank(ctx, cx, cy, size, rotation=0){
  drawTankBase(ctx, cx, cy, size, rotation, "#123028", "#22eeaa", (ctx, s)=>{
    ctx.beginPath();
    ctx.moveTo(-s*0.45, -s*0.38);
    ctx.lineTo(s*0.46, -s*0.34);
    ctx.lineTo(s*0.42, s*0.38);
    ctx.lineTo(-s*0.42, s*0.34);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0,0,s*0.22,0,Math.PI*2);
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(s*0.22,-s*0.14);ctx.lineTo(s*0.52,-s*0.22);ctx.stroke();
    ctx.beginPath();ctx.moveTo(s*0.22,0);ctx.lineTo(s*0.58,0);ctx.stroke();
    ctx.beginPath();ctx.moveTo(s*0.22,s*0.14);ctx.lineTo(s*0.52,s*0.22);ctx.stroke();
  })
}

// ===== Boss 绘制函数（依据设计文档） =====

/**
 * Boss1 铁壁哨兵 Iron Sentinel 第5关
 * 四足机甲炮台，固定中央，旋转炮塔
 */
function drawBoss_IronSentinel(ctx, cx, cy, size, rot) {
  const t = Date.now() / 1000;
  ctx.save();
  ctx.translate(cx, cy);

  // ---- 底层推进/动力光环 ----
  ctx.save();
  ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 3);
  ctx.strokeStyle = "#00f0ff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.95, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // ---- 底座四足底盘（多层装甲）----
  ctx.fillStyle = "#1b2140";
  ctx.strokeStyle = "#00f0ff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-size*0.7, -size*0.5);
  ctx.lineTo(size*0.7, -size*0.5);
  ctx.lineTo(size*0.7, size*0.5);
  ctx.lineTo(-size*0.7, size*0.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 内部装甲内衬
  ctx.fillStyle = "#2a3366";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-size*0.55, -size*0.36);
  ctx.lineTo(size*0.55, -size*0.36);
  ctx.lineTo(size*0.45, size*0.36);
  ctx.lineTo(-size*0.45, size*0.36);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 车头楔形装甲
  ctx.fillStyle = "#12162e";
  ctx.beginPath();
  ctx.moveTo(-size*0.2, -size*0.42);
  ctx.lineTo(size*0.6, -size*0.42);
  ctx.lineTo(size*0.42, size*0.42);
  ctx.lineTo(-size*0.2, size*0.42);
  ctx.closePath();
  ctx.fill();

  // 四条装甲支撑腿与足部
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#3a4478";
  ctx.beginPath();
  ctx.moveTo(-size*0.6,-size*0.42); ctx.lineTo(-size*0.82,-size*0.68);
  ctx.moveTo(size*0.6,-size*0.42);  ctx.lineTo(size*0.82,-size*0.68);
  ctx.moveTo(-size*0.6,size*0.42);  ctx.lineTo(-size*0.82,size*0.68);
  ctx.moveTo(size*0.6,size*0.42);   ctx.lineTo(size*0.82,size*0.68);
  ctx.stroke();
  // 底部固定锚爪
  ctx.strokeStyle = "#00f0ff";
  ctx.lineWidth = 3;
  for(const sx of [-1, 1]) {
    for(const sy of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx*size*0.82 - sx*size*0.12, sy*size*0.68);
      ctx.lineTo(sx*size*0.82 - sx*size*0.22, sy*size*0.68 + sy*size*0.06);
      ctx.lineTo(sx*size*0.82 + sx*size*0.12, sy*size*0.68 + sy*size*0.06);
      ctx.lineTo(sx*size*0.82 + sx*size*0.02, sy*size*0.68);
      ctx.stroke();
    }
  }

  // ---- 旋转主炮塔 ----
  ctx.save();
  ctx.rotate(rot);
  // 下部支撑环
  ctx.fillStyle = "#12162e";
  ctx.strokeStyle = "#2e3a6c";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // 6 根重型炮管（分上下两层俯角）
  ctx.strokeStyle = "#ff2e88";
  for(let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const tilt = i % 2 === 0 ? 0.12 : -0.12;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * size * 0.4, Math.sin(a) * size * 0.4);
    ctx.lineTo(Math.cos(a + tilt) * size * 0.68, Math.sin(a + tilt) * size * 0.68);
    ctx.stroke();
    // 炮口环
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(Math.cos(a + tilt) * size * 0.68, Math.sin(a + tilt) * size * 0.68, size * 0.05, 0, Math.PI * 2);
    ctx.stroke();
  }
  // 塔顶装甲盖
  ctx.fillStyle = "#1a2236";
  ctx.strokeStyle = "#ff2e88";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // 上层小口径速射炮
  ctx.strokeStyle = "#6a7bff";
  ctx.lineWidth = 3;
  for(let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + rot;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * size * 0.34, Math.sin(a) * size * 0.34);
    ctx.lineTo(Math.cos(a) * size * 0.5, Math.sin(a) * size * 0.5);
    ctx.stroke();
  }
  // 核心能量反应堆（脉冲）
  const pulse = 0.7 + 0.3 * Math.sin(t * 4);
  ctx.fillStyle = "#00f0ff";
  ctx.globalAlpha = 0.5 + 0.5 * pulse;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.16 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ---- 顶部警戒灯 ----
  const blink = Math.sin(t * 6) > 0;
  ctx.fillStyle = blink ? "#ff3333" : "#880000";
  ctx.beginPath();
  ctx.arc(0, -size * 0.5, size * 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.globalAlpha = blink ? 0.6 : 0.15;
  ctx.strokeStyle = "#ff3333";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -size * 0.5, size * 0.12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

/**
 * Boss2 裂空巡洋 SkyRift 第10关
 * 悬浮飞行堡垒，椭圆轨道移动
 */
function drawBoss_SkyRift(ctx, cx, cy, size, rot) {
  const t = Date.now() / 1000;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);

  // ---- 引擎尾焰（动态喷射，舰尾在-x方向）----
  const flame = 0.6 + 0.4 * Math.sin(t * 20);
  const grad = ctx.createLinearGradient(-size*0.9, 0, -size*1.5, 0);
  grad.addColorStop(0, "rgba(255,215,0,0.9)");
  grad.addColorStop(0.5, "rgba(255,100,20,0.6)");
  grad.addColorStop(1, "rgba(255,60,20,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-size*0.85, -size*0.14 - flame * size * 0.03);
  ctx.lineTo(-size*1.5, -flame * size * 0.03);
  ctx.lineTo(-size*1.5, flame * size * 0.03);
  ctx.lineTo(-size*0.85, size*0.14 + flame * size * 0.03);
  ctx.closePath();
  ctx.fill();

  // ---- 中央舰体（长菱形母舰）----
  ctx.fillStyle = "#182038";
  ctx.strokeStyle = "#ffd700";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-size*0.9, 0);
  ctx.lineTo(-size*0.35,-size*0.45);
  ctx.lineTo(size*0.8, 0);
  ctx.lineTo(-size*0.35, size*0.45);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 舰体中线高光
  ctx.strokeStyle = "#2a3860";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-size*0.8, 0);
  ctx.lineTo(size*0.8, 0);
  ctx.stroke();

  // ---- 后掠三角翼 ----
  ctx.fillStyle = "#111a30";
  ctx.strokeStyle = "#ffd700";
  ctx.lineWidth = 2;
  // 上翼
  ctx.beginPath();
  ctx.moveTo(size*0.2, -size*0.2);
  ctx.lineTo(size*0.85, -size*0.55);
  ctx.lineTo(size*0.95, -size*0.45);
  ctx.lineTo(size*0.5, -size*0.18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 下翼
  ctx.beginPath();
  ctx.moveTo(size*0.2, size*0.2);
  ctx.lineTo(size*0.85, size*0.55);
  ctx.lineTo(size*0.95, size*0.45);
  ctx.lineTo(size*0.5, size*0.18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // ---- 两侧平行副炮阵列（上下各3门）----
  ctx.strokeStyle = "#9aa7ff";
  ctx.lineWidth = 3;
  for(let s = 1; s <= 3; s++) {
    const off = s * 0.16 * size;
    const spread = size * (0.18 + s * 0.03);
    ctx.beginPath();
    ctx.moveTo(off, -size*0.24); ctx.lineTo(off + size*0.26, -size*0.24 - spread*0.3);
    ctx.moveTo(off, size*0.24);  ctx.lineTo(off + size*0.26, size*0.24 + spread*0.3);
    ctx.stroke();
    // 炮口闪光
    const flash = Math.sin(t * 8 + s) > 0.6;
    if(flash) {
      ctx.fillStyle = "#ffd700";
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(off + size*0.26 + size*0.04, -size*0.24 - spread*0.3, size*0.04, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // ---- 中央能量核心（脉冲球）----
  const pulse = 0.7 + 0.3 * Math.sin(t * 5);
  ctx.fillStyle = "#ff2e88";
  ctx.shadowColor = "#ff2e88";
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.22 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  // 外圈粒子光环
  ctx.strokeStyle = "#ff2e88";
  ctx.lineWidth = 2;
  ctx.setLineDash([size*0.06, size*0.08]);
  ctx.lineDashOffset = -t * size * 0.3;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  // 核心亮点
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Boss3A 量子双子A（青色个体）
 */
function drawBoss_QuantumTwinA(ctx, cx, cy, size, rot) {
  const t = Date.now() / 1000;
  ctx.save();
  ctx.translate(cx, cy);

  // 外部量子缠绕光环（动态旋转虚线环）
  ctx.strokeStyle = "#00f0ff";
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.7;
  ctx.setLineDash([size * 0.08, size * 0.12]);
  ctx.lineDashOffset = -t * size * 0.4;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.78, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  // 环绕粒子
  for(let i = 0; i < 6; i++) {
    const pa = t * 2 + (i / 6) * Math.PI * 2;
    ctx.fillStyle = (i % 2) ? "#00f0ff" : "#ffffff";
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(Math.cos(pa) * size * 0.78, Math.sin(pa) * size * 0.78, size * 0.035, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // 八边形量子晶体躯体（带棱面折射）
  ctx.save();
  ctx.rotate(rot);
  ctx.fillStyle = "#102c38";
  ctx.strokeStyle = "#00f0ff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  for(let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const px = Math.cos(a) * size * 0.5;
    const py = Math.sin(a) * size * 0.5;
    if(i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 内部棱面分割线
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(0,240,255,0.35)";
  for(let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * size * 0.5, Math.sin(a) * size * 0.5);
    ctx.stroke();
  }
  // 前端量子炮管（两段式）
  ctx.strokeStyle = "#00f0ff";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(size * 0.3, 0);
  ctx.lineTo(size * 0.6, 0);
  ctx.stroke();
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(size * 0.6, 0);
  ctx.lineTo(size * 0.78, 0);
  ctx.stroke();
  // 炮口能量环
  ctx.strokeStyle = "#00f0ff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(size * 0.66, 0, size * 0.06, 0, Math.PI * 2);
  ctx.stroke();
  // 旋转内层楔形壳
  ctx.fillStyle = "rgba(16,44,56,0.8)";
  ctx.beginPath();
  for(let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + size;
    const px = Math.cos(a) * size * 0.3;
    const py = Math.sin(a) * size * 0.3;
    if(i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
  // 量子核心（脉冲）
  const pulse = 0.7 + 0.3 * Math.sin(t * 6);
  ctx.fillStyle = "#00f0ff";
  ctx.shadowColor = "#00f0ff";
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.2 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

/**
 * Boss3B 量子双子B（紫色个体）
 */
function drawBoss_QuantumTwinB(ctx, cx, cy, size, rot) {
  const t = Date.now() / 1000;
  ctx.save();
  ctx.translate(cx, cy);

  // 外部量子缠绕光环（紫色）
  ctx.strokeStyle = "#a855f7";
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.7;
  ctx.setLineDash([size * 0.08, size * 0.12]);
  ctx.lineDashOffset = t * size * 0.4;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.78, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  // 环绕反相粒子（与A反向旋转，体现纠缠）
  for(let i = 0; i < 6; i++) {
    const pa = -t * 2 + (i / 6) * Math.PI * 2;
    ctx.fillStyle = (i % 2) ? "#a855f7" : "#ffffff";
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(Math.cos(pa) * size * 0.78, Math.sin(pa) * size * 0.78, size * 0.035, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // 八边形量子晶体躯体（紫色）
  ctx.save();
  ctx.rotate(rot);
  ctx.fillStyle = "#281838";
  ctx.strokeStyle = "#a855f7";
  ctx.lineWidth = 3;
  ctx.beginPath();
  for(let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const px = Math.cos(a) * size * 0.5;
    const py = Math.sin(a) * size * 0.5;
    if(i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 内部棱面分割线
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(168,85,247,0.35)";
  for(let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * size * 0.5, Math.sin(a) * size * 0.5);
    ctx.stroke();
  }
  // 前端量子炮管（两段式）
  ctx.strokeStyle = "#a855f7";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(size * 0.3, 0);
  ctx.lineTo(size * 0.6, 0);
  ctx.stroke();
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(size * 0.6, 0);
  ctx.lineTo(size * 0.78, 0);
  ctx.stroke();
  // 炮口能量环
  ctx.strokeStyle = "#a855f7";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(size * 0.66, 0, size * 0.06, 0, Math.PI * 2);
  ctx.stroke();
  // 旋转内层楔形壳
  ctx.fillStyle = "rgba(40,24,56,0.8)";
  ctx.beginPath();
  for(let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + size;
    const px = Math.cos(a) * size * 0.3;
    const py = Math.sin(a) * size * 0.3;
    if(i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
  // 量子核心（脉冲）
  const pulse = 0.7 + 0.3 * Math.sin(t * 6 + Math.PI);
  ctx.fillStyle = "#a855f7";
  ctx.shadowColor = "#a855f7";
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.2 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

/**
 * Boss4 终焉引擎 Doom Engine 第20关最终Boss
 * @param {number} phase 阶段 1|2|3
 * @param {boolean} weakPointVisible 弱点核心是否闪烁显示(阶段3)
 */
function drawBoss_DoomEngine(ctx, cx, cy, size, rot, phase, weakPointVisible) {
  const t = Date.now() / 1000;
  ctx.save();
  ctx.translate(cx, cy);

  // ---- 中轴旋转采用 rot，主体装甲不随炮台旋转 ----
  ctx.save();
  ctx.rotate(rot);

  // 阶段1：巨型末日机甲主体
  if(phase === 1) {
    // 厚重矩形机壳
    ctx.fillStyle = "#141828";
    ctx.strokeStyle = "#ff3b3b";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-size*0.8, -size*0.7);
    ctx.lineTo(size*0.8, -size*0.6);
    ctx.lineTo(size*0.75, size*0.7);
    ctx.lineTo(-size*0.85, size*0.65);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // 肩部装甲条
    ctx.fillStyle = "#1e2434";
    ctx.strokeStyle = "#ff8a5c";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-size*0.85, -size*0.55);
    ctx.lineTo(size*0.78, -size*0.45);
    ctx.lineTo(size*0.72, -size*0.1);
    ctx.lineTo(-size*0.82, -size*0.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // 5组多层炮管（红色能量）
    ctx.strokeStyle = "#ff3b3b";
    for(let i = -2; i <= 2; i++) {
      ctx.lineWidth = i % 2 === 0 ? 6 : 4;
      ctx.beginPath();
      ctx.moveTo(size*0.3, i*size*0.22);
      ctx.lineTo(size*0.78, i*size*0.22 - (i % 2 ? size*0.03 : -size*0.03));
      ctx.stroke();
    }
    // 下层副机炮
    ctx.strokeStyle = "#ff6a6a";
    ctx.lineWidth = 3;
    for(let i = -3; i <= 3; i += 2) {
      ctx.beginPath();
      ctx.moveTo(size*0.45, i*size*0.14);
      ctx.lineTo(size*0.95, i*size*0.14);
      ctx.stroke();
    }
    // 观察眼/硕大舱门
    ctx.fillStyle = "#1a2030";
    ctx.strokeStyle = "#ff3b3b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(-size*0.1, size*0.18, size*0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // 引擎喷口（底部）
    ctx.fillStyle = "#0a0c14";
    ctx.beginPath();
    ctx.rect(-size*0.2, size*0.5, size*0.4, size*0.2);
    ctx.fill();
    ctx.stroke();
  }
  // 阶段2：展开飞行堡垒（外扩环结构 + 旋转涡扇）
  else if(phase === 2) {
    // 外环
    ctx.fillStyle = "#141828";
    ctx.strokeStyle = "#ff3b3b";
    ctx.lineWidth = 4;
    ctx.beginPath();
    for(let i = 0; i < 12; i++) {
      const a = (i/12)*Math.PI*2;
      ctx.lineTo(Math.cos(a)*size*0.75, Math.sin(a)*size*0.75);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // 内层环
    ctx.fillStyle = "#10131e";
    ctx.beginPath();
    for(let i = 0; i < 12; i++) {
      const a = (i/12)*Math.PI*2;
      ctx.lineTo(Math.cos(a)*size*0.45, Math.sin(a)*size*0.45);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // 旋转涡扇叶片（径向炮塔）
    ctx.strokeStyle = "#ff3b3b";
    ctx.lineWidth = 5;
    for(let i = 0; i < 6; i++) {
      const a = (i/6)*Math.PI*2 + size * 0.5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a)*size*0.45, Math.sin(a)*size*0.45);
      ctx.lineTo(Math.cos(a)*size*0.8, Math.sin(a)*size*0.8);
      ctx.stroke();
      // 扇叶末端炮口
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(Math.cos(a)*size*0.8, Math.sin(a)*size*0.8, size*0.05, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 5;
    }
    // 外环连接甲板（12块）
    ctx.strokeStyle = "#ff8a5c";
    ctx.lineWidth = 2;
    for(let i = 0; i < 12; i++) {
      const a = (i/12)*Math.PI*2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a)*size*0.55, Math.sin(a)*size*0.55);
      ctx.lineTo(Math.cos(a)*size*0.68, Math.sin(a)*size*0.68);
      ctx.stroke();
    }
  }
  // 阶段3：核心暴露（破碎形态）
  else if(phase === 3) {
    // 破碎外框
    ctx.strokeStyle = "#ff6a6a";
    ctx.lineWidth = 2;
    for(let frag = 0; frag < 8; frag++) {
      const ang = (frag/8)*Math.PI*2 + size;
      const r1 = size*0.45;
      const r2 = size*0.72;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang)*r1, Math.sin(ang)*r1);
      ctx.lineTo(Math.cos(ang)*r2, Math.sin(ang)*r2);
      ctx.stroke();
    }
    // 残骸甲板碎块
    ctx.fillStyle = "rgba(255,80,60,0.25)";
    ctx.strokeStyle = "#ff6a6a";
    ctx.lineWidth = 2;
    for(let frag = 0; frag < 4; frag++) {
      const ang = (frag/4)*Math.PI*2 + size;
      const a0 = ang - 0.3, a1 = ang + 0.3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a0)*size*0.4, Math.sin(a0)*size*0.4);
      ctx.lineTo(Math.cos(a1)*size*0.4, Math.sin(a1)*size*0.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  // ---- 核心（阶段1/2暗红内置，阶段3闪烁弱点）----
  if(weakPointVisible && phase === 3) {
    // 弱点核心：金色闪烁 + 能量波动
    const wpulse = 0.8 + 0.2 * Math.sin(t * 10);
    ctx.fillStyle = "#ffd700";
    ctx.strokeStyle = "#ff2e88";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#ffd700";
    ctx.shadowBlur = 24 * wpulse;
    ctx.beginPath();
    ctx.arc(0, 0, size*0.2*wpulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    // 外层警告环
    ctx.strokeStyle = "#ff2e88";
    ctx.lineWidth = 2;
    ctx.setLineDash([size*0.06, size*0.08]);
    ctx.lineDashOffset = -t * size * 0.3;
    ctx.beginPath();
    ctx.arc(0, 0, size*0.32, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    // 内置核心（阶段1/2）
    const cpulse = 0.8 + 0.2 * Math.sin(t * 4);
    ctx.fillStyle = "#882233";
    ctx.strokeStyle = "#ff3b3b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, size*0.18*cpulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if(phase === 2) {
      // 阶段2绕核心的旋转能量弧
      ctx.strokeStyle = "#ff6a6a";
      ctx.lineWidth = 2;
      for(let i = 0; i < 3; i++) {
        const a0 = t * 4 + (i/3)*Math.PI*2;
        ctx.beginPath();
        ctx.arc(0, 0, size*0.3, a0, a0 + 0.5);
        ctx.stroke();
      }
    }
  }

  ctx.restore();
  ctx.restore();
}

// ===== End of custom draw utilities =====

class Enemy {
  constructor(x, y, type='scout', level=1) {
    this.x = x; this.y = y;
    this.type = type;
    this.level = level;
    this.angle = 0;
    this.moveTimer = 0;
    this.state = 'chase';
    this.alive = true;
    this.stunTimer = 0;
    this.burnTimer = 0;
    this.burnDps = 0;
    this.slowMul = 1;
    this.isElite = false;
    
    // 嘲讽气泡
    this.tauntTimer = rand(2, 5);
    this.tauntText = null;
    this.tauntDuration = 0;
    
    // 嘲讽文本池
    this.taunts = {
      scout: ['抓不到我吧', '太慢了', '看我的', '追不上', '哈哈'],
      heavy: ['撞飞你', '硬壳无敌', '渺小', '螳臂挡车', '自不量力'],
      sniper: ['吃我子弹', '中看不中用', '靶子', '命中率100%', '坐下'],
      bomber: ['同归于尽吧', '跑不掉的', 'boom!', '一起死吧', '别想逃'],
      shotgun: ['尝尝霰弹', '躲不开的', '火力全开', '满身弹孔']
    };
    
    const diffScale = Math.pow(CONFIG.DIFFICULTY_PER_LEVEL.hpMul, level - 1);
    const dmgScale = Math.sqrt(diffScale);
    
    // 5种坦克类型（依据设计文档）：
    // scout   侦察兵：小巧高速，洋红 #ff2e88
    // heavy   重甲兵：大块厚重，紫色 #9b59b6
    // sniper  狙击手：长管远程，橙黄 #e67e22
    // bomber  自爆兵：圆胖无炮，亮红 #ff3333，接触自爆
    // shotgun 霰弹兵：多管扇形，青绿 #22eeaa
    const configs = {
      scout:   { hp: 4,  speed: 170, size: 13, color: '#ff2e88', dmg: 2, score: 10, fireRate: 0,    bulletSpeed: 0,   bulletDmg: 0, bulletR: 0 },
      heavy:   { hp: 26, speed: 45,  size: 26, color: '#9b59b6', dmg: 4, score: 25, fireRate: 3.2, bulletSpeed: 170, bulletDmg: 4, bulletR: 6 },
      sniper:  { hp: 8,  speed: 60,  size: 14, color: '#e67e22', dmg: 2, score: 20, fireRate: 2.0, bulletSpeed: 320, bulletDmg: 4, bulletR: 4 },
      bomber:  { hp: 9,  speed: 120, size: 16, color: '#ff3333', dmg: 3, score: 18, fireRate: 0,    bulletSpeed: 0,   bulletDmg: 0, bulletR: 0 },
      shotgun: { hp: 12, speed: 70,  size: 18, color: '#22eeaa', dmg: 2, score: 22, fireRate: 2.4, bulletSpeed: 220, bulletDmg: 2, bulletR: 4 },
    };
    
    const c = configs[type] || configs.scout;
    this.maxHp = Math.ceil(c.hp * diffScale);
    this.hp = this.maxHp;
    this.baseSpeed = c.speed;
    this.size = c.size;
    this.color = c.color;
    this.dmg = c.dmg;
    this.score = Math.floor(c.score * (1 + (level-1) * 0.2));
    this.fireRate = c.fireRate;
    this.bulletSpeed = c.bulletSpeed;
    this.bulletDmg = c.bulletDmg * dmgScale;
    this.bulletR = c.bulletR;
    
    // 精英敌人：任意类型都有概率成为精英
    if(level >= 3 && Math.random() < 0.15) {
      this.isElite = true;
      this.maxHp *= 2; this.hp = this.maxHp;
      this.color = '#ff0066';
      this.size += 4;
      this.score *= 3;
      this.eliteDmgBonus = level;
    }
  }
  takeDamage(dmg, game) {
    this.hp -= dmg;
    game.player.damageDealt(dmg, game);
    if(this.hp <= 0) this.die(game);
  }
  die(game) {
    this.alive = false;
    game.killCount++;
    game.addEnemyFragments(this.x, this.y, this.size, this.color, this.isElite);
    game.screenShake(0.15);
    game.player.score += this.score;
    game.player.ultimate = Math.min(20, game.player.ultimate + 1 + game.player.chargePerKillBonus);
    
    if(Math.random() < 0.1) {
      game.pickups.push(new Pickup(this.x, this.y, 'heal'));
    }
    
    if(this.isElite) {
      // 护盾掉落率降低：只有20%概率
      if(Math.random() < 0.2) game.pickups.push(new Pickup(this.x + 20, this.y, 'shield'));
      if(Math.random() < 0.2) game.pickups.push(new Pickup(this.x - 20, this.y, 'nuke'));
    }
  }
  update(dt, game) {
    if(this.stunTimer > 0) { this.stunTimer -= dt; return; }
    if(this.burnTimer > 0) { 
      this.burnTimer -= dt; 
      this.hp -= this.burnDps * dt;
      if(this.hp <= 0) { this.die(game); return; }
    }
    const player = game.player;
    // 防守关：敌人攻向中央基地
    const hasBase = game.base && game.base.alive;
    const target = hasBase ? game.base : player;
    const d = dist(this, target);
    this.angle = angle(this, target);
    const speed = this.baseSpeed * this.slowMul * (hasBase ? 0.5 : 1);
    
    if(this.type === 'sniper') {
      // 狙击手：保持理想距离远程输出
      const idealDist = 280;
      if(d > idealDist + 30) {
        this.x += Math.cos(this.angle) * speed * dt;
        this.y += Math.sin(this.angle) * speed * dt;
      } else if(d < idealDist - 30) {
        this.x -= Math.cos(this.angle) * speed * 0.6 * dt;
        this.y -= Math.sin(this.angle) * speed * 0.6 * dt;
      }
    } else if(this.type === 'shotgun') {
      // 霰弹兵：逼近玩家并横向游走
      if(d > 180) {
        this.x += Math.cos(this.angle) * speed * dt;
        this.y += Math.sin(this.angle) * speed * dt;
      }
      this.x += Math.cos(this.angle + Math.PI/2) * speed * 0.4 * dt;
      this.y += Math.sin(this.angle + Math.PI/2) * speed * 0.4 * dt;
    } else {
      // 侦察兵/重甲兵/自爆兵：直接追击
      this.x += Math.cos(this.angle) * speed * dt;
      this.y += Math.sin(this.angle) * speed * dt;
    }
    this.x = clamp(this.x, 20, CONFIG.CANVAS.w - 20);
    this.y = clamp(this.y, 20, CONFIG.CANVAS.h - 20);
    
    this.moveTimer -= dt;
    if(this.fireRate > 0 && this.moveTimer <= 0 && d < 520) {
      this.moveTimer = this.fireRate * rand(0.8, 1.2);
      if(this.type === 'shotgun') {
        // 霰弹兵：三发扇形弹幕
        for(let i = -1; i <= 1; i++) {
          const a = this.angle + i * 0.28;
          game.enemyBullets.push(new Bullet(
            this.x, this.y, a, this.bulletSpeed, this.bulletDmg, this.bulletR, this.color,
            { life: 3 }
          ));
        }
      } else {
        // 狙击手/重甲兵：单发瞄准弹
        game.enemyBullets.push(new Bullet(
          this.x, this.y, this.angle, this.bulletSpeed, this.bulletDmg, this.bulletR, this.color,
          { life: 3 }
        ));
      }
    }
    
    // 自爆兵：接触目标立即自爆
    if(this.type === 'bomber' && d < this.size + (hasBase ? 18 : player.size)) {
      if(hasBase) { game.base.hp -= this.dmg; }
      this.explode(game);
      return;
    }
    
    // 普通接触伤害（防守关对基地造成伤害）
    if(hasBase) {
      if(d < this.size + 18) {
        game.base.hp -= this.dmg;
        game.addExplosion(this.x, this.y, 20, this.color);
        this.die(game);
        if(game.base.hp <= 0) game.gameOver();
      }
    } else if(d < this.size + player.size) {
      player.takeDamage(player.maxHp / 5, game);
    }
    this.slowMul = lerp(this.slowMul, 1, 0.02);
    
    // 嘲讽气泡逻辑
    if(d < 400) { // 只在玩家靠近时嘲讽
      this.tauntTimer -= dt;
      if(this.tauntDuration > 0) {
        this.tauntDuration -= dt;
        if(this.tauntDuration <= 0) {
          this.tauntText = null;
        }
      }
      if(this.tauntTimer <= 0 && !this.tauntText) {
        const tauntList = this.taunts[this.type] || this.taunts.scout;
        this.tauntText = pick(tauntList);
        this.tauntDuration = 2; // 显示2秒
        this.tauntTimer = rand(3, 7); // 3-7秒后再次嘲讽
      }
    }
  }
  applyBurn(dps, duration) {
    this.burnTimer = Math.max(this.burnTimer, duration);
    this.burnDps = Math.max(this.burnDps, dps);
  }
  applySlow(factor, duration) {
    this.slowMul = Math.min(this.slowMul, factor);
    this.stunTimer = Math.max(this.stunTimer, duration);
  }
  explode(game) {
    if(!this.alive) return;
    this.alive = false;
    // 自爆爆炸效果与屏幕震动
    game.addExplosion(this.x, this.y, this.size * 2, '#ff3333');
    game.screenShake(0.35);
    // 对玩家造成范围伤害（按爆炸半径判定，遵循碰撞伤害1/5规则）
    if(dist(this, game.player) < this.size * 2 + game.player.size) {
      game.player.takeDamage(game.player.maxHp / 5, game);
    }
    // 自爆视同消灭，计入击杀与分数（不掉落道具）
    game.killCount++;
    game.player.score += this.score;
  }
  draw(ctx) {
    const now = Date.now() / 1000;
    // 精英敌人：层叠光环 + 旋转指挥环 + 警戒灯（区别于普通怪）
    if(this.isElite) {
      ctx.save();
      // 扩散脉冲光环
      const ringPulse = (now % 1.2) / 1.2;
      ctx.strokeStyle = '#ff0066';
      ctx.globalAlpha = (1 - ringPulse) * 0.6;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 1.2 + ringPulse * this.size * 1.6, 0, Math.PI * 2);
      ctx.stroke();
      // 静态指示光环（含刻度）
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 1.9, 0, Math.PI * 2);
      ctx.stroke();
      for(let i = 0; i < 8; i++) {
        const a = now * 1.5 + (i / 8) * Math.PI * 2;
        ctx.strokeStyle = i % 2 ? '#ff0066' : '#ffaa00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * this.size * 1.9, Math.sin(a) * this.size * 1.9);
        ctx.lineTo(Math.cos(a) * this.size * 2.15, Math.sin(a) * this.size * 2.15);
        ctx.stroke();
      }
      // 底部精英光电（金色）
      ctx.fillStyle = '#ffd700';
      ctx.globalAlpha = 0.7 + 0.3 * Math.sin(now * 6);
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 1.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // 使用文档中的坦克绘制函数渲染外形
    ctx.save();
    ctx.globalAlpha = this.burnTimer > 0 ? 0.6 : 1;
    if(this.isElite) {
      ctx.shadowColor = '#ff0066'; ctx.shadowBlur = 15;
      // 精英外壳沿用类型外形但统一呈猩红主色调
      ctx.globalAlpha *= 0.98;
    } else {
      ctx.shadowColor = this.color; ctx.shadowBlur = 8;
    }
    const scale = this.size * 1.7;
    if(this.type === 'scout') drawScoutTank(ctx, this.x, this.y, scale, this.angle);
    else if(this.type === 'heavy') drawHeavyTank(ctx, this.x, this.y, scale, this.angle);
    else if(this.type === 'sniper') drawSniperTank(ctx, this.x, this.y, scale, this.angle);
    else if(this.type === 'bomber') drawBomberTank(ctx, this.x, this.y, scale, this.angle);
    else if(this.type === 'shotgun') drawShotgunTank(ctx, this.x, this.y, scale, this.angle);
    ctx.restore();
    
    // HP bar
    if(this.hp < this.maxHp) {
      const bw = this.size * 2;
      ctx.fillStyle = '#333';
      ctx.fillRect(this.x - bw/2, this.y - this.size - 10, bw, 4);
      ctx.fillStyle = this.isElite ? '#ff0066' : '#ff4444';
      ctx.fillRect(this.x - bw/2, this.y - this.size - 10, bw * (this.hp / this.maxHp), 4);
    }
    
    // Burn indicator
    if(this.burnTimer > 0) {
      ctx.save();
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(Date.now() / 100);
      ctx.fillStyle = '#ff6600';
      ctx.beginPath();
      ctx.arc(this.x + rand(-3, 3), this.y + rand(-3, 3), 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    
    // 嘲讽气泡 - 科技军事风格
    if(this.tauntText) {
      ctx.save();
      const alpha = Math.min(1, this.tauntDuration);
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 13px "Courier New", monospace';
      const textWidth = ctx.measureText(this.tauntText).width;
      const padding = 10;
      const boxW = textWidth + padding * 2 + 12;
      const boxH = 28;
      const boxX = this.x - boxW / 2;
      const boxY = this.y - this.size - boxH - 18;
      
      // 背景 - 深色科技感
      ctx.fillStyle = 'rgba(15, 25, 45, 0.92)';
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      if(ctx.roundRect) {
        ctx.roundRect(boxX, boxY, boxW, boxH, 4);
      } else {
        ctx.rect(boxX, boxY, boxW, boxH);
      }
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      
      // 角落装饰 - 军事风格L形标记
      ctx.strokeStyle = '#ff6600';
      ctx.lineWidth = 2;
      const corner = 6;
      // 左上
      ctx.beginPath();
      ctx.moveTo(boxX, boxY + corner);
      ctx.lineTo(boxX, boxY);
      ctx.lineTo(boxX + corner, boxY);
      ctx.stroke();
      // 右下
      ctx.beginPath();
      ctx.moveTo(boxX + boxW - corner, boxY + boxH);
      ctx.lineTo(boxX + boxW, boxY + boxH);
      ctx.lineTo(boxX + boxW, boxY + boxH - corner);
      ctx.stroke();
      
      // 内部半透明扫描线
      ctx.fillStyle = 'rgba(0, 240, 255, 0.08)';
      ctx.fillRect(boxX + 1, boxY + 1, boxW - 2, (boxH - 2) * (1 - this.tauntDuration % 0.5));
      
      // 气泡尾巴
      ctx.beginPath();
      ctx.moveTo(this.x - 6, boxY + boxH);
      ctx.lineTo(this.x, boxY + boxH + 10);
      ctx.lineTo(this.x + 6, boxY + boxH);
      ctx.closePath();
      ctx.fillStyle = 'rgba(15, 25, 45, 0.92)';
      ctx.fill();
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // 警告指示灯
      const blink = Math.sin(Date.now() / 100) > 0;
      ctx.fillStyle = blink ? '#ff3333' : '#aa0000';
      ctx.beginPath();
      ctx.arc(boxX + 12, boxY + boxH / 2, 3, 0, Math.PI * 2);
      ctx.fill();
      
      // 文字 - 橙红色嘲讽风格
      ctx.fillStyle = '#ffaa44';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.tauntText, this.x + 4, boxY + boxH / 2);
      ctx.restore();
    }
  }
}


// ===== BOSS =====
class Boss {
  constructor(x, y, level) {
    this.x = x; this.y = y;
    this.level = level;
    // Boss 按关卡映射到文档中的4种Boss：5→铁壁哨兵 10→裂空巡洋 15→量子双子 20→终焉引擎
    const BOSS_SIZES = { 1: 80, 2: 90, 3: 70, 4: 110 };
    this.bossId = ((Math.floor(level / 5) - 1) % 4) + 1;
    this.size = BOSS_SIZES[this.bossId];
    this.angle = 0;
    this.turretAngle = 0;
    this.orbitAngle = Math.random() * Math.PI * 2;
    this.moveAngle = 0;
    this.moveTimer = 0;
    this.shootTimer = 0;
    this.alive = true;
    this.phase = 1;
    this.speed = 40;
    
    const hpScale = CONFIG.MODE === 'endless' ? CONFIG.ENDLESS.bossHpScale(level) : 1;
    const enhanced = CONFIG.MODE === 'endless' && level >= CONFIG.ENDLESS.enhancedBossEvery && level % CONFIG.ENDLESS.enhancedBossEvery === 0;
    
    // 血量强化：基础650，按Boss类型和高阶关卡放大（终焉引擎最肉）
    const bossHpMul = { 1: 1, 2: 1.35, 3: 1.25, 4: 1.8 }[this.bossId] || 1;
    const levelHpMul = 1 + (Math.floor(level / 5) - 1) * 0.12;
    this.maxHp = Math.ceil(650 * bossHpMul * levelHpMul * hpScale * (enhanced ? 2 : 1));
    this.hp = this.maxHp;
    // 每个Boss最多3个阶段（2个血线阈值）；量子双子半血分离，血线设为[0.5,0.2]
    this.phaseHpThresholds = this.bossId === 3 ? [0.5, 0.2] : [0.7, 0.4];
    this.currentPhase = 0;
    this.isEnhanced = enhanced;
    
    this.shootPattern = 0;
    this.patternTimer = 0;
    // 预瞄激光状态：{ timer, angle, fired }
    this.prelaser = null;
    // 导弹轰炸的红色预警落点
    this.bombStrikes = [];
    // 灼烧地面区域
    this.fireZones = [];
    // 灼烧预警（延迟后引燃地面）
    this.searWarnings = [];
    // 量子双子分离出的两个独立单位（半血后）
    this.split = false;
    this.splitTimer = 0;
    this.twinA = { x: 0, y: 0 };
    this.twinB = { x: 0, y: 0 };
  }
  takeDamage(dmg, game) {
    this.hp -= dmg;
    game.player.damageDealt(dmg, game);
    for(let i = 0; i < 5; i++) {
      game.particles.push(new Particle(
        this.x + rand(-this.size/2, this.size/2), this.y + rand(-this.size/2, this.size/2),
        rand(-50, 50), rand(-50, 50), '#ff4444', 0.5, 3
      ));
    }
    for(let i = this.currentPhase; i < this.phaseHpThresholds.length; i++) {
      if(this.hp / this.maxHp < this.phaseHpThresholds[i]) {
        this.currentPhase = i + 1;
        this.enterPhase(i + 1, game);
      }
    }
    if(this.hp <= 0) this.die(game);
  }
  enterPhase(phase, game) {
    game.floatingTexts.push(new FloatingText(this.x, this.y - this.size - 20, `⚠ 阶段 ${phase + 1} ⚠`, '#ff0066', 20));
    game.screenShake(0.4);
    for(let i = 0; i < 20; i++) {
      game.particles.push(new Particle(
        this.x, this.y, rand(-200, 200), rand(-200, 200), '#ff0066', 1, 5
      ));
    }
    this.speed += 20;
    // 量子双子：半血后分离为两个独立单位
    if(this.bossId === 3 && phase >= 1 && !this.split) {
      this.split = true;
      this.splitTimer = 0;
      game.floatingTexts.push(new FloatingText(this.x, this.y - this.size - 50, '量子双子 分离！', '#a855f7', 24));
      for(let i = 0; i < 30; i++) {
        game.particles.push(new Particle(
          this.x + rand(-40, 40), this.y + rand(-40, 40),
          rand(-300, 300), rand(-300, 300), i % 2 ? '#00f0ff' : '#a855f7', 1, 5
        ));
      }
    }
  }
  die(game) {
    this.alive = false;
    game.addExplosion(this.x, this.y, 100, '#ff4444');
    game.addExplosion(this.x, this.y, 80, '#ffaa00');
    game.screenShake(0.8);
    AudioMgr.bossDefeated();
    AudioMgr.stopBGM();
    // 根据模式恢复BGM
    const bgmMode = CONFIG.MODE === 'endless' ? 'endless' : 
                   CONFIG.MODE === 'creative' ? 'creative' : 'normal';
    AudioMgr.startBGM(bgmMode);
    for(let i = 0; i < 50; i++) {
      game.particles.push(new Particle(
        this.x + rand(-this.size, this.size), this.y + rand(-this.size, this.size),
        rand(-300, 300), rand(-300, 300), pick(['#ff4444','#ffaa00','#fff']), rand(0.5, 1.5), rand(3, 8)
      ));
    }
    game.player.score += 500 * this.level;
    game.bossDefeated = true;
    game.pickups.push(new Pickup(this.x, this.y, 'nuke'));
    // 护盾掉落率降低：只有28%概率掉落
    if(Math.random() < 0.28) game.pickups.push(new Pickup(this.x + 40, this.y, 'shield'));
    if(this.isEnhanced) game.pickups.push(new Pickup(this.x - 40, this.y, 'nuke'));
  }
  update(dt, game) {
    const player = game.player;
    const d = dist(this, player);
    this.angle = angle(this, player);
    
    // 炮塔/轨道持续旋转（铁壁哨兵旋转炮塔，量子双子环绕）
    this.turretAngle += dt * 1.2;
    this.orbitAngle += dt * 0.5;
    
    if(this.bossId === 1) {
      // 铁壁哨兵：固定中央，缓慢回中漂移
      const cx = CONFIG.CANVAS.w / 2, cy = CONFIG.CANVAS.h / 2;
      this.x += (cx - this.x) * 0.005;
      this.y += (cy - this.y) * 0.005;
    } else if(this.bossId === 2) {
      // 裂空巡洋：椭圆轨道移动
      const cx = CONFIG.CANVAS.w / 2, cy = CONFIG.CANVAS.h / 2;
      this.x = cx + Math.cos(this.orbitAngle) * CONFIG.CANVAS.w * 0.28;
      this.y = cy + Math.sin(this.orbitAngle) * CONFIG.CANVAS.h * 0.2;
    } else {
      // 量子双子 / 终焉引擎：接近、环绕、撤退模式
      this.moveTimer -= dt;
      if(this.moveTimer <= 0) {
        this.moveTimer = rand(2, 4);
        this.movePattern = pick(['approach', 'circle', 'retreat']);
      }
      if(this.movePattern === 'approach' && d > 150) {
        this.x += Math.cos(this.angle) * this.speed * dt;
        this.y += Math.sin(this.angle) * this.speed * dt;
      } else if(this.movePattern === 'circle') {
        this.x += Math.cos(this.angle + Math.PI/2) * this.speed * 0.7 * dt;
        this.y += Math.sin(this.angle + Math.PI/2) * this.speed * 0.7 * dt;
      } else if(this.movePattern === 'retreat' && d < 200) {
        this.x -= Math.cos(this.angle) * this.speed * dt;
        this.y -= Math.sin(this.angle) * this.speed * dt;
      }
    }
    this.x = clamp(this.x, 80, CONFIG.CANVAS.w - 80);
    this.y = clamp(this.y, 80, CONFIG.CANVAS.h - 80);
    
    // 量子双子：更新A/B独立单位坐标（分离前后定位不同），并处理轰炸/灼烧
    this.updateTwinPositions(dt);
    this.updateBombStrikes(dt, game);
    this.updateFireZones(dt, game);
    this.updateSearWarnings(dt, game);
    
    // Bullet patterns
    this.shootTimer -= dt;
    if(this.shootTimer <= 0) {
      this.shootTimer = Math.max(0.3, 1.5 - this.currentPhase * 0.2);
      this.shoot(game);
    }
    
    // 预瞄激光：前期持续锁定玩家，开火前1秒锁定角度不再追踪，充能结束沿痕迹发射激光束
    if(this.prelaser && !this.prelaser.fired) {
      if(this.prelaser.timer > 1) {
        this.prelaser.angle = angle(this, player);
      }
      this.prelaser.timer -= dt;
      if(this.prelaser.timer <= 0) {
        const a = this.prelaser.angle;
        const R = Math.max(CONFIG.CANVAS.w, CONFIG.CANVAS.h) * 1.2;
        const ex = this.x + Math.cos(a) * R;
        const ey = this.y + Math.sin(a) * R;
        game.enemyBullets.push(new Bullet(this.x, this.y, a, 0, this.prelaser.dmg, 6, this.isEnhanced ? '#ff0066' : '#ff2050', {
          isLaser: true, instant: true, beamEndX: ex, beamEndY: ey, life: 0.7, pierce: 999
        }));
        game.screenShake(0.3);
        game.particles.push(new Particle(this.x, this.y, 0, 0, '#ff2050', 0.4, 30));
        this.prelaser.fired = true;
        this.prelaser = null;
      }
    }
  }
  // 量子双子A/B坐标：未分离时环绕本体，分离后各自独立机动（形成可配合的两个单位）
  updateTwinPositions(dt) {
    const off = this.size * 0.55;
    if(this.bossId === 3) {
      if(!this.split) {
        this.twinA.x = this.x + Math.cos(this.orbitAngle) * off;
        this.twinA.y = this.y + Math.sin(this.orbitAngle) * off;
        this.twinB.x = this.x - Math.cos(this.orbitAngle) * off;
        this.twinB.y = this.y - Math.sin(this.orbitAngle) * off;
      } else {
        this.splitTimer += dt;
        const dA = off * (1 + Math.min(0.7, this.splitTimer * 0.35));
        // A：向左逆时针飘散并上下起伏
        this.twinA.x = clamp(this.x + Math.cos(this.orbitAngle * 0.8 + Math.sin(this.splitTimer * 0.7)) * dA, 80, CONFIG.CANVAS.w - 80);
        this.twinA.y = clamp(this.y + Math.sin(this.orbitAngle * 0.8) * dA + Math.sin(this.splitTimer * 1.3) * 40, 80, CONFIG.CANVAS.h - 80);
        // B：向右延时针运动并上下反转起伏（与A交错，体现配合牵制）
        this.twinB.x = clamp(this.x - Math.cos(this.orbitAngle * 0.9 - Math.cos(this.splitTimer * 0.8)) * dA, 80, CONFIG.CANVAS.w - 80);
        this.twinB.y = clamp(this.y - Math.sin(this.orbitAngle * 0.9) * dA - Math.cos(this.splitTimer * 1.2) * 40, 80, CONFIG.CANVAS.h - 80);
      }
    } else {
      this.twinA.x = this.x; this.twinA.y = this.y;
      this.twinB.x = this.x; this.twinB.y = this.y;
    }
  }
  // 导弹轰炸落点：倒计时结束在对应位置爆炸并扩霰弹幕
  updateBombStrikes(dt, game) {
    if(this.bombStrikes.length === 0) return;
    for(let i = this.bombStrikes.length - 1; i >= 0; i--) {
      const s = this.bombStrikes[i];
      s.t -= dt;
      if(s.t <= 0) {
        game.addExplosion(s.x, s.y, s.r * 0.9, s.color || '#ff4444');
        game.screenShake(0.15);
        game.particles.push(new Particle(s.x, s.y, 0, 0, '#ffaa00', 0.5, 24));
        // 落点扩散一圈弹幕
        const count = 12;
        for(let k = 0; k < count; k++) {
          const a = (k / count) * Math.PI * 2 + rand(-0.06, 0.06);
          game.enemyBullets.push(new Bullet(s.x, s.y, a, 150, s.dmg, 5, s.color || '#ff4444', { life: 3.5 }));
        }
        this.bombStrikes.splice(i, 1);
      }
    }
  }
  // 灼烧地面区域：持续存在期间对玩家造成伤害并冒火
  updateFireZones(dt, game) {
    if(this.fireZones.length === 0) return;
    for(let i = this.fireZones.length - 1; i >= 0; i--) {
      const fz = this.fireZones[i];
      fz.t -= dt;
      if(fz.t <= 0) {
        this.fireZones.splice(i, 1);
        continue;
      }
      // 火苗粒子
      if(Math.random() < dt * 20) {
        game.particles.push(new Particle(
          fz.x + rand(-fz.r * 0.5, fz.r * 0.5), fz.y + rand(-fz.r * 0.5, fz.r * 0.5),
          rand(-20, 20), rand(-60, -20), Math.random() < 0.5 ? '#ff6b00' : '#ffaa00', rand(0.3, 0.6), rand(3, 6)
        ));
      }
      // 灼烧伤害
      if(dist(game.player, fz) < fz.r + game.player.size) {
        game.player.takeDamage(fz.dmg, game);
      }
    }
  }
  // 灼烧预警：倒计时结束引燃对应地面区域
  updateSearWarnings(dt, game) {
    if(this.searWarnings.length === 0) return;
    for(let i = this.searWarnings.length - 1; i >= 0; i--) {
      const sw = this.searWarnings[i];
      sw.t -= dt;
      if(sw.t <= 0) {
        this.fireZones.push({ x: sw.x, y: sw.y, t: sw.zoneT, r: sw.r, dmg: sw.dmg });
        this.searWarnings.splice(i, 1);
      }
    }
  }
  shoot(game) {
    // 每个Boss按特色选取部分攻击方式（至少3种），仅最终Boss拥有全部弹幕
    // 铁壁哨兵=扇形/分裂/导弹/灼烧；裂空巡洋=瞄准/激光/射线/导弹；量子双子=螺旋/双子/配合;终焉引擎=全弹幕
    const bossPools = {
      1: ['spread', 'split', 'bomb', 'sear'],
      2: ['targeted', 'laser', 'radial', 'bomb'],
      3: ['spiral', 'twins', 'twinCombo', 'bomb'],
      4: ['spread', 'spiral', 'targeted', 'cross', 'split', 'ring', 'laser', 'radial', 'bomb', 'sear', 'stun']
    };
    // 阶段0只出基础弹幕+分裂弹；阶段≥1解锁激光/环/射线等特殊弹幕，弹幕机制随阶段演变
    const baseAny = ['spread', 'spiral', 'targeted', 'cross'];
    const pool = bossPools[this.bossId].filter(p => p === 'split' || baseAny.includes(p) || this.currentPhase >= 1);
    const pattern = pool[this.shootPattern % pool.length];
    this.shootPattern++;
    
    const speed = 180 + this.currentPhase * 35;
    const dmg = (2.2 + this.level * 0.35 + this.currentPhase * 0.6) * (this.isEnhanced ? 1.3 : 1) * 0.7;
    // 弹幕颜色随阶段演"变"：阶段越高呈更危险的红/猩红
    const phaseTint = this.currentPhase >= 1 ? ['#00f0ff', '#ffcc00', '#ff5b3a', '#ff0066'][Math.min(3, this.currentPhase)] : null;
    const baseColor = ({ 1: '#ff3b3b', 2: '#ffd700', 3: this.shootPattern % 2 ? '#00f0ff' : '#a855f7', 4: '#ff8a3b' }[this.bossId] || '#ff4444');
    const color = this.isEnhanced ? '#ff0066' : (phaseTint || baseColor);
    
    if(pattern === 'spread') {
      const count = 10 + this.currentPhase * 3;
      for(let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + rand(-0.1, 0.1);
        game.enemyBullets.push(new Bullet(this.x, this.y, a, speed, dmg, 5, color, {life: 4}));
      }
    } else if(pattern === 'spiral') {
      const arms = 6 + Math.floor(this.currentPhase / 2);
      for(let i = 0; i < arms; i++) {
        const a = this.shootPattern * 0.35 + i * (Math.PI * 2 / arms);
        game.enemyBullets.push(new Bullet(this.x, this.y, a, speed * (1 + this.currentPhase * 0.15), dmg, 4, color, {life: 4}));
      }
    } else if(pattern === 'targeted') {
      for(let i = -2; i <= 2; i++) {
        const a = this.angle + i * 0.12;
        game.enemyBullets.push(new Bullet(this.x, this.y, a, speed * 1.5, dmg * 1.15, 6, color, {life: 3}));
      }
    } else if(pattern === 'cross') {
      const a0 = Math.PI / 4;
      for(let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + a0 + (this.currentPhase > 0 ? this.shootPattern * 0.1 : 0);
        game.enemyBullets.push(new Bullet(this.x, this.y, a, speed * 1.2, dmg, 5, color, {life: 4}));
      }
    } else if(pattern === 'split') {
      // 大型球形子弹，飞行一段时间后分裂为环形弹幕
      const a = this.angle + rand(-0.08, 0.08);
      game.enemyBullets.push(new Bullet(this.x, this.y, a, 95, dmg * 1.1, 13, color, {
        life: 4, split: true, splitTimer: 1.4 + this.currentPhase * 0.1,
        splitN: 10 + this.currentPhase * 3, splitSpeed: 160 + this.currentPhase * 20,
        splitChildR: 5, splitDmg: dmg, splitChildColor: color
      }));
    } else if(pattern === 'ring') {
      // 以Boss为中心的一圈弹幕（快速密集）
      const count = 16 + this.currentPhase * 4;
      const a0 = this.shootPattern * (Math.PI / count);
      for(let i = 0; i < count; i++) {
        const a = a0 + (i / count) * Math.PI * 2;
        game.enemyBullets.push(new Bullet(this.x, this.y, a, speed * 0.9, dmg, 5, color, {life: 4}));
      }
    } else if(pattern === 'radial') {
      // 旋转多臂射线（终焉/巡洋）
      const arms = 5;
      const a0 = this.shootPattern * 0.5;
      for(let k = 0; k < 2; k++) {
        for(let i = 0; i < arms; i++) {
          const a = a0 + i * (Math.PI * 2 / arms) + k * 0.3;
          game.enemyBullets.push(new Bullet(this.x, this.y, a, speed * (0.8 + k * 0.5), dmg, 5, color, {life: 4}));
        }
      }
    } else if(pattern === 'twins') {
      // 量子双子：从A/B两个独立单位交叉发射（使用分离后的实时坐标）
      const aA = angle(this.twinA, game.player);
      const aB = angle(this.twinB, game.player);
      for(let i = 0; i < 3; i++) {
        game.enemyBullets.push(new Bullet(this.twinA.x, this.twinA.y, aA + (i - 1) * 0.18, speed * 1.3, dmg, 6, this.pairColorA(), {life: 3}));
        game.enemyBullets.push(new Bullet(this.twinB.x, this.twinB.y, aB - (i - 1) * 0.18, speed * 1.3, dmg, 6, this.pairColorB(), {life: 3}));
      }
    } else if(pattern === 'bomb') {
      // 导弹轰炸：红色圆形预警落点（3-8个），延迟后爆炸
      const strikes = Math.floor(rand(3, 8));
      for(let i = 0; i < strikes; i++) {
        this.bombStrikes.push({
          x: rand(60, CONFIG.CANVAS.w - 60),
          y: rand(60, CONFIG.CANVAS.h - 60),
          t: 1.2 + rand(0, 0.5),
          r: 32 + this.currentPhase * 8,
          dmg: dmg * 1.2
        });
      }
    } else if(pattern === 'sear') {
      // 灼烧：先显示橙色预警圈，延迟后在地面燃烧
      const a0 = this.angle;
      const count = 4 + this.currentPhase;
      for(let i = 0; i < count; i++) {
        const dd = 90 + i * 70;
        this.searWarnings.push({
          x: clamp(this.x + Math.cos(a0) * dd + rand(-40, 40), 40, CONFIG.CANVAS.w - 40),
          y: clamp(this.y + Math.sin(a0) * dd + rand(-40, 40), 40, CONFIG.CANVAS.h - 40),
          t: 1.0 + rand(0, 0.4),
          r: 55 + this.currentPhase * 12,
          dmg: dmg,
          zoneT: 3 + this.currentPhase * 0.5
        });
      }
    } else if(pattern === 'stun') {
      // 震荡麻痹：扇面发射眩晕弹
      const count = 6 + this.currentPhase * 2;
      for(let i = 0; i < count; i++) {
        const a = this.angle + (i - (count - 1) / 2) * 0.24;
        game.enemyBullets.push(new Bullet(this.x, this.y, a, speed * 1.2, dmg, 8, color, {
          life: 3, stun: 1.2 + this.currentPhase * 0.3
        }));
      }
    } else if(pattern === 'twinCombo') {
      // 量子双子配合：A在玩家附近轰炸，B同步发射眩晕弹（分离后明显配合）
      const ca = { x: game.player.x, y: game.player.y };
      const strikes = 3 + this.currentPhase;
      for(let i = 0; i < strikes; i++) {
        this.bombStrikes.push({
          x: clamp(ca.x + rand(-90, 90), 60, CONFIG.CANVAS.w - 60),
          y: clamp(ca.y + rand(-90, 90), 60, CONFIG.CANVAS.h - 60),
          t: 1.1, r: 34 + this.currentPhase * 6, dmg: dmg * 1.3, color: this.pairColorA()
        });
      }
      const aB = angle(this.twinB, game.player);
      for(let i = 0; i < 5; i++) {
        game.enemyBullets.push(new Bullet(this.twinB.x, this.twinB.y, aB + (i - 2) * 0.13, speed * 1.4, dmg, 7, this.pairColorB(), {
          life: 3, stun: 1 + (this.currentPhase >= 2 ? 0.5 : 0)
        }));
      }
    } else if(pattern === 'laser') {
      // 先给出红色预瞄痕迹，短暂延迟后沿痕迹发射狙击激光
      this.prelaser = { timer: 1.5 + this.currentPhase * 0.1, angle: this.angle, fired: false, dmg: dmg * 1.4 };
    }
  }
  pairColorA() { return '#00f0ff'; }
  pairColorB() { return '#a855f7'; }
  draw(ctx) {
    ctx.save();
    if(this.isEnhanced) {
      ctx.shadowColor = '#ff0066'; ctx.shadowBlur = 20;
    }
    const s = this.size;
    if(this.bossId === 1) {
      // 铁壁哨兵：固定中央炮台，旋转炮塔
      drawBoss_IronSentinel(ctx, this.x, this.y, s, this.turretAngle);
    } else if(this.bossId === 2) {
      // 裂空巡洋：悬浮堡垒，整体旋转
      drawBoss_SkyRift(ctx, this.x, this.y, s, this.angle);
    } else if(this.bossId === 3) {
      // 量子双子：A青 B紫 使用分离后的独立坐标；分离后二者间有配合能量连线
      drawBoss_QuantumTwinA(ctx, this.twinA.x, this.twinA.y, s * 0.65, this.orbitAngle);
      drawBoss_QuantumTwinB(ctx, this.twinB.x, this.twinB.y, s * 0.65, -this.orbitAngle);
      if(this.split) {
        const tw = Date.now() / 1000;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        // 配合连线：A→B 的能量链
        const g = ctx.createLinearGradient(this.twinA.x, this.twinA.y, this.twinB.x, this.twinB.y);
        g.addColorStop(0, 'rgba(0,240,255,0.7)');
        g.addColorStop(1, 'rgba(168,85,247,0.7)');
        ctx.strokeStyle = g;
        ctx.lineWidth = 2;
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 10;
        ctx.setLineDash([6, 8]);
        ctx.lineDashOffset = -tw * 60;
        ctx.beginPath();
        ctx.moveTo(this.twinA.x, this.twinA.y);
        ctx.lineTo(this.twinB.x, this.twinB.y);
        ctx.stroke();
        ctx.setLineDash([]);
        // 连线中段放电节点
        const midX = (this.twinA.x + this.twinB.x) / 2;
        const midY = (this.twinA.y + this.twinB.y) / 2;
        ctx.fillStyle = `rgba(255,255,255,${0.5 + 0.5 * Math.sin(tw * 10)})`;
        ctx.beginPath();
        ctx.arc(midX, midY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    } else if(this.bossId === 4) {
      // 终焉引擎：三阶段形态，阶段3弱点闪烁
      const phase = Math.min(3, this.currentPhase + 1);
      const weakVisible = phase === 3 && Math.sin(Date.now() / 120) > 0;
      drawBoss_DoomEngine(ctx, this.x, this.y, s, this.angle, phase, weakVisible);
    }
    ctx.restore();
    
    // 阶段特效：外观随阶段演变（阶段越高,能量环越多、越密集,颜色越危险）
    if(this.currentPhase > 0) {
      const tw = Date.now() / 1000;
      const pCol = ['#00f0ff', '#ffcc00', '#ff5b3a', '#ff0066'][Math.min(3, this.currentPhase)];
      ctx.save();
      // 旋转的能量防护环（阶段1:1环, 阶段2:2环, 阶段3:3环）
      const rings = 1 + Math.floor(this.currentPhase / 2);
      ctx.strokeStyle = pCol;
      ctx.globalCompositeOperation = 'lighter';
      for(let i = 0; i < rings; i++) {
        const r = this.size * (0.95 + i * 0.16);
        ctx.globalAlpha = 0.3 + i * 0.12;
        ctx.lineWidth = 2;
        ctx.setLineDash([r * 0.22, r * 0.16]);
        ctx.lineDashOffset = -tw * r * (0.4 + i * 0.35);
        ctx.beginPath();
        ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      // 环绕粒子随阶段增多
      ctx.globalAlpha = 0.85;
      const dots = 2 + this.currentPhase * 2;
      const orbit = tw * (0.8 + this.currentPhase * 0.35);
      for(let i = 0; i < dots; i++) {
        const a = orbit + (i / dots) * Math.PI * 2;
        ctx.fillStyle = this.currentPhase === 3 ? '#ff0066' : pCol;
        ctx.shadowColor = pCol;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(this.x + Math.cos(a) * this.size * 1.05, this.y + Math.sin(a) * this.size * 1.05, 2 + i * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    
    // 导弹轰炸：红色圆形预警 + 倒计时描边 + 中心准星
    const now2 = Date.now() / 1000;
    for(const bs of this.bombStrikes) {
      const prog = 1 - Math.max(0, bs.t) / 1.7; // 进度0→1
      ctx.save();
      ctx.strokeStyle = `rgba(255,40,40,${0.35 + 0.3 * Math.sin(now2 * 12)})`;
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ff2020';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(bs.x, bs.y, bs.r, 0, Math.PI * 2);
      ctx.stroke();
      // 倒计时填充环
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(bs.x, bs.y, bs.r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * prog);
      ctx.stroke();
      // 中心准星
      ctx.strokeStyle = 'rgba(255,80,60,0.9)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(bs.x - bs.r * 0.3, bs.y); ctx.lineTo(bs.x - bs.r * 0.12, bs.y);
      ctx.moveTo(bs.x + bs.r * 0.12, bs.y); ctx.lineTo(bs.x + bs.r * 0.3, bs.y);
      ctx.moveTo(bs.x, bs.y - bs.r * 0.3); ctx.lineTo(bs.x, bs.y - bs.r * 0.12);
      ctx.moveTo(bs.x, bs.y + bs.r * 0.12); ctx.lineTo(bs.x, bs.y + bs.r * 0.3);
      ctx.stroke();
      ctx.restore();
    }
    // 灼烧预警：橙色圆形警告 + 倒计时 + 中心警示点
    for(const sw of this.searWarnings) {
      const prog = 1 - Math.max(0, sw.t) / 1.4;
      ctx.save();
      ctx.strokeStyle = `rgba(255,160,0,${0.4 + 0.3 * Math.sin(now2 * 14)})`;
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ff8800';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
      ctx.stroke();
      // 倒计时填充环
      ctx.strokeStyle = 'rgba(255,220,120,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * prog);
      ctx.stroke();
      // 中心警示点
      ctx.fillStyle = 'rgba(255,140,0,0.8)';
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // 灼烧地面区域：橙色燃烧圈 + 内焰
    for(const fz of this.fireZones) {
      const flick = 0.6 + 0.4 * Math.sin(now2 * 9 + fz.x);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g0 = ctx.createRadialGradient(fz.x, fz.y, 0, fz.x, fz.y, fz.r);
      g0.addColorStop(0, `rgba(255,255,220,${0.35 * flick})`);
      g0.addColorStop(0.35, `rgba(255,140,0,${0.45 * flick})`);
      g0.addColorStop(0.7, `rgba(255,60,20,${0.35 * flick})`);
      g0.addColorStop(1, 'transparent');
      ctx.fillStyle = g0;
      ctx.beginPath();
      ctx.arc(fz.x, fz.y, fz.r, 0, Math.PI * 2);
      ctx.fill();
      // 燃烧边缘环
      ctx.strokeStyle = `rgba(255,120,30,${0.5 + 0.3 * Math.sin(now2 * 10)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(fz.x, fz.y, fz.r * (0.6 + 0.15 * Math.sin(now2 * 14)), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    
    // 预瞄激光：红色警告痕迹（充能期间显示）
    if(this.prelaser && !this.prelaser.fired) {
      const tw = Date.now() / 1000;
      const a = this.prelaser.angle;
      const R = Math.max(CONFIG.CANVAS.w, CONFIG.CANVAS.h);
      const ex = this.x + Math.cos(a) * R;
      const ey = this.y + Math.sin(a) * R;
      const flick = 0.3 + 0.15 * Math.sin(tw * 14);
      // 外扩热浪（粗红线，闪烁扩散）
      ctx.save();
      ctx.strokeStyle = `rgba(255,40,40,${0.25 + flick})`;
      ctx.lineWidth = 12 + 3 * Math.sin(tw * 20);
      ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.restore();
      // 中央预警亮线
      ctx.save();
      ctx.strokeStyle = `rgba(255,120,70,${0.7 + 0.2 * Math.sin(tw * 22)})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(ex, ey); ctx.stroke();
      // 起始端蓄能光点
      const charge = 1 - Math.max(0, this.prelaser.timer) / 1.6;
      ctx.fillStyle = '#ff2050';
      ctx.shadowColor = '#ff2050';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 6 + charge * 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

// ===== PICKUP =====
class Pickup {
  constructor(x, y, type, value=1) {
    this.x = x + rand(-10, 10);
    this.y = y + rand(-10, 10);
    this.type = type;
    this.value = value;
    this.alive = true;
    this.life = 15;
    this.bobPhase = Math.random() * Math.PI * 2;
  }
  update(dt) {
    this.life -= dt;
    this.bobPhase += dt * 3;
    if(this.life <= 0) this.alive = false;
  }
  draw(ctx) {
    const bob = Math.sin(this.bobPhase) * 3;
    const flash = this.life < 3 && Math.floor(this.life * 5) % 2 === 0;
    if(flash) return;
    ctx.save();
    ctx.translate(this.x, this.y + bob);
    const colors = { heal: '#00ff88', shield: '#00f0ff', nuke: '#ffaa00' };
    const icons = { heal: '♥', shield: '🛡', nuke: '☢' };
    ctx.fillStyle = colors[this.type];
    ctx.shadowColor = colors[this.type];
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 0;
    ctx.fillText(icons[this.type], 0, 0);
    ctx.restore();
  }
}

// ===== GAME =====
class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.state = 'menu';
    this.lastTime = 0;
    this.accumulator = 0;
    this.fixedDt = 1 / 60;
    
    this.player = null;
    this.invincible = false; // 隐藏设置：无敌模式（游戏级，持久于所有模式/关卡）
    this.bullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.boss = null;
    this.drones = [];
    this.mines = [];
    this.particles = [];
    this.floatingTexts = [];
    this.pickups = [];
    
    this.level = 1;
    this.maxLevel = 20;
    this.killCount = 0;
    this.killTarget = 10;
    this.levelComplete = false;
    this.bossDefeated = false;
    this.hasNuke = false;
    this.reflectDamage = 0;
    
    this.screenShakeTime = 0;
    this.shakeIntensity = 0;
    this.screenFlashTime = 0;
    
    this.upgradeRound = 0;
    this.upgradeCards = [];
    this.pendingUpgrades = [];
    this.creativeUpgradeIndex = 0;
    this.creativeWeaponChoices = [];
    
    this.wave = 1;
    this.waveTimer = 0;
    this.spawnTimer = 0;
    this.startTime = 0;
    
    this.enemySpawnQueue = [];
    this.spawnCooldown = 0;
    
    this.synergiesActive = [];
    this.synergyKeys = [];
    
    this.highscore = parseInt(localStorage.getItem('tank_highscore') || '0');
    
    // 触摸控制状态
    this.touch = {
      active: false,
      moveJoystick: null,
      aimJoystick: null,
      firePressed: false
    };
    
    // 屏幕适配
    this.setupResponsiveCanvas();
    this.setupTouchControls();
    
    Input.init(this.canvas);
    AudioMgr.init();
    SpriteMgr.loadAll();
    this.setupMenu();
    requestAnimationFrame(this.loop.bind(this));
  }
  
  setupResponsiveCanvas() {
    const resizeCanvas = () => {
      const container = document.getElementById('game-container');
      const maxW = window.innerWidth;
      const maxH = window.innerHeight;
      const aspectRatio = CONFIG.CANVAS.w / CONFIG.CANVAS.h;
      
      let w = maxW;
      let h = maxW / aspectRatio;
      
      if(h > maxH) {
        h = maxH;
        w = maxH * aspectRatio;
      }
      
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
      container.style.width = w + 'px';
      container.style.height = h + 'px';
      
      // 更新HUD尺寸
      const hud = document.getElementById('hud');
      if(hud) {
        hud.style.width = w + 'px';
        hud.style.height = h + 'px';
      }
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('orientationchange', resizeCanvas);
  }
  
  setupTouchControls() {
    // 触摸移动摇杆
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      // 左下摇杆 - 移动
      if(x < rect.width / 2) {
        this.touch.moveJoystick = {
          baseX: x,
          baseY: y,
          dx: 0,
          dy: 0
        };
        this.touch.active = true;
      } else {
        // 右下区域 - 瞄准/射击
        this.touch.aimJoystick = {
          baseX: x,
          baseY: y,
          angle: 0
        };
        this.touch.firePressed = true;
        Input.mouse.down = true;
      }
    }, { passive: false });
    
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      
      for(let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        // 更新移动摇杆
        if(this.touch.moveJoystick && x < rect.width / 2) {
          const dx = x - this.touch.moveJoystick.baseX;
          const dy = y - this.touch.moveJoystick.baseY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 50;
          
          if(dist > maxDist) {
            this.touch.moveJoystick.dx = (dx / dist) * maxDist;
            this.touch.moveJoystick.dy = (dy / dist) * maxDist;
          } else {
            this.touch.moveJoystick.dx = dx;
            this.touch.moveJoystick.dy = dy;
          }
        }
        
        // 更新瞄准
        if(this.touch.aimJoystick && x > rect.width / 2) {
          const dx = x - this.touch.aimJoystick.baseX;
          const dy = y - this.touch.aimJoystick.baseY;
          this.touch.aimJoystick.angle = Math.atan2(dy, dx);
          
          // 设置鼠标位置用于瞄准
          Input.mouse.x = (x / rect.width) * CONFIG.CANVAS.w;
          Input.mouse.y = (y / rect.height) * CONFIG.CANVAS.h;
        }
      }
    }, { passive: false });
    
    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      if(e.touches.length === 0) {
        this.touch.active = false;
        this.touch.moveJoystick = null;
        this.touch.aimJoystick = null;
        this.touch.firePressed = false;
        Input.mouse.down = false;
      }
    }, { passive: false });
    
    // 阻止默认触摸行为
    document.addEventListener('touchmove', (e) => {
      if(e.target === this.canvas) e.preventDefault();
    }, { passive: false });
  }
  
  screenShake(intensity) {
    this.screenShakeTime = Math.max(this.screenShakeTime, intensity);
    this.shakeIntensity = intensity;
  }
  
  screenFlash(intensity) {
    this.screenFlashTime = Math.max(this.screenFlashTime, intensity);
  }
  
  damageFlash() {
    const flash = document.getElementById('damage-flash');
    flash.classList.add('active');
    setTimeout(() => flash.classList.remove('active'), 100);
  }
  
  addExplosion(x, y, radius, color, noSound = false) {
    // 播放爆炸音效（可选）
    const size = radius > 200 ? 'boss' : (radius > 60 ? 'medium' : 'small');
    if(!noSound) AudioMgr.explosion(size);
    
    for(let i = 0; i < Math.floor(radius / 2); i++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(80, 250);
      this.particles.push(new Particle(x, y, Math.cos(a) * s, Math.sin(a) * s, color, rand(0.2, 0.4), rand(3, 6), 'circle'));
    }
    for(let i = 0; i < 2; i++) {
      this.particles.push(new Particle(x, y, 0, 0, color, rand(0.15, 0.25), radius, 'ring'));
    }
  }
  
  addEnemyFragments(x, y, size, color, isElite) {
    const count = 3 + Math.floor(Math.random() * 3);
    for(let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2);
      const dist = rand(15, size + 10);
      const fragX = x + Math.cos(a) * dist;
      const fragY = y + Math.sin(a) * dist;
      const spd = rand(50, 150);
      const fragColor = isElite ? '#ff0066' : color;
      const frag = new Fragment(fragX, fragY, Math.cos(a) * spd, Math.sin(a) * spd, fragColor, rand(0.3, 0.5), rand(4, 8), Math.atan2(Math.sin(a), Math.cos(a)));
      this.particles.push(frag);
    }
    for(let i = 0; i < 3; i++) {
      const a = rand(0, Math.PI * 2);
      this.particles.push(new Particle(x, y, Math.cos(a) * rand(30, 80), Math.sin(a) * rand(30, 80), color, rand(0.15, 0.3), rand(2, 4), 'circle'));
    }
  }
  
  addMuzzleFlash(x, y, angle) {
  }
  
  findNearestEnemy(x, y, maxDist) {
    let best = null, bestD = maxDist;
    for(const e of this.enemies) {
      if(!e.alive) continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if(d < bestD) { best = e; bestD = d; }
    }
    if(this.boss && this.boss.alive) {
      const d = Math.hypot(this.boss.x - x, this.boss.y - y);
      if(d < bestD) { best = this.boss; bestD = d; }
    }
    return best;
  }
  
  // 查找多个最近的敌人
  findNearestEnemies(x, y, maxDist, count) {
    const allEnemies = [];
    for(const e of this.enemies) {
      if(!e.alive) continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if(d < maxDist) allEnemies.push({ enemy: e, dist: d });
    }
    if(this.boss && this.boss.alive) {
      const d = Math.hypot(this.boss.x - x, this.boss.y - y);
      if(d < maxDist) allEnemies.push({ enemy: this.boss, dist: d });
    }
    allEnemies.sort((a, b) => a.dist - b.dist);
    return allEnemies.slice(0, count).map(e => e.enemy);
  }
  
  getEnemiesAlongLine(x1, y1, x2, y2, thickness) {
    const hits = [];
    const dx = x2 - x1, dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    const enemies = [...this.enemies];
    if(this.boss && this.boss.alive) enemies.push(this.boss);
    for(const e of enemies) {
      if(!e.alive) continue;
      const t = Math.max(0, Math.min(1, ((e.x - x1) * dx + (e.y - y1) * dy) / lenSq));
      const px = x1 + t * dx, py = y1 + t * dy;
      const d = Math.hypot(e.x - px, e.y - py);
      if(d < thickness + e.size) hits.push(e);
    }
    return hits;
  }
  
  spawnLaserRefract(b, hitEnemy) {
    const startX = hitEnemy.x;
    const startY = hitEnemy.y;
    const t = this.findNearestEnemy(startX, startY, 500);
    if(t && t !== hitEnemy) {
      const a = Math.atan2(t.y - startY, t.x - startX);
      const dmgMul = 0.7;
      const newDmg = b.damage * dmgMul;
      const newRefract = b.refractCount - 1;
      this.bullets.push(new Bullet(
        startX, startY, a, 1200, newDmg, 4, b.color,
        { isLaser: true, life: 1.5, refractCount: newRefract, pierce: 0 }
      ));
    }
  }
  
  spawnInstantLaserRefract(fromEnemy, dmg, refractLeft, processedSet) {
    if(refractLeft <= 0) return;
    const startX = fromEnemy.x, startY = fromEnemy.y;
    const t = this.findNearestEnemy(startX, startY, 500);
    if(t && t !== fromEnemy && !processedSet.has(t)) {
      processedSet.add(t);
      const a = Math.atan2(t.y - startY, t.x - startX);
      const endX = startX + Math.cos(a) * CONFIG.CANVAS.w;
      const endY = startY + Math.sin(a) * CONFIG.CANVAS.h;
      const dmgMul = 0.7;
      const newDmg = dmg * dmgMul;
      this.bullets.push(new Bullet(
        startX, startY, a, 0, newDmg, 4, '#ff2e88',
        { isLaser: true, instant: true, life: 0.3, beamEndX: endX, beamEndY: endY, refractCount: refractLeft - 1, pierce: 0 }
      ));
      const hits = this.getEnemiesAlongLine(startX, startY, endX, endY, 20);
      for(const e of hits) {
        if(processedSet.has(e)) continue;
        processedSet.add(e);
        e.takeDamage(newDmg, this);
        if(refractLeft - 1 > 0) {
          this.spawnInstantLaserRefract(e, newDmg, refractLeft - 1, processedSet);
        }
      }
    }
  }
  
  setupMenu() {
    document.querySelectorAll('.mode-card').forEach(card => {
      const mode = card.dataset.mode;
      card.addEventListener('click', () => {
        CONFIG.MODE = mode;
        this.startGame(mode);
      });
      card.addEventListener('mouseenter', () => {
        const descs = {
          story: '剧情模式：20 关通关，3 武器槽，体验完整故事线',
          endless: '无尽模式：无限关卡，无武器上限，追求最高关卡',
          creative: '创造模式：自由搭配武器 + 强化，连续战斗'
        };
        document.getElementById('mode-desc').textContent = descs[mode];
      });
    });
    
    document.getElementById('how-to-play').addEventListener('click', () => {
      document.getElementById('howto-overlay').classList.remove('hidden');
    });
    document.getElementById('howto-close').addEventListener('click', () => {
      document.getElementById('howto-overlay').classList.add('hidden');
    });
    
    // 隐藏设置：输入 7896321 解锁
    const secretInput = document.getElementById('secret-input');
    const secretPanel = document.getElementById('secret-panel');
    const invincibleToggle = document.getElementById('secret-invincible');
    const tryUnlock = () => {
      if(secretInput.value.trim() === '7896321') {
        secretPanel.classList.remove('hidden');
        // 回显当前无敌状态（游戏级）
        invincibleToggle.checked = !!this.invincible;
      } else {
        secretPanel.classList.add('hidden');
      }
    };
    secretInput.addEventListener('keydown', e => { if(e.key === 'Enter') tryUnlock(); });
    document.getElementById('secret-submit').addEventListener('click', tryUnlock);
    // 无敌开关（游戏级，所有模式生效）
    if(invincibleToggle) {
      invincibleToggle.addEventListener('change', () => {
        this.invincible = invincibleToggle.checked;
        if(this.player) this.player.invincible = invincibleToggle.checked;
      });
    }
    
    document.getElementById('score-btn').addEventListener('click', () => {
      this.renderRecentScores();
      document.getElementById('score-overlay').classList.remove('hidden');
    });
    document.getElementById('score-close').addEventListener('click', () => {
      document.getElementById('score-overlay').classList.add('hidden');
    });
    
    // 图鉴
    document.getElementById('codex-btn').addEventListener('click', () => openCodex('weapon'));
    document.getElementById('codex-close').addEventListener('click', () => closeCodex());
    document.querySelectorAll('.codex-tab').forEach(b => b.addEventListener('click', () => changeCodexTab(b.dataset.tab)));
    
    // 初始化音频设置 - 从localStorage读取
    const savedMusicMuted = localStorage.getItem('tank_music_muted') === '1';
    const savedSfxMuted = localStorage.getItem('tank_sfx_muted') === '1';
    AudioMgr.setMusicMuted(savedMusicMuted);
    AudioMgr.setSfxMuted(savedSfxMuted);
    
    // 统一的音乐开关处理
    const setupMusicToggle = (toggleId) => {
      const toggle = document.getElementById(toggleId);
      if(!toggle) return;
      toggle.addEventListener('change', (e) => {
        const muted = !e.target.checked;
        AudioMgr.setMusicMuted(muted);
        localStorage.setItem('tank_music_muted', muted ? '1' : '0');
        // 同步所有音乐开关
        document.querySelectorAll('[data-music-toggle]').forEach(el => {
          if(el !== toggle) el.checked = !muted;
        });
        // 处理BGM
        if(muted) {
          AudioMgr.stopBGM();
        } else {
          // 根据当前状态决定播放哪种BGM
          const s = this.state;
          if(s === 'playing' || s === 'paused' || s === 'creative_playing') {
            const bgmMode = CONFIG.MODE === 'endless' ? 'endless' : 
                           CONFIG.MODE === 'creative' ? 'creative' : 'normal';
            AudioMgr.startBGM(bgmMode);
          } else if(s === 'menu') {
            AudioMgr.startBGM('menu');
          } else if(s === 'upgrade_1' || s === 'upgrade_2' || s === 'weapon_unlock') {
            const bgmMode = CONFIG.MODE === 'endless' ? 'endless' : 
                           CONFIG.MODE === 'creative' ? 'creative' : 'normal';
            AudioMgr.startBGM(bgmMode);
          }
        }
      });
      toggle.checked = !savedMusicMuted;
    };
    
    // 统一的音效开关处理
    const setupSfxToggle = (toggleId) => {
      const toggle = document.getElementById(toggleId);
      if(!toggle) return;
      toggle.addEventListener('change', (e) => {
        const muted = !e.target.checked;
        AudioMgr.setSfxMuted(muted);
        localStorage.setItem('tank_sfx_muted', muted ? '1' : '0');
        // 同步所有音效开关
        document.querySelectorAll('[data-sfx-toggle]').forEach(el => {
          if(el !== toggle) el.checked = !muted;
        });
      });
      toggle.checked = !savedSfxMuted;
    };
    
    // 绑定暂停菜单的开关
    setupMusicToggle('pause-music-toggle');
    setupSfxToggle('pause-sfx-toggle');
    // 绑定设置界面的开关
    setupMusicToggle('settings-music-toggle');
    setupSfxToggle('settings-sfx-toggle');
    
    const settingsBtn = document.getElementById('settings-btn');
    if(settingsBtn) {
      settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        // 设置按钮效果同ESC键 - 暂停游戏
        if(this.state === 'playing' || this.state === 'creative_playing') {
          this.pauseGame();
        } else if(this.state === 'paused') {
          this.resumeGame();
        }
      });
    }
    
    // 注意: settings-overlay 已弃用，使用 pause-overlay 作为唯一的设置界面
    // settings-close 和 return-menu-btn 不再绑定，因为它们属于 settings-overlay
    
    const creativeExitBtn = document.getElementById('creative-exit');
    if(creativeExitBtn) {
      creativeExitBtn.addEventListener('click', () => {
        this.exitToMenu();
      });
    }
    
    const nextBtn = document.getElementById('creative-next');
    if(nextBtn) {
      nextBtn.addEventListener('click', () => {
        this.creativeGoNext();
      });
    }
    
    // 拾取范围滑块 - 暂停菜单中
    const pausePickupSlider = document.getElementById('pause-pickup-range-slider');
    if(pausePickupSlider) {
      pausePickupSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        const valDisplay = document.getElementById('pause-pickup-range-value');
        if(valDisplay) valDisplay.textContent = val.toFixed(1) + 'x';
        if(this.player) {
          this.player.pickupRangeMul = val;
        }
      });
    }
    
    // 重新开始按钮
    const restartBtn = document.getElementById('pause-restart-btn');
    if(restartBtn) {
      restartBtn.addEventListener('click', () => {
        document.getElementById('pause-overlay').classList.add('hidden');
        this.startGame(CONFIG.MODE);
      });
    }
    
    // 设置界面按钮
    const settingsCloseBtn = document.getElementById('settings-close');
    if(settingsCloseBtn) {
      settingsCloseBtn.addEventListener('click', () => {
        document.getElementById('settings-overlay').classList.add('hidden');
        if(this.state === 'paused') {
          this.resumeGame();
        }
      });
    }
    const returnMenuBtn = document.getElementById('return-menu-btn');
    if(returnMenuBtn) {
      returnMenuBtn.addEventListener('click', () => {
        document.getElementById('settings-overlay').classList.add('hidden');
        this.exitToMenu();
      });
    }
  }
  
  exitToMenu() {
    this.state = 'menu';
    const mainMenu = document.getElementById('main-menu');
    mainMenu.classList.add('active');
    mainMenu.classList.remove('hidden');
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('creative-setup').classList.add('hidden');
    document.getElementById('upgrade-overlay').classList.add('hidden');
    document.getElementById('weapon-overlay').classList.add('hidden');
    document.getElementById('pause-overlay').classList.add('hidden');
    document.getElementById('game-over-overlay').classList.add('hidden');
    document.getElementById('victory-overlay').classList.add('hidden');
    document.getElementById('settings-overlay').classList.add('hidden');
    // 播放主菜单BGM
    AudioMgr.stopBGM();
    if(!AudioMgr.musicMuted) {
      AudioMgr.startBGM('menu');
    }
    this.bullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.boss = null;
    this.drones = [];
    this.mines = [];
    this.particles = [];
    this.floatingTexts = [];
    this.pickups = [];
  }
  openSettings() {
    const list = document.getElementById('selected-upgrades-list');
    list.innerHTML = '';
    const upgrades = this.player.upgrades || [];
    const allUpgrades = [];
    
    for(const [key, val] of Object.entries(this.player.wLevels || {})) {
      if(val && val > 0) {
        const w = WEAPONS[key];
        if(w) {
          allUpgrades.push({icon: w.icon, name: w.name, level: val});
        }
      }
    }
    for(const [key, val] of Object.entries(this.player.wLevels || {})) {
      if(val && val > 0 && UPGRADES[key]) {
        const u = UPGRADES[key];
        allUpgrades.push({icon: u.icon || '★', name: u.name || key, level: val});
      }
    }
    
    const seen = new Set();
    const playerUpgrades = this.player.chosenUpgrades || [];
    for(const up of playerUpgrades) {
      if(seen.has(up.id)) continue;
      seen.add(up.id);
      list.innerHTML += `<div class="selected-upgrade-item"><span class="su-icon">${up.icon || '★'}</span><span class="su-name">${up.name}</span><span class="su-level">Lv.${up.level || 1}</span></div>`;
    }
    
    if(list.children.length === 0) {
      list.innerHTML = '<div style="text-align:center;color:#667;padding:20px;">暂无强化卡</div>';
    }
    
    document.getElementById('settings-overlay').classList.remove('hidden');
    this.settingsOpen = true;
  }
  
  closeSettings() {
    document.getElementById('settings-overlay').classList.add('hidden');
    this.settingsOpen = false;
  }
  
  saveScore(mode, score, level, wave, victory) {
    const history = JSON.parse(localStorage.getItem('tank_score_history') || '[]');
    const entry = {
      mode: mode,
      score: score,
      level: level,
      wave: wave,
      victory: victory,
      date: new Date().toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    };
    history.unshift(entry);
    if(history.length > 5) history.length = 5;
    localStorage.setItem('tank_score_history', JSON.stringify(history));
  }
  
  renderRecentScores() {
    const container = document.getElementById('recent-scores');
    if(!container) return;
    const history = JSON.parse(localStorage.getItem('tank_score_history') || '[]');
    if(history.length === 0) {
      container.innerHTML = '<span class="score-empty">暂无记录</span>';
      return;
    }
    const modeNames = { story: '剧情', endless: '无尽', creative: '创造' };
    container.innerHTML = history.map(entry => {
      const info = entry.mode === 'creative' 
        ? `波次:${entry.wave}` 
        : `关卡:${entry.level}${entry.victory ? ' 🏆' : ''}`;
      return `
        <div class="score-item">
          <span class="score-mode">${modeNames[entry.mode] || entry.mode}</span>
          <span class="score-value">${entry.score}</span>
          <span class="score-info">${info}</span>
        </div>
      `;
    }).join('');
  }
  
  startGame(mode) {
    // 确保音频上下文已激活（浏览器自动播放策略）
    AudioMgr.resume();
    
    CONFIG.MODE = mode;
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    
    this.player = new Player(CONFIG.CANVAS.w / 2, CONFIG.CANVAS.h / 2);
    this.player.invincible = this.invincible;
    this.bullets = []; this.enemyBullets = []; this.enemies = [];
    this.boss = null; this.drones = []; this.mines = [];
    this.particles = []; this.floatingTexts = []; this.pickups = [];
    
    this.level = 1;
    this.killCount = 0;
    this.levelComplete = false;
    this.bossDefeated = false;
    this.hasNuke = false;
    this.synergiesActive = [];
    this.blockPlan = {}; // 每个Boss前4关：随机抽1关怪物潮、1关防守
    
    if(mode === 'creative') {
      this.startCreativeSetup();
    } else {
      this.initLevel();
    }
  }
  
  startCreativeSetup() {
    this.state = 'creative_setup';
    document.getElementById('creative-setup').classList.remove('hidden');
    document.getElementById('creative-step1').classList.remove('hidden');
    document.getElementById('creative-step2').classList.add('hidden');
    
    // 初始化选择状态
    this._creativeMainWeapon = null;
    this._creativeSubWeapons = [];
    this.creativeUpgradeIndex = 0;
    
    // 可选武器池（排除独立武器）
    const availableWeapons = Object.values(WEAPONS).filter(w => 
      w.id !== 'DRONE' && w.id !== 'MINE' && w.type !== 'independent'
    );
    
    // 主炮选择池（所有可选武器都可以作为主炮）
    const mainPool = document.getElementById('main-weapon-pool');
    mainPool.innerHTML = '';
    for(const w of availableWeapons) {
      const opt = document.createElement('div');
      opt.className = 'weapon-option';
      opt.dataset.weaponId = w.id;
      opt.innerHTML = `<span class="w-icon">${w.icon}</span><span class="w-name">${w.name}</span>`;
      opt.addEventListener('click', () => {
        this._creativeMainWeapon = this._creativeMainWeapon === w.id ? null : w.id;
        this.updateCreativeSelection();
      });
      mainPool.appendChild(opt);
    }
    
    // 副武器选择池（与主炮相同但选择逻辑不同）
    const subPool = document.getElementById('sub-weapon-pool');
    subPool.innerHTML = '';
    for(const w of availableWeapons) {
      const opt = document.createElement('div');
      opt.className = 'weapon-option';
      opt.dataset.weaponId = w.id;
      opt.innerHTML = `<span class="w-icon">${w.icon}</span><span class="w-name">${w.name}</span>`;
      opt.addEventListener('click', () => {
        const idx = this._creativeSubWeapons.indexOf(w.id);
        if(idx >= 0) {
          this._creativeSubWeapons.splice(idx, 1);
        } else if(this._creativeSubWeapons.length < 2) {
          this._creativeSubWeapons.push(w.id);
        }
        this.updateCreativeSelection();
      });
      subPool.appendChild(opt);
    }
    
    this.updateCreativeSelection();
  }
  
  updateCreativeSelection() {
    // 更新主炮选择显示
    document.querySelectorAll('#main-weapon-pool .weapon-option').forEach(opt => {
      opt.classList.toggle('selected', this._creativeMainWeapon === opt.dataset.weaponId);
    });
    const mainSel = document.getElementById('selected-main');
    if(this._creativeMainWeapon) {
      const w = WEAPONS[this._creativeMainWeapon];
      mainSel.innerHTML = `<span style="font-size:24px;">${w.icon}</span> <span style="color:${w.color}">${w.name}</span> ◀ 手动发射`;
    } else {
      mainSel.textContent = '未选择';
    }
    
    // 更新副武器选择显示
    document.querySelectorAll('#sub-weapon-pool .weapon-option').forEach(opt => {
      opt.classList.toggle('selected', this._creativeSubWeapons.includes(opt.dataset.weaponId));
    });
    const subSel = document.getElementById('selected-subs');
    if(this._creativeSubWeapons.length > 0) {
      subSel.innerHTML = this._creativeSubWeapons.map(id => {
        const w = WEAPONS[id];
        return `<span style="font-size:24px;">${w.icon}</span> <span style="color:${w.color}">${w.name}</span>`;
      }).join('') + (this._creativeSubWeapons.length < 2 ? ` <span style="color:#aaa;font-size:12px;">(可继续选择，最多2把)</span>` : '');
    } else {
      subSel.innerHTML = '<span style="color:#556;font-size:12px;">可选最多2把副武器</span>';
    }
    
    // 检查是否可以进入下一步
    const canProceed = this._creativeMainWeapon && this._creativeSubWeapons.length <= 2;
    const nextBtn = document.getElementById('creative-next');
    nextBtn.classList.toggle('hidden', !canProceed);
    
    // 更新副武器计数提示
    const hint = document.getElementById('sub-count-hint');
    if(hint) {
      const remaining = 2 - this._creativeSubWeapons.length;
      hint.textContent = remaining > 0 ? `(还差${remaining}把)` : '';
    }
  }
  
  creativeGoNext() {
    if(!this._creativeMainWeapon || this._creativeSubWeapons.length > 2) return;
    document.getElementById('creative-step1').classList.add('hidden');
    document.getElementById('creative-step2').classList.remove('hidden');
    this.creativeUpgradeIndex = 0;
    const progressEl = document.getElementById('upgrade-progress');
    if(progressEl) progressEl.textContent = '0';
    const battleCountEl = document.getElementById('battle-upgrade-count');
    if(battleCountEl) battleCountEl.textContent = '0';
    const startBtn = document.getElementById('start-creative');
    if(startBtn) startBtn.classList.remove('hidden');
    this.renderCreativeUpgradeGroups();
  }
  
  renderCreativeUpgradeGroups() {
    const container = document.getElementById('creative-upgrade-groups');
    container.innerHTML = '';
    document.getElementById('upgrade-progress').textContent = this.creativeUpgradeIndex;
    
    // 合并主炮和副武器列表
    const selectedWeapons = [];
    if(this._creativeMainWeapon) selectedWeapons.push(this._creativeMainWeapon);
    if(this._creativeSubWeapons) selectedWeapons.push(...this._creativeSubWeapons);
    
    // 统计每种武器占用的槽位数（主炮/副武器同名时 > 1），用于独立计算各槽位强化卡次数
    const weaponSlotCounts = {};
    for(const wid of selectedWeapons) {
      weaponSlotCounts[wid] = (weaponSlotCounts[wid] || 0) + 1;
    }
    
    const takenCounts = {};
    if(this.player) {
      Object.assign(takenCounts, this.player.upgradeTakenCounts);
    }
    
    const weaponGroups = {};
    const independentGroup = { weapons: [], upgrades: [] };
    const passiveGroup = { weapons: ['PASSIVE'], upgrades: [] };
    const attrGroup = { weapons: ['ATTR'], upgrades: [] };
    
    for(const u of ALL_UPGRADES) {
      const taken = takenCounts[u.id] || 0;
      const maxLv = u.maxLevel || 99;
      
      if(u.cat === 'weapon') {
        if(!selectedWeapons.includes(u.weapon) && !['DRONE', 'MINE'].includes(u.weapon)) continue;
        if(!weaponGroups[u.weapon]) {
          weaponGroups[u.weapon] = { weapon: WEAPONS[u.weapon], upgrades: [] };
        }
        weaponGroups[u.weapon].upgrades.push(u);
      } else if(u.cat === 'independent') {
        // 创造模式中无人机/地雷已直接可用，跳过解锁卡，避免多余解锁组
        continue;
      } else if(u.cat === 'passive') {
        passiveGroup.upgrades.push(u);
      } else if(u.cat === 'attr') {
        attrGroup.upgrades.push(u);
      } else if(u.cat === 'synergy') {
        const key = u.id.replace('synergy_', '');
        const synergyKeyMap = {
          'drone_laser': ['DRONE', 'LASER'],
          'flame_poison': ['FLAMETHROWER', 'POISON'],
          'lightning_laser': ['LIGHTNING', 'LASER'],
          'chain': ['LIGHTNING', 'DRONE'],
          'flame_mine': ['FLAMETHROWER', 'MINE'],
          'missile_drone': ['MISSILE', 'DRONE'],
          'shotgun_drone': ['SHOTGUN', 'DRONE'],
          'poison_mine': ['POISON', 'MINE'],
          'plasma_poison': ['PLASMA', 'POISON']
        };
        const wps = synergyKeyMap[key];
        // 无人机/地雷视为始终可选：其强化卡无条件展示，可通过强化卡解锁
        if(wps && wps.every(w => selectedWeapons.includes(w) || w === 'DRONE' || w === 'MINE')) {
          if(!weaponGroups['SYNERGY']) {
            weaponGroups['SYNERGY'] = { weapon: { id: 'SYNERGY', name: '联动效果', icon: '🔗', color: '#ff6600' }, upgrades: [] };
          }
          weaponGroups['SYNERGY'].upgrades.push(u);
        }
      }
    }
    
    const order = [...new Set(selectedWeapons)];
    for(const id of ['DRONE', 'MINE']) {
      if(weaponGroups[id] && !order.includes(id)) order.push(id);
    }
    order.push('SYNERGY', 'PASSIVE', 'ATTR', 'INDEPENDENT');
    for(const key of order) {
      if(key === 'SYNERGY' && weaponGroups['SYNERGY']) {
        this.addUpgradeGroup(container, weaponGroups['SYNERGY'].weapon, weaponGroups['SYNERGY'].upgrades, takenCounts);
      } else if(key === 'PASSIVE' && passiveGroup.upgrades.length > 0) {
        this.addUpgradeGroup(container, { id: 'PASSIVE', name: '被动效果', icon: '✨', color: '#ffaa00' }, passiveGroup.upgrades, takenCounts);
      } else if(key === 'ATTR' && attrGroup.upgrades.length > 0) {
        this.addUpgradeGroup(container, { id: 'ATTR', name: '属性强化', icon: '📊', color: '#00ff88' }, attrGroup.upgrades, takenCounts);
      } else if(key === 'INDEPENDENT' && independentGroup.upgrades.length > 0) {
        const names = independentGroup.weapons.map(id => WEAPONS[id].icon + WEAPONS[id].name).join(' / ');
        this.addUpgradeGroup(container, { id: 'INDEPENDENT', name: '独立武器: ' + names, icon: '🛩', color: '#aaccff' }, independentGroup.upgrades, takenCounts);
      } else if(weaponGroups[key]) {
        this.addUpgradeGroup(container, weaponGroups[key].weapon, weaponGroups[key].upgrades, takenCounts, weaponSlotCounts[key] || 1);
      }
    }
  }
  
  addUpgradeGroup(container, weaponInfo, upgrades, takenCounts, slotCount = 1) {
    const group = document.createElement('div');
    group.className = 'upgrade-group';
    const title = document.createElement('div');
    title.className = 'upgrade-group-title';
    title.innerHTML = `<span class="weapon-icon">${weaponInfo.icon}</span>${weaponInfo.name}`;
    group.appendChild(title);
    
    const cardsDiv = document.createElement('div');
    cardsDiv.className = 'upgrade-group-cards';
    
    for(const u of upgrades) {
      const taken = takenCounts[u.id] || 0;
      // 主炮/副武器同名的强化卡：每个槽位可独立选择，总上限 = 单槽上限 × 槽位数
      const baseMax = u.maxLevel || 99;
      const maxLv = Math.min(99, baseMax * slotCount);
      const el = document.createElement('div');
      el.className = 'creative-card';
      const maxed = taken >= maxLv;
      const overLimit = this.creativeUpgradeIndex >= CONFIG.CREATIVE_MAX_UPGRADES;
      el.innerHTML = `<div class="cc-icon">${this.getCardIcon(u)}</div>
        <div class="cc-info">
          <div class="cc-name">${u.name}</div>
          <div class="cc-desc">${u.desc}</div>
        </div>
        ${baseMax < 99 ? `<div class="cc-count">${taken}/${maxLv}</div>` : ''}`;
      if(maxed || overLimit) {
        el.classList.add('disabled');
        el.style.opacity = '0.4';
      } else {
        el.addEventListener('click', () => {
          if(!this.player) this.initPlayerForCreative();
          if(taken >= maxLv) return;
          if(this.creativeUpgradeIndex >= CONFIG.CREATIVE_MAX_UPGRADES) return;
          u.apply(this.player);
          // 独立武器卡联动解锁：确保所选的地雷/无人机能实际使用
          if(u.weapon === 'MINE') this.player.mineUnlocked = true;
          if(u.weapon === 'DRONE') this.player.droneUnlocked = true;
          this.player.upgradeTakenCounts[u.id] = taken + 1;
          this.creativeUpgradeIndex++;
          takenCounts[u.id] = taken + 1;
          // 更新进度显示
          document.getElementById('upgrade-progress').textContent = this.creativeUpgradeIndex;
          const battleCountEl = document.getElementById('battle-upgrade-count');
          if(battleCountEl) battleCountEl.textContent = this.creativeUpgradeIndex;
          this.renderCreativeUpgradeGroups();
          this.updateSynergies();
          this.updateHUD();
        });
      }
      cardsDiv.appendChild(el);
    }
    group.appendChild(cardsDiv);
    container.appendChild(group);
  }
  
  initPlayerForCreative() {
    if(this.player) return;
    this.player = new Player(CONFIG.CANVAS.w / 2, CONFIG.CANVAS.h / 2);
    this.player.invincible = this.invincible;
    // 使用创造模式选择的武器
    if(this._creativeMainWeapon) {
      this.player.mainWeapon = this._creativeMainWeapon;
    }
    if(this._creativeSubWeapons) {
      for(const wid of this._creativeSubWeapons) {
        if(WEAPONS[wid] && WEAPONS[wid].type === 'sub') {
          this.player.subWeapons.push(wid);
        }
      }
    }
  }
  
  showUpgradeCards(containerId, onSelect) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    const available = this.getAvailableUpgrades();
    const cards = [];
    while(cards.length < 3 && available.length > 0) {
      const idx = Math.floor(Math.random() * available.length);
      cards.push(available.splice(idx, 1)[0]);
    }
    if(cards.length === 0) {
      cards.push({id:'skip', name:'属性', desc:'生命值+1', apply: p => {p.hp = Math.min(p.maxHp, p.hp + 1);}});
      cards.push({id:'skip2', name:'护盾', desc:'护盾+1', apply: p => {p.shield++;}});
      cards.push({id:'skip3', name:'分数', desc:'分数+100', apply: p => {p.score += 100;}});
    }
    cards.forEach(card => {
      const el = document.createElement('div');
      el.className = 'upgrade-card' + (card.cat === 'weapon' ? ' weapon-card' : '');
      el.innerHTML = `<div class="card-icon">${this.getCardIcon(card)}</div>
        <div class="card-name">${card.name}</div>
        <div class="card-desc">${card.desc}</div>`;
      el.addEventListener('click', () => {
        card.apply(this.player);
        if(card.id && card.id !== 'skip' && card.id !== 'skip2' && card.id !== 'skip3') {
          this.player.upgradeTakenCounts[card.id] = (this.player.upgradeTakenCounts[card.id] || 0) + 1;
        }
        this.updateSynergies();
        this.updateHUD();
        onSelect();
      });
      container.appendChild(el);
    });
  }
  
  getCardIcon(card) {
    if(card.cat === 'weapon' || card.cat === 'independent') {
      const w = WEAPONS[card.weapon || card.id.replace('_unlock','').toUpperCase()];
      return w ? w.icon : '⚙';
    }
    if(card.cat === 'attr') return '📊';
    if(card.cat === 'passive') return '✨';
    if(card.cat === 'synergy') return '🔗';
    return '⚙';
  }
  
  getAvailableUpgrades() {
    const available = [];
    const takenCounts = this.player.upgradeTakenCounts || {};
    const allUnlockedWeapons = [this.player.mainWeapon, ...this.player.subWeapons, ...this.player.independentWeapons].filter(Boolean);
    
    for(const u of ALL_UPGRADES) {
      const taken = takenCounts[u.id] || 0;
      const maxLv = u.maxLevel || 99;
      if(taken >= maxLv) continue;
      
      if(u.cat === 'weapon') {
        const w = u.weapon;
        if(w === 'CANNON' || allUnlockedWeapons.includes(w)) {
          available.push(u);
        }
      } else if(u.cat === 'independent') {
        const wid = u.id.replace('_unlock', '').toUpperCase();
        if(!this.player.independentWeapons.includes(wid)) {
          available.push(u);
        }
      } else if(u.cat === 'synergy') {
        const key = u.id.replace('synergy_', '');
        const synergyKeyMap = {
          'drone_laser': 'DRONE+LASER',
          'flame_poison': 'FLAMETHROWER+POISON',
          'lightning_laser': 'LIGHTNING+LASER',
          'chain': 'LIGHTNING+DRONE',
          'flame_mine': 'FLAMETHROWER+MINE',
          'missile_drone': 'MISSILE+DRONE',
          'shotgun_drone': 'SHOTGUN+DRONE',
          'poison_mine': 'POISON+MINE',
          'plasma_poison': 'PLASMA+POISON'
        };
        const synergyKey = synergyKeyMap[key];
        if(synergyKey) {
          const [w1, w2] = synergyKey.split('+');
          if(allUnlockedWeapons.includes(w1) && allUnlockedWeapons.includes(w2)) {
            available.push(u);
          }
        }
      } else {
        available.push(u);
      }
    }
    return available;
  }
  
  activeSynergyKey(key) {
    if(!this.synergyKeys || !this.synergyKeys.includes(key)) return false;
    const p = this.player;
    // 各联动需通过选取对应强化卡解锁
    if(!p || !p.synergyUnlocks || !p.synergyUnlocks[key]) return false;
    return true;
  }

  // 联动数值：返回基础联动效果 × 联动强化卡倍率（需已解锁）
  synergyMul(key) {
    if(!this.activeSynergyKey(key)) return 1;
    let m = 1;
    const base = SYNERGY[key];
    if(base && base.dmgMul) m *= base.dmgMul;
    if(this.player && this.player.synergyBonus && this.player.synergyBonus[key]) {
      m *= this.player.synergyBonus[key];
    }
    return m;
  }

  updateSynergies() {
    this.synergyKeys = [];
    this.synergiesActive = [];
    const allW = [this.player.mainWeapon, ...this.player.subWeapons, ...this.player.independentWeapons].filter(Boolean);
    for(const key of Object.keys(SYNERGY)) {
      const [w1, w2] = key.split('+');
      if(allW.includes(w1) && allW.includes(w2)) {
        this.synergyKeys.push(key);
        // HUD 只展示已通过强化卡解锁的联动
        if(this.player.synergyUnlocks && this.player.synergyUnlocks[key]) {
          this.synergiesActive.push(SYNERGY[key].desc);
        }
      }
    }
  }
  
  initLevel() {
    this.state = 'playing';
    this.bullets = []; this.enemyBullets = []; this.enemies = [];
    this.boss = null; this.drones = []; this.mines = [];
    this.particles = []; this.floatingTexts = [];
    // 每关的掉落物和拾取物不再清除，跨关卡持续存在
    this.killCount = 0;
    this.levelComplete = false;
    this.bossDefeated = false;
    this.enemiesSpawned = 0; // 本关已生成的敌人数量
    
    const isBossLevel = this.level % 5 === 0;
    
    // 关卡分类计划：第5关后每个Boss前的4关普通关中，随机抽1关为怪物潮、1关为防守
    this.isHoard = false;
    this.isDefense = false;
    this.base = null;
    this.defenseTime = 0;
    this.defenseDuration = 0;
    if(CONFIG.MODE === 'story' && !isBossLevel && this.level >= 6 && this.level <= 19) {
      const tier = Math.floor((this.level - 1) / 5); // 6-9→1, 11-14→2, 16-19→3
      if(!this.blockPlan[tier]) {
        const baseLv = tier * 5 + 1; // 6 / 11 / 16
        const candidates = [baseLv, baseLv + 1, baseLv + 2, baseLv + 3];
        for(let i = candidates.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
        }
        this.blockPlan[tier] = { hoard: candidates[0], defense: candidates[1], tier };
      }
      this.isHoard = this.blockPlan[tier].hoard === this.level;
      this.isDefense = this.blockPlan[tier].defense === this.level;
    }
    
    // 每关敌人总量上限
    if(this.isHoard) {
      // 怪物潮：总量大幅提高，营造"怪多"效果
      this.enemyLimit = 40;
    } else if(this.isDefense) {
      // 防守：计时期间持续刷怪
      this.enemyLimit = 60;
    } else {
      this.enemyLimit = isBossLevel ? 1 : CONFIG.ENEMY_SPAWN_MAX_BASE + this.level * 2;
    }
    this.killTarget = this.enemyLimit;
    
    this.spawnCooldown = 2;
    
    // 怪物潮：开局立即刷新20只怪物
    if(this.isHoard) {
      for(let i = 0; i < 20 && this.enemiesSpawned < this.enemyLimit; i++) {
        this.spawnEnemy();
        this.enemiesSpawned++;
      }
      this.floatingTexts.push(new FloatingText(CONFIG.CANVAS.w / 2, 120, '⚠ 怪物潮 ⚠', '#ff4444', 28));
    }
    
    // 防守：初始化中央基地（3级基地逐步高级）
    if(this.isDefense) {
      const tier = this.blockPlan[Math.floor((this.level - 1) / 5)].tier;
      const baseHp = 120 + tier * 80; // 基地血量随层级提高
      this.base = { x: CONFIG.CANVAS.w / 2, y: CONFIG.CANVAS.h - 120, hp: baseHp, maxHp: baseHp, tier, alive: true };
      this.defenseDuration = 30 + (tier - 1) * 15; // 30s / 45s / 60s
      this.floatingTexts.push(new FloatingText(CONFIG.CANVAS.w / 2, 120, '⚠ 防守基地 ⚠', '#ffcc00', 28));
    }
    
    // 根据模式启动BGM
    if(!isBossLevel) {
      const bgmMode = CONFIG.MODE === 'endless' ? 'endless' : 
                     CONFIG.MODE === 'creative' ? 'creative' : 'normal';
      AudioMgr.startBGM(bgmMode);
    }
    
    if(isBossLevel) {
      setTimeout(() => {
        this.boss = new Boss(CONFIG.CANVAS.w / 2, 150, this.level);
        this.floatingTexts.push(new FloatingText(CONFIG.CANVAS.w/2, 200, '⚠ BOSS ⚠', '#ff4444', 30));
        AudioMgr.bossAppear();
        AudioMgr.startBGM('boss');
      }, 1000);
    }
    
    this.initDrones();
    this.updateHUD();
  }
  
  initDrones() {
    this.drones = [];
    if(this.player.droneCount > 0 || this.player.droneUnlocked) {
      const count = Math.max(1, this.player.droneCount || 1);
      for(let i = 0; i < count; i++) {
        const d = new Drone(this.player.x, this.player.y, this.player, i, count);
        d.damage *= this.player.droneDmgMul;
        d.blockInterval = this.player.droneBlockInterval;
        this.drones.push(d);
      }
    }
  }
  
  startCreativeBattle() {
    this.state = 'creative_playing';
    document.getElementById('creative-setup').classList.add('hidden');
    this.wave = 1;
    this.waveTimer = 0;
    this.spawnTimer = 0;
    this.startTime = Date.now();
    this.hasNuke = false;
    
    // 确保玩家已初始化
    if(!this.player) {
      this.initPlayerForCreative();
    }
    
    // 设置从创造模式选择的武器
    this.player.mainWeapon = this._creativeMainWeapon || 'CANNON';
    this.player.subWeapons = [...this._creativeSubWeapons];
    this.player.independentWeapons = [];
    
    // 确保副武器有独立的发射计时器
    for(const sid of this.player.subWeapons) {
      if(!this.player.subFireTimers[sid]) {
        this.player.subFireTimers[sid] = 0;
      }
    }
    
    this.initDrones();
    this.updateSynergies();
    this.updateHUD();
    
    // 启动创造模式BGM
    AudioMgr.stopBGM();
    if(!AudioMgr.musicMuted) {
      AudioMgr.startBGM('creative');
    }
  }
  
  spawnEnemy() {
    if(this.boss && this.boss.alive) return;
    if(this.enemies.length >= (this.isHoard ? 25 : (CONFIG.MODE === 'endless' ? 15 : 10))) return;
    
    const types = ['scout', 'scout', 'bomber'];
    if(this.level >= 2) types.push('sniper');
    if(this.level >= 3) types.push('shotgun');
    if(this.level >= 4) types.push('heavy');
    
    const x = Math.random() < 0.5 ? rand(30, 100) : rand(CONFIG.CANVAS.w - 100, CONFIG.CANVAS.w - 30);
    const y = rand(30, CONFIG.CANVAS.h - 30);
    const type = pick(types);
    const e = new Enemy(x, y, type, this.level);
    // 怪物潮：怪物血量降为该关原有血量的1/3
    if(this.isHoard) {
      e.maxHp = Math.max(1, Math.ceil(e.maxHp / 3));
      e.hp = e.maxHp;
    }
    this.enemies.push(e);
  }
  
  creativeSpawnWave() {
    const cfg = CONFIG.CREATIVE;
    if(this.enemies.length < cfg.minOnField) {
      const count = cfg.baseSpawnCount + Math.floor(this.wave * 0.3);
      for(let i = 0; i < count; i++) {
        const x = Math.random() < 0.5 ? rand(30, 100) : rand(CONFIG.CANVAS.w - 100, CONFIG.CANVAS.w - 30);
        const y = rand(30, CONFIG.CANVAS.h - 30);
        const types = ['scout', 'bomber', 'sniper', 'shotgun', 'heavy'];
        const type = pick(types);
        const e = new Enemy(x, y, type, this.wave);
        e.maxHp = Math.ceil(e.maxHp * (1 + this.wave * cfg.waveHpGrowth));
        e.hp = e.maxHp;
        if(Math.random() < cfg.eliteBaseChance + this.wave * cfg.eliteChanceGrowth) {
          e.isElite = true;
          e.color = '#ff0066';
          e.maxHp *= 2; e.hp = e.maxHp;
          e.score *= 3;
        }
        this.enemies.push(e);
      }
      this.floatingTexts.push(new FloatingText(CONFIG.CANVAS.w/2, 100, 'WAVE ' + this.wave, '#00f0ff', 24));
      this.wave++;
    }
  }
  
  loop(time) {
    requestAnimationFrame(this.loop.bind(this));
    const dt = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;
    if(this.state === 'playing' || this.state === 'creative_playing') {
      this.update(dt);
    }
    this.draw();
    Input.update();
  }
  
  update(dt) {
    // 定期检查音频上下文状态，确保不会因浏览器策略丢失
    if(!this._audioCheckTimer) this._audioCheckTimer = 0;
    this._audioCheckTimer += dt;
    if(this._audioCheckTimer >= 1) {
      this._audioCheckTimer = 0;
      if(AudioMgr.ctx && AudioMgr.ctx.state === 'suspended') {
        AudioMgr.resume();
      }
    }
    
    this.updateGameTime(dt);
    
    if(this.state === 'playing') {
      this.updateStorySpawning(dt);
    } else if(this.state === 'creative_playing') {
      this.updateCreativeSpawning(dt);
    }
    
    this.player.update(dt, this);
    this.updateDrones(dt);
    for(const e of this.enemies) e.update(dt, this);
    if(this.boss && this.boss.alive) this.boss.update(dt, this);
    for(const m of this.mines) m.update(dt, this);
    for(const p of this.pickups) p.update(dt);
    
    for(const b of this.bullets) b.update(dt, this);
    for(const b of this.enemyBullets) b.update(dt, this);
    
    this.processCollisions();
    
    for(const b of this.bullets) b.update(dt, this);
    for(const b of this.enemyBullets) b.update(dt, this);
    
    for(const p of this.particles) p.update(dt);
    for(const t of this.floatingTexts) t.update(dt);
    
    this.cleanupDead();
    
    if(this.state === 'playing') {
      this.checkLevelComplete(dt);
    }
    
    this.updateHUD();
  }
  
  processCollisions() {
    // 根据子弹属性推断武器类型
    const getWeaponType = (b) => {
      if(b.weaponType) return b.weaponType;
      if(b.isLaser) return 'laser';
      if(b.isFlame) return 'flamethrower';
      if(b.isPoison) return 'poison';
      if(b.isLightning) return 'lightning';
      if(b.isPlasma) return 'plasma';
      if(b.explosionR > 30) return 'missile';
      if(b.color === '#ffd700') return 'shotgun';
      return 'cannon';
    };
    
    for(const b of this.bullets) {
      if(b.dead || b.isLightning || b.instant) continue;
      for(const e of this.enemies) {
        if(!e.alive) continue;
        if(b.hitEnemies.has(e)) continue;
        if(dist(b, e) < e.size + b.radius) {
          e.takeDamage(b.damage, this);
          // 时空缓流：等离子+任意武器 联动，命中附加减速
          if(b.slow > 0) e.applySlow(1 - b.slow, 1);
          b.hitEnemies.add(e);
          // 不对毒气触发通用击中音效（毒气单独处理）
          const wt = getWeaponType(b);
          if(wt !== 'poison') AudioMgr.hit(wt, b.explosionR > 0);
          
          // 子弹弹射逻辑 - 自动弹向距离最近的敌人
          if(b.bounceCount > 0 && !b.isLaser) {
            const speed = Math.hypot(b.vx, b.vy);
            // 找到距离最近的存活敌人
            let nearestEnemy = null;
            let nearestDist = Infinity;
            for(const e2 of this.enemies) {
              if(!e2.alive || e2 === e) continue;
              if(b.hitEnemies.has(e2)) continue;
              const d = dist(b, e2);
              if(d < nearestDist) {
                nearestDist = d;
                nearestEnemy = e2;
              }
            }
            // 同时检查BOSS
            if(this.boss && this.boss.alive && !b.hitEnemies.has(this.boss)) {
              const d = dist(b, this.boss);
              if(d < nearestDist) {
                nearestDist = d;
                nearestEnemy = this.boss;
              }
            }
            // 如果找到最近敌人，弹向它；否则随机反弹
            if(nearestEnemy) {
              const targetAngle = angle(b, nearestEnemy);
              b.vx = Math.cos(targetAngle) * speed;
              b.vy = Math.sin(targetAngle) * speed;
            } else {
              // 无目标时随机反弹
              const a = angle(e, b);
              const bounceAngle = a + rand(-0.5, 0.5);
              b.vx = Math.cos(bounceAngle) * speed;
              b.vy = Math.sin(bounceAngle) * speed;
            }
            b.bounceCount--;
            b.life = Math.min(b.life, 1.5);
            this.addExplosion(b.x, b.y, 10, b.color);
            break;
          }
          
          if(b.isLaser && b.refractCount > 0) {
            this.spawnLaserRefract(b, e);
            b.life = 0;
          } else if(b.explosionR > 0) {
            this.addExplosion(b.x, b.y, b.explosionR, b.color);
            for(const e2 of this.enemies) {
              if(!e2.alive || e2 === e) continue;
              if(dist(b, e2) < b.explosionR) {
                e2.takeDamage(b.damage * 0.6, this);
              }
            }
            if(this.boss && this.boss.alive && dist(b, this.boss) < b.explosionR) {
              this.boss.takeDamage(b.damage * 0.5, this);
            }
            b.life = 0;
          } else if(b.pierce > 0) {
            b.pierce--;
          } else {
            b.life = 0;
          }
          break;
        }
      }
      if(b.dead) continue;
      if(this.boss && this.boss.alive) {
        if(dist(b, this.boss) < this.boss.size + b.radius) {
          this.boss.takeDamage(b.damage, this);
          // 排除毒气
          const wt2 = getWeaponType(b);
          if(wt2 !== 'poison') AudioMgr.hit(wt2, b.explosionR > 0);
          
          // 子弹弹射对BOSS也生效 - 弹向最近敌人
          if(b.bounceCount > 0 && !b.isLaser) {
            const speed = Math.hypot(b.vx, b.vy);
            // 找最近敌人
            let nearestEnemy = null;
            let nearestDist = Infinity;
            for(const e2 of this.enemies) {
              if(!e2.alive) continue;
              if(b.hitEnemies.has(e2)) continue;
              const d = dist(b, e2);
              if(d < nearestDist) {
                nearestDist = d;
                nearestEnemy = e2;
              }
            }
            if(nearestEnemy) {
              const targetAngle = angle(b, nearestEnemy);
              b.vx = Math.cos(targetAngle) * speed;
              b.vy = Math.sin(targetAngle) * speed;
            } else {
              const a = angle(this.boss, b);
              const bounceAngle = a + rand(-0.5, 0.5);
              b.vx = Math.cos(bounceAngle) * speed;
              b.vy = Math.sin(bounceAngle) * speed;
            }
            b.bounceCount--;
            b.life = Math.min(b.life, 1.5);
            this.addExplosion(b.x, b.y, 10, b.color);
          } else if(b.isLaser && b.refractCount > 0) {
            this.spawnLaserRefract(b, this.boss);
            b.life = 0;
          } else if(b.explosionR > 0) {
            this.addExplosion(b.x, b.y, b.explosionR, b.color);
            if(!b.isLaser) b.life = 0;
          } else if(!b.isLaser) {
            b.life = 0;
          }
        }
      }
    }
    
    for(const b of this.bullets) {
      if(!b.dead && b.isLightning) {
        for(const e of this.enemies) {
          if(!e.alive) continue;
          if(dist(b, e) < e.size + 10) {
            e.takeDamage(b.damage, this);
            AudioMgr.hit('lightning', false);
            if(b.isLightning) b.life = 0;
          }
        }
        if(this.boss && this.boss.alive && dist(b, this.boss) < this.boss.size + 10) {
          this.boss.takeDamage(b.damage, this);
          AudioMgr.hit('lightning', false);
          if(b.isLightning) b.life = 0;
        }
      }
    }
    
    for(const b of this.enemyBullets) {
      if(b.dead) continue;
      // 瞬时激光束：按线段与玩家判定碰撞
      let hitPlayer = false;
      if(b.isLaser && b.instant) {
        const p = this.player;
        if(distToSegment(p.x, p.y, b.x, b.y, b.beamEndX, b.beamEndY) < p.size + Math.max(4, b.radius)) {
          hitPlayer = true;
        }
      } else if(dist(b, this.player) < this.player.size + b.radius) {
        hitPlayer = true;
      }
      if(hitPlayer) {
        this.player.takeDamage(b.damage, this);
        if(b.stun) {
          this.player.stunTimer = Math.max(this.player.stunTimer || 0, b.stun);
        }
        if(b.explosionR > 0) {
          this.addExplosion(b.x, b.y, b.explosionR, b.color);
        }
        b.life = 0;
      }
      // 防守关：敌人子弹击中基地造成双倍伤害
      const hasBase2 = this.base && this.base.alive;
      if(hasBase2 && !hitPlayer) {
        const bR = this.base.tier === 1 ? 30 : this.base.tier === 2 ? 38 : 46;
        let hitBase = false;
        if(b.isLaser && b.instant) {
          if(distToSegment(this.base.x, this.base.y, b.x, b.y, b.beamEndX, b.beamEndY) < bR + Math.max(4, b.radius)) hitBase = true;
        } else if(dist(b, this.base) < bR + b.radius) {
          hitBase = true;
        }
        if(hitBase) {
          this.base.hp -= b.damage * 2;
          this.addExplosion(b.x, b.y, 16, '#ff8800');
          if(this.base.hp <= 0) this.gameOver();
          b.life = 0;
          continue;
        }
      }
      for(const d of this.drones) {
        if(b.dead) break;
        if(d.canBlock(b)) {
          d.takeDamage(1);
          b.life = 0;
          this.addExplosion(b.x, b.y, 20, '#00f0ff');
        }
      }
    }
    
    for(const b of this.bullets) {
      if(b.dead) continue;
      if(b.isFlame) {
        for(const e of this.enemies) {
          if(!e.alive) continue;
          if(dist(b, e) < e.size + b.radius) {
            e.applyBurn(b.damage * 2, 1);
          }
        }
        if(this.boss && this.boss.alive && dist(b, this.boss) < this.boss.size + b.radius) {
          this.boss.takeDamage(b.damage * 0.5, this);
        }
      }
      if(b.isPoison && b.explosionR > 0) {
        for(const e of this.enemies) {
          if(!e.alive) continue;
          if(dist(b, e) < b.explosionR) {
            e.takeDamage(b.damage * 0.5, this);
            e.applySlow(0.5 * this.player.poisonSlowMul, 0.5);
            // 恢复毒气命中音效
            AudioMgr.hit('poison', true);
          }
        }
        b.life = 0;
      }
    }
  }
  
  cleanupDead() {
    this.bullets = this.bullets.filter(b => !b.dead);
    this.enemyBullets = this.enemyBullets.filter(b => !b.dead);
    this.enemies = this.enemies.filter(e => e.alive);
    const deadDrones = this.drones.filter(d => !d.alive);
    this.drones = this.drones.filter(d => d.alive);
    if(this.drones.length === 0 && (this.player.droneCount > 0 || this.player.droneUnlocked)) {
      if(!this.droneRespawnTimer) {
        this.droneRespawnTimer = 3;
      }
    } else {
      this.droneRespawnTimer = 0;
    }
    this.mines = this.mines.filter(m => m.alive);
    this.pickups = this.pickups.filter(p => p.alive);
    this.particles = this.particles.filter(p => !p.dead);
    this.floatingTexts = this.floatingTexts.filter(t => !t.dead);
  }
  
  updateDrones(dt) {
    if(this.droneRespawnTimer > 0) {
      this.droneRespawnTimer -= dt;
      if(this.droneRespawnTimer <= 0) {
        this.initDrones();
      }
    }
    for(const d of this.drones) d.update(dt, this);
  }
  
  updateGameTime(dt) {
    if(this.screenShakeTime > 0) {
      this.screenShakeTime -= dt;
      const c = document.getElementById('game-container');
      if(this.screenShakeTime > 0) {
        if(!c.classList.contains('shake')) c.classList.add('shake');
      } else {
        c.classList.remove('shake');
      }
    }
    if(Input.isDown('Escape')) {
      this.pauseGame();
    }
    
    // Main weapon switching via number keys - REMOVED (no longer supports weapon switching)
  }
  
  updateStorySpawning(dt) {
    const isBossLevel = this.level % 5 === 0;
    const minEnemies = 2; // 场上少于2只立刻刷下一波
    
    // Boss关卡不刷小怪
    if(isBossLevel) {
      return;
    }
    
    // 如果已经达到敌人总量上限，不再生成新敌人
    if(this.enemiesSpawned >= this.enemyLimit) {
      return;
    }
    
    // 怪物潮：刷新频率高、每次数量多，且随关卡增加
    if(this.isHoard) {
      // 场上少于2只时，立刻重置冷却时间，立刻刷
      if(this.enemies.length < minEnemies) {
        this.spawnCooldown = 0;
      } else {
        this.spawnCooldown -= dt;
      }
      if(this.spawnCooldown <= 0 && this.enemiesSpawned < this.enemyLimit) {
        const batch = 2 + Math.floor(this.level / 5); // 3~5 只/次
        const actual = Math.min(batch, this.enemyLimit - this.enemiesSpawned);
        for(let i = 0; i < actual; i++) {
          this.spawnEnemy();
          this.enemiesSpawned++;
        }
        // 刷新频率随关卡提高（间隔变短）
        this.spawnCooldown = Math.max(0.12, 0.6 - this.level * 0.02);
        this.waveTimer = 0;
      }
      return;
    }
    
    // 保证场上至少minEnemies只怪
    if(this.enemies.length < minEnemies) {
      while(this.enemies.length < minEnemies && this.enemiesSpawned < this.enemyLimit) {
        this.spawnEnemy();
        this.enemiesSpawned++;
      }
      return;
    }
    
    this.spawnCooldown -= dt;
    const lowEnemyCount = this.enemies.length < minEnemies;
    if(lowEnemyCount && this.waveTimer > 2) {
      this.spawnCooldown = 0;
    }
    if(this.spawnCooldown <= 0 && this.enemiesSpawned < this.enemyLimit) {
      this.spawnEnemy();
      this.enemiesSpawned++;
      const baseInt = 2.5;
      this.spawnCooldown = Math.max(0.5, baseInt * Math.pow(CONFIG.DIFFICULTY_PER_LEVEL.intervalMul, this.level - 1));
      this.waveTimer = 0;
    }
  }
  
  updateCreativeSpawning(dt) {
    const minEnemies = 3;
    // 保证场上至少3只怪
    if(this.enemies.length < minEnemies) {
      while(this.enemies.length < minEnemies) {
        this.spawnEnemy();
      }
      return;
    }
    
    this.waveTimer += dt;
    this.spawnTimer += dt;
    const lowEnemyCount = this.enemies.length < CONFIG.CREATIVE.minOnField;
    if(lowEnemyCount && this.waveTimer > 2) {
      this.spawnTimer = CONFIG.CREATIVE.spawnTimer;
    }
    if(this.spawnTimer >= CONFIG.CREATIVE.spawnTimer) {
      this.spawnTimer = 0;
      this.creativeSpawnWave();
      this.waveTimer = 0;
    }
  }
  
  checkLevelComplete(dt = 0) {
    // 防守关：计时结束后基地存活则通关，基地被摧毁则失败
    if(this.isDefense && this.base) {
      if(this.base.hp <= 0) {
        if(!this.levelComplete) { this.levelComplete = true; this.gameOver(); }
        return;
      }
      this.defenseTime += dt;
      if(this.defenseTime >= this.defenseDuration && !this.levelComplete) {
        this.levelComplete = true;
        setTimeout(() => this.showLevelComplete(), 500);
      }
      return;
    }
    const isBossLevel = this.level % 5 === 0;
    if(isBossLevel) {
      if(this.boss && !this.boss.alive && !this.levelComplete) {
        this.bossDefeated = true;
        this.levelComplete = true;
        setTimeout(() => this.showLevelComplete(), 1500);
      }
    } else {
      // 检查是否已经生成了所有敌人，并且场上没有敌人
      const allSpawned = this.enemiesSpawned >= this.enemyLimit;
      const allKilled = this.enemies.length === 0 && this.killCount >= this.killTarget;
      if(allSpawned && allKilled && !this.levelComplete) {
        this.levelComplete = true;
        setTimeout(() => this.showLevelComplete(), 500);
      }
    }
  }
  
  showLevelComplete() {
    // 剧情模式第20关(最终关)通关后不再3选1，直接进入胜利结算
    if(CONFIG.MODE === 'story' && this.level >= this.maxLevel) {
      this.victory();
      return;
    }
    this.state = 'upgrade_1';
    this.showUpgradeCards('upgrade-cards', () => {
      this.state = 'upgrade_2';
      document.getElementById('upgrade-round').textContent = '2';
      this.showUpgradeCards('upgrade-cards', () => {
        // 武器选择仅在偶数关卡后出现
        const showWeapon = this.level % 2 === 0 && this.player.subWeapons.length < this.player.maxSubWeapons;
        if(showWeapon) {
          this.showWeaponUnlock();
        } else {
          this.nextLevel();
        }
      });
    });
    document.getElementById('upgrade-round').textContent = '1';
    document.getElementById('upgrade-overlay').classList.remove('hidden');
  }
  
  showWeaponUnlock() {
    this.state = 'weapon_unlock';
    const container = document.getElementById('weapon-cards');
    container.innerHTML = '';
    const available = SUB_WEAPON_POOL.filter(w => !this.player.subWeapons.includes(w));
    const cards = [];
    while(cards.length < 3 && available.length > 0) {
      const idx = Math.floor(Math.random() * available.length);
      cards.push(available.splice(idx, 1)[0]);
    }
    if(cards.length === 0) {
      this.nextLevel();
      return;
    }
    cards.forEach(wid => {
      const w = WEAPONS[wid];
      const el = document.createElement('div');
      el.className = 'upgrade-card weapon-card';
      el.innerHTML = `<div class="card-icon">${w.icon}</div>
        <div class="card-name">${w.name}</div>
        <div class="card-desc">${w.type === 'sub' ? '副武器 · 自动开火' : '独立武器'}</div>`;
      el.addEventListener('click', () => {
        if(w.type === 'sub') {
          if(this.player.subWeapons.length < this.player.maxSubWeapons) {
            this.player.subWeapons.push(wid);
          } else {
            this.player.subWeapons.shift();
            this.player.subWeapons.push(wid);
          }
        } else {
          if(!this.player.independentWeapons.includes(wid)) {
            this.player.independentWeapons.push(wid);
            if(wid === 'DRONE') { this.player.droneCount = Math.max(1, this.player.droneCount); this.player.droneUnlocked = true; }
            if(wid === 'MINE') this.player.mineUnlocked = true;
          }
        }
        this.initDrones();
        this.updateSynergies();
        this.nextLevel();
      });
      container.appendChild(el);
    });
    document.getElementById('current-weapons-list').textContent = 
      this.player.subWeapons.map(id => WEAPONS[id].icon + WEAPONS[id].name).join(' ') || '无';
    document.getElementById('weapon-overlay').classList.remove('hidden');
  }
  
  nextLevel() {
    document.getElementById('upgrade-overlay').classList.add('hidden');
    document.getElementById('weapon-overlay').classList.add('hidden');
    this.level++;
    if(this.level > this.maxLevel && CONFIG.MODE === 'story') {
      this.victory();
      return;
    }
    // 清理上一关残留数据（拾取物保留，跨关卡持续）
    this.bullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.boss = null;
    this.drones = [];
    this.mines = [];
    this.particles = [];
    this.floatingTexts = [];
    this.killCount = 0;
    this.hasNuke = false;
    this.nukeCount = Math.min(3, this.nukeCount || 0);
    this.initLevel();
  }
  
  nukeExplosion() {
    this.screenShake(1);
    this.addExplosion(this.player.x, this.player.y, 400, '#ffaa00');
    for(const e of this.enemies) {
      if(e.alive) { e.takeDamage(50, this); }
    }
    if(this.boss && this.boss.alive) {
      this.boss.takeDamage(30, this);
    }
    for(let i = 0; i < 30; i++) {
      this.particles.push(new Particle(
        rand(0, CONFIG.CANVAS.w), rand(0, CONFIG.CANVAS.h),
        rand(-200, 200), rand(-200, 200), '#ffaa00', rand(0.5, 1.5), rand(5, 15), 'circle'
      ));
    }
    this.screenFlash(0.4);
  }
  
  gameOver() {
    this.state = 'gameover';
    AudioMgr.stopBGM();
    AudioMgr.skill('nuke'); // 失败音效
    this.screenShake(0.5);
    
    if(this.player.score > this.highscore) {
      this.highscore = this.player.score;
      localStorage.setItem('tank_highscore', this.highscore);
    }
    this.saveScore(CONFIG.MODE, this.player.score, this.level, this.wave, false);
    this.renderRecentScores();
    document.getElementById('game-over-title').textContent = 
      CONFIG.MODE === 'creative' ? 'BUILD FAILED' : 'GAME OVER';
    const stats = document.getElementById('game-over-stats');
    if(CONFIG.MODE === 'creative') {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      stats.innerHTML = `
        <div class="stat-row"><span class="label">总波数</span><span class="value">${this.wave}</span></div>
        <div class="stat-row"><span class="label">击杀数</span><span class="value">${this.player.score}</span></div>
        <div class="stat-row"><span class="label">生存时间</span><span class="value">${Math.floor(elapsed/60)}:${String(elapsed%60).padStart(2,'0')}</span></div>
        <div class="stat-row"><span class="label">最终分数</span><span class="value">${this.player.score}</span></div>`;
    } else {
      stats.innerHTML = `
        <div class="stat-row"><span class="label">到达关卡</span><span class="value">${this.level}</span></div>
        <div class="stat-row"><span class="label">最终分数</span><span class="value">${this.player.score}</span></div>
        <div class="stat-row"><span class="label">最高纪录</span><span class="value">${this.highscore}</span></div>`;
    }
    document.getElementById('game-over-overlay').classList.remove('hidden');
    
    // 失败CG动画
    this.playGameOverAnimation();
  }
  
  playGameOverAnimation() {
    const canvas = this.canvas;
    const ctx = this.ctx;
    const overlay = document.getElementById('game-over-overlay');
    
    // 添加闪烁效果
    canvas.style.transition = 'filter 0.5s';
    canvas.style.filter = 'brightness(0.3) saturate(0.5)';
    
    // 显示震动文字效果
    const title = document.getElementById('game-over-title');
    title.style.animation = 'shake 0.5s ease-in-out';
    
    setTimeout(() => {
      canvas.style.filter = 'none';
      title.style.animation = '';
    }, 1000);
  }
  
  victory() {
    this.state = 'victory';
    AudioMgr.stopBGM();
    AudioMgr.bossDefeated();
    this.screenShake(1);
    this.saveScore(CONFIG.MODE, this.player.score, this.level, this.wave, true);
    this.renderRecentScores();
    document.getElementById('victory-stats').innerHTML = `
      <div class="stat-row"><span class="label">通关分数</span><span class="value">${this.player.score}</span></div>
      <div class="stat-row"><span class="label">剩余生命</span><span class="value">${this.player.hp}/${this.player.maxHp}</span></div>
      <div class="stat-row"><span class="label">副武器数</span><span class="value">${this.player.subWeapons.length}</span></div>`;
    document.getElementById('victory-overlay').classList.remove('hidden');
    
    // 胜利CG动画
    this.playVictoryAnimation();
  }
  
  playVictoryAnimation() {
    const canvas = this.canvas;
    const container = document.getElementById('game-container');
    
    // 添加金光效果
    const flash = document.createElement('div');
    flash.style.cssText = `
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: radial-gradient(circle, rgba(255,215,0,0.8) 0%, rgba(255,215,0,0) 70%);
      pointer-events: none;
      z-index: 100;
      animation: victoryFlash 1s ease-out forwards;
    `;
    container.appendChild(flash);
    
    // 动画结束后移除
    setTimeout(() => flash.remove(), 1500);
    
    // 播放胜利音效序列
    setTimeout(() => AudioMgr.playTone(523, 0.15, 'triangle', 0.15), 100);
    setTimeout(() => AudioMgr.playTone(659, 0.15, 'triangle', 0.15), 250);
    setTimeout(() => AudioMgr.playTone(784, 0.3, 'triangle', 0.15), 400);
  }
  
  pauseGame() {
    if(this.state === 'playing' || this.state === 'creative_playing') {
      this._pausedState = this.state;
      this.state = 'paused';
      document.getElementById('pause-overlay').classList.remove('hidden');
      // 同步开关状态
      document.querySelectorAll('[data-music-toggle]').forEach(el => {
        el.checked = !AudioMgr.musicMuted;
      });
      document.querySelectorAll('[data-sfx-toggle]').forEach(el => {
        el.checked = !AudioMgr.sfxMuted;
      });
    }
  }
  
  resumeGame() {
    if(this.state === 'paused') {
      this.state = this._pausedState || 'playing';
      document.getElementById('pause-overlay').classList.add('hidden');
    }
  }
  
  updateHUD() {
    if(!this.player) return;
    document.getElementById('hp-fill').style.width = (this.player.hp / this.player.maxHp * 100) + '%';
    // HP数值显示
    const hpTextEl = document.getElementById('hp-text');
    if(hpTextEl) {
      hpTextEl.textContent = `${Math.ceil(this.player.hp)}/${this.player.maxHp}`;
    }
    document.getElementById('shield-count').textContent = this.player.shield;
    document.getElementById('score').textContent = this.player.score;
    document.getElementById('level').textContent = this.level;
    document.getElementById('kill-count').textContent = Math.max(0, this.killCount);
    
    // 关卡进度条更新（怪物潮/防守）
    const progRow = document.getElementById('level-progress-row');
    const progFill = document.getElementById('lp-fill');
    const progText = document.getElementById('lp-text');
    const progLabel = document.getElementById('lp-label');
    if(this.isHoard || this.isDefense) {
      progRow.style.display = 'flex';
      if(this.isHoard) {
        progRow.classList.remove('defense-mode');
        progLabel.textContent = '怪物潮';
        const killed = this.killCount;
        const total = this.enemyLimit;
        progText.textContent = `${killed}/${total}`;
        progFill.style.width = (killed / total * 100) + '%';
      } else if(this.isDefense) {
        progRow.classList.add('defense-mode');
        progLabel.textContent = '防守中';
        const baseHp = this.base ? Math.max(0, this.base.hp) : 0;
        const baseMax = this.base ? this.base.maxHp : 1;
        const remainTime = Math.max(0, this.defenseDuration - this.defenseTime);
        progText.textContent = `基地:${Math.ceil(baseHp)} | ${remainTime.toFixed(1)}s`;
        progFill.style.width = (baseHp / baseMax * 100) + '%';
      }
    } else {
      progRow.style.display = 'none';
    }
    
    const nukeEl = document.getElementById('nuke-status');
    const count = this.nukeCount || 0;
    if(count > 0) { nukeEl.textContent = '[Q] ☢ x' + count; nukeEl.className = 'nuke-ready'; }
    else { nukeEl.textContent = '[Q] 空'; nukeEl.className = 'nuke-empty'; }
    
    const mainLevels = document.getElementById('main-levels');
    if(this.player.mainWeapon) {
      const w = WEAPONS[this.player.mainWeapon];
      document.querySelector('#main-weapon-display .weapon-icon').textContent = w.icon;
      document.querySelector('#main-weapon-display .weapon-name').textContent = w.name;
      const lvls = this.player.wLevels[this.player.mainWeapon];
      const parts = [];
      for(const k of Object.keys(lvls)) {
        if(lvls[k] > 0) parts.push(k.replace('_','') + ':' + lvls[k]);
      }
      mainLevels.textContent = parts.length > 0 ? '强化: ' + parts.join(', ') : '';
    } else {
      mainLevels.textContent = '';
    }
    
    const subList = document.getElementById('sub-weapons');
    subList.innerHTML = '';
    const seenIds = new Set();
    for(const sid of this.player.subWeapons) {
      if(seenIds.has(sid)) continue;
      seenIds.add(sid);
      const w = WEAPONS[sid];
      const item = document.createElement('div');
      item.className = 'weapon-item';
      item.innerHTML = `<span class="weapon-icon">${w.icon}</span>
        <span class="weapon-name">${w.name}</span>
        <span class="weapon-tag">◉ 自动</span>`;
      subList.appendChild(item);
    }
    document.getElementById('sub-count').textContent = this.player.subWeapons.length;
    document.getElementById('sub-max').textContent = isFinite(this.player.maxSubWeapons) ? this.player.maxSubWeapons : '∞';
    
    const indepList = document.getElementById('indep-weapons');
    indepList.innerHTML = '';
    for(const iid of this.player.independentWeapons) {
      const w = WEAPONS[iid];
      const item = document.createElement('div');
      item.className = 'weapon-item';
      const countTxt = iid === 'DRONE' ? '×' + (this.player.droneCount || 1) : '';
      item.innerHTML = `<span class="weapon-icon">${w.icon}</span>
        <span class="weapon-name">${w.name}</span>
        <span class="weapon-tag">${countTxt}</span>`;
      indepList.appendChild(item);
    }
    
    const synRow = document.getElementById('synergy-row');
    synRow.textContent = this.synergiesActive.length > 0 ? '⚡ ' + this.synergiesActive.join(' + ') : '';
    
    if(this.boss && this.boss.alive) {
      document.getElementById('boss-bar').classList.remove('hidden');
      document.getElementById('boss-name').textContent = this.isBossEnhanced() ? '⚡ ENHANCED BOSS ⚡' : 'BOSS';
      document.getElementById('boss-hp-fill').style.width = (this.boss.hp / this.boss.maxHp * 100) + '%';
    } else {
      document.getElementById('boss-bar').classList.add('hidden');
    }
    
    if(CONFIG.MODE === 'creative' && this.startTime) {
      document.getElementById('wave-row').style.display = '';
      document.getElementById('wave').textContent = this.wave;
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      document.getElementById('survival').textContent = Math.floor(elapsed/60) + ':' + String(elapsed%60).padStart(2,'0');
    } else {
      document.getElementById('wave-row').style.display = 'none';
    }
    
    const hsRow = document.getElementById('highscore-row');
    if(CONFIG.MODE === 'endless') {
      hsRow.style.display = '';
      document.getElementById('highscore').textContent = this.highscore;
    }
  }
  
  isBossEnhanced() {
    return CONFIG.MODE === 'endless' && this.level >= CONFIG.ENDLESS.enhancedBossEvery && this.level % CONFIG.ENDLESS.enhancedBossEvery === 0;
  }
  
  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CONFIG.CANVAS.w, CONFIG.CANVAS.h);
    this.drawGrid();
    for(const p of this.pickups) p.draw(ctx);
    for(const m of this.mines) m.draw(ctx);
    for(const e of this.enemies) e.draw(ctx);
    if(this.boss && this.boss.alive) this.boss.draw(ctx);
    this.drawDefenseBase();
    for(const d of this.drones) d.draw(ctx);
    if(this.player) this.player.draw(ctx);
    for(const b of this.bullets) b.draw(ctx);
    for(const b of this.enemyBullets) b.draw(ctx);
    for(const p of this.particles) p.draw(ctx);
    for(const t of this.floatingTexts) t.draw(ctx);
    if(this.player && (CONFIG.MODE !== 'creative' || this.player.mainWeapon)) {
      this.drawTargetingLine();
    }
    if(this.screenFlashTime > 0) {
      const a = this.screenFlashTime / 0.3;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, CONFIG.CANVAS.w, CONFIG.CANVAS.h);
      ctx.restore();
      this.screenFlashTime -= 0.016;
    }
    this.drawSkillIcons();
  }
  
  drawDefenseBase() {
    if(!this.isDefense || !this.base || !this.base.alive) return;
    const ctx = this.ctx;
    const b = this.base;
    const tier = b.tier || 1;
    const t = Date.now() / 1000;
    const x = b.x, y = b.y;
    const R = tier === 1 ? 28 : tier === 2 ? 34 : 42;
    const core = '#00f0ff';
    const hull = 'rgba(20,35,60,0.95)';
    
    ctx.save();
    // 旋转防御环（层级越高环越多）
    ctx.translate(x, y);
    ctx.rotate(t * (0.4 + tier * 0.15));
    
    // 外圈能量护盾
    ctx.shadowColor = core; ctx.shadowBlur = 18;
    ctx.strokeStyle = tier >= 2 ? '#00ffcc' : core;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, R + 8 + tier * 2, 0, Math.PI * 2);
    ctx.stroke();
    // 第二层旋转圈（高级）
    if(tier >= 3) {
      ctx.strokeStyle = '#a0ffff';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, R + 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // 雷达扫描线
    ctx.strokeStyle = 'rgba(0,240,255,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(t * 1.6) * (R + 8), Math.sin(t * 1.6) * (R + 8));
    ctx.stroke();
    ctx.rotate(-(t * (0.4 + tier * 0.15)));
    
    // 基地主体（军事八角形装甲）
    ctx.shadowBlur = 12;
    ctx.fillStyle = hull;
    ctx.strokeStyle = core;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for(let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const rr = R;
      const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
      if(i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // 内部能量核心
    const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, R * 0.55);
    grad.addColorStop(0, tier >= 3 ? '#ffffff' : '#a0ffff');
    grad.addColorStop(0.5, core);
    grad.addColorStop(1, 'rgba(0,240,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.55, 0, Math.PI * 2);
    ctx.fill();
    
    // 炮塔（层级越高越多）
    const turrets = tier === 1 ? 1 : tier === 2 ? 2 : 3;
    for(let i = 0; i < turrets; i++) {
      const a = (i / turrets) * Math.PI * 2 + Math.PI * 0.25;
      ctx.save();
      ctx.rotate(a);
      ctx.fillStyle = '#0e2030';
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 1.5;
      ctx.fillRect(R * 0.45, -4, 14, 8);
      ctx.strokeRect(R * 0.45, -4, 14, 8);
      ctx.restore();
    }
    
    // 顶部指挥塔/天线（层级越来越高）
    ctx.strokeStyle = core;
    ctx.lineWidth = 2;
    if(tier >= 2) {
      ctx.beginPath(); ctx.moveTo(0, -R); ctx.lineTo(0, -R - 14); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -R - 18, tier >= 3 ? 5 : 3, 0, Math.PI * 2); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(-10, -R + 4); ctx.lineTo(10, -R - 8); ctx.stroke();
    }
    ctx.restore();
    
    // 血条
    const bw = 70, bh = 7, bx = x - bw / 2, by = y - R - 30;
    const pct = Math.max(0, b.hp / b.maxHp);
    ctx.fillStyle = 'rgba(5,12,25,0.85)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = pct > 0.4 ? '#00ff88' : '#ff4444';
    ctx.fillRect(bx, by, bw * pct, bh);
    ctx.strokeStyle = '#00f0ff'; ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = '#e0f0ff';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('基地 ' + Math.max(0, Math.round(b.hp)) + '/' + b.maxHp, x, by - 6);
    
    // 计时器
    if(this.state === 'playing') {
      const remain = Math.max(0, this.defenseDuration - this.defenseTime);
      ctx.fillStyle = 'rgba(0,240,255,0.9)';
      ctx.font = 'bold 22px monospace';
      ctx.fillText('⛊ 守卫 ' + remain.toFixed(1) + 's', CONFIG.CANVAS.w / 2, 40);
    }
  }
  
  drawSkillIcons() {
    if(!this.player) return;
    const ctx = this.ctx;
    const p = this.player;
    
    const radius = 24;
    const strokeW = 4;
    const margin = 20;
    const gap = 10;
    
    const canvasH = CONFIG.CANVAS.h;
    const canvasW = CONFIG.CANVAS.w;
    
    // 大招图标 (E键)
    const ultX = margin + radius;
    const ultY = canvasH - margin - radius;
    const ultCharge = Math.min(1, p.ultimate / 20);
    const ultReady = p.ultimate >= 20;
    
    ctx.save();
    // 背景圆
    ctx.beginPath();
    ctx.arc(ultX, ultY, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fill();
    ctx.strokeStyle = ultReady ? '#ffaa00' : '#445';
    ctx.lineWidth = strokeW;
    ctx.stroke();
    
    // 充能圆弧
    if(ultCharge > 0) {
      ctx.beginPath();
      ctx.arc(ultX, ultY, radius, -Math.PI/2, -Math.PI/2 + Math.PI * 2 * ultCharge);
      ctx.strokeStyle = ultReady ? '#ffaa00' : '#00f0ff';
      ctx.lineWidth = strokeW;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
    
    // 图标文字
    ctx.fillStyle = ultReady ? '#ffaa00' : '#889';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('E', ultX, ultY - 2);
    ctx.font = '8px sans-serif';
    ctx.fillStyle = ultReady ? '#fff' : '#667';
    ctx.fillText(ultReady ? 'READY' : Math.floor(p.ultimate) + '/20', ultX, ultY + 10);
    ctx.restore();
    
    // 闪避图标 (空格键)
    const dashX = ultX + radius * 2 + gap;
    const dashY = ultY;
    const dashReady = p.dashCd <= 0;
    const dashCdRatio = p.dashCd > 0 ? (1 - p.dashCd / (1.0 * p.dashCdMul)) : 1;
    
    ctx.save();
    // 背景圆
    ctx.beginPath();
    ctx.arc(dashX, dashY, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fill();
    ctx.strokeStyle = dashReady ? '#00ff88' : '#445';
    ctx.lineWidth = strokeW;
    ctx.stroke();
    
    // CD圆弧
    if(dashCdRatio < 1) {
      ctx.beginPath();
      ctx.arc(dashX, dashY, radius, -Math.PI/2, -Math.PI/2 + Math.PI * 2 * dashCdRatio);
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = strokeW;
      ctx.lineCap = 'round';
      ctx.stroke();
    } else if(dashReady) {
      ctx.beginPath();
      ctx.arc(dashX, dashY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = strokeW;
      ctx.stroke();
    }
    
    // 图标文字
    ctx.fillStyle = dashReady ? '#00ff88' : '#889';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⇧', dashX, dashY - 2);
    ctx.font = '8px sans-serif';
    ctx.fillStyle = dashReady ? '#fff' : '#667';
    ctx.fillText(dashReady ? 'READY' : p.dashCd.toFixed(1) + 's', dashX, dashY + 10);
    ctx.restore();
  }
  
  drawGrid() {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for(let x = 0; x < CONFIG.CANVAS.w; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CONFIG.CANVAS.h); ctx.stroke();
    }
    for(let y = 0; y < CONFIG.CANVAS.h; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CONFIG.CANVAS.w, y); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, CONFIG.CANVAS.w - 2, CONFIG.CANVAS.h - 2);
  }
  
  drawTargetingLine() {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(this.player.x, this.player.y);
    ctx.lineTo(Input.mouse.x, Input.mouse.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
    ctx.lineWidth = 1.5;
    const s = 12;
    ctx.beginPath();
    ctx.moveTo(Input.mouse.x - s, Input.mouse.y); ctx.lineTo(Input.mouse.x - 4, Input.mouse.y);
    ctx.moveTo(Input.mouse.x + s, Input.mouse.y); ctx.lineTo(Input.mouse.x + 4, Input.mouse.y);
    ctx.moveTo(Input.mouse.x, Input.mouse.y - s); ctx.lineTo(Input.mouse.x, Input.mouse.y - 4);
    ctx.moveTo(Input.mouse.x, Input.mouse.y + s); ctx.lineTo(Input.mouse.x, Input.mouse.y + 4);
    ctx.stroke();
    ctx.restore();
  }
}

// ===== INIT =====
window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  window.__game_instance = game;
  
  // 恢复音频设置并播放菜单BGM
  const savedMusicMuted = localStorage.getItem('tank_music_muted') === '1';
  const savedSfxMuted = localStorage.getItem('tank_sfx_muted') === '1';
  AudioMgr.setMusicMuted(savedMusicMuted);
  AudioMgr.setSfxMuted(savedSfxMuted);
  if(!savedMusicMuted) {
    AudioMgr.startBGM('menu');
  }
  
  document.getElementById('resume-btn').addEventListener('click', () => game.resumeGame());
  document.getElementById('pause-menu-btn').addEventListener('click', () => {
    document.getElementById('pause-overlay').classList.add('hidden');
    document.getElementById('main-menu').classList.remove('hidden');
    game.state = 'menu';
    game.player = null;
  });
  document.getElementById('retry-btn').addEventListener('click', () => {
    document.getElementById('game-over-overlay').classList.add('hidden');
    game.startGame(CONFIG.MODE);
  });
  document.getElementById('menu-btn').addEventListener('click', () => {
    document.getElementById('game-over-overlay').classList.add('hidden');
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('main-menu').classList.remove('hidden');
    game.state = 'menu';
    game.player = null;
  });
  document.getElementById('victory-menu-btn').addEventListener('click', () => {
    document.getElementById('victory-overlay').classList.add('hidden');
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('main-menu').classList.remove('hidden');
    game.state = 'menu';
    game.player = null;
  });
  document.getElementById('start-creative').addEventListener('click', () => {
    document.getElementById('creative-setup').classList.add('hidden');
    game.startCreativeBattle();
  });
});

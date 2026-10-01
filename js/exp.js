/* ==========================================================
 *  exp.js — 拓展玩法「模拟层」
 *  果园（一次种植、反复结果）/ 鱼塘（水产）/
 *  矿洞（定时挖矿 + 等级权重掉落）/ 中央厨房（菜品）/
 *  宠物（亲密度升级，被动加成作用于全链路）
 *
 *  只负责状态推进与规则判定，视图在 exp_views.js。
 * ========================================================== */
(function (global) {
  'use strict';
  var FARM = global.FARM;
  var D = FARM.DATA, S = FARM.state, K = D.CONST;
  var now = FARM.now;

  function st() { return S.data; }
  function tstr(d) { return FARM.vfmt.timeStr(d); }
  function ok(m, extra) { var r = { ok: true, msg: m }; if (extra) for (var k in extra) r[k] = extra[k]; return r; }
  function fail(m) { return { ok: false, msg: m }; }

  /* ==========================================================
   *  一、果园
   * ========================================================== */
  function treeFit(treeId) {
    var t = D.ORCHARD[treeId];
    return (t && t.season === st().season.id) ? 1.25 : 0.72;
  }
  /* 果树成熟所需毫秒（天气 / 季节 / 当季加成 / 装饰加成） */
  function treeMs(treeId, sec) {
    return sec * 1000 / (FARM.sim.growSpeed() * treeFit(treeId));
  }

  function plantTree(i, treeId) {
    var s = st(), slot = s.orchard[i], cfg = D.ORCHARD[treeId];
    if (!slot) return fail('树位不存在');
    if (slot.locked) return fail('这个树位还没开垦');
    if (!cfg) return fail('没有这种果树');
    if (slot.tree) return fail('这里已经种了' + D.ORCHARD[slot.tree].name);
    if (s.level < cfg.lv) return fail('Lv.' + cfg.lv + ' 解锁' + cfg.name);
    if (!S.spend(cfg.cost)) return fail('金币不足，需要 ' + cfg.cost);
    slot.tree = treeId;
    slot.state = 'growing';
    slot.readyAt = now() + treeMs(treeId, cfg.grow);
    slot.pending = 0;
    if (s.dex.trees[treeId] === undefined) s.dex.trees[treeId] = 0;
    S.touch();
    FARM.sys && FARM.sys.checkAch('firstTree');
    return ok('种下 ' + cfg.name + '，' + tstr(cfg.grow * 1000) + '后首次结果');
  }

  function harvestTree(i) {
    var s = st(), slot = s.orchard[i];
    if (!slot || !slot.tree) return fail('这里没有果树');
    if (slot.state !== 'ripe') return fail('果实还没成熟');
    var cfg = D.ORCHARD[slot.tree];
    if (S.itemTotal() >= s.cap) return fail('仓库已满，先卖一些');
    var n = Math.max(1, Math.round(cfg.yield * (1 + FARM.sim.decorBuff('yield')) * (1 + petBuff('yield'))));
    S.add(slot.tree, n);
    S.gainXp(cfg.xp);
    s.stats.tree++;
    s.dex.trees[slot.tree] = (s.dex.trees[slot.tree] || 0) + n;
    s.dex.goods[slot.tree] = (s.dex.goods[slot.tree] || 0) + n;
    slot.state = 'growing';
    slot.pending = 0;
    slot.readyAt = now() + treeMs(slot.tree, cfg.cycle);
    S.touch();
    FARM.sys && FARM.sys.dailyTick('tree', 1);
    return ok('收获 ' + FARM.itemName(slot.tree) + ' ×' + n, { act: 'harvestTree' });
  }

  function harvestAllTrees() {
    var s = st(), n = 0;
    for (var i = 0; i < s.orchard.length; i++) {
      if (s.orchard[i].state === 'ripe' && harvestTree(i).ok) n++;
    }
    return n ? ok('收获 ' + n + ' 棵果树', { act: 'harvestAllTrees' }) : fail('没有成熟的果树');
  }

  function nextTreeUnlock() {
    var s = st();
    for (var i = 0; i < s.orchard.length; i++) {
      if (s.orchard[i].locked) {
        var cfg = null;
        D.ORCHARD_UNLOCKS.forEach(function (u) { if (u.index === i) cfg = u; });
        return cfg ? { index: i, cfg: cfg } : null;
      }
    }
    return null;
  }

  function unlockTreeSlot() {
    var nx = nextTreeUnlock();
    if (!nx) return fail('全部树位已开垦');
    var s = st();
    if (s.level < nx.cfg.lv) return fail('Lv.' + nx.cfg.lv + ' 解锁');
    if (!S.spend(nx.cfg.cost)) return fail('金币不足，需要 ' + nx.cfg.cost);
    s.orchard[nx.index].locked = 0;
    S.touch();
    return ok('开垦第 ' + (nx.index + 1) + ' 个树位', { act: 'unlockTreeSlot' });
  }

  function rushTree(i) {
    var s = st(), slot = s.orchard[i];
    if (!slot || !slot.tree) return fail('这里没有果树');
    if (slot.state === 'ripe') return fail('已经熟了');
    if (s.gems < 3) return fail('钻石不足（需要 3）');
    s.gems -= 3;
    slot.readyAt = now();
    S.touch();
    return ok('催熟成功', { act: 'rushTree' });
  }

  function orchardStep(slot) {
    if (!slot || slot.locked || !slot.tree) return;
    if (slot.state === 'growing' && slot.readyAt && now() >= slot.readyAt) {
      slot.state = 'ripe';
      slot.pending = D.ORCHARD[slot.tree].yield;
      S.touch();
    }
  }

  /* ==========================================================
   *  二、鱼塘
   * ========================================================== */
  function fishYield(fishId) {
    var f = D.POND_FISH[fishId];
    return (f && f.out && f.out.fish) || 1;
  }

  function stockFish(i, fishId) {
    var s = st(), slot = s.pond[i], cfg = D.POND_FISH[fishId];
    if (!slot) return fail('塘位不存在');
    if (slot.locked) return fail('这个塘位还没挖');
    if (!cfg) return fail('没有这种鱼苗');
    if (slot.fish && slot.fish !== fishId) return fail('这个塘里养着别的鱼');
    if (slot.fish) return fail('这个塘已经有鱼了');
    if (s.level < cfg.lv) return fail('Lv.' + cfg.lv + ' 解锁' + cfg.name);
    if (!S.spend(cfg.cost)) return fail('金币不足，需要 ' + cfg.cost);
    slot.fish = fishId;
    slot.state = 'growing';
    slot.readyAt = now() + cfg.grow * 1000;
    slot.pending = 0;
    slot.fed = 0;
    if (s.dex.fish[fishId] === undefined) s.dex.fish[fishId] = 0;
    S.touch();
    FARM.sys && FARM.sys.checkAch('firstFish');
    return ok('投放 ' + cfg.name + ' 鱼苗，' + tstr(cfg.grow * 1000) + '后可捕', { act: 'stockFish' });
  }

  function feedFish(i) {
    var s = st(), slot = s.pond[i];
    if (!slot || !slot.fish) return fail('塘里没有鱼');
    var cfg = D.POND_FISH[slot.fish];
    for (var k in cfg.feed) {
      if (!S.has(k, cfg.feed[k])) return fail('饲料不足：' + FARM.itemName(k) + ' ×' + cfg.feed[k]);
    }
    for (var k2 in cfg.feed) S.add(k2, -cfg.feed[k2]);
    slot.fed = 1;
    /* 喂食后本轮成熟时间缩短 30% */
    var left = Math.max(1000, slot.readyAt - now());
    slot.readyAt = now() + left * 0.7;
    s.stats.feed++;
    S.touch();
    return ok(cfg.name + ' 吃饱了，本轮成熟时间 -30%', { act: 'feedFish' });
  }

  function collectFish(i) {
    var s = st(), slot = s.pond[i];
    if (!slot || !slot.fish) return fail('塘里没有鱼');
    if (slot.state !== 'ripe') return fail('还没到捕捞时间');
    var cfg = D.POND_FISH[slot.fish];
    var n = Math.max(1, Math.round(fishYield(slot.fish) * (1 + petBuff('yield'))));
    if (S.itemTotal() + n > s.cap) return fail('仓库快满了');
    var got = [];
    for (var k in cfg.out) {
      var v = (k === 'fish') ? n : Math.max(1, Math.round(cfg.out[k] * (1 + petBuff('yield'))));
      S.add(k, v);
      s.dex.goods[k] = (s.dex.goods[k] || 0) + v;
      got.push(FARM.itemName(k) + ' ×' + v);
    }
    S.gainXp(cfg.xp);
    s.stats.fish++;
    s.dex.fish[slot.fish] = (s.dex.fish[slot.fish] || 0) + n;
    slot.state = 'growing';
    slot.pending = 0;
    slot.readyAt = now() + cfg.grow * 1000 * (slot.fed ? 0.7 : 1);
    slot.fed = 0;
    S.touch();
    FARM.sys && FARM.sys.dailyTick('fish', 1);
    return ok('捕捞：' + got.join('、'), { act: 'collectFish' });
  }

  function collectAllFish() {
    var s = st(), n = 0;
    for (var i = 0; i < s.pond.length; i++) {
      if (s.pond[i].state === 'ripe' && collectFish(i).ok) n++;
    }
    return n ? ok('捕捞 ' + n + ' 口塘', { act: 'collectAllFish' }) : fail('还没有可捕的鱼');
  }

  function feedAllFish() {
    var s = st(), n = 0;
    for (var i = 0; i < s.pond.length; i++) {
      if (s.pond[i].fish && !s.pond[i].locked && feedFish(i).ok) n++;
    }
    return n ? ok('喂食 ' + n + ' 口塘', { act: 'feedAllFish' }) : fail('没有可喂食的塘（饲料不足？）');
  }

  function nextPondUnlock() {
    var s = st();
    for (var i = 0; i < s.pond.length; i++) {
      if (s.pond[i].locked) {
        var cfg = null;
        D.POND_UNLOCKS.forEach(function (u) { if (u.index === i) cfg = u; });
        return cfg ? { index: i, cfg: cfg } : null;
      }
    }
    return null;
  }

  function unlockPondSlot() {
    var nx = nextPondUnlock();
    if (!nx) return fail('全部塘位已挖好');
    var s = st();
    if (s.level < nx.cfg.lv) return fail('Lv.' + nx.cfg.lv + ' 解锁');
    if (!S.spend(nx.cfg.cost)) return fail('金币不足，需要 ' + nx.cfg.cost);
    s.pond[nx.index].locked = 0;
    S.touch();
    return ok('挖好第 ' + (nx.index + 1) + ' 口塘', { act: 'unlockPondSlot' });
  }

  function rushFish(i) {
    var s = st(), slot = s.pond[i];
    if (!slot || !slot.fish) return fail('塘里没有鱼');
    if (slot.state === 'ripe') return fail('已经可以捕了');
    if (s.gems < 2) return fail('钻石不足（需要 2）');
    s.gems -= 2;
    slot.readyAt = now();
    S.touch();
    return ok('催长成功', { act: 'rushFish' });
  }

  function pondStep(slot) {
    if (!slot || slot.locked || !slot.fish) return;
    if (slot.state === 'growing' && slot.readyAt && now() >= slot.readyAt) {
      slot.state = 'ripe';
      slot.pending = fishYield(slot.fish);
      S.touch();
    }
  }

  /* ==========================================================
   *  三、矿洞
   * ========================================================== */
  function mineIdx() { return Math.min(K.MAX_MINE_LV, Math.max(1, st().mine.lv)) - 1; }
  function mineCfg() { return D.MINE_UNLOCKS[mineIdx()]; }

  function startMine() {
    var s = st();
    if (s.mine.endAt) return fail('矿工还在井下作业');
    if (s.mine.drops) return fail('先领取上一批矿石');
    s.mine.endAt = now() + mineCfg().time * 1000;
    S.touch();
    return ok('矿工下井，' + tstr(mineCfg().time * 1000) + '后出矿', { act: 'startMine' });
  }

  /* 按等级权重产出矿石 */
  function rollMine() {
    var s = st();
    var w = D.MINE_DROP[mineIdx()] || D.MINE_DROP[0];
    var n = mineCfg().yield, out = {}, keys = Object.keys(w), totalW = 0, j;
    for (j = 0; j < keys.length; j++) totalW += w[keys[j]];
    for (var i = 0; i < n; i++) {
      var r = Math.random() * totalW, acc = 0, pick = keys[0];
      for (j = 0; j < keys.length; j++) { acc += w[keys[j]]; if (r <= acc) { pick = keys[j]; break; } }
      out[pick] = (out[pick] || 0) + 1;
    }
    s.mine.drops = out;
    s.mine.endAt = 0;
    S.touch();
  }

  function claimMine() {
    var s = st();
    if (!s.mine.drops) return fail('还没有矿石可领');
    var drops = s.mine.drops, got = [], total = 0, xp = 0;
    for (var k in drops) total += drops[k];
    if (S.itemTotal() + total > s.cap) return fail('仓库快满了');
    for (var k2 in drops) {
      S.add(k2, drops[k2]);
      s.dex.goods[k2] = (s.dex.goods[k2] || 0) + drops[k2];
      xp += (D.MINERALS[k2] ? D.MINERALS[k2].price : 50) * drops[k2] / 20;
      got.push(FARM.itemName(k2) + ' ×' + drops[k2]);
    }
    S.gainXp(Math.max(5, Math.round(xp)));
    s.stats.mine++;
    s.mine.drops = null;
    S.touch();
    FARM.sys && FARM.sys.dailyTick('mine', 1);
    FARM.sys && FARM.sys.checkAch('firstMine');
    return ok('出矿：' + got.join('、'), { act: 'claimMine' });
  }

  function upgradeMine() {
    var s = st();
    if (s.mine.lv >= K.MAX_MINE_LV) return fail('矿洞已满级');
    var cost = D.MINE_UNLOCKS[mineIdx() + 1].cost;
    if (!S.spend(cost)) return fail('金币不足，需要 ' + cost);
    s.mine.lv++;
    S.touch();
    FARM.sys && FARM.sys.checkAch('mine5');
    return ok('矿洞升到 Lv.' + s.mine.lv + '（每次 ' + mineCfg().yield + ' 份，耗时 ' + mineCfg().time + '秒）', { act: 'upMine' });
  }

  function rushMine() {
    var s = st();
    if (!s.mine.endAt) return fail('矿工没有在作业');
    if (s.gems < 2) return fail('钻石不足（需要 2）');
    s.gems -= 2;
    s.mine.endAt = now();
    S.touch();
    return ok('加班加点，立刻出矿', { act: 'rushMine' });
  }

  function mineStep() {
    var s = st();
    if (s.mine.endAt && now() >= s.mine.endAt) rollMine();
  }

  /* ==========================================================
   *  四、中央厨房
   * ========================================================== */
  function kitchenSlots() { return 1 + (st().kitchen.lv - 1); }
  function kitchenSpeed() { return 1 + (st().kitchen.lv - 1) * 0.18; }
  function kitchenUpCost() { return 12000 * st().kitchen.lv; }

  function cook(did) {
    var s = st(), cfg = D.DISHES[did];
    if (!cfg) return fail('没有这道菜');
    if (s.level < cfg.lv) return fail('Lv.' + cfg.lv + ' 解锁' + cfg.name);
    if (s.kitchen.queue.length >= kitchenSlots()) return fail('灶台已满（' + kitchenSlots() + ' 个）');
    for (var k in cfg.in) {
      if (!S.has(k, cfg.in[k])) return fail('食材不足：' + FARM.itemName(k) + ' ×' + cfg.in[k]);
    }
    for (var k2 in cfg.in) S.add(k2, -cfg.in[k2]);
    s.kitchen.queue.push({ did: did, endAt: now() + cfg.time * 1000 / kitchenSpeed() });
    S.touch();
    return ok('开始烹制 ' + cfg.name, { act: 'cook' });
  }

  function kitchenStep() {
    var s = st();
    for (var i = s.kitchen.queue.length - 1; i >= 0; i--) {
      var q = s.kitchen.queue[i];
      if (q.endAt > now()) continue;
      var cfg = D.DISHES[q.did];
      if (!cfg) { s.kitchen.queue.splice(i, 1); continue; }
      if (S.itemTotal() + 1 > s.cap) continue;
      S.add(cfg.out, 1);
      s.dex.dishes[q.did] = (s.dex.dishes[q.did] || 0) + 1;
      s.dex.goods[cfg.out] = (s.dex.goods[cfg.out] || 0) + 1;
      S.gainXp(cfg.xp);
      s.stats.dish++;
      s.kitchen.queue.splice(i, 1);
      S.touch();
      FARM.sys && FARM.sys.dailyTick('dish', 1);
      FARM.sys && FARM.sys.checkAch('firstDish');
    }
  }

  function upgradeKitchen() {
    var s = st();
    if (s.kitchen.lv >= K.MAX_KITCHEN_LV) return fail('厨房已满级');
    var cost = kitchenUpCost();
    if (!S.spend(cost)) return fail('金币不足，需要 ' + cost);
    s.kitchen.lv++;
    S.touch();
    return ok('厨房升到 Lv.' + s.kitchen.lv + '（' + kitchenSlots() + ' 个灶台，速度 ×' + kitchenSpeed().toFixed(2) + '）', { act: 'upKitchen' });
  }

  function rushDish(idx) {
    var s = st(), q = s.kitchen.queue[idx];
    if (!q) return fail('没有这道菜在烹饪');
    if (s.gems < 2) return fail('钻石不足（需要 2）');
    s.gems -= 2;
    q.endAt = now();
    S.touch();
    return ok('加急出餐', { act: 'rushDish' });
  }

  /* ==========================================================
   *  五、宠物
   * ========================================================== */
  function adoptPet(id) {
    var s = st(), cfg = D.PETS[id];
    if (!cfg) return fail('没有这只宠物');
    if (s.pets[id]) return fail('已经领养了' + cfg.name);
    if (s.level < cfg.lv) return fail('Lv.' + cfg.lv + ' 解锁' + cfg.name);
    if (!S.spend(cfg.cost)) return fail('金币不足，需要 ' + cfg.cost);
    s.pets[id] = { lv: 1, bond: 0 };
    S.touch();
    FARM.sys && FARM.sys.checkAch('firstPet');
    return ok('领养了 ' + cfg.name + '：' + cfg.desc, { act: 'adoptPet' });
  }

  function feedPet(id) {
    var s = st(), p = s.pets[id];
    if (!p) return fail('还没有这只宠物');
    if (!S.has('petFeed', 1)) return fail('需要宠物饲料 ×1（磨坊可加工）');
    S.add('petFeed', -1);
    p.bond += 12;
    var up = 0;
    while (p.bond >= D.PET_LEVEL_UP * p.lv && p.lv < K.MAX_PET_LV) {
      p.bond -= D.PET_LEVEL_UP * p.lv;
      p.lv++;
      up++;
    }
    s.stats.pet++;
    S.touch();
    FARM.sys && FARM.sys.dailyTick('pet', 1);
    return ok('喂食成功，亲密度 +12' + (up ? '，' + D.PETS[id].name + ' 升到 Lv.' + p.lv + '！' : ''), { act: 'feedPet' });
  }

  /* 被动加成：base × (1 + (等级-1) × 0.4)，看门狗类负值最低 -0.85 */
  function petBuff(key) {
    var s = st(), v = 0;
    for (var id in s.pets) {
      var cfg = D.PETS[id];
      if (!cfg || !cfg.buff || !cfg.buff[key]) continue;
      v += cfg.buff[key] * (1 + (s.pets[id].lv - 1) * 0.4);
    }
    if (key === 'steal' && v < -0.85) v = -0.85;
    return v;
  }

  /* ==========================================================
   *  六、统一 tick / 离线结算 / 成就
   * ========================================================== */
  function tick() {
    var s = st(), i;
    for (i = 0; i < s.orchard.length; i++) orchardStep(s.orchard[i]);
    for (i = 0; i < s.pond.length; i++) pondStep(s.pond[i]);
    mineStep();
    kitchenStep();
  }

  /* 离线：果树 / 鱼塘只推进到「成熟」，不自动收获；矿洞 / 厨房照常结算 */
  function catchUp(seconds) {
    var s = st(), i;
    if (!(seconds > 0)) return;
    for (i = 0; i < s.orchard.length; i++) {
      var sl = s.orchard[i];
      if (!sl.tree || sl.locked) continue;
      if (sl.state === 'growing' && sl.readyAt <= now()) {
        sl.state = 'ripe';
        sl.pending = D.ORCHARD[sl.tree].yield;
      }
    }
    for (i = 0; i < s.pond.length; i++) {
      var pd = s.pond[i];
      if (!pd.fish || pd.locked) continue;
      if (pd.state === 'growing' && pd.readyAt <= now()) {
        pd.state = 'ripe';
        pd.pending = fishYield(pd.fish);
      }
    }
    mineStep();
    kitchenStep();
    S.touch();
  }

  function checkAch() {
    var s = st();
    var hasTree = false, hasFish = false, i;
    for (i = 0; i < s.orchard.length; i++) if (s.orchard[i].tree) hasTree = true;
    for (i = 0; i < s.pond.length; i++) if (s.pond[i].fish) hasFish = true;
    if (hasTree) FARM.sys.checkAch('firstTree');
    if (hasFish) FARM.sys.checkAch('firstFish');
    if (s.stats.mine > 0) FARM.sys.checkAch('firstMine');
    if (s.stats.dish > 0) FARM.sys.checkAch('firstDish');
    if (Object.keys(s.pets).length) FARM.sys.checkAch('firstPet');

    var allTrees = true, allFish = true, allDish = true, k;
    for (k in D.ORCHARD) if (!(s.dex.trees[k] > 0)) allTrees = false;
    for (k in D.POND_FISH) if (!(s.dex.fish[k] > 0)) allFish = false;
    for (k in D.DISHES) if (!(s.dex.dishes[k] > 0)) allDish = false;
    if (allTrees) FARM.sys.checkAch('orchardAll');
    if (allFish) FARM.sys.checkAch('fishAll');
    if (allDish) FARM.sys.checkAch('dishAll');
    if (s.mine.lv >= K.MAX_MINE_LV) FARM.sys.checkAch('mine5');
    if (Object.keys(s.pets).length >= Object.keys(D.PETS).length) FARM.sys.checkAch('petAll');
  }

  /* ==========================================================
   *  七、查询辅助（视图用）
   * ========================================================== */
  function unlockedTrees() {
    var s = st(), n = 0;
    for (var i = 0; i < s.orchard.length; i++) if (!s.orchard[i].locked) n++;
    return n;
  }
  function unlockedPonds() {
    var s = st(), n = 0;
    for (var i = 0; i < s.pond.length; i++) if (!s.pond[i].locked) n++;
    return n;
  }
  function ripeTrees() {
    var s = st(), n = 0;
    for (var i = 0; i < s.orchard.length; i++) if (s.orchard[i].state === 'ripe') n++;
    return n;
  }
  function ripePonds() {
    var s = st(), n = 0;
    for (var i = 0; i < s.pond.length; i++) if (s.pond[i].state === 'ripe') n++;
    return n;
  }

  FARM.exp = {
    /* 果园 */
    plantTree: plantTree, harvestTree: harvestTree, harvestAllTrees: harvestAllTrees,
    unlockTreeSlot: unlockTreeSlot, nextTreeUnlock: nextTreeUnlock, rushTree: rushTree,
    treeMs: treeMs, treeFit: treeFit,
    /* 鱼塘 */
    stockFish: stockFish, feedFish: feedFish, collectFish: collectFish,
    collectAllFish: collectAllFish, feedAllFish: feedAllFish,
    unlockPondSlot: unlockPondSlot, nextPondUnlock: nextPondUnlock, rushFish: rushFish,
    /* 矿洞 */
    startMine: startMine, claimMine: claimMine, upgradeMine: upgradeMine, rushMine: rushMine,
    mineCfg: mineCfg,
    /* 厨房 */
    cook: cook, upgradeKitchen: upgradeKitchen, rushDish: rushDish,
    kitchenSlots: kitchenSlots, kitchenSpeed: kitchenSpeed, kitchenUpCost: kitchenUpCost,
    /* 宠物 */
    adoptPet: adoptPet, feedPet: feedPet, petBuff: petBuff,
    /* 系统 */
    tick: tick, catchUp: catchUp, checkAch: checkAch,
    unlockedTrees: unlockedTrees, unlockedPonds: unlockedPonds,
    ripeTrees: ripeTrees, ripePonds: ripePonds
  };
})(window);

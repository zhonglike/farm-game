/* ==========================================================
 *  sim.js — 核心模拟（QQ 农场式逐格操作）
 *  地块状态机：荒地→耕地→播种→生长(水/草/虫)→成熟→枯萎
 *  牧场 / 加工 / 分店 / 订单
 * ========================================================== */
(function (global) {
  'use strict';
  var FARM = (global.FARM = global.FARM || {});
  var D = FARM.DATA, S = FARM.state, K = D.CONST;
  var now = FARM.now;

  function ok(m, extra) { var r = { ok: true, msg: m }; if (extra) for (var k in extra) r[k] = extra[k]; return r; }
  function fail(m) { return { ok: false, msg: m }; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  /* 宠物被动加成（拓展玩法，未加载时为 0） */
  function petBuff(key) { return (FARM.exp && FARM.exp.petBuff) ? FARM.exp.petBuff(key) : 0; }
  /* 研究院科技加成（未加载时为 0） */
  function techBuff(key) { return (FARM.tech && FARM.tech.buff) ? FARM.tech.buff(key) : 0; }
  /* 成熟后枯萎时限（受冷链保鲜科技影响） */
  function witherMs() { return K.WITHER_AFTER_MS * (1 + techBuff('wither')); }

  /* ================= 环境修正 ================= */
  function weather() { var s = S.data; return D.WEATHER[s.weather.id] || D.WEATHER.sunny; }
  function season() { var s = S.data; return D.SEASONS[s.season.id] || D.SEASONS.spring; }

  function decorBuff(key) {
    var s = S.data, v = 0;
    D.FARM_DECOR.forEach(function (d) {
      if (s.farmDecor.indexOf(d.id) >= 0 && d.buff[key]) v += d.buff[key];
    });
    return v;
  }

  /* 作物当季加成：当季 1.25，错季 0.72 */
  function seasonFit(cropId) {
    var c = D.CROPS[cropId];
    return c && c.season === S.data.season.id ? 1.25 : 0.72;
  }

  function growSpeed() {
    return (weather().grow || 1) * (season().grow || 1) * (1 + decorBuff('grow')) * (1 + techBuff('grow'));
  }

  /* ================= 地块 ================= */
  function plotTotal(plot) {
    var base = D.CROPS[plot.crop].grow * 1000;
    return base / (growSpeed() * seasonFit(plot.crop));
  }
  function plotProgress(plot) {
    if (!plot.crop) return 0;
    return clamp((now() - plot.at + (plot.boost || 0)) / plotTotal(plot), 0, 1);
  }
  /* 视觉阶段：0 播种 / 1 幼苗 / 2 生长 / 3 结果 / 4 成熟 */
  function plotStage(plot) {
    if (plot.state === 'ripe') return 4;
    if (plot.state !== 'growing') return 0;
    var p = plotProgress(plot);
    return p >= 0.75 ? 3 : p >= 0.45 ? 2 : p >= 0.15 ? 1 : 0;
  }

  /* 每秒：水分流失；缺水则抵消生长进度 */
  function plotStep(plot, dt) {
    if (!plot || plot.locked || plot.state !== 'growing' || !plot.crop) return;
    var dryRate = 100 / 900;                      // 约 15 分钟耗尽
    dryRate *= (weather().dry > 0 ? weather().dry : 1);
    dryRate *= (1 + decorBuff('dry'));            // 水井为负值
    dryRate *= (1 - Math.min(0.9, techBuff('water')));   // 滴灌科技
    if (S.data.autoWaterUntil > now()) dryRate *= 0.15;
    if (weather().id === 'rain') plot.water = Math.min(100, plot.water + dt * 3);
    else plot.water = Math.max(0, plot.water - dryRate * dt);
    if (plot.water <= 0) plot.boost = (plot.boost || 0) - dt * 1000;   // 冻结生长

    if (plotProgress(plot) >= 1) {
      plot.state = 'ripe';
      plot.ripeAt = now();
    }
  }

  /* 随机事件：杂草 / 害虫 */
  function plotEvents() {
    var s = S.data;
    if (now() - s.lastEventAt < K.EVENT_CHECK_MS) return;
    s.lastEventAt = now();
    var bugRate = 0.012 * (weather().bug || 1) * (1 + decorBuff('bug'));
    var weedRate = 0.016;
    var changed = false;
    for (var i = 0; i < s.plots.length; i++) {
      var p = s.plots[i];
      if (p.locked || p.state !== 'growing' || !p.crop) continue;
      if (!p.bug && Math.random() < bugRate) { p.bug = 1; changed = true; }
      if (!p.weed && Math.random() < weedRate) { p.weed = 1; changed = true; }
    }
    if (changed) S.touch();
  }

  /* ---------- 逐格点击：根据状态自动执行对应操作 ---------- */
  function plotClick(i) {
    var s = S.data, p = s.plots[i];
    if (!p) return fail('地块不存在');
    if (p.locked) return { ok: false, msg: '这块地还没开垦', act: 'expand' };

    if (p.state === 'wild') return hoe(i);
    if (p.state === 'withered') return { ok: false, msg: '作物已枯萎，需要清理', act: 'clear', act2: 'clear' };
    if (p.state === 'tilled') return { ok: true, act: 'choose', msg: '选择要种的作物' };
    if (p.state === 'ripe') return harvest(i);
    if (p.state === 'growing') {
      /* 优先除虫除草，其余情况一律浇水（与 QQ 农场一致：点一下就浇） */
      if (p.bug) return cleanBug(i);
      if (p.weed) return cleanWeed(i);
      return water(i);
    }
    return fail('未知状态');
  }

  function hoe(i) {
    var p = S.data.plots[i];
    if (p.state !== 'wild') return fail('这块地已经锄过了');
    p.state = 'tilled';
    S.data.stats.hoe++;
    S.touch();
    FARM.ui && FARM.ui.tutorialSignal('hoe');
    return ok('锄好一块地，可以播种了', { act: 'hoe' });
  }

  function sow(i, cropId) {
    var s = S.data, p = s.plots[i], c = D.CROPS[cropId];
    if (!c) return fail('没有这种作物');
    if (p.state !== 'tilled') return fail('这块地还不能播种');
    if (s.level < c.lv) return fail('Lv.' + c.lv + ' 解锁' + c.name);
    if (s.coins < c.seed) return fail('金币不足，需要 ' + c.seed);
    S.spend(c.seed);
    p.state = 'growing'; p.crop = cropId; p.at = now();
    /* 播种后水分 70：留出浇水空间，符合"种下就要浇水"的直觉 */
    p.boost = 0; p.water = 70; p.weed = 0; p.bug = 0; p.fert = 0;
    s.stats.sow++;
    S.touch();
    FARM.ui && FARM.ui.tutorialSignal('sow');
    return ok('播种 ' + c.name, { act: 'sow' });
  }

  function water(i) {
    var s = S.data, p = s.plots[i];
    if (!p.crop || p.state === 'ripe' || p.state === 'withered') return fail('这里不需要浇水');
    if (p.water >= 100) return fail('水分已满');
    if ((s.tools.waterCan || 0) > 0) s.tools.waterCan--;
    else if (!S.spend(5)) return fail('金币不足（洒水壶可免费浇水）');
    p.water = 100;
    s.stats.water++;
    S.touch();
    FARM.ui && FARM.ui.tutorialSignal('water');
    return ok('浇水完成，水分 100%', { act: 'water' });
  }

  function cleanWeed(i) {
    var s = S.data, p = s.plots[i];
    if (!p.weed) return fail('这里没有杂草');
    if ((s.tools.herbicide || 0) > 0) s.tools.herbicide--;
    p.weed = 0;
    S.gainXp(2);
    s.stats.clean++;
    S.touch();
    return ok('杂草清除干净', { act: 'clean' });
  }

  function cleanBug(i) {
    var s = S.data, p = s.plots[i];
    if (!p.bug) return fail('这里没有害虫');
    if ((s.tools.bugSpray || 0) > 0) s.tools.bugSpray--;
    else if (!S.spend(8)) return fail('金币不足（杀虫剂可免费除虫）');
    p.bug = 0;
    S.gainXp(3);
    s.stats.clean++;
    S.touch();
    FARM.sys && FARM.sys.checkAch('firstBug');
    return ok('害虫清除，作物安全了', { act: 'clean' });
  }

  function fertilize(i) {
    var s = S.data, p = s.plots[i];
    if (p.state !== 'growing') return fail('这里没有生长的作物');
    if ((s.tools.fert || 0) <= 0) return fail('没有化肥了，去商店买');
    s.tools.fert--;
    p.boost = (p.boost || 0) + plotTotal(p) * 0.3;
    p.fert = 1;
    S.touch();
    return ok('施肥完成，生长 +30%', { act: 'fert' });
  }

  function speedGrow(i) {
    var s = S.data, p = s.plots[i];
    if (p.state !== 'growing') return fail('这里没有生长的作物');
    if (s.gems < 3) return fail('钻石不足（需要 3）');
    s.gems -= 3;
    p.boost = (p.boost || 0) + plotTotal(p);
    S.touch();
    return ok('生长激素生效，立刻成熟！', { act: 'speed' });
  }

  function revive(i) {
    var s = S.data, p = s.plots[i];
    if (p.state !== 'withered') return fail('这里的作物还活着');
    if (s.gems < 5) return fail('钻石不足（需要 5）');
    s.gems -= 5;
    p.state = 'ripe';
    S.touch();
    return ok('复活成功，可以收获了', { act: 'revive' });
  }

  function clearPlot(i) {
    var p = S.data.plots[i];
    if (p.state === 'wild' || p.state === 'tilled') return fail('这里没什么可清理的');
    var wasCrop = p.crop;
    p.state = 'tilled'; p.crop = null; p.at = 0; p.boost = 0;
    p.weed = 0; p.bug = 0; p.fert = 0; p.water = 100;
    S.touch();
    return ok('清理完成' + (wasCrop ? '（损失了 ' + D.CROPS[wasCrop].name + '）' : ''), { act: 'clear' });
  }

  function harvest(i) {
    var s = S.data, p = s.plots[i];
    if (p.state !== 'ripe') return fail('还没成熟');
    var c = D.CROPS[p.crop];
    if (S.itemTotal() >= s.cap) return fail('仓库已满，先卖一些');
    var bonus = (weather().yield || 0) * (1 + decorBuff('yield'));
    var n = Math.max(1, Math.round((c.yield + bonus) * (1 + petBuff('yield') + techBuff('yield'))));
    S.add(p.crop, n);
    S.gainXp(c.xp);
    s.stats.harvest++;
    if (s.dex.crops[p.crop] === undefined) s.dex.crops[p.crop] = 0;
    s.dex.crops[p.crop] += n;
    var name = c.name;
    p.state = 'tilled'; p.crop = null; p.at = 0; p.boost = 0; p.fert = 0;
    S.touch();
    FARM.sys && FARM.sys.checkAch('firstHarvest');
    FARM.sys && FARM.sys.dailyTick('harvest', 1);
    FARM.ui && FARM.ui.tutorialSignal('harvest');
    return ok('收获 ' + name + ' ×' + n, { act: 'harvest', item: p.crop });
  }

  /* ---------- 批量操作 ---------- */
  function harvestAll() {
    var s = S.data, n = 0, got = {};
    for (var i = 0; i < s.plots.length; i++) {
      var p = s.plots[i];
      if (p.state === 'ripe' && S.itemTotal() < s.cap) {
        var r = harvest(i);
        if (r.ok) { n++; }
      }
    }
    return n ? ok('一键收获 ' + n + ' 块地', { act: 'harvestAll' }) : fail('没有可收获的作物');
  }
  function waterAll() {
    var s = S.data, n = 0;
    for (var i = 0; i < s.plots.length; i++) {
      var p = s.plots[i];
      if (p.state === 'growing' && p.water < 95) { p.water = 100; n++; s.stats.water++; }
    }
    if (!n) return fail('没有需要浇水的地');
    S.touch();
    return ok('浇水 ' + n + ' 块地', { act: 'waterAll' });
  }
  function cleanAll() {
    var s = S.data, n = 0;
    for (var i = 0; i < s.plots.length; i++) {
      var p = s.plots[i];
      if (p.weed) { p.weed = 0; n++; }
      if (p.bug) { p.bug = 0; n++; }
    }
    if (!n) return fail('没有杂草或害虫');
    s.stats.clean += n;
    S.touch();
    return ok('清理 ' + n + ' 处', { act: 'cleanAll' });
  }
  function ripeCount() {
    var s = S.data, n = 0;
    for (var i = 0; i < s.plots.length; i++) if (s.plots[i].state === 'ripe') n++;
    return n;
  }

  /* ================= 牧场 ================= */
  function buyAnimal(i, animalId) {
    var s = S.data, pen = s.pens[i], a = D.ANIMALS[animalId];
    if (!pen) return fail('栏位不存在');
    if (pen.locked) return fail('栏位还没解锁');
    if (!a) return fail('没有这种动物');
    if (s.level < a.lv) return fail('Lv.' + a.lv + ' 解锁' + a.name);
    if (pen.animal && pen.animal !== animalId) return fail('这个栏位养了别的动物');
    if (pen.count >= a.cap) return fail('最多养 ' + a.cap + ' 只');
    if (s.coins < a.cost) return fail('金币不足，需要 ' + a.cost);
    S.spend(a.cost);
    pen.animal = animalId; pen.count++;
    pen.mood = 100; pen.dirty = 0;
    if (pen.count === 1) { pen.readyAt = now() + a.cycle * 1000; pen.pending = 0; }
    if (s.dex.animals[animalId] === undefined) s.dex.animals[animalId] = 0;
    s.dex.animals[animalId]++;
    S.touch();
    FARM.sys && FARM.sys.checkAch('firstAnimal');
    FARM.ui && FARM.ui.tutorialSignal('buyAnimal');
    return ok('购入 ' + a.name + '（' + pen.count + '/' + a.cap + '）', { act: 'buyAnimal' });
  }

  function feedPen(i) {
    var s = S.data, pen = s.pens[i];
    if (!pen || !pen.animal) return fail('栏位是空的');
    var a = D.ANIMALS[pen.animal];
    for (var k in a.feed) {
      if (!S.has(k, a.feed[k] * pen.count)) return fail('饲料不足：' + FARM.itemName(k) + ' ×' + (a.feed[k] * pen.count));
    }
    for (var k2 in a.feed) S.add(k2, -a.feed[k2] * pen.count);
    pen.mood = Math.min(100, (pen.mood || 0) + 40);
    if (!pen.readyAt || pen.readyAt < now()) pen.readyAt = now() + a.cycle * 1000;
    s.stats.feed++;
    S.touch();
    FARM.sys && FARM.sys.dailyTick('feed', 1);
    FARM.ui && FARM.ui.tutorialSignal('feed');
    return ok(a.name + '吃饱了，心情 +40', { act: 'feed' });
  }

  function petPen(i) {
    var pen = S.data.pens[i];
    if (!pen || !pen.animal) return fail('栏位是空的');
    pen.bond = Math.min(100, (pen.bond || 0) + 3);
    pen.mood = Math.min(100, (pen.mood || 0) + 6);
    S.touch();
    return ok('亲密度 +3（产量 +' + Math.floor(pen.bond / 2) + '%）', { act: 'pet' });
  }

  function cleanPen(i) {
    var pen = S.data.pens[i];
    if (!pen || !pen.animal) return fail('栏位是空的');
    if (!pen.dirty) return fail('栏位很干净');
    pen.dirty = 0;
    pen.mood = Math.min(100, (pen.mood || 0) + 12);
    S.data.stats.clean++;
    S.touch();
    return ok('打扫干净，心情 +12', { act: 'cleanPen' });
  }

  function collectPen(i) {
    var s = S.data, pen = s.pens[i];
    if (!pen || !pen.animal) return fail('栏位是空的');
    var q = pen.pending || 0;
    if (!q) return fail('还没有产出');
    var a = D.ANIMALS[pen.animal], got = [], total = 0;
    for (var k in a.out) { total += a.out[k] * q; }
    if (S.itemTotal() + total > s.cap) return fail('仓库快满了');
    for (var k2 in a.out) {
      var n = Math.round(a.out[k2] * q * (1 + (pen.bond || 0) / 200) * (1 + petBuff('animal') + techBuff('animal')));
      S.add(k2, n);
      if (s.dex.goods[k2] === undefined) s.dex.goods[k2] = 0;
      s.dex.goods[k2] += n;
      got.push(FARM.itemName(k2) + ' ×' + n);
    }
    S.gainXp(a.xp * q);
    pen.pending = 0;
    S.touch();
    return ok('收取：' + got.join('、'), { act: 'collect' });
  }

  function animalStep(pen, dt) {
    if (!pen || !pen.animal || pen.locked) return;
    var a = D.ANIMALS[pen.animal];
    pen.mood = Math.max(0, (pen.mood || 0) - dt * (35 / 3600));
    if (Math.random() < dt * 0.0008) pen.dirty = 1;
    if (pen.dirty) pen.mood = Math.max(0, pen.mood - dt * 0.002);
    if (!pen.readyAt) pen.readyAt = now() + a.cycle * 1000;
    var guard = 0;
    while (pen.readyAt <= now() && guard++ < 500) {
      if ((pen.mood || 0) < 25) break;
      var enough = true;
      for (var k in a.feed) if (!S.has(k, a.feed[k] * pen.count)) { enough = false; break; }
      if (!enough) break;
      for (var k2 in a.feed) S.add(k2, -a.feed[k2] * pen.count);
      pen.pending = (pen.pending || 0) + pen.count;
      pen.readyAt += a.cycle * 1000;
      pen.mood = Math.max(0, (pen.mood || 0) - 4);
    }
    if (pen.readyAt > now() + a.cycle * 1000 * 2) pen.readyAt = now() + a.cycle * 1000;
  }

  function collectAllPens() {
    var s = S.data, n = 0;
    for (var i = 0; i < s.pens.length; i++) {
      if (s.pens[i].pending) { if (collectPen(i).ok) n++; }
    }
    return n ? ok('收取 ' + n + ' 个栏位', { act: 'collectAll' }) : fail('没有可收取的产出');
  }

  /* ================= 加工厂 ================= */
  function factorySlots(f) { return 2 + (f.lv - 1); }
  function factorySpeed(f) { return (1 + (f.lv - 1) * 0.22) * (1 + techBuff('craft')); }

  function buildFactory(id) {
    var s = S.data, cfg = D.FACTORIES[id];
    if (!cfg) return fail('未知建筑');
    if (s.factories[id]) return fail('已经建过了');
    if (s.level < cfg.lv) return fail('Lv.' + cfg.lv + ' 解锁');
    if (!S.spend(cfg.build)) return fail('金币不足，需要 ' + cfg.build);
    s.factories[id] = { lv: 1, queue: [] };
    S.touch();
    FARM.ui && FARM.ui.tutorialSignal('buildFactory');
    return ok('建成 ' + cfg.name, { act: 'buildFactory' });
  }

  function upgradeFactory(id) {
    var s = S.data, f = s.factories[id];
    if (!f) return fail('还没建造');
    if (f.lv >= 5) return fail('已满级');
    var cost = D.FACTORIES[id].upCost * f.lv;
    if (!S.spend(cost)) return fail('金币不足，需要 ' + cost);
    f.lv++; S.touch();
    return ok(D.FACTORIES[id].name + ' 升到 ' + f.lv + ' 级', { act: 'upFactory' });
  }

  function startRecipe(fid, rid) {
    var s = S.data, f = s.factories[fid], rp = D.RECIPES[rid];
    if (!f) return fail('还没有这座工厂');
    if (rp.factory !== fid) return fail('配方不匹配');
    if (f.queue.length >= factorySlots(f)) return fail('队列已满');
    for (var k in rp.in) if (!S.has(k, rp.in[k])) return fail('原料不足：' + FARM.itemName(k) + ' ×' + rp.in[k]);
    for (var k2 in rp.in) S.add(k2, -rp.in[k2]);
    f.queue.push({ rid: rid, endAt: now() + (rp.time * 1000) / factorySpeed(f) });
    S.touch();
    return ok('开始生产 ' + rp.name, { act: 'craft' });
  }

  function factoryStep(fid) {
    var s = S.data, f = s.factories[fid];
    if (!f) return;
    for (var i = f.queue.length - 1; i >= 0; i--) {
      var q = f.queue[i];
      if (q.endAt > now()) continue;
      var rp = D.RECIPES[q.rid], total = 0;
      for (var k in rp.out) total += rp.out[k];
      if (S.itemTotal() + total > s.cap) continue;
      for (var k2 in rp.out) {
        S.add(k2, rp.out[k2]);
        if (s.dex.goods[k2] === undefined) s.dex.goods[k2] = 0;
        s.dex.goods[k2] += rp.out[k2];
      }
      S.gainXp(rp.xp);
      s.stats.craft++;
      f.queue.splice(i, 1);
      FARM.sys && FARM.sys.checkAch('firstCraft');
      FARM.sys && FARM.sys.dailyTick('craft', 1);
    }
  }

  function rushFactory(fid, idx) {
    var s = S.data, f = s.factories[fid];
    if (!f || !f.queue[idx]) return fail('队列为空');
    if (s.gems < 2) return fail('钻石不足（需要 2）');
    s.gems -= 2;
    f.queue[idx].endAt = now();
    S.touch();
    return ok('加急完成', { act: 'rush' });
  }

  /* ================= 分店 ================= */
  function shopInfo(shopId) {
    var s = S.data, sh = s.shops[shopId], cfg = D.SHOPS[shopId];
    if (!sh) return { price: 0, flow: 1, speed: 1, charm: 0 };
    var priceBonus = 0, charm = sh.charm || 0, flow = 0, speed = 0;
    for (var k in sh.staff) {
      var b = D.STAFF[k].bonus;
      if (b.price) priceBonus += b.price * sh.staff[k];
      if (b.charm) charm += b.charm * sh.staff[k];
      if (b.flow) flow += b.flow * sh.staff[k];
      if (b.speed) speed += b.speed * sh.staff[k];
    }
    var base = cfg.basePrice * (1 + (sh.lv - 1) * 0.18);
    var mult = (1 + priceBonus) * (1 + charm * 0.02) * (0.55 + (sh.rep / 100) * 0.45)
      * (1 + techBuff('shopPrice'));
    /* 招牌菜：库存里有招牌菜时客单价 +35% */
    var sig = 0;
    if (sh.signature && D.DISHES && (sh.stock[sh.signature] || 0) > 0) sig = 0.35;
    return { price: base * mult * (1 + sig), flow: 1 + flow, speed: 1 + speed, charm: charm, sig: sig };
  }

  /* 设置招牌菜（店铺 3 级解锁）：把厨房做的菜调拨过来即可生效 */
  function setSignature(shopId, dishId) {
    var s = S.data, sh = s.shops[shopId];
    if (!sh) return fail('还没开店');
    if (sh.lv < 3) return fail('店铺 3 级才能设招牌菜');
    var valid = false;
    for (var k in D.DISHES) if (D.DISHES[k].out === dishId) valid = true;
    if (dishId && !valid) return fail('这道菜不能当招牌菜');
    sh.signature = dishId || null;
    S.touch();
    return ok(dishId ? ('招牌菜设为 ' + FARM.itemName(dishId) + '（客单价 +35%）') : '已取消招牌菜', { act: 'signature' });
  }

  function buildShop(id) {
    var s = S.data, cfg = D.SHOPS[id];
    if (s.shops[id]) return fail('已经开过了');
    if (s.level < cfg.lv) return fail('Lv.' + cfg.lv + ' 解锁');
    if (!S.spend(cfg.build)) return fail('金币不足，需要 ' + cfg.build);
    s.shops[id] = { lv: 1, charm: 0, staff: {}, decor: [], stock: {},
      nextAt: now() + 15000, rep: 60, promo: 0, revenue: 0, served: 0, wageAt: now() + 300000 };
    S.touch();
    FARM.sys && FARM.sys.checkAch('firstShop');
    FARM.ui && FARM.ui.tutorialSignal('buildShop');
    return ok(cfg.name + ' 开业！', { act: 'buildShop' });
  }

  function upgradeShop(id) {
    var s = S.data, sh = s.shops[id];
    if (!sh) return fail('还没开店');
    if (sh.lv >= 10) return fail('已满级');
    var cost = D.SHOPS[id].upCost * sh.lv;
    if (!S.spend(cost)) return fail('金币不足，需要 ' + cost);
    sh.lv++; S.touch();
    return ok(D.SHOPS[id].name + ' 升到 ' + sh.lv + ' 级', { act: 'upShop' });
  }

  function hire(shopId, staffId) {
    var s = S.data, sh = s.shops[shopId], cfg = D.STAFF[staffId];
    if (!sh) return fail('还没开店');
    if (sh.lv < 2) return fail('店铺 2 级才能雇人');
    var cost = Math.floor(cfg.hire * (1 + Object.keys(sh.staff).length * 0.5));
    if (!S.spend(cost)) return fail('金币不足，需要 ' + cost);
    sh.staff[staffId] = (sh.staff[staffId] || 0) + 1;
    S.touch();
    return ok('雇佣 ' + cfg.name, { act: 'hire' });
  }

  function buyDecor(shopId, decorId) {
    var s = S.data, sh = s.shops[shopId], d = null;
    D.DECOR.forEach(function (x) { if (x.id === decorId) d = x; });
    if (!sh || !d) return fail('不可购买');
    if (sh.decor.indexOf(decorId) >= 0) return fail('已经买过了');
    if (!S.spend(d.cost)) return fail('金币不足，需要 ' + d.cost);
    sh.decor.push(decorId);
    sh.charm = (sh.charm || 0) + d.charm;
    S.touch();
    return ok('装修：' + d.name + '（魅力 +' + d.charm + '）', { act: 'decor' });
  }

  function buyFarmDecor(id) {
    var s = S.data, d = null;
    D.FARM_DECOR.forEach(function (x) { if (x.id === id) d = x; });
    if (!d) return fail('没有这个装饰');
    if (s.farmDecor.indexOf(id) >= 0) return fail('已经买过了');
    if (!S.spend(d.cost)) return fail('金币不足，需要 ' + d.cost);
    s.farmDecor.push(id);
    S.touch();
    FARM.sys && FARM.sys.checkAch('decorAll');
    return ok('建成 ' + d.name + '：' + d.desc, { act: 'farmDecor' });
  }

  function buyTool(id, n) {
    var s = S.data, t = D.TOOLS[id];
    n = n || 1;
    if (!t) return fail('没有这个道具');
    var cost = t.cost * n, gem = t.gem * n;
    if (gem > 0) { if (s.gems < gem) return fail('钻石不足'); s.gems -= gem; }
    else if (!S.spend(cost)) return fail('金币不足，需要 ' + cost);
    s.tools[id] = (s.tools[id] || 0) + n;
    S.touch();
    return ok('购买 ' + t.name + ' ×' + n, { act: 'buyTool' });
  }

  function transfer(shopId, itemId, n) {
    var s = S.data, sh = s.shops[shopId];
    if (!sh) return fail('还没开店');
    if (!S.has(itemId, n)) return fail('仓库里没有这么多 ' + FARM.itemName(itemId));
    S.add(itemId, -n);
    sh.stock[itemId] = (sh.stock[itemId] || 0) + n;
    S.touch();
    return ok('调拨 ' + FARM.itemName(itemId) + ' ×' + n, { act: 'transfer' });
  }

  function shopStep(shopId) {
    var s = S.data, sh = s.shops[shopId], cfg = D.SHOPS[shopId];
    if (!sh) return;
    var info = shopInfo(shopId);
    var interval = (cfg.interval * 1000) / info.flow / info.speed;
    if (!sh.nextAt) sh.nextAt = now() + interval;
    var guard = 0;
    while (sh.nextAt <= now() && guard++ < 300) {
      var canServe = true;
      for (var k in cfg.consume) if ((sh.stock[k] || 0) < cfg.consume[k]) { canServe = false; break; }
      if (!canServe) { sh.rep = Math.max(20, sh.rep - 3); sh.nextAt += interval; continue; }
      for (var k2 in cfg.consume) sh.stock[k2] -= cfg.consume[k2];
      var sigOn = false;
      if (sh.signature && (sh.stock[sh.signature] || 0) > 0) {
        sh.stock[sh.signature]--;
        sigOn = true;
        sh.rep = Math.min(100, sh.rep + 0.3);
      }
      var money = Math.round(info.price * (1 + (sigOn ? 0.35 : 0)) * (sh.promo > now() ? 1.8 : 1));
      S.earn(money);
      S.gainXp(Math.max(2, Math.round(money / 45)));
      sh.revenue = (sh.revenue || 0) + money;
      sh.served = (sh.served || 0) + 1;
      sh.rep = Math.min(100, sh.rep + 0.6);
      s.stats.serve++;
      FARM.sys && FARM.sys.dailyTick('serve', 1);
      sh.nextAt += interval;
    }
    if (sh.nextAt < now()) sh.nextAt = now() + interval;
    if (sh.wageAt && sh.wageAt <= now()) {
      var wage = 0;
      for (var st in sh.staff) wage += D.STAFF[st].wage * sh.staff[st];
      if (wage > 0) {
        if (s.coins >= wage) { S.spend(wage); FARM.ui && FARM.ui.toast('支付工资 -' + wage, 'warn'); }
        else sh.rep = Math.max(20, sh.rep - 8);
      }
      sh.wageAt = now() + 300000;
    }
  }

  function promoShop(id) {
    var s = S.data, sh = s.shops[id];
    if (!sh) return fail('还没开店');
    if (s.gems < 3) return fail('钻石不足（需要 3）');
    s.gems -= 3;
    sh.promo = now() + 60000;
    S.touch();
    return ok('促销开始，60 秒内客单价 +80%', { act: 'promo' });
  }

  /* ================= 订单 ================= */
  function refreshOrders(force) {
    var s = S.data;
    if (!force && s.orders.length >= 3) return;
    var pool = D.ORDER_POOL.filter(function (o) { return o.lv <= s.level + 1; });
    var tmp = pool.slice(), picked = [];
    while (picked.length < 3 && tmp.length) picked.push(tmp.splice(Math.floor(Math.random() * tmp.length), 1)[0]);
    s.orders = picked.map(function (o) { return { oid: o.id, need: o.need, pay: o.pay, xp: o.xp }; });
    s.lastOrderAt = now();
    S.touch();
  }

  function deliverOrder(idx) {
    var s = S.data, o = s.orders[idx];
    if (!o) return fail('订单不存在');
    for (var k in o.need) if (!S.has(k, o.need[k])) return fail('缺货：' + FARM.itemName(k) + ' ×' + o.need[k]);
    for (var k2 in o.need) S.add(k2, -o.need[k2]);
    var pay = Math.round(o.pay * (1 + petBuff('order') + techBuff('orderPay')));
    S.earn(pay);
    S.gainXp(o.xp);
    s.stats.orders++;
    s.orders.splice(idx, 1);
    S.touch();
    FARM.sys && FARM.sys.checkAch('firstOrder');
    FARM.sys && FARM.sys.dailyTick('order', 1);
    FARM.sys && FARM.sys.dailyTick('earn', pay);
    return ok('订单完成 +' + pay + ' 金币', { act: 'order' });
  }

  /* ================= 交易 / 扩建 ================= */
  function sell(itemId, n) {
    if (!S.has(itemId, n)) return fail('数量不足');
    var money = FARM.itemPrice(itemId) * n;
    S.add(itemId, -n);
    S.earn(money);
    S.gainXp(Math.max(1, Math.round(n / 2)));
    S.touch();
    FARM.sys && FARM.sys.dailyTick('earn', money);
    return ok('卖出 ' + FARM.itemName(itemId) + ' ×' + n + '，+' + money, { act: 'sell' });
  }

  function nextPlotUnlock() {
    var s = S.data;
    for (var i = 0; i < s.plots.length; i++) {
      if (s.plots[i].locked) {
        var u = null;
        D.PLOT_UNLOCKS.forEach(function (x) { if (x.index === i) u = x; });
        return u ? { index: i, cfg: u } : null;
      }
    }
    return null;
  }

  function expandPlot() {
    var nx = nextPlotUnlock();
    if (!nx) return fail('全部土地已开垦');
    var s = S.data;
    if (s.level < nx.cfg.lv) return fail('Lv.' + nx.cfg.lv + ' 解锁');
    if (!S.spend(nx.cfg.cost)) return fail('金币不足，需要 ' + nx.cfg.cost);
    s.plots[nx.index].locked = 0;
    s.plots[nx.index].state = 'wild';
    S.touch();
    FARM.sys && FARM.sys.checkAch('land18');
    FARM.sys && FARM.sys.checkAch('land36');
    return ok('开垦第 ' + (nx.index + 1) + ' 块地', { act: 'expandPlot' });
  }

  function nextPenUnlock() {
    var s = S.data;
    for (var i = 0; i < s.pens.length; i++) {
      if (s.pens[i].locked) {
        var u = null;
        D.PEN_UNLOCKS.forEach(function (x) { if (x.index === i) u = x; });
        return u ? { index: i, cfg: u } : null;
      }
    }
    return null;
  }

  function expandPen() {
    var nx = nextPenUnlock();
    if (!nx) return fail('全部栏位已解锁');
    var s = S.data;
    if (s.level < nx.cfg.lv) return fail('Lv.' + nx.cfg.lv + ' 解锁');
    if (!S.spend(nx.cfg.cost)) return fail('金币不足，需要 ' + nx.cfg.cost);
    s.pens[nx.index].locked = 0;
    S.touch();
    FARM.sys && FARM.sys.checkAch('pen12');
    return ok('解锁第 ' + (nx.index + 1) + ' 个栏位', { act: 'expandPen' });
  }

  function upgradeCap() {
    var s = S.data;
    var times = Math.round((s.cap - K.WAREHOUSE_BASE) / 150);
    var cost = Math.floor(800 * Math.pow(1.55, times));
    if (!S.spend(cost)) return fail('金币不足，需要 ' + cost);
    s.cap += 150;
    S.touch();
    return ok('仓库扩容至 ' + s.cap, { act: 'upCap' });
  }

  /* ================= 主循环 ================= */
  function tick() {
    var s = S.data;
    for (var i = 0; i < s.plots.length; i++) {
      var p = s.plots[i];
      plotStep(p, 1);
      if (p.state === 'ripe' && p.ripeAt && now() - p.ripeAt > witherMs()) {
        p.state = 'withered';
        S.touch();
      }
    }
    plotEvents();
    for (var j = 0; j < s.pens.length; j++) animalStep(s.pens[j], 1);
    Object.keys(s.factories).forEach(function (fid) { factoryStep(fid); });
    Object.keys(s.shops).forEach(function (sid) { shopStep(sid); });
    if (now() - (s.lastOrderAt || 0) > 180000 || !s.orders.length) refreshOrders();
    FARM.exp && FARM.exp.tick();      /* 拓展玩法：果园 / 鱼塘 / 矿洞 / 厨房 */
    FARM.tech && FARM.tech.tick();    /* 研究院：在研项目推进 */
    FARM.sys && FARM.sys.tick();
    s.lastSeen = now();
  }

  /* 离线结算 */
  function catchUp(s, seconds) {
    var report = { coins: 0, ripe: 0, produce: 0, craft: 0, served: 0 };
    if (seconds <= 0) return report;
    var c0 = s.coins;
    // 作物：按时间戳自然推进，但需处理枯萎与水分
    for (var i = 0; i < s.plots.length; i++) {
      var p = s.plots[i];
      if (p.locked || p.state !== 'growing') continue;
      p.water = Math.max(0, p.water - seconds * (100 / 900));
      if (p.water <= 0) p.boost = (p.boost || 0) - seconds * 1000;
      if (plotProgress(p) >= 1) { p.state = 'ripe'; p.ripeAt = now() - Math.min(seconds * 1000, witherMs() - 1000); report.ripe++; }
    }
    for (var j = 0; j < s.pens.length; j++) {
      var before = s.pens[j].pending || 0;
      animalStep(s.pens[j], seconds);
      report.produce += (s.pens[j].pending || 0) - before;
    }
    Object.keys(s.factories).forEach(function (fid) {
      var f = s.factories[fid], guard = 0;
      while (guard++ < 40) {
        var n0 = f.queue.length;
        factoryStep(fid);
        var pending = f.queue.filter(function (q) { return q.endAt <= now(); });
        if (!pending.length && n0 === f.queue.length) break;
        f.queue.forEach(function (q) { if (q.endAt > now()) q.endAt = now(); });
      }
      report.craft += 0;
    });
    Object.keys(s.shops).forEach(function (sid) {
      var sh = s.shops[sid];
      if (sh.nextAt) sh.nextAt = Math.min(sh.nextAt, now() + 3000);
      var c1 = s.coins;
      shopStep(sid);
      report.served += 0;
    });
    if (FARM.exp) FARM.exp.catchUp(seconds);
    report.coins = Math.max(0, s.coins - c0);
    s.stats.offline += Math.floor(seconds);
    S.touch();
    return report;
  }

  FARM.sim = {
    plotClick: plotClick, hoe: hoe, sow: sow, water: water, cleanWeed: cleanWeed,
    cleanBug: cleanBug, fertilize: fertilize, speedGrow: speedGrow, revive: revive,
    clearPlot: clearPlot, harvest: harvest, harvestAll: harvestAll, waterAll: waterAll,
    cleanAll: cleanAll, ripeCount: ripeCount,
    plotProgress: plotProgress, plotStage: plotStage, plotTotal: plotTotal, plotStep: plotStep,
    growSpeed: growSpeed, seasonFit: seasonFit, weather: weather, season: season, decorBuff: decorBuff,
    buyAnimal: buyAnimal, feedPen: feedPen, petPen: petPen, cleanPen: cleanPen,
    collectPen: collectPen, collectAllPens: collectAllPens, animalStep: animalStep,
    buildFactory: buildFactory, upgradeFactory: upgradeFactory, startRecipe: startRecipe,
    factorySlots: factorySlots, factorySpeed: factorySpeed, rushFactory: rushFactory,
    buildShop: buildShop, upgradeShop: upgradeShop, hire: hire, buyDecor: buyDecor,
    buyFarmDecor: buyFarmDecor, buyTool: buyTool, transfer: transfer, promoShop: promoShop,
    shopInfo: shopInfo, setSignature: setSignature,
    refreshOrders: refreshOrders, deliverOrder: deliverOrder,
    sell: sell, expandPlot: expandPlot, expandPen: expandPen, upgradeCap: upgradeCap,
    nextPlotUnlock: nextPlotUnlock, nextPenUnlock: nextPenUnlock,
    tick: tick, catchUp: catchUp
  };
})(window);

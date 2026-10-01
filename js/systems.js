/* ==========================================================
 *  systems.js — 天气 / 季节 / 邻居 / 每日任务 / 成就 / 图鉴
 * ========================================================== */
(function (global) {
  'use strict';
  var FARM = (global.FARM = global.FARM || {});
  var D = FARM.DATA, S = FARM.state, K = D.CONST;
  var now = FARM.now;

  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  /* ================= 天气 ================= */
  function rollWeather() {
    var ids = Object.keys(D.WEATHER);
    var w = ids[Math.floor(Math.random() * ids.length)];
    // 冬季更容易落雪
    if (S.data.season.id === 'winter' && Math.random() < 0.5) w = 'snow';
    S.data.weather = { id: w, until: now() + K.WEATHER_MS };
    S.touch();
    if (FARM.ui) FARM.ui.weatherToast(D.WEATHER[w]);
  }

  /* ================= 季节 ================= */
  var SEASON_ORDER = ['spring', 'summer', 'autumn', 'winter'];
  function rollSeason() {
    var cur = S.data.season.id;
    var idx = (SEASON_ORDER.indexOf(cur) + 1) % 4;
    S.data.season = { id: SEASON_ORDER[idx], until: now() + K.SEASON_MS };
    S.touch();
    if (FARM.ui) FARM.ui.toast('季节更替：' + D.SEASONS[SEASON_ORDER[idx]].name, 'ok');
  }

  /* ================= 成就 ================= */
  function checkAch(id) {
    var s = S.data;
    if (s.ach[id]) return;
    var a = null;
    D.ACHIEVEMENTS.forEach(function (x) { if (x.id === id) a = x; });
    if (!a) return;
    s.ach[id] = true;
    if (a.reward.coins) S.earn(a.reward.coins);
    if (a.reward.gem) s.gems += a.reward.gem;
    S.touch();
    FARM.ui && FARM.ui.achievement(a);
  }

  function unlockedPlots() {
    var n = 0;
    S.data.plots.forEach(function (p) { if (!p.locked) n++; });
    return n;
  }
  function unlockedPens() {
    var n = 0;
    S.data.pens.forEach(function (p) { if (!p.locked) n++; });
    return n;
  }

  function checkStatAch() {
    var s = S.data;
    if (s.stats.earned >= 50000) checkAch('rich1');
    if (s.stats.earned >= 500000) checkAch('rich2');
    if (s.stats.earned >= 5000000) checkAch('rich3');
    if (s.stats.harvest >= 50) checkAch('harvest50');
    if (s.stats.harvest >= 300) checkAch('harvest300');
    if (s.stats.harvest >= 1000) checkAch('harvest1000');
    if (s.stats.craft >= 100) checkAch('craft100');
    if (s.stats.serve >= 100) checkAch('serve100');
    if (s.stats.serve >= 1000) checkAch('serve1000');
    if (s.stats.orders >= 50) checkAch('order50');
    if (s.stats.help >= 10) checkAch('help10');
    if (s.level >= 10) checkAch('lvl10');
    if (s.level >= 20) checkAch('lvl20');
    if (unlockedPlots() >= 18) checkAch('land18');
    if (unlockedPlots() >= 36) checkAch('land36');
    if (unlockedPens() >= 12) checkAch('pen12');
    if (Object.keys(s.factories).length >= 10) checkAch('factoryAll');
    if (Object.keys(s.shops).length >= 5) checkAch('shop5');
    if (s.farmDecor.length >= D.FARM_DECOR.length) checkAch('decorAll');
    // 图鉴
    var allCrops = Object.keys(D.CROPS).every(function (c) { return s.dex.crops[c] > 0; });
    if (allCrops) checkAch('cropAll');
    var allAnimals = Object.keys(D.ANIMALS).every(function (a) { return s.dex.animals[a] > 0; });
    if (allAnimals) checkAch('animalAll');
    // 全链路
    var hasCrop = s.plots.some(function (p) { return p.crop; });
    var hasAnimal = s.pens.some(function (p) { return p.animal; });
    var hasCraft = Object.keys(s.factories).length > 0;
    var hasShop = Object.keys(s.shops).length > 0;
    if (hasCrop && hasAnimal && hasCraft && hasShop) checkAch('fullChain');
  }

  /* ================= 每日任务 ================= */
  function rollDaily(force) {
    var s = S.data;
    if (!force && s.daily.date === today()) return;
    var pool = D.DAILY_POOL.filter(function (t) { return t.need.earn ? s.level >= 3 : true; });
    var tmp = pool.slice(), picked = [];
    while (picked.length < 3 && tmp.length) {
      picked.push(tmp.splice(Math.floor(Math.random() * tmp.length), 1)[0]);
    }
    s.daily = {
      date: today(),
      list: picked.map(function (t) {
        return { id: t.id, desc: t.desc, need: t.need, prog: 0, reward: t.reward, done: false };
      }),
      claimed: false
    };
    S.touch();
  }

  function dailyTick(key, n) {
    var s = S.data;
    if (!s.daily.list) return;
    var changed = false;
    s.daily.list.forEach(function (t) {
      if (t.done || t.need[key] === undefined) return;
      t.prog += n;
      if (t.prog >= t.need[key]) { t.done = true; changed = true; FARM.ui && FARM.ui.toast('每日任务完成：' + t.desc, 'ok'); }
    });
    if (changed) S.touch();
  }

  function dailyAllDone() {
    return S.data.daily.list && S.data.daily.list.every(function (t) { return t.done; });
  }

  function claimDaily() {
    var s = S.data;
    if (s.daily.claimed) return { ok: false, msg: '今天已经领过了' };
    if (!dailyAllDone()) return { ok: false, msg: '还有任务没完成' };
    var coins = 0, gems = 0;
    s.daily.list.forEach(function (t) { coins += t.reward.coins; gems += t.reward.gem; });
    S.earn(coins);
    s.gems += gems;
    s.daily.claimed = true;
    S.touch();
    return { ok: true, msg: '领取每日奖励：+' + coins + ' 金币 +' + gems + ' 钻石' };
  }

  /* ================= 邻居农场（串门 / 偷菜） ================= */
  function genNeighbors() {
    var s = S.data;
    var crops = Object.keys(D.CROPS).filter(function (c) { return D.CROPS[c].lv <= s.level + 2; });
    if (!crops.length) crops = ['wheat', 'carrot'];
    var names = D.NEIGHBOR_NAMES.slice();
    var out = [];
    for (var i = 0; i < 5; i++) {
      var ni = Math.floor(Math.random() * names.length);
      var nm = names.splice(ni, 1)[0];
      var plots = [];
      var n = 4 + Math.floor(Math.random() * 3);
      for (var j = 0; j < n; j++) {
        var ripe = Math.random() < 0.55;
        plots.push({
          crop: crops[Math.floor(Math.random() * crops.length)],
          state: ripe ? 'ripe' : 'growing',
          weed: !ripe && Math.random() < 0.4 ? 1 : 0,
          bug: !ripe && Math.random() < 0.3 ? 1 : 0,
          water: Math.floor(Math.random() * 70) + 10
        });
      }
      out.push({
        name: nm,
        level: Math.max(1, s.level + Math.floor(Math.random() * 7) - 3),
        friend: 50 + Math.floor(Math.random() * 30),
        dog: Math.random() < 0.35,
        plots: plots
      });
    }
    s.neighbors = out;
    s.lastNeighborAt = now();
    S.touch();
  }

  function ensureNeighbors() {
    var s = S.data;
    if (!s.neighbors.length || now() - s.lastNeighborAt > K.NEIGHBOR_REFRESH_MS) genNeighbors();
  }

  /* 帮忙：浇水 / 除草 / 除虫 */
  function helpNeighbor(ni, pi) {
    var s = S.data, nb = s.neighbors[ni];
    if (!nb) return { ok: false, msg: '邻居不存在' };
    var p = nb.plots[pi];
    if (!p) return { ok: false, msg: '地块不存在' };
    if (p.state === 'ripe') return { ok: false, msg: '这块地已经熟了，可以摘' };
    var did = '';
    if (p.bug) { p.bug = 0; did = '除虫'; }
    else if (p.weed) { p.weed = 0; did = '除草'; }
    else if (p.water < 90) { p.water = 100; did = '浇水'; }
    else return { ok: false, msg: '这块地不需要帮忙' };
    var pay = 20 + s.level * 3;
    S.earn(pay);
    S.gainXp(4);
    nb.friend = Math.min(100, nb.friend + 3);
    s.stats.help++;
    S.touch();
    dailyTick('help', 1);
    checkAch('help10');
    return { ok: true, msg: '帮 ' + nb.name + ' ' + did + '，+' + pay + ' 金币，友好度 +3' };
  }

  /* 偷菜 */
  function stealNeighbor(ni, pi) {
    var s = S.data, nb = s.neighbors[ni];
    if (!nb) return { ok: false, msg: '邻居不存在' };
    var p = nb.plots[pi];
    if (!p) return { ok: false, msg: '地块不存在' };
    if (p.state !== 'ripe') return { ok: false, msg: '还没成熟，摘不了' };
    if (S.itemTotal() >= s.cap) return { ok: false, msg: '仓库满了' };
    var stealReduce = 1 - Math.min(0.7, Math.abs(FARM.sim.decorBuff('steal')));
    /* 看门狗宠物：降低被抓概率（buff 为负值） */
    var petDog = FARM.exp ? Math.max(0.2, 1 + FARM.exp.petBuff('steal')) : 1;
    var caught = nb.dog && Math.random() < 0.35 * stealReduce * petDog;
    if (caught) {
      var fine = Math.min(s.coins, 100 + s.level * 10);
      S.spend(fine);
      nb.friend = Math.max(0, nb.friend - 8);
      S.touch();
      return { ok: false, msg: '被 ' + nb.name + ' 家的狗逮到了！赔偿 ' + fine + ' 金币' };
    }
    var n = Math.max(1, Math.round(D.CROPS[p.crop].yield / 2));
    S.add(p.crop, n);
    S.gainXp(Math.round(D.CROPS[p.crop].xp / 2));
    nb.friend = Math.max(0, nb.friend - 4);
    p.state = 'tilled';
    s.stats.steal++;
    S.touch();
    checkAch('firstSteal');
    return { ok: true, msg: '从 ' + nb.name + ' 摘到 ' + FARM.itemName(p.crop) + ' ×' + n + '（友好度 -4）' };
  }

  /* ================= 主 tick ================= */
  function tick() {
    var s = S.data;
    if (now() > s.weather.until) rollWeather();
    if (now() > s.season.until) rollSeason();
    rollDaily();
    ensureNeighbors();
    checkStatAch();
    if (FARM.exp && FARM.exp.checkAch) FARM.exp.checkAch();   /* 拓展成就 */
  }

  FARM.sys = {
    tick: tick, checkAch: checkAch, checkStatAch: checkStatAch,
    rollDaily: rollDaily, dailyTick: dailyTick, dailyAllDone: dailyAllDone,
    claimDaily: claimDaily, today: today,
    genNeighbors: genNeighbors, ensureNeighbors: ensureNeighbors,
    helpNeighbor: helpNeighbor, stealNeighbor: stealNeighbor,
    rollWeather: rollWeather, rollSeason: rollSeason,
    unlockedPlots: unlockedPlots, unlockedPens: unlockedPens
  };
})(window);

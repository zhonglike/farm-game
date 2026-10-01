/* ==========================================================
 *  state.js — 存档与状态层（完全体）
 *  · localStorage 自动存档（5 秒 + 关键操作 + 页面隐藏）
 *  · 离线结算（上限 12 小时）
 *  · 导出 / 导入 / 重置 / 版本迁移 / 坏档自愈
 * ========================================================== */
(function (global) {
  'use strict';
  var FARM = (global.FARM = global.FARM || {});
  var D = FARM.DATA, K = D.CONST;

  function now() { return Date.now(); }

  function newPlot() {
    return { state: 'wild', crop: null, at: 0, boost: 0, water: 100, weed: 0, bug: 0, fert: 0, ripeAt: 0 };
  }
  function newPen() {
    return { animal: null, count: 0, mood: 100, bond: 0, readyAt: 0, pending: 0, dirty: 0 };
  }
  /* 拓展：果园位 / 鱼塘位 */
  function newTreeSlot() { return { tree: null, state: 'empty', readyAt: 0, pending: 0, locked: 0 }; }
  function newPondSlot() { return { fish: null, state: 'empty', readyAt: 0, pending: 0, fed: 0, locked: 0 }; }

  function newSave() {
    var plots = [], pens = [];
    for (var i = 0; i < K.MAX_PLOTS; i++) plots.push(newPlot());
    for (var j = 0; j < K.MAX_PENS; j++) pens.push(newPen());
    // 初始只解锁前 9 块地、前 3 个栏位，其余标记为未开垦
    for (var p = K.BASE_PLOTS; p < K.MAX_PLOTS; p++) plots[p].locked = 1;
    for (var q = K.BASE_PENS; q < K.MAX_PENS; q++) pens[q].locked = 1;

    /* 果园 8 个位，初始解锁 2 个（索引 0/1） */
    var orchard = [];
    for (var t = 0; t < K.MAX_ORCHARD; t++) {
      orchard.push(newTreeSlot());
      if (t >= K.BASE_ORCHARD) orchard[t].locked = 1;
    }
    /* 鱼塘 6 个位，初始解锁 2 个 */
    var pond = [];
    for (var f = 0; f < K.MAX_POND; f++) {
      pond.push(newPondSlot());
      if (f >= K.BASE_POND) pond[f].locked = 1;
    }

    return {
      v: K.SAVE_VERSION,
      coins: K.START_COINS, gems: K.START_GEMS,
      xp: 0, level: 1,
      lastSeen: now(), createdAt: now(),
      plots: plots, pens: pens,
      /* ===== 拓展玩法存档 ===== */
      orchard: orchard,                                  /* 果园：8 个树位 */
      pond: pond,                                        /* 鱼塘：6 个塘位 */
      mine: { lv: 1, endAt: 0, drops: null },            /* 矿洞：等级 / 挖掘结束时间 / 待领取产出 */
      kitchen: { lv: 1, queue: [] },                     /* 中央厨房：等级 / 烹饪队列 */
      pets: {},                                          /* 宠物：id -> {lv,bond} */
      tech: { lab: 1, doing: null, lv: {}, total: 0 },   /* 研究院：实验室等级 / 在研项目 / 各项科技等级 */
      /* 开局福利：10 粒小麦种子（价值 10 金币，收成 20 金币 —— 1:2 起步） */
      inv: { seed_wheat: 10 },
      cap: K.WAREHOUSE_BASE,
      factories: {},
      shops: {},
      farmDecor: [],
      tools: {},
      autoWaterUntil: 0, harvestAllUntil: 0,
      orders: [], lastOrderAt: 0,
      weather: { id: 'sunny', until: now() + K.WEATHER_MS },
      season: { id: 'spring', until: now() + K.SEASON_MS },
      lastEventAt: now(),
      daily: { date: '', list: [], claimed: false },
      ach: {},
      dex: { crops: {}, animals: {}, goods: {}, trees: {}, fish: {}, dishes: {} },
      neighbors: [], lastNeighborAt: 0,
      tutorial: { i: 0, done: false, waiting: null },
      stats: { earned: 0, harvest: 0, craft: 0, serve: 0, orders: 0, water: 0, sow: 0,
               hoe: 0, clean: 0, feed: 0, help: 0, steal: 0, offline: 0,
               tree: 0, fish: 0, mine: 0, dish: 0, pet: 0 },
      settings: { sound: true }
    };
  }

  var saveTimer = null;
  var State = {
    data: null,
    dirty: false,
    lastOffline: null,

    init: function () {
      var raw = null;
      try { raw = localStorage.getItem(K.SAVE_KEY); } catch (e) { raw = null; }
      if (!raw) {
        this.data = newSave();
      } else {
        try { this.data = this.migrate(JSON.parse(raw)); }
        catch (e) { console.warn('存档损坏，已重建', e); this.data = newSave(); }
      }
      // 离线结算
      var gap = Math.floor((now() - (this.data.lastSeen || now())) / 1000);
      if (gap > 30 && FARM.sim) {
        var rep = FARM.sim.catchUp(this.data, Math.min(gap, K.OFFLINE_CAP_H * 3600));
        this.lastOffline = { seconds: gap, report: rep };
      }
      this.data.lastSeen = now();
      this.write();
      return this.data;
    },

    migrate: function (s) {
      var base = newSave();
      if (!s || typeof s !== 'object') return base;
      var out = base;

      ['coins','gems','xp','level','cap','lastOrderAt','autoWaterUntil','harvestAllUntil','lastEventAt','lastNeighborAt']
        .forEach(function (k) { if (typeof s[k] === 'number') out[k] = s[k]; });
      if (s.createdAt) out.createdAt = s.createdAt;

      if (Array.isArray(s.plots)) {
        for (var i = 0; i < K.MAX_PLOTS; i++) {
          var p = s.plots[i];
          if (!p) { if (i >= K.BASE_PLOTS) out.plots[i].locked = 1; continue; }
          out.plots[i] = {
            state: ['wild','tilled','growing','ripe','withered'].indexOf(p.state) >= 0 ? p.state : 'wild',
            crop: D.CROPS[p.crop] ? p.crop : null,
            at: p.at || 0, boost: p.boost || 0,
            water: typeof p.water === 'number' ? p.water : 100,
            weed: p.weed ? 1 : 0, bug: p.bug ? 1 : 0, fert: p.fert || 0,
            ripeAt: p.ripeAt || 0,
            locked: i >= K.BASE_PLOTS ? 1 : (p.locked ? 1 : 0)
          };
        }
      }
      if (Array.isArray(s.pens)) {
        for (var j = 0; j < K.MAX_PENS; j++) {
          var q = s.pens[j];
          if (!q) { if (j >= K.BASE_PENS) out.pens[j].locked = 1; continue; }
          out.pens[j] = {
            animal: D.ANIMALS[q.animal] ? q.animal : null,
            count: q.count || 0,
            mood: typeof q.mood === 'number' ? q.mood : 100,
            bond: typeof q.bond === 'number' ? q.bond : 0,
            readyAt: q.readyAt || 0,
            pending: q.pending || 0,
            dirty: q.dirty || 0,
            locked: j >= K.BASE_PENS ? 1 : (q.locked ? 1 : 0)
          };
        }
      }
      /* ===== 拓展玩法迁移 ===== */
      out.orchard = out.orchard || [];
      for (var t = 0; t < K.MAX_ORCHARD; t++) {
        var ts = (s.orchard && s.orchard[t]) || null;
        out.orchard[t] = {
          tree: ts && D.ORCHARD && D.ORCHARD[ts.tree] ? ts.tree : null,
          state: ['empty', 'growing', 'ripe'].indexOf(ts && ts.state) >= 0 ? ts.state : 'empty',
          readyAt: ts && ts.readyAt || 0,
          pending: ts && ts.pending || 0,
          locked: t >= K.BASE_ORCHARD ? 1 : (ts && ts.locked ? 1 : 0)
        };
        if (!out.orchard[t].tree) { out.orchard[t].state = 'empty'; out.orchard[t].pending = 0; }
      }
      out.pond = out.pond || [];
      for (var f = 0; f < K.MAX_POND; f++) {
        var ps = (s.pond && s.pond[f]) || null;
        out.pond[f] = {
          fish: ps && D.POND_FISH && D.POND_FISH[ps.fish] ? ps.fish : null,
          state: ['empty', 'growing', 'ripe'].indexOf(ps && ps.state) >= 0 ? ps.state : 'empty',
          readyAt: ps && ps.readyAt || 0,
          pending: ps && ps.pending || 0,
          fed: ps && ps.fed ? 1 : 0,
          locked: f >= K.BASE_POND ? 1 : (ps && ps.locked ? 1 : 0)
        };
        if (!out.pond[f].fish) { out.pond[f].state = 'empty'; out.pond[f].pending = 0; }
      }
      if (s.mine && typeof s.mine === 'object') {
        out.mine = {
          lv: Math.max(1, Math.min(5, s.mine.lv || 1)),
          endAt: s.mine.endAt || 0,
          drops: (s.mine.drops && typeof s.mine.drops === 'object') ? s.mine.drops : null
        };
      }
      if (s.kitchen && typeof s.kitchen === 'object') {
        out.kitchen = {
          lv: Math.max(1, Math.min(6, s.kitchen.lv || 1)),
          queue: Array.isArray(s.kitchen.queue) ? s.kitchen.queue.filter(function (x) {
            return x && D.DISHES && D.DISHES[x.did];
          }).map(function (x) { return { did: x.did, endAt: x.endAt || 0 }; }) : []
        };
      }
      if (s.tech && typeof s.tech === 'object') {
        out.tech = {
          lab: Math.max(1, Math.min((D.LAB ? D.LAB.speed.length : 5), s.tech.lab || 1)),
          doing: null,
          lv: {},
          total: 0
        };
        if (s.tech.lv && typeof s.tech.lv === 'object') {
          Object.keys(s.tech.lv).forEach(function (k) {
            if (!D.TECH || !D.TECH[k]) return;
            out.tech.lv[k] = Math.max(0, Math.min(D.TECH[k].max, Math.floor(s.tech.lv[k])));
          });
        }
        if (s.tech.doing && D.TECH && D.TECH[s.tech.doing.tid]) {
          out.tech.doing = { tid: s.tech.doing.tid, endAt: s.tech.doing.endAt || 0 };
        }
        Object.keys(out.tech.lv).forEach(function (k) { out.tech.total += out.tech.lv[k]; });
      }
      if (s.pets && typeof s.pets === 'object') {
        out.pets = {};
        Object.keys(s.pets).forEach(function (k) {
          if (!D.PETS || !D.PETS[k]) return;
          var p = s.pets[k] || {};
          out.pets[k] = { lv: Math.max(1, Math.min(10, p.lv || 1)), bond: Math.max(0, p.bond || 0) };
        });
      }

      if (s.inv && typeof s.inv === 'object') {
        Object.keys(s.inv).forEach(function (k) {
          if (D.ITEMS[k] && typeof s.inv[k] === 'number') out.inv[k] = Math.max(0, Math.floor(s.inv[k]));
        });
      }
      if (s.factories && typeof s.factories === 'object') {
        Object.keys(s.factories).forEach(function (k) {
          if (!D.FACTORIES[k]) return;
          var f = s.factories[k] || {};
          out.factories[k] = {
            lv: Math.max(1, Math.min(5, f.lv || 1)),
            queue: Array.isArray(f.queue) ? f.queue.filter(function (x) { return x && D.RECIPES[x.rid]; })
              .map(function (x) { return { rid: x.rid, endAt: x.endAt || 0 }; }) : []
          };
        });
      }
      if (s.shops && typeof s.shops === 'object') {
        Object.keys(s.shops).forEach(function (k) {
          if (!D.SHOPS[k]) return;
          var sh = s.shops[k] || {};
          out.shops[k] = {
            lv: Math.max(1, Math.min(10, sh.lv || 1)), charm: sh.charm || 0,
            signature: (D.DISHES && typeof sh.signature === 'string') ? sh.signature : null,
            staff: sh.staff && typeof sh.staff === 'object' ? sh.staff : {},
            decor: Array.isArray(sh.decor) ? sh.decor : [],
            stock: sh.stock && typeof sh.stock === 'object' ? sh.stock : {},
            nextAt: sh.nextAt || 0, rep: typeof sh.rep === 'number' ? sh.rep : 60,
            promo: sh.promo || 0, revenue: sh.revenue || 0, served: sh.served || 0,
            wageAt: sh.wageAt || 0
          };
        });
      }
      if (Array.isArray(s.farmDecor)) out.farmDecor = s.farmDecor.filter(function (x) {
        return D.FARM_DECOR.some(function (d) { return d.id === x; });
      });
      if (s.tools && typeof s.tools === 'object') {
        Object.keys(s.tools).forEach(function (k) {
          if (D.TOOLS[k]) out.tools[k] = Math.floor(s.tools[k]);
        });
      }
      if (Array.isArray(s.orders)) {
        out.orders = s.orders.filter(function (o) { return o && o.oid; })
          .map(function (o) { return { oid: o.oid, need: o.need, pay: o.pay, xp: o.xp }; });
      }
      if (s.weather && D.WEATHER[s.weather.id]) out.weather = { id: s.weather.id, until: s.weather.until || 0 };
      if (s.season && D.SEASONS[s.season.id]) out.season = { id: s.season.id, until: s.season.until || 0 };
      if (s.daily) out.daily = { date: s.daily.date || '', list: Array.isArray(s.daily.list) ? s.daily.list : [], claimed: !!s.daily.claimed };
      if (s.ach) out.ach = s.ach;
      if (s.dex) {
        ['crops','animals','goods','trees','fish','dishes'].forEach(function (g) {
          if (s.dex[g]) out.dex[g] = s.dex[g];
        });
      }
      if (Array.isArray(s.neighbors)) out.neighbors = s.neighbors;
      if (s.tutorial) {
        var ti = s.tutorial.i || 0;
        if (!s.tutorial.done && (typeof ti !== 'number' || ti < 0 || ti >= D.TUTORIAL.length)) ti = 0;
        out.tutorial = { i: ti, done: !!s.tutorial.done, waiting: s.tutorial.waiting || null };
      }
      if (s.stats) Object.keys(base.stats).forEach(function (k) {
        if (typeof s.stats[k] === 'number') out.stats[k] = s.stats[k];
      });
      if (s.settings) out.settings.sound = s.settings.sound !== false;
      out.v = K.SAVE_VERSION;
      return out;
    },

    write: function () {
      if (!this.data) return false;
      this.data.lastSeen = now();
      try {
        localStorage.setItem(K.SAVE_KEY, JSON.stringify(this.data));
        this.dirty = false;
        return true;
      } catch (e) { console.warn('存档失败', e); return false; }
    },

    touch: function () {
      this.dirty = true;
      if (saveTimer) return;
      var self = this;
      saveTimer = setTimeout(function () { saveTimer = null; self.write(); }, 1200);
    },

    startAuto: function () {
      var self = this;
      setInterval(function () { if (self.dirty) self.write(); }, K.AUTOSAVE_MS);
      global.addEventListener('beforeunload', function () { self.write(); });
      document.addEventListener('visibilitychange', function () { if (document.hidden) self.write(); });
    },

    reset: function () {
      try { localStorage.removeItem(K.SAVE_KEY); } catch (e) {}
      this.data = newSave();
      this.write();
      return this.data;
    },

    exportText: function () { return JSON.stringify(this.data); },
    importText: function (t) {
      try { this.data = this.migrate(JSON.parse(t)); this.write(); return true; }
      catch (e) { return false; }
    },

    /* ---------- 快捷 ---------- */
    add: function (id, n) {
      if (!D.ITEMS[id]) return 0;
      this.data.inv[id] = (this.data.inv[id] || 0) + n;
      if (this.data.inv[id] <= 0) delete this.data.inv[id];
      this.touch();
      return this.data.inv[id] || 0;
    },
    has: function (id, n) { return (this.data.inv[id] || 0) >= (n || 1); },
    count: function (id) { return this.data.inv[id] || 0; },
    itemTotal: function () {
      var t = 0, inv = this.data.inv;
      for (var k in inv) if (inv.hasOwnProperty(k)) t += inv[k];
      return t;
    },
    spend: function (n) {
      if (this.data.coins < n) return false;
      this.data.coins -= n; this.touch(); return true;
    },
    earn: function (n) {
      this.data.coins += n;
      this.data.stats.earned += n;
      this.touch();
    },
    gainXp: function (n) {
      var s = this.data;
      s.xp += n;
      var guard = 0;
      while (s.xp >= D.xpForLevel(s.level) && guard++ < 200) {
        s.xp -= D.xpForLevel(s.level);
        s.level++;
        if (FARM.ui) FARM.ui.levelUp(s.level);
      }
      this.touch();
    }
  };

  FARM.state = State;
  FARM.now = now;
})(window);

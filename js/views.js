/* ==========================================================
 *  views.js — 各页面渲染（纯函数，返回 HTML 字符串）
 *  所有交互通过 data-act / data-i 属性交给 ui.js 统一委托处理
 * ========================================================== */
(function (global) {
  'use strict';
  var FARM = global.FARM;
  var D = FARM.DATA, K = D.CONST;
  var A = FARM.assets;

  function S() { return FARM.state.data; }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function fmt(n) {
    n = Math.floor(Number(n) || 0);
    if (n >= 100000000) return (n / 100000000).toFixed(2) + '亿';
    if (n >= 10000) return (n / 10000).toFixed(n >= 1000000 ? 0 : 1) + '万';
    return n.toLocaleString('zh-CN');
  }
  function ms(x) { return Math.max(0, Math.floor(x)); }
  function timeStr(d) {
    var s = Math.ceil(ms(d) / 1000);
    if (s <= 0) return '完成';
    if (s < 60) return s + '秒';
    var m = Math.floor(s / 60);
    if (m < 60) return m + '分' + (s % 60) + '秒';
    var h = Math.floor(m / 60);
    return h + '时' + (m % 60) + '分';
  }
  function cropImg(id, cls) { return A.img('crop.' + id, cls); }
  function itemImg(id, cls) { return A.img('item.' + id, cls); }
  function animalImg(id, cls) { return A.img('animal.' + id, cls); }
  function buildImg(icon, cls) { return A.img('build.' + (icon || 'barn'), cls); }
  function fx(name, cls) { return A.img('fx.' + name, cls); }
  function ui(name, cls) { return A.img('ui.' + name, cls); }

  /* 农场装饰图标映射 */
  var DECOR_ICON = {
    scarecrow: 'fx.tree', well: 'fx.well', fence: 'fx.fence', doghouse: 'build.house2',
    greenhouse: 'build.greenhouse', windmill: 'build.windmill', statue: 'build.haystack',
    fountain: 'fx.water'
  };
  function decorIcon(id) { return DECOR_ICON[id] || 'fx.tree'; }

  var V = {};

  /* ==========================================================
   *  一、农场（QQ 农场式逐格点击）
   * ========================================================== */
  function plotHTML(i) {
    var s = S(), p = s.plots[i];

    if (p.locked) {
      var nx = FARM.sim.nextPlotUnlock();
      var cost = (nx && nx.index === i && nx.cfg) ? nx.cfg.cost : null;
      return '<div class="plot locked" data-act="plot" data-i="' + i + '">' +
        fx('wild', 'bg') +
        '<div class="lockmask">' + ui('lock', '') +
        (cost ? '<span class="c">' + fmt(cost) + '</span>' : '<span>未开垦</span>') +
        '</div></div>';
    }

    var cls = 'plot ' + p.state;
    var html = '<div class="' + cls + '" data-act="plot" data-i="' + i + '">' + fx('tilled', 'bg');

    /* 作物精灵 */
    if (p.state === 'wild') {
      html += fx('wild', 'bg') + '<div class="act">锄地</div>';
    } else if (p.state === 'tilled') {
      html += '<div class="act">播种</div>';
    } else {
      var stage = FARM.sim.plotStage(p);
      var spName = p.state === 'ripe' ? 'crop.' + p.crop
        : (stage >= 3 ? 'crop.' + p.crop : stage === 2 ? 'fx.young' : stage === 1 ? 'fx.seedling' : 'fx.seed');
      html += A.img(spName, 'sp');

      /* 状态角标 */
      var bg = '';
      if (p.weed) bg += '<span class="badge">' + A.img('fx.weed', '') + '</span>';
      if (p.bug) bg += '<span class="badge">' + A.img('fx.bug', '') + '</span>';
      if (p.fert) bg += '<span class="badge">' + A.img('fx.fert', '') + '</span>';
      if (bg) html += '<div class="badges">' + bg + '</div>';

      if (p.state === 'growing') {
        var pr = FARM.sim.plotProgress(p);
        var w = Math.round(p.water);
        html += '<div class="wbar' + (w < 35 ? ' low' : '') + '"><i style="width:' + w + '%"></i></div>';
        html += '<div class="time">' + timeStr((1 - pr) * FARM.sim.plotTotal(p)) + '</div>';
        if (p.weed) html += '<div class="act">除草</div>';
        else if (p.bug) html += '<div class="act">除虫</div>';
        else if (w < 35) html += '<div class="act">浇水</div>';
        else html += '<div class="act">' + Math.floor(pr * 100) + '%</div>';
      } else if (p.state === 'ripe') {
        html += '<div class="act">可收获</div>';
      } else if (p.state === 'withered') {
        html += '<div class="act">清理</div>';
      }
    }
    return html + '</div>';
  }

  V.farm = function () {
    var s = S(), sim = FARM.sim;
    var unlocked = 0;
    for (var i = 0; i < s.plots.length; i++) if (!s.plots[i].locked) unlocked++;
    var ripe = sim.ripeCount();
    var nx = sim.nextPlotUnlock();
    var w = D.WEATHER[s.weather.id], se = D.SEASONS[s.season.id];

    var h = '<div class="panel">' +
      '<div class="farm-head">' +
        '<div class="grow">' +
          '<div style="font-size:14px;font-weight:900">我的农场' +
            '<span class="tagpill" style="margin-left:6px">已开垦 ' + unlocked + '/' + K.MAX_PLOTS + '</span></div>' +
          '<div class="hint">点击地块依次进行：锄地 → 播种 → 浇水 / 除虫除草 → 收获。' +
            '当前 <b>' + se.name + '</b>（生长 ×' + se.grow + '）· <b>' + w.name + '</b>：' + w.desc + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="btn-row">' +
        '<button class="btn sm" data-act="harvestAll"' + (ripe ? '' : ' disabled') + '>' + fx('basket', '') + '一键收获 ' + (ripe ? '(' + ripe + ')' : '') + '</button>' +
        '<button class="btn sm" data-act="waterAll">' + fx('water', '') + '一键浇水</button>' +
        '<button class="btn sm" data-act="cleanAll">' + fx('bug', '') + '一键除害</button>' +
        (nx ? '<button class="btn sm gold" data-act="expand">' + ui('plus', '') + '开垦新地 ' + fmt(nx.cfg.cost) + '</button>'
            : '<span class="tagpill">土地已全部开垦</span>') +
      '</div>' +
    '</div>';

    h += '<div class="grid">';
    for (var j = 0; j < s.plots.length; j++) h += plotHTML(j);
    h += '</div>';

    /* 农场装饰 */
    h += '<div class="panel mt8"><h3>' + fx('tree', '') + '农场装饰 <span class="tag">提供永久加成</span></h3><div class="cards">';
    D.FARM_DECOR.forEach(function (d) {
      var own = s.farmDecor.indexOf(d.id) >= 0;
      h += '<div class="card' + (own ? ' done' : '') + '" data-act="farmDecor" data-id="' + d.id + '">' +
        '<div class="pic">' + A.img(decorIcon(d.id), '') + '</div>' +
        '<div class="nm">' + esc(d.name) + '</div>' +
        '<div class="sub">' + (own ? '<span class="tagpill">已拥有</span>' : fmt(d.cost) + ' 金币<br>' + esc(d.desc || '')) + '</div>' +
      '</div>';
    });
    h += '</div></div>';
    return h;
  };

  /* ==========================================================
   *  二、牧场
   * ========================================================== */
  V.ranch = function () {
    var s = S();
    var nxPen = FARM.sim.nextPenUnlock();
    var h = '<div class="panel"><div class="farm-head"><div class="grow">' +
      '<div style="font-size:14px;font-weight:900">牧场</div>' +
      '<div class="hint">点击栏位购买动物 / 喂食 / 抚摸 / 清洁 / 收取产出。动物会自动消耗仓库饲料。</div>' +
      '</div></div><div class="btn-row">' +
      '<button class="btn sm" data-act="collectAllPens">' + fx('basket', '') + '一键收取</button>' +
      '<button class="btn sm" data-act="feedAll">' + fx('can', '') + '一键喂食</button>' +
      (nxPen ? '<button class="btn sm gold" data-act="expandPen">' + ui('plus', '') + '扩建栏位 ' + fmt(nxPen.cfg.cost) + '</button>' : '') +
      '</div></div>';

    h += '<div class="cards">';
    for (var i = 0; i < s.pens.length; i++) {
      var pen = s.pens[i];
      if (pen.locked) {
        var cost = (nxPen && nxPen.index === i && nxPen.cfg) ? nxPen.cfg.cost : null;
        h += '<div class="card locked" data-act="pen" data-i="' + i + '">' +
          '<div class="pic">' + ui('lock', '') + '</div>' +
          '<div class="nm">未解锁</div><div class="sub">' + (cost ? fmt(cost) + ' 金币' : '需扩建') + '</div></div>';
        continue;
      }
      if (!pen.animal) {
        h += '<div class="card empty" data-act="pen" data-i="' + i + '">' +
          '<div class="pic">' + ui('plus', '') + '</div>' +
          '<div class="nm">空栏位</div><div class="sub">点击购买</div></div>';
        continue;
      }
      var cfg = D.ANIMALS[pen.animal];
      var ready = pen.pending > 0;
      h += '<div class="card' + (ready ? ' done' : '') + '" data-act="pen" data-i="' + i + '">' +
        '<div class="pic">' + animalImg(pen.animal, '') + '</div>' +
        '<div class="nm">' + esc(cfg.name) + ' ×' + pen.count + '</div>' +
        '<div class="sub">' + (ready ? '<span class="tagpill">可收 ' + pen.pending + '</span>'
          : '产出 ' + timeStr(pen.readyAt - FARM.now())) + '</div>' +
        '<div class="pb"><i style="width:' + Math.round(pen.mood) + '%"></i></div>' +
        '<div class="sub">心情 ' + Math.round(pen.mood) + '%' + (pen.dirty ? ' · <span class="tagpill r">脏</span>' : '') + '</div>' +
      '</div>';
    }
    h += '</div>';
    return h;
  };

  /* ==========================================================
   *  三、加工（工厂）
   * ========================================================== */
  V.factory = function () {
    var s = S();
    var full = FARM.state.itemTotal() >= s.cap;
    var h = '<div class="panel"><h3>' + buildImg('mill') + '加工链 <span class="tag">原料 → 加工品，利润倍增</span></h3>' +
      '<div class="hint">先建工厂，再选择配方投入原料。队列长度随等级提升。</div>' +
      (full ? '<div class="hint" style="color:#c0392b"><b>⚠ 仓库已满（' + FARM.state.itemTotal() + ' / ' + s.cap + '）：生产完成的商品暂时无法入库，请先出售 / 交付订单扩容。</b></div>' : '') +
      '</div><div class="cards">';
    for (var fid in D.FACTORIES) {
      var cfg = D.FACTORIES[fid], f = s.factories[fid];
      if (!f) {
        h += '<div class="card locked" data-act="buildFactory" data-id="' + fid + '">' +
          '<div class="pic">' + buildImg(cfg.icon) + '</div>' +
          '<div class="nm">' + esc(cfg.name) + '</div>' +
          '<div class="sub">' + fmt(cfg.build) + ' 金币<br>Lv.' + cfg.lv + ' 解锁</div></div>';
        continue;
      }
      var slots = FARM.sim.factorySlots(f), used = f.queue.length;
      var doneN = 0, nowT = FARM.now();
      for (var q = 0; q < f.queue.length; q++) if (f.queue[q].endAt <= nowT) doneN++;
      h += '<div class="card' + (doneN ? ' done' : '') + '" data-act="factory" data-id="' + fid + '">' +
        '<div class="pic">' + buildImg(cfg.icon) + '</div>' +
        '<div class="nm">' + esc(cfg.name) + ' Lv.' + f.lv + '</div>' +
        '<div class="sub">队列 ' + used + '/' + slots + (doneN ? ' · <span class="tagpill">可取 ' + doneN + '</span>' : '') + '</div>' +
        '<div class="pb"><i style="width:' + Math.round(used / slots * 100) + '%"></i></div>' +
      '</div>';
    }
    h += '</div>';
    return h;
  };

  /* ==========================================================
   *  四、分店
   * ========================================================== */
  V.shop = function () {
    var s = S();
    var h = '<div class="panel"><h3>' + buildImg('pet') + '连锁分店 <span class="tag">终端零售，客单价最高</span></h3>' +
      '<div class="hint">开店后需要补货、雇员工、装修、做宣传来提高营收。</div></div><div class="cards">';
    for (var sid in D.SHOPS) {
      var cfg = D.SHOPS[sid], sh = s.shops[sid];
      if (!sh) {
        h += '<div class="card locked" data-act="buildShop" data-id="' + sid + '">' +
          '<div class="pic">' + buildImg(cfg.icon) + '</div>' +
          '<div class="nm">' + esc(cfg.name) + '</div>' +
          '<div class="sub">' + fmt(cfg.build) + ' 金币<br>Lv.' + cfg.lv + ' 解锁</div></div>';
        continue;
      }
      var info = FARM.sim.shopInfo(sid);
      h += '<div class="card" data-act="shop" data-id="' + sid + '">' +
        '<div class="pic">' + buildImg(cfg.icon) + '</div>' +
        '<div class="nm">' + esc(cfg.name) + ' Lv.' + sh.lv + '</div>' +
        '<div class="sub">客单 ' + fmt(info.price) + '<br>口碑 ' + Math.round(sh.rep) + '</div>' +
        '<div class="pb"><i style="width:' + Math.round(sh.rep) + '%"></i></div>' +
      '</div>';
    }
    h += '</div>';
    return h;
  };

  /* ==========================================================
   *  五、仓库
   * ========================================================== */
  V.warehouse = function () {
    var s = S();
    var total = 0;
    for (var k in s.inv) total += s.inv[k];
    var times = Math.round((s.cap - K.WAREHOUSE_BASE) / 150);
    var upCost = Math.floor(800 * Math.pow(1.55, times));
    var h = '<div class="panel"><h3>' + ui('basket') + '仓库 <span class="tag">' + total + ' / ' + s.cap + '</span></h3>' +
      '<div class="btn-row"><button class="btn sm gold" data-act="upgradeCap">' + ui('plus', '') + '扩容 +150（' + fmt(upCost) + '）</button>' +
      '<button class="btn sm" data-act="sellAll">批量出售</button></div>' +
      '<div class="hint mt8">点击物品可出售；价格随品质浮动。</div></div>';

    var keys = Object.keys(s.inv).filter(function (k) { return s.inv[k] > 0; });
    if (!keys.length) return h + '<div class="empty-tip">仓库空空如也，去农场收获吧</div>';
    h += '<div class="inv">';
    keys.forEach(function (k) {
      h += '<div class="slot" data-act="sellItem" data-id="' + k + '">' +
        '<span class="q">' + fmt(s.inv[k]) + '</span>' + itemImg(k, '') +
        '<div class="n">' + esc(FARM.itemName(k)) + '</div></div>';
    });
    return h + '</div>';
  };

  /* ==========================================================
   *  六、订单
   * ========================================================== */
  V.order = function () {
    var s = S();
    if (!s.orders.length) FARM.sim.refreshOrders(true);
    var h = '<div class="panel"><h3>' + fx('basket') + '订单板 <span class="tag">每天自动刷新</span></h3>' +
      '<div class="btn-row"><button class="btn sm" data-act="refreshOrders">刷新订单</button></div>' +
      '<div class="hint mt8">交付订单可获得金币与经验，是前期稳定的收入来源。</div></div>';
    if (!s.orders.length) return h + '<div class="empty-tip">暂无订单</div>';
    s.orders.forEach(function (o, idx) {
      var need = [];
      for (var k in o.need) {
        var has = s.inv[k] || 0, needN = o.need[k];
        need.push('<span class="tagpill' + (has >= needN ? '' : ' r') + '">' + itemImg(k, '') + ' ' +
          esc(FARM.itemName(k)) + ' ' + has + '/' + needN + '</span>');
      }
      h += '<div class="row"><div class="ico">' + ui('coin') + '</div>' +
        '<div class="txt"><div class="t1">+' + fmt(o.pay) + ' 金币 · +' + o.xp + ' 经验</div>' +
        '<div class="t2">' + need.join(' ') + '</div></div>' +
        '<div class="ops"><button class="btn sm" data-act="deliverOrder" data-i="' + idx + '">交付</button></div></div>';
    });
    return h;
  };

  /* ==========================================================
   *  七、邻居（帮忙 / 偷菜）
   * ========================================================== */
  V.neighbor = function () {
    var s = S();
    FARM.sys.ensureNeighbors();
    var h = '<div class="panel"><h3>' + ui('heart') + '邻居农场 <span class="tag">互助 / 偷菜</span></h3>' +
      '<div class="hint">帮邻居照看作物可获得金币与友好度；偷菜有风险——有狗的农场可能被抓，罚款并降低友好度。</div></div>';
    s.neighbors.forEach(function (nb, i) {
      var ripeN = nb.plots.filter(function (p) { return p.state === 'ripe'; }).length;
      var badN = nb.plots.filter(function (p) { return p.weed || p.bug; }).length;
      h += '<div class="row"><div class="ico">' + ui('home') + '</div>' +
        '<div class="txt"><div class="t1">' + esc(nb.name) + ' <span class="tagpill">Lv.' + nb.level + '</span>' +
          (nb.dog ? ' <span class="tagpill r">有狗</span>' : '') + '</div>' +
        '<div class="t2">友好度 ' + nb.friend + ' · 可偷 ' + ripeN + ' · 待照料 ' + badN + '</div></div>' +
        '<div class="ops">' +
          (badN ? '<button class="btn sm" data-act="helpNb" data-i="' + i + '">帮忙</button>' : '') +
          (ripeN ? '<button class="btn sm red" data-act="stealNb" data-i="' + i + '">偷菜</button>' : '') +
        '</div></div>';
    });
    return h;
  };

  /* ==========================================================
   *  八、更多（成就 / 每日 / 图鉴 / 设置）
   * ========================================================== */
  V.more = function () {
    var s = S();
    var st = s.stats;
    var h = '<div class="panel"><h3>' + ui('trophy') + '经营数据</h3><div class="stat-grid">' +
      stat('累计收入', st.earned) + stat('收获次数', st.harvest) + stat('加工次数', st.craft) +
      stat('服务顾客', st.serve) + stat('完成订单', st.orders) + stat('浇水次数', st.water) +
      stat('播种次数', st.sow) + stat('除害次数', st.clean) + stat('喂食次数', st.feed) +
      stat('帮助邻居', st.help) + stat('偷菜次数', st.steal) +
      '</div></div>';

    /* 每日任务 */
    h += '<div class="panel"><h3>' + ui('check') + '每日任务 <span class="tag">' +
      (FARM.sys.dailyAllDone() ? '全部完成' : '进行中') + '</span></h3>';
    if (!s.daily.list.length) FARM.sys.rollDaily();
    s.daily.list.forEach(function (t) {
      var done = !!t.done;
      var keys = Object.keys(t.need || {}), prog = t.prog || 0;
      var needN = keys.length ? t.need[keys[0]] : 0;
      h += '<div class="row"><div class="ico">' + (done ? ui('check') : ui('star')) + '</div>' +
        '<div class="txt"><div class="t1">' + esc(t.desc) +
          (done ? ' <span class="tagpill">已完成</span>' : ' <span class="tagpill b">' + Math.min(prog, needN) + '/' + needN + '</span>') + '</div>' +
        '<div class="t2">奖励 ' + fmt(t.reward.coins) + ' 金币 · ' + t.reward.gem + ' 钻</div></div>' +
        '<div class="ops">' + (done ? '<span class="tagpill">✓</span>' : '<span class="tagpill">进行中</span>') + '</div></div>';
    });
    h += '<div class="btn-row mt8">' +
      '<button class="btn sm gold"' + (FARM.sys.dailyAllDone() && !s.daily.claimed ? '' : ' disabled') + ' data-act="claimDaily">领取全部奖励</button>' +
      '<button class="btn sm" data-act="rollDaily">换一批任务</button></div></div>';

    /* 成就 */
    var got = 0;
    D.ACHIEVEMENTS.forEach(function (a) { if (s.ach[a.id]) got++; });
    h += '<div class="panel"><h3>' + ui('trophy') + '成就 <span class="tag">' + got + '/' + D.ACHIEVEMENTS.length + '</span></h3>';
    D.ACHIEVEMENTS.forEach(function (a) {
      var on = !!s.ach[a.id];
      h += '<div class="row"><div class="ico">' + (on ? ui('trophy') : ui('lock')) + '</div>' +
        '<div class="txt"><div class="t1">' + esc(a.name) + (on ? ' <span class="tagpill">已达</span>' : '') + '</div>' +
        '<div class="t2">' + esc(a.desc) + ' · 奖励 ' + fmt(a.reward.coins) + ' 金币</div></div></div>';
    });
    h += '</div>';

    /* 图鉴 */
    var dc = 0, da = 0, dg = 0, tc = 0, ta = 0, tg = 0;
    for (var c in D.CROPS) { tc++; if (s.dex.crops[c]) dc++; }
    for (var an in D.ANIMALS) { ta++; if (s.dex.animals[an]) da++; }
    for (var g in D.ITEMS) { tg++; if (s.dex.goods[g]) dg++; }
    h += '<div class="panel"><h3>' + ui('star') + '图鉴 <span class="tag">作物 ' + dc + '/' + tc + ' · 动物 ' + da + '/' + ta + ' · 物品 ' + dg + '/' + tg + '</span></h3><div class="inv">';
    for (var c2 in D.CROPS) h += '<div class="slot"><span class="q">' + (s.dex.crops[c2] ? '✓' : '?') + '</span>' + cropImg(c2, '') + '<div class="n">' + esc(D.CROPS[c2].name) + '</div></div>';
    h += '</div><div class="inv mt8">';
    for (var a2 in D.ANIMALS) h += '<div class="slot"><span class="q">' + (s.dex.animals[a2] ? '✓' : '?') + '</span>' + animalImg(a2, '') + '<div class="n">' + esc(D.ANIMALS[a2].name) + '</div></div>';
    h += '</div></div>';

    /* 设置 */
    h += '<div class="panel"><h3>' + ui('gear') + '设置</h3><div class="btn-row">' +
      '<button class="btn sm" data-act="exportSave">导出存档</button>' +
      '<button class="btn sm" data-act="importSave">导入存档</button>' +
      '<button class="btn sm" data-act="replayTutorial">重看新手引导</button>' +
      '<button class="btn sm" data-act="toggleSound">' + (s.settings.sound ? '音效：开' : '音效：关') + '</button>' +
      '<button class="btn sm red" data-act="resetSave">清空存档</button>' +
      '</div><div class="hint mt8">存档保存在浏览器本地，换设备请先导出。</div></div>';
    return h;
  };

  function stat(k, v) {
    return '<div class="stat"><div class="v">' + fmt(v) + '</div><div class="k">' + esc(k) + '</div></div>';
  }

  FARM.views = V;
  FARM.vfmt = { fmt: fmt, timeStr: timeStr, esc: esc };
})(window);

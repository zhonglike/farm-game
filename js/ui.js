/* ==========================================================
 *  ui.js — 交互层
 *  · 顶部状态栏 / 视图切换 / 事件委托 / 抽屉与弹窗 / 新手引导
 *  · 所有业务动作都调用 FARM.sim / FARM.sys，UI 不持有游戏状态
 * ========================================================== */
(function (global) {
  'use strict';
  var FARM = global.FARM;
  var D = FARM.DATA, K = D.CONST, A = FARM.assets;
  var doc = document;
  function $(s) { return doc.querySelector(s); }
  function S() { return FARM.state.data; }
  var fmt = FARM.vfmt.fmt, tstr = FARM.vfmt.timeStr, esc = FARM.vfmt.esc;

  var UI = {
    view: 'farm',
    _busy: false,          /* 防重入：render 内不再触发 render */
    _lastSig: '',
    _toastN: 0
  };

  /* ================= 顶部状态栏 ================= */
  function renderTop() {
    var s = S();
    $('#lvNum').textContent = s.level;
    var need = D.xpForLevel(s.level) || 1;
    $('#xpFill').style.width = Math.min(100, (s.xp / need) * 100) + '%';
    $('#coinNum').textContent = fmt(s.coins);
    $('#gemNum').textContent = fmt(s.gems);
    var w = D.WEATHER[s.weather.id], se = D.SEASONS[s.season.id];
    var ico = { sunny: '☀️', rain: '🌧️', drought: '🔥', pest: '🐛', bounty: '✨', snow: '❄️' }[s.weather.id] || '☀️';
    var sico = { spring: '🌱', summer: '🌻', autumn: '🍂', winter: '⛄' }[s.season.id] || '🌱';
    $('#envBadge').innerHTML =
      '<span class="ico">' + ico + '</span>' + w.name +
      '<span class="ico" style="margin-left:4px">' + sico + '</span>' + se.name;
  }

  /* ================= 主渲染 ================= */
  function render() {
    if (UI._busy) return;
    UI._busy = true;
    try {
      renderTop();
      var v = FARM.views[UI.view] || FARM.views.farm;
      $('#view').innerHTML = v();
      /* tab 高亮 */
      var tabs = doc.querySelectorAll('#tabbar .tab');
      for (var i = 0; i < tabs.length; i++) {
        tabs[i].classList.toggle('on', tabs[i].getAttribute('data-view') === UI.view);
      }
      renderTutor();
    } catch (e) {
      if (global.console) console.error('[render]', e);
    }
    UI._busy = false;
  }
  UI.render = render;

  UI.setView = function (v) {
    UI.view = v;
    if (S()) S().lastView = v;
    render();
    $('#view').scrollTop = 0;
  };

  /* ================= 提示 ================= */
  UI.toast = function (msg, type) {
    var root = $('#toastRoot');
    var el = doc.createElement('div');
    el.className = 'toast ' + (type || '');
    el.textContent = msg;
    root.appendChild(el);
    var id = ++UI._toastN;
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 1900);
    while (root.children.length > 4) root.removeChild(root.firstChild);
    return id;
  };
  UI.weatherToast = function (w) {
    UI.toast('天气转为 ' + w.name + '：' + w.desc, 'ok');
  };
  UI.levelUp = function (lv) {
    UI.toast('🎉 升级！当前 Lv.' + lv, 'gold');
  };
  UI.achievement = function (a) {
    UI.toast('🏆 成就达成：' + a.name + '（+' + a.reward.coins + ' 金币）', 'gold');
  };

  /* ================= 弹窗 / 抽屉 ================= */
  UI.sheet = function (html) {
    $('#sheetRoot').innerHTML =
      '<div class="sheet-mask" data-act="closeSheet"></div>' +
      '<div class="sheet">' + html + '</div>';
  };
  UI.closeSheet = function () {
    $('#sheetRoot').innerHTML = '';
  };
  UI.modal = function (html) {
    $('#modalRoot').innerHTML =
      '<div class="modal-mask" data-act="closeModal"></div>' +
      '<div class="modal">' + html + '</div>';
  };
  UI.closeModal = function () { $('#modalRoot').innerHTML = ''; };

  function confirmBox(title, body, onYes, yesText) {
    UI.modal('<h4>' + esc(title) + '</h4><div class="body">' + body + '</div>' +
      '<div class="foot"><button class="btn grey" data-act="closeModal">取消</button>' +
      '<button class="btn red" data-act="confirmYes">' + esc(yesText || '确定') + '</button></div>');
    UI._confirmCb = onYes;
  }
  UI.confirmBox = confirmBox;

  /* ================= 业务动作封装 ================= */
  function run(fn) {
    var r = fn();
    if (!r) return;
    if (r.ok) UI.toast(r.msg, 'ok');
    else UI.toast(r.msg, r.msg && /不足|需要|已满|解锁/.test(r.msg) ? 'warn' : 'bad');
    render();
    FARM.state.touch();
    return r;
  }

  /* ---- 地块点击 ---- */
  function onPlot(i) {
    var s = S(), p = s.plots[i];
    if (p.locked) {
      var nx = FARM.sim.nextPlotUnlock();
      if (!nx) return UI.toast('没有可开垦的土地', 'warn');
      if (nx.index !== i) return UI.toast('请先开垦第 ' + (nx.index + 1) + ' 块地', 'warn');
      return run(function () { return FARM.sim.expandPlot(); });
    }
    var r = FARM.sim.plotClick(i);
    if (!r) return;
    if (r.ok) {
      if (r.act === 'choose') return seedSheet(i);
      UI.toast(r.msg, 'ok');
    } else {
      UI.toast(r.msg, r.act === 'clear' || r.act === 'info' ? 'warn' : 'bad');
      if (r.act === 'clear') clearConfirm(i);
    }
    render();
    FARM.state.touch();
  }

  function clearConfirm(i) {
    confirmBox('清理枯萎作物', '清理后可重新锄地播种，不返还种子。', function () {
      run(function () { return FARM.sim.clearPlot(i); });
    }, '清理');
  }

  /* ---- 播种抽屉 ---- */
  function seedSheet(i) {
    var s = S();
    var h = '<h4>选择作物<span class="x" data-act="closeSheet">×</span></h4><div class="opts">';
    for (var cid in D.CROPS) {
      var c = D.CROPS[cid];
      var canLv = s.level >= c.lv;
      var own = s.inv['seed_' + cid] || 0;
      var canSeed = own > 0 || s.coins >= c.seed;
      var fit = FARM.sim.seasonFit(cid);
      var seedTxt = own > 0
        ? (own >= 100 ? '种子×' + own + '（免费）' : '背包种子 ×' + own + '（免费）')
        : '现购种子 ' + c.seed;
      h += '<div class="opt' + (canLv && canSeed ? '' : ' dis') + '" data-act="sow" data-i="' + i + '" data-id="' + cid + '">' +
        A.img('crop.' + cid, '') +
        '<div class="n">' + esc(c.name) + '</div>' +
        '<div class="s">' + (canLv ? (canSeed ? seedTxt : '缺种子') : 'Lv.' + c.lv) +
        '<br>' + tstr(c.grow * 1000 / FARM.sim.growSpeed()) + ' · 产' + c.yield +
        (fit > 1 ? '<br><span class="tagpill">当季 ×' + fit + '</span>' : (fit < 1 ? '<br><span class="tagpill r">非当季 ×' + fit + '</span>' : '')) +
        '</div></div>';
    }
    h += '</div><div class="hint mt8">提示：优先消耗背包里的种子（免费），用完才按标价用金币现购。' +
      '收获回报最低 2 倍起步，越高级的作物回报越高。</div>';
    UI.sheet(h);
  }

  /* ---- 地块详情（生长中） ---- */
  function plotSheet(i) {
    var s = S(), p = s.plots[i], c = D.CROPS[p.crop];
    var h = '<h4>' + esc(c.name) + '<span class="x" data-act="closeSheet">×</span></h4>' +
      '<div class="row"><div class="ico">' + A.img('crop.' + p.crop, '') + '</div>' +
      '<div class="txt"><div class="t1">' + (p.state === 'ripe' ? '已成熟' : '生长 ' + Math.floor(FARM.sim.plotProgress(p) * 100) + '%') + '</div>' +
      '<div class="t2">水分 ' + Math.round(p.water) + '% · ' +
      (p.weed ? '有杂草 · ' : '') + (p.bug ? '有虫害 · ' : '') + '剩余 ' + tstr((1 - FARM.sim.plotProgress(p)) * FARM.sim.plotTotal(p)) + '</div></div></div>' +
      '<div class="btn-row">' +
      '<button class="btn sm" data-act="water" data-i="' + i + '">' + A.img('fx.can', '') + '浇水</button>' +
      '<button class="btn sm" data-act="fertilize" data-i="' + i + '">' + A.img('fx.fert', '') + '施肥 60</button>' +
      '<button class="btn sm gold" data-act="speedGrow" data-i="' + i + '">⏩ 加速 3钻</button>' +
      (p.state === 'withered' ? '<button class="btn sm red" data-act="revive" data-i="' + i + '">💫 复活 5钻</button>' : '') +
      '<button class="btn sm red" data-act="clearPlot" data-i="' + i + '">清理</button>' +
      '</div>';
    UI.sheet(h);
  }

  /* ---- 牧场栏位 ---- */
  function penSheet(i) {
    var s = S(), pen = s.pens[i];
    if (pen.locked) {
      var nx = FARM.sim.nextPenUnlock();
      if (!nx || nx.index !== i) return UI.toast('请先扩建前一个栏位', 'warn');
      return run(function () { return FARM.sim.expandPen(); });
    }
    if (!pen.animal) {
      var h = '<h4>购买动物<span class="x" data-act="closeSheet">×</span></h4><div class="opts">';
      for (var aid in D.ANIMALS) {
        var a = D.ANIMALS[aid], can = s.level >= a.lv && s.coins >= a.cost;
        var out = [];
        for (var k in a.out) out.push(FARM.itemName(k) + '×' + a.out[k]);
        h += '<div class="opt' + (can ? '' : ' dis') + '" data-act="buyAnimal" data-i="' + i + '" data-id="' + aid + '">' +
          A.img('animal.' + aid, '') +
          '<div class="n">' + esc(a.name) + '</div>' +
          '<div class="s">' + fmt(a.cost) + ' 金币<br>Lv.' + a.lv + ' · ' + tstr(a.cycle * 1000) + '<br>' + out.join(' ') + '</div></div>';
      }
      return UI.sheet(h + '</div>');
    }
    var cfg = D.ANIMALS[pen.animal];
    var feedTxt = [];
    for (var f in cfg.feed) feedTxt.push(FARM.itemName(f) + '×' + (cfg.feed[f] * pen.count));
    var outTxt = [];
    for (var o in cfg.out) outTxt.push(FARM.itemName(o) + '×' + cfg.out[o]);
    var h2 = '<h4>' + esc(cfg.name) + ' ×' + pen.count + '<span class="x" data-act="closeSheet">×</span></h4>' +
      '<div class="row"><div class="ico">' + A.img('animal.' + pen.animal, '') + '</div>' +
      '<div class="txt"><div class="t1">心情 ' + Math.round(pen.mood) + '% · 亲密 ' + Math.round(pen.bond || 0) + '</div>' +
      '<div class="t2">产出：' + outTxt.join('、') + '<br>每轮消耗：' + feedTxt.join('、') +
      '<br>待收取：' + (pen.pending || 0) + ' · ' + (pen.pending ? '可收' : tstr(pen.readyAt - FARM.now())) + '</div></div></div>' +
      '<div class="btn-row">' +
      '<button class="btn sm" data-act="feed" data-i="' + i + '">🌾 喂食</button>' +
      '<button class="btn sm" data-act="pet" data-i="' + i + '">💕 抚摸</button>' +
      '<button class="btn sm" data-act="clean" data-i="' + i + '">🧹 清洁</button>' +
      '<button class="btn sm gold" data-act="collect" data-i="' + i + '">' + A.img('fx.basket', '') + '收取</button>' +
      '</div>';
    UI.sheet(h2);
  }

  /* ---- 工厂 ---- */
  function factorySheet(fid) {
    var s = S(), f = s.factories[fid], cfg = D.FACTORIES[fid];
    if (!f) return run(function () { return FARM.sim.buildFactory(fid); });
    var slots = FARM.sim.factorySlots(f);
    var h = '<h4>' + esc(cfg.name) + ' Lv.' + f.lv + '<span class="x" data-act="closeSheet">×</span></h4>';

    /* 队列 */
    h += '<div class="hint">生产队列 ' + f.queue.length + '/' + slots + '（速度 ×' + FARM.sim.factorySpeed(f).toFixed(2) + '）</div>';
    f.queue.forEach(function (q, idx) {
      var rp = D.RECIPES[q.rid];
      var left = q.endAt - FARM.now();
      h += '<div class="row"><div class="ico">' + A.img('item.' + Object.keys(rp.out)[0], '') + '</div>' +
        '<div class="txt"><div class="t1">' + esc(rp.name) + '</div>' +
        '<div class="t2">' + (left > 0 ? '剩余 ' + tstr(left) : '<span class="tagpill">已完成，等待入库</span>') + '</div></div>' +
        '<div class="ops">' + (left > 0 ? '<button class="btn sm gold" data-act="rush" data-id="' + fid + '" data-i="' + idx + '">⏩2钻</button>' : '') + '</div></div>';
    });

    /* 配方 */
    h += '<div class="hr"></div><div class="hint">选择配方开始生产：</div><div class="opts mt8">';
    for (var rid in D.RECIPES) {
      var rp2 = D.RECIPES[rid];
      if (rp2.factory !== fid) continue;
      var enough = true, needTxt = [];
      for (var k in rp2.in) {
        var has = s.inv[k] || 0;
        if (has < rp2.in[k]) enough = false;
        needTxt.push(FARM.itemName(k) + '×' + rp2.in[k]);
      }
      var full = f.queue.length >= slots;
      h += '<div class="opt' + (enough && !full ? '' : ' dis') + '" data-act="craft" data-id="' + rid + '" data-f="' + fid + '">' +
        A.img('item.' + Object.keys(rp2.out)[0], '') +
        '<div class="n">' + esc(rp2.name) + '</div>' +
        '<div class="s">' + needTxt.join(' ') + '<br>' + tstr(rp2.time * 1000 / FARM.sim.factorySpeed(f)) + '</div></div>';
    }
    h += '</div>';
    h += '<div class="btn-row mt8"><button class="btn sm gold" data-act="upF" data-id="' + fid + '">' +
      A.img('ui.plus', '') + '升级 ' + fmt(cfg.upCost * f.lv) + '</button></div>';
    UI.sheet(h);
  }

  /* ---- 分店 ---- */
  function shopSheet(sid) {
    var s = S(), sh = s.shops[sid], cfg = D.SHOPS[sid];
    if (!sh) return run(function () { return FARM.sim.buildShop(sid); });
    var info = FARM.sim.shopInfo(sid);
    var h = '<h4>' + esc(cfg.name) + ' Lv.' + sh.lv + '<span class="x" data-act="closeSheet">×</span></h4>' +
      '<div class="row"><div class="ico">' + A.img('build.' + cfg.icon, '') + '</div>' +
      '<div class="txt"><div class="t1">客单价 ' + fmt(info.price) + ' · 客流 ×' + info.flow.toFixed(2) + '</div>' +
      '<div class="t2">口碑 ' + Math.round(sh.rep) + ' · 魅力 ' + info.charm + ' · 营收 ' + fmt(sh.revenue || 0) + '<br>' +
      esc(cfg.desc) + '</div></div></div>';

    /* 库存 */
    h += '<div class="hint mt8">库存（点击补货 10 个）：</div><div class="inv mt8">';
    for (var k in cfg.consume) {
      var stock = sh.stock[k] || 0;
      h += '<div class="slot" data-act="stock" data-id="' + sid + '" data-item="' + k + '">' +
        '<span class="q">' + fmt(stock) + '</span>' + A.img('item.' + k, '') +
        '<div class="n">' + esc(FARM.itemName(k)) + '</div></div>';
    }
    h += '</div>';

    /* 招牌菜：厨房做的菜调拨过来，库存有货时客单价 +35% */
    var dishIds = [];
    for (var dk in D.DISHES) if (dishIds.indexOf(D.DISHES[dk].out) < 0) dishIds.push(D.DISHES[dk].out);
    var canSig = sh.lv >= 3;
    h += '<div class="hr"></div><div class="hint">招牌菜' +
      (canSig ? '（选择后客单价 +35%，每服务一位消耗 1 份；<b>点菜品可补货 10 份</b>）：'
        : '（<b>店铺升到 3 级</b>解锁）：') + '</div><div class="inv mt8">';
    dishIds.forEach(function (did) {
      var n = sh.stock[did] || 0;
      var on = sh.signature === did;
      h += '<div class="slot' + (on ? ' done' : '') + '" data-act="signature" data-id="' + sid + '" data-d="' + did + '">' +
        '<span class="q">' + fmt(n) + '</span>' + A.img('item.' + did, '') +
        '<div class="n">' + esc(FARM.itemName(did)) + (on ? ' ★' : '') + '</div></div>';
    });
    h += '</div><div class="hint mt8">先在「厨房」做菜，再点菜品把它设为招牌菜；' +
      '再次点击<b>已是招牌菜</b>的那一格可从仓库补货 10 份。</div>';
    if (sh.signature) {
      h += '<div class="btn-row mt8"><button class="btn sm red" data-act="clearSignature" data-id="' + sid +
        '">取消招牌菜（' + esc(FARM.itemName(sh.signature)) + '）</button></div>';
    }

    h += '<div class="btn-row mt8">' +
      '<button class="btn sm gold" data-act="upS" data-id="' + sid + '">' + A.img('ui.plus', '') + '升级 ' + fmt(cfg.upCost * sh.lv) + '</button>' +
      '<button class="btn sm" data-act="promo" data-id="' + sid + '">📣 宣传</button>' +
      '</div>';

    /* 员工（需店铺 2 级） */
    var canHire = sh.lv >= 2;
    h += '<div class="hr"></div><div class="hint">雇佣员工' +
      (canHire ? '：' : '（<b>店铺升到 2 级</b>才能雇人，每多雇一位成本 +50%）：') + '</div><div class="opts mt8">';
    for (var stid in D.STAFF) {
      var stf = D.STAFF[stid], n = sh.staff[stid] || 0;
      var cost = Math.floor(stf.hire * (1 + Object.keys(sh.staff).length * 0.5));
      h += '<div class="opt' + (canHire && s.coins >= cost ? '' : ' dis') + '" data-act="hire" data-id="' + sid + '" data-s="' + stid + '">' +
        A.img('ui.star', '') + '<div class="n">' + esc(stf.name) + (n ? ' ×' + n : '') + '</div>' +
        '<div class="s">' + fmt(cost) + ' 金币<br>' + esc(stf.desc) + '</div></div>';
    }
    h += '</div>';

    /* 装修 */
    h += '<div class="hr"></div><div class="hint">店铺装修（永久提升魅力）：</div><div class="opts mt8">';
    D.DECOR.forEach(function (dc) {
      var own = sh.decor.indexOf(dc.id) >= 0;
      h += '<div class="opt' + (own || s.coins < dc.cost ? ' dis' : '') + '" data-act="decor" data-id="' + sid + '" data-d="' + dc.id + '">' +
        A.img('fx.tree', '') + '<div class="n">' + esc(dc.name) + '</div>' +
        '<div class="s">' + (own ? '已拥有' : fmt(dc.cost) + ' 金币<br>魅力 +' + dc.charm) + '</div></div>';
    });
    UI.sheet(h + '</div>');
  }

  /* ---- 出售 ---- */
  function sellSheet(itemId) {
    var s = S(), n = s.inv[itemId] || 0, price = FARM.itemPrice(itemId);
    UI.sheet('<h4>出售 ' + esc(FARM.itemName(itemId)) + '<span class="x" data-act="closeSheet">×</span></h4>' +
      '<div class="row"><div class="ico">' + A.img('item.' + itemId, '') + '</div>' +
      '<div class="txt"><div class="t1">持有 ' + fmt(n) + ' · 单价 ' + price + '</div>' +
      '<div class="t2">全部卖出可得 ' + fmt(price * n) + ' 金币</div></div></div>' +
      '<div class="btn-row">' +
      '<button class="btn sm" data-act="sellN" data-id="' + itemId + '" data-n="1">卖 1 个</button>' +
      '<button class="btn sm" data-act="sellN" data-id="' + itemId + '" data-n="10">卖 10 个</button>' +
      '<button class="btn sm gold" data-act="sellN" data-id="' + itemId + '" data-n="' + n + '">全部卖出</button>' +
      '</div>');
  }

  /* ================= 新手引导 ================= */
  function curStep() { return D.TUTORIAL[S().tutorial.i] || null; }

  function renderTutor() {
    var s = S(), root = $('#tutorRoot');
    if (!s || s.tutorial.done || !curStep()) { root.innerHTML = ''; return; }
    var st = curStep();
    /* 需要等待某个动作时隐藏遮罩，让玩家先去操作 */
    if (s.tutorial.waiting) { root.innerHTML = ''; return; }
    if (st.view && st.view !== UI.view) { UI.view = st.view; render(); return; }

    var html = '<div class="tutor-mask"></div>' +
      '<div class="tutor"><div class="tt">' + esc(st.title) + '</div>' +
      '<div class="tc">' + st.text + '</div>' +
      '<div class="tf"><span class="step">第 ' + (s.tutorial.i + 1) + ' / ' + D.TUTORIAL.length + ' 步</span>' +
      '<button class="btn" data-act="tutorNext">' + esc(st.btn || '继续') + '</button></div></div>';
    root.innerHTML = html;

    /* 高亮目标 */
    if (st.target) {
      var el = $(st.target);
      if (el) {
        var r = el.getBoundingClientRect(), ar = $('#app').getBoundingClientRect();
        var sp = doc.createElement('div');
        sp.className = 'spot';
        sp.style.left = (r.left - ar.left - 4) + 'px';
        sp.style.top = (r.top - ar.top - 4) + 'px';
        sp.style.width = (r.width + 8) + 'px';
        sp.style.height = (r.height + 8) + 'px';
        root.appendChild(sp);
      }
    }
  }

  UI.tutorialSignal = function (act) {
    var s = S();
    if (!s || s.tutorial.done) return;
    if (s.tutorial.waiting !== act) return;
    s.tutorial.waiting = null;
    s.tutorial.i++;
    if (s.tutorial.i >= D.TUTORIAL.length) s.tutorial.done = true;
    FARM.state.touch();
    renderTutor();
    render();
  };

  function tutorNext() {
    var s = S(), st = curStep();
    if (!st) return;
    if (st.wait) { s.tutorial.waiting = st.wait; }
    else { s.tutorial.i++; if (s.tutorial.i >= D.TUTORIAL.length) s.tutorial.done = true; }
    FARM.state.touch();
    render();
  }

  /* ================= 事件委托 ================= */
  function onClick(e) {
    var el = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!el) return;
    var act = el.getAttribute('data-act');
    var id = el.getAttribute('data-id');
    var i = parseInt(el.getAttribute('data-i'), 10);
    var s = S();

    switch (act) {
      /* --- 通用 --- */
      case 'closeSheet': UI.closeSheet(); return;
      case 'closeModal': UI.closeModal(); return;
      case 'confirmYes':
        var cb = UI._confirmCb; UI._confirmCb = null; UI.closeModal();
        if (cb) cb();
        return;

      /* --- 农场 --- */
      case 'plot': onPlot(i); return;
      case 'harvestAll': run(function () { return FARM.sim.harvestAll(); }); return;
      case 'waterAll': run(function () { return FARM.sim.waterAll(); }); return;
      case 'cleanAll': run(function () { return FARM.sim.cleanAll(); }); return;
      case 'expand': run(function () { return FARM.sim.expandPlot(); }); return;
      case 'sow': UI.closeSheet(); run(function () { return FARM.sim.sow(i, id); }); return;
      case 'water': UI.closeSheet(); run(function () { return FARM.sim.water(i); }); return;
      case 'fertilize': UI.closeSheet(); run(function () { return FARM.sim.fertilize(i); }); return;
      case 'speedGrow': UI.closeSheet(); run(function () { return FARM.sim.speedGrow(i); }); return;
      case 'revive': UI.closeSheet(); run(function () { return FARM.sim.revive(i); }); return;
      case 'clearPlot': UI.closeSheet(); clearConfirm(i); return;
      case 'farmDecor':
        if (s.farmDecor.indexOf(id) >= 0) return UI.toast('已经拥有了', 'warn');
        run(function () { return FARM.sim.buyFarmDecor(id); });
        return;

      /* --- 牧场 --- */
      case 'pen': penSheet(i); return;
      case 'buyAnimal': UI.closeSheet(); run(function () { return FARM.sim.buyAnimal(i, id); }); return;
      case 'feed': UI.closeSheet(); run(function () { return FARM.sim.feedPen(i); }); return;
      case 'pet': UI.closeSheet(); run(function () { return FARM.sim.petPen(i); }); return;
      case 'clean': UI.closeSheet(); run(function () { return FARM.sim.cleanPen(i); }); return;
      case 'collect': UI.closeSheet(); run(function () { return FARM.sim.collectPen(i); }); return;
      case 'collectAllPens': run(function () { return FARM.sim.collectAllPens(); }); return;
      case 'feedAll':
        var ok2 = 0;
        for (var q = 0; q < s.pens.length; q++) {
          if (s.pens[q].animal && !s.pens[q].locked) { if (FARM.sim.feedPen(q).ok) ok2++; }
        }
        UI.toast(ok2 ? '喂食 ' + ok2 + ' 个栏位' : '没有可喂食的栏位（饲料不足？）', ok2 ? 'ok' : 'warn');
        render();
        return;
      case 'expandPen': run(function () { return FARM.sim.expandPen(); }); return;

      /* --- 加工 --- */
      case 'buildFactory': run(function () { return FARM.sim.buildFactory(id); }); return;
      case 'factory': factorySheet(id); return;
      case 'craft': UI.closeSheet(); run(function () { return FARM.sim.startRecipe(el.getAttribute('data-f'), id); }); return;
      case 'rush': UI.closeSheet(); run(function () { return FARM.sim.rushFactory(id, i); }); return;
      case 'upF': UI.closeSheet(); run(function () { return FARM.sim.upgradeFactory(id); }); return;

      /* --- 分店 --- */
      case 'buildShop': run(function () { return FARM.sim.buildShop(id); }); return;
      case 'shop': shopSheet(id); return;
      case 'upS': UI.closeSheet(); run(function () { return FARM.sim.upgradeShop(id); }); return;
      case 'hire': UI.closeSheet(); run(function () { return FARM.sim.hire(id, el.getAttribute('data-s')); }); return;
      case 'decor': UI.closeSheet(); run(function () { return FARM.sim.buyDecor(id, el.getAttribute('data-d')); }); return;
      case 'promo': UI.closeSheet(); run(function () { return FARM.sim.promoShop(id); }); return;
      case 'signature':
        var dish = el.getAttribute('data-d');
        var cur = s.shops[id] && s.shops[id].signature;
        /* 已是招牌菜 → 再点就是补货 10 份；否则设为招牌菜 */
        run(function () {
          var r = (cur === dish)
            ? FARM.sim.transfer(id, dish, 10)
            : FARM.sim.setSignature(id, dish);
          shopSheet(id);   /* 重开抽屉，立即反映 ★ 标记 / 库存 / 取消按钮 */
          return r;
        });
        return;
      case 'clearSignature':
        run(function () {
          var r = FARM.sim.setSignature(id, null);
          shopSheet(id);
          return r;
        });
        return;
      case 'stock':
        UI.closeSheet();
        run(function () { return FARM.sim.transfer(id, el.getAttribute('data-item'), 10); });
        return;

      /* --- 仓库 --- */
      case 'sellItem': sellSheet(id); return;
      case 'sellN':
        UI.closeSheet();
        run(function () { return FARM.sim.sell(id, parseInt(el.getAttribute('data-n'), 10)); });
        return;
      case 'upgradeCap': run(function () { return FARM.sim.upgradeCap(); }); return;
      case 'sellAll': sellAllSheet(); return;

      /* --- 订单 --- */
      case 'refreshOrders': run(function () { FARM.sim.refreshOrders(true); return { ok: true, msg: '订单已刷新' }; }); return;
      case 'deliverOrder': run(function () { return FARM.sim.deliverOrder(i); }); return;

      /* --- 邻居 --- */
      case 'helpNb': run(function () { return FARM.sys.helpNeighbor(i); }); return;
      case 'stealNb': run(function () { return FARM.sys.stealNeighbor(i); }); return;

      /* --- 更多 --- */
      case 'claimDaily': run(function () { return FARM.sys.claimDaily(id); }); return;
      case 'rollDaily':
        FARM.sys.rollDaily(true);
        UI.toast('已换一批每日任务', 'ok');
        render();
        return;
      case 'exportSave': exportSave(); return;
      case 'importSave': importSave(); return;
      case 'resetSave':
        confirmBox('清空存档', '这会删除全部进度且<b>无法恢复</b>。建议先导出存档。', function () {
          FARM.state.reset(); render(); UI.toast('存档已清空', 'warn');
        }, '确认清空');
        return;
      case 'replayTutorial':
        s.tutorial = { i: 0, done: false, waiting: null };
        FARM.state.touch(); render();
        return;
      case 'toggleSound':
        s.settings.sound = !s.settings.sound;
        FARM.state.touch(); render();
        return;

      /* --- 引导 --- */
      case 'tutorNext': tutorNext(); return;

      /* --- 拓展玩法（果园 / 鱼塘 / 矿洞 / 厨房 / 宠物） --- */
      default:
        if (FARM.expUI && FARM.expUI.act(act, el, i, id)) return;
    }
  }

  function sellAllSheet() {
    var s = S();
    var h = '<h4>批量出售<span class="x" data-act="closeSheet">×</span></h4><div class="opts">';
    var any = false;
    for (var k in s.inv) {
      if (s.inv[k] <= 0) continue;
      any = true;
      h += '<div class="opt" data-act="sellN" data-id="' + k + '" data-n="' + s.inv[k] + '">' +
        A.img('item.' + k, '') + '<div class="n">' + esc(FARM.itemName(k)) + '</div>' +
        '<div class="s">×' + s.inv[k] + ' · ' + fmt(FARM.itemPrice(k) * s.inv[k]) + '</div></div>';
    }
    if (!any) return UI.toast('仓库是空的', 'warn');
    UI.sheet(h + '</div>');
  }

  function exportSave() {
    var txt = FARM.state.exportText();
    UI.modal('<h4>导出存档</h4><div class="body">复制下面的文本保存好：</div>' +
      '<textarea class="txt" rows="5" style="margin-top:8px">' + esc(txt) + '</textarea>' +
      '<div class="foot"><button class="btn" data-act="closeModal">关闭</button></div>');
    var ta = $('#modalRoot textarea');
    if (ta) { ta.focus(); ta.select(); }
  }

  function importSave() {
    UI.modal('<h4>导入存档</h4><div class="body">粘贴之前导出的存档文本：</div>' +
      '<textarea class="txt" rows="5" id="impTxt" style="margin-top:8px"></textarea>' +
      '<div class="foot"><button class="btn grey" data-act="closeModal">取消</button>' +
      '<button class="btn" data-act="doImport">导入</button></div>');
    UI._confirmCb = function () {
      var t = $('#impTxt');
      if (!t || !t.value) return;
      var r = FARM.state.importText(t.value);
      UI.toast(r && r.ok ? '导入成功' : ('导入失败：' + (r && r.msg || '格式错误')), r && r.ok ? 'ok' : 'bad');
      render();
    };
    /* 复用确认按钮 */
    var btn = $('#modalRoot [data-act="doImport"]');
    if (btn) btn.setAttribute('data-act', 'confirmYes');
  }

  /* ================= 绑定 ================= */
  function bind() {
    doc.addEventListener('click', onClick);
    var tabs = doc.querySelectorAll('#tabbar .tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener('click', function () {
        UI.setView(this.getAttribute('data-view'));
      });
    }
    /* 长按地块查看详情 */
    var timer = null;
    $('#view').addEventListener('touchstart', function (e) {
      var el = e.target.closest ? e.target.closest('.plot') : null;
      if (!el) return;
      var idx = parseInt(el.getAttribute('data-i'), 10);
      timer = setTimeout(function () {
        var p = S().plots[idx];
        if (p && p.crop && !p.locked) plotSheet(idx);
      }, 520);
    }, { passive: true });
    $('#view').addEventListener('touchend', function () { clearTimeout(timer); });
    $('#view').addEventListener('touchmove', function () { clearTimeout(timer); });
    $('#view').addEventListener('contextmenu', function (e) {
      var el = e.target.closest ? e.target.closest('.plot') : null;
      if (!el) return;
      e.preventDefault();
      var idx = parseInt(el.getAttribute('data-i'), 10);
      var p = S().plots[idx];
      if (p && p.crop && !p.locked) plotSheet(idx);
    });
  }

  UI.boot = function () {
    bind();
    render();
  };

  FARM.ui = UI;
})(window);

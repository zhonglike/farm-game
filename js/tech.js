/* ==========================================================
 *  tech.js — 研究院（科技树）
 *  · 消耗金币 + 矿物，时间解锁，永久加成
 *  · 加成通过 FARM.tech.buff(key) 注入 sim.js / exp.js 的各个环节
 *  · 矿物（石块 / 铁 / 煤 / 宝石）的主要消耗出口就在这里
 * ========================================================== */
(function (global) {
  'use strict';
  var FARM = global.FARM;
  var D = FARM.DATA, S = FARM.state, K = D.CONST;
  var now = FARM.now;
  var V = FARM.views;

  function st() { return S.data; }
  function tstr(d) { return FARM.vfmt.timeStr(d); }
  function fmt(n) { return FARM.vfmt.fmt(n); }
  function esc(x) { return FARM.vfmt.esc(x); }
  function A() { return FARM.assets; }
  function im(k, c) { return A().img(k, c); }

  function ok(m, extra) { var r = { ok: true, msg: m }; if (extra) for (var k in extra) r[k] = extra[k]; return r; }
  function fail(m) { return { ok: false, msg: m }; }

  /* ==========================================================
   *  加成查询
   * ========================================================== */
  function buff(key) {
    var s = st(), v = 0;
    if (!s.tech || !s.tech.lv) return 0;
    for (var tid in s.tech.lv) {
      var cfg = D.TECH[tid];
      if (!cfg || !cfg.eff || !cfg.eff[key]) continue;
      v += cfg.eff[key] * s.tech.lv[tid];
    }
    return v;
  }
  function lv(tid) { var s = st(); return (s.tech && s.tech.lv && s.tech.lv[tid]) || 0; }
  function labSpeed() { return D.LAB.speed[Math.min(D.LAB.speed.length, Math.max(1, st().tech.lab)) - 1]; }

  /* 某项科技的研究成本随等级上涨（每级 ×1.6） */
  function techCost(tid) {
    var cfg = D.TECH[tid], l = lv(tid), out = {};
    for (var k in cfg.cost) out[k] = Math.floor(cfg.cost[k] * Math.pow(1.6, l));
    return out;
  }
  function canPay(cost) {
    var s = st();
    for (var k in cost) {
      if (k === 'coins') { if (s.coins < cost[k]) return false; }
      else if (k === 'gem') { if (s.gems < cost[k]) return false; }
      else if (!S.has(k, cost[k])) return false;
    }
    return true;
  }
  function pay(cost) {
    var s = st();
    for (var k in cost) {
      if (k === 'coins') S.spend(cost[k]);
      else if (k === 'gem') s.gems -= cost[k];
      else S.add(k, -cost[k]);
    }
  }
  function costText(cost) {
    var parts = [];
    for (var k in cost) {
      if (k === 'coins') parts.push(fmt(cost[k]) + ' 金币');
      else if (k === 'gem') parts.push(fmt(cost[k]) + ' 钻');
      else parts.push(FARM.itemName(k) + ' ×' + cost[k]);
    }
    return parts.join(' · ');
  }

  /* ==========================================================
   *  研究流程
   * ========================================================== */
  function startTech(tid) {
    var s = st(), cfg = D.TECH[tid];
    if (!cfg) return fail('没有这项科技');
    if (s.tech.doing) return fail('实验室正在研究其它项目');
    if (lv(tid) >= cfg.max) return fail(cfg.name + ' 已满级');
    if (s.level < cfg.lv) return fail('Lv.' + cfg.lv + ' 解锁' + cfg.name);
    var cost = techCost(tid);
    if (!canPay(cost)) return fail('材料不足：' + costText(cost));
    pay(cost);
    s.tech.doing = { tid: tid, endAt: now() + cfg.time * 1000 / labSpeed() };
    S.touch();
    return ok('开始研究 ' + cfg.name + ' Lv.' + (lv(tid) + 1) + '，' + tstr(cfg.time * 1000 / labSpeed()) + '后完成');
  }

  function finishTech() {
    var s = st(), d = s.tech.doing;
    if (!d) return;
    var cfg = D.TECH[d.tid];
    s.tech.lv[d.tid] = lv(d.tid) + 1;
    s.tech.total = (s.tech.total || 0) + 1;
    s.tech.doing = null;
    /* 仓储类科技直接作用于仓库上限 */
    if (cfg.eff.cap) s.cap += cfg.eff.cap;
    S.touch();
    FARM.sys && FARM.sys.checkAch('firstTech');
    if (s.tech.total >= 10) FARM.sys && FARM.sys.checkAch('tech10');
    var allMax = true;
    for (var t in D.TECH) if (lv(t) < D.TECH[t].max) allMax = false;
    if (allMax) FARM.sys && FARM.sys.checkAch('techAll');
    if (FARM.ui) FARM.ui.toast('研究完成：' + cfg.name + ' Lv.' + lv(d.tid) + '（' + cfg.desc + '）', 'gold');
  }

  function techStep() {
    var s = st();
    if (s.tech && s.tech.doing && now() >= s.tech.doing.endAt) finishTech();
  }

  function rushTech() {
    var s = st();
    if (!s.tech.doing) return fail('没有在研项目');
    var left = Math.max(0, s.tech.doing.endAt - now());
    var gems = Math.max(1, Math.ceil(left / 60000));   /* 每分钟 1 钻 */
    if (s.gems < gems) return fail('钻石不足（需要 ' + gems + '）');
    s.gems -= gems;
    s.tech.doing.endAt = now();
    S.touch();
    return ok('科研经费到位（-' + gems + ' 钻），立刻出成果');
  }

  function upgradeLab() {
    var s = st();
    if (s.tech.lab >= D.LAB.speed.length) return fail('实验室已满级');
    var cost = D.LAB.upCost[s.tech.lab - 1];
    if (!cost) return fail('已满级');
    if (s.level < 6 + s.tech.lab * 2) return fail('Lv.' + (6 + s.tech.lab * 2) + ' 解锁下一级实验室');
    if (!canPay(cost)) return fail('材料不足：' + costText(cost));
    pay(cost);
    s.tech.lab++;
    S.touch();
    if (s.tech.lab >= D.LAB.speed.length) FARM.sys && FARM.sys.checkAch('lab5');
    return ok('实验室升到 Lv.' + s.tech.lab + '（研究速度 ×' + labSpeed() + '）');
  }

  function tick() { techStep(); }

  /* ==========================================================
   *  视图
   * ========================================================== */
  V.lab = function () {
    var s = st();
    if (!s.tech) s.tech = { lab: 1, doing: null, lv: {}, total: 0 };
    var nextUp = s.tech.lab < D.LAB.speed.length ? D.LAB.upCost[s.tech.lab - 1] : null;
    var h = '<div class="panel"><h3>' + im('ui.star') + '研究院 <span class="tag">实验室 Lv.' + s.tech.lab +
      ' · 研究速度 ×' + labSpeed() + '</span></h3>' +
      '<div class="hint">科技提供<b>永久加成</b>，主要消耗矿洞产出的矿石。研究需要时间，可用钻石加速（每 1 分钟 1 钻）。</div>';

    /* 在研项目 */
    if (s.tech.doing) {
      var dg = D.TECH[s.tech.doing.tid];
      var left = s.tech.doing.endAt - now();
      h += '<div class="row"><div class="ico">' + im('ui.gear') + '</div>' +
        '<div class="txt"><div class="t1">正在研究：' + esc(dg.name) + ' Lv.' + (lv(s.tech.doing.tid) + 1) + '</div>' +
        '<div class="t2">' + (left > 0 ? '剩余 ' + tstr(left) : '<span class="tagpill">即将完成</span>') +
        '<br>' + esc(dg.desc) + '</div></div>' +
        '<div class="ops">' + (left > 0 ? '<button class="btn sm gold" data-act="rushTech">⏩ 加速</button>' : '') + '</div></div>';
    } else {
      h += '<div class="hint mt8">实验室空闲中，选择下面的科技开始研究。</div>';
    }

    h += '<div class="btn-row mt8">' +
      (nextUp ? '<button class="btn sm gold" data-act="upLab">' + im('ui.plus') + '升级实验室 ' + costText(nextUp) + '</button>'
        : '<span class="tagpill">实验室已满级</span>') +
      '</div></div>';

    /* 科技列表 */
    h += '<div class="panel"><h3>' + im('ui.trophy') + '科技树 <span class="tag">已研究 ' + (s.tech.total || 0) + ' 级</span></h3>';
    for (var tid in D.TECH) {
      var c = D.TECH[tid], l = lv(tid), maxed = l >= c.max;
      var cost = maxed ? null : techCost(tid);
      var can = !maxed && !s.tech.doing && s.level >= c.lv && canPay(cost);
      var pw = Math.round(l / c.max * 100);
      h += '<div class="row"><div class="ico">' + im('ui.star') + '</div>' +
        '<div class="txt"><div class="t1">' + esc(c.name) +
        ' <span class="tagpill' + (maxed ? '' : ' b') + '">Lv.' + l + '/' + c.max + '</span></div>' +
        '<div class="t2">' + esc(c.desc) +
        (maxed ? '<br><span class="tagpill">已满级</span>'
          : (s.level < c.lv ? '<br>Lv.' + c.lv + ' 解锁' : '<br>' + costText(cost) + ' · ' + tstr(c.time * 1000 / labSpeed()))) +
        '</div>' +
        '<div class="pb"><i style="width:' + pw + '%"></i></div></div>' +
        '<div class="ops">' + (can ? '<button class="btn sm gold" data-act="startTech" data-id="' + tid + '">研究</button>' : '') + '</div></div>';
    }
    h += '</div>';

    /* 已生效加成一览 */
    h += '<div class="panel"><h3>' + im('ui.check') + '当前生效加成</h3><div class="stat-grid">' +
      kv('作物生长', pct(buff('grow'))) + kv('作物产量', pct(buff('yield'))) +
      kv('水分保持', pct(Math.min(0.9, buff('water')))) + kv('加工速度', pct(buff('craft'))) +
      kv('出餐速度', pct(buff('dishSpeed'))) + kv('分店客单价', pct(buff('shopPrice'))) +
      kv('订单报酬', pct(buff('orderPay'))) + kv('动物产出', pct(buff('animal'))) +
      kv('矿洞产量', '+' + Math.round(buff('mineYield'))) + kv('宠物亲密', pct(buff('petBond'))) +
      kv('枯萎延时', pct(buff('wither'))) +
      '</div></div>';
    return h;
  };
  function pct(v) { return (v >= 0 ? '+' : '') + Math.round(v * 100) + '%'; }
  function kv(k, v) {
    return '<div class="stat"><div class="v">' + esc(v) + '</div><div class="k">' + esc(k) + '</div></div>';
  }

  /* ==========================================================
   *  动作分发
   * ========================================================== */
  function run(fn) {
    var r = fn();
    if (!r) return r;
    if (r.ok) FARM.ui.toast(r.msg, 'ok');
    else FARM.ui.toast(r.msg, /不足|需要|已满|解锁/.test(r.msg) ? 'warn' : 'bad');
    FARM.ui.render();
    S.touch();
    return r;
  }

  function act(name, el, i, id) {
    switch (name) {
      case 'startTech': run(function () { return startTech(id); }); return true;
      case 'rushTech': run(function () { return rushTech(); }); return true;
      case 'upLab': run(function () { return upgradeLab(); }); return true;
    }
    return false;
  }

  FARM.tech = {
    buff: buff, lv: lv, labSpeed: labSpeed, techCost: techCost,
    startTech: startTech, rushTech: rushTech, upgradeLab: upgradeLab,
    tick: tick, act: act
  };

  /* 让 exp / ui 的通用转发也能处理研究院动作 */
  var _expAct = FARM.expUI ? FARM.expUI.act : null;
  if (_expAct) {
    FARM.expUI.act = function (name, el, i, id) {
      if (act(name, el, i, id)) return true;
      return _expAct(name, el, i, id);
    };
  }
})(window);

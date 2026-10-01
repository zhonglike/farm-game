/* ==========================================================
 *  exp_views.js — 拓展玩法「视图 + 交互层」
 *  新增视图：果园 / 鱼塘 / 矿洞 / 厨房 / 宠物
 *  点击动作由 ui.js 的 switch default 转发到 FARM.expUI.act()
 * ========================================================== */
(function (global) {
  'use strict';
  var FARM = global.FARM;
  var D = FARM.DATA, S = FARM.state, K = D.CONST;
  var E = FARM.exp;
  var now = FARM.now;
  var V = FARM.views;

  function st() { return S.data; }
  function A() { return FARM.assets; }
  function fmt(n) { return FARM.vfmt.fmt(n); }
  function tstr(d) { return FARM.vfmt.timeStr(d); }
  function esc(x) { return FARM.vfmt.esc(x); }
  function im(key, cls) { return A().img(key, cls); }
  function ui(n, cls) { return A().img('ui.' + n, cls); }

  /* ==========================================================
   *  一、果园
   * ========================================================== */
  function treeCard(i) {
    var s = st(), slot = s.orchard[i];
    if (slot.locked) {
      var nx = E.nextTreeUnlock();
      var cost = (nx && nx.index === i) ? nx.cfg.cost : null;
      return '<div class="card locked" data-act="treeSlot" data-i="' + i + '">' +
        '<div class="pic">' + ui('lock') + '</div>' +
        '<div class="nm">未开垦</div>' +
        '<div class="sub">' + (cost ? fmt(cost) + ' 金币' : '需开垦') + '</div></div>';
    }
    if (!slot.tree) {
      return '<div class="card empty" data-act="treeSlot" data-i="' + i + '">' +
        '<div class="pic">' + ui('plus') + '</div>' +
        '<div class="nm">空树位</div><div class="sub">点击种树</div></div>';
    }
    var cfg = D.ORCHARD[slot.tree];
    var ripe = slot.state === 'ripe';
    var sub = ripe ? '<span class="tagpill">可收 ' + slot.pending + '</span>'
      : '结果 ' + tstr(slot.readyAt - now());
    var pic = ripe ? im('item.' + slot.tree) : im('tree.' + slot.tree);
    return '<div class="card' + (ripe ? ' done' : '') + '" data-act="treeSlot" data-i="' + i + '">' +
      '<div class="pic">' + pic + '</div>' +
      '<div class="nm">' + esc(cfg.name) + '</div>' +
      '<div class="sub">' + sub + '</div>' +
      '<div class="sub">每轮 ' + cfg.yield + ' 个 · ' + tstr(cfg.cycle * 1000) + '</div>' +
      '</div>';
  }

  V.orchard = function () {
    var s = st();
    var nx = E.nextTreeUnlock();
    var h = '<div class="panel"><h3>' + im('tree.apple') + '果园 <span class="tag">一次种植，反复结果</span></h3>' +
      '<div class="hint">果树不占农田地块：种下后先经历首次成熟，之后每轮自动结果，收完继续下一轮。当季果树生长更快。</div>' +
      '<div class="btn-row">' +
      '<button class="btn sm" data-act="harvestAllTrees">' + A().img('fx.basket', '') + '一键收果 ' +
        (E.ripeTrees() ? '(' + E.ripeTrees() + ')' : '') + '</button>' +
      (nx ? '<button class="btn sm gold" data-act="unlockTreeSlot">' + ui('plus') + '开垦树位 ' + fmt(nx.cfg.cost) + '</button>'
          : '<span class="tagpill">树位已全部开垦</span>') +
      '</div></div>';
    h += '<div class="cards">';
    for (var i = 0; i < s.orchard.length; i++) h += treeCard(i);
    h += '</div>';
    return h;
  };

  /* ==========================================================
   *  二、鱼塘
   * ========================================================== */
  function pondCard(i) {
    var s = st(), slot = s.pond[i];
    if (slot.locked) {
      var nx = E.nextPondUnlock();
      var cost = (nx && nx.index === i) ? nx.cfg.cost : null;
      return '<div class="card locked" data-act="pondSlot" data-i="' + i + '">' +
        '<div class="pic">' + ui('lock') + '</div>' +
        '<div class="nm">未开挖</div>' +
        '<div class="sub">' + (cost ? fmt(cost) + ' 金币' : '需开挖') + '</div></div>';
    }
    if (!slot.fish) {
      return '<div class="card empty" data-act="pondSlot" data-i="' + i + '">' +
        '<div class="pic">' + ui('plus') + '</div>' +
        '<div class="nm">空塘</div><div class="sub">点击投放鱼苗</div></div>';
    }
    var cfg = D.POND_FISH[slot.fish];
    var ripe = slot.state === 'ripe';
    return '<div class="card' + (ripe ? ' done' : '') + '" data-act="pondSlot" data-i="' + i + '">' +
      '<div class="pic">' + im('item.fish') + '</div>' +
      '<div class="nm">' + esc(cfg.name) + (slot.fed ? ' <span class="tagpill">已喂</span>' : '') + '</div>' +
      '<div class="sub">' + (ripe ? '<span class="tagpill">可捕 ' + slot.pending + '</span>' : '成鱼 ' + tstr(slot.readyAt - now())) + '</div>' +
      '<div class="sub">产鱼 ' + (cfg.out.fish || 1) + ' 条 / 轮</div>' +
      '</div>';
  }

  V.pond = function () {
    var s = st();
    var nx = E.nextPondUnlock();
    var h = '<div class="panel"><h3>' + im('item.fish') + '鱼塘 <span class="tag">水产线，供给寿司订单</span></h3>' +
      '<div class="hint">投放鱼苗后等待成鱼，喂食可让本轮成熟时间缩短 30%。捞上来的鱼可以直接卖，也能进厨房做菜。</div>' +
      '<div class="btn-row">' +
      '<button class="btn sm" data-act="collectAllFish">' + A().img('fx.basket', '') + '一键捕捞 ' +
        (E.ripePonds() ? '(' + E.ripePonds() + ')' : '') + '</button>' +
      '<button class="btn sm" data-act="feedAllFish">' + A().img('fx.can', '') + '一键喂食</button>' +
      (nx ? '<button class="btn sm gold" data-act="unlockPondSlot">' + ui('plus') + '开挖新塘 ' + fmt(nx.cfg.cost) + '</button>' : '') +
      '</div></div>';
    h += '<div class="cards">';
    for (var i = 0; i < s.pond.length; i++) h += pondCard(i);
    h += '</div>';
    return h;
  };

  /* ==========================================================
   *  三、矿洞
   * ========================================================== */
  V.mine = function () {
    var s = st(), m = s.mine, cfg = E.mineCfg();
    var nextLv = m.lv < K.MAX_MINE_LV ? D.MINE_UNLOCKS[m.lv] : null;
    var h = '<div class="panel"><h3>' + im('item.stone') + '矿洞 <span class="tag">Lv.' + m.lv + ' / ' + K.MAX_MINE_LV + '</span></h3>' +
      '<div class="hint">派矿工下井，按时长产出矿石。等级越高：单次产量越多、耗时越短、稀有矿（煤 / 宝石）概率越高。</div>';

    h += '<div class="row"><div class="ico">' + im('build.mine') + '</div>' +
      '<div class="txt"><div class="t1">' +
      (m.drops ? '<span class="tagpill">矿石已出井，待领取</span>'
        : (m.endAt ? '作业中 · 剩余 ' + tstr(m.endAt - now()) : '矿工待命')) + '</div>' +
      '<div class="t2">单次 ' + cfg.yield + ' 份 · 耗时 ' + cfg.time + ' 秒 · Lv.' + m.lv + ' 掉落权重 ' +
      JSON.stringify(D.MINE_DROP[Math.min(5, Math.max(1, m.lv)) - 1]).replace(/[{}\"]/g, '') + '</div></div>' +
      '<div class="ops">' +
      (m.drops ? '<button class="btn sm gold" data-act="claimMine">领取</button>'
        : (m.endAt ? '<button class="btn sm gold" data-act="rushMine">⏩2钻</button>'
          : '<button class="btn sm gold" data-act="startMine">下井挖矿</button>')) +
      '</div></div>';

    if (m.drops) {
      h += '<div class="inv mt8">';
      for (var k in m.drops) {
        h += '<div class="slot"><span class="q">' + m.drops[k] + '</span>' + im('item.' + k) +
          '<div class="n">' + esc(FARM.itemName(k)) + '</div></div>';
      }
      h += '</div>';
    }

    h += '<div class="btn-row mt8">' +
      (nextLv ? '<button class="btn sm gold" data-act="upMine">' + ui('plus') + '升级矿洞 ' + fmt(nextLv.cost) + '</button>' : '') +
      '</div>';
    h += '</div>';

    /* 矿物价目表 */
    h += '<div class="panel"><h3>' + ui('star') + '矿物图鉴 <span class="tag">卖给商人 / 交付订单</span></h3><div class="inv">';
    for (var mk in D.MINERALS) {
      h += '<div class="slot"><span class="q">' + fmt(s.inv[mk] || 0) + '</span>' + im('item.' + mk) +
        '<div class="n">' + esc(D.MINERALS[mk].name) + ' ' + D.MINERALS[mk].price + '</div></div>';
    }
    h += '</div></div>';
    return h;
  };

  /* ==========================================================
   *  四、农家厨房
   * ========================================================== */
  V.kitchen = function () {
    var s = st(), kt = s.kitchen;
    var slots = E.kitchenSlots();
    var h = '<div class="panel"><h3>' + im('item.soup') + '农家厨房 <span class="tag">Lv.' + kt.lv + ' · 灶台 ' + kt.queue.length + '/' + slots + '</span></h3>' +
      '<div class="hint">把农田与牧场的产出做成菜，菜品单价最高，也是高级订单的主要来源；' +
      '做好的菜还能调拨到分店当<b>招牌菜</b>（客单价 +35%）。升级厨房可增加灶台并加快出餐。</div>' +
      '<div class="btn-row"><button class="btn sm gold" data-act="upKitchen">' + ui('plus') +
      '升级厨房 ' + fmt(E.kitchenUpCost()) + '</button></div></div>';

    if (kt.queue.length) {
      h += '<div class="panel"><h3>' + ui('menu') + '烹饪中</h3>';
      kt.queue.forEach(function (q, idx) {
        var cfg = D.DISHES[q.did];
        var left = q.endAt - now();
        h += '<div class="row"><div class="ico">' + im('item.' + cfg.out) + '</div>' +
          '<div class="txt"><div class="t1">' + esc(cfg.name) + '</div>' +
          '<div class="t2">' + (left > 0 ? '剩余 ' + tstr(left) : '<span class="tagpill">已出餐，等待入库</span>') + '</div></div>' +
          '<div class="ops">' + (left > 0 ? '<button class="btn sm gold" data-act="rushDish" data-i="' + idx + '">⏩2钻</button>' : '') + '</div></div>';
      });
      h += '</div>';
    }

    h += '<div class="panel"><h3>' + ui('basket') + '菜谱 <span class="tag">共 ' + Object.keys(D.DISHES).length + ' 道</span></h3><div class="opts">';
    for (var did in D.DISHES) {
      var c = D.DISHES[did];
      var enough = true, need = [];
      for (var k in c.in) {
        var has = s.inv[k] || 0;
        if (has < c.in[k]) enough = false;
        need.push(FARM.itemName(k) + '×' + c.in[k]);
      }
      var full = kt.queue.length >= slots;
      var cooked = s.dex.dishes[did] || 0;
      h += '<div class="opt' + (enough && !full && s.level >= c.lv ? '' : ' dis') + '" data-act="cook" data-id="' + did + '">' +
        im('item.' + c.out) +
        '<div class="n">' + esc(c.name) + (cooked ? ' <span class="tagpill">做过' + cooked + '</span>' : '') + '</div>' +
        '<div class="s">' + (s.level >= c.lv ? need.join(' ') : 'Lv.' + c.lv + ' 解锁') +
        '<br>' + tstr(c.time * 1000) + ' · 售价 ' + fmt(c.price) + ' · +' + c.xp + '经验</div></div>';
    }
    h += '</div></div>';
    return h;
  };

  /* ==========================================================
   *  五、宠物
   * ========================================================== */
  V.pet = function () {
    var s = st();
    var h = '<div class="panel"><h3>' + im('pet.dog') + '宠物小屋 <span class="tag">被动加成，全链路生效</span></h3>' +
      '<div class="hint">领养后用「宠物饲料」喂食，亲密度满 100 升一级，加成随等级放大。所有已领养宠物同时生效。</div></div>';

    /* 已领养 */
    var owned = Object.keys(s.pets);
    if (owned.length) {
      h += '<div class="panel"><h3>' + ui('heart') + '我的伙伴</h3><div class="cards">';
      owned.forEach(function (id) {
        var cfg = D.PETS[id], p = s.pets[id];
        var need = D.PET_LEVEL_UP * p.lv;
        h += '<div class="card"><div class="pic">' + im('pet.' + id) + '</div>' +
          '<div class="nm">' + esc(cfg.name) + ' <span class="tagpill">Lv.' + p.lv + '</span></div>' +
          '<div class="sub">' + esc(cfg.desc) + '</div>' +
          '<div class="pb"><i style="width:' + Math.round(p.bond / need * 100) + '%"></i></div>' +
          '<div class="sub">亲密 ' + Math.round(p.bond) + ' / ' + need + '</div>' +
          '<div class="ops mt8"><button class="btn sm" data-act="feedPet" data-id="' + id + '">🍖 喂食</button></div>' +
          '</div>';
      });
      h += '</div></div>';
    }

    /* 可领养 */
    h += '<div class="panel"><h3>' + ui('plus') + '领养中心 <span class="tag">已领养 ' + owned.length + '/' + Object.keys(D.PETS).length + '</span></h3><div class="opts">';
    for (var pid in D.PETS) {
      var pc = D.PETS[pid], has = !!s.pets[pid];
      var can = !has && s.level >= pc.lv && s.coins >= pc.cost;
      h += '<div class="opt' + (can ? '' : ' dis') + '" data-act="adoptPet" data-id="' + pid + '">' +
        im('pet.' + pid) +
        '<div class="n">' + esc(pc.name) + (has ? ' <span class="tagpill">已领养</span>' : '') + '</div>' +
        '<div class="s">' + (has ? '已在小屋' : fmt(pc.cost) + ' 金币<br>Lv.' + pc.lv + ' 解锁') +
        '<br>' + esc(pc.desc) + '</div></div>';
    }
    h += '</div><div class="hint mt8">宠物饲料由「磨坊」加工（小麦 ×3 → 饲料 ×1）。</div></div>';
    return h;
  };

  /* ==========================================================
   *  六、抽屉：果树 / 鱼塘详情
   * ========================================================== */
  function treeSheet(i) {
    var s = st(), slot = s.orchard[i];
    if (slot.locked) {
      var nx = E.nextTreeUnlock();
      if (!nx || nx.index !== i) return FARM.ui.toast('请先开垦前一个树位', 'warn');
      return run(function () { return E.unlockTreeSlot(); });
    }
    if (!slot.tree) {
      var h = '<h4>选择果树<span class="x" data-act="closeSheet">×</span></h4><div class="opts">';
      for (var tid in D.ORCHARD) {
        var c = D.ORCHARD[tid];
        var can = s.level >= c.lv && s.coins >= c.cost;
        h += '<div class="opt' + (can ? '' : ' dis') + '" data-act="plantTree" data-i="' + i + '" data-id="' + tid + '">' +
          im('tree.' + tid) +
          '<div class="n">' + esc(c.name) + '</div>' +
          '<div class="s">' + fmt(c.cost) + ' 金币<br>Lv.' + c.lv + ' · 首熟 ' + tstr(c.grow * 1000) +
          '<br>每 ' + tstr(c.cycle * 1000) + ' 结 ' + c.yield + ' 个<br>当季：' + esc(D.SEASONS[c.season].name) + '</div></div>';
      }
      h += '</div><div class="hint mt8">当季果树生长速度 ×1.25，非当季 ×0.72。</div>';
      return FARM.ui.sheet(h);
    }
    var cfg = D.ORCHARD[slot.tree];
    var ripe = slot.state === 'ripe';
    var h2 = '<h4>' + esc(cfg.name) + '<span class="x" data-act="closeSheet">×</span></h4>' +
      '<div class="row"><div class="ico">' + (ripe ? im('item.' + slot.tree) : im('tree.' + slot.tree)) + '</div>' +
      '<div class="txt"><div class="t1">' + (ripe ? '果实已成熟，可收 ' + slot.pending + ' 个' : '距结果 ' + tstr(slot.readyAt - now())) + '</div>' +
      '<div class="t2">每轮产量 ' + cfg.yield + ' 个 · 周期 ' + tstr(cfg.cycle * 1000) +
      '<br>当季：' + esc(D.SEASONS[cfg.season].name) + '（当前 ×' + E.treeFit(slot.tree) + '）' +
      '<br>累计收获：' + fmt(s.dex.trees[slot.tree] || 0) + ' 个</div></div></div>' +
      '<div class="btn-row">' +
      (ripe ? '<button class="btn sm gold" data-act="harvestTree" data-i="' + i + '">' + A().img('fx.basket', '') + '收获</button>'
        : '<button class="btn sm gold" data-act="rushTree" data-i="' + i + '">⏩ 催熟 3钻</button>') +
      '<button class="btn sm red" data-act="removeTree" data-i="' + i + '">砍掉</button>' +
      '</div>';
    FARM.ui.sheet(h2);
  }

  function pondSheet(i) {
    var s = st(), slot = s.pond[i];
    if (slot.locked) {
      var nx = E.nextPondUnlock();
      if (!nx || nx.index !== i) return FARM.ui.toast('请先开挖前一个塘', 'warn');
      return run(function () { return E.unlockPondSlot(); });
    }
    if (!slot.fish) {
      var h = '<h4>投放鱼苗<span class="x" data-act="closeSheet">×</span></h4><div class="opts">';
      for (var fid in D.POND_FISH) {
        var c = D.POND_FISH[fid];
        var can = s.level >= c.lv && s.coins >= c.cost;
        var feedTxt = [];
        for (var fk in c.feed) feedTxt.push(FARM.itemName(fk) + '×' + c.feed[fk]);
        h += '<div class="opt' + (can ? '' : ' dis') + '" data-act="stockFish" data-i="' + i + '" data-id="' + fid + '">' +
          im('item.fish') +
          '<div class="n">' + esc(c.name) + '</div>' +
          '<div class="s">' + fmt(c.cost) + ' 金币<br>Lv.' + c.lv + ' · 成熟 ' + tstr(c.grow * 1000) +
          '<br>产鱼 ' + (c.out.fish || 1) + ' 条 · 饲料 ' + feedTxt.join(' ') + '</div></div>';
      }
      return FARM.ui.sheet(h + '</div>');
    }
    var cfg = D.POND_FISH[slot.fish];
    var ripe = slot.state === 'ripe';
    var feedTxt2 = [];
    for (var fk2 in cfg.feed) feedTxt2.push(FARM.itemName(fk2) + '×' + cfg.feed[fk2]);
    var h2 = '<h4>' + esc(cfg.name) + '<span class="x" data-act="closeSheet">×</span></h4>' +
      '<div class="row"><div class="ico">' + im('item.fish') + '</div>' +
      '<div class="txt"><div class="t1">' + (ripe ? '可捕捞 ' + slot.pending + ' 条' : '距成鱼 ' + tstr(slot.readyAt - now())) + '</div>' +
      '<div class="t2">每轮产鱼 ' + (cfg.out.fish || 1) + ' 条 · 周期 ' + tstr(cfg.grow * 1000) +
      '<br>每轮饲料：' + feedTxt2.join('、') + (slot.fed ? ' · <span class="tagpill">本轮已喂食</span>' : '') +
      '<br>累计捕捞：' + fmt(s.dex.fish[slot.fish] || 0) + ' 条</div></div></div>' +
      '<div class="btn-row">' +
      (ripe ? '<button class="btn sm gold" data-act="collectFish" data-i="' + i + '">' + A().img('fx.basket', '') + '捕捞</button>'
        : '<button class="btn sm" data-act="feedFish" data-i="' + i + '">🌾 喂食</button>' +
          '<button class="btn sm gold" data-act="rushFish" data-i="' + i + '">⏩2钻</button>') +
      '<button class="btn sm red" data-act="drainPond" data-i="' + i + '">清塘</button>' +
      '</div>';
    FARM.ui.sheet(h2);
  }

  /* ==========================================================
   *  七、动作分发（由 ui.js 转发）
   * ========================================================== */
  function run(fn) {
    var r = fn();
    if (!r) return r;
    if (r.ok) FARM.ui.toast(r.msg, 'ok');
    else FARM.ui.toast(r.msg, /不足|需要|已满|解锁|没有|还/.test(r.msg) ? 'warn' : 'bad');
    FARM.ui.render();
    S.touch();
    return r;
  }

  function removeTree(i) {
    var s = st(), slot = s.orchard[i];
    if (!slot || !slot.tree) return;
    var name = D.ORCHARD[slot.tree].name;
    FARM.ui.confirmBox('砍掉果树', '确定要砍掉 ' + name + ' 吗？<b>不会返还树苗钱</b>。', function () {
      slot.tree = null; slot.state = 'empty'; slot.pending = 0; slot.readyAt = 0;
      S.touch(); FARM.ui.render(); FARM.ui.toast('已砍掉 ' + name, 'warn');
    }, '砍掉');
  }
  function drainPond(i) {
    var s = st(), slot = s.pond[i];
    if (!slot || !slot.fish) return;
    var name = D.POND_FISH[slot.fish].name;
    FARM.ui.confirmBox('清塘', '确定清空这口塘吗？<b>不会返还鱼苗钱</b>。', function () {
      slot.fish = null; slot.state = 'empty'; slot.pending = 0; slot.readyAt = 0; slot.fed = 0;
      S.touch(); FARM.ui.render(); FARM.ui.toast('已清空鱼塘（' + name + '）', 'warn');
    }, '清塘');
  }

  /* 返回 true 表示已处理 */
  function act(name, el, i, id) {
    switch (name) {
      case 'treeSlot': treeSheet(i); return true;
      case 'plantTree': FARM.ui.closeSheet(); run(function () { return E.plantTree(i, id); }); return true;
      case 'harvestTree': FARM.ui.closeSheet(); run(function () { return E.harvestTree(i); }); return true;
      case 'harvestAllTrees': run(function () { return E.harvestAllTrees(); }); return true;
      case 'unlockTreeSlot': run(function () { return E.unlockTreeSlot(); }); return true;
      case 'rushTree': FARM.ui.closeSheet(); run(function () { return E.rushTree(i); }); return true;
      case 'removeTree': FARM.ui.closeSheet(); removeTree(i); return true;

      case 'pondSlot': pondSheet(i); return true;
      case 'stockFish': FARM.ui.closeSheet(); run(function () { return E.stockFish(i, id); }); return true;
      case 'collectFish': FARM.ui.closeSheet(); run(function () { return E.collectFish(i); }); return true;
      case 'feedFish': FARM.ui.closeSheet(); run(function () { return E.feedFish(i); }); return true;
      case 'collectAllFish': run(function () { return E.collectAllFish(); }); return true;
      case 'feedAllFish': run(function () { return E.feedAllFish(); }); return true;
      case 'unlockPondSlot': run(function () { return E.unlockPondSlot(); }); return true;
      case 'rushFish': FARM.ui.closeSheet(); run(function () { return E.rushFish(i); }); return true;
      case 'drainPond': FARM.ui.closeSheet(); drainPond(i); return true;

      case 'startMine': run(function () { return E.startMine(); }); return true;
      case 'claimMine': run(function () { return E.claimMine(); }); return true;
      case 'upMine': run(function () { return E.upgradeMine(); }); return true;
      case 'rushMine': run(function () { return E.rushMine(); }); return true;

      case 'cook': run(function () { return E.cook(id); }); return true;
      case 'rushDish': run(function () { return E.rushDish(i); }); return true;
      case 'upKitchen': run(function () { return E.upgradeKitchen(); }); return true;

      case 'adoptPet': run(function () { return E.adoptPet(id); }); return true;
      case 'feedPet': run(function () { return E.feedPet(id); }); return true;
    }
    return false;
  }

  FARM.expUI = { act: act };

  /* ==========================================================
   *  八、把拓展数据并入「更多」页（图鉴 / 统计）
   * ========================================================== */
  var _more = V.more;
  V.more = function () {
    var s = st();
    var h = _more();
    var tGot = 0, fGot = 0, dGot = 0, tAll = 0, fAll = 0, dAll = 0, k;
    for (k in D.ORCHARD) { tAll++; if (s.dex.trees[k] > 0) tGot++; }
    for (k in D.POND_FISH) { fAll++; if (s.dex.fish[k] > 0) fGot++; }
    for (k in D.DISHES) { dAll++; if (s.dex.dishes[k] > 0) dGot++; }

    h += '<div class="panel"><h3>' + im('tree.apple') + '拓展图鉴 <span class="tag">果树 ' + tGot + '/' + tAll +
      ' · 鱼 ' + fGot + '/' + fAll + ' · 菜品 ' + dGot + '/' + dAll + '</span></h3><div class="inv">';
    for (k in D.ORCHARD) {
      h += '<div class="slot"><span class="q">' + (s.dex.trees[k] > 0 ? '✓' : '?') + '</span>' +
        im('tree.' + k) + '<div class="n">' + esc(D.ORCHARD[k].name) + '</div></div>';
    }
    h += '</div><div class="inv mt8">';
    for (k in D.POND_FISH) {
      h += '<div class="slot"><span class="q">' + (s.dex.fish[k] > 0 ? '✓' : '?') + '</span>' +
        im('item.fish') + '<div class="n">' + esc(D.POND_FISH[k].name) + '</div></div>';
    }
    h += '</div><div class="inv mt8">';
    for (k in D.DISHES) {
      h += '<div class="slot"><span class="q">' + (s.dex.dishes[k] > 0 ? '✓' : '?') + '</span>' +
        im('item.' + D.DISHES[k].out) + '<div class="n">' + esc(D.DISHES[k].name) + '</div></div>';
    }
    h += '</div></div>';

    h += '<div class="panel"><h3>' + ui('star') + '拓展统计</h3><div class="stat-grid">' +
      stat('收果次数', s.stats.tree) + stat('捕捞次数', s.stats.fish) + stat('挖矿次数', s.stats.mine) +
      stat('出餐次数', s.stats.dish) + stat('宠物喂食', s.stats.pet) +
      stat('矿洞等级', s.mine.lv) + stat('厨房等级', s.kitchen.lv) + stat('宠物数量', Object.keys(s.pets).length) +
      '</div></div>';
    return h;
  };
  function stat(k, v) {
    return '<div class="stat"><div class="v">' + fmt(v) + '</div><div class="k">' + esc(k) + '</div></div>';
  }
})(window);

/* ==========================================================
 *  assets.js — 素材映射层
 *
 *  【素材来源与授权】全部为 CC0 公有领域 / 免费商用：
 *    · Kenney (kenney.nl) —— CC0 1.0
 *        - Food Kit         : 64×64 食物 / 作物图标（文件名即语义）
 *        - Animal Pack      : 猪、兔（Round 系列）
 *        - Tiny Town        : 16×16 像素地块（草地 / 房子 / 树 / 栅栏 / 水井）
 *        - Game Icons(+)    : 50×50 单色 UI 图标
 *        - Board Game Icons : structure_farm / resource_wheat
 *    · OpenClipart (openclipart.org) —— CC0 1.0（已做自动化质检，
 *      剔除照片、单色剪影与占位图后保留的部分）
 *    · 画布生成精灵（critters）：对免费源中确实不存在的农场动物
 *      （小鸡 / 绵羊 / 山羊 / 羊驼）用 Canvas 绘制统一扁平风补齐，
 *      随时可用同名 PNG 覆盖 assets/images/animals/ 自动替换。
 *
 *  替换素材：把同名 PNG 放进 assets/images/ 对应目录即可，无需改逻辑。
 * ========================================================== */
(function (global) {
  'use strict';
  var FARM = (global.FARM = global.FARM || {});
  var BASE = 'assets/images/';
  var FALLBACK = BASE + 'fallback.png';

  /* ---------------- 逻辑名 → 相对路径 ---------------- */
  var MAP = {
    /* 作物成熟图 */
    'crop.wheat': 'crops/wheat.png',
    'crop.carrot': 'crops/carrot.png',
    'crop.potato': 'crops/potato.png',
    'crop.corn': 'crops/corn.png',
    'crop.tomato': 'crops/tomato.png',
    'crop.cucumber': 'crops/cucumber.png',
    'crop.eggplant': 'crops/eggplant.png',
    'crop.pepper': 'crops/pepper.png',
    'crop.pumpkin': 'crops/pumpkin.png',
    'crop.watermelon': 'crops/watermelon.png',
    'crop.strawberry': 'crops/strawberry.png',
    'crop.grape': 'crops/grape.png',
    'crop.coffee': 'crops/coffee.png',
    'crop.cotton': 'crops/cotton.png',
    'crop.tea': 'crops/tea.png',
    'crop.truffle': 'crops/truffle.png',

    /* 动物 */
    'animal.chicken': 'animals/chicken.png',
    'animal.duck': 'animals/duck.png',
    'animal.rabbit': 'animals/rabbit.png',
    'animal.goose': 'animals/goose.png',
    'animal.sheep': 'animals/sheep.png',
    'animal.cow': 'animals/cow.png',
    'animal.pig': 'animals/pig.png',
    'animal.goat': 'animals/goat.png',
    'animal.horse': 'animals/horse.png',
    'animal.bee': 'animals/bee.png',
    'animal.fish': 'animals/fish.png',
    'animal.alpaca': 'animals/alpaca.png',

    /* 畜牧产出 */
    'item.egg': 'items/egg.png',
    'item.duckEgg': 'items/egg.png',
    'item.wool': 'items/wool.png',
    'item.milk': 'items/milk.png',
    'item.rabbitWool': 'items/wool.png',
    'item.feather': 'items/generic.png',
    'item.meat': 'items/meat.png',
    'item.honey': 'items/honey.png',
    'item.fish': 'items/fish.png',
    'item.leather': 'items/generic.png',
    'item.truffleOil': 'items/oil.png',
    'item.alpacaWool': 'items/wool.png',

    /* 加工品 */
    'item.flour': 'items/flour.png',
    'item.sugar': 'items/sugar.png',
    'item.oil': 'items/oil.png',
    'item.petFeed': 'items/petFeed.png',
    'item.bread': 'items/bread.png',
    'item.butter': 'items/generic.png',
    'item.cheese': 'items/cheese.png',
    'item.yogurt': 'items/yogurt.png',
    'item.coffeePowder': 'items/coffeePowder.png',
    'item.pastry': 'items/pastry.png',
    'item.cake': 'items/cake.png',
    'item.cookie': 'items/cookie.png',
    'item.jam': 'items/jam.png',
    'item.juice': 'items/juice.png',
    'item.canned': 'items/canned.png',
    'item.wine': 'items/wine.png',
    'item.yarn': 'items/yarn.png',
    'item.cloth': 'items/generic.png',
    'item.iceCream': 'items/iceCream.png',

    /* 拓展：果树（Kenney Nature Kit，CC0） */
    'tree.apple': 'trees/tree_default.png',
    'tree.orange': 'trees/tree_oak.png',
    'tree.cherry': 'trees/tree_fat.png',
    'tree.pear': 'trees/tree_cone.png',
    'tree.lemon': 'trees/tree_thin.png',
    'tree.banana': 'trees/tree_palm.png',
    'tree.coconut': 'trees/tree_palm.png',
    'tree.avocado': 'trees/tree_tall.png',

    /* 拓展：水果 / 稻米（Kenney Food Kit，CC0） */
    'item.apple': 'items/apple.png',
    'item.orange': 'items/orange.png',
    'item.cherry': 'items/cherry.png',
    'item.pear': 'items/pear.png',
    'item.lemon': 'items/lemon.png',
    'item.banana': 'items/banana.png',
    'item.coconut': 'items/coconut.png',
    'item.avocado': 'items/avocado.png',
    'item.rice': 'items/rice.png',
    'item.cream': 'items/cream.png',

    /* 拓展：菜品（Kenney Food Kit，CC0） */
    'item.salad': 'items/salad.png',
    'item.sandwich': 'items/sandwich.png',
    'item.pizza': 'items/pizza.png',
    'item.burger': 'items/burger.png',
    'item.sushi': 'items/sushi.png',
    'item.steak': 'items/steak.png',
    'item.soup': 'items/soup.png',
    'item.pancake': 'items/pancake.png',
    'item.waffle': 'items/waffle.png',
    'item.sundae': 'items/sundae.png',
    'item.cake2': 'items/cake2.png',

    /* 拓展：矿物（石块 = Kenney Tower Defense / 宝石 = Kenney Game Icons+） */
    'item.stone': 'minerals/stone.png',
    'item.gem': 'minerals/gem.png',

    /* 拓展：宠物（鹦鹉 = Kenney Animal Pack，CC0） */
    'animal.parrot': 'animals/parrot.png',
    'pet.parrot': 'animals/parrot.png',

    /* 拓展：建筑图标 */
    'build.orchard': 'trees/tree_oak.png',
    'build.pond': 'items/fish.png',
    'build.mine': 'minerals/stone.png',
    'build.centralKitchen': 'items/soup.png',

    /* 生长阶段 / 地块 */
    'fx.seed': 'fx/seedling.png',
    'fx.seedling': 'fx/seedling.png',
    'fx.sprout': 'fx/seedling.png',
    'fx.young': 'fx/youngplant.png',
    'fx.water': 'fx/water.png',
    'fx.bug': 'fx/bug.png',
    'fx.weed': 'fx/weed.png',
    'fx.soil': 'ground/soil-dark.png',
    'fx.tilled': 'ground/planting-bed.png',
    'fx.wild': 'ground/grass1.png',
    'fx.grass': 'ground/grass2.png',
    'fx.snow': 'fx/snowflake.png',

    /* 农具 */
    'fx.hoe': 'prop/tools.png',
    'fx.can': 'fx/can.png',
    'fx.fert': 'fx/fert.png',
    'fx.basket': 'fx/basket.png',
    'fx.haystack': 'buildings/haystack.png',
    'fx.well': 'buildings/well.png',
    'fx.tree': 'prop/tree-round.png',
    'fx.fence': 'prop/fence.png',

    /* 建筑 */
    'build.mill': 'buildings/shed.png',
    'build.press': 'buildings/shed.png',
    'build.feedmill': 'buildings/shed.png',
    'build.bakery': 'buildings/bakery.png',
    'build.dairy': 'buildings/shed.png',
    'build.roaster': 'buildings/shed.png',
    'build.kitchen': 'buildings/shed.png',
    'build.loom': 'buildings/shed.png',
    'build.cannery': 'buildings/shed.png',
    'build.winery': 'buildings/barn.png',
    'build.pet': 'buildings/house.png',
    'build.cafe': 'buildings/house2.png',
    'build.bake': 'buildings/bakery.png',
    'build.restaurant': 'buildings/restaurant.png',
    'build.boutique': 'buildings/house-red.png',
    'build.barn': 'buildings/barn.png',
    'build.windmill': 'buildings/farm.png',
    'build.greenhouse': 'buildings/greenhouse.png',

    /* UI */
    'ui.coin': 'ui/coin.png',
    'ui.gem': 'ui/star.png',
    'ui.xp': 'ui/star.png',
    'ui.star': 'ui/star.png',
    'ui.lock': 'ui/unlocked.png',
    'ui.check': 'ui/checkmark.png',
    'ui.plus': 'ui/plus.png',
    'ui.minus': 'ui/minus.png',
    'ui.gear': 'ui/gear.png',
    'ui.home': 'ui/home.png',
    'ui.basket': 'ui/basket.png',
    'ui.trophy': 'ui/trophy.png',
    'ui.warn': 'ui/warning.png',
    'ui.info': 'ui/information.png',
    'ui.heart': 'ui/heart.png',
    'ui.arrowUp': 'ui/arrowUp.png',
    'ui.arrowDown': 'ui/arrowDown.png',
    'ui.menu': 'ui/menuGrid.png',
    'ui.wheat': 'ui/wheat-icon.png'
  };

  /* ---------------- 画布生成精灵（补齐缺失动物） ---------------- */
  var critterCache = {};

  function drawCritter(kind) {
    var S = 96, c = document.createElement('canvas');
    c.width = S; c.height = S;
    var g = c.getContext('2d');
    function ell(x, y, rx, ry, col) {
      g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      g.fillStyle = col; g.fill();
    }
    function eye(x, y) {
      ell(x, y, 3.6, 3.6, '#2b2118');
      ell(x + 1.2, y - 1.2, 1.3, 1.3, '#fff');
    }
    function legs(list, col) {
      g.fillStyle = col;
      for (var i = 0; i < list.length; i++) g.fillRect(list[i][0], list[i][1], 6, 16);
    }
    g.clearRect(0, 0, S, S);

    if (kind === 'chicken') {
      legs([[36, 70], [54, 70]], '#f2a33c');
      ell(48, 54, 26, 22, '#fffdf5');            /* 身体 */
      ell(48, 56, 20, 15, '#f6efe0');
      ell(66, 38, 13, 12, '#fffdf5');            /* 头 */
      ell(76, 38, 6, 4, '#f2a33c');              /* 喙 */
      g.fillStyle = '#e0453f';
      g.beginPath();                              /* 鸡冠 */
      g.arc(62, 27, 4, 0, 6.3); g.arc(68, 25, 4, 0, 6.3); g.arc(73, 28, 3.4, 0, 6.3);
      g.fill();
      g.fillStyle = '#e0453f'; g.fillRect(70, 42, 8, 5);  /* 肉垂 */
      eye(66, 36);
      ell(40, 56, 15, 11, '#f0e6d2');            /* 翅膀 */
    } else if (kind === 'sheep') {
      legs([[32, 72], [58, 72]], '#5b4636');
      ell(48, 54, 24, 20, '#f7f5ef');            /* 身体（羊毛） */
      var puff = [[30, 46], [42, 40], [56, 40], [68, 48], [26, 58], [70, 58], [48, 36]];
      for (var i = 0; i < puff.length; i++) ell(puff[i][0], puff[i][1], 11, 10, '#fbf9f4');
      ell(70, 46, 11, 10, '#4a4038');            /* 头 */
      ell(74, 44, 8, 6, '#5d524a');
      eye(70, 44);
      ell(62, 40, 6, 5, '#fbf9f4');              /* 额毛 */
    } else if (kind === 'goat') {
      legs([[34, 72], [56, 72]], '#6b5a44');
      ell(48, 56, 24, 18, '#e8e2d6');            /* 身体 */
      ell(70, 44, 12, 10, '#efe9dd');            /* 头 */
      ell(78, 46, 6, 4.5, '#d8cfbd');            /* 口鼻 */
      g.strokeStyle = '#a8946a'; g.lineWidth = 4; g.lineCap = 'round';
      g.beginPath(); g.moveTo(66, 34); g.quadraticCurveTo(64, 24, 70, 22); g.stroke();
      g.beginPath(); g.moveTo(74, 34); g.quadraticCurveTo(76, 24, 82, 26); g.stroke();
      g.fillStyle = '#cfc6b4'; g.fillRect(74, 52, 5, 10);  /* 胡子 */
      eye(70, 42);
    } else if (kind === 'alpaca') {
      legs([[32, 74], [56, 74]], '#8a6b4a');
      ell(48, 58, 25, 19, '#d9b892');            /* 身体 */
      ell(50, 48, 20, 14, '#e6caa6');            /* 毛 */
      g.fillStyle = '#c9a279'; g.fillRect(64, 34, 9, 26);  /* 脖子 */
      ell(70, 32, 11, 9, '#e6caa6');             /* 头 */
      ell(72, 32, 7, 5.5, '#d9b892');
      ell(66, 26, 8, 6, '#f0dcbe');              /* 额毛 */
      g.fillStyle = '#8a6b4a';
      g.beginPath(); g.moveTo(62, 24); g.lineTo(60, 16); g.lineTo(66, 22); g.fill();
      g.beginPath(); g.moveTo(72, 23); g.lineTo(76, 15); g.lineTo(76, 24); g.fill();
      eye(69, 30);
    } else if (kind === 'dog') {
      legs([[28, 74], [58, 74]], '#a9762f');
      ell(44, 56, 24, 18, '#c98a3a');            /* 身体 */
      ell(44, 52, 19, 13, '#dc9c46');
      g.fillStyle = '#c98a3a'; g.fillRect(62, 40, 10, 22);   /* 脖子 */
      ell(70, 36, 13, 11, '#dc9c46');            /* 头 */
      ell(78, 40, 7, 5, '#b8782f');              /* 口鼻 */
      ell(81, 39, 3.2, 2.6, '#2b2118');          /* 鼻头 */
      ell(62, 26, 8, 10, '#a9762f');             /* 耳朵 */
      ell(78, 26, 8, 10, '#a9762f');
      eye(70, 33);
      g.fillStyle = '#e0453f'; g.fillRect(58, 44, 16, 5);    /* 项圈 */
      g.fillStyle = '#f2c14e'; g.fillRect(64, 49, 6, 6);     /* 铃铛 */
      g.strokeStyle = '#a9762f'; g.lineWidth = 5; g.lineCap = 'round';
      g.beginPath(); g.moveTo(22, 58); g.quadraticCurveTo(12, 50, 16, 42); g.stroke();  /* 尾巴 */
    } else if (kind === 'cat') {
      ell(40, 76, 8, 6, '#e0a13c');              /* 前爪 */
      ell(60, 76, 8, 6, '#e0a13c');
      ell(48, 56, 25, 20, '#eda94a');            /* 身体 */
      ell(48, 50, 19, 14, '#f6bd63');
      ell(48, 36, 16, 13, '#eda94a');            /* 头 */
      g.fillStyle = '#eda94a';
      g.beginPath(); g.moveTo(36, 28); g.lineTo(33, 16); g.lineTo(44, 24); g.fill();   /* 耳 */
      g.beginPath(); g.moveTo(60, 28); g.lineTo(63, 16); g.lineTo(52, 24); g.fill();
      g.fillStyle = '#f6d0a0';
      g.beginPath(); g.moveTo(38, 27); g.lineTo(36, 20); g.lineTo(43, 25); g.fill();
      g.beginPath(); g.moveTo(58, 27); g.lineTo(60, 20); g.lineTo(53, 25); g.fill();
      eye(42, 35); eye(55, 35);
      ell(48, 42, 3, 2.4, '#e08a8a');            /* 鼻 */
      g.strokeStyle = '#c98a3a'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(48, 44); g.lineTo(48, 47); g.stroke();
      g.beginPath(); g.moveTo(48, 47); g.quadraticCurveTo(43, 50, 40, 46); g.stroke();
      g.beginPath(); g.moveTo(48, 47); g.quadraticCurveTo(53, 50, 56, 46); g.stroke();
      g.strokeStyle = '#c98a3a'; g.lineWidth = 5; g.lineCap = 'round';
      g.beginPath(); g.moveTo(70, 60); g.quadraticCurveTo(84, 56, 80, 40); g.stroke();  /* 尾 */
    } else if (kind === 'shepherd') {
      legs([[26, 74], [44, 74], [58, 74], [72, 74]], '#5a4632');
      ell(48, 54, 28, 19, '#8d6b45');            /* 身体 */
      ell(46, 48, 22, 14, '#a5825a');            /* 背毛 */
      ell(24, 48, 10, 9, '#8d6b45');             /* 后臀 */
      g.fillStyle = '#8d6b45'; g.fillRect(64, 36, 11, 22);   /* 脖子 */
      ell(72, 32, 12, 10, '#a5825a');            /* 头 */
      ell(80, 36, 6.5, 5, '#6f543a');            /* 口鼻 */
      ell(83, 35, 3, 2.4, '#2b2118');
      ell(64, 24, 7, 9, '#6f543a');              /* 耳 */
      ell(80, 24, 7, 9, '#6f543a');
      eye(72, 30);
      g.fillStyle = '#e0453f'; g.fillRect(60, 42, 18, 5);    /* 项圈 */
      g.strokeStyle = '#8d6b45'; g.lineWidth = 6; g.lineCap = 'round';
      g.beginPath(); g.moveTo(20, 52); g.quadraticCurveTo(10, 44, 14, 36); g.stroke();  /* 尾 */
    }
    return c.toDataURL('image/png');
  }

  /* 矿石精灵（铁矿 / 煤矿在免费源中找不到合适的 64×64 扁平图标，
     用画布按同样的扁平风补齐；把 iron.png / coal.png 放进
     assets/images/minerals/ 即可自动覆盖） */
  function drawOre(kind) {
    var S = 96, c = document.createElement('canvas');
    c.width = S; c.height = S;
    var g = c.getContext('2d');
    g.clearRect(0, 0, S, S);
    function chunk(pts, fill, edge) {
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (var i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
      g.closePath();
      g.fillStyle = fill; g.fill();
      g.strokeStyle = edge; g.lineWidth = 2.5; g.lineJoin = 'round'; g.stroke();
    }
    function shine(x, y, r, col) {
      g.beginPath(); g.ellipse(x, y, r, r * 0.7, -0.5, 0, Math.PI * 2);
      g.fillStyle = col; g.fill();
    }
    if (kind === 'iron') {
      chunk([[20, 66], [30, 40], [52, 28], [76, 38], [78, 62], [56, 76], [28, 74]], '#8d8f95', '#5e6167');
      chunk([[30, 40], [52, 28], [58, 46], [38, 54]], '#a9abb1', '#5e6167');
      chunk([[58, 46], [76, 38], [78, 62], [62, 66]], '#7a7c82', '#5e6167');
      shine(44, 44, 6, 'rgba(255,255,255,0.45)');
      g.fillStyle = '#b06a3a';
      g.beginPath(); g.ellipse(60, 58, 7, 5, 0.4, 0, Math.PI * 2); g.fill();   /* 锈斑 */
      g.beginPath(); g.ellipse(36, 66, 5, 3.5, -0.3, 0, Math.PI * 2); g.fill();
    } else if (kind === 'coal') {
      chunk([[18, 64], [26, 38], [50, 26], [74, 36], [78, 60], [58, 76], [30, 74]], '#2f2b2c', '#151314');
      chunk([[26, 38], [50, 26], [56, 44], [34, 52]], '#4a4547', '#151314');
      chunk([[56, 44], [74, 36], [78, 60], [60, 66]], '#222021', '#151314');
      shine(42, 42, 5, 'rgba(255,255,255,0.22)');
      g.fillStyle = '#6b5f66';
      g.beginPath(); g.ellipse(64, 56, 5, 3.4, 0.4, 0, Math.PI * 2); g.fill();
    }
    return c.toDataURL('image/png');
  }

  /* 免费开源源中确实拿不到的 4 种农场动物，用画布精灵补齐。
     在 boot() 时直接写入 MAP（data: URL），避免请求不存在的 PNG 产生 404。
     若你后来拿到了真实素材：把对应名字从 CRITTERS 里删掉，并把 PNG
     放进 assets/images/animals/ 即可自动生效。 */
  var CRITTERS = ['chicken', 'sheep', 'goat', 'alpaca', 'dog', 'cat', 'shepherd'];
  var ORES = ['iron', 'coal'];
  function ensureCritters() {
    if (typeof document === 'undefined') return;
    var i, k;
    for (i = 0; i < CRITTERS.length; i++) {
      k = CRITTERS[i];
      if (critterCache[k]) continue;
      try {
        critterCache[k] = drawCritter(k);
        if (critterCache[k]) {
          MAP['animal.' + k] = critterCache[k];
          MAP['pet.' + k] = critterCache[k];
        }
      } catch (e) { critterCache[k] = null; }
    }
    for (i = 0; i < ORES.length; i++) {
      k = ORES[i];
      if (critterCache['ore_' + k]) continue;
      try {
        critterCache['ore_' + k] = drawOre(k);
        if (critterCache['ore_' + k]) MAP['item.' + k] = critterCache['ore_' + k];
      } catch (e) { critterCache['ore_' + k] = null; }
    }
  }

  /* ---------------- 对外接口 ---------------- */
  function path(name) {
    if (!name) return null;
    var v = MAP[name];
    if (!v) return null;
    if (v.indexOf('data:') === 0) return v;
    return BASE + v;
  }

  var _missChecked = {};
  /* 生成 <img>：缺失时先用画布精灵、再退回占位图，绝不出现破图 */
  function img(name, cls, style) {
    var p = path(name);
    if (!p) p = FALLBACK;
    var clsAttr = ' class="pix ' + (cls || '') + '"';
    var stAttr = style ? ' style="' + style + '"' : '';
    var alt = '';
    return '<img src="' + p + '"' + clsAttr + stAttr + ' alt="' + alt + '"' +
      ' loading="lazy" draggable="false"' +
      ' onerror="FARM.assets.onMiss(this,\'' + name + '\')">';
  }

  function onMiss(el, name) {
    el.onerror = null;
    var short = (name || '').split('.')[1];
    if (short && critterCache[short]) { el.src = critterCache[short]; return; }
    el.src = FALLBACK;
    el.classList.add('pix-miss');
  }

  FARM.assets = {
    BASE: BASE, MAP: MAP, FALLBACK: FALLBACK,
    path: path, img: img, onMiss: onMiss,
    has: function (n) { return !!MAP[n]; },
    critter: function (k) { return critterCache[k] || null; },
    boot: function () { ensureCritters(); }
  };

  /* 预生成画布精灵 */
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', ensureCritters);
    } else { ensureCritters(); }
  }
})(window);

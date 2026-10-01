/* ==========================================================
 *  expansion.js — 拓展玩法数据
 *  果园 / 鱼塘 / 矿洞 / 菜品 / 宠物
 *  挂载到 FARM.DATA，与原有系统并行，不改动已验证的核心数据
 * ========================================================== */
(function (global) {
  'use strict';
  var FARM = global.FARM;
  var D = FARM.DATA;

  /* ==========================================================
   *  一、果园 —— 长期作物，一次种植、反复结果
   *  grow: 首次成熟秒数 | cycle: 每轮结果秒数 | yield: 每轮产量
   * ========================================================== */
  var ORCHARD = {
    apple:   { name: '苹果树', cost: 1500,  lv: 3,  grow: 600,  cycle: 420,  yield: 6, xp: 45,  season: 'autumn' },
    orange:  { name: '橙子树', cost: 3200,  lv: 5,  grow: 820,  cycle: 520,  yield: 6, xp: 68,  season: 'winter' },
    cherry:  { name: '樱桃树', cost: 6200,  lv: 7,  grow: 1040, cycle: 640,  yield: 7, xp: 96,  season: 'spring' },
    pear:    { name: '梨树',   cost: 11000, lv: 9,  grow: 1280, cycle: 760,  yield: 7, xp: 130, season: 'autumn' },
    lemon:   { name: '柠檬树', cost: 18500, lv: 11, grow: 1520, cycle: 880,  yield: 8, xp: 168, season: 'summer' },
    banana:  { name: '香蕉树', cost: 29000, lv: 13, grow: 1780, cycle: 1000, yield: 8, xp: 212, season: 'summer' },
    coconut: { name: '椰子树', cost: 44000, lv: 15, grow: 2050, cycle: 1150, yield: 9, xp: 262, season: 'summer' },
    avocado: { name: '鳄梨树', cost: 66000, lv: 17, grow: 2360, cycle: 1320, yield: 9, xp: 320, season: 'spring' }
  };

  /* 果园位解锁（初始 2 个，最多 8 个） */
  var ORCHARD_UNLOCKS = [
    { index: 2, cost: 4000,  lv: 3 },
    { index: 3, cost: 12000, lv: 5 },
    { index: 4, cost: 30000, lv: 8 },
    { index: 5, cost: 70000, lv: 11 },
    { index: 6, cost: 150000, lv: 14 },
    { index: 7, cost: 320000, lv: 17 }
  ];

  /* ==========================================================
   *  二、鱼塘 —— 水产线
   *  cost: 鱼苗价 | grow: 成熟秒数 | feed: 每轮饲料 | yield: 产量
   * ========================================================== */
  var POND_FISH = {
    carp:   { name: '鲤鱼',   cost: 600,   lv: 2,  grow: 300,  feed: { wheat: 8 },        out: { fish: 2 }, xp: 30 },
    grass:  { name: '草鱼',   cost: 1800,  lv: 4,  grow: 420,  feed: { corn: 4 },         out: { fish: 3 }, xp: 52 },
    salmon: { name: '三文鱼', cost: 5200,  lv: 7,  grow: 560,  feed: { petFeed: 2 },      out: { fish: 4 }, xp: 88 },
    shrimp: { name: '虾',     cost: 14000, lv: 10, grow: 700,  feed: { petFeed: 3 },      out: { fish: 5 }, xp: 140 }
  };

  var POND_UNLOCKS = [
    { index: 2, cost: 5000,  lv: 3 },
    { index: 3, cost: 20000, lv: 6 },
    { index: 4, cost: 60000, lv: 9 },
    { index: 5, cost: 160000, lv: 12 }
  ];

  /* ==========================================================
   *  三、矿洞 —— 矿物线（用于建筑升级与高价出售）
   * ========================================================== */
  var MINERALS = {
    stone: { name: '石块',   price: 45,   icon: 'rock' },
    iron:  { name: '铁矿',   price: 130,  icon: 'iron' },
    coal:  { name: '煤矿',   price: 210,  icon: 'coal' },
    gem:   { name: '宝石',   price: 520,  icon: 'gem' }
  };

  /* 矿洞等级：决定单次挖矿时长 / 产量 / 稀有矿物概率 */
  var MINE_UNLOCKS = [
    { lv: 1, cost: 0,      time: 240, yield: 2 },
    { lv: 2, cost: 8000,   time: 220, yield: 3 },
    { lv: 3, cost: 24000,  time: 200, yield: 4 },
    { lv: 4, cost: 65000,  time: 180, yield: 5 },
    { lv: 5, cost: 150000, time: 160, yield: 7 }
  ];

  /* 各等级矿物掉落权重 */
  var MINE_DROP = [
    { stone: 70, iron: 25, coal: 5,  gem: 0 },
    { stone: 60, iron: 28, coal: 10, gem: 2 },
    { stone: 50, iron: 30, coal: 15, gem: 5 },
    { stone: 40, iron: 30, coal: 20, gem: 10 },
    { stone: 30, iron: 30, coal: 24, gem: 16 }
  ];

  /* ==========================================================
   *  四、菜品 —— 加工链末端，利润最高
   *  由「中央厨房」烹制，可交付高级订单或供给分店提价
   * ========================================================== */
  var DISHES = {
    salad:     { name: '田园沙拉', cost: 0,   lv: 4,  in: { tomato: 3, cucumber: 2 },            out: 'salad',     time: 120, price: 420,  xp: 40 },
    sandwich:  { name: '三明治',   cost: 0,   lv: 5,  in: { bread: 2, cheese: 1, meat: 1 },      out: 'sandwich',  time: 150, price: 680,  xp: 58 },
    pizza:     { name: '田园披萨', cost: 0,   lv: 7,  in: { flour: 3, cheese: 2, tomato: 2 },    out: 'pizza',     time: 200, price: 1150, xp: 92 },
    burger:    { name: '农家汉堡', cost: 0,   lv: 8,  in: { bread: 2, meat: 2, salad: 1 },       out: 'burger',    time: 240, price: 1480, xp: 118 },
    sushi:     { name: '鲜鱼寿司', cost: 0,   lv: 9,  in: { fish: 3, rice: 2 },                  out: 'sushi',     time: 260, price: 1750, xp: 140 },
    steak:     { name: '炭烤牛排', cost: 0,   lv: 10, in: { meat: 3, oil: 1 },                   out: 'steak',     time: 300, price: 2250, xp: 176 },
    soup:      { name: '浓汤',     cost: 0,   lv: 11, in: { potato: 4, milk: 2, meat: 1 },       out: 'soup',      time: 280, price: 2050, xp: 165 },
    pancake:   { name: '松饼',     cost: 0,   lv: 6,  in: { flour: 2, egg: 2, butter: 1 },       out: 'pancake',   time: 180, price: 900,  xp: 74 },
    waffle:    { name: '华夫饼',   cost: 0,   lv: 7,  in: { flour: 2, egg: 2, honey: 1 },        out: 'waffle',    time: 190, price: 980,  xp: 82 },
    sundae:    { name: '圣代',     cost: 0,   lv: 8,  in: { iceCream: 2, jam: 1, milk: 1 },      out: 'sundae',    time: 210, price: 1320, xp: 105 },
    cake2:     { name: '庆典蛋糕', cost: 0,   lv: 12, in: { cake: 1, strawberry: 3, cream: 1 },  out: 'cake2',     time: 340, price: 3200, xp: 240 }
  };

  /* ==========================================================
   *  五、宠物 —— 被动加成，喂食升级
   * ========================================================== */
  var PETS = {
    dog:     { name: '看门狗',   cost: 8000,   lv: 4,  buff: { steal: -0.5 }, desc: '被偷概率 -50%（邻居偷菜更容易被抓）' },
    cat:     { name: '橘猫',     cost: 12000,  lv: 5,  buff: { yield: 0.08 }, desc: '作物收获产量 +8%' },
    shepherd:{ name: '牧羊犬',   cost: 30000,  lv: 8,  buff: { animal: 0.12 }, desc: '动物产出 +12%' },
    parrot:  { name: '鹦鹉',     cost: 55000,  lv: 10, buff: { order: 0.15 }, desc: '订单报酬 +15%' }
  };

  /* 宠物升级：亲密度每 100 点升 1 级，加成按等级放大 */
  var PET_LEVEL_UP = 100;

  /* ==========================================================
   *  六、拓展内容加入物品总表（价格 / 图标）
   * ========================================================== */
  var EXTRA_ITEMS = {
    apple:   { name: '苹果',   kind: 'orchard', price: 60,   icon: 'apple' },
    orange:  { name: '橙子',   kind: 'orchard', price: 95,   icon: 'orange' },
    cherry:  { name: '樱桃',   kind: 'orchard', price: 150,  icon: 'cherry' },
    pear:    { name: '梨',     kind: 'orchard', price: 220,  icon: 'pear' },
    lemon:   { name: '柠檬',   kind: 'orchard', price: 320,  icon: 'lemon' },
    banana:  { name: '香蕉',   kind: 'orchard', price: 460,  icon: 'banana' },
    coconut: { name: '椰子',   kind: 'orchard', price: 640,  icon: 'coconut' },
    avocado: { name: '鳄梨',   kind: 'orchard', price: 880,  icon: 'avocado' },
    rice:    { name: '稻米',   kind: 'crop',    price: 34,   icon: 'rice' },
    cream:   { name: '奶油',   kind: 'goods',   price: 260,  icon: 'cream' },
    salad:   { name: '田园沙拉', kind: 'dish',  price: 420,  icon: 'salad' },
    sandwich:{ name: '三明治',  kind: 'dish',   price: 680,  icon: 'sandwich' },
    pizza:   { name: '田园披萨', kind: 'dish',  price: 1150, icon: 'pizza' },
    burger:  { name: '农家汉堡', kind: 'dish',  price: 1480, icon: 'burger' },
    sushi:   { name: '鲜鱼寿司', kind: 'dish',  price: 1750, icon: 'sushi' },
    steak:   { name: '炭烤牛排', kind: 'dish',  price: 2250, icon: 'steak' },
    soup:    { name: '浓汤',     kind: 'dish',  price: 2050, icon: 'soup' },
    pancake: { name: '松饼',     kind: 'dish',  price: 900,  icon: 'pancake' },
    waffle:  { name: '华夫饼',   kind: 'dish',  price: 980,  icon: 'waffle' },
    sundae:  { name: '圣代',     kind: 'dish',  price: 1320, icon: 'sundae' },
    cake2:   { name: '庆典蛋糕', kind: 'dish',  price: 3200, icon: 'cake' },
    stone:   { name: '石块', kind: 'mineral', price: 45,  icon: 'rock' },
    iron:    { name: '铁矿', kind: 'mineral', price: 130, icon: 'iron' },
    coal:    { name: '煤矿', kind: 'mineral', price: 210, icon: 'coal' },
    gem:     { name: '宝石', kind: 'mineral', price: 520, icon: 'gem' }
  };

  /* 把拓展物品并入总表 */
  for (var k in EXTRA_ITEMS) if (!D.ITEMS[k]) D.ITEMS[k] = EXTRA_ITEMS[k];

  /* 拓展订单：水果 / 鱼 / 菜品 / 矿物 */
  var EXTRA_ORDERS = [
    { id: 'x1', need: { apple: 6 },            pay: 640,   xp: 40,  lv: 3 },
    { id: 'x2', need: { orange: 6 },           pay: 980,   xp: 55,  lv: 5 },
    { id: 'x3', need: { cherry: 5 },           pay: 1350,  xp: 70,  lv: 7 },
    { id: 'x4', need: { fish: 6 },             pay: 1500,  xp: 78,  lv: 4 },
    { id: 'x5', need: { salad: 2 },            pay: 1600,  xp: 85,  lv: 4 },
    { id: 'x6', need: { sandwich: 2 },         pay: 2300,  xp: 105, lv: 5 },
    { id: 'x7', need: { pizza: 2 },            pay: 3600,  xp: 150, lv: 7 },
    { id: 'x8', need: { stone: 8, iron: 4 },   pay: 2200,  xp: 110, lv: 4 },
    { id: 'x9', need: { sushi: 2 },            pay: 5200,  xp: 210, lv: 9 },
    { id: 'x10', need: { steak: 2, soup: 1 },  pay: 7800,  xp: 300, lv: 10 },
    { id: 'x11', need: { cake2: 1 },           pay: 6200,  xp: 260, lv: 12 },
    { id: 'x12', need: { gem: 4, coal: 6 },    pay: 5600,  xp: 240, lv: 8 }
  ];
  D.ORDER_POOL = D.ORDER_POOL.concat(EXTRA_ORDERS);

  /* 拓展成就 */
  var EXTRA_ACH = [
    { id: 'firstTree',   name: '栽下第一棵树', desc: '在果园种下第一棵果树',           reward: { coins: 800, gem: 5 } },
    { id: 'firstFish',   name: '开塘养鱼',     desc: '在鱼塘投放第一批鱼苗',           reward: { coins: 1000, gem: 6 } },
    { id: 'firstMine',   name: '矿工生涯',     desc: '完成第一次挖矿',                 reward: { coins: 1200, gem: 6 } },
    { id: 'firstDish',   name: '厨艺首秀',     desc: '烹制出第一道菜品',               reward: { coins: 1500, gem: 8 } },
    { id: 'firstPet',    name: '新的家人',     desc: '领养第一只宠物',                 reward: { coins: 2000, gem: 10 } },
    { id: 'orchardAll',  name: '果树大全',     desc: '集齐全部 8 种果树',              reward: { coins: 50000, gem: 60 } },
    { id: 'fishAll',     name: '水产大师',     desc: '养过全部 4 种鱼',                reward: { coins: 30000, gem: 40 } },
    { id: 'dishAll',     name: '米其林之星',   desc: '烹制过全部菜品',                 reward: { coins: 80000, gem: 90 } },
    { id: 'mine5',       name: '深井矿场',     desc: '把矿洞升到 5 级',                reward: { coins: 60000, gem: 70 } },
    { id: 'petAll',      name: '动物之家',     desc: '集齐全部 4 只宠物',              reward: { coins: 70000, gem: 80 } }
  ];
  D.ACHIEVEMENTS = D.ACHIEVEMENTS.concat(EXTRA_ACH);

  /* ==========================================================
   *  六之二、水果加工线（让果园产出有真正的去处）
   *  挂到已有的工厂：面包房 / 乳品坊 / 中央厨房（工厂）
   * ========================================================== */
  var EXTRA_RECIPES = {
    pie:     { factory: 'bakery',  name: '水果派',   in: { apple: 3, flour: 2, butter: 1 },        out: { pie: 2 },     time: 260, xp: 62 },
    muffin:  { factory: 'bakery',  name: '果粒马芬', in: { orange: 2, flour: 2, egg: 1 },          out: { muffin: 2 },  time: 200, xp: 48 },
    frappe:  { factory: 'dairy',   name: '鲜果冰沙', in: { banana: 2, milk: 1, iceCream: 1 },      out: { frappe: 2 },  time: 240, xp: 56 },
    candy:   { factory: 'kitchen', name: '果糖',     in: { lemon: 2, sugar: 2 },                   out: { candy: 3 },   time: 180, xp: 44 },
    pudding: { factory: 'kitchen', name: '水果布丁', in: { cherry: 2, cream: 1, milk: 1 },         out: { pudding: 2 }, time: 230, xp: 58 }
  };
  var EXTRA_ITEMS2 = {
    pie:     { name: '水果派',   kind: 'goods', price: 1450, icon: 'pie' },
    muffin:  { name: '果粒马芬', kind: 'goods', price: 780,  icon: 'muffin' },
    frappe:  { name: '鲜果冰沙', kind: 'goods', price: 1180, icon: 'frappe' },
    candy:   { name: '果糖',     kind: 'goods', price: 520,  icon: 'candy' },
    pudding: { name: '水果布丁', kind: 'goods', price: 960,  icon: 'pudding' }
  };
  for (var ek in EXTRA_ITEMS2) if (!D.ITEMS[ek]) D.ITEMS[ek] = EXTRA_ITEMS2[ek];
  for (var er in EXTRA_RECIPES) if (!D.RECIPES[er]) D.RECIPES[er] = EXTRA_RECIPES[er];

  /* ==========================================================
   *  六之三、研究院（科技树）—— 矿物 / 加工品的长期消耗出口
   *  eff 为「每级加成」，cost 为单次研究消耗，time 为研究秒数
   * ========================================================== */
  var TECH = {
    irrigation: { name: '滴灌技术',   desc: '水分流失 -8% / 级',      max: 5, lv: 4,  time: 600,  cost: { coins: 25000,  stone: 20, iron: 8 },  eff: { water: 0.08 } },
    breeding:   { name: '良种培育',   desc: '作物生长速度 +6% / 级',  max: 5, lv: 5,  time: 900,  cost: { coins: 40000,  stone: 30, iron: 15 }, eff: { grow: 0.06 } },
    fertilizer: { name: '高效肥料',   desc: '作物产量 +5% / 级',      max: 5, lv: 6,  time: 1200, cost: { coins: 55000,  iron: 20, coal: 10 },  eff: { yield: 0.05 } },
    automation: { name: '产线自动化', desc: '加工速度 +8% / 级',      max: 5, lv: 7,  time: 1500, cost: { coins: 70000,  iron: 25, coal: 15 },  eff: { craft: 0.08 } },
    cuisine:    { name: '烹饪工艺',   desc: '厨房出餐速度 +10% / 级', max: 4, lv: 8,  time: 1800, cost: { coins: 90000,  coal: 20, gem: 3 },    eff: { dishSpeed: 0.10 } },
    retail:     { name: '连锁管理',   desc: '分店客单价 +6% / 级',    max: 5, lv: 9,  time: 2100, cost: { coins: 120000, gem: 5, iron: 30 },    eff: { shopPrice: 0.06 } },
    logistics:  { name: '物流网络',   desc: '订单报酬 +7% / 级',      max: 5, lv: 10, time: 2400, cost: { coins: 150000, coal: 25, gem: 6 },    eff: { orderPay: 0.07 } },
    drilling:   { name: '深层钻探',   desc: '矿洞单次产量 +1 / 级',   max: 3, lv: 11, time: 2700, cost: { coins: 180000, iron: 40, gem: 8 },    eff: { mineYield: 1 } },
    animalCare: { name: '动物营养学', desc: '动物产出 +6% / 级',      max: 5, lv: 12, time: 2000, cost: { coins: 130000, stone: 40, coal: 20 }, eff: { animal: 0.06 } },
    zoology:    { name: '宠物行为学', desc: '宠物亲密度 +15% / 级',   max: 4, lv: 13, time: 2200, cost: { coins: 160000, gem: 6, iron: 35 },    eff: { petBond: 0.15 } },
    storage:    { name: '仓储扩建',   desc: '仓库上限 +200 / 级',     max: 6, lv: 14, time: 2600, cost: { coins: 200000, stone: 60, iron: 45 }, eff: { cap: 200 } },
    coldChain:  { name: '冷链保鲜',   desc: '成熟后枯萎时间 +50% / 级', max: 3, lv: 15, time: 3000, cost: { coins: 240000, coal: 40, gem: 10 },  eff: { wither: 0.5 } }
  };

  /* 实验室等级：研究速度倍率与升级消耗（索引 = 等级-1） */
  var LAB = {
    speed: [1, 1.25, 1.6, 2.1, 2.8],
    upCost: [
      { coins: 30000,  stone: 40, iron: 15 },
      { coins: 90000,  stone: 80, iron: 40 },
      { coins: 220000, iron: 70,  coal: 40 },
      { coins: 520000, coal: 80,  gem: 20 }
    ]
  };

  /* ==========================================================
   *  七、拓展每日任务
   * ========================================================== */
  var EXTRA_DAILY = [
    { id: 'd_tree',  desc: '收获 3 次果树',   need: { tree: 3 },  reward: { coins: 3600, gem: 6 } },
    { id: 'd_fish',  desc: '收鱼 4 次',       need: { fish: 4 },  reward: { coins: 3000, gem: 5 } },
    { id: 'd_mine',  desc: '完成 3 次挖矿',   need: { mine: 3 },  reward: { coins: 4200, gem: 7 } },
    { id: 'd_dish',  desc: '烹制 3 道菜',     need: { dish: 3 },  reward: { coins: 5200, gem: 8 } },
    { id: 'd_pet',   desc: '给宠物喂食 3 次', need: { pet: 3 },   reward: { coins: 2600, gem: 4 } },
    { id: 'd_pie',   desc: '烘 2 个水果派',   need: { pie: 2 },   reward: { coins: 4800, gem: 8 } }
  ];
  D.DAILY_POOL = D.DAILY_POOL.concat(EXTRA_DAILY);

  /* 拓展订单：水果加工品 */
  D.ORDER_POOL = D.ORDER_POOL.concat([
    { id: 'x13', need: { pie: 2, muffin: 2 },   pay: 6400,  xp: 250, lv: 8 },
    { id: 'x14', need: { frappe: 3 },           pay: 5400,  xp: 220, lv: 7 },
    { id: 'x15', need: { pudding: 2, candy: 3 },pay: 7100,  xp: 280, lv: 9 }
  ]);

  /* 研究院成就 */
  D.ACHIEVEMENTS = D.ACHIEVEMENTS.concat([
    { id: 'firstTech', name: '科学种田',   desc: '完成第一项研究',           reward: { coins: 8000, gem: 15 } },
    { id: 'tech10',    name: '技术狂人',   desc: '累计研究 10 级科技',       reward: { coins: 40000, gem: 45 } },
    { id: 'techAll',   name: '农业科学院', desc: '把全部科技都研究到满级',   reward: { coins: 200000, gem: 150 } },
    { id: 'lab5',      name: '国家级实验室', desc: '把研究院升到 5 级',      reward: { coins: 120000, gem: 80 } }
  ]);

  /* ==========================================================
   *  挂载
   * ========================================================== */
  D.ORCHARD = ORCHARD;
  D.ORCHARD_UNLOCKS = ORCHARD_UNLOCKS;
  D.POND_FISH = POND_FISH;
  D.POND_UNLOCKS = POND_UNLOCKS;
  D.MINERALS = MINERALS;
  D.MINE_UNLOCKS = MINE_UNLOCKS;
  D.MINE_DROP = MINE_DROP;
  D.DISHES = DISHES;
  D.PETS = PETS;
  D.PET_LEVEL_UP = PET_LEVEL_UP;
  D.TECH = TECH;
  D.LAB = LAB;
  D.MAX_LAB_LV = LAB.speed.length;

  FARM.EXP = true;
})(window);

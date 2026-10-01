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
    carp:   { name: '鲤鱼',   cost: 600,   lv: 2,  grow: 300,  feed: { wheat: 4 },        out: { fish: 2 }, xp: 30 },
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
   *  七、拓展每日任务
   * ========================================================== */
  var EXTRA_DAILY = [
    { id: 'd_tree',  desc: '收获 3 次果树',   need: { tree: 3 },  reward: { coins: 3600, gem: 6 } },
    { id: 'd_fish',  desc: '收鱼 4 次',       need: { fish: 4 },  reward: { coins: 3000, gem: 5 } },
    { id: 'd_mine',  desc: '完成 3 次挖矿',   need: { mine: 3 },  reward: { coins: 4200, gem: 7 } },
    { id: 'd_dish',  desc: '烹制 3 道菜',     need: { dish: 3 },  reward: { coins: 5200, gem: 8 } },
    { id: 'd_pet',   desc: '给宠物喂食 3 次', need: { pet: 3 },   reward: { coins: 2600, gem: 4 } }
  ];
  D.DAILY_POOL = D.DAILY_POOL.concat(EXTRA_DAILY);

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

  FARM.EXP = true;
})(window);

/* ==========================================================
 *  data.js — 静态配置层（完全体）
 *  作物 / 动物 / 物品 / 配方 / 工厂 / 分店 / 员工 / 装饰
 *  所有数值集中在此，便于调平衡
 * ========================================================== */
(function (global) {
  'use strict';
  var FARM = (global.FARM = global.FARM || {});

  var CONST = {
    SAVE_KEY: 'farm_game_save_v3',
    SAVE_VERSION: 3,
    TICK_MS: 1000,
    AUTOSAVE_MS: 5000,
    OFFLINE_CAP_H: 12,
    GRID_W: 6, GRID_H: 6,          // 农场网格 6x6 = 36 块
    BASE_PLOTS: 9,                 // 初始解锁 9 块（3x3）
    MAX_PLOTS: 36,
    BASE_PENS: 3,
    MAX_PENS: 12,
    BASE_ORCHARD: 2,               // 果园初始 2 个树位
    MAX_ORCHARD: 8,
    BASE_POND: 2,                  // 鱼塘初始 2 个塘位
    MAX_POND: 6,
    MAX_MINE_LV: 5,
    MAX_KITCHEN_LV: 6,
    MAX_PET_LV: 10,
    WAREHOUSE_BASE: 300,
    START_COINS: 500,
    START_GEMS: 20,
    WITHER_AFTER_MS: 3600000,      // 成熟后 1 小时不收 → 枯萎
    EVENT_CHECK_MS: 20000,         // 每 20 秒判定一次随机事件
    WEATHER_MS: 1800000,           // 30 分钟换一次天气
    SEASON_MS: 7200000,            // 2 小时换一次季节
    NEIGHBOR_REFRESH_MS: 86400000  // 邻居每天刷新
  };

  function xpForLevel(lv) { return Math.floor(70 * Math.pow(lv, 1.5)) + 50; }

  /* ================= 物品总表 =================
   * icon: 对应 assets/images/ 下的文件名（见 assets.js 映射）
   */
  var ITEMS = {
    /* ---- 作物 ---- */
    wheat:      { name: '小麦',   kind: 'crop',  price: 1,    icon: 'wheat' },
    carrot:     { name: '胡萝卜', kind: 'crop',  price: 12,   icon: 'carrot' },
    potato:     { name: '土豆',   kind: 'crop',  price: 18,   icon: 'potato' },
    corn:       { name: '玉米',   kind: 'crop',  price: 26,   icon: 'corn' },
    tomato:     { name: '番茄',   kind: 'crop',  price: 36,   icon: 'tomato' },
    cucumber:   { name: '黄瓜',   kind: 'crop',  price: 48,   icon: 'cucumber' },
    eggplant:   { name: '茄子',   kind: 'crop',  price: 62,   icon: 'eggplant' },
    pepper:     { name: '辣椒',   kind: 'crop',  price: 78,   icon: 'pepper' },
    pumpkin:    { name: '南瓜',   kind: 'crop',  price: 105,  icon: 'pumpkin' },
    watermelon: { name: '西瓜',   kind: 'crop',  price: 140,  icon: 'watermelon' },
    strawberry: { name: '草莓',   kind: 'crop',  price: 175,  icon: 'strawberry' },
    grape:      { name: '葡萄',   kind: 'crop',  price: 220,  icon: 'grape' },
    coffee:     { name: '咖啡豆', kind: 'crop',  price: 290,  icon: 'coffee' },
    cotton:     { name: '棉花',   kind: 'crop',  price: 360,  icon: 'cotton' },
    tea:        { name: '茶叶',   kind: 'crop',  price: 450,  icon: 'tea' },
    truffle:    { name: '松露',   kind: 'crop',  price: 780,  icon: 'truffle' },

    /* ---- 畜牧产出 ---- */
    egg:        { name: '鸡蛋',   kind: 'animal', price: 24,   icon: 'egg' },
    duckEgg:    { name: '鸭蛋',   kind: 'animal', price: 44,   icon: 'egg' },
    wool:       { name: '羊毛',   kind: 'animal', price: 72,   icon: 'wool' },
    milk:       { name: '牛奶',   kind: 'animal', price: 88,   icon: 'milk' },
    rabbitWool: { name: '兔毛',   kind: 'animal', price: 130,  icon: 'wool' },
    feather:    { name: '羽毛',   kind: 'animal', price: 96,   icon: 'feather' },
    meat:       { name: '鲜肉',   kind: 'animal', price: 165,  icon: 'meat' },
    honey:      { name: '蜂蜜',   kind: 'animal', price: 210,  icon: 'honey' },
    fish:       { name: '鲜鱼',   kind: 'animal', price: 240,  icon: 'fish' },
    leather:    { name: '皮革',   kind: 'animal', price: 300,  icon: 'leather' },
    truffleOil: { name: '松露油', kind: 'animal', price: 520,  icon: 'oil' },
    alpacaWool: { name: '羊驼绒', kind: 'animal', price: 620,  icon: 'wool' },

    /* ---- 加工品 ---- */
    flour:        { name: '面粉',     kind: 'goods', price: 52,   icon: 'flour' },
    sugar:        { name: '糖',       kind: 'goods', price: 68,   icon: 'sugar' },
    oil:          { name: '食用油',   kind: 'goods', price: 95,   icon: 'oil' },
    petFeed:      { name: '宠物饲料', kind: 'goods', price: 130,  icon: 'feed' },
    bread:        { name: '面包',     kind: 'goods', price: 145,  icon: 'bread' },
    butter:       { name: '黄油',     kind: 'goods', price: 180,  icon: 'butter' },
    cheese:       { name: '奶酪',     kind: 'goods', price: 235,  icon: 'cheese' },
    yogurt:       { name: '酸奶',     kind: 'goods', price: 190,  icon: 'yogurt' },
    coffeePowder: { name: '咖啡粉',   kind: 'goods', price: 340,  icon: 'coffeePowder' },
    pastry:       { name: '烘焙点心', kind: 'goods', price: 265,  icon: 'pastry' },
    cake:         { name: '招牌蛋糕', kind: 'goods', price: 560,  icon: 'cake' },
    cookie:       { name: '曲奇',     kind: 'goods', price: 320,  icon: 'cookie' },
    jam:          { name: '果酱',     kind: 'goods', price: 285,  icon: 'jam' },
    juice:        { name: '果汁',     kind: 'goods', price: 250,  icon: 'juice' },
    canned:       { name: '罐头',     kind: 'goods', price: 300,  icon: 'canned' },
    wine:         { name: '果酒',     kind: 'goods', price: 480,  icon: 'wine' },
    yarn:         { name: '毛线',     kind: 'goods', price: 310,  icon: 'yarn' },
    cloth:        { name: '布料',     kind: 'goods', price: 420,  icon: 'cloth' },
    iceCream:     { name: '冰淇淋',   kind: 'goods', price: 395,  icon: 'iceCream' }
  };

  /* ================= 作物 =================
   * grow: 成熟秒数（未加速）| stage: 5 段视觉阶段
   * season: 适季（当季生长 +25%，错季 -30%）
   */
  /* seed = 种子单价；回报倍率 = yield × 售价 ÷ seed，
   * 曲线从 Lv.1 的 2.0 倍递增到 Lv.13 的 4.6 倍，全线 ≥ 2 倍 */
  var CROPS = {
    wheat:      { name: '小麦',   seed: 1,    grow: 60,   yield: 2, xp: 1,  lv: 1,  season: 'spring' },
    carrot:     { name: '胡萝卜', seed: 14,   grow: 110,  yield: 3, xp: 4,  lv: 1,  season: 'spring' },
    potato:     { name: '土豆',   seed: 24,   grow: 170,  yield: 4, xp: 6,  lv: 2,  season: 'spring' },
    corn:       { name: '玉米',   seed: 38,   grow: 240,  yield: 4, xp: 9,  lv: 3,  season: 'summer' },
    tomato:     { name: '番茄',   seed: 55,   grow: 320,  yield: 4, xp: 12, lv: 3,  season: 'summer' },
    cucumber:   { name: '黄瓜',   seed: 68,   grow: 400,  yield: 4, xp: 15, lv: 4,  season: 'summer' },
    eggplant:   { name: '茄子',   seed: 83,   grow: 500,  yield: 4, xp: 19, lv: 5,  season: 'summer' },
    pepper:     { name: '辣椒',   seed: 104,  grow: 600,  yield: 4, xp: 23, lv: 5,  season: 'autumn' },
    pumpkin:    { name: '南瓜',   seed: 98,   grow: 720,  yield: 3, xp: 28, lv: 6,  season: 'autumn' },
    watermelon: { name: '西瓜',   seed: 124,  grow: 860,  yield: 3, xp: 34, lv: 7,  season: 'summer' },
    strawberry: { name: '草莓',   seed: 194,  grow: 1000, yield: 4, xp: 40, lv: 8,  season: 'spring' },
    grape:      { name: '葡萄',   seed: 232,  grow: 1180, yield: 4, xp: 47, lv: 9,  season: 'autumn' },
    coffee:     { name: '咖啡豆', seed: 218,  grow: 1360, yield: 3, xp: 55, lv: 10, season: 'autumn' },
    cotton:     { name: '棉花',   seed: 343,  grow: 1560, yield: 4, xp: 64, lv: 11, season: 'autumn' },
    tea:        { name: '茶叶',   seed: 307,  grow: 1780, yield: 3, xp: 74, lv: 12, season: 'spring' },
    truffle:    { name: '松露',   seed: 339,  grow: 2000, yield: 2, xp: 95, lv: 13, season: 'winter' }
  };

  /* ================= 种子（实体商品） =================
   * 播种优先消耗仓库里的种子；种子也是普通物品：可买卖、占仓库容量。
   * 价格与 CROPS.seed 一致；开局赠送 10 粒小麦种子（见 state.js newSave）。 */
  var SEED_ITEMS = {};
  (function () {
    for (var cid in CROPS) {
      SEED_ITEMS['seed_' + cid] = {
        name: CROPS[cid].name + '种子',
        kind: 'seed',
        price: CROPS[cid].seed,
        icon: cid
      };
    }
  })();
  for (var _sk in SEED_ITEMS) ITEMS[_sk] = SEED_ITEMS[_sk];

  /* ================= 动物 =================
   * cap: 栏位容量 | cycle: 单只产出周期(秒) | feed: 每只每轮消耗
   */
  var ANIMALS = {
    chicken: { name: '小鸡',   cost: 180,  cycle: 100, out: { egg: 1 },        feed: { wheat: 2 },    cap: 8, lv: 1,  xp: 6 },
    duck:    { name: '鸭子',   cost: 420,  cycle: 150, out: { duckEgg: 1 },    feed: { corn: 2 },     cap: 8, lv: 3,  xp: 11 },
    rabbit:  { name: '兔子',   cost: 780,  cycle: 200, out: { rabbitWool: 1 }, feed: { carrot: 3 },   cap: 8, lv: 4,  xp: 17 },
    goose:   { name: '大鹅',   cost: 1350, cycle: 260, out: { feather: 2 },    feed: { wheat: 8 },    cap: 6, lv: 5,  xp: 25 },
    sheep:   { name: '绵羊',   cost: 2100, cycle: 330, out: { wool: 2 },       feed: { wheat: 10 },    cap: 6, lv: 6,  xp: 35 },
    cow:     { name: '奶牛',   cost: 3200, cycle: 400, out: { milk: 2 },       feed: { corn: 4 },     cap: 5, lv: 7,  xp: 47 },
    pig:     { name: '小猪',   cost: 4800, cycle: 480, out: { meat: 1 },       feed: { potato: 5 },   cap: 5, lv: 8,  xp: 62 },
    goat:    { name: '山羊',   cost: 7000, cycle: 540, out: { milk: 2 },       feed: { carrot: 5 },   cap: 5, lv: 9,  xp: 80 },
    horse:   { name: '骏马',   cost: 9800, cycle: 620, out: { leather: 1 },    feed: { wheat: 16 },    cap: 4, lv: 10, xp: 100 },
    bee:     { name: '蜜蜂',   cost: 13500,cycle: 420, out: { honey: 2 },      feed: { strawberry: 2 },cap: 6, lv: 11, xp: 122 },
    fish:    { name: '鱼群',   cost: 18000,cycle: 380, out: { fish: 3 },       feed: { corn: 6 },     cap: 4, lv: 12, xp: 148 },
    alpaca:  { name: '羊驼',   cost: 25000,cycle: 700, out: { alpacaWool: 2 }, feed: { wheat: 20 },   cap: 4, lv: 13, xp: 180 }
  };

  /* ================= 工厂 ================= */
  var FACTORIES = {
    mill:     { name: '磨坊',     build: 600,   lv: 2,  upCost: 480,  icon: 'mill' },
    press:    { name: '榨油坊',   build: 1500,  lv: 3,  upCost: 1100, icon: 'press' },
    feedMill: { name: '饲料机',   build: 2400,  lv: 3,  upCost: 1800, icon: 'feedmill' },
    bakery:   { name: '面包房',   build: 3600,  lv: 4,  upCost: 2600, icon: 'bakery' },
    dairy:    { name: '乳品坊',   build: 5200,  lv: 5,  upCost: 3600, icon: 'dairy' },
    roaster:  { name: '咖啡烘焙', build: 7500,  lv: 6,  upCost: 5200, icon: 'roaster' },
    kitchen:  { name: '中央厨房', build: 11000, lv: 7,  upCost: 7200, icon: 'kitchen' },
    loom:     { name: '纺织坊',   build: 15000, lv: 8,  upCost: 9800, icon: 'loom' },
    cannery:  { name: '罐头厂',   build: 20000, lv: 9,  upCost: 13000,icon: 'cannery' },
    winery:   { name: '酿酒坊',   build: 28000, lv: 10, upCost: 18000,icon: 'winery' }
  };

  /* ================= 配方 ================= */
  var RECIPES = {
    flour:        { factory: 'mill',     name: '面粉',     in: { wheat: 6 },                  out: { flour: 1 },        time: 60,  xp: 5 },
    sugar:        { factory: 'mill',     name: '糖',       in: { corn: 3 },                   out: { sugar: 1 },        time: 70,  xp: 6 },
    oil:          { factory: 'press',    name: '食用油',   in: { potato: 4 },                 out: { oil: 1 },          time: 100, xp: 10 },
    petFeed:      { factory: 'feedMill', name: '宠物饲料', in: { corn: 2, wheat: 4 },         out: { petFeed: 2 },      time: 90,  xp: 8 },
    bread:        { factory: 'bakery',   name: '面包',     in: { flour: 2 },                  out: { bread: 3 },        time: 120, xp: 14 },
    pastry:       { factory: 'bakery',   name: '烘焙点心', in: { flour: 2, egg: 1 },          out: { pastry: 3 },       time: 150, xp: 18 },
    cookie:       { factory: 'bakery',   name: '曲奇',     in: { flour: 2, butter: 1 },       out: { cookie: 3 },       time: 180, xp: 22 },
    butter:       { factory: 'dairy',    name: '黄油',     in: { milk: 2 },                   out: { butter: 1 },       time: 130, xp: 15 },
    cheese:       { factory: 'dairy',    name: '奶酪',     in: { milk: 3 },                   out: { cheese: 1 },       time: 180, xp: 22 },
    yogurt:       { factory: 'dairy',    name: '酸奶',     in: { milk: 2, strawberry: 1 },    out: { yogurt: 2 },       time: 200, xp: 26 },
    iceCream:     { factory: 'dairy',    name: '冰淇淋',   in: { milk: 2, sugar: 1 },         out: { iceCream: 2 },     time: 220, xp: 30 },
    coffeePowder: { factory: 'roaster',  name: '咖啡粉',   in: { coffee: 2 },                 out: { coffeePowder: 1 }, time: 150, xp: 28 },
    cake:         { factory: 'kitchen',  name: '招牌蛋糕', in: { flour: 2, egg: 2, milk: 1 }, out: { cake: 2 },         time: 240, xp: 45 },
    jam:          { factory: 'kitchen',  name: '果酱',     in: { strawberry: 3, sugar: 1 },   out: { jam: 2 },          time: 200, xp: 36 },
    yarn:         { factory: 'loom',     name: '毛线',     in: { wool: 3 },                   out: { yarn: 1 },         time: 200, xp: 38 },
    cloth:        { factory: 'loom',     name: '布料',     in: { cotton: 3 },                 out: { cloth: 1 },        time: 240, xp: 44 },
    canned:       { factory: 'cannery',  name: '罐头',     in: { tomato: 3, meat: 1 },        out: { canned: 3 },       time: 210, xp: 42 },
    juice:        { factory: 'cannery',  name: '果汁',     in: { watermelon: 2, grape: 1 },   out: { juice: 3 },        time: 180, xp: 40 },
    wine:         { factory: 'winery',   name: '果酒',     in: { grape: 4, sugar: 1 },        out: { wine: 2 },         time: 300, xp: 60 },
    truffleOil:   { factory: 'press',    name: '松露油',   in: { truffle: 1, oil: 1 },        out: { truffleOil: 1 },   time: 280, xp: 70 }
  };

  /* ================= 分店 ================= */
  var SHOPS = {
    pet: {
      name: '猫狗萌宠馆', build: 4200, lv: 4, upCost: 3200, icon: 'pet',
      basePrice: 52, interval: 38, consume: { petFeed: 1 }, slots: 3,
      desc: '用自产宠物饲料招待猫狗顾客，靠装修和员工拉高客单价。'
    },
    cafe: {
      name: '田园咖啡馆', build: 12000, lv: 8, upCost: 8600, icon: 'cafe',
      basePrice: 145, interval: 52, consume: { coffeePowder: 1, pastry: 1 }, slots: 4,
      desc: '咖啡粉 + 点心组合出餐，客单价高，中期金币主力。'
    },
    bake: {
      name: '面包工坊', build: 22000, lv: 11, upCost: 15000, icon: 'bakery',
      basePrice: 230, interval: 46, consume: { bread: 2, butter: 1 }, slots: 4,
      desc: '走量的面包店，翻台快，适合产能过剩时消化库存。'
    },
    restaurant: {
      name: '农场餐厅', build: 40000, lv: 14, upCost: 28000, icon: 'restaurant',
      basePrice: 520, interval: 68, consume: { canned: 2, meat: 1, juice: 1 }, slots: 5,
      desc: '高客单价正餐，消耗品类多，是后期现金流核心。'
    },
    boutique: {
      name: '特产精品店', build: 75000, lv: 17, upCost: 52000, icon: 'boutique',
      basePrice: 1250, interval: 95, consume: { wine: 1, truffleOil: 1, cloth: 1 }, slots: 5,
      desc: '只卖高毛利精品，单次消耗大但回报惊人。'
    }
  };

  /* ================= 员工 ================= */
  var STAFF = {
    cashier: { name: '收银员', hire: 900,  wage: 150, bonus: { speed: 0.15 }, desc: '服务速度 +15%' },
    barista: { name: '咖啡师', hire: 2000, wage: 300, bonus: { price: 0.12 }, desc: '客单价 +12%' },
    groomer: { name: '美容师', hire: 2600, wage: 380, bonus: { charm: 3 },    desc: '店铺魅力 +3' },
    manager: { name: '店长',   hire: 6000, wage: 760, bonus: { flow: 0.25 },  desc: '客流 +25%' },
    chef:    { name: '主厨',   hire: 12000,wage: 1300,bonus: { price: 0.2 },  desc: '客单价 +20%' }
  };

  /* ================= 店铺装修 ================= */
  var DECOR = [
    { id: 'plant',   name: '绿植角',   cost: 700,   charm: 2 },
    { id: 'lamp',    name: '暖光吊灯', cost: 1300,  charm: 3 },
    { id: 'sofa',    name: '布艺沙发', cost: 2400,  charm: 5 },
    { id: 'mural',   name: '手绘壁画', cost: 4200,  charm: 7 },
    { id: 'garden',  name: '露台花园', cost: 8000,  charm: 11 },
    { id: 'stage',   name: '小舞台',   cost: 15000, charm: 15 }
  ];

  /* ================= 农场装饰（可摆放，提供增益） ================= */
  var FARM_DECOR = [
    { id: 'scarecrow', name: '稻草人',   cost: 1200,  buff: { bug: -0.4 },   desc: '虫害概率 -40%' },
    { id: 'well',      name: '水井',     cost: 2600,  buff: { dry: -0.35 },  desc: '干旱变慢 35%' },
    { id: 'fence',     name: '木栅栏',   cost: 800,   buff: { steal: -0.3 }, desc: '被偷概率 -30%' },
    { id: 'doghouse',  name: '狗窝',     cost: 5000,  buff: { steal: -0.7 }, desc: '被偷概率 -70%' },
    { id: 'greenhouse',name: '温室',     cost: 12000, buff: { grow: 0.15 },  desc: '作物生长 +15%' },
    { id: 'windmill',  name: '风车',     cost: 20000, buff: { grow: 0.22 },  desc: '作物生长 +22%' },
    { id: 'statue',    name: '丰收雕像', cost: 35000, buff: { yield: 0.18 }, desc: '收获产量 +18%' },
    { id: 'fountain',  name: '喷泉',     cost: 28000, buff: { charm: 5 },    desc: '小镇魅力 +5' }
  ];

  /* ================= 道具 ================= */
  var TOOLS = {
    fert:    { name: '化肥',     cost: 60,   gem: 0, desc: '立刻推进当前作物 30% 生长' },
    speedG:  { name: '生长激素', cost: 0,    gem: 3, desc: '一块地立刻成熟' },
    revive:  { name: '复活剂',   cost: 0,    gem: 5, desc: '救活枯萎的作物' },
    autoWater:{name: '自动洒水器',cost: 8000, gem: 0, desc: '24 小时内自动保持水分' },
    harvestAll:{name:'收割机',   cost: 15000,gem: 0, desc: '24 小时内可一键收获全部' }
  };

  /* ================= 土地 / 栏位扩建 ================= */
  var PLOT_UNLOCKS = [];
  (function () {
    var costs = [0, 0, 0, 0, 0, 0, 0, 0, 0, 600, 800, 1000, 1300, 1700, 2200, 2800, 3500, 4400, 5500, 6800, 8400, 10000, 12000, 14500, 17500, 21000, 25000, 30000, 36000, 43000, 51000, 60000, 70000, 82000, 95000];
    var lvs   = [1,1,1,1,1,1,1,1,1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14];
    for (var i = 9; i < 36; i++) PLOT_UNLOCKS.push({ index: i, cost: costs[i], lv: lvs[i] });
  })();

  var PEN_UNLOCKS = [
    { index: 3,  cost: 1500,  lv: 3 },
    { index: 4,  cost: 4000,  lv: 5 },
    { index: 5,  cost: 9000,  lv: 7 },
    { index: 6,  cost: 18000, lv: 9 },
    { index: 7,  cost: 34000, lv: 11 },
    { index: 8,  cost: 60000, lv: 13 },
    { index: 9,  cost: 100000, lv: 15 },
    { index: 10, cost: 160000, lv: 17 },
    { index: 11, cost: 250000, lv: 19 }
  ];

  /* ================= 天气 ================= */
  var WEATHER = {
    sunny:  { name: '晴朗', icon: 'sunny',  desc: '正常生长',           grow: 1.0, dry: 1.0, bug: 1.0 },
    rain:   { name: '降雨', icon: 'rain',   desc: '自动浇水，生长 +10%', grow: 1.1, dry: -1.5, bug: 0.8 },
    drought:{ name: '干旱', icon: 'drought',desc: '水分流失加快 2 倍',   grow: 0.85, dry: 2.0, bug: 1.0 },
    pest:   { name: '虫灾', icon: 'pest',   desc: '虫害概率 3 倍',       grow: 0.9, dry: 1.0, bug: 3.0 },
    bounty: { name: '丰收', icon: 'bounty', desc: '生长 +35%，产量 +1',  grow: 1.35, dry: 0.8, bug: 0.7, yield: 1 },
    snow:   { name: '落雪', icon: 'snow',   desc: '生长放缓，但无虫害',  grow: 0.75, dry: 0.3, bug: 0.2 }
  };

  /* ================= 季节 ================= */
  var SEASONS = {
    spring: { name: '春季', icon: 'spring', grow: 1.05 },
    summer: { name: '夏季', icon: 'summer', grow: 1.10 },
    autumn: { name: '秋季', icon: 'autumn', grow: 1.00 },
    winter: { name: '冬季', icon: 'winter', grow: 0.80 }
  };

  /* ================= 新手引导（分步等待真实操作） ================= */
  var TUTORIAL = [
    { id:'welcome', title:'欢迎来到你的农场', view:'farm',
      text:'这是 QQ 农场式的<b>逐格点击</b>经营：一块一块地锄地、播种、浇水、除虫、收获。\n跟着引导走 10 分钟，你就是合格的农场主了。', btn:'开工！' },
    { id:'hoe', title:'第 1 步 · 锄地', view:'farm', target:'.plot.wild',
      text:'灰色的是<b>荒地</b>。点击它把它锄成可用的耕地。', btn:'知道了', wait:'hoe',
      hint:'点击一块灰色荒地，把它锄成耕地' },
    { id:'sow', title:'第 2 步 · 播种', view:'farm', target:'.plot.tilled',
      text:'耕好的地是深棕色的。<b>点击耕地</b>，选择要种的作物（先种小麦，它是所有饲料的源头）。', btn:'去播种', wait:'sow',
      hint:'点击深棕色耕地，选一种作物种下' },
    { id:'water', title:'第 3 步 · 浇水', view:'farm',
      text:'作物生长中水分会下降。<b>水分见底就停止生长</b>，点一下地块就能浇水。\n下雨天会自动补水。', btn:'明白', wait:'water',
      hint:'点击生长中的作物，帮它补水' },
    { id:'harvest', title:'第 4 步 · 收获', view:'farm',
      text:'成熟后作物会<b>鼓起来并跳动</b>，点一下即可收获，自动进入仓库。\n成熟后 1 小时不收会枯萎，别偷懒。', btn:'去收获', wait:'harvest',
      hint:'等作物成熟（鼓起跳动）后点击收获，需要等一小会儿' },
    { id:'expand', title:'第 5 步 · 开垦更多土地', view:'farm', target:'.plot.locked',
      text:'农场右上角可以<b>开垦新土地</b>。地越多，产能越高。', btn:'明白' },
    { id:'animal', title:'第 6 步 · 养动物', view:'ranch', target:'.pen-card.empty',
      text:'牧场里<b>点击空栏位</b>买动物。动物会自动吃仓库里的饲料并产出，点栏位可喂食、抚摸、收取。', btn:'去牧场', wait:'buyAnimal',
      hint:'在牧场点击空栏位，买一只动物' },
    { id:'feed', title:'第 7 步 · 照顾动物', view:'ranch',
      text:'<b>喂食</b>恢复心情，<b>抚摸</b>提升亲密度（产量最高 +50%）。\n心情低于 25 动物会罢工，仓库没饲料也会停产。', btn:'明白', wait:'feed',
      hint:'点击有动物的栏位，给它喂食' },
    { id:'factory', title:'第 8 步 · 建加工厂', view:'factory',
      text:'原料直接卖很亏。<b>升到 Lv.2 后建磨坊</b>，把小麦磨成面粉，价值立刻翻倍。\n等级不够就先多种地、多收获攒经验。', btn:'明白' },
    { id:'shop', title:'第 9 步 · 开分店', view:'shop',
      text:'供应链终点是<b>分店</b>。开店后从仓库调拨商品，顾客就会持续上门送钱。\n先攒够金币和等级，再回来开第一家。', btn:'明白' },
    { id:'order', title:'第 10 步 · 接订单', view:'order', target:'.row',
      text:'<b>订单板</b>报酬远高于市场价，是前期最快的资金来源，优先做。', btn:'明白' },
    { id:'neighbor', title:'第 11 步 · 串门', view:'neighbor',
      text:'去<b>邻居农场</b>可以帮忙（浇水、除草，赚友好度和金币），也可以偷偷摘点东西——小心被狗逮到。', btn:'明白' },
    { id:'done', title:'你已经出师了', view:'farm',
      text:'接下来就是滚雪球：<b>扩地 → 升工厂 → 开满 5 家分店 → 全链路自动化</b>。\n游戏自动存档，关掉页面离线照常赚钱。', btn:'开始经营' }
  ];

  /* ================= 订单池 ================= */
  var ORDER_POOL = [
    { id:'o1',  need:{ wheat:20 },             pay:60,    xp:8,  lv:1 },
    { id:'o2',  need:{ carrot:8 },             pay:260,   xp:18, lv:1 },
    { id:'o3',  need:{ egg:5 },                pay:300,   xp:22, lv:2 },
    { id:'o4',  need:{ potato:8 },             pay:360,   xp:26, lv:2 },
    { id:'o5',  need:{ corn:8 },               pay:480,   xp:32, lv:3 },
    { id:'o6',  need:{ flour:4 },              pay:520,   xp:36, lv:3 },
    { id:'o7',  need:{ tomato:10 },            pay:640,   xp:42, lv:4 },
    { id:'o8',  need:{ bread:5 },              pay:900,   xp:52, lv:5 },
    { id:'o9',  need:{ milk:6 },               pay:880,   xp:50, lv:6 },
    { id:'o10', need:{ petFeed:6 },            pay:1150,  xp:62, lv:5 },
    { id:'o11', need:{ cucumber:12 },          pay:1250,  xp:70, lv:6 },
    { id:'o12', need:{ cheese:4 },             pay:1500,  xp:78, lv:7 },
    { id:'o13', need:{ wool:8 },               pay:1600,  xp:80, lv:7 },
    { id:'o14', need:{ pumpkin:10 },           pay:1750,  xp:88, lv:7 },
    { id:'o15', need:{ pastry:8 },             pay:2400,  xp:100,lv:8 },
    { id:'o16', need:{ coffeePowder:4 },       pay:2800,  xp:120,lv:9 },
    { id:'o17', need:{ watermelon:8 },         pay:2600,  xp:110,lv:8 },
    { id:'o18', need:{ strawberry:12 },        pay:3300,  xp:130,lv:9 },
    { id:'o19', need:{ yarn:4 },               pay:3000,  xp:125,lv:9 },
    { id:'o20', need:{ honey:8 },              pay:3600,  xp:140,lv:10 },
    { id:'o21', need:{ cake:4 },               pay:4200,  xp:165,lv:10 },
    { id:'o22', need:{ grape:14 },             pay:4400,  xp:170,lv:10 },
    { id:'o23', need:{ leather:6 },            pay:4600,  xp:175,lv:11 },
    { id:'o24', need:{ wine:4 },               pay:5200,  xp:190,lv:11 },
    { id:'o25', need:{ canned:10 },            pay:5000,  xp:185,lv:11 },
    { id:'o26', need:{ coffee:10 },            pay:5400,  xp:195,lv:11 },
    { id:'o27', need:{ cloth:5 },              pay:5800,  xp:210,lv:12 },
    { id:'o28', need:{ tea:8 },                pay:6200,  xp:220,lv:12 },
    { id:'o29', need:{ fish:10 },              pay:6800,  xp:240,lv:13 },
    { id:'o30', need:{ truffleOil:3 },         pay:8600,  xp:290,lv:14 },
    { id:'o31', need:{ alpacaWool:6,cloth:3 }, pay:12000, xp:350,lv:15 },
    { id:'o32', need:{ cotton:16, cloth:4 },   pay:15000, xp:420,lv:16 }
  ];

  /* ================= 邻居名字池 ================= */
  var NEIGHBOR_NAMES = ['老王农场','桃花源','阿美小院','老张菜园','莓好时光','稻香村','蘑菇屋','阳光牧场','清风谷','小满田园'];

  /* ================= 成就 ================= */
  var ACHIEVEMENTS = [
    { id:'firstHoe',    name:'第一锄',     desc:'锄开第一块荒地',           reward:{coins:120,gem:2} },
    { id:'firstSow',    name:'春播',       desc:'播下第一颗种子',           reward:{coins:150,gem:2} },
    { id:'firstHarvest',name:'初收获',     desc:'收获第一次作物',           reward:{coins:200,gem:3} },
    { id:'firstWater',  name:'甘露',       desc:'第一次浇水',               reward:{coins:100,gem:1} },
    { id:'firstBug',    name:'除害',       desc:'清除第一次虫害',           reward:{coins:150,gem:2} },
    { id:'firstAnimal', name:'牧场开张',   desc:'买下第一只动物',           reward:{coins:300,gem:3} },
    { id:'firstCraft',  name:'手工业者',   desc:'完成第一次加工',           reward:{coins:400,gem:4} },
    { id:'firstShop',   name:'连锁起点',   desc:'开出第一家分店',           reward:{coins:800,gem:6} },
    { id:'firstOrder',  name:'第一单',     desc:'完成第一个订单',           reward:{coins:300,gem:3} },
    { id:'firstSteal',  name:'神偷',       desc:'第一次从邻居家摘到东西',   reward:{coins:250,gem:2} },
    { id:'help10',      name:'热心邻居',   desc:'帮邻居 10 次',             reward:{coins:600,gem:5} },
    { id:'harvest50',   name:'熟练农夫',   desc:'累计收获 50 次',           reward:{coins:500,gem:5} },
    { id:'harvest300',  name:'丰收大户',   desc:'累计收获 300 次',          reward:{coins:2000,gem:10} },
    { id:'harvest1000', name:'农业机器',   desc:'累计收获 1000 次',         reward:{coins:8000,gem:25} },
    { id:'craft100',    name:'工业起步',   desc:'累计加工 100 次',          reward:{coins:1500,gem:8} },
    { id:'serve100',    name:'宾客盈门',   desc:'累计服务 100 位顾客',      reward:{coins:1200,gem:8} },
    { id:'serve1000',   name:'门庭若市',   desc:'累计服务 1000 位顾客',     reward:{coins:6000,gem:20} },
    { id:'order50',     name:'订单达人',   desc:'完成 50 个订单',           reward:{coins:2500,gem:12} },
    { id:'rich1',       name:'小有积蓄',   desc:'累计赚到 50,000 金币',     reward:{coins:2000,gem:8} },
    { id:'rich2',       name:'农场主',     desc:'累计赚到 500,000 金币',    reward:{coins:15000,gem:25} },
    { id:'rich3',       name:'农业大亨',   desc:'累计赚到 5,000,000 金币',  reward:{coins:100000,gem:60} },
    { id:'land18',      name:'广袤田野',   desc:'开垦 18 块土地',           reward:{coins:3000,gem:10} },
    { id:'land36',      name:'一望无际',   desc:'开垦全部 36 块土地',       reward:{coins:20000,gem:30} },
    { id:'pen12',       name:'动物园',     desc:'开满 12 个栏位',           reward:{coins:25000,gem:30} },
    { id:'factoryAll',  name:'工业巨头',   desc:'建成全部 10 座工厂',       reward:{coins:30000,gem:40} },
    { id:'shop5',       name:'连锁帝国',   desc:'开满 5 家分店',            reward:{coins:50000,gem:50} },
    { id:'cropAll',     name:'作物图鉴',   desc:'解锁全部 16 种作物',       reward:{coins:20000,gem:30} },
    { id:'animalAll',   name:'动物图鉴',   desc:'解锁全部 12 种动物',       reward:{coins:25000,gem:35} },
    { id:'lvl10',       name:'十里八乡',   desc:'达到 10 级',               reward:{coins:3000,gem:12} },
    { id:'lvl20',       name:'名震一方',   desc:'达到 20 级',               reward:{coins:30000,gem:40} },
    { id:'fullChain',   name:'全链路贯通', desc:'同时拥有作物、畜牧、加工、分店产出', reward:{coins:8000,gem:25} },
    { id:'decorAll',    name:'园艺大师',   desc:'买齐全部农场装饰',         reward:{coins:20000,gem:30} }
  ];

  /* ================= 每日任务 ================= */
  var DAILY_POOL = [
    { id:'d1',  desc:'收获 10 次作物',      need:{ harvest:10 },  reward:{coins:400,gem:3} },
    { id:'d2',  desc:'收获 25 次作物',      need:{ harvest:25 },  reward:{coins:900,gem:6} },
    { id:'d3',  desc:'给动物喂食 5 次',     need:{ feed:5 },      reward:{coins:350,gem:2} },
    { id:'d4',  desc:'加工 8 次',           need:{ craft:8 },     reward:{coins:600,gem:4} },
    { id:'d5',  desc:'完成 3 个订单',       need:{ order:3 },     reward:{coins:800,gem:5} },
    { id:'d6',  desc:'服务 20 位顾客',      need:{ serve:20 },    reward:{coins:700,gem:5} },
    { id:'d7',  desc:'浇水 10 次',          need:{ water:10 },    reward:{coins:300,gem:2} },
    { id:'d8',  desc:'锄地并播种 6 次',     need:{ sow:6 },       reward:{coins:450,gem:3} },
    { id:'d9',  desc:'帮邻居 3 次',         need:{ help:3 },      reward:{coins:500,gem:4} },
    { id:'d10', desc:'赚到 5,000 金币',     need:{ earn:5000 },   reward:{coins:1000,gem:8} },
    { id:'d11', desc:'赚到 30,000 金币',    need:{ earn:30000 },  reward:{coins:3000,gem:15} },
    { id:'d12', desc:'除虫 / 除草 5 次',    need:{ clean:5 },     reward:{coins:300,gem:2} }
  ];

  FARM.DATA = {
    CONST: CONST, xpForLevel: xpForLevel,
    ITEMS: ITEMS, CROPS: CROPS, ANIMALS: ANIMALS,
    FACTORIES: FACTORIES, RECIPES: RECIPES, SHOPS: SHOPS, STAFF: STAFF,
    DECOR: DECOR, FARM_DECOR: FARM_DECOR, TOOLS: TOOLS,
    PLOT_UNLOCKS: PLOT_UNLOCKS, PEN_UNLOCKS: PEN_UNLOCKS,
    WEATHER: WEATHER, SEASONS: SEASONS,
    TUTORIAL: TUTORIAL, ORDER_POOL: ORDER_POOL, ACHIEVEMENTS: ACHIEVEMENTS,
    DAILY_POOL: DAILY_POOL, NEIGHBOR_NAMES: NEIGHBOR_NAMES
  };

  FARM.itemName = function (id) { return (ITEMS[id] && ITEMS[id].name) || id; };
  FARM.itemPrice = function (id) { return (ITEMS[id] && ITEMS[id].price) || 0; };
  FARM.itemIcon = function (id) { return (ITEMS[id] && ITEMS[id].icon) || 'bag'; };
})(window);

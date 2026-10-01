/* ==========================================================
 *  main.js — 启动入口
 * ========================================================== */
(function (global) {
  'use strict';
  var FARM = global.FARM;

  function start() {
    var D = FARM.DATA, K = D.CONST, S = FARM.state;

    /* 1. 读档（含离线结算） */
    S.init();

    /* 2. 系统初始化：天气 / 季节 / 每日 / 邻居 */
    FARM.sys.tick();

    /* 3. 首次进入确保有订单 */
    if (!S.data.orders.length) FARM.sim.refreshOrders(true);

    /* 4. 启动 UI */
    FARM.assets.boot();
    FARM.ui.boot();

    /* 5. 主循环：每 1 秒推进世界 */
    setInterval(function () {
      FARM.sim.tick();
      FARM.sys.tick();
      FARM.ui.render();
    }, K.TICK_MS || 1000);

    /* 6. 切后台时保存 */
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { S.data.lastSeen = FARM.now(); S.write(); }
    });
    global.addEventListener('beforeunload', function () {
      S.data.lastSeen = FARM.now(); S.write();
    });

    /* 7. 离线收益提示 */
    if (S.data.stats.offline > 0) {
      FARM.ui.toast('离线期间农场正常运转，收获了 ' + S.data.stats.offline + ' 次作物', 'ok');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})(window);

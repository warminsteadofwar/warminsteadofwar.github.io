// 动态加载 oh-my-live2d 库（CDN），加载完成后初始化
(function () {
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/oh-my-live2d@latest/dist/index.min.js';
  s.onload = initLive2d;
  document.head.appendChild(s);

  function initLive2d() {
    const oml2d = OML2D.loadOml2d({
      // 模型：使用 oh-my-live2d 官方模型 CDN，可放多个供右键切换
      models: [
        {
          path: 'https://model.oml2d.com/HK416-1-normal/model.json',
          scale: 0.08,
          position: [0, 60],
          stageStyle: { height: 350 },
        },
        {
          path: 'https://model.oml2d.com/Senko_Normals/senko.model3.json',
          scale: 0.5,
          position: [0, 60],
          stageStyle: { height: 350 },
        },
      ],
      // 看板娘出现的位置/方向
      dockedPosition: 'right',
      // 手机端是否显示（默认隐藏，避免遮挡）
      mobileDisplay: false,
      // 提示框/说话气泡
      tips: {
        // 情境化欢迎语：按时间段 + 按来源
        welcomeTips: {
          message: {
            daytime: '中午好，记得吃饭哦～',
            morning: '早上好！新的一天也要元气满满呀 ☀️',
            afternoon: '下午好，来杯茶歇一歇吧 🍵',
            dusk: '日落了呢，今天过得怎么样？',
            night: '晚上好，夜里也要注意休息哦 🌙',
            lateNight: '已经深夜啦，早点睡对身体好呀 💤',
            weeHours: '凌晨了……还不睡的话我会担心的！',
          },
        },
        // 关闭按钮提示等可保留默认
        idleTips: {
          // 仅按情境说话，闲置时不刷一言；如想让它偶尔自言自语可设为 true
          wordTheDay: false,
          message: [],
        },
      },
    });

    // 按页面情境补充一句（首页 / 文章页）
    document.addEventListener('DOMContentLoaded', () => {
      const path = location.pathname;
      let msg = '';
      if (path === '/' || path === '/index.html') {
        msg = '欢迎来到我的小站，随便逛逛吧～';
      } else if (/\/20\d{2}\//.test(path)) {
        msg = '在看这篇文章呀，慢慢看哦 📖';
      }
      if (msg) oml2d.tipsMessage(msg, 5000, 9);
    });
  }
})();

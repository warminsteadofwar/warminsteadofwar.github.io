// 动态加载 oh-my-live2d 库（CDN），加载完成后初始化
(function () {
  const DRAG_KEY = 'oml2d-drag-pos'; // 拖拽位置在 localStorage 的键名

  // 修复气泡被模型遮挡：oml2d 画布 z-index 是 9998，而气泡 #oml2d-tips
  // 默认 z-index 为 auto(0)，导致模型盖住说的话。把气泡提到画布之上。
  const fixStyle = document.createElement('style');
  fixStyle.textContent = '#oml2d-tips{z-index:10001 !important;}';
  document.head.appendChild(fixStyle);

  const s = document.createElement('script');
  // 锁定版本，避免 @latest 出现破坏性更新
  s.src = 'https://cdn.jsdelivr.net/npm/oh-my-live2d@0.19.3/dist/index.min.js';
  s.onload = initLive2d;
  document.head.appendChild(s);

  function initLive2d() {
    const oml2d = OML2D.loadOml2d({
      // 同时加载 cubism2 + cubism4 运行时：
      // 旧模型（.model.json，如 shizuku/koharu）是 cubism2，
      // 嘉然这类新模型（.model3.json）是 cubism4，'all' 才能两者都跑。
      importType: 'all',
      // 模型：改用 jsdelivr 上稳定的 npm 模型源（原 model.oml2d.com 经常连不上，
      // 是“加载失败/重新加载”的根因）。可放多个供菜单切换。
      // 模型来源：github.com/Efterklang/live2d_Asoul（A-SOUL，带完整动作/点击互动/语音文字）
      // 全部走 jsDelivr CDN，无需本地托管。默认显示第一个（嘉然）。
      models: [
        {
          // 嘉然今天吃什么（默认）
          name: '嘉然',
          path: 'https://cdn.jsdelivr.net/gh/Efterklang/live2d_Asoul@main/live2d/Diana/Diana.model3.json',
          scale: 0.2,        // 放大；最终值用预览微调
          position: [0, 0],
          stageStyle: { width: 360, height: 480 },
        },
        {
          // 向晚大魔王
          name: '向晚',
          path: 'https://cdn.jsdelivr.net/gh/Efterklang/live2d_Asoul@main/live2d/Ava/Ava.model3.json',
          scale: 0.2,
          position: [0, 0],
          stageStyle: { width: 360, height: 480 },
        },
      ],
      // 看板娘初始停靠的方向（仍保留贴边，拖拽会覆盖它）
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

    // 启用自由拖拽
    enableDrag();
  }

  // ===== 自由拖拽：把看板娘拖到屏幕任意位置，并记住位置 =====
  // 关键：默认【不动】oml2d 的定位（让它自然显示在右下角），
  // 只有用户真正开始拖动、或需要恢复上次保存的位置时，才接管为 fixed + left/top，
  // 避免在模型异步加载期间与 oml2d 自己的定位/滑入动画打架。
  function enableDrag() {
    waitFor(getStageEl, (stage) => {
      stage.style.cursor = 'grab';
      let taken = false; // 是否已接管定位

      function takeOver() {
        if (taken) return;
        const r = stage.getBoundingClientRect(); // 接管前的真实可视位置
        stage.style.position = 'fixed';
        stage.style.margin = '0';
        stage.style.right = 'auto';
        stage.style.bottom = 'auto';
        // 必须先关掉 oml2d 的 CSS 动画：运行中的 animation 会盖过内联 transform，
        // 不清掉的话下面的 transform:none 不生效，模型会卡在屏幕外。
        stage.style.animation = 'none';
        stage.style.transform = 'none';
        stage.style.transition = 'none'; // 关掉滑入滑出动画，免得和拖拽打架
        stage.style.zIndex = stage.style.zIndex || '9999';
        place(stage, r.left, r.top);
        taken = true;

        // 切换模型时 oml2d 会重新加上滑入动画，可能把模型再藏到屏幕外。
        // 用 MutationObserver 监听，一旦动画被重新加上就立刻清掉，保持可见。
        if (window.MutationObserver) {
          const mo = new MutationObserver(() => {
            if (stage.style.animation && stage.style.animation !== 'none') {
              stage.style.animation = 'none';
              stage.style.transform = 'none';
            }
          });
          mo.observe(stage, { attributes: true, attributeFilter: ['style'] });
        }
      }

      // 有历史位置：模型加载/动画结束后会重排，所以多次重试恢复，确保最终落到保存的位置
      const saved = loadPos();
      if (saved) {
        let n = 0;
        const iv = setInterval(() => {
          takeOver();
          place(stage, saved.left, saved.top);
          if (++n >= 6) clearInterval(iv);
        }, 500);
      } else {
        // 兜底：模型加载/动画结束后，若用户既没拖动也无历史位置，
        // 主动接管并夹进可视区域（takeOver 内的 place 会 clamp 进屏幕），
        // 防止 oml2d 把较大的模型停在屏幕外看不见。
        setTimeout(() => { if (!taken) takeOver(); }, 2500);
      }

      let dragging = false;
      let moved = false;          // 是否真的移动过（用于区分“点击”和“拖拽”）
      let startX = 0, startY = 0;
      let originLeft = 0, originTop = 0;
      const THRESHOLD = 4;        // 移动超过 4px 才算拖拽，小于的当作点击交给模型

      stage.addEventListener('pointerdown', (e) => {
        dragging = true;
        moved = false;
        startX = e.clientX;
        startY = e.clientY;
        const r = stage.getBoundingClientRect();
        originLeft = r.left;
        originTop = r.top;
      });

      window.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (!moved && Math.hypot(dx, dy) < THRESHOLD) return; // 还没到阈值，先不动
        if (!moved) {
          moved = true;
          takeOver(); // 真正开始拖了，才接管定位
          stage.style.cursor = 'grabbing';
          stage.setPointerCapture && stage.setPointerCapture(e.pointerId);
        }
        place(stage, originLeft + dx, originTop + dy);
      });

      window.addEventListener('pointerup', () => {
        if (dragging && moved) {
          const r = stage.getBoundingClientRect();
          savePos(r.left, r.top);
        }
        dragging = false;
        stage.style.cursor = 'grab';
      });

      // 窗口尺寸变化时，若已接管定位，把它拉回可视范围
      window.addEventListener('resize', () => {
        if (!taken) return;
        const r = stage.getBoundingClientRect();
        place(stage, r.left, r.top);
      });
    });
  }

  // 把 stage 放到 (left, top)，并限制不超出视口
  function place(stage, left, top) {
    const w = stage.offsetWidth || 200;
    const h = stage.offsetHeight || 300;
    const maxLeft = window.innerWidth - w;
    const maxTop = window.innerHeight - h;
    left = Math.max(0, Math.min(left, maxLeft));
    top = Math.max(0, Math.min(top, maxTop));
    stage.style.left = left + 'px';
    stage.style.top = top + 'px';
  }

  function savePos(left, top) {
    try { localStorage.setItem(DRAG_KEY, JSON.stringify({ left, top })); } catch (e) {}
  }
  function loadPos() {
    try { return JSON.parse(localStorage.getItem(DRAG_KEY)); } catch (e) { return null; }
  }

  // 找 oml2d 的舞台容器元素（不同版本 id/class 可能不同，多兜底几种）
  function getStageEl() {
    let el = document.querySelector('#oml2d-stage') || document.querySelector('.oml2d-stage');
    if (el) return el;
    const canvas = document.querySelector('#oml2d-canvas, canvas[id^="oml2d"], canvas[id*="live2d"]');
    if (canvas) {
      // 向上找到带固定定位的容器
      let p = canvas.parentElement;
      while (p && p !== document.body) {
        const pos = getComputedStyle(p).position;
        if (pos === 'fixed' || pos === 'absolute') return p;
        p = p.parentElement;
      }
      return canvas.parentElement;
    }
    return null;
  }

  // 轮询等待元素出现（模型异步加载，元素不会立刻就绪）
  function waitFor(getter, cb, tries = 60) {
    const el = getter();
    if (el) { cb(el); return; }
    if (tries <= 0) return;
    setTimeout(() => waitFor(getter, cb, tries - 1), 300);
  }
})();

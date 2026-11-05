(function () {
  'use strict';

  var KEY = 'doghome.v1';
  var db = null;
  var breathing = false;
  var breathToken = 0;

  function $(s) { return document.querySelector(s); }
  function $$(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }

  /* ---------------- 存储 ---------------- */

  function loadDB() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }

  function saveDB() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {}
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  /* ---------------- 日期 ---------------- */

  function todayStart() {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function parseDate(s) {
    if (!s) return null;
    var p = String(s).split('-').map(Number);
    if (p.length !== 3 || !p[0]) return null;
    return new Date(p[0], p[1] - 1, p[2]);
  }

  function ymd(d) {
    var m = ('0' + (d.getMonth() + 1)).slice(-2);
    var day = ('0' + d.getDate()).slice(-2);
    return d.getFullYear() + '-' + m + '-' + day;
  }

  function weekdayCN(d) {
    return '日一二三四五六'[d.getDay()];
  }

  function daysBetween(a, b) {
    return Math.round((b.getTime() - a.getTime()) / 86400000);
  }

  function nextOccurrence(ann) {
    var base = parseDate(ann.date);
    if (!base) return null;
    var t = todayStart();
    var occ;
    if (ann.yearly) {
      occ = new Date(t.getFullYear(), base.getMonth(), base.getDate());
      if (occ.getTime() < t.getTime()) {
        occ = new Date(t.getFullYear() + 1, base.getMonth(), base.getDate());
      }
    } else {
      occ = new Date(base.getFullYear(), base.getMonth(), base.getDate());
      if (occ.getTime() < t.getTime()) return null;
    }
    return occ;
  }

  function allEvents(limitDays) {
    if (!window.DogEvents) return [];
    return window.DogEvents.all(db.profile, db.anns, limitDays);
  }

  /* ---------------- 形象状态 ---------------- */

  function stickerByTime() {
    var h = new Date().getHours();
    if (h >= 5 && h < 10) return 'morning-reading.gif';
    if (h >= 10 && h < 18) return '521.gif';
    if (h >= 18 && h < 22) return 'after-work.gif';
    if (h >= 22) return 'sleepy.gif';
    return 'sleep.gif';
  }

  var STICKER_BASE = 'assets/stickers/';

  // 首页点它时随机播放的可爱动作
  var HOME_POOL = [
    'cuddle.gif', 'okay.gif', 'cheer.gif', 'love.gif', 'nuzzle.gif',
    'lift.gif', 'poke.gif', 'hop.gif', 'breeze.gif', 'pat.gif',
    'x_heart-coming.gif', 'x_blow-heart.gif', 'x_toss-heart.gif', 'x_catch-heart.gif',
    'x_snuggle.gif', 'x_tickle.gif', 'x_dance.gif', 'x_clap.gif',
    'x_wag-tail.gif', 'x_spin.gif', 'x_eat-cake.gif', 'x_love-you.gif',
    'x_gift-heart.gif', 'x_proud.gif',
  ];

  var homeTapTimer = null;

  // 洗牌袋：一轮内不重复；取牌前再检查最近 5 张，撞了就换一张
  function makePicker(list) {
    var deck = [];
    var recent = [];
    var window = Math.min(5, Math.max(1, list.length - 1));

    return function () {
      if (!deck.length) {
        deck = list.slice();
        for (var i = deck.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var t = deck[i];
          deck[i] = deck[j];
          deck[j] = t;
        }
      }

      var idx = deck.length - 1;
      if (recent.indexOf(deck[idx]) !== -1) {
        for (var k = deck.length - 2; k >= 0; k--) {
          if (recent.indexOf(deck[k]) === -1) {
            var tmp = deck[k];
            deck[k] = deck[idx];
            deck[idx] = tmp;
            break;
          }
        }
      }

      var picked = deck.pop();
      recent.push(picked);
      while (recent.length > window) recent.shift();
      return picked;
    };
  }

  var pickHomeSticker = makePicker(HOME_POOL);

  function preloadStickers() {
    var names = HOME_POOL.concat(LOVE_STICKERS).concat([
      'jump.gif', 'good.gif', 'heart.gif', 'music-dance.gif', 'special.gif',
      'scroll.gif', 'sleep.gif', 'sleepy.gif', 'sleepy2.gif', '520.gif',
      '521.gif', 'delete.gif', 'morning-reading.gif', 'after-work.gif',
      'mealtime.gif', 'flop.gif', 'yeah.gif',
    ]);
    var seen = {};
    for (var i = 0; i < names.length; i++) {
      if (seen[names[i]]) continue;
      seen[names[i]] = 1;
      var img = new Image();
      img.src = STICKER_BASE + names[i];
    }
  }

  function setHomeSticker(name) {
    $('#homeSticker').src = STICKER_BASE + name;
  }

  /* ---------------- 首页 ---------------- */

  function renderHome() {
    var now = new Date();
    $('#homeDate').textContent =
      (now.getMonth() + 1) + ' 月 ' + now.getDate() + ' 日 · 星期' + weekdayCN(now);

    var start = parseDate(db.profile.startDate);
    if (start) {
      $('#daysNum').textContent = Math.max(0, daysBetween(start, todayStart()) + 1);
      if (db.profile.showSince === false) {
        $('#daysSince').textContent = '';
      } else {
        $('#daysSince').textContent =
          start.getFullYear() +
          '.' +
          ('0' + (start.getMonth() + 1)).slice(-2) +
          '.' +
          ('0' + start.getDate()).slice(-2) +
          ' 起';
      }
    } else {
      $('#daysNum').textContent = '—';
      $('#daysSince').textContent = '';
    }

    var daily = $('#dailyLine');
    if (daily) {
      var idx = (now.getFullYear() * 372 + now.getMonth() * 31 + now.getDate()) % DAILY_LINES.length;
      daily.textContent = DAILY_LINES[idx];
    }

    var list = allEvents();
    if (list.length) {
      var first = list[0];
      var icon = window.DogEvents ? DogEvents.ICONS[first.icon] || '💗' : '💗';
      $('#nextIcon').textContent = icon;
      $('#nextName').textContent = first.title;
      var left = daysBetween(todayStart(), first.date);
      $('#nextDays').textContent = left === 0 ? '就是今天' : left + ' 天后';
    } else {
      $('#nextIcon').textContent = '📌';
      $('#nextName').textContent = '还没有记日子';
      $('#nextDays').textContent = '去添加';
    }

    setHomeSticker(stickerByTime());

    var hint = $('#tapHint');
    if (hint) hint.style.display = db.profile.seenTap ? 'none' : 'block';
  }

  /* ---------------- 纪念日列表 ---------------- */

  function renderAnns() {
    var box = $('#annList');
    box.innerHTML = '';

    if (!window.DogEvents) return;

    var list = allEvents();
    if (!list.length) {
      box.innerHTML = '<div style="color:#9A8B80;font-size:14px;padding:20px 0">还没有日子</div>';
      return;
    }

    var own = list.filter(function (e) { return e.type !== 'festival'; });
    var fest = list.filter(function (e) { return e.type === 'festival'; });

    function section(title, items) {
      if (!items.length) return;

      var head = document.createElement('div');
      head.className = 'ann-section';
      head.textContent = title;
      box.appendChild(head);

      items.forEach(function (item) {
        var el = document.createElement('div');
        el.className = 'ann-item';

        var left = daysBetween(todayStart(), item.date);
        var icon = DogEvents.ICONS[item.icon] || '📌';
        var typeText = DogEvents.TYPE_LABEL[item.type] || '';

        el.innerHTML =
          '<div class="ann-icon"></div>' +
          '<div class="meta"><span class="title"></span><span class="date"></span></div>' +
          '<div class="count"><b></b><span></span></div>' +
          (item.customId ? '<button class="del" aria-label="删除">×</button>' : '');

        el.querySelector('.ann-icon').textContent = icon;
        el.querySelector('.title').textContent = item.title;
        el.querySelector('.date').textContent =
          item.date.getMonth() + 1 + ' 月 ' + item.date.getDate() + ' 日 · ' + typeText;
        el.querySelector('.count b').textContent = left === 0 ? '今天' : left;
        el.querySelector('.count span').textContent = left === 0 ? '就是今天' : '天后';

        if (item.customId) {
          el.querySelector('.del').addEventListener('click', function () {
            db.anns = db.anns.filter(function (x) { return x.id !== item.customId; });
            saveDB();
            renderAnns();
            renderHome();
            syncReminders();
            toast('删掉了');
          });
        }

        box.appendChild(el);
      });
    }

    section('我们的日子', own);
    section('节日', fest);
  }

  /* ---------------- 页面切换 ---------------- */

  function switchTab(name) {
    // 足迹是独立整页，直接跳过去，避免 iframe 嵌套把布局压扁
    if (name === 'map') {
      window.location.href = 'travel-map/index.html';
      return;
    }

    $$('.screen').forEach(function (s) { s.classList.remove('active'); });
    var target = $('#screen-' + name);
    if (target) target.classList.add('active');

    $$('.tabbar button').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-tab') === name);
    });

    if (name === 'home') renderHome();
    if (name === 'days') renderAnns();
  }

  /* ---------------- 心情 ---------------- */

  function renderMoodChips() {
    var grid = $('#moodGrid');
    grid.innerHTML = '';
    Object.keys(MOODS).forEach(function (key) {
      var m = MOODS[key];
      var b = document.createElement('button');
      b.className = 'mood-chip';
      b.innerHTML = '<span class="face">' + m.face + '</span><span class="t">' + m.label + '</span>';
      b.addEventListener('click', function () { pickMood(key); });
      grid.appendChild(b);
    });
  }

  var currentMood = null;

  function pickMood(key) {
    currentMood = key;
    var m = MOODS[key];
    closeSheet('#moodOverlay');

    $('#comfortSticker').src = STICKER_BASE + m.comfortSticker;
    $('#comfortMsg').textContent = m.lines[Math.floor(Math.random() * m.lines.length)];
    $('#comfortFrom').textContent = (db.profile.myName || '狗狗宝') + ' 说';
    $('#comfort').classList.add('show');
    vibrate(12);
  }

  /* ---------------- 呼吸 ---------------- */

  function wait(ms, token) {
    return new Promise(function (resolve) {
      setTimeout(function () {
        resolve(token === breathToken);
      }, ms);
    });
  }

  var BREATH_DOGS = ['heart.gif', 'music-dance.gif', 'good.gif', 'scroll.gif'];

  async function runBreath() {
    breathing = true;
    var token = ++breathToken;

    var halo = $('#breathHalo');
    var dog = $('#breathDog');
    var dots = $('#breathDots');
    var hint = $('#breathHint');

    hint.textContent = '跟着它，慢慢来';
    dots.innerHTML = '';
    for (var i = 0; i < 4; i++) dots.appendChild(document.createElement('i'));

    halo.style.transitionDuration = '0s';
    dog.style.transitionDuration = '0s';
    halo.style.transform = 'scale(0.85)';
    dog.style.transform = 'scale(0.9)';
    await wait(60, token);

    // 只靠胀缩引导：鼓起来吸，缩回去呼
    var phases = [
      [4, 1.28],
      [7, 1.28],
      [8, 0.85],
    ];

    for (var round = 0; round < 4; round++) {
      if (!breathing || token !== breathToken) return;

      dog.src = STICKER_BASE + BREATH_DOGS[round % BREATH_DOGS.length];
      var marks = dots.querySelectorAll('i');
      if (marks[round]) marks[round].classList.add('on');

      for (var p = 0; p < phases.length; p++) {
        if (!breathing || token !== breathToken) return;
        var sec = phases[p][0];
        var scale = phases[p][1];

        halo.style.transitionDuration = sec + 's';
        dog.style.transitionDuration = sec + 's';
        halo.style.transform = 'scale(' + scale + ')';
        dog.style.transform = 'scale(' + scale + ')';

        var ok = await wait(sec * 1000, token);
        if (!ok) return;
      }
    }

    breathing = false;
    dog.src = STICKER_BASE + 'good.gif';
    hint.textContent = '刚刚那口气，你撑过来了';
    setTimeout(function () {
      $('#breath').classList.remove('show');
      toast('现在感觉好一点了吗');
    }, 2400);
  }

  function stopBreath() {
    breathing = false;
    breathToken++;
    $('#breath').classList.remove('show');
    var halo = $('#breathHalo');
    var dog = $('#breathDog');
    if (halo) halo.style.transform = 'scale(0.85)';
    if (dog) dog.style.transform = 'scale(0.9)';
  }

  /* ---------------- 说句想她的话 ---------------- */

  var LOVE_STICKERS = [
    'love.gif', 'kiss.gif', 'nuzzle.gif', 'cuddle.gif', 'okay.gif',
    'x_heart-coming.gif', 'x_blow-heart.gif', 'x_toss-heart.gif',
    'x_catch-heart.gif', 'x_snuggle.gif', 'x_tickle.gif', 'x_gift-heart.gif',
  ];
  var pickLoveSticker = makePicker(LOVE_STICKERS);
  var lovePool = LOVE_LINES.slice();
  var loveDeck = [];

  function rebuildLovePool() {
    var raw = db && db.profile && db.profile.customLines ? db.profile.customLines : '';
    var extra = raw
      .split('\n')
      .map(function (s) { return s.trim(); })
      .filter(function (s) { return s.length > 0; });
    lovePool = LOVE_LINES.concat(extra);
    loveDeck = [];
  }

  // 洗牌发牌：一轮之内不重复
  function nextLoveLine() {
    if (!lovePool.length) lovePool = LOVE_LINES.slice();
    if (!loveDeck.length) {
      loveDeck = lovePool.map(function (_, i) { return i; });
      for (var i = loveDeck.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = loveDeck[i];
        loveDeck[i] = loveDeck[j];
        loveDeck[j] = t;
      }
    }
    return lovePool[loveDeck.pop()];
  }

  function showLove() {
    var s = pickLoveSticker();
    $('#loveSticker').src = STICKER_BASE + s;
    $('#loveMsg').textContent = nextLoveLine();
    $('#loveMsg').style.opacity = '1';
    $('#loveOverlay').classList.add('show');
    hearts();
    vibrate(12);
  }

  /* ---------------- 小工具 ---------------- */

  function vibrate(ms) {
    try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {}
  }

  function closeSheet(sel) {
    $(sel).classList.remove('show');
  }

  var toastTimer = null;
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 1800);
  }

  function hearts() {
    for (var i = 0; i < 8; i++) {
      (function (i) {
        setTimeout(function () {
          var h = document.createElement('div');
          h.className = 'heart';
          h.textContent = ['💗', '🤍', '💛'][i % 3];
          h.style.left = 15 + Math.random() * 70 + '%';
          h.style.bottom = 15 + Math.random() * 20 + '%';
          document.body.appendChild(h);
          setTimeout(function () { h.remove(); }, 1700);
        }, i * 90);
      })(i);
    }
  }

  /* ---------------- 表单 ---------------- */

  function fillProfileForm() {
    $('#inpHerName').value = db.profile.herName || '';
    $('#inpMyName').value = db.profile.myName || '';
    $('#inpStart').value = db.profile.startDate || '';
    $('#inpBirthday').value = db.profile.birthday || '';
    $('#inpMyBirthday').value = db.profile.myBirthday || '';
    $('#inpCity').value = db.profile.city || '';
    $('#inpShowSince').checked = db.profile.showSince !== false;
    updateNotifyState();
    var n = db.profile.notify || {};
    $('#selProvider').value = n.provider || 'serverchan';
    $('#inpToken').value = n.token || '';
    $('#inpCustomLines').value = db.profile.customLines || '';
    syncDateInputs();
  }

  // 日期框为空时隐藏系统占位文字
  function syncDateInputs() {
    var inputs = document.querySelectorAll('input[type="date"]');
    for (var i = 0; i < inputs.length; i++) {
      inputs[i].classList.toggle('has-value', !!inputs[i].value);
    }
  }

  function defaultAnns() {
    var arr = [];
    if (db.profile.startDate) {
      arr.push({ id: uid(), title: '在一起', date: db.profile.startDate, yearly: true });
    }
    if (db.profile.birthday) {
      arr.push({ id: uid(), title: '她的生日', date: db.profile.birthday, yearly: true });
    }
    if (db.profile.myBirthday) {
      arr.push({ id: uid(), title: '我的生日', date: db.profile.myBirthday, yearly: true });
    }
    return arr;
  }

  /* ---------------- 紧急通知 ---------------- */

  // 每种心情发出去的措辞都不一样，让他一眼看出她是烦还是难过
  var MOOD_ALERT = {
    sad: { title: '小狗需要你', body: '有点难过，可能需要你陪一会儿。' },
    tired: { title: '小狗需要你', body: '好累，可能需要你。' },
    angry: { title: '小狗需要你', body: '有点烦，可能需要你哄一下。' },
    miss: { title: '小狗需要你', body: '想你了。' },
  };

  // 容错：允许用户直接粘整条 curl 命令或完整网址，自动提取其中的 key
  function cleanToken(raw, provider) {
    var s = (raw || '').trim().replace(/^['"]|['"]$/g, '');
    if (!s) return '';
    s = s.replace(/^curl\s+(-[A-Za-z]+\s+\S+\s+)*/i, '');

    var bark = s.match(/api\.day\.app\/([^\/?#\s'"]+)/i);
    if (bark) return bark[1];

    var sc = s.match(/sctapi\.ftqq\.com\/([^\/?#\s'"]+)/i);
    if (sc) return sc[1].replace(/\.send$/i, '');

    var pp = s.match(/[?&]token=([^&\s'"]+)/i);
    if (pp) return pp[1];

    return s.split(/[\s?#]/)[0];
  }

  function alertUrl(test) {
    var n = db.profile.notify || {};
    var token = n.provider === 'custom' ? (n.token || '').trim() : cleanToken(n.token, n.provider);
    if (!token) return null;

    var her = db.profile.herName || '她';
    var mood = MOOD_ALERT[currentMood] || {
      title: '小狗需要你',
      body: '刚点开了小狗窝，可能需要你。',
    };

    var title = test ? '测试消息' : mood.title;
    var body = test
      ? '这是一条测试消息，收到说明设置成功。'
      : her + '：' + mood.body;

    var t = new Date();
    var time = ('0' + t.getHours()).slice(-2) + ':' + ('0' + t.getMinutes()).slice(-2);
    var T = encodeURIComponent(title);
    var B = encodeURIComponent(body + '（' + time + '）');

    switch (n.provider) {
      case 'bark':
        return (
          'https://api.day.app/' +
          encodeURIComponent(token) +
          '/' +
          T +
          '/' +
          B +
          '?group=' +
          encodeURIComponent('小狗窝') +
          '&ttl=600'
        );
      case 'pushplus':
        return (
          'https://www.pushplus.plus/send?token=' +
          encodeURIComponent(token) +
          '&title=' +
          T +
          '&content=' +
          B
        );
      case 'custom':
        return token.replace('{title}', T).replace('{body}', B);
      default:
        return 'https://sctapi.ftqq.com/' + encodeURIComponent(token) + '.send?title=' + T + '&desp=' + B;
    }
  }

  function sendAlert(test) {
    var url = alertUrl(test);
    if (!url) return 'nokey';

    if (!test) {
      if (db.lastAlert && Date.now() - db.lastAlert < 60000) return 'cooldown';
      db.lastAlert = Date.now();
      saveDB();
    }

    function fallback() {
      try {
        var img = new Image();
        img.src = url;
      } catch (e) {}
    }

    try {
      fetch(url, { mode: 'no-cors', cache: 'no-store' })
        .then(function () {
          db.lastSendOk = true;
          db.lastSentAt = Date.now();
          saveDB();
          updateNotifyState();
        })
        .catch(function () {
          db.lastSendOk = false;
          db.lastSentAt = Date.now();
          saveDB();
          updateNotifyState();
          fallback();
          toast('发送失败，检查网络或 key');
        });
    } catch (e) {
      fallback();
    }

    vibrate(40);
    return 'sent';
  }

  function updateNotifyState() {
    var el = $('#notifyState');
    if (!el) return;
    var tok = (db.profile.notify || {}).token || '';
    var keyText = tok ? '当前 key：' + tok.slice(0, 4) + '…' + tok.slice(-4) : '还没有设置 key';
    var lastText = '';
    if (db.lastSentAt) {
      var t = new Date(db.lastSentAt);
      lastText =
        ' · 最近发送 ' +
        ('0' + t.getHours()).slice(-2) +
        ':' +
        ('0' + t.getMinutes()).slice(-2) +
        (db.lastSendOk ? ' 成功' : ' 可能失败');
    }
    el.textContent = keyText + lastText;
  }

  /* ---------------- 纪念日提醒 ---------------- */

  // 提前 7 / 3 / 1 天和当天，上午 9 点提醒
  function buildReminders() {
    var out = [];
    var now = Date.now();

    allEvents(365).forEach(function (ev) {
      var icon = DogEvents.ICONS[ev.icon] || '💗';
      var days = [];
      if (ev.advance > 0) days.push(ev.advance);
      days.push(0);

      days.forEach(function (d) {
        var t = new Date(
          ev.date.getFullYear(),
          ev.date.getMonth(),
          ev.date.getDate() - d,
          9,
          0,
          0
        ).getTime();
        if (t <= now + 60000) return;

        var title =
          d === 0
            ? icon + ' 今天是「' + ev.title + '」'
            : icon + ' 还有 ' + d + ' 天 · ' + ev.title;
        var text = d === 0 ? '别忘了，今天是个特别的日子。' : '提前准备一下，别错过。';

        out.push({ time: t, title: title, text: text });
      });
    });

    out.sort(function (x, y) { return x.time - y.time; });
    return out.slice(0, 120);
  }

  function syncReminders() {
    if (typeof Android === 'undefined' || !Android || !Android.syncReminders) return;
    try {
      Android.syncReminders(JSON.stringify(buildReminders()));
    } catch (e) {}
  }

  /* ---------------- 天气 ---------------- */

  var WMO = {
    0: ['☀️', '晴'],
    1: ['🌤️', '晴间多云'],
    2: ['⛅', '多云'],
    3: ['☁️', '阴'],
    45: ['🌫️', '雾'],
    48: ['🌫️', '雾'],
    51: ['🌦️', '毛毛雨'],
    53: ['🌦️', '毛毛雨'],
    55: ['🌦️', '毛毛雨'],
    56: ['🌧️', '冻雨'],
    57: ['🌧️', '冻雨'],
    61: ['🌧️', '小雨'],
    63: ['🌧️', '中雨'],
    65: ['🌧️', '大雨'],
    66: ['🌧️', '冻雨'],
    67: ['🌧️', '冻雨'],
    71: ['🌨️', '小雪'],
    73: ['🌨️', '中雪'],
    75: ['🌨️', '大雪'],
    77: ['🌨️', '雪粒'],
    80: ['🌦️', '阵雨'],
    81: ['🌦️', '阵雨'],
    82: ['⛈️', '强阵雨'],
    85: ['🌨️', '阵雪'],
    86: ['🌨️', '阵雪'],
    95: ['⛈️', '雷阵雨'],
    96: ['⛈️', '雷阵雨'],
    99: ['⛈️', '雷阵雨'],
  };

  function isRainCode(code) {
    return (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95;
  }

  function buildTip(d, humidity, hourlyPop) {
    if (!d || !d.time || d.time.length < 2) return '';

    var tmin = d.temperature_2m_min || [];
    var tmax = d.temperature_2m_max || [];
    var pop = d.precipitation_probability_max || [];
    var code = d.weather_code || [];

    var rainSoon = false;
    if (hourlyPop && hourlyPop.length) {
      rainSoon = Math.max.apply(null, hourlyPop) >= 60;
    }

    var rainToday = rainSoon || (isRainCode(code[0]) && (pop[0] || 0) >= 60);
    var rainTom = isRainCode(code[1]) || (pop[1] || 0) >= 50;
    var drop = (tmin[0] || 0) - (tmin[1] || 0);
    humidity = humidity || 0;

    if (rainToday) return '☔ 今天有雨，出门记得带伞';
    if (drop >= 4) return '🧥 明天降温 ' + Math.round(drop) + '°，记得加件衣服';
    if (rainTom) return '🌂 明天有雨，记得带伞';
    if ((tmax[1] || 0) >= 33) return '🧴 明天很热，注意防晒';
    if (humidity >= 85 && (tmin[0] || 0) >= 18) return '💧 湿度很大，注意除湿';
    if ((tmax[1] || 0) <= 5) return '🧣 明天很冷，穿厚一点';
    return '';
  }

  function renderWeather(w) {
    var el = $('#homeWeather');
    var tipEl = $('#homeTip');
    if (!w) {
      el.textContent = '';
      tipEl.textContent = '';
      return;
    }
    var m = WMO[w.code] || ['🌡️', ''];
    el.textContent = (db.profile.city || '') + ' · ' + Math.round(w.temp) + '° ' + m[1];
    tipEl.textContent = w.tip || '';
  }

  function loadWeather() {
    var city = (db.profile.city || '').trim();
    var el = $('#homeWeather');
    if (!city) {
      el.textContent = '';
      return;
    }

    var cached = db.weather;
    if (cached && cached.city === city && Date.now() - cached.ts < 3600000) {
      renderWeather(cached);
      return;
    }

    if (cached && cached.city === city) renderWeather(cached);
    else el.textContent = city + ' · 天气加载中';

    var geo = db.geo;
    var p;
    if (geo && geo.city === city) {
      p = Promise.resolve(geo);
    } else {
      p = fetch(
        'https://geocoding-api.open-meteo.com/v1/search?name=' +
          encodeURIComponent(city) +
          '&count=1&language=zh&format=json'
      )
        .then(function (r) { return r.json(); })
        .then(function (j) {
          var first = j.results && j.results[0];
          if (!first) throw new Error('no city');
          var g = { city: city, lat: first.latitude, lon: first.longitude };
          db.geo = g;
          saveDB();
          return g;
        });
    }

    p.then(function (g) {
      return fetch(
        'https://api.open-meteo.com/v1/forecast?latitude=' +
          g.lat +
          '&longitude=' +
          g.lon +
          '&current=temperature_2m,weather_code,relative_humidity_2m' +
          '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code' +
          '&hourly=precipitation_probability&forecast_hours=12' +
          '&forecast_days=3&timezone=auto'
      );
    })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var c = j.current || {};
        var w = {
          city: city,
          temp: c.temperature_2m,
          code: c.weather_code,
          tip: buildTip(
            j.daily,
            c.relative_humidity_2m,
            j.hourly && j.hourly.precipitation_probability
          ),
          ts: Date.now(),
        };
        db.weather = w;
        saveDB();
        renderWeather(w);
      })
      .catch(function () {
        if (db.weather && db.weather.city === city) renderWeather(db.weather);
        else el.textContent = '';
      });
  }

  /* ---------------- 定位 ---------------- */

  window.onNativeLocation = function (lat, lon) {
    fetch(
      'https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=' +
        lat +
        '&longitude=' +
        lon +
        '&localityLanguage=zh'
    )
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var city = j.city || j.locality || j.principalSubdivision || '';
        city = String(city).replace(/市$/, '');
        if (!city) throw new Error('no city');
        db.profile.city = city;
        saveDB();
        $('#inpCity').value = city;
        loadWeather();
        toast('定位到 ' + city);
      })
      .catch(function () {
        toast('定位到了，但没查到城市名');
      });
  };

  window.onNativeLocationFail = function () {
    toast('定位失败，可以手动填城市');
  };

  function autoLocate() {
    if (typeof Android !== 'undefined' && Android && Android.locate) {
      toast('正在定位…');
      Android.locate();
      return;
    }
    if (!navigator.geolocation) {
      toast('这个设备不支持定位');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      function (p) {
        window.onNativeLocation(p.coords.latitude, p.coords.longitude);
      },
      function () {
        toast('定位失败，可以手动填');
      },
      { timeout: 8000 }
    );
  }

  /* ---------------- 初始化 ---------------- */

  function init() {
    db = loadDB();

    if (!db) {
      db = {
        profile: {
          herName: '',
          myName: '',
          startDate: '2024-01-01',
          birthday: '2000-01-01',
          myBirthday: '2000-01-01',
          city: '北京',
        },
        anns: [],
      };
      $('#obStart').value = '2024-01-01';
      $('#onboard').classList.add('show');
    } else {
      if (!db.anns) db.anns = [];
      startApp();
    }

    document.addEventListener('change', function (e) {
      if (e.target && e.target.type === 'date') {
        e.target.classList.toggle('has-value', !!e.target.value);
      }
    });

    document.addEventListener('input', function (e) {
      if (e.target && e.target.type === 'date') {
        e.target.classList.toggle('has-value', !!e.target.value);
      }
    });

    bindEvents();
    preloadStickers();
    syncDateInputs();
  }

  function ensureNotify() {
    if (!db.profile.notify) db.profile.notify = {};
    var n = db.profile.notify;
    var bad = !n.token || /^your/i.test(n.token) || /curl/i.test(n.token);
    if (bad) {
      db.profile.notify = {
        provider: DEFAULT_NOTIFY.provider,
        token: DEFAULT_NOTIFY.token,
      };
      saveDB();
    }
  }

  function migrateProfile() {
    var changed = false;
    if (db.profile.birthday === '2000-11-08') {
      db.profile.birthday = '2000-01-01';
      changed = true;
    }
    if (db.profile.myBirthday === '2000-05-27') {
      db.profile.myBirthday = '2000-01-01';
      changed = true;
    }
    if (!db.profile.city) {
      db.profile.city = '北京';
      changed = true;
    }
    if (changed) saveDB();
  }

  function startApp() {
    $('#onboard').classList.remove('show');
    ensureNotify();
    migrateProfile();
    rebuildLovePool();
    fillProfileForm();
    renderMoodChips();
    renderHome();
    renderAnns();
    syncReminders();
    loadWeather();
  }

  function bindEvents() {
    $$('.tabbar button').forEach(function (b) {
      b.addEventListener('click', function () { switchTab(b.getAttribute('data-tab')); });
    });

    $('#btnMood').addEventListener('click', function () {
      $('#moodOverlay').classList.add('show');
    });

    $('#moodOverlay').addEventListener('click', function (e) {
      if (e.target === this) closeSheet('#moodOverlay');
    });

    $('#btnJustLook').addEventListener('click', showLove);

    $('#btnLoveNext').addEventListener('click', function () {
      var msg = $('#loveMsg');
      msg.style.opacity = '0';
      setTimeout(function () {
        msg.textContent = nextLoveLine();
        msg.style.opacity = '1';
        $('#loveSticker').src = STICKER_BASE + pickLoveSticker();
      }, 180);
    });

    $('#btnLoveClose').addEventListener('click', function () {
      closeSheet('#loveOverlay');
    });

    $('#loveOverlay').addEventListener('click', function (e) {
      if (e.target === this) closeSheet('#loveOverlay');
    });

    $('#homeSticker').addEventListener('click', function () {
      var img = $('#homeSticker');
      img.src = STICKER_BASE + pickHomeSticker();
      vibrate(10);

      if (!db.profile.seenTap) {
        db.profile.seenTap = true;
        saveDB();
      }
      var hint = $('#tapHint');
      if (hint) hint.style.display = 'none';

      clearTimeout(homeTapTimer);
      homeTapTimer = setTimeout(function () {
        setHomeSticker(stickerByTime());
      }, 2800);
    });

    $('#nextCard').addEventListener('click', function () { switchTab('days'); });

    $('#btnHug').addEventListener('click', function () {
      hearts();
      vibrate(30);
      $('#comfortSticker').src = STICKER_BASE + 'okay.gif';
      toast('抱一下吧');
    });

    $('#btnBreath').addEventListener('click', function () {
      $('#callOverlay').classList.add('show');
    });

    $('#btnCallNo').addEventListener('click', function () {
      closeSheet('#callOverlay');
      $('#breath').classList.add('show');
      runBreath();
    });

    $('#btnCallYes').addEventListener('click', function () {
      closeSheet('#callOverlay');
      var r = sendAlert(false);

      if (r === 'sent') {
        setTimeout(function () {
          $('#breath').classList.add('show');
          runBreath();
        }, 500);
        toast('已经告诉他了');
      } else if (r === 'cooldown') {
        toast('刚发过，等一分钟');
      } else {
        toast('还没设置通知方式，去「我们」里填一下');
        switchTab('me');
      }
    });

    $('#btnTestNotify').addEventListener('click', function () {
      var prov = $('#selProvider').value;
      var rawTok = $('#inpToken').value.trim();
      var tok = prov === 'custom' ? rawTok : cleanToken(rawTok, prov);
      if (/^your[_-]?key$/i.test(tok) || /^your[_-]/i.test(tok)) {
        toast('这是示例里的 YOUR_KEY，要换成你自己的');
        return;
      }
      db.profile.notify = { provider: prov, token: tok };
      $('#inpToken').value = tok;
      saveDB();

      var url = alertUrl(true);
      if (!url) {
        toast('先填密钥');
        return;
      }
      sendAlert(true);
      $('#testMsg').textContent =
        '已发出。10 秒内手机没响，就把下面这条链接贴到浏览器地址栏打开，看返回什么。';
      $('#testUrl').textContent = url;
      $('#testOverlay').classList.add('show');
    });

    Array.prototype.forEach.call(document.querySelectorAll('.city-chip'), function (b) {
      b.addEventListener('click', function () {
        var c = b.getAttribute('data-city');
        db.profile.city = c;
        db.weather = null;
        saveDB();
        $('#inpCity').value = c;
        loadWeather();
        toast('已切换到 ' + c);
      });
    });

    $('#btnLocate').addEventListener('click', autoLocate);

    $('#btnTestReminder').addEventListener('click', function () {      if (typeof Android !== 'undefined' && Android && Android.testNotification) {
        Android.testNotification('小狗窝提醒', '能看到这条，说明通知权限和渠道都正常。');
        toast('已发出，看看通知栏');
      } else {
        toast('这个只能在手机上测');
      }
    });

    $('#btnCloseTest').addEventListener('click', function () {
      closeSheet('#testOverlay');
    });

    $('#btnStopBreath').addEventListener('click', stopBreath);

    $('#btnCloseComfort').addEventListener('click', function () {
      $('#comfort').classList.remove('show');
    });

    $('#btnAddAnn').addEventListener('click', function () {
      $('#inpAnnTitle').value = '';
      $('#inpAnnDate').value = '';
      $('#inpAnnYearly').checked = true;
      $('#addOverlay').classList.add('show');
    });

    $('#btnCancelAnn').addEventListener('click', function () { closeSheet('#addOverlay'); });

    $('#addOverlay').addEventListener('click', function (e) {
      if (e.target === this) closeSheet('#addOverlay');
    });

    $('#btnSaveAnn').addEventListener('click', function () {
      var title = $('#inpAnnTitle').value.trim();
      var date = $('#inpAnnDate').value;
      if (!title || !date) { toast('名字和日期都要填'); return; }
      db.anns.push({ id: uid(), title: title, date: date, yearly: $('#inpAnnYearly').checked });
      saveDB();
      closeSheet('#addOverlay');
      renderAnns();
      renderHome();
      syncReminders();
      toast('记下了');
    });

    $('#btnSave').addEventListener('click', function () {
      db.profile.herName = $('#inpHerName').value.trim();
      db.profile.myName = $('#inpMyName').value.trim();
      db.profile.startDate = $('#inpStart').value;
      db.profile.birthday = $('#inpBirthday').value;
      db.profile.myBirthday = $('#inpMyBirthday').value;
      db.profile.city = $('#inpCity').value.trim();
      db.profile.showSince = $('#inpShowSince').checked;
      db.profile.notify = {
        provider: $('#selProvider').value,
        token:
          $('#selProvider').value === 'custom'
            ? $('#inpToken').value.trim()
            : cleanToken($('#inpToken').value, $('#selProvider').value),
      };
      $('#inpToken').value = db.profile.notify.token;
      db.profile.customLines = $('#inpCustomLines').value || '';
      rebuildLovePool();

      if (!db.anns) db.anns = [];

      saveDB();
      renderHome();
      renderAnns();
      syncReminders();
      loadWeather();
      toast('保存好了');
    });

    $('#btnOnboard').addEventListener('click', function () {
      var name = $('#obHerName').value.trim() || '宝宝';
      var start = $('#obStart').value;
      db.profile.herName = name;
      db.profile.startDate = start || ymd(todayStart());
      db.anns = [];
      saveDB();
      startApp();
      toast('欢迎回家');
    });

    // 每天第一次打开时，换一句
    var today = ymd(todayStart());
    if (db && db.lastOpen !== today) {
      db.lastOpen = today;
      if (loadDB()) saveDB();
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();

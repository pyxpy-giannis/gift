/* 日子规则引擎：自动生成纪念日、里程碑、节日 */
(function (global) {
  'use strict';

  var ICONS = {
    love: '💗',
    milestone: '✨',
    birthday: '🎂',
    newyear: '🎆',
    spring: '🧧',
    qingming: '🌿',
    dragon: '🎏',
    children: '🎈',
    halloween: '🎃',
    christmas: '🎄',
    custom: '📌',
  };

  var TYPE_LABEL = {
    anniversary: '周年',
    milestone: '里程碑',
    birthday: '生日',
    festival: '节日',
    custom: '自定义',
  };

  function pad(n) {
    return ('0' + n).slice(-2);
  }

  function ymd(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function parseDate(s) {
    if (!s) return null;
    var p = String(s).split('-').map(Number);
    if (p.length !== 3 || !p[0]) return null;
    return new Date(p[0], p[1] - 1, p[2]);
  }

  function todayStart() {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function addDays(d, n) {
    var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() + n);
    return x;
  }

  // 清明：21 世纪通用公式，4 月 4/5 日
  function qingmingDay(year) {
    var y = year % 100;
    return Math.floor(y * 0.2422 + 4.81) - Math.floor(y / 4);
  }

  function lunarDate(year, month, day) {
    try {
      if (!global.solarLunar || !global.solarLunar.lunar2solar) return null;
      var c = global.solarLunar.lunar2solar(year, month, day, false);
      if (!c) return null;
      return new Date(c.cYear, c.cMonth - 1, c.cDay);
    } catch (e) {
      return null;
    }
  }

  function all(profile, customAnns, limitDays) {
    profile = profile || {};
    var start = parseDate(profile.startDate);
    var today = todayStart();
    var list = [];
    var y0 = today.getFullYear();
    var years = [y0, y0 + 1, y0 + 2];
    var limit = addDays(today, limitDays || 183);

    function push(item) {
      if (!item.date) return;
      var d = new Date(item.date.getFullYear(), item.date.getMonth(), item.date.getDate());
      if (d.getTime() < today.getTime()) return;
      // 自动生成的日子只看半年内；手动添加的不受限
      if (item.type !== 'custom' && d.getTime() > limit.getTime()) return;
      list.push({
        key: item.type + '|' + ymd(d) + '|' + item.title,
        title: item.title,
        date: d,
        icon: item.icon || 'custom',
        type: item.type,
        advance: item.advance || 0,
        customId: item.customId || null,
      });
    }

    // 在一起周年
    if (start) {
      years.forEach(function (y) {
        var n = y - start.getFullYear();
        if (n <= 0) return;
        push({
          type: 'anniversary',
          title: '在一起 ' + n + ' 周年',
          date: new Date(y, start.getMonth(), start.getDate()),
          icon: 'love',
          advance: 1,
        });
      });
    }

    // 每 100 天 + 特殊数字
    if (start) {
      var marks = {};
      for (var n = 100; n <= 6000; n += 100) marks[n] = true;
      [520, 666, 888, 999, 1314, 1500, 2025, 2500, 3000].forEach(function (x) {
        marks[x] = true;
      });

      Object.keys(marks)
        .map(Number)
        .sort(function (a, b) { return a - b; })
        .forEach(function (k) {
          var d = addDays(start, k - 1);
          if (d.getTime() < today.getTime()) return;
          if (d.getTime() > addDays(today, 800).getTime()) return;
          push({
            type: 'milestone',
            title: '在一起第 ' + k + ' 天',
            date: d,
            icon: 'milestone',
            advance: 1,
          });
        });
    }

    // 生日
    years.forEach(function (y) {
      var b = parseDate(profile.birthday);
      if (b) {
        push({
          type: 'birthday',
          title: (profile.herName || '你') + '的生日',
          date: new Date(y, b.getMonth(), b.getDate()),
          icon: 'birthday',
          advance: 1,
        });
      }
      var mb = parseDate(profile.myBirthday);
      if (mb) {
        push({
          type: 'birthday',
          title: (profile.myName || '他') + '的生日',
          date: new Date(y, mb.getMonth(), mb.getDate()),
          icon: 'birthday',
          advance: 1,
        });
      }
    });

    // 节日
    years.forEach(function (y) {
      push({ type: 'festival', title: '元旦', date: new Date(y, 0, 1), icon: 'newyear' });
      push({ type: 'festival', title: '儿童节', date: new Date(y, 5, 1), icon: 'children' });
      push({ type: 'festival', title: '万圣节', date: new Date(y, 9, 31), icon: 'halloween' });
      push({ type: 'festival', title: '圣诞节', date: new Date(y, 11, 25), icon: 'christmas' });
      push({ type: 'festival', title: '清明', date: new Date(y, 3, qingmingDay(y)), icon: 'qingming' });

      var spring = lunarDate(y, 1, 1);
      if (spring) push({ type: 'festival', title: '春节', date: spring, icon: 'spring', advance: 1 });

      var dragon = lunarDate(y, 5, 5);
      if (dragon) push({ type: 'festival', title: '端午', date: dragon, icon: 'dragon' });
    });

    // 自定义
    (customAnns || []).forEach(function (a) {
      var base = parseDate(a.date);
      if (!base) return;
      if (a.yearly) {
        years.forEach(function (y) {
          push({
            type: 'custom',
            title: a.title,
            date: new Date(y, base.getMonth(), base.getDate()),
            icon: 'custom',
            advance: 1,
            customId: a.id,
          });
        });
      } else {
        push({
          type: 'custom',
          title: a.title,
          date: base,
          icon: 'custom',
          advance: 1,
          customId: a.id,
        });
      }
    });

    list.sort(function (a, b) {
      if (a.date.getTime() === b.date.getTime()) return a.type < b.type ? -1 : 1;
      return a.date - b.date;
    });

    return list;
  }

  global.DogEvents = {
    all: all,
    ICONS: ICONS,
    TYPE_LABEL: TYPE_LABEL,
    ymd: ymd,
    parseDate: parseDate,
    todayStart: todayStart,
    addDays: addDays,
    qingmingDay: qingmingDay,
  };
})(window);

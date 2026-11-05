/* 旅行足迹 · 点亮地图 */
(function () {
  'use strict';

  const STORAGE_KEY = 'travelmap.v1';
  const PHOTO_MAX_EDGE = 800;
  const PHOTO_QUALITY = 0.72;
  const PHOTO_MAX_BYTES = 1800 * 1024;
  const NOTE_MAX = 80;

  const MapAPI = window.MapPath;
  const CityAPI = window.TravelCities;
  if (!MapAPI || !CityAPI || !document.getElementById('chinaMap')) return;

  const CITIES = CityAPI.CITIES;
  // 新城市库只导出了 CITIES，这里补一个按名字索引的表
  const CITY_MAP = CityAPI.CITY_MAP || CITIES.reduce(function (map, city) {
    map[city.name] = city;
    return map;
  }, {});
  const GUANGZHOU_SPOT_INFO = CityAPI.GUANGZHOU_SPOT_INFO || [];
  const CITY_REGIONS = (window.CityRegions && window.CityRegions.CITY_REGIONS) || {};
  const CITY_PAGES = (window.CityPages && window.CityPages.CITY_PAGES) || {};
  const SPOT_LIBRARY = (window.TravelSpots && window.TravelSpots.CITY_SPOT_LIBRARY) || {};
  const SPOT_COORDS = window.SpotCoords || {};
  const ZOOM_MIN = 1;
  const ZOOM_MAX = 4;
  const MAP_VIEWBOX = MapAPI.MAP_VIEWBOX;
  const MAP_HINT_ICON = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 21s6.2-5.5 6.2-11A6.2 6.2 0 0 0 5.8 10c0 5.5 6.2 11 6.2 11Z" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="9.8" r="2.1" fill="currentColor"/></svg>';

  const ICONS = {
    pin: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 21s6.2-5.5 6.2-11A6.2 6.2 0 0 0 5.8 10c0 5.5 6.2 11 6.2 11Z" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="9.8" r="2.1" fill="currentColor"/></svg>',
    camera: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4.5 8.5h3l1.3-2h6.4l1.3 2h3A1.5 1.5 0 0 1 21 10v7.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5V10a1.5 1.5 0 0 1 1.5-1.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="12" cy="13.3" r="3.4" stroke="currentColor" stroke-width="1.5"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m9 6 6 6-6 6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  const els = {
    app: document.getElementById('app'),
    appScroll: document.getElementById('appScroll'),
    statCities: document.getElementById('statCities'),
    statVisits: document.getElementById('statVisits'),
    statFirst: document.getElementById('statFirst'),
    tabMap: document.getElementById('tabMap'),
    tabList: document.getElementById('tabList'),
    viewSwitch: document.querySelector('.view-switch'),
    viewThumb: document.getElementById('viewThumb'),
    mapView: document.getElementById('mapView'),
    listView: document.getElementById('listView'),
    mapStage: document.getElementById('mapStage'),
    mapPickBanner: document.getElementById('mapPickBanner'),
    mapPickCancel: document.getElementById('mapPickCancel'),
    mapPickMarker: document.getElementById('mapPickMarker'),
    mapKicker: document.getElementById('mapKicker'),
    mapTitle: document.getElementById('mapTitle'),
    mapLegend: document.getElementById('mapLegend'),
    mapHint: document.getElementById('mapHint'),
    mapCount: document.getElementById('mapCount'),
    mapPrev: document.getElementById('mapPrev'),
    mapNext: document.getElementById('mapNext'),
    mapPagerBar: document.getElementById('mapPagerBar'),
    mapPagerStrip: document.getElementById('mapPagerStrip'),
    provinceLayer: document.getElementById('provinceLayer'),
    cityLayer: document.getElementById('cityLayer'),
    cityLabels: document.getElementById('cityLabels'),
    mapEmpty: document.getElementById('mapEmpty'),
    cityMapPage: document.getElementById('cityMapPage'),
    cityMapCanvas: document.getElementById('cityMapCanvas'),
    cityMapSvg: document.getElementById('cityMapSvg'),
    cityDistrictLabels: document.getElementById('cityDistrictLabels'),
    cityPins: document.getElementById('cityPins'),
    citySpotLabels: document.getElementById('citySpotLabels'),
    citySpotInfo: document.getElementById('citySpotInfo'),
    citySpotLegend: document.getElementById('citySpotLegend'),
    cityZoomIn: document.getElementById('cityZoomIn'),
    cityZoomOut: document.getElementById('cityZoomOut'),
    cityZoomReset: document.getElementById('cityZoomReset'),
    cityRealMapToggle: document.getElementById('cityRealMapToggle'),
    btnCityAddSpot: document.getElementById('btnCityAddSpot'),
    realMap: document.getElementById('realMap'),
    cityMapFallback: document.getElementById('cityMapFallback'),
    cityFallbackTitle: document.getElementById('cityFallbackTitle'),
    cityFallbackSpots: document.getElementById('cityFallbackSpots'),
    cityMapRetry: document.getElementById('cityMapRetry'),
    btnCityMapDetail: document.getElementById('btnCityMapDetail'),
    recentList: document.getElementById('recentList'),
    recentEmpty: document.getElementById('recentEmpty'),
    cityList: document.getElementById('cityList'),
    listEmpty: document.getElementById('listEmpty'),
    listCount: document.getElementById('listCount'),
    btnSeeAll: document.getElementById('btnSeeAll'),
    btnAddCity: document.getElementById('btnAddCity'),
    btnEmptyAdd: document.getElementById('btnEmptyAdd'),
    btnMapDataInfo: document.getElementById('btnMapDataInfo'),
    btnMapDataInfoTop: document.getElementById('btnMapDataInfoTop'),

    addCityModal: document.getElementById('addCityModal'),
    mapDataModal: document.getElementById('mapDataModal'),
    btnReloadMapData: document.getElementById('btnReloadMapData'),
    citySearch: document.getElementById('citySearch'),
    citySuggestions: document.getElementById('citySuggestions'),
    coordCard: document.getElementById('coordCard'),
    coordCity: document.getElementById('coordCity'),
    coordText: document.getElementById('coordText'),
    coordTag: document.getElementById('coordTag'),
    manualBox: document.getElementById('manualBox'),
    manualName: document.getElementById('manualName'),
    manualLng: document.getElementById('manualLng'),
    manualLat: document.getElementById('manualLat'),
    cityFormError: document.getElementById('cityFormError'),
    btnConfirmCity: document.getElementById('btnConfirmCity'),
    btnMapPick: document.getElementById('btnMapPick'),

    cityModal: document.getElementById('cityModal'),
    detailName: document.getElementById('detailName'),
    detailMeta: document.getElementById('detailMeta'),
    detailVisitCount: document.getElementById('detailVisitCount'),
    detailSpotCount: document.getElementById('detailSpotCount'),
    detailFirst: document.getElementById('detailFirst'),
    spotAtlas: document.getElementById('spotAtlas'),
    spotAtlasCount: document.getElementById('spotAtlasCount'),
    spotAtlasList: document.getElementById('spotAtlasList'),
    spotFilterWrap: document.getElementById('spotFilterWrap'),
    spotFilterHint: document.getElementById('spotFilterHint'),
    spotChips: document.getElementById('spotChips'),
    visitsList: document.getElementById('visitsList'),
    cityEmpty: document.getElementById('cityEmpty'),
    btnAddVisit: document.getElementById('btnAddVisit'),
    btnCityEmptyAdd: document.getElementById('btnCityEmptyAdd'),
    btnRemoveCity: document.getElementById('btnRemoveCity'),
    detailBody: document.querySelector('.detail-sheet .sheet-body'),

    visitModal: document.getElementById('visitModal'),
    visitCityLabel: document.getElementById('visitCityLabel'),
    visitDate: document.getElementById('visitDate'),
    photoInput: document.getElementById('photoInput'),
    photoPicker: document.getElementById('photoPicker'),
    photoPlaceholder: document.getElementById('photoPlaceholder'),
    photoPreview: document.getElementById('photoPreview'),
    photoReplace: document.getElementById('photoReplace'),
    photoState: document.getElementById('photoState'),
    visitNote: document.getElementById('visitNote'),
    noteCount: document.getElementById('noteCount'),
    visitSpot: document.getElementById('visitSpot'),
    customSpot: document.getElementById('customSpot'),
    btnSpotSearch: document.getElementById('btnSpotSearch'),
    spotSearchResults: document.getElementById('spotSearchResults'),
    spotSearchHint: document.getElementById('spotSearchHint'),
    btnSpotPickMap: document.getElementById('btnSpotPickMap'),
    batchSpotInput: document.getElementById('batchSpotInput'),
    btnBatchSpot: document.getElementById('btnBatchSpot'),
    batchSpotHint: document.getElementById('batchSpotHint'),
    spotPickBanner: document.getElementById('spotPickBanner'),
    spotPickText: document.getElementById('spotPickText'),
    spotPickCancel: document.getElementById('spotPickCancel'),
    spotHint: document.getElementById('spotHint'),
    spotLocationFields: document.getElementById('spotLocationFields'),
    spotArea: document.getElementById('spotArea'),
    spotAddress: document.getElementById('spotAddress'),
    visitFormError: document.getElementById('visitFormError'),
    btnSaveVisit: document.getElementById('btnSaveVisit'),
    btnQuickMark: document.getElementById('btnQuickMark'),
    visitTitle: document.getElementById('visitTitle'),
    toast: document.getElementById('toast')
  };

  const state = {
    data: emptyData(),
    view: 'map',
    activeCity: null,
    spotFilter: 'all',
    pendingPhoto: null,
    isCompressing: false,
    isSaving: false,
    photoToken: 0,
    toastTimer: null,
    labelFrame: 0,
    selectedCity: null,
    citySuggestions: [],
    suggestionIndex: -1,
    pagerCity: null,
    activePin: 0,
    swipeStart: null,
    panState: null,
    panJustMoved: false,
    cityZoom: 1,
    cityPanX: 0,
    cityPanY: 0,
    pinchState: null,
    realMapActive: false,
    realMapInstance: null,
    realMapMarkerLayer: null,
    realMapProvider: 'amap',
    mapFallbackActive: false,
    mapTileTimer: 0,
    mapPickMode: false,
    openVisitAfterAdd: false,
    pendingSpotCoords: null,
    spotSearchResults: [],
    spotOnlyMode: false,
    spotPickMode: false,
    spotPickDraft: null
  };

  const modalFocus = {};
  let loadError = false;

  /* ---------- data ---------- */

  function emptyData() {
    return { version: 1, cities: {} };
  }

  function makeId(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
  }

  function normalizeData(raw) {
    const out = emptyData();
    if (!raw || typeof raw !== 'object' || !raw.cities || typeof raw.cities !== 'object') return out;
    Object.keys(raw.cities).forEach(function (key) {
      const source = raw.cities[key];
      if (!source || typeof source !== 'object') return;
      const name = String(key).trim().slice(0, 12);
      if (!name || isUnsafeCityName(name)) return;
      const lng = Number(source.lng);
      const lat = Number(source.lat);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
      if (lng < MapAPI.MAP_BOUNDS.minLng || lng > MapAPI.MAP_BOUNDS.maxLng) return;
      if (lat < MapAPI.MAP_BOUNDS.minLat || lat > MapAPI.MAP_BOUNDS.maxLat) return;
      const visits = Array.isArray(source.visits) ? source.visits.map(normalizeVisit).filter(Boolean) : [];
      visits.sort(compareVisits);
      const spots = Array.isArray(source.spots) ? uniqueStrings(source.spots) : [];
      out.cities[name] = {
        name: name,
        lng: lng,
        lat: lat,
        province: typeof source.province === 'string' ? source.province.slice(0, 20) : '',
        spots: spots,
        spotInfo: normalizeSpotInfo(source.spotInfo),
        visits: visits
      };
    });
    return out;
  }

  function normalizeVisit(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const date = typeof raw.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.date) ? raw.date : '';
    if (!date) return null;
    const photo = typeof raw.photo === 'string' && raw.photo.indexOf('data:image/') === 0 ? raw.photo : '';
    return {
      id: typeof raw.id === 'string' && raw.id ? raw.id : makeId('v'),
      date: date,
      photo: photo,
      note: typeof raw.note === 'string' ? raw.note.slice(0, NOTE_MAX) : '',
      spot: typeof raw.spot === 'string' ? raw.spot.slice(0, 20) : '',
      createdAt: Number.isFinite(Number(raw.createdAt)) ? Number(raw.createdAt) : 0
    };
  }

  function normalizeSpotInfo(raw) {
    if (!Array.isArray(raw)) return [];
    const seen = Object.create(null);
    const out = [];
    raw.forEach(function (item) {
      if (!item || typeof item !== 'object') return;
      const name = typeof item.name === 'string' ? item.name.trim().slice(0, 20) : '';
      if (!name || seen[name]) return;
      const area = typeof item.area === 'string' ? item.area.trim().slice(0, 20) : '';
      const address = typeof item.address === 'string' ? item.address.trim().slice(0, 40) : '';
      const lat = Number(item.lat);
      const lng = Number(item.lng);
      const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) &&
        lat >= MapAPI.MAP_BOUNDS.minLat && lat <= MapAPI.MAP_BOUNDS.maxLat &&
        lng >= MapAPI.MAP_BOUNDS.minLng && lng <= MapAPI.MAP_BOUNDS.maxLng;
      if (!area && !address && !hasCoords) return;
      seen[name] = true;
      const entry = { name: name, area: area, address: address };
      if (hasCoords) {
        entry.lat = lat;
        entry.lng = lng;
      }
      out.push(entry);
    });
    return out;
  }

  function isUnsafeCityName(name) {
    return Object.prototype.hasOwnProperty.call(Object.prototype, name);
  }

  function uniqueStrings(list) {
    const seen = Object.create(null);
    const out = [];
    list.forEach(function (item) {
      if (typeof item !== 'string') return;
      const value = item.trim().slice(0, 20);
      if (!value || seen[value]) return;
      seen[value] = true;
      out.push(value);
    });
    return out;
  }

  function loadData() {
    try {
      const seed = window.TRAVEL_SEED;
      const seedVersion = seed ? Number(seed.version) || 1 : 0;
      const raw = localStorage.getItem(STORAGE_KEY);

      if (raw) {
        const parsed = JSON.parse(raw);
        const storedVersion = Number(parsed.seedVersion) || 0;

        // 安装包里的种子版本更新时，覆盖一次旧数据；之后本地修改不会再被动
        if (seed && seedVersion > storedVersion) {
          const seeded = normalizeData(seed);
          seeded.seedVersion = seedVersion;
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
          } catch (e) {}
          return seeded;
        }

        const data = normalizeData(parsed);
        data.seedVersion = storedVersion;
        return data;
      }

      if (seed) {
        const seeded = normalizeData(seed);
        seeded.seedVersion = seedVersion;
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
        } catch (e) {}
        return seeded;
      }

      return emptyData();
    } catch (error) {
      loadError = true;
      return emptyData();
    }
  }

  function persist() {
    let bytes = 0;
    try {
      const json = JSON.stringify(state.data);
      bytes = json.length;
      localStorage.setItem(STORAGE_KEY, json);
      return { ok: true, bytes: bytes };
    } catch (error) {
      return { ok: false, bytes: bytes, error: error };
    }
  }

  /* ---------- lookup ---------- */

  function getVisits(name) {
    return state.data.cities[name] ? state.data.cities[name].visits : [];
  }

  function getCityMeta(name) {
    const stored = state.data.cities[name];
    if (stored) {
      const known = CITY_MAP[name];
      return {
        name: stored.name,
        lng: stored.lng,
        lat: stored.lat,
        province: stored.province || (known ? known.province : '自定义')
      };
    }
    if (CITY_MAP[name]) return CITY_MAP[name];
    return null;
  }

  function presetSpotRecords(name) {
    const base = name === '广州' ? GUANGZHOU_SPOT_INFO : [];
    const extra = SPOT_LIBRARY[name] || [];
    const seen = Object.create(null);
    const out = [];
    base.concat(extra).forEach(function (spot) {
      if (!spot || !spot.name || seen[spot.name]) return;
      seen[spot.name] = true;
      out.push(spot);
    });
    return out;
  }

  function presetSpots(name) {
    return presetSpotRecords(name).map(function (spot) { return spot.name; });
  }

  function getSpotsForCity(name) {
    const stored = state.data.cities[name];
    return uniqueStrings(presetSpots(name).concat(stored ? stored.spots : []));
  }

  function getPresetSpotInfo(cityName, spotName) {
    const match = presetSpotRecords(cityName).find(function (spot) { return spot.name === spotName; });
    return match ? { name: match.name, area: match.area, address: match.address, preset: true } : null;
  }

  function getSpotInfo(cityName, spotName) {
    const stored = state.data.cities[cityName];
    if (stored && Array.isArray(stored.spotInfo)) {
      const match = stored.spotInfo.find(function (spot) { return spot.name === spotName; });
      if (match) {
        return {
          name: match.name,
          area: match.area,
          address: match.address,
          lat: match.lat,
          lng: match.lng,
          preset: !!getPresetSpotInfo(cityName, spotName)
        };
      }
    }
    return getPresetSpotInfo(cityName, spotName);
  }

  function getSpotDirectory(cityName) {
    const stored = state.data.cities[cityName];
    const visitSpots = getVisits(cityName).map(function (visit) { return visit.spot; }).filter(Boolean);
    const names = uniqueStrings(getSpotsForCity(cityName).concat(visitSpots));
    return names.map(function (spotName) {
      const info = getSpotInfo(cityName, spotName) || { area: '', address: '' };
      const visits = getVisits(cityName).filter(function (visit) { return visit.spot === spotName; });
      return {
        name: spotName,
        area: info.area || '',
        address: info.address || '',
        preset: !!getPresetSpotInfo(cityName, spotName),
        visits: visits,
        visited: visits.length > 0
      };
    });
  }

  function getAllMapCities() {
    const map = Object.create(null);
    CITIES.forEach(function (city) {
      map[city.name] = {
        name: city.name,
        province: city.province,
        lng: city.lng,
        lat: city.lat,
        builtin: true
      };
    });
    Object.keys(state.data.cities).forEach(function (name) {
      const city = state.data.cities[name];
      map[name] = {
        name: name,
        province: city.province || '自定义',
        lng: city.lng,
        lat: city.lat,
        builtin: !!CITY_MAP[name]
      };
    });
    return Object.keys(map).map(function (key) { return map[key]; });
  }

  function litCities() {
    return Object.keys(state.data.cities)
      .map(function (name) { return state.data.cities[name]; })
      .filter(function (city) { return city.visits.length > 0; });
  }

  function latestVisit(city) {
    if (!city || !city.visits.length) return null;
    return city.visits.slice().sort(compareVisits)[0];
  }

  function allVisitRecords() {
    const records = [];
    litCities().forEach(function (city) {
      city.visits.forEach(function (visit) {
        records.push({ city: city, visit: visit });
      });
    });
    return records.sort(function (a, b) {
      const byDate = b.visit.date.localeCompare(a.visit.date);
      if (byDate) return byDate;
      return (b.visit.createdAt || 0) - (a.visit.createdAt || 0);
    });
  }

  function firstVisitDate() {
    let first = '';
    allVisitRecords().forEach(function (record) {
      if (!first || record.visit.date < first) first = record.visit.date;
    });
    return first;
  }

  function compareVisits(a, b) {
    const byDate = String(b.date || '').localeCompare(String(a.date || ''));
    if (byDate) return byDate;
    return (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0);
  }

  /* ---------- formatting ---------- */

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  function formatDate(date) {
    if (!date) return '—';
    return String(date).replace(/-/g, '.');
  }

  function pad2(value) {
    return String(value).padStart(2, '0');
  }

  function formatDateCN(date) {
    if (!date) return '—';
    const parts = String(date).split('-');
    return parts[0] + '年' + Number(parts[1]) + '月' + Number(parts[2]) + '日';
  }

  function formatCoords(lng, lat) {
    return Math.abs(Number(lat)).toFixed(4) + '°N, ' + Math.abs(Number(lng)).toFixed(4) + '°E';
  }

  function todayISO() {
    const now = new Date();
    return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  }

  function formatBytes(bytes) {
    if (!bytes) return '0 KB';
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return Math.max(1, Math.round(bytes / 1024)) + ' KB';
  }

  function hashString(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (h * 31 + str.charCodeAt(i)) >>> 0;
    }
    return h;
  }

  // 没有照片时，按城市名生成一张插画封面
  function cityCover(city) {
    if (!city) return '';
    const h = hashString(city);
    const hue = h % 360;
    const hue2 = (hue + 38) % 360;
    const sunX = 70 + (h % 240);
    const sunY = 62 + (h % 26);

    let skyline = '';
    for (let layer = 0; layer < 3; layer++) {
      const light = 70 - layer * 12;
      const color = 'hsl(' + hue2 + ',32%,' + light + '%)';
      const base = 205 + layer * 24;
      let x = -20;
      for (let i = 0; i < 14; i++) {
        const w = 16 + ((h >> ((layer * 4 + i) % 20)) % 36);
        const bh = 28 + ((h >> ((i + layer * 3) % 20)) % 74) - layer * 6;
        skyline +=
          '<rect x="' + x + '" y="' + (base - bh) + '" width="' + w +
          '" height="' + (bh + 50) + '" fill="' + color + '" rx="2"/>';
        x += w + 5;
        if (x > 420) break;
      }
    }

    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">' +
      '<defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="hsl(' + hue + ',58%,89%)"/>' +
      '<stop offset="1" stop-color="hsl(' + hue2 + ',52%,74%)"/>' +
      '</linearGradient></defs>' +
      '<rect width="400" height="300" fill="url(#sg)"/>' +
      '<circle cx="' + sunX + '" cy="' + sunY + '" r="24" fill="#FFF5DC" opacity=".95"/>' +
      skyline +
      '<text x="200" y="276" text-anchor="middle" font-family="PingFang SC, Microsoft YaHei, sans-serif" ' +
      'font-size="17" fill="#FFFFFF" opacity=".92">' + esc(city) + '</text>' +
      '</svg>';

    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function photoMarkup(photo, alt, city) {
    if (typeof photo === 'string' && photo.indexOf('data:image/') === 0) {
      return '<img src="' + esc(photo) + '" alt="' + esc(alt) + '" loading="lazy" />';
    }
    if (city) {
      return '<img class="city-cover" src="' + cityCover(city) + '" alt="' + esc(alt) + '" loading="lazy" />';
    }
    return '<span class="photo-fallback">' + ICONS.camera + '</span>';
  }

  function showToast(message) {
    if (!message) return;
    window.clearTimeout(state.toastTimer);
    els.toast.textContent = message;
    els.toast.hidden = false;
    state.toastTimer = window.setTimeout(function () {
      els.toast.hidden = true;
    }, 2800);
  }

  /* ---------- render ---------- */

  function renderAll() {
    renderStats();
    renderMap();
    renderPager();
    renderRecent();
    renderList();
    if (state.activeCity) renderCityDetail();
  }

  function renderStats() {
    const cities = litCities();
    const visits = allVisitRecords();
    const first = firstVisitDate();
    els.statCities.textContent = String(cities.length);
    els.statVisits.textContent = String(visits.length);
    if (first) {
      els.statFirst.textContent = formatDate(first);
      els.statFirst.classList.remove('is-empty');
    } else {
      els.statFirst.textContent = '—';
      els.statFirst.classList.add('is-empty');
    }

    const summary = document.getElementById('heroSummary');
    if (summary) {
      if (!cities.length) {
        summary.textContent = '还没有记录，去过的城市会慢慢亮起来。';
      } else {
        summary.textContent =
          cities.length + ' 座城市 · ' + visits.length + ' 次到访' +
          (first ? ' · 从 ' + formatDate(first) + ' 开始' : '');
      }
    }
  }

  function renderProvincePaths() {
    els.provinceLayer.innerHTML = MapAPI.CHINA_PROVINCES.map(function (province) {
      return '<path class="province" d="' + province.d + '" fill-rule="evenodd"></path>';
    }).join('');
  }

  function renderMap() {
    const cities = getAllMapCities();
    const baseParts = [];
    const activeParts = [];

    cities.forEach(function (city, index) {
      const visits = getVisits(city.name);
      const count = visits.length;
      const stored = !!state.data.cities[city.name];
      const region = CITY_REGIONS[city.name];
      const safeName = esc(city.name);

      if (region) {
        const d = region.d;
        if (count > 0) {
          activeParts.push('<g class="city-region is-lit" data-city="' + safeName + '" role="button" tabindex="0" aria-label="' +
            esc(city.name + '，去过 ' + count + ' 次，点击翻页查看城市大地图') + '">' +
            '<path class="region-glow" d="' + d + '" fill-rule="evenodd"></path>' +
            '<path class="region-fill" d="' + d + '" fill-rule="evenodd"></path>' +
            '</g>');
        } else if (stored) {
          activeParts.push('<g class="city-region is-pending" data-city="' + safeName + '" role="button" tabindex="0" aria-label="' +
            esc(city.name + '，已经添加但还没有到访，点击继续记录') + '">' +
            '<path class="region-pending" d="' + d + '" fill-rule="evenodd"></path>' +
            '</g>');
        } else {
          baseParts.push('<path class="region-base" d="' + d + '" fill-rule="evenodd"></path>');
        }
        return;
      }

      const point = MapAPI.projectLngLat(city.lng, city.lat);
      if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
      const cx = point.x.toFixed(1);
      const cy = point.y.toFixed(1);
      if (count > 0) {
        activeParts.push('<g class="city-node is-lit" data-city="' + safeName + '" role="button" tabindex="0" aria-label="' +
          esc(city.name + '，去过 ' + count + ' 次，点击翻页查看城市大地图') + '">' +
          '<circle class="city-hit" cx="' + cx + '" cy="' + cy + '" r="38"></circle>' +
          '<circle class="city-glow" cx="' + cx + '" cy="' + cy + '" r="30"></circle>' +
          '<circle class="city-ring" cx="' + cx + '" cy="' + cy + '" r="16" style="animation-delay:-' + (index % 8) * 0.33 + 's"></circle>' +
          '<circle class="city-core" cx="' + cx + '" cy="' + cy + '" r="13.5"></circle>' +
          '</g>');
      } else if (stored) {
        activeParts.push('<g class="city-node is-pending" data-city="' + safeName + '" role="button" tabindex="0" aria-label="' +
          esc(city.name + '，已经添加但还没有到访，点击继续记录') + '">' +
          '<circle class="city-hit" cx="' + cx + '" cy="' + cy + '" r="30"></circle>' +
          '<circle class="city-pending-ring" cx="' + cx + '" cy="' + cy + '" r="9.5"></circle>' +
          '<circle class="city-pending-core" cx="' + cx + '" cy="' + cy + '" r="4.5"></circle>' +
          '</g>');
      } else {
        // 没有行政区边界的城市不画灰点：全国有 340+ 个，画出来会糊成一片。
        // 需要添加时用搜索或地图选点，添加后会显示粉色圆点。
      }
    });

    els.cityLayer.innerHTML = baseParts.join('') + activeParts.join('');
    const total = cities.length;
    els.mapCount.textContent = litCities().length + ' / ' + total;
    els.mapEmpty.hidden = litCities().length > 0;
    els.cityLabels.innerHTML = '';
    scheduleLabels();
  }

  function getPagerCities() {
    return litCities().slice().sort(function (a, b) {
      const aLast = latestVisit(a);
      const bLast = latestVisit(b);
      if (aLast && bLast) {
        const byDate = bLast.date.localeCompare(aLast.date);
        if (byDate) return byDate;
        return (bLast.createdAt || 0) - (aLast.createdAt || 0);
      }
      return a.name.localeCompare(b.name, 'zh-CN');
    });
  }

  const GCJ_SPECIAL_CITIES = { '香港': true, '澳门': true, '台北': true, '高雄': true };

  function cityUsesGcj(cityName) {
    return !GCJ_SPECIAL_CITIES[cityName];
  }

  function spotWgs(cityName, spotName) {
    const citySpots = SPOT_COORDS[cityName];
    const point = citySpots && citySpots[spotName];
    return point && Number.isFinite(point[0]) && Number.isFinite(point[1]) ? [point[0], point[1]] : null;
  }

  function outOfChina(lng, lat) {
    return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
  }

  function wgs84ToGcj02(lat, lng) {
    if (outOfChina(lng, lat)) return [lat, lng];
    const PI = Math.PI;
    const a = 6378245.0;
    const ee = 0.00669342162296594323;
    function transformLat(x, y) {
      let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
      ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
      ret += (20.0 * Math.sin(y * PI) + 40.0 * Math.sin(y / 3.0 * PI)) * 2.0 / 3.0;
      ret += (160.0 * Math.sin(y / 12.0 * PI) + 320 * Math.sin(y * PI / 30.0)) * 2.0 / 3.0;
      return ret;
    }
    function transformLng(x, y) {
      let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
      ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
      ret += (20.0 * Math.sin(x * PI) + 40.0 * Math.sin(x / 3.0 * PI)) * 2.0 / 3.0;
      ret += (150.0 * Math.sin(x / 12.0 * PI) + 300.0 * Math.sin(x / 30.0 * PI)) * 2.0 / 3.0;
      return ret;
    }
    let dLat = transformLat(lng - 105.0, lat - 35.0);
    let dLng = transformLng(lng - 105.0, lat - 35.0);
    const radLat = lat / 180.0 * PI;
    let magic = Math.sin(radLat);
    magic = 1 - ee * magic * magic;
    const sqrtMagic = Math.sqrt(magic);
    dLat = (dLat * 180.0) / ((a * (1 - ee)) / (magic * sqrtMagic) * PI);
    dLng = (dLng * 180.0) / (a / sqrtMagic * Math.cos(radLat) * PI);
    return [lat + dLat, lng + dLng];
  }

  function gcj02ToWgs84(lat, lng) {
    let wLat = lat;
    let wLng = lng;
    for (let i = 0; i < 3; i++) {
      const gcj = wgs84ToGcj02(wLat, wLng);
      wLat += lat - gcj[0];
      wLng += lng - gcj[1];
    }
    return [wLat, wLng];
  }

  function latLngToLocal(cityName, lat, lng) {
    const box = regionBox(cityName);
    if (!box) return null;
    const w = Math.max(0.0001, box.maxX - box.minX);
    const h = Math.max(0.0001, box.maxY - box.minY);
    const scale = Math.min((MAP_VIEWBOX.width - 116) / w, (MAP_VIEWBOX.height - 116) / h);
    const cx = (box.minX + box.maxX) / 2;
    const cy = (box.minY + box.maxY) / 2;
    const point = MapAPI.projectLngLat(lng, lat);
    return {
      x: (point.x - cx) * scale + MAP_VIEWBOX.width / 2,
      y: (point.y - cy) * scale + MAP_VIEWBOX.height / 2
    };
  }

  function getVisitedCityPins(cityName) {
    const records = presetSpotRecords(cityName);
    const byName = Object.create(null);
    records.forEach(function (spot) { byName[spot.name] = spot; });
    const stored = state.data.cities[cityName];
    const storedInfo = Object.create(null);
    if (stored && Array.isArray(stored.spotInfo)) {
      stored.spotInfo.forEach(function (spot) { storedInfo[spot.name] = spot; });
    }
    return visitedSpotNames(cityName).map(function (name) {
      let wgs = spotWgs(cityName, name);
      const custom = storedInfo[name];
      if (!wgs && custom && Number.isFinite(custom.lat) && Number.isFinite(custom.lng)) {
        wgs = [custom.lat, custom.lng];
      }
      if (!wgs) return null;
      const record = byName[name] || custom || {};
      return {
        name: name,
        area: record.area || '',
        address: record.address || '',
        lat: wgs[0],
        lng: wgs[1]
      };
    }).filter(Boolean);
  }

  function regionBox(cityName) {
    const region = CITY_REGIONS[cityName];
    if (!region) return null;
    const nums = region.d.match(/-?\d+(?:\.\d+)?/g);
    if (!nums) return null;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i + 1 < nums.length; i += 2) {
      const x = Number(nums[i]);
      const y = Number(nums[i + 1]);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    return { minX: minX, maxX: maxX, minY: minY, maxY: maxY };
  }

  function cityBounds(cityName) {
    const box = regionBox(cityName);
    if (!box) {
      const meta = getCityMeta(cityName);
      if (!meta) return null;
      return [[meta.lat - 0.08, meta.lng - 0.08], [meta.lat + 0.08, meta.lng + 0.08]];
    }
    const b = MapAPI.MAP_BOUNDS;
    const lngSpan = b.maxLng - b.minLng;
    const latSpan = b.maxLat - b.minLat;
    return [
      [b.maxLat - (box.maxY / MAP_VIEWBOX.height) * latSpan, b.minLng + (box.minX / MAP_VIEWBOX.width) * lngSpan],
      [b.maxLat - (box.minY / MAP_VIEWBOX.height) * latSpan, b.minLng + (box.maxX / MAP_VIEWBOX.width) * lngSpan]
    ];
  }

  function pinToLatLng(cityName, pin, provider) {
    if (pin.lat == null || pin.lng == null) return null;
    const wgs = [pin.lat, pin.lng];
    return provider === 'amap' && cityUsesGcj(cityName) ? wgs84ToGcj02(wgs[0], wgs[1]) : wgs;
  }

  function setMapHint(text) {
    els.mapHint.innerHTML = MAP_HINT_ICON + esc(text);
  }

  function animateMapPage() {
    const stage = els.mapStage;
    stage.classList.remove('page-turn');
    void stage.offsetWidth;
    stage.classList.add('page-turn');
    window.clearTimeout(animateMapPage.timer);
    animateMapPage.timer = window.setTimeout(function () {
      stage.classList.remove('page-turn');
    }, 330);
  }

  function setPagerPage(index) {
    if (state.mapPickMode) exitMapPick();
    const pages = getPagerCities();
    if (!pages.length) return;
    if (index <= 0) state.pagerCity = null;
    else if (index <= pages.length) state.pagerCity = pages[index - 1].name;
    state.activePin = 0;
    renderPager();
    animateMapPage();
  }

  function goPager(delta) {
    const pages = getPagerCities();
    if (!pages.length) return;
    const current = state.pagerCity ? pages.findIndex(function (city) { return city.name === state.pagerCity; }) + 1 : 0;
    const total = pages.length + 1;
    const next = (Math.max(0, current) + delta + total) % total;
    setPagerPage(next);
  }

  function showCityPage(name) {
    const pages = getPagerCities();
    if (!pages.some(function (city) { return city.name === name; })) return;
    state.pagerCity = name;
    state.activePin = 0;
    renderPager();
    animateMapPage();
  }

  function renderPager() {
    const pages = getPagerCities();
    if (state.pagerCity && !pages.some(function (city) { return city.name === state.pagerCity; })) {
      state.pagerCity = null;
    }
    if (!pages.length) state.pagerCity = null;
    const hasPages = pages.length > 0;
    const currentIndex = state.pagerCity
      ? pages.findIndex(function (city) { return city.name === state.pagerCity; }) + 1
      : 0;
    const total = pages.length + 1;

    els.mapPagerBar.hidden = !hasPages;
    els.mapPrev.hidden = !hasPages;
    els.mapNext.hidden = !hasPages;
    if (hasPages) {
      els.mapPagerStrip.innerHTML = '<button class="pager-chip' + (currentIndex === 0 ? ' is-active' : '') + '" type="button" data-page="0">全国</button>' +
        pages.map(function (city, index) {
          return '<button class="pager-chip' + (currentIndex === index + 1 ? ' is-active' : '') + '" type="button" data-page="' + (index + 1) + '">' +
            esc(city.name) + '<span class="pager-city-count">' + city.visits.length + '</span></button>';
        }).join('');
      const activeChip = els.mapPagerStrip.querySelector('.pager-chip.is-active');
      if (activeChip && typeof activeChip.offsetLeft === 'number') {
        els.mapPagerStrip.scrollLeft = Math.max(0, activeChip.offsetLeft - els.mapPagerStrip.clientWidth / 2 + activeChip.offsetWidth / 2);
      }
    } else {
      els.mapPagerStrip.innerHTML = '';
    }

    if (!state.pagerCity) {
      if (state.realMapActive) closeRealMap();
      hideMapFallback();
      els.cityMapPage.hidden = true;
      els.mapKicker.textContent = 'CHINA · MY FOOTPRINTS';
      els.mapTitle.textContent = '中国 · 足迹地图';
      els.mapLegend.innerHTML = '<span><i class="legend-block lit"></i>去过的城市</span><span><i class="legend-block dim"></i>未点亮</span>';
      setMapHint('点击粉色城市块，翻页查看城市大地图');
      els.mapCount.textContent = litCities().length + ' / ' + getAllMapCities().length;
      els.mapEmpty.hidden = litCities().length > 0;
      scheduleLabels();
      return;
    }

    const cityName = state.pagerCity;
    const pinCount = getVisitedCityPins(cityName).length;
    els.cityMapPage.hidden = false;
    els.mapEmpty.hidden = true;
    els.mapKicker.textContent = 'CITY MAP · VISITED SPOTS';
    els.mapTitle.textContent = cityName + ' · 城市大地图';
    els.mapLegend.innerHTML = '<span><i class="legend-block lit"></i>已到访景点</span><span>' + (pinCount ? pinCount + ' 个' : '暂无标记') + '</span>';
    setMapHint('在线地图 · 双指/滚轮缩放 · 点击标记');
    els.mapCount.textContent = (currentIndex + 1) + ' / ' + total + ' 页';
    renderCityMapPage(cityName);
  }

  function renderCityMapPage(cityName) {
    if (state.realMapActive) closeRealMap();
    hideMapFallback();
    state.activePin = 0;
    openRealMap(cityName);
  }

  function resetCityZoom() {
    state.cityZoom = 1;
    state.cityPanX = 0;
    state.cityPanY = 0;
    applyCityTransform();
  }

  function applyCityTransform() {
    if (!els.cityMapCanvas) return;
    const width = els.mapStage.clientWidth || 330;
    const height = els.mapStage.clientHeight || 224;
    const zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, state.cityZoom));
    const maxX = (width * (zoom - 1)) / 2;
    const maxY = (height * (zoom - 1)) / 2;
    state.cityPanX = Math.max(-maxX, Math.min(maxX, state.cityPanX));
    state.cityPanY = Math.max(-maxY, Math.min(maxY, state.cityPanY));
    els.cityMapCanvas.style.transform = 'translate(' + state.cityPanX.toFixed(1) + 'px,' + state.cityPanY.toFixed(1) + 'px) scale(' + zoom + ')';
    els.cityMapPage.classList.toggle('is-zoomed', zoom > 1.01);
    if (els.cityZoomReset) els.cityZoomReset.textContent = zoom <= 1.01 ? '1:1' : zoom.toFixed(1) + '×';
    layoutCityOverlays();
  }

  function layoutCityOverlays() {
    const cityName = state.pagerCity;
    const page = cityName ? CITY_PAGES[cityName] : null;
    if (!page || els.cityMapPage.hidden) return;
    const width = els.mapStage.clientWidth || 330;
    const height = els.mapStage.clientHeight || 224;
    const zoom = state.cityZoom;
    const panX = state.cityPanX;
    const panY = state.cityPanY;
    const centerX = width / 2;
    const centerY = height / 2;
    const pinScreens = [];
    const blocked = [];

    Array.prototype.forEach.call(els.cityPins.querySelectorAll('.city-pin'), function (button, index) {
      const baseX = Number(button.getAttribute('data-x'));
      const baseY = Number(button.getAttribute('data-y'));
      const bx = (baseX / 1000) * width;
      const by = (baseY / 680) * height;
      const sx = centerX + (bx - centerX) * zoom + panX;
      const sy = centerY + (by - centerY) * zoom + panY;
      pinScreens[index] = { x: sx, y: sy };
      button.style.left = sx.toFixed(1) + 'px';
      button.style.top = sy.toFixed(1) + 'px';
      blocked.push({ left: sx - 6, top: sy - 6, right: sx + 6, bottom: sy + 6 });
    });

    function overlaps(rect) {
      return blocked.some(function (other) {
        return !(rect.right + 1 < other.left || rect.left - 1 > other.right || rect.bottom + 1 < other.top || rect.top - 1 > other.bottom);
      });
    }

    Array.prototype.forEach.call(els.citySpotLabels.querySelectorAll('.city-spot-map-label'), function (label, index) {
      const point = pinScreens[index];
      if (!point) { label.style.display = 'none'; return; }
      const text = label.textContent || '';
      const labelWidth = Math.min(124, text.length * 6.2 + 8);
      const labelHeight = 10.5;
      const candidates = [
        [point.x + 9, point.y - labelHeight / 2],
        [point.x - 9 - labelWidth, point.y - labelHeight / 2],
        [point.x - labelWidth / 2, point.y - 17],
        [point.x - labelWidth / 2, point.y + 8]
      ];
      let chosen = null;
      for (let i = 0; i < candidates.length; i++) {
        const left = candidates[i][0];
        const top = candidates[i][1];
        if (left < 3 || top < 28 || left + labelWidth > width - 3 || top + labelHeight > height - 42) continue;
        const rect = { left: left, top: top, right: left + labelWidth, bottom: top + labelHeight };
        if (!overlaps(rect)) {
          chosen = rect;
          break;
        }
      }
      if (!chosen) { label.style.display = 'none'; return; }
      blocked.push(chosen);
      label.style.display = 'block';
      label.style.left = chosen.left.toFixed(1) + 'px';
      label.style.top = chosen.top.toFixed(1) + 'px';
    });

    Array.prototype.forEach.call(els.cityDistrictLabels.querySelectorAll('.city-district-label'), function (label) {
      const baseX = Number(label.getAttribute('data-base-x'));
      const baseY = Number(label.getAttribute('data-base-y'));
      const bx = (baseX / 1000) * width;
      const by = (baseY / 680) * height;
      const sx = centerX + (bx - centerX) * zoom + panX;
      const sy = centerY + (by - centerY) * zoom + panY;
      const labelWidth = Math.min(100, (label.textContent || '').length * 6.4 + 8);
      const labelHeight = 10;
      const candidates = [
        [sx - labelWidth / 2, sy - labelHeight / 2],
        [sx - labelWidth / 2, sy - labelHeight - 3],
        [sx - labelWidth / 2, sy + 3],
        [sx + 4, sy - labelHeight / 2],
        [sx - labelWidth - 4, sy - labelHeight / 2]
      ];
      let chosen = null;
      for (let i = 0; i < candidates.length; i++) {
        const left = candidates[i][0];
        const top = candidates[i][1];
        if (left < 4 || top < 28 || left + labelWidth > width - 4 || top + labelHeight > height - 42) continue;
        const rect = { left: left, top: top, right: left + labelWidth, bottom: top + labelHeight };
        if (!overlaps(rect)) {
          chosen = rect;
          break;
        }
      }
      if (!chosen) { label.style.display = 'none'; return; }
      blocked.push(chosen);
      label.style.display = 'block';
      label.style.left = chosen.left.toFixed(1) + 'px';
      label.style.top = chosen.top.toFixed(1) + 'px';
    });
  }

  function setCityZoom(nextZoom) {
    const zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, nextZoom));
    state.cityZoom = zoom;
    if (zoom <= 1.01) {
      state.cityPanX = 0;
      state.cityPanY = 0;
    }
    applyCityTransform();
  }

  function clearMapTileTimer() {
    window.clearTimeout(state.mapTileTimer);
    state.mapTileTimer = 0;
  }

  function resetRealMapInstance() {
    clearMapTileTimer();
    if (state.realMapInstance) {
      try { state.realMapInstance.remove(); } catch (error) { /* ignore */ }
    }
    state.realMapInstance = null;
    state.realMapMarkerLayer = null;
    state.realMapProvider = 'amap';
  }

  function visitedSpotNames(cityName) {
    const names = [];
    const seen = Object.create(null);
    getVisits(cityName).forEach(function (visit) {
      if (visit.spot && !seen[visit.spot]) {
        seen[visit.spot] = true;
        names.push(visit.spot);
      }
    });
    return names;
  }

  function showMapFallback(cityName) {
    state.mapFallbackActive = true;
    state.realMapActive = false;
    clearMapTileTimer();
    els.cityMapPage.classList.remove('is-real');
    els.cityMapPage.classList.add('is-fallback');
    els.realMap.hidden = true;
    els.cityMapFallback.hidden = false;
    els.cityFallbackTitle.textContent = cityName;
    const names = visitedSpotNames(cityName);
    if (names.length) {
      els.cityFallbackSpots.innerHTML = names.map(function (name, index) {
        const record = presetSpotRecords(cityName).find(function (spot) { return spot.name === name; });
        return '<div class="fallback-spot-row"><b>' + pad2(index + 1) + '</b>' +
          esc(name) + (record && record.area ? '<span>' + esc(record.area) + '</span>' : '') + '</div>';
      }).join('');
    } else {
      els.cityFallbackSpots.innerHTML = '<div class="fallback-spot-row">还没有带景点的到访记录</div>';
    }
    resetRealMapInstance();
  }

  function hideMapFallback() {
    state.mapFallbackActive = false;
    els.cityMapPage.classList.remove('is-fallback');
    els.cityMapFallback.hidden = true;
  }

  function startMapTileWatch(map) {
    clearMapTileTimer();
    if (!state.realMapActive || map._mapReady) return;
    map._tileLoaded = false;
    state.mapTileTimer = window.setTimeout(function () {
      if (!state.realMapActive || map._tileLoaded || map._mapReady) return;
      if (state.realMapProvider === 'amap' && !map._triedOsmFallback) {
        map._triedOsmFallback = true;
        if (map._baseLayer) map.removeLayer(map._baseLayer);
        addOsmFallbackLayer(map);
        showToast('高德底图响应慢，已切换 OSM 备用底图');
      } else {
        showMapFallback(state.pagerCity || '城市');
      }
    }, 8000);
  }

  function addOsmFallbackLayer(map) {
    if (map._osmFallbackLayer) return;
    state.realMapProvider = 'osm';
    map._tileLoaded = false;
    let errors = 0;
    const layer = window.L.tileLayer('https://tile.openstreetmap.de/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
    });
    layer.on('tileload', function () {
      map._tileLoaded = true;
      map._mapReady = true;
      clearMapTileTimer();
    });
    layer.on('tileerror', function () {
      errors += 1;
      if (errors < 3) return;
      showMapFallback(state.pagerCity || '城市');
    });
    layer.addTo(map);
    map._osmFallbackLayer = layer;
    map._baseLayer = layer;
    if (state.realMapActive && state.pagerCity && state.realMapMarkerLayer) renderRealMapMarkers(state.pagerCity);
    startMapTileWatch(map);
  }

  function addRealBaseLayer(map) {
    state.realMapProvider = 'amap';
    map._tileLoaded = false;
    let errors = 0;
    const amap = window.L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
      maxZoom: 18,
      subdomains: '1234',
      attribution: '&copy; <a href="https://www.amap.com/" target="_blank" rel="noopener">高德地图</a>'
    });
    amap.on('tileload', function () {
      map._tileLoaded = true;
      map._mapReady = true;
      clearMapTileTimer();
    });
    amap.on('tileerror', function () {
      errors += 1;
      if (errors < 3 || map._triedOsmFallback) return;
      map._triedOsmFallback = true;
      map.removeLayer(amap);
      addOsmFallbackLayer(map);
      showToast('高德底图加载失败，已切换 OSM 备用底图');
    });
    amap.addTo(map);
    map._baseLayer = amap;
    startMapTileWatch(map);
  }

  function ensureRealMap() {
    if (!window.L) return null;
    if (!state.realMapInstance) {
      const map = window.L.map(els.realMap, {
        zoomControl: false,
        attributionControl: true,
        maxZoom: 18
      });
      addRealBaseLayer(map);
      window.L.control.zoom({ position: 'bottomright' }).addTo(map);
      state.realMapMarkerLayer = window.L.layerGroup().addTo(map);
      map.on('click', function (event) {
        if (state.spotPickMode) completeSpotPick(event.latlng);
      });
      state.realMapInstance = map;
    }
    return state.realMapInstance;
  }

  function renderRealMapMarkers(cityName) {
    if (!state.realMapMarkerLayer) return [];
    const pins = getVisitedCityPins(cityName);
    const points = [];
    state.realMapMarkerLayer.clearLayers();
    const showLabels = pins.length <= 8;
    pins.forEach(function (pin) {
      const point = pinToLatLng(cityName, pin, state.realMapProvider);
      if (!point) return;
      points.push(point);
      const calibrated = pin.lat != null && pin.lng != null;
      const record = presetSpotRecords(cityName).find(function (spot) { return spot.name === pin.name; });
      const popup = '<strong>' + esc(pin.name) + '</strong>' +
        (pin.area ? '<br>' + esc(pin.area) : '') +
        (record && record.address ? '<br>' + esc(record.address) : '') +
        '<br><em>' + (calibrated ? '坐标来自在线地图校准' : '位置为近似标注') + '</em>';
      const marker = window.L.circleMarker(point, {
        radius: 5,
        color: '#FFFDF9',
        weight: 1.5,
        fillColor: '#F17893',
        fillOpacity: 1
      });
      marker.bindPopup(popup, { closeButton: true, className: 'real-map-popup' });
      marker.bindTooltip(pin.name, {
        permanent: showLabels,
        direction: 'right',
        offset: [6, 0],
        className: 'real-spot-label'
      });
      marker.addTo(state.realMapMarkerLayer);
    });
    return points;
  }

  function openRealMap(cityName) {
    if (!window.L || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
      showMapFallback(cityName);
      return;
    }
    hideMapFallback();
    state.realMapActive = true;
    els.cityMapPage.classList.add('is-real');
    els.realMap.hidden = false;
    const map = ensureRealMap();
    if (!map || !state.realMapMarkerLayer) {
      showMapFallback(cityName);
      showToast('在线地图初始化失败');
      return;
    }
    const points = renderRealMapMarkers(cityName);
    const pinCount = points.length;
    const cityBox = cityBounds(cityName);
    function fitMap() {
      if (points.length) {
        map.fitBounds(window.L.latLngBounds(points), { padding: [34, 34], maxZoom: 14 });
      } else if (cityBox) {
        map.fitBounds(cityBox, { padding: [18, 18], maxZoom: 13 });
      } else {
        const meta = getCityMeta(cityName);
        if (meta) map.setView([meta.lat, meta.lng], 11);
      }
    }
    fitMap();
    els.citySpotInfo.innerHTML = '<span>' + (pinCount ? '在线地图 · 点击标记查看景点' : '在线地图 · 这个城市还没有已到访景点') + '</span>';
    startMapTileWatch(map);
    window.setTimeout(function () {
      if (!state.realMapActive) return;
      map.invalidateSize();
      fitMap();
    }, 60);
  }

  function closeRealMap() {
    if (!state.realMapActive) return;
    state.realMapActive = false;
    clearMapTileTimer();
    els.cityMapPage.classList.remove('is-real');
    els.realMap.hidden = true;
    els.cityRealMapToggle.innerHTML = '实景地图 <span>需联网</span>';
    const pins = state.pagerCity ? getVisitedCityPins(state.pagerCity) : [];
    if (pins.length) selectCitySpot(state.activePin, false);
    else els.citySpotInfo.innerHTML = '<span>这个城市还没有带景点的到访记录</span>';
    applyCityTransform();
  }

  function toggleRealMap() {
    if (state.realMapActive) {
      closeRealMap();
    } else if (state.pagerCity) {
      openRealMap(state.pagerCity);
    }
  }

  function selectCitySpot(index, shouldScroll) {
    const cityName = state.pagerCity;
    const pins = getVisitedCityPins(cityName);
    if (!cityName || !pins.length) return;
    const target = Math.max(0, Math.min(pins.length - 1, Number(index) || 0));
    state.activePin = target;
    const pin = pins[target];
    const record = presetSpotRecords(cityName).find(function (spot) { return spot.name === pin.name; });
    const area = pin.area || (record ? record.area : '');
    const address = record ? record.address : '';

    Array.prototype.forEach.call(els.cityPins.querySelectorAll('.city-pin'), function (button) {
      button.classList.toggle('is-active', Number(button.getAttribute('data-index')) === target);
    });
    Array.prototype.forEach.call(els.citySpotLegend.querySelectorAll('.city-spot-chip'), function (chip) {
      chip.classList.toggle('is-active', Number(chip.getAttribute('data-index')) === target);
    });
    Array.prototype.forEach.call(els.citySpotLabels.querySelectorAll('.city-spot-map-label'), function (label) {
      label.classList.toggle('is-active', Number(label.getAttribute('data-index')) === target);
    });
    els.citySpotInfo.innerHTML = '<b>' + pad2(target + 1) + ' · ' + esc(pin.name) + '</b>' +
      (area ? ' · ' + esc(area) : '') +
      (address ? ' · ' + esc(address) : '');

    if (shouldScroll) {
      const chip = els.citySpotLegend.querySelector('.city-spot-chip[data-index="' + target + '"]');
      if (chip) {
        const left = Math.max(0, chip.offsetLeft - 20);
        if (typeof els.citySpotLegend.scrollTo === 'function') {
          els.citySpotLegend.scrollTo({ left: left, behavior: 'smooth' });
        } else {
          els.citySpotLegend.scrollLeft = left;
        }
      }
    }
  }

  function scheduleLabels() {
    window.cancelAnimationFrame(state.labelFrame);
    state.labelFrame = window.requestAnimationFrame(function () {
      renderCityLabels();
    });
  }

  function renderCityLabels() {
    if (!els.cityLabels || els.mapView.hidden) return;
    const width = els.mapStage.clientWidth;
    const height = els.mapStage.clientHeight;
    if (!width || !height) return;
    const labels = [];
    const placed = [];
    const visited = litCities().slice().sort(function (a, b) {
      const byCount = b.visits.length - a.visits.length;
      if (byCount) return byCount;
      const aLatest = latestVisit(a);
      const bLatest = latestVisit(b);
      return String(bLatest ? bLatest.date : '').localeCompare(String(aLatest ? aLatest.date : ''));
    });

    visited.forEach(function (city) {
      const point = MapAPI.projectLngLat(city.lng, city.lat);
      const x = (point.x / MAP_VIEWBOX.width) * width;
      const y = (point.y / MAP_VIEWBOX.height) * height;
      const count = city.visits.length;
      const labelWidth = Math.min(94, 14 + city.name.length * 8 + (count > 1 ? 10 : 0));
      const labelHeight = 16;
      const gap = 7;
      const candidates = [
        [x - labelWidth / 2, y - gap - labelHeight],
        [x - labelWidth / 2, y + gap],
        [x + gap, y - labelHeight / 2],
        [x - labelWidth - gap, y - labelHeight / 2],
        [x - labelWidth / 2, y - gap * 2 - labelHeight]
      ];
      let chosen = null;
      for (let i = 0; i < candidates.length; i++) {
        const left = candidates[i][0];
        const top = candidates[i][1];
        if (left < 3 || top < 3 || left + labelWidth > width - 3 || top + labelHeight > height - 3) continue;
        const rect = { left: left, top: top, right: left + labelWidth, bottom: top + labelHeight };
        const overlap = placed.some(function (other) {
          return !(rect.right + 2 < other.left || rect.left - 2 > other.right || rect.bottom + 2 < other.top || rect.top - 2 > other.bottom);
        });
        if (!overlap) { chosen = rect; break; }
      }
      if (!chosen) return;
      placed.push(chosen);
      labels.push(
        '<span class="city-label" style="left:' + chosen.left.toFixed(1) + 'px;top:' + chosen.top.toFixed(1) + 'px;transform:none">' +
          esc(city.name) + (count > 1 ? ' <b>' + count + '</b>' : '') +
        '</span>'
      );
    });

    els.cityLabels.innerHTML = labels.join('');
  }

  function renderRecent() {
    const records = litCities().map(function (city) {
      const last = latestVisit(city);
      return last ? { city: city, visit: last } : null;
    }).filter(Boolean).sort(function (a, b) {
      const byDate = b.visit.date.localeCompare(a.visit.date);
      if (byDate) return byDate;
      return (b.visit.createdAt || 0) - (a.visit.createdAt || 0);
    });

    if (!records.length) {
      els.recentList.innerHTML = '';
      els.recentList.hidden = true;
      els.recentEmpty.hidden = false;
      return;
    }

    els.recentList.hidden = false;
    els.recentEmpty.hidden = true;
    els.recentList.innerHTML = records.slice(0, 8).map(function (record) {
      const city = record.city;
      const visit = record.visit;
      const meta = [formatDate(visit.date), visit.spot || ''].filter(Boolean).join(' · ');
      return '<button class="recent-card" type="button" data-city="' + esc(city.name) + '" aria-label="查看' + esc(city.name) + '">' +
        '<span class="recent-photo">' +
          photoMarkup(visit.photo, city.name + ' ' + formatDate(visit.date) + ' 到访照片', city.name) +
          (city.visits.length > 1 ? '<span class="photo-count">' + city.visits.length + ' 次</span>' : '') +
        '</span>' +
        '<span class="recent-info"><strong>' + esc(city.name) + '</strong><span>' + esc(meta) + '</span></span>' +
        '</button>';
    }).join('');
  }

  function renderList() {
    const cities = Object.keys(state.data.cities).map(function (name) {
      return state.data.cities[name];
    }).sort(function (a, b) {
      const aLast = latestVisit(a);
      const bLast = latestVisit(b);
      if (aLast && bLast) {
        const byDate = bLast.date.localeCompare(aLast.date);
        if (byDate) return byDate;
        return (bLast.createdAt || 0) - (aLast.createdAt || 0);
      }
      if (aLast) return -1;
      if (bLast) return 1;
      return a.name.localeCompare(b.name, 'zh-CN');
    });

    els.listCount.textContent = '共 ' + cities.length + ' 座';
    els.listEmpty.hidden = cities.length > 0;
    els.cityList.hidden = cities.length === 0;

    els.cityList.innerHTML = cities.map(function (city) {
      const last = latestVisit(city);
      const meta = getCityMeta(city.name) || city;
      const lastSpot = last && last.spot ? last.spot : '';
      const usedSpots = uniqueStrings(city.visits.map(function (visit) { return visit.spot; }).filter(Boolean)).slice(0, 2);
      const metaText = last
        ? formatDate(last.date) + ' · 最近到访' + (lastSpot ? ' · ' + esc(lastSpot) : '')
        : '等待第一次到访 · 点击记录';
      return '<button class="city-card' + (last ? '' : ' is-pending') + '" type="button" data-city="' + esc(city.name) + '" aria-label="查看' + esc(city.name) + '的旅行记录">' +
        '<span class="city-thumb">' +
          photoMarkup(last ? last.photo : '', city.name + '最近到访照片', city.name) +
          '<span class="thumb-count">' + city.visits.length + '</span>' +
        '</span>' +
        '<span class="city-info">' +
          '<span class="city-title-row"><span class="city-name">' + esc(city.name) + '</span><span class="city-province">' + esc(meta.province || '') + '</span></span>' +
          '<span class="city-meta">' + metaText + '</span>' +
          '<span class="city-spot-row">' + usedSpots.map(function (spot) { return '<span class="spot-tag">' + esc(spot) + '</span>'; }).join('') + '</span>' +
        '</span>' +
        '<span class="city-arrow">' + ICONS.arrow + '</span>' +
        '</button>';
    }).join('');
  }

  function setView(view) {
    if (view === 'list' && state.mapPickMode) exitMapPick();
    state.view = view;
    const isMap = view === 'map';
    els.tabMap.classList.toggle('is-active', isMap);
    els.tabList.classList.toggle('is-active', !isMap);
    els.tabMap.setAttribute('aria-selected', isMap ? 'true' : 'false');
    els.tabList.setAttribute('aria-selected', isMap ? 'false' : 'true');
    els.viewSwitch.classList.toggle('is-list', !isMap);
    els.mapView.hidden = !isMap;
    els.listView.hidden = isMap;
    if (isMap) {
      scheduleLabels();
      if (state.pagerCity && !els.cityMapPage.hidden) {
        applyCityTransform();
      }
    }
  }

  /* ---------- add city ---------- */

  function availableCities() {
    return CITIES.filter(function (city) { return !state.data.cities[city.name]; });
  }

  function hideCitySuggestions() {
    els.citySuggestions.hidden = true;
    els.citySuggestions.innerHTML = '';
    els.citySearch.setAttribute('aria-expanded', 'false');
    state.citySuggestions = [];
    state.suggestionIndex = -1;
  }

  function renderCitySuggestions(query) {
    const keyword = String(query || '').trim().toLowerCase();
    const list = availableCities().filter(function (city) {
      if (!keyword) return true;
      return city.name.toLowerCase().indexOf(keyword) !== -1 || city.province.toLowerCase().indexOf(keyword) !== -1;
    }).slice(0, 8);

    state.citySuggestions = list;
    state.suggestionIndex = list.length ? 0 : -1;
    if (!list.length) {
      const allAdded = availableCities().length === 0;
      els.citySuggestions.innerHTML = '<div class="city-suggestion-empty">' +
        (allAdded ? '城市字典里的城市都点亮了，可以展开下方手动输入。' : '没有匹配的城市，试试别的写法，或展开手动输入经纬度。') +
        '</div>';
      els.citySuggestions.hidden = false;
      els.citySearch.setAttribute('aria-expanded', 'true');
      return;
    }

    els.citySuggestions.innerHTML = list.map(function (city, index) {
      return '<button class="city-suggestion' + (index === 0 ? ' is-active' : '') + '" type="button" role="option" data-city="' + esc(city.name) + '">' +
        '<span class="city-suggestion-name">' + esc(city.name) + '</span>' +
        '<span class="city-suggestion-province">' + esc(city.province) + '</span>' +
        '<span class="city-suggestion-coord">' + formatCoords(city.lng, city.lat) + '</span>' +
        '</button>';
    }).join('');
    els.citySuggestions.hidden = false;
    els.citySearch.setAttribute('aria-expanded', 'true');
  }

  function updateSuggestionActive() {
    const items = els.citySuggestions.querySelectorAll('.city-suggestion');
    items.forEach(function (item, index) {
      const active = index === state.suggestionIndex;
      item.classList.toggle('is-active', active);
      if (active && typeof item.scrollIntoView === 'function') {
        item.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  function selectCity(city, keepInput) {
    if (!city) return;
    state.selectedCity = city;
    if (!keepInput) els.citySearch.value = city.name;
    hideCitySuggestions();
    if (!els.manualName.value.trim() && !els.manualLng.value.trim() && !els.manualLat.value.trim()) {
      setCoordPreview(city);
    }
  }

  function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function nearestKnownCity(lng, lat) {
    let best = null;
    CITIES.forEach(function (city) {
      const distance = haversineKm(lat, lng, city.lat, city.lng);
      if (!best || distance < best.distance) best = { city: city, distance: distance };
    });
    return best;
  }

  function exitMapPick() {
    state.mapPickMode = false;
    els.mapStage.classList.remove('is-picking');
    els.mapPickBanner.hidden = true;
    els.mapPickMarker.hidden = true;
    renderPager();
  }

  function cancelMapPick() {
    if (!state.mapPickMode) return;
    exitMapPick();
    showToast('已取消地图选点');
  }

  function startMapPick() {
    if (state.mapPickMode) return;
    if (!els.addCityModal.hidden) closeModal('addCityModal');
    setView('map');
    state.pagerCity = null;
    renderPager();
    state.mapPickMode = true;
    els.mapStage.classList.add('is-picking');
    els.mapPickBanner.hidden = false;
    els.mapPickMarker.hidden = true;
    setMapHint('点击地图，选择一个去过的地方');
    if (els.mapStage.scrollIntoView) {
      window.setTimeout(function () {
        els.mapStage.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 80);
    }
    showToast('点击地图上的位置');
  }

  function openAddFromMap(nearest, lng, lat) {
    exitMapPick();
    els.cityFormError.textContent = '';
    els.citySearch.value = '';
    state.selectedCity = null;
    els.manualName.value = '';
    els.manualLng.value = '';
    els.manualLat.value = '';
    els.manualBox.open = false;
    els.coordCard.classList.remove('is-manual');
    if (nearest && nearest.distance <= 90) {
      state.selectedCity = nearest.city;
      els.citySearch.value = nearest.city.name;
      setCoordPreview(nearest.city);
      state.openVisitAfterAdd = true;
      openModal('addCityModal');
      showToast('已选中「' + nearest.city.name + '」附近，确认后记录到访');
      window.setTimeout(function () {
        if (!els.addCityModal.hidden) els.citySearch.focus({ preventScroll: true });
      }, 120);
      return;
    }
    els.manualLng.value = lng.toFixed(4);
    els.manualLat.value = lat.toFixed(4);
    els.manualBox.open = true;
    els.coordCity.textContent = '地图选点';
    els.coordText.textContent = formatCoords(lng, lat);
    els.coordTag.textContent = '地图坐标';
    state.openVisitAfterAdd = true;
    openModal('addCityModal');
    showToast('填写一个地点名称，确认后记录到访');
    window.setTimeout(function () {
      if (!els.addCityModal.hidden) els.manualName.focus({ preventScroll: true });
    }, 120);
  }

  function handleMapPick(event) {
    if (!state.mapPickMode) return;
    if (event.target.closest('.map-pick-banner')) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = els.mapStage.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    const lng = MapAPI.MAP_BOUNDS.minLng + x * (MapAPI.MAP_BOUNDS.maxLng - MapAPI.MAP_BOUNDS.minLng);
    const lat = MapAPI.MAP_BOUNDS.maxLat - y * (MapAPI.MAP_BOUNDS.maxLat - MapAPI.MAP_BOUNDS.minLat);
    els.mapPickMarker.style.left = (x * 100).toFixed(2) + '%';
    els.mapPickMarker.style.top = (y * 100).toFixed(2) + '%';
    els.mapPickMarker.hidden = false;
    const nearest = nearestKnownCity(lng, lat);
    if (nearest && nearest.distance <= 90 && state.data.cities[nearest.city.name]) {
      const cityName = nearest.city.name;
      exitMapPick();
      state.activeCity = cityName;
      openVisit();
      showToast('已选在「' + cityName + '」附近，记录一次到访');
      return;
    }
    openAddFromMap(nearest, lng, lat);
  }

  function openAddCity() {
    if (state.mapPickMode) exitMapPick();
    state.openVisitAfterAdd = false;
    els.citySearch.value = '';
    state.selectedCity = null;
    hideCitySuggestions();
    els.manualName.value = '';
    els.manualLng.value = '';
    els.manualLat.value = '';
    els.manualBox.open = false;
    els.cityFormError.textContent = '';
    els.coordCard.classList.remove('is-manual');
    setCoordPreview(null);
    openModal('addCityModal');
    window.setTimeout(function () {
      if (!els.addCityModal.hidden) els.citySearch.focus({ preventScroll: true });
    }, 120);
  }

  function setCoordPreview(city, mode) {
    if (!city) {
      els.coordCity.textContent = '等待选择城市';
      els.coordText.textContent = '输入城市名，再从推荐里选一座';
      els.coordTag.textContent = '内置坐标';
      return;
    }
    els.coordCity.textContent = city.name;
    els.coordText.textContent = (city.province ? city.province + ' · ' : '') + formatCoords(city.lng, city.lat);
    els.coordTag.textContent = mode === 'manual' ? '手动坐标' : '内置坐标';
  }

  function updateCoordPreview() {
    const hasManual = els.manualName.value.trim() || els.manualLng.value.trim() || els.manualLat.value.trim();
    if (hasManual) {
      const lng = Number(els.manualLng.value);
      const lat = Number(els.manualLat.value);
      if (els.manualName.value.trim() && Number.isFinite(lng) && Number.isFinite(lat)) {
        setCoordPreview({
          name: els.manualName.value.trim(),
          province: CITY_MAP[els.manualName.value.trim()] ? CITY_MAP[els.manualName.value.trim()].province : '自定义',
          lng: lng,
          lat: lat
        }, 'manual');
      } else {
        els.coordCity.textContent = '手动坐标待补全';
        els.coordText.textContent = '请填写城市名、经度和纬度';
        els.coordTag.textContent = '手动坐标';
      }
      return;
    }
    setCoordPreview(state.selectedCity || null);
  }

  function addCity() {
    els.cityFormError.textContent = '';
    const manualName = els.manualName.value.trim();
    const manualLng = els.manualLng.value.trim();
    const manualLat = els.manualLat.value.trim();
    const usingManual = manualName || manualLng || manualLat;
    let payload = null;

    if (usingManual) {
      if (!manualName) return showCityError('请填写城市名称。');
      if (!manualLng || !manualLat) return showCityError('手动添加时，经度和纬度都要填写。');
      const lng = Number(manualLng);
      const lat = Number(manualLat);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return showCityError('经纬度必须是数字。');
      if (lng < MapAPI.MAP_BOUNDS.minLng || lng > MapAPI.MAP_BOUNDS.maxLng || lat < MapAPI.MAP_BOUNDS.minLat || lat > MapAPI.MAP_BOUNDS.maxLat) {
        return showCityError('坐标需要落在中国地图范围内（东经 73°–136°，北纬 17.8°–54.5°）。');
      }
      const known = CITY_MAP[manualName];
      payload = {
        name: manualName.slice(0, 12),
        lng: lng,
        lat: lat,
        province: known ? known.province : '自定义'
      };
    } else if (state.selectedCity) {
      const selected = state.selectedCity;
      payload = { name: selected.name, lng: selected.lng, lat: selected.lat, province: selected.province };
    } else {
      return showCityError('先输入城市名并从推荐里选择一座，或展开手动输入。');
    }

    if (isUnsafeCityName(payload.name)) {
      return showCityError('这个城市名称不可用，请换一个。');
    }
    if (state.data.cities[payload.name]) {
      return showCityError('「' + payload.name + '」已经在地图里了。');
    }

    const previous = state.data.cities[payload.name];
    state.data.cities[payload.name] = {
      name: payload.name,
      lng: payload.lng,
      lat: payload.lat,
      province: payload.province,
      spots: [],
      spotInfo: [],
      visits: []
    };
    const result = persist();
    if (!result.ok) {
      if (previous) state.data.cities[payload.name] = previous;
      else delete state.data.cities[payload.name];
      showCityError('本地存储写入失败，可能是浏览器空间不足或禁用了存储。');
      return;
    }

    closeModal('addCityModal');
    renderAll();
    if (state.openVisitAfterAdd) {
      state.openVisitAfterAdd = false;
      state.activeCity = payload.name;
      openVisit();
    } else {
      openCity(payload.name);
    }
    showToast('「' + payload.name + '」已加入我的城市，记录第一次到访后会点亮');
  }

  function showCityError(message) {
    els.cityFormError.textContent = message;
  }

  /* ---------- city detail ---------- */

  function openCity(name) {
    const meta = getCityMeta(name);
    if (!meta) return;
    state.activeCity = name;
    state.spotFilter = 'all';
    renderCityDetail();
    if (els.detailBody) els.detailBody.scrollTop = 0;
    openModal('cityModal');
  }

  function renderCityDetail() {
    const name = state.activeCity;
    if (!name) return;
    const meta = getCityMeta(name);
    if (!meta) return;
    const stored = state.data.cities[name];
    const visits = stored ? stored.visits.slice().sort(compareVisits) : [];
    const usedSpots = uniqueStrings(visits.map(function (visit) { return visit.spot; }).filter(Boolean));
    const directory = getSpotDirectory(name);
    const first = visits.length ? visits[visits.length - 1].date : '';

    els.detailName.textContent = name;
    els.detailMeta.textContent = (meta.province ? meta.province + ' · ' : '') + formatCoords(meta.lng, meta.lat);
    els.detailVisitCount.textContent = String(visits.length);
    els.detailSpotCount.textContent = String(directory.length);
    els.detailFirst.textContent = first ? formatDate(first) : '—';
    els.btnRemoveCity.hidden = !stored;
    renderSpotAtlas(directory);

    if (state.spotFilter !== 'all' && usedSpots.indexOf(state.spotFilter) === -1) {
      state.spotFilter = 'all';
    }
    els.spotFilterWrap.hidden = usedSpots.length === 0;
    els.spotFilterHint.textContent = usedSpots.length ? usedSpots.length + ' 个地点' : '';
    els.spotChips.innerHTML = '<button class="spot-chip ' + (state.spotFilter === 'all' ? 'is-active' : '') + '" type="button" data-spot="__all__">全部<b>' + visits.length + '</b></button>' +
      usedSpots.map(function (spot) {
        const count = visits.filter(function (visit) { return visit.spot === spot; }).length;
        return '<button class="spot-chip ' + (state.spotFilter === spot ? 'is-active' : '') + '" type="button" data-spot="' + esc(spot) + '">' +
          esc(spot) + '<b>' + count + '</b></button>';
      }).join('');

    els.cityEmpty.hidden = visits.length > 0;
    els.btnAddVisit.textContent = visits.length ? '＋ 记录到访' : '＋ 记录第一次到访';

    if (!visits.length) {
      els.visitsList.innerHTML = '';
    } else {
      const filtered = state.spotFilter === 'all'
        ? visits
        : visits.filter(function (visit) { return visit.spot === state.spotFilter; });
      if (!filtered.length) {
        els.visitsList.innerHTML = '<div class="detail-empty-filter">还没有这个地点的到访记录</div>';
      } else {
        const numbered = {};
        visits.forEach(function (visit, index) {
          numbered[visit.id] = visits.length - index;
        });
        els.visitsList.innerHTML = filtered.map(function (visit) {
          const note = visit.note || '只留下了这一张照片。';
          return '<article class="visit-item">' +
            '<div class="visit-photo">' + photoMarkup(visit.photo, name + ' ' + formatDate(visit.date) + ' 到访照片', name) + '</div>' +
            '<div class="visit-info">' +
              '<div class="visit-date-row">' +
                '<span class="visit-date">' + formatDate(visit.date) + '</span>' +
                '<span class="visit-no">第 ' + (numbered[visit.id] || '') + ' 次</span>' +
              '</div>' +
              '<p class="visit-note' + (visit.note ? '' : ' is-empty') + '">' + esc(note) + '</p>' +
              (visit.spot ? '<span class="visit-spot">' + esc(visit.spot) + '</span>' : '') +
            '</div>' +
            '</article>';
        }).join('');
      }
    }
  }

  function renderSpotAtlas(directory) {
    els.spotAtlas.hidden = directory.length === 0;
    els.spotAtlasCount.textContent = directory.length + ' 个地点';
    if (!directory.length) {
      els.spotAtlasList.innerHTML = '';
      return;
    }

    const groups = [];
    const byArea = Object.create(null);
    directory.forEach(function (spot) {
      const key = spot.area || '__unknown__';
      if (!byArea[key]) {
        byArea[key] = { area: spot.area || '位置待补充', spots: [] };
        groups.push(byArea[key]);
      }
      byArea[key].spots.push(spot);
    });

    els.spotAtlasList.innerHTML = groups.map(function (group) {
      const places = group.spots.map(function (spot) {
        const content = '<span class="spot-place-main">' +
          '<span class="spot-place-name"><strong>' + esc(spot.name) + '</strong><span>' + (spot.preset ? '预置景点' : '自建景点') + '</span></span>' +
          '<span class="spot-place-address">' + esc(spot.address || '位置待补充') + '</span>' +
        '</span>' +
        '<span class="spot-place-meta' + (spot.visited ? '' : ' is-empty') + '">' +
          (spot.visited ? spot.visits.length + ' 次' : '未到访') +
        '</span>';
        if (spot.visited) {
          return '<button class="spot-place" type="button" data-spot="' + esc(spot.name) + '" aria-label="筛选' + esc(spot.name) + '的到访记录">' + content + '</button>';
        }
        return '<div class="spot-place is-unvisited">' + content + '</div>';
      }).join('');
      return '<div class="spot-area-group">' +
        '<div class="spot-area-title">' + esc(group.area) + '</div>' +
        '<div class="spot-place-list">' + places + '</div>' +
      '</div>';
    }).join('');
  }

  function removeActiveCity() {
    const name = state.activeCity;
    const stored = state.data.cities[name];
    if (!name || !stored) return;
    const message = stored.visits.length
      ? '移除「' + name + '」后，' + stored.visits.length + ' 次到访和照片都会从地图上消失，且无法恢复。'
      : '确定从地图上移除「' + name + '」吗？';
    openConfirm(message, '确认移除', function () {
      const old = state.data.cities[name];
      delete state.data.cities[name];
      const result = persist();
      if (!result.ok) {
        state.data.cities[name] = old;
        showToast('移除失败，本地存储暂时不可用');
        return;
      }
      closeModal('cityModal');
      state.activeCity = null;
      renderAll();
      showToast('已移除「' + name + '」');
    });
  }

  /* ---------- visit form ---------- */

  function setSpotOnlyMode(enabled) {
    state.spotOnlyMode = !!enabled;
    const sheet = els.visitModal.querySelector('.visit-sheet');
    if (sheet) sheet.classList.toggle('is-spot-only', !!enabled);
    els.visitTitle.textContent = enabled ? '添加一个地点' : '记录一次到访';
    const kicker = els.visitModal.querySelector('.sheet-kicker');
    if (kicker) kicker.textContent = enabled ? 'A NEW PLACE' : 'A NEW MEMORY';
    updateQuickMarkButton();
  }

  function updateQuickMarkButton() {
    if (!els.btnQuickMark) return;
    const selected = els.visitSpot.value;
    const spot = selected === '__custom__' ? els.customSpot.value.trim() : selected;
    els.btnQuickMark.disabled = !state.spotOnlyMode || !spot;
  }

  function openVisit() {
    const name = state.activeCity;
    const meta = getCityMeta(name);
    if (!meta) return;
    const visits = getVisits(name);
    const spots = getSpotsForCity(name);
    state.pendingPhoto = null;
    setSpotOnlyMode(false);
    state.photoToken += 1;
    state.isCompressing = false;
    state.isSaving = false;

    els.visitCityLabel.textContent = (meta.province ? meta.province + ' · ' : '') + name +
      (visits.length ? ' · 已到访 ' + visits.length + ' 次' : ' · 第一次到访');
    els.visitDate.value = todayISO();
    els.visitDate.max = todayISO();
    els.visitNote.value = '';
    els.noteCount.textContent = '0 / ' + NOTE_MAX;
    els.visitFormError.textContent = '';
    els.customSpot.value = '';
    els.customSpot.hidden = false;
    state.pendingSpotCoords = null;
    state.spotSearchResults = [];
    updateQuickMarkButton();
    els.btnSpotSearch.hidden = false;
    els.btnSpotSearch.disabled = false;
    els.btnSpotSearch.textContent = '在线查找这个地点';
    els.btnSpotPickMap.hidden = false;
    els.spotSearchResults.hidden = true;
    els.spotSearchResults.innerHTML = '';
    els.spotSearchHint.hidden = false;
    els.spotSearchHint.classList.remove('is-ok');
    els.spotSearchHint.textContent = '在线搜索由 OpenStreetMap 提供；选中结果后会自动填坐标。';
    els.batchSpotInput.value = '';
    els.batchSpotHint.textContent = '';
    els.btnBatchSpot.disabled = false;
    els.visitSpot.innerHTML = '<option value="">不选择景点</option>' +
      spots.map(function (spot) { return '<option value="' + esc(spot) + '">' + esc(spot) + '</option>'; }).join('') +
      '<option value="__custom__">＋ 自定义景点…</option>';
    const presetCount = presetSpotRecords(name).length;
    els.spotHint.textContent = presetCount
      ? name + '已预置 ' + presetCount + ' 个常用景点，也可以自由输入，并补充它在城里的位置。'
      : '选填。也可以自由输入新景点，并补充它在城里的位置。';
    els.spotLocationFields.hidden = true;
    els.spotArea.value = '';
    els.spotAddress.value = '';
    resetPhotoUI();
    openModal('visitModal');
  }

  function syncSpotLocationFields() {
    const selected = els.visitSpot.value;
    if (!selected) {
      els.spotLocationFields.hidden = true;
      els.spotArea.value = '';
      els.spotAddress.value = '';
      return;
    }
    els.spotLocationFields.hidden = false;
    if (selected === '__custom__') {
      els.spotArea.value = '';
      els.spotAddress.value = '';
      return;
    }
    const info = getSpotInfo(state.activeCity, selected);
    els.spotArea.value = info ? info.area || '' : '';
    els.spotAddress.value = info ? info.address || '' : '';
  }

  function openCitySpotSearch() {
    const name = state.pagerCity;
    if (!name) return;
    state.activeCity = name;
    openVisit();
    setSpotOnlyMode(true);
    els.visitSpot.value = '__custom__';
    toggleCustomSpot();
    syncSpotLocationFields();
    updateQuickMarkButton();
    window.setTimeout(function () {
      if (!els.visitModal.hidden) els.customSpot.focus();
    }, 120);
  }

  function restoreSpotDraft(draft, coords, hint) {
    if (!draft) return;
    state.activeCity = draft.city;
    openVisit();
    setSpotOnlyMode(true);
    els.visitSpot.value = '__custom__';
    toggleCustomSpot();
    syncSpotLocationFields();
    els.customSpot.value = draft.name;
    els.spotArea.value = draft.area;
    els.spotAddress.value = draft.address;
    state.pendingSpotCoords = coords || null;
    updateQuickMarkButton();
    clearSpotSearchResults();
    spotSearchHint(hint, !!coords);
    window.setTimeout(function () {
      if (!els.visitModal.hidden) els.customSpot.focus();
    }, 120);
  }

  function exitSpotPick() {
    state.spotPickMode = false;
    els.cityMapPage.classList.remove('is-spot-picking');
    els.spotPickBanner.hidden = true;
  }

  function completeSpotPick(latlng) {
    if (!state.spotPickMode || !state.spotPickDraft) return;
    const draft = state.spotPickDraft;
    const wgs = state.realMapProvider === 'amap'
      ? gcj02ToWgs84(latlng.lat, latlng.lng)
      : [latlng.lat, latlng.lng];
    exitSpotPick();
    state.spotPickDraft = null;
    restoreSpotDraft(draft, {
      name: draft.name,
      lat: wgs[0],
      lng: wgs[1]
    }, '已从地图取点：' + formatCoords(wgs[1], wgs[0]));
  }

  function cancelSpotPick(showMessage) {
    if (!state.spotPickMode) return;
    const draft = state.spotPickDraft;
    exitSpotPick();
    state.spotPickDraft = null;
    if (draft) {
      restoreSpotDraft(draft, null, '已取消地图点选，可以继续在线搜索。');
    }
    if (showMessage) showToast('在线地图暂不可用，无法在地图上点选');
  }

  function startSpotPick() {
    const cityName = state.activeCity;
    const name = els.customSpot.value.trim();
    if (!cityName) return;
    if (!name) {
      showVisitError('先输入要添加的地点名称，再在地图上点选。');
      els.customSpot.focus();
      return;
    }
    if (!getPagerCities().some(function (city) { return city.name === cityName; })) {
      showVisitError('先保存一条到访记录点亮城市，再使用地图点选。');
      return;
    }
    state.spotPickDraft = {
      city: cityName,
      name: name,
      area: els.spotArea.value.trim(),
      address: els.spotAddress.value.trim()
    };
    closeModal('visitModal');
    setView('map');
    state.pagerCity = cityName;
    renderPager();
    state.spotPickMode = true;
    els.spotPickText.textContent = '点击地图，选择「' + name + '」的位置';
    els.cityMapPage.classList.add('is-spot-picking');
    els.spotPickBanner.hidden = false;
    if (els.mapStage.scrollIntoView) {
      window.setTimeout(function () {
        els.mapStage.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 80);
    }
    window.setTimeout(function () {
      if (state.spotPickMode && (!state.realMapActive || state.mapFallbackActive)) {
        cancelSpotPick(true);
      }
    }, 260);
  }

  function resetPhotoUI() {
    state.pendingPhoto = null;
    els.photoInput.value = '';
    els.photoPreview.hidden = true;
    els.photoPreview.removeAttribute('src');
    els.photoPlaceholder.hidden = false;
    els.photoReplace.hidden = true;
    els.photoState.classList.remove('is-error');
    els.photoState.textContent = '照片会压缩后保存在本机 localStorage';
    const strong = els.photoPlaceholder.querySelector('strong');
    const small = els.photoPlaceholder.querySelector('small');
    if (strong) strong.textContent = '点击选择照片';
    if (small) small.textContent = '自动压缩到最长边 800px · JPEG 0.72';
    setSavingState(false);
  }

  function setSavingState(busy) {
    state.isCompressing = busy;
    els.btnSaveVisit.disabled = busy || state.isSaving;
    if (busy) {
      els.photoPreview.hidden = true;
      els.photoPlaceholder.hidden = false;
      els.photoReplace.hidden = true;
      const strong = els.photoPlaceholder.querySelector('strong');
      const small = els.photoPlaceholder.querySelector('small');
      if (strong) strong.textContent = '正在压缩照片…';
      if (small) small.textContent = '最长边 800px · JPEG 0.72';
      els.photoState.textContent = '正在处理照片，请稍候…';
      els.photoState.classList.remove('is-error');
    }
  }

  function showPhoto(dataURL, width, height) {
    const bytes = Math.round(dataURL.length * 0.75);
    state.pendingPhoto = dataURL;
    els.photoPreview.src = dataURL;
    els.photoPreview.hidden = false;
    els.photoPlaceholder.hidden = true;
    els.photoReplace.hidden = false;
    els.photoState.classList.remove('is-error');
    els.photoState.textContent = '已压缩 · ' + width + '×' + height + ' · 约 ' + formatBytes(bytes) + ' · 仅保存在本机';
    els.btnSaveVisit.disabled = false;
  }

  function compressImage(file) {
    return new Promise(function (resolve, reject) {
      if (!file || !file.type || file.type.indexOf('image/') !== 0) {
        reject(new Error('请选择一张图片文件。'));
        return;
      }
      const reader = new FileReader();
      reader.onerror = function () { reject(new Error('照片读取失败，请换一张试试。')); };
      reader.onload = function () {
        const image = new Image();
        image.onerror = function () { reject(new Error('这张图片无法解析，请换一张试试。')); };
        image.onload = function () {
          try {
            const longest = Math.max(image.naturalWidth, image.naturalHeight);
            const ratio = longest > PHOTO_MAX_EDGE ? PHOTO_MAX_EDGE / longest : 1;
            const width = Math.max(1, Math.round(image.naturalWidth * ratio));
            const height = Math.max(1, Math.round(image.naturalHeight * ratio));
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext('2d');
            if (!context) throw new Error('浏览器无法处理图片。');
            context.fillStyle = '#FFFFFF';
            context.fillRect(0, 0, width, height);
            context.imageSmoothingEnabled = true;
            context.imageSmoothingQuality = 'high';
            context.drawImage(image, 0, 0, width, height);
            const dataURL = canvas.toDataURL('image/jpeg', PHOTO_QUALITY);
            if (!dataURL || dataURL === 'data:,' || dataURL.length < 100) {
              throw new Error('照片压缩失败，请换一张试试。');
            }
            const bytes = Math.round(dataURL.length * 0.75);
            if (bytes > PHOTO_MAX_BYTES) {
              throw new Error('照片压缩后仍然偏大，请选择更小的一张。');
            }
            resolve({ dataURL: dataURL, width: width, height: height, bytes: bytes });
          } catch (error) {
            reject(error);
          }
        };
        image.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    });
  }

  async function handlePhotoChange(event) {
    const file = event.target.files && event.target.files[0];
    els.photoInput.value = '';
    if (!file) return;
    els.visitFormError.textContent = '';
    state.pendingPhoto = null;
    state.photoToken += 1;
    const token = state.photoToken;
    setSavingState(true);
    try {
      const result = await compressImage(file);
      if (token !== state.photoToken) return;
      showPhoto(result.dataURL, result.width, result.height);
    } catch (error) {
      if (token !== state.photoToken) return;
      resetPhotoUI();
      els.photoState.classList.add('is-error');
      els.photoState.textContent = error.message || '照片处理失败，请换一张试试。';
      els.visitFormError.textContent = error.message || '照片处理失败，请换一张试试。';
    } finally {
      if (token === state.photoToken) {
        state.isCompressing = false;
        els.btnSaveVisit.disabled = state.isSaving;
      }
    }
  }

  function spotSearchHint(text, ok) {
    els.spotSearchHint.hidden = false;
    els.spotSearchHint.textContent = text;
    els.spotSearchHint.classList.toggle('is-ok', !!ok);
  }

  function clearSpotSearchResults() {
    state.spotSearchResults = [];
    els.spotSearchResults.hidden = true;
    els.spotSearchResults.innerHTML = '';
  }

  async function reverseZh(lat, lng) {
    try {
      const res = await fetch(
        'https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=' + lat +
          '&longitude=' + lng + '&localityLanguage=zh',
        { signal: AbortSignal.timeout(5000) }
      );
      if (!res.ok) return null;
      const j = await res.json();
      const area = j.locality || j.city || j.principalSubdivision || '';
      const address = [j.city, j.locality, j.principalSubdivision].filter(Boolean).join(' · ');
      const name = j.locality || j.city || '';
      if (!area && !name) return null;
      return { area: area, address: address, name: name };
    } catch (e) {
      return null;
    }
  }

  async function selectSpotSearchResult(index) {
    const result = state.spotSearchResults[index];
    if (!result) return;

    let name = result.name || '';
    const pin = { name: name, lat: result.lat, lng: result.lng };

    els.visitSpot.value = '__custom__';
    toggleCustomSpot();
    syncSpotLocationFields();
    state.pendingSpotCoords = pin;
    updateQuickMarkButton();
    els.customSpot.value = name;
    els.spotArea.value = result.area || '';
    els.spotAddress.value = result.address || '';
    els.spotLocationFields.hidden = false;
    clearSpotSearchResults();
    spotSearchHint('已定位：' + name + ' · ' + formatCoords(result.lng, result.lat) + '，正在补中文地址…', true);
    els.visitFormError.textContent = '';

    const zh = await reverseZh(result.lat, result.lng);
    if (zh) {
      if (zh.area) els.spotArea.value = zh.area;
      if (zh.address) els.spotAddress.value = zh.address;
      if (!/[\u4e00-\u9fa5]/.test(name) && zh.name) {
        name = zh.name;
        pin.name = name;
        els.customSpot.value = name;
      }
      spotSearchHint('已定位：' + name + ' · ' + formatCoords(result.lng, result.lat), true);
    }
  }

  function renderSpotSearchResults(results) {
    state.spotSearchResults = results;
    if (!results.length) {
      clearSpotSearchResults();
      spotSearchHint('没有找到匹配地点，或在线搜索被网络拦截。可以换个关键词，或点“在地图上点选位置”。', false);
      return;
    }
    els.spotSearchResults.hidden = false;
    els.spotSearchResults.innerHTML = results.map(function (result, index) {
      return '<button class="spot-search-result" type="button" data-index="' + index + '">' +
        '<strong>' + esc(result.name) + '</strong>' +
        '<span>' + esc([result.area, result.address].filter(Boolean).join(' · ')) + '</span>' +
        '</button>';
    }).join('');
    spotSearchHint('找到 ' + results.length + ' 个地点，点一个填入坐标。', false);
  }

  async function geocodeBatchPlace(query, cityLat, cityLng) {
    let results = [];
    try {
      const res = await fetch('https://photon.komoot.io/api/?limit=5&q=' + encodeURIComponent(query), {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(7000)
      });
      if (res.ok) {
        const json = await res.json();
        results = (json.features || []).map(function (feature) {
          const p = feature.properties || {};
          const coords = (feature.geometry && feature.geometry.coordinates) || [];
          const lng = Number(coords[0]);
          const lat = Number(coords[1]);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
          return {
            name: p.name || query,
            area: p.district || p.city || p.county || p.state || '',
            address: [p.street, p.housenumber, p.city, p.state].filter(Boolean).join(' ') || p.label || '',
            lat: lat,
            lng: lng
          };
        }).filter(Boolean);
      }
    } catch (error) { /* try Nominatim */ }
    if (!results.length) {
      try {
        const params = new URLSearchParams({ format: 'jsonv2', limit: '4', 'accept-language': 'zh-CN', q: query });
        const res = await fetch('https://nominatim.openstreetmap.org/search?' + params.toString(), {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(7000)
        });
        if (res.ok) {
          const json = await res.json();
          results = json.map(function (item) {
            const address = item.address || {};
            return {
              name: item.name || String(item.display_name || query).split(',')[0],
              area: address.city || address.town || address.county || address.state || '',
              address: String(item.display_name || '').split(',').slice(0, 3).join(' · '),
              lat: Number(item.lat),
              lng: Number(item.lon)
            };
          }).filter(function (item) { return Number.isFinite(item.lat) && Number.isFinite(item.lng); });
        }
      } catch (error) { /* skip */ }
    }
    results.sort(function (a, b) {
      return haversineKm(cityLat, cityLng, a.lat, a.lng) - haversineKm(cityLat, cityLng, b.lat, b.lng);
    });
    return results.filter(function (item) {
      return haversineKm(cityLat, cityLng, item.lat, item.lng) <= 300;
    })[0] || results[0] || null;
  }

  async function batchMarkSpots() {
    if (!state.activeCity) return;
    const name = state.activeCity;
    const meta = getCityMeta(name);
    if (!meta) return;
    const raw = els.batchSpotInput.value.split(/[\n,，、;；]+/).map(function (item) { return item.trim(); }).filter(Boolean);
    const names = uniqueStrings(raw).slice(0, 10);
    if (!names.length) {
      els.batchSpotHint.textContent = '每行输入一个地点名称。';
      els.batchSpotInput.focus();
      return;
    }
    const oldCity = state.data.cities[name];
    const base = oldCity
      ? { name: oldCity.name, lng: oldCity.lng, lat: oldCity.lat, province: oldCity.province, spots: oldCity.spots.slice(), spotInfo: oldCity.spotInfo.slice(), visits: oldCity.visits.slice() }
      : { name: name, lng: meta.lng, lat: meta.lat, province: meta.province || '自定义', spots: [], spotInfo: [], visits: [] };
    const visited = Object.create(null);
    base.visits.forEach(function (visit) { if (visit.spot) visited[visit.spot] = true; });
    const presetNames = Object.create(null);
    presetSpots(name).forEach(function (spot) { presetNames[spot] = true; });
    let added = 0;
    const failed = [];
    els.btnBatchSpot.disabled = true;
    for (let i = 0; i < names.length; i++) {
      const spot = names[i];
      els.batchSpotHint.textContent = '正在处理 ' + (i + 1) + ' / ' + names.length + '：' + spot;
      if (visited[spot]) continue;
      let wgs = spotWgs(name, spot);
      let area = '';
      let address = '';
      if (!wgs) {
        const result = await geocodeBatchPlace(spot, meta.lat, meta.lng);
        if (!result) {
          failed.push(spot);
          await new Promise(function (r) { setTimeout(r, 260); });
          continue;
        }
        wgs = [result.lat, result.lng];
        area = result.area || '';
        address = result.address || '';
      }
      if (!presetNames[spot] && base.spots.indexOf(spot) === -1) base.spots.push(spot);
      if (!presetNames[spot]) {
        const entry = { name: spot, area: area.slice(0, 20), address: address.slice(0, 40), lat: wgs[0], lng: wgs[1] };
        const index = base.spotInfo.findIndex(function (item) { return item.name === spot; });
        if (index >= 0) base.spotInfo[index] = entry;
        else base.spotInfo.push(entry);
      }
      base.visits.push({
        id: makeId('v'),
        date: todayISO(),
        photo: '',
        note: '地图标记',
        spot: spot,
        createdAt: Date.now()
      });
      visited[spot] = true;
      added += 1;
      await new Promise(function (r) { setTimeout(r, 260); });
    }
    els.btnBatchSpot.disabled = false;
    if (!added) {
      els.batchSpotHint.textContent = failed.length
        ? '没有标记成功：' + failed.join('、') + '。可以检查网络或改用地图点选。'
        : '这些地点已经在到访记录里了。';
      return;
    }
    base.visits.sort(compareVisits);
    state.data.cities[name] = base;
    const result = persist();
    if (!result.ok) {
      if (oldCity) state.data.cities[name] = oldCity;
      else delete state.data.cities[name];
      els.batchSpotHint.textContent = '本地存储写入失败。';
      return;
    }
    closeModal('visitModal');
    state.spotFilter = 'all';
    renderAll();
    showToast('批量标记了 ' + added + ' 个地点' + (failed.length ? '，' + failed.length + ' 个未找到' : ''));
  }

  async function fetchNominatim(query) {
    try {
      const params = new URLSearchParams({
        format: 'jsonv2',
        limit: '8',
        'accept-language': 'zh-CN',
        q: query
      });
      const res = await fetch('https://nominatim.openstreetmap.org/search?' + params.toString(), {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(6000)
      });
      if (!res.ok) return [];
      const json = await res.json();
      return json.map(function (item) {
        const address = item.address || {};
        return {
          name: item.name || String(item.display_name || query).split(',')[0],
          area: address.city || address.town || address.county || address.state || '',
          address: String(item.display_name || '').split(',').slice(0, 3).join(' · '),
          lat: Number(item.lat),
          lng: Number(item.lon)
        };
      }).filter(function (item) {
        return Number.isFinite(item.lat) && Number.isFinite(item.lng);
      });
    } catch (e) {
      return [];
    }
  }

  async function searchSpotPlace() {
    const query = els.customSpot.value.trim();
    if (!query) {
      showVisitError('先输入要查找的地点名称，例如：武汉大学。');
      els.customSpot.focus();
      return;
    }
    els.visitFormError.textContent = '';
    state.pendingSpotCoords = null;
    updateQuickMarkButton();
    clearSpotSearchResults();
    els.btnSpotSearch.disabled = true;
    els.btnSpotSearch.textContent = '搜索中…';
    spotSearchHint('正在在线查找地点…', false);
    const meta = getCityMeta(state.activeCity);
    const cityLat = meta ? meta.lat : 35;
    const cityLng = meta ? meta.lng : 105;
    let results = [];
    // 并行查一条中文结果，Photon 返回英文时用它覆盖
    const zhTask = fetchNominatim(query);
    try {
      const controller = new AbortController();
      const timer = window.setTimeout(function () { controller.abort(); }, 9000);
      try {
        const res = await fetch('https://photon.komoot.io/api/?limit=8&q=' + encodeURIComponent(query), {
          headers: { 'Accept': 'application/json' },
          signal: controller.signal
        });
        if (res.ok) {
          const json = await res.json();
          results = (json.features || []).map(function (feature) {
            const p = feature.properties || {};
            const geometry = feature.geometry || {};
            const coords = geometry.coordinates || [];
            const lng = Number(coords[0]);
            const lat = Number(coords[1]);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
            return {
              name: p.name || query,
              area: p.district || p.city || p.county || p.state || '',
              address: [p.street, p.housenumber, p.city, p.state].filter(Boolean).join(' ') || p.label || '',
              lat: lat,
              lng: lng
            };
          }).filter(Boolean);
        }
      } finally {
        window.clearTimeout(timer);
      }
      if (!results.length) {
        const params = new URLSearchParams({ format: 'jsonv2', limit: '6', 'accept-language': 'zh-CN', q: query });
        const res = await fetch('https://nominatim.openstreetmap.org/search?' + params.toString(), {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(9000)
        });
        if (res.ok) {
          const json = await res.json();
          results = json.map(function (item) {
            const address = item.address || {};
            return {
              name: item.name || String(item.display_name || query).split(',')[0],
              area: address.city || address.town || address.county || address.state || '',
              address: String(item.display_name || '').split(',').slice(0, 3).join(' · '),
              lat: Number(item.lat),
              lng: Number(item.lon)
            };
          }).filter(function (item) { return Number.isFinite(item.lat) && Number.isFinite(item.lng); });
        }
      }
    } catch (error) {
      results = [];
    } finally {
      els.btnSpotSearch.disabled = false;
      els.btnSpotSearch.textContent = '在线查找这个地点';
    }
    results.sort(function (a, b) {
      return haversineKm(cityLat, cityLng, a.lat, a.lng) - haversineKm(cityLat, cityLng, b.lat, b.lng);
    });
    const nearby = results.filter(function (item) {
      return haversineKm(cityLat, cityLng, item.lat, item.lng) <= 300;
    });
    renderSpotSearchResults((nearby.length ? nearby : results).slice(0, 6));

    const hasChinese = results.some(function (item) {
      return /[\u4e00-\u9fa5]/.test(String(item.name || '').slice(0, 1));
    });

    if (results.length && !hasChinese) {
      zhTask.then(function (zh) {
        if (!zh || !zh.length) return;
        const zhHasChinese = zh.some(function (item) {
          return /[\u4e00-\u9fa5]/.test(String(item.name || '').slice(0, 1));
        });
        if (!zhHasChinese) return;
        const zhNearby = zh.filter(function (item) {
          return haversineKm(cityLat, cityLng, item.lat, item.lng) <= 300;
        });
        renderSpotSearchResults((zhNearby.length ? zhNearby : zh).slice(0, 6));
        spotSearchHint('已换成中文结果', true);
      });
    }
  }

  function toggleCustomSpot() {
    const custom = els.visitSpot.value === '__custom__';
    if (!custom) {
      state.pendingSpotCoords = null;
      updateQuickMarkButton();
      clearSpotSearchResults();
    } else {
      spotSearchHint('输入地点名，点“在线查找这个地点”自动填坐标。', false);
      updateQuickMarkButton();
      window.setTimeout(function () { els.customSpot.focus(); }, 40);
    }
  }

  function saveQuickSpot() {
    if (!state.activeCity) return;
    const name = state.activeCity;
    const meta = getCityMeta(name);
    if (!meta) return;
    const spot = els.visitSpot.value === '__custom__' ? els.customSpot.value.trim() : els.visitSpot.value.trim();
    if (!spot) return showVisitError('先选择或输入一个地点。');
    const preset = getPresetSpotInfo(name, spot);
    const coords = state.pendingSpotCoords;
    if (!preset && (!coords || coords.name !== spot)) {
      return showVisitError('先在线查找并选择一个地点结果，或在地图上点选位置，才能标到地图上。');
    }
    const area = els.spotArea.value.trim().slice(0, 20);
    const address = els.spotAddress.value.trim().slice(0, 40);
    const oldCity = state.data.cities[name];
    const base = oldCity
      ? { name: oldCity.name, lng: oldCity.lng, lat: oldCity.lat, province: oldCity.province, spots: oldCity.spots.slice(), spotInfo: oldCity.spotInfo.slice(), visits: oldCity.visits.slice() }
      : { name: name, lng: meta.lng, lat: meta.lat, province: meta.province || '自定义', spots: [], spotInfo: [], visits: [] };
    if (!preset && base.spots.indexOf(spot) === -1) base.spots.push(spot);
    if (!preset) {
      const entry = {
        name: spot,
        area: area,
        address: address,
        lat: coords.lat,
        lng: coords.lng
      };
      const index = base.spotInfo.findIndex(function (item) { return item.name === spot; });
      if (index >= 0) base.spotInfo[index] = entry;
      else base.spotInfo.push(entry);
    }
    base.visits.push({
      id: makeId('v'),
      date: todayISO(),
      photo: '',
      note: '地图标记',
      spot: spot,
      createdAt: Date.now()
    });
    base.visits.sort(compareVisits);
    state.data.cities[name] = base;
    const result = persist();
    if (!result.ok) {
      if (oldCity) state.data.cities[name] = oldCity;
      else delete state.data.cities[name];
      return showVisitError('本地存储写入失败，可能是浏览器空间不足。');
    }
    state.pendingSpotCoords = null;
    state.spotFilter = 'all';
    closeModal('visitModal');
    renderAll();
    showToast('已把「' + spot + '」标到地图上');
  }

  function saveVisit() {
    if (state.isCompressing || state.isSaving || !state.activeCity) return;
    els.visitFormError.textContent = '';
    const name = state.activeCity;
    const meta = getCityMeta(name);
    const date = els.visitDate.value;
    const note = els.visitNote.value.trim();
    const photo = state.pendingPhoto;
    let spot = els.visitSpot.value === '__custom__' ? els.customSpot.value.trim() : els.visitSpot.value.trim();
    const spotArea = els.spotArea.value.trim();
    const spotAddress = els.spotAddress.value.trim();

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return showVisitError('请选择到访日期。');
    if (date > todayISO()) return showVisitError('到访日期不能晚于今天。');
    if (!note) return showVisitError('写一句那天的备注吧。');
    if (note.length > NOTE_MAX) return showVisitError('备注最多 ' + NOTE_MAX + ' 个字。');
    if (els.visitSpot.value === '__custom__' && !spot) return showVisitError('请输入新的景点名称，或选择“不选择景点”。');
    if (spot.length > 20) return showVisitError('景点名称最多 20 个字。');
    if (spotArea.length > 20) return showVisitError('所在区域最多 20 个字。');
    if (spotAddress.length > 40) return showVisitError('具体位置最多 40 个字。');

    const oldCity = state.data.cities[name];
    const base = oldCity
      ? { name: oldCity.name, lng: oldCity.lng, lat: oldCity.lat, province: oldCity.province, spots: oldCity.spots.slice(), spotInfo: oldCity.spotInfo.slice(), visits: oldCity.visits.slice() }
      : { name: name, lng: meta.lng, lat: meta.lat, province: meta.province || '自定义', spots: [], spotInfo: [], visits: [] };
    if (spot && presetSpots(name).indexOf(spot) === -1 && base.spots.indexOf(spot) === -1) {
      base.spots.push(spot);
    }
    const pendingCoords = state.pendingSpotCoords && state.pendingSpotCoords.name === spot ? state.pendingSpotCoords : null;
    if (spot && (spotArea || spotAddress || pendingCoords)) {
      const preset = getPresetSpotInfo(name, spot);
      const unchangedPreset = preset && preset.area === spotArea && preset.address === spotAddress && !pendingCoords;
      if (!unchangedPreset) {
        const index = base.spotInfo.findIndex(function (item) { return item.name === spot; });
        const existing = index >= 0 ? base.spotInfo[index] : null;
        const entry = { name: spot, area: spotArea, address: spotAddress };
        if (pendingCoords) {
          entry.lat = pendingCoords.lat;
          entry.lng = pendingCoords.lng;
        } else if (existing && Number.isFinite(existing.lat) && Number.isFinite(existing.lng)) {
          entry.lat = existing.lat;
          entry.lng = existing.lng;
        }
        if (index >= 0) base.spotInfo[index] = entry;
        else base.spotInfo.push(entry);
      }
    }
    base.visits.push({
      id: makeId('v'),
      date: date,
      photo: photo,
      note: note,
      spot: spot,
      createdAt: Date.now()
    });
    base.visits.sort(compareVisits);
    state.data.cities[name] = base;
    state.isSaving = true;
    els.btnSaveVisit.disabled = true;
    els.btnSaveVisit.textContent = '正在保存…';
    const result = persist();
    state.isSaving = false;
    els.btnSaveVisit.textContent = '保存这段足迹';

    if (!result.ok) {
      if (oldCity) state.data.cities[name] = oldCity;
      else delete state.data.cities[name];
      els.btnSaveVisit.disabled = false;
      return showVisitError('本地存储空间不足，照片没有保存成功。可以先移除一些城市记录，再试一次。');
    }

    state.pendingPhoto = null;
    state.pendingSpotCoords = null;
    state.spotFilter = 'all';
    closeModal('visitModal');
    renderAll();
    showToast('已记录「' + name + '」的这次到访');
    if (result.bytes > 3.6 * 1024 * 1024) {
      window.setTimeout(function () {
        showToast('本地空间接近上限，建议移除部分城市记录');
      }, 1500);
    }
  }

  function showVisitError(message) {
    els.visitFormError.textContent = message;
  }

  /* ---------- confirm dialog ---------- */

  function openConfirm(message, confirmLabel, onConfirm) {
    const existing = document.getElementById('confirmModal');
    if (existing) existing.remove();
    const modal = document.createElement('div');
    modal.className = 'modal confirm-modal';
    modal.id = 'confirmModal';
    modal.innerHTML =
      '<div class="modal-backdrop" data-confirm-close aria-hidden="true"></div>' +
      '<div class="sheet confirm-sheet" role="dialog" aria-modal="true" aria-label="确认操作">' +
        '<span class="confirm-icon" aria-hidden="true">' + ICONS.pin + '</span>' +
        '<h2>再确认一下</h2>' +
        '<p>' + esc(message) + '</p>' +
        '<div class="confirm-actions">' +
          '<button class="confirm-cancel" type="button">再想想</button>' +
          '<button class="confirm-ok" type="button">' + esc(confirmLabel || '确认') + '</button>' +
        '</div>' +
      '</div>';
    els.app.appendChild(modal);
    openModal('confirmModal');

    function close(after) {
      closeModal('confirmModal');
      window.setTimeout(function () {
        modal.remove();
        if (typeof after === 'function') after();
      }, 220);
    }
    modal.querySelector('[data-confirm-close]').addEventListener('click', function () { close(null); });
    modal.querySelector('.confirm-cancel').addEventListener('click', function () { close(null); });
    modal.querySelector('.confirm-ok').addEventListener('click', function () { close(onConfirm); });
  }

  /* ---------- modal helpers ---------- */

  function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modalFocus[id] = document.activeElement;
    modal.hidden = false;
    els.appScroll.classList.add('is-locked');
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    const previous = modalFocus[id];
    delete modalFocus[id];
    const anyOpen = ['addCityModal', 'cityModal', 'visitModal', 'mapDataModal', 'confirmModal'].some(function (modalId) {
      const item = document.getElementById(modalId);
      return item && !item.hidden;
    });
    if (!anyOpen) els.appScroll.classList.remove('is-locked');
    if (previous && typeof previous.focus === 'function') {
      window.setTimeout(function () {
        if (document.contains(previous) && previous.offsetParent !== null) {
          try { previous.focus({ preventScroll: true }); } catch (error) { /* noop */ }
        }
      }, 20);
    }
  }

  function closeByName(name) {
    const map = { addCity: 'addCityModal', city: 'cityModal', visit: 'visitModal', mapData: 'mapDataModal' };
    if (map[name]) closeModal(map[name]);
  }

  function closeTopModal() {
    if (!els.visitModal.hidden) return closeModal('visitModal');
    if (document.getElementById('confirmModal') && !document.getElementById('confirmModal').hidden) return closeModal('confirmModal');
    if (!els.cityModal.hidden) return closeModal('cityModal');
    if (!els.mapDataModal.hidden) return closeModal('mapDataModal');
    if (!els.addCityModal.hidden) return closeModal('addCityModal');
  }

  /* ---------- events ---------- */

  function updateMapDataPanel() {
    const seed = window.TRAVEL_SEED;
    const seedVersion = seed ? Number(seed.version) || 1 : 0;
    let storedVersion = 0;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) storedVersion = Number(JSON.parse(raw).seedVersion) || 0;
    } catch (e) {}

    function set(id, value) {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    }

    set('statCityCount', (window.TravelCities && window.TravelCities.CITIES.length) || 0);
    set('statRegionCount', Object.keys(CITY_REGIONS).length);
    set('statSeedVisits', seed
      ? Object.keys(seed.cities || {}).reduce(function (n, k) {
          return n + ((seed.cities[k].visits || []).length);
        }, 0)
      : 0);
    set('statDataVersion', storedVersion || '无');
    set('statSeedVersion', seedVersion || '无');
  }

  function applySeedNow() {
    const seed = window.TRAVEL_SEED;
    if (!seed) {
      showToast('安装包里没有内置足迹');
      return;
    }
    const data = normalizeData(seed);
    data.seedVersion = Number(seed.version) || 1;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      showToast('本地写入失败，可能是存储空间不足');
      return;
    }
    window.location.reload();
  }

  function bindEvents() {
    els.tabMap.addEventListener('click', function () { setView('map'); });
    els.tabList.addEventListener('click', function () { setView('list'); });
    els.btnSeeAll.addEventListener('click', function () { setView('list'); });
    els.btnAddCity.addEventListener('click', openAddCity);
    els.btnEmptyAdd.addEventListener('click', openAddCity);
    els.btnConfirmCity.addEventListener('click', addCity);
    els.btnMapPick.addEventListener('click', startMapPick);
    els.mapPickCancel.addEventListener('click', cancelMapPick);
    els.mapStage.addEventListener('click', handleMapPick, true);
    [els.btnMapDataInfo, els.btnMapDataInfoTop].forEach(function (button) {
      if (!button) return;
      button.addEventListener('click', function () {
        updateMapDataPanel();
        openModal('mapDataModal');
      });
    });
    const btnApplySeed = document.getElementById('btnApplySeed');
    if (btnApplySeed) {
      btnApplySeed.addEventListener('click', function () {
        openConfirm('会用安装包里的足迹替换本地数据，本地新增的记录会消失。确定吗？', '覆盖', applySeedNow);
      });
    }
    els.btnReloadMapData.addEventListener('click', function () {
      window.location.reload();
    });

    els.citySearch.addEventListener('input', function () {
      state.selectedCity = null;
      renderCitySuggestions(els.citySearch.value);
      updateCoordPreview();
    });
    els.citySearch.addEventListener('focus', function () {
      if (!state.selectedCity) renderCitySuggestions(els.citySearch.value);
    });
    els.citySearch.addEventListener('keydown', function (event) {
      const count = state.citySuggestions.length;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (!count) {
          renderCitySuggestions(els.citySearch.value);
          return;
        }
        const direction = event.key === 'ArrowDown' ? 1 : -1;
        state.suggestionIndex = (state.suggestionIndex + direction + count) % count;
        updateSuggestionActive();
      } else if (event.key === 'Enter') {
        if (!count) return;
        event.preventDefault();
        const city = state.citySuggestions[Math.max(0, state.suggestionIndex)];
        if (city) selectCity(city);
      } else if (event.key === 'Escape') {
        if (!els.citySuggestions.hidden) {
          event.stopPropagation();
          hideCitySuggestions();
        }
      }
    });
    els.citySuggestions.addEventListener('click', function (event) {
      const item = event.target.closest('.city-suggestion[data-city]');
      if (!item) return;
      const city = CITY_MAP[item.getAttribute('data-city')];
      if (city) selectCity(city);
    });
    els.addCityModal.addEventListener('click', function (event) {
      if (!event.target.closest('.city-search-field')) hideCitySuggestions();
    });

    [els.manualName, els.manualLng, els.manualLat].forEach(function (input) {
      input.addEventListener('input', function () {
        hideCitySuggestions();
        updateCoordPreview();
      });
    });

    els.cityLayer.addEventListener('click', function (event) {
      if (state.mapPickMode) return;
      const node = event.target.closest('.city-region.is-lit, .city-region.is-pending, .city-node.is-lit, .city-node.is-pending');
      if (!node) return;
      const name = node.getAttribute('data-city');
      if (node.classList.contains('is-lit')) showCityPage(name);
      else openCity(name);
    });
    els.cityLayer.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const node = event.target.closest('.city-region.is-lit, .city-region.is-pending, .city-node.is-lit, .city-node.is-pending');
      if (!node) return;
      event.preventDefault();
      const name = node.getAttribute('data-city');
      if (node.classList.contains('is-lit')) showCityPage(name);
      else openCity(name);
    });

    els.mapPrev.addEventListener('click', function () { goPager(-1); });
    els.mapNext.addEventListener('click', function () { goPager(1); });
    els.mapPagerStrip.addEventListener('click', function (event) {
      const chip = event.target.closest('.pager-chip[data-page]');
      if (!chip) return;
      setPagerPage(Number(chip.getAttribute('data-page')));
    });
    els.cityPins.addEventListener('click', function (event) {
      if (state.panJustMoved) {
        state.panJustMoved = false;
        return;
      }
      const pin = event.target.closest('.city-pin[data-index]');
      if (!pin) return;
      selectCitySpot(Number(pin.getAttribute('data-index')), true);
    });
    els.citySpotLegend.addEventListener('click', function (event) {
      const chip = event.target.closest('.city-spot-chip[data-index]');
      if (!chip) return;
      selectCitySpot(Number(chip.getAttribute('data-index')), true);
    });
    els.btnCityMapDetail.addEventListener('click', function () {
      if (state.pagerCity) openCity(state.pagerCity);
    });
    els.cityRealMapToggle.addEventListener('click', toggleRealMap);
    els.cityMapRetry.addEventListener('click', function () {
      if (!state.pagerCity) return;
      hideMapFallback();
      resetRealMapInstance();
      openRealMap(state.pagerCity);
    });
    els.cityZoomIn.addEventListener('click', function () { setCityZoom(state.cityZoom + 0.5); });
    els.cityZoomOut.addEventListener('click', function () { setCityZoom(state.cityZoom - 0.5); });
    els.cityZoomReset.addEventListener('click', function () { resetCityZoom(); });

    els.cityMapPage.addEventListener('wheel', function (event) {
      if (els.cityMapPage.hidden || state.realMapActive || state.mapFallbackActive) return;
      event.preventDefault();
      setCityZoom(state.cityZoom + (event.deltaY < 0 ? 0.35 : -0.35));
    }, { passive: false });

    els.cityMapPage.addEventListener('touchstart', function (event) {
      if (state.realMapActive || state.mapFallbackActive || event.touches.length !== 2) return;
      event.preventDefault();
      state.panState = null;
      state.swipeStart = null;
      const a = event.touches[0];
      const b = event.touches[1];
      state.pinchState = {
        distance: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
        zoom: state.cityZoom
      };
    }, { passive: false });
    els.cityMapPage.addEventListener('touchmove', function (event) {
      if (state.realMapActive || state.mapFallbackActive || event.touches.length !== 2 || !state.pinchState) return;
      event.preventDefault();
      const a = event.touches[0];
      const b = event.touches[1];
      const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      if (!state.pinchState.distance) return;
      setCityZoom(state.pinchState.zoom * (distance / state.pinchState.distance));
    }, { passive: false });
    els.cityMapPage.addEventListener('touchend', function (event) {
      if (event.touches.length < 2) state.pinchState = null;
    });

    els.mapStage.addEventListener('pointerdown', function (event) {
      if (state.realMapActive || state.mapFallbackActive) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (state.pinchState) return;
      state.panJustMoved = false;
      if (!els.cityMapPage.hidden && state.cityZoom > 1.01) {
        state.panState = {
          x: event.clientX,
          y: event.clientY,
          panX: state.cityPanX,
          panY: state.cityPanY,
          id: event.pointerId
        };
        state.swipeStart = null;
        if (typeof els.mapStage.setPointerCapture === 'function') {
          try { els.mapStage.setPointerCapture(event.pointerId); } catch (error) { /* noop */ }
        }
        return;
      }
      state.swipeStart = { x: event.clientX, y: event.clientY };
    });
    els.mapStage.addEventListener('pointermove', function (event) {
      if (state.realMapActive || state.mapFallbackActive || !state.panState || state.panState.id !== event.pointerId) return;
      const dx = event.clientX - state.panState.x;
      const dy = event.clientY - state.panState.y;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) state.panJustMoved = true;
      state.cityPanX = state.panState.panX + dx;
      state.cityPanY = state.panState.panY + dy;
      applyCityTransform();
    });
    els.mapStage.addEventListener('pointerup', function (event) {
      if (state.realMapActive || state.mapFallbackActive || state.mapPickMode) return;
      if (state.panState && state.panState.id === event.pointerId) {
        state.panState = null;
        state.swipeStart = null;
        return;
      }
      if (!state.swipeStart) return;
      const dx = event.clientX - state.swipeStart.x;
      const dy = event.clientY - state.swipeStart.y;
      state.swipeStart = null;
      if (!els.cityMapPage.hidden && state.cityZoom > 1.01) return;
      if (Math.abs(dx) > 46 && Math.abs(dx) > Math.abs(dy) * 1.35) {
        goPager(dx < 0 ? 1 : -1);
      }
    });
    els.mapStage.addEventListener('pointercancel', function () {
      state.swipeStart = null;
      state.panState = null;
    });

    els.recentList.addEventListener('click', function (event) {
      const card = event.target.closest('[data-city]');
      if (card) openCity(card.getAttribute('data-city'));
    });
    els.cityList.addEventListener('click', function (event) {
      const card = event.target.closest('[data-city]');
      if (card) openCity(card.getAttribute('data-city'));
    });

    els.spotChips.addEventListener('click', function (event) {
      const chip = event.target.closest('.spot-chip');
      if (!chip) return;
      state.spotFilter = chip.getAttribute('data-spot') === '__all__' ? 'all' : chip.getAttribute('data-spot');
      renderCityDetail();
    });
    els.spotAtlasList.addEventListener('click', function (event) {
      const place = event.target.closest('.spot-place[data-spot]');
      if (!place) return;
      state.spotFilter = place.getAttribute('data-spot');
      renderCityDetail();
    });

    els.btnAddVisit.addEventListener('click', openVisit);
    els.btnCityEmptyAdd.addEventListener('click', openVisit);
    els.btnCityAddSpot.addEventListener('click', openCitySpotSearch);
    els.btnRemoveCity.addEventListener('click', removeActiveCity);

    els.visitDate.addEventListener('input', function () { els.visitFormError.textContent = ''; });
    els.visitNote.addEventListener('input', function () {
      els.noteCount.textContent = els.visitNote.value.length + ' / ' + NOTE_MAX;
      els.visitFormError.textContent = '';
    });
    els.visitSpot.addEventListener('change', function () {
      toggleCustomSpot();
      syncSpotLocationFields();
      updateQuickMarkButton();
    });

    [els.spotArea, els.spotAddress].forEach(function (input) {
      input.addEventListener('input', function () { els.visitFormError.textContent = ''; });
    });
    els.btnSpotSearch.addEventListener('click', searchSpotPlace);
    els.btnBatchSpot.addEventListener('click', batchMarkSpots);
    els.btnSpotPickMap.addEventListener('click', startSpotPick);
    els.spotPickCancel.addEventListener('click', function () { cancelSpotPick(false); });
    els.customSpot.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        searchSpotPlace();
      }
    });
    els.customSpot.addEventListener('input', function () {
      if (state.pendingSpotCoords && state.pendingSpotCoords.name !== els.customSpot.value.trim()) {
        state.pendingSpotCoords = null;
        clearSpotSearchResults();
        spotSearchHint('地点名已修改，可以重新查找坐标。', false);
      }
      updateQuickMarkButton();
      els.visitFormError.textContent = '';
    });
    els.spotSearchResults.addEventListener('click', function (event) {
      const result = event.target.closest('.spot-search-result[data-index]');
      if (!result) return;
      selectSpotSearchResult(Number(result.getAttribute('data-index')));
    });
    els.photoInput.addEventListener('change', handlePhotoChange);
    els.btnSaveVisit.addEventListener('click', saveVisit);
    els.btnQuickMark.addEventListener('click', saveQuickSpot);

    document.querySelectorAll('[data-close]').forEach(function (element) {
      element.addEventListener('click', function () { closeByName(element.getAttribute('data-close')); });
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeTopModal();
    });

    window.addEventListener('offline', function () {
      if (state.realMapActive && state.pagerCity) showMapFallback(state.pagerCity);
    });
    window.addEventListener('resize', function () {
      window.clearTimeout(bindEvents.resizeTimer);
      bindEvents.resizeTimer = window.setTimeout(function () {
        scheduleLabels();
        if (state.pagerCity && !els.cityMapPage.hidden) {
          applyCityTransform();
        }
      }, 140);
    });
  }

  /* ---------- boot ---------- */

  function checkStorage() {
    try {
      const testKey = STORAGE_KEY + '.test';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
    } catch (error) {
      window.setTimeout(function () {
        showToast('浏览器禁用了本地存储，足迹可能无法保存');
      }, 600);
    }
  }

  function init() {
    state.data = loadData();
    renderProvincePaths();
    els.visitDate.max = todayISO();
    bindEvents();
    renderAll();
    checkStorage();
    if (loadError) {
      window.setTimeout(function () {
        showToast('旧数据读取失败，已从空白地图开始');
      }, 900);
    }
  }

  init();
})();

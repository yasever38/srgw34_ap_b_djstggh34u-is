/* Состояние приложения: значения по умолчанию, счета и пресеты, проверка и
   ремонт данных (LocalStorage и файл импорта), сохранение. Справочники
   берутся из src/data/ — здесь только то, что вводит пользователь.

   Счёт: {id, kind: "iis3" | "custom", name, preset, monthly, rate5 | null,
          opened, term | null — только у ИИС-3,
          assets:   [{id, ref | null, name, yield, shares: [доля по периодам]}],
          purchases:[{id, asset, name, part, price | null, noPrice, note}],
          ladder:   [{id, ticker, lot, plan | null, p1 | null, invested, bought, problems}]} */

import { SETTINGS, ASSETS, ASSET_ORDER, IIS_SHARES, IIS_ACCOUNT, PRESETS, CALC_AMOUNT,
  IIS_PURCHASES, IIS_LADDER } from "./data/defaults.js";
import { SECTORS } from "./data/stocks.js";

export const STORAGE_KEY = "iis3_plan_v1";
export const MAX_MONEY = 1e9;
export const VERSION = 2;

const clone = o => JSON.parse(JSON.stringify(o));
let seq = 1;
export function freshId(){ return "x" + (seq++) + "_" + Math.random().toString(36).slice(2, 7); }

export const periodCount = acc => acc.kind === "iis3" ? 3 : 1;

/* ---------- конструкторы ---------- */
export function makeAsset(ref, shares, extra){
  const c = ref ? ASSETS[ref] : null;
  return Object.assign({ id: ref || freshId(), ref: ref || null,
    name: c ? c.name : "Свой актив", yield: c ? c.yield : 0.1, shares: shares.slice() }, extra || {});
}
// Строки плана покупок для актива: у акций — «сразу» и «в резерв», у прочих — одна.
export function purchasesFor(asset){
  if(asset.ref === "stocks") return [
    { id: freshId(), asset: asset.id, name: "Акции, первые ступени", part: "now", price: null, noPrice: true, note: "Что и сколько — в «Докупке акций» ниже" },
    { id: freshId(), asset: asset.id, name: "Акции, резерв докупок → в фонд ДР", part: "reserve", price: null, noPrice: true, note: "Копится в фонде денежного рынка до просадки" },
  ];
  return [{ id: freshId(), asset: asset.id, name: asset.name, part: 1, price: null, noPrice: false, note: "" }];
}

export function makeIisAccount(){
  const assets = ASSET_ORDER.map(ref => makeAsset(ref, IIS_SHARES[ref]));
  return Object.assign({ id: "iis3" }, clone(IIS_ACCOUNT), {
    preset: "moderate",
    assets,
    purchases: IIS_PURCHASES.map(p => ({ id: freshId(), asset: p.asset, name: p.name, part: p.part,
      price: p.price == null ? null : p.price, noPrice: !!p.noPrice, note: p.note || "" })),
    ladder: IIS_LADDER.map(p => Object.assign({ id: freshId() }, p)),
  });
}

// Новый счёт из пресета (conservative / moderate / aggressive).
export function makeAccount(presetId, name, monthly){
  const preset = PRESETS.find(p => p.id === presetId) || PRESETS[1];
  const assets = ASSET_ORDER.filter(ref => preset.shares[ref] > 0).map(ref => makeAsset(ref, [preset.shares[ref]]));
  return {
    id: freshId(), kind: "custom", name: name || preset.name, preset: preset.id,
    monthly: monthly || 0, rate5: null,
    assets, purchases: assets.flatMap(purchasesFor), ladder: [],
  };
}

/* ---------- стратегия счёта ----------
   Доли стратегии по периодам для стандартных активов. Свои активы (ref = null)
   сохраняют доли, стандартные делят остаток в пропорциях стратегии. */
function presetTarget(acc, presetId){
  const preset = PRESETS.find(p => p.id === presetId);
  if(!preset) return null;
  const n = periodCount(acc);
  const base = ref => acc.kind === "iis3" ? (preset.iisShares[ref] || new Array(n).fill(0)) : [preset.shares[ref] || 0];
  const own = new Array(n).fill(0);
  acc.assets.forEach(a => { if(!a.ref) a.shares.forEach((v, p) => { own[p] += v; }); });
  const target = {};
  ASSET_ORDER.forEach(ref => { target[ref] = base(ref).map((v, p) => v * Math.max(0, 1 - own[p])); });
  return target;
}

// Применить стратегию: доли новых взносов меняются, купленное не трогаем.
// Недостающие активы стратегии добавляются, лишние стандартные получают долю 0.
export function applyPreset(acc, presetId){
  const target = presetTarget(acc, presetId);
  if(!target) return false;
  ASSET_ORDER.forEach(ref => {
    const a = acc.assets.find(x => x.ref === ref);
    if(a) a.shares = target[ref].slice();
    else if(target[ref].some(v => v > 0)){
      const asset = makeAsset(ref, target[ref]);
      acc.assets.push(asset);
      acc.purchases.push(...purchasesFor(asset));
    }
  });
  acc.preset = presetId;
  return true;
}

// Какая стратегия сейчас у счёта (null — доли изменены вручную).
export function matchPreset(acc){
  const hit = PRESETS.find(p => {
    const target = presetTarget(acc, p.id);
    return ASSET_ORDER.every(ref => {
      const a = acc.assets.find(x => x.ref === ref);
      const have = a ? a.shares : target[ref].map(() => 0);
      return target[ref].every((v, i) => Math.abs((have[i] || 0) - v) < 1e-6);
    });
  });
  return hit ? hit.id : null;
}

export function defaultState(){
  const sectors = {};
  SECTORS.forEach(sec => {
    const papers = {};
    sec.papers.forEach(p => { papers[p.ticker] = { share: p.share, price: p.price }; });
    sectors[sec.id] = { share: sec.share, papers };
  });
  return {
    app: "iis3-plan",   // прежнее имя — чтобы старые резервные копии открывались
    version: VERSION,
    settings: clone(SETTINGS),
    calcAmount: CALC_AMOUNT,
    sectors,
    accounts: [makeIisAccount()],
  };
}

/* ---------- проверка и ремонт ---------- */
const isObj = v => v && typeof v === "object" && !Array.isArray(v);
const okNum = (v, min, max) => typeof v === "number" && isFinite(v) && v >= min && v <= max;
const okStr = (v, max) => typeof v === "string" && v.trim() !== "" && v.length <= (max || 80);
// id счетов, активов и строк: без точек и спецсимволов — это сегменты путей «accounts.#id.…».
const okId = v => typeof v === "string" && /^[\w-]{1,60}$/.test(v);

// Дата открытия ИИС-3: реальная дата не раньше 2024 г. (тогда появились ИИС-3).
export const MIN_TERM = 5, MAX_TERM = 30;
export function okOpened(v){
  if(typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(v + "T00:00:00Z");
  return !isNaN(d) && d.toISOString().slice(0, 10) === v && +v.slice(0, 4) >= 2024 && +v.slice(0, 4) <= 2100;
}

// Резервная копия версии 1 (один счёт ИИС-3 с полями inputs/shares) → версия 2.
function migrateV1(p){
  const acc = makeIisAccount();
  if(isObj(p.inputs) && okNum(p.inputs.iis, 0, MAX_MONEY)) acc.monthly = p.inputs.iis;
  if(isObj(p.settings) && okNum(p.settings.iis5, -0.5, 1)) acc.rate5 = p.settings.iis5;
  if(isObj(p.shares)) acc.assets.forEach(a => { if(Array.isArray(p.shares[a.ref])) a.shares = p.shares[a.ref].slice(); });
  if(isObj(p.purchasePrices)){
    const ids = ["ofz26218", "ofz26235", "atom10", "ofz29018", null, null, "gold", "mm"];
    acc.purchases.forEach((r, i) => { if(ids[i] && ids[i] in p.purchasePrices) r.price = p.purchasePrices[ids[i]]; });
  }
  if(Array.isArray(p.ladder)) acc.ladder = p.ladder;
  return Object.assign({}, p, { version: VERSION, accounts: [acc] });
}

// Возвращает НОВЫЙ объект состояния и список исправлений. Не похоже на наши
// данные — исключение с понятным текстом.
export function normalizeState(parsed){
  if(!isObj(parsed) || parsed.app !== "iis3-plan")
    throw new Error("Похоже, это не файл резервной копии приложения «Инвест-план».");
  if(parsed.version === 1 || !Array.isArray(parsed.accounts)) parsed = migrateV1(parsed);
  const st = defaultState();
  let bad = 0;
  // Число из источника (или null, если разрешено); иначе остаётся значение по умолчанию.
  const take = (dst, src, key, min, max, nullable) => {
    if(!isObj(src) || !(key in src)) return;
    const v = src[key];
    if(nullable && v === null){ dst[key] = null; return; }
    if(okNum(v, min, max)) dst[key] = v; else bad++;
  };

  const s = parsed.settings;
  if(isObj(s)){
    take(st.settings, s, "ndfl", 0, 1);
    take(st.settings, s, "deductionLimit", 0, MAX_MONEY);
    take(st.settings, s, "stocksImmediate", 0, 1);
    if(Array.isArray(s.ladderLevels) && s.ladderLevels.length === 3 && s.ladderLevels.every(v => okNum(v, 0, 0.99))) st.settings.ladderLevels = s.ladderLevels.slice();
    else if(s.ladderLevels !== undefined) bad++;
    if(Array.isArray(s.ladderShares) && s.ladderShares.length === 4 && s.ladderShares.every(v => okNum(v, 0, 1))) st.settings.ladderShares = s.ladderShares.slice();
    else if(s.ladderShares !== undefined) bad++;
    if(typeof s.closeAtEnd === "boolean") st.settings.closeAtEnd = s.closeAtEnd;
    else if(typeof s.closeIn2031 === "boolean") st.settings.closeAtEnd = s.closeIn2031;   // старое имя
    if(typeof s.dataDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s.dataDate)) st.settings.dataDate = s.dataDate;
  }

  if("calcAmount" in parsed){
    if(okNum(parsed.calcAmount, 0, MAX_MONEY)) st.calcAmount = parsed.calcAmount; else bad++;
  }

  if(isObj(parsed.sectors)){
    Object.keys(st.sectors).forEach(id => {
      const src = parsed.sectors[id];
      if(!isObj(src)) return;
      take(st.sectors[id], src, "share", 0, 1);
      if(isObj(src.papers)) Object.keys(st.sectors[id].papers).forEach(t => {
        const p = src.papers[t];
        if(!isObj(p)) return;
        take(st.sectors[id].papers[t], p, "share", 0, 1);
        take(st.sectors[id].papers[t], p, "price", 0, MAX_MONEY);
      });
    });
  }

  const tickers = new Set(SECTORS.flatMap(sec => sec.papers.map(p => p.ticker)));
  const accIds = new Set();
  const accounts = [];
  parsed.accounts.forEach(src => {
    if(!isObj(src)){ bad++; return; }
    const iis = src.kind === "iis3";
    if(iis && accounts.some(a => a.kind === "iis3")){ bad++; return; }
    const acc = iis ? makeIisAccount() : makeAccount("moderate");
    if(src.preset !== undefined) acc.preset = PRESETS.some(p => p.id === src.preset) ? src.preset : null;
    acc.id = iis ? "iis3" : (okId(src.id) && !accIds.has(src.id) ? src.id : freshId());
    accIds.add(acc.id);
    if(okStr(src.name)) acc.name = src.name.trim(); else if(src.name !== undefined) bad++;
    take(acc, src, "monthly", 0, MAX_MONEY);
    take(acc, src, "rate5", -0.5, 1, true);
    if(iis){
      if(okOpened(src.opened)) acc.opened = src.opened; else if(src.opened !== undefined) bad++;
      if(src.term === null || (Number.isInteger(src.term) && okNum(src.term, MIN_TERM, MAX_TERM))) acc.term = src.term;
      else if(src.term !== undefined) bad++;
    }

    const n = periodCount(acc);
    if(Array.isArray(src.assets)){
      const ids = new Set();
      acc.assets = [];
      src.assets.forEach(a => {
        const ref = a && ASSETS[a.ref] ? a.ref : null;
        if(!isObj(a) || !Array.isArray(a.shares) || a.shares.length !== n || !a.shares.every(v => okNum(v, 0, 1))
          || (ref && ids.has(ref))){ bad++; return; }
        const asset = makeAsset(ref, a.shares);
        asset.id = ref || (okId(a.id) && !ids.has(a.id) ? a.id : freshId());
        ids.add(asset.id);
        if(okStr(a.name)) asset.name = a.name.trim();
        if(okNum(a.yield, -1, 5)) asset.yield = a.yield; else if(a.yield !== undefined) bad++;
        acc.assets.push(asset);
      });
    }
    const assetIds = new Set(acc.assets.map(a => a.id));

    if(Array.isArray(src.purchases)){
      acc.purchases = [];
      src.purchases.forEach(r => {
        const partOk = r && (r.part === "now" || r.part === "reserve" || okNum(r.part, 0, 1));
        if(!isObj(r) || !assetIds.has(r.asset) || !partOk || !okStr(r.name)){ bad++; return; }
        const row = { id: okId(r.id) ? r.id : freshId(), asset: r.asset, name: r.name.trim(), part: r.part,
          price: null, noPrice: !!r.noPrice, note: typeof r.note === "string" ? r.note : "" };
        take(row, r, "price", 0, MAX_MONEY, true);
        acc.purchases.push(row);
      });
    }

    if(Array.isArray(src.ladder)){
      const ids = new Set();
      acc.ladder = [];
      src.ladder.forEach(p => {
        if(!isObj(p) || !tickers.has(p.ticker)){ bad++; return; }
        const pos = { id: okId(p.id) && !ids.has(p.id) ? p.id : freshId(),
          ticker: p.ticker, lot: 1, plan: null, p1: null, invested: 0, bought: 0, problems: !!p.problems };
        ids.add(pos.id);
        take(pos, p, "lot", 1, 1e6);
        take(pos, p, "plan", 0, MAX_MONEY, true);
        take(pos, p, "p1", 0, MAX_MONEY, true);
        take(pos, p, "invested", 0, MAX_MONEY);
        take(pos, p, "bought", 0, 1e9);
        acc.ladder.push(pos);
      });
    }
    accounts.push(acc);
  });
  // ИИС-3 есть всегда и стоит первым
  if(!accounts.some(a => a.kind === "iis3")) accounts.unshift(makeIisAccount());
  accounts.sort((a, b) => (b.kind === "iis3") - (a.kind === "iis3"));
  st.accounts = accounts;

  const fixes = bad ? [`некорректных значений заменено или пропущено: ${bad}`] : [];
  return { st, fixes };
}

/* ---------- LocalStorage ---------- */
export function loadState(storage){
  const notices = [];
  let raw = null;
  try{ raw = storage.getItem(STORAGE_KEY); }
  catch(e){
    notices.push({ type: "err", msg: "Хранилище браузера недоступно — данные не будут сохраняться (например, в приватном режиме)." });
    return { state: defaultState(), notices };
  }
  if(!raw) return { state: defaultState(), notices };
  try{
    const parsed = JSON.parse(raw);
    const { st, fixes } = normalizeState(parsed);
    if(fixes.length){
      keepBrokenCopy(storage, raw);
      notices.push({ type: "warn", msg: "Сохранённые данные были частично повреждены и исправлены: " + fixes.join("; ") + ". Копия исходных данных сохранена в браузере." });
    }
    return { state: st, notices, migrated: parsed.version !== VERSION };
  }catch(e){
    keepBrokenCopy(storage, raw);
    notices.push({ type: "err", msg: "Сохранённые данные повреждены — открыт план по умолчанию. Копия повреждённых данных сохранена в браузере. Восстановите данные: Ещё → Настройки → Импорт JSON." });
    return { state: defaultState(), notices };
  }
}

function keepBrokenCopy(storage, raw){
  try{ storage.setItem(STORAGE_KEY + "_broken_" + Date.now(), raw); }catch(e){}
}

export function saveState(storage, state){
  try{ storage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; }
  catch(e){ return false; }
}

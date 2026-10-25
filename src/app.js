/* =====================================================================
   «Инвест-план» — PWA. Навигация, отрисовка экранов, ввод,
   счета и активы, резервная копия. Расчёты — src/lib/iis.js (через
   src/model.js), данные — src/data/, хранение — src/state.js (LocalStorage).
   ===================================================================== */

import { fmt, parseNum, esc, dateRu, plural } from "./lib/format.js";
import { defaultState, normalizeState, loadState, saveState, freshId, makeAccount, makeAsset,
  purchasesFor, periodCount, okOpened, applyPreset, MAX_MONEY } from "./state.js";
import { derive } from "./model.js";
import { PRESETS } from "./data/defaults.js";
import { toast, confirmDialog, setupMarquees, footer } from "./ui/components.js";
import { renderAccounts, addAccountHTML } from "./ui/accounts.js";
import { renderAllocation, addAssetHTML, editAssetHTML, strategyHTML } from "./ui/allocation.js";
import { renderPurchases } from "./ui/purchases.js";
import { renderReference, SUBS } from "./ui/reference.js";
import { renderSettings, renderRules } from "./ui/settings.js";

/* ---------- экраны ---------- */
const VIEWS = {
  accounts:  { title: "Счета",       ic: "💼", render: renderAccounts },
  shares:    { title: "Доли",        ic: "🥧", render: renderAllocation, perAccount: true },
  purchases: { title: "Покупки",     ic: "🛒", render: renderPurchases,  perAccount: true },
  reference: { title: "Справочник",  ic: "📚", render: renderReference,  more: "ОФЗ, ААА, флоатеры, фонды, акции" },
  settings:  { title: "Настройки",   ic: "⚙️", render: renderSettings,   more: "Срок ИИС, лесенка, резервная копия" },
  rules:     { title: "Правила",     ic: "📜", render: renderRules,      more: "Купоны, банки, докупки" },
};
const MORE = Object.keys(VIEWS).filter(k => VIEWS[k].more);

/* ---------- состояние ---------- */
let storage = null;
try{ storage = window.localStorage; }catch(e){ storage = null; }
const memStore = { getItem: () => null, setItem: () => {} };
const loaded = loadState(storage || memStore);
let state = loaded.state;
if(loaded.migrated) saveState(storage || memStore, state);

// Сессионные настройки экрана (не сохраняются). period: null — действующий по дате.
const ui = { view: "accounts", acc: "iis3", period: null, amountMode: "monthly", instrSub: "ofz", instrFilter: "all", expanded: new Set() };
const curAcc = () => state.accounts.find(a => a.id === ui.acc) || state.accounts[0];

function persist(){
  if(!saveState(storage || memStore, state) || !storage){
    toast("Не удалось сохранить данные: хранилище браузера недоступно или переполнено. Сделайте «Экспорт JSON», чтобы не потерять изменения.", "err");
    return false;
  }
  return true;
}
// Сохранить и перерисовать. Перерисовка — после того, как фокус перейдёт
// на следующее поле, чтобы Tab/«Далее» на телефоне не сбрасывали ввод.
function commit(){
  const ok = persist();
  setTimeout(render, 0);
  return ok;
}

/* ---------- отрисовка ---------- */
function render(){
  const focusPath = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.path : null;
  try{
    if(!state.accounts.some(a => a.id === ui.acc)) ui.acc = state.accounts[0].id;
    const amounts = ui.amountMode === "custom" ? { [ui.acc]: state.calcAmount } : null;
    const d = derive(state, amounts);
    const x = d.accounts.find(a => a.acc.id === ui.acc);
    const v = VIEWS[ui.view];
    const n = state.accounts.length;
    document.getElementById("topSub").innerHTML =
      `<span class="nw">${esc(v.title)}${v.perAccount ? " · " + esc(x.acc.name) : ""}</span> · <span class="nw">${n} ${plural(n, "счёт", "счёта", "счетов")}, ${fmt(d.totals.month)}/мес</span>`;
    const main = document.getElementById("main");
    main.innerHTML = `<div class="view active" id="view-${ui.view}">${v.render({ state, d, ui, x })}${footer(dateRu(state.settings.dataDate))}</div>`;
    document.querySelectorAll("nav.tabbar button").forEach(b => {
      const t = b.dataset.view;
      b.classList.toggle("active", t === ui.view || (t === "more" && MORE.includes(ui.view)));
    });
    setupMarquees(main);
    if(focusPath){
      const el = main.querySelector(`[data-path="${CSS.escape(focusPath)}"]`);
      if(el && !el.disabled){ el.focus(); if(el.select && el.tagName === "INPUT") el.select(); }
    }
  }catch(e){
    console.error(e);
    renderCrash(e);
  }
}

// Ошибка отрисовки → аварийный экран с экспортом/импортом/сбросом.
function renderCrash(err){
  document.getElementById("main").innerHTML = `
    <div class="view active"><div class="card">
      <h2>Не удалось показать экран</h2>
      <div class="section-note">Произошла ошибка: ${esc(err && err.message || err)}. Сохранённые данные не изменены.
        Сохраните их в файл («Экспорт JSON»), загрузите резервную копию или сбросьте к значениям по умолчанию.</div>
      <div class="add-income">
        <button class="btn" data-action="export">⬇ Экспорт JSON</button>
        <button class="btn secondary" data-action="import">⬆ Импорт JSON</button>
      </div>
      <div style="height:8px;"></div>
      <button class="btn danger" data-action="reset">↺ Сбросить к значениям по умолчанию</button>
    </div></div>`;
}

function updateHash(){
  const arg = VIEWS[ui.view].perAccount ? "/" + ui.acc : ui.view === "reference" ? "/" + ui.instrSub : "";
  try{ history.replaceState(null, "", "#" + ui.view + arg); }catch(e){}
}
function setView(v, arg){
  if(!VIEWS[v]) v = "accounts";
  ui.view = v;
  if(arg && VIEWS[v].perAccount && state.accounts.some(a => a.id === arg)) ui.acc = arg;
  if(arg && v === "reference" && SUBS.some(s => s.value === arg)){ ui.instrSub = arg; ui.instrFilter = "all"; }
  updateHash();
  document.querySelector(".modal-back")?.remove();
  render();
  document.getElementById("main").scrollTop = 0;
}

function openMore(){
  confirmDialog({
    title: "Ещё",
    html: `<div class="more-list">${MORE.map(k => `
      <button type="button" data-go="${k}" class="${ui.view === k ? "active" : ""}"><span class="ic">${VIEWS[k].ic}</span>
        <span>${esc(VIEWS[k].title)}<small>${esc(VIEWS[k].more)}</small></span></button>`).join("")}</div>`,
    noOk: true, cancelText: "Закрыть",
  });
}

/* ---------- запись по пути ----------
   «accounts.#iis3.monthly», «accounts.#iis3.assets.#ofz.shares.0»,
   «sectors.fin.papers.SBER.price», «settings.ladderLevels.1».
   Сегмент «#id» — элемент массива с этим id. */
function resolve(path){
  const parts = path.split(".");
  let obj = state;
  for(let i = 0; i < parts.length - 1; i++){
    const k = parts[i];
    if(k[0] === "#") obj = Array.isArray(obj) ? obj.find(x => x.id === k.slice(1)) : null;
    else obj = obj == null ? null : obj[/^\d+$/.test(k) && Array.isArray(obj) ? +k : k];
    if(obj == null) return null;
  }
  const last = parts[parts.length - 1];
  return { obj, key: /^\d+$/.test(last) && Array.isArray(obj) ? +last : last };
}
function setPath(path, value){
  const r = resolve(path);
  if(!r) return false;
  r.obj[r.key] = value;
  return true;
}

// Число из поля: null — пусто, undefined — ошибка (уже показана).
function readNum(raw, kind, min, max, nullable){
  raw = String(raw || "").trim();
  if(raw === "" && nullable) return null;
  const v = parseNum(raw);
  const unit = kind === "pct" ? "%" : kind === "rub" ? " ₽" : "";
  if(isNaN(v) || !isFinite(v)){ toast("Введите число, например 27350 или 15,5.", "warn"); return undefined; }
  if(v < min || v > max){ toast(`Значение — от ${min.toLocaleString("ru-RU")}${unit} до ${max.toLocaleString("ru-RU")}${unit}.`, "warn"); return undefined; }
  if(kind === "int" && !Number.isInteger(v)){ toast("Нужно целое число.", "warn"); return undefined; }
  return kind === "pct" ? Math.round(v * 1e6) / 1e8 : v;
}

function onInputChange(el){
  const path = el.dataset.path, kind = el.dataset.kind;
  if(kind === "str"){ setPath(path, el.value); commit(); return; }
  if(kind === "date"){
    if(path.endsWith(".opened") && !okOpened(el.value)){ toast("Укажите дату открытия ИИС-3 — не раньше 2024 г.", "warn"); render(); return; }
    if(/^\d{4}-\d{2}-\d{2}$/.test(el.value)){ setPath(path, el.value); ui.period = null; commit(); }
    else { toast("Укажите дату.", "warn"); render(); }
    return;
  }
  const min = el.dataset.min != null ? Number(el.dataset.min) : 0;
  const max = el.dataset.max != null ? Number(el.dataset.max) : MAX_MONEY;
  const value = readNum(el.value, kind, min, max, el.hasAttribute("data-null"));
  if(value === undefined){ render(); return; }
  if(/^settings\.ladderLevels\.\d$/.test(path)){
    const lv = state.settings.ladderLevels.slice();
    lv[+path.slice(-1)] = value;
    if(!(lv[0] < lv[1] && lv[1] < lv[2])){
      toast("Уровни ступеней должны расти: ступень 2 < ступень 3 < ступень 4.", "warn"); render(); return;
    }
  }
  setPath(path, value);
  commit();
}

/* ---------- счета ---------- */
function addAccount(){
  confirmDialog({ title: "Новый счёт", html: addAccountHTML(), okText: "Добавить", okClass: "", focus: "#accName" }, () => {
    const name = document.getElementById("accName").value.trim();
    const monthly = readNum(document.getElementById("accMonthly").value || "0", "rub", 0, MAX_MONEY);
    if(monthly === undefined) return false;
    if(name.length > 40){ toast("Название — не длиннее 40 символов.", "warn"); return false; }
    const preset = document.querySelector(".modal [data-preset].active").dataset.preset;
    const acc = makeAccount(preset, name, monthly);
    state.accounts.push(acc);
    ui.acc = acc.id;
    if(commit()) toast(`Счёт «${acc.name}» добавлен. Доли и активы можно поменять на экране «Доли».`, "ok");
  });
}

function renameAccount(id){
  const acc = state.accounts.find(a => a.id === id);
  if(!acc) return;
  confirmDialog({
    title: "Название счёта",
    html: `<div class="m-form"><input type="text" id="accName" value="${esc(acc.name)}" maxlength="40" autocomplete="off"></div>`,
    okText: "Сохранить", okClass: "", focus: "#accName",
  }, () => {
    const name = document.getElementById("accName").value.trim();
    if(!name){ toast("Введите название.", "warn"); return false; }
    acc.name = name.slice(0, 40);
    commit();
  });
}

function deleteAccount(id){
  const acc = state.accounts.find(a => a.id === id);
  if(!acc || acc.kind === "iis3") return;
  confirmDialog({ title: `Удалить счёт «${acc.name}»?`, html: "Доли, цены в плане покупок и позиции докупки этого счёта будут удалены." }, () => {
    state.accounts = state.accounts.filter(a => a.id !== id);
    commit();
  });
}

function changeStrategy(id){
  const acc = curAcc();
  const x = derive(state).accounts.find(a => a.acc.id === acc.id);
  const preset = PRESETS.find(p => p.id === id);
  if(!preset || x.strategy === id) return;
  confirmDialog({ title: `«${acc.name}»: стратегия «${preset.label}»?`, html: strategyHTML(x, preset), okText: "Применить", okClass: "" }, () => {
    applyPreset(acc, id);
    if(commit()) toast(`Стратегия «${preset.label}» — новые взносы пойдут по её долям.`, "ok");
  });
}

/* ---------- активы ---------- */
function addAsset(){
  const acc = curAcc();
  const x = derive(state).accounts.find(a => a.acc.id === acc.id);
  const p = ui.period == null ? x.cur : Math.min(ui.period, periodCount(acc) - 1);
  const dlg = confirmDialog({
    title: `Актив в «${acc.name}»`,
    html: addAssetHTML(acc, x.isIis ? x.periods[p] : ""),
    okText: "Добавить", okClass: "", focus: "#assetShare",
  }, () => {
    const ref = document.getElementById("assetRef").value;
    const share = readNum(document.getElementById("assetShare").value || "0", "pct", 0, 100);
    if(share === undefined) return false;
    const shares = new Array(periodCount(acc)).fill(0);
    shares[p] = share;
    let asset;
    if(ref){
      asset = makeAsset(ref, shares);
    } else {
      const name = document.getElementById("assetName").value.trim();
      const y = readNum(document.getElementById("assetYield").value || "0", "pct", -100, 500);
      if(!name){ toast("Введите название актива.", "warn"); return false; }
      if(y === undefined) return false;
      asset = makeAsset(null, shares, { name: name.slice(0, 40), yield: y });
    }
    acc.assets.push(asset);
    acc.purchases.push(...purchasesFor(asset));
    if(commit()) toast(`Актив «${asset.name}» добавлен${share > 0 ? "" : " с долей 0% — задайте долю"}.`, "ok");
  });
  const sel = dlg.el.querySelector("#assetRef");
  sel.addEventListener("change", () => dlg.el.querySelector("#assetCustom").classList.toggle("hidden", !!sel.value));
}

function editAsset(id){
  const acc = curAcc();
  const a = acc.assets.find(x => x.id === id);
  if(!a) return;
  confirmDialog({
    title: "Актив",
    html: editAssetHTML(a) + `<button type="button" class="btn danger" data-action="delAsset" data-id="${esc(a.id)}">Удалить актив из счёта</button>`,
    okText: "Сохранить", okClass: "", focus: "#assetName",
  }, () => {
    const name = document.getElementById("assetName").value.trim();
    const y = readNum(document.getElementById("assetYield").value, "pct", -100, 500);
    if(!name){ toast("Введите название актива.", "warn"); return false; }
    if(y === undefined) return false;
    acc.purchases.forEach(r => { if(r.asset === a.id && r.name === a.name) r.name = name.slice(0, 40); });
    a.name = name.slice(0, 40);
    a.yield = y;
    commit();
  });
}

function deleteAsset(id){
  const acc = curAcc();
  const a = acc.assets.find(x => x.id === id);
  if(!a) return;
  confirmDialog({ title: `Удалить «${a.name}»?`, html: `Актив и его строки в плане покупок уберутся из счёта «${esc(acc.name)}». Его доля освободится — раздайте её другим активам.` }, () => {
    acc.assets = acc.assets.filter(x => x.id !== id);
    acc.purchases = acc.purchases.filter(r => r.asset !== id);
    commit();
  });
}

/* ---------- лесенка ---------- */
function addPosition(){
  const acc = curAcc();
  const d = derive(state);
  const used = new Set(acc.ladder.map(p => p.ticker));
  const mains = d.sectors.flatMap(s => s.share > 0 ? s.papers.filter(p => p.share > 0) : []);
  const pick = mains.find(p => !used.has(p.ticker)) || mains[0] || d.sectors[0].papers[0];
  const pos = { id: freshId(), ticker: pick.ticker, lot: 1, plan: null, p1: null, invested: 0, bought: 0, problems: false };
  acc.ladder.push(pos);
  ui.expanded.add("pos:" + pos.id);   // новую позицию сразу открываем для ввода
  commit();
}

function deletePosition(id){
  const acc = curAcc();
  const pos = acc.ladder.find(p => p.id === id);
  if(!pos) return;
  confirmDialog({ title: `Удалить позицию ${pos.ticker}?`, html: "Введённые по ней цена 1-й покупки, вложено и куплено будут удалены." }, () => {
    acc.ladder = acc.ladder.filter(p => p.id !== id);
    commit();
  });
}

/* ---------- резервная копия ---------- */
function exportJSON(){
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const d = new Date();
  a.href = url;
  a.download = `invest-plan-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function importFile(file){
  const reader = new FileReader();
  reader.onload = () => {
    let res;
    try{ res = normalizeState(JSON.parse(reader.result)); }
    catch(err){
      toast("Не удалось импортировать: " + (err instanceof SyntaxError ? "файл повреждён или это не JSON." : err.message), "err");
      return;
    }
    const n = res.st.accounts.length;
    confirmDialog({
      title: "Заменить все данные?",
      html: `В файле: <b>${n}</b> ${plural(n, "счёт", "счёта", "счетов")} — ${res.st.accounts.map(a => esc(a.name)).join(", ")}.<br><br>
             Текущие данные будут полностью заменены. Если они могут понадобиться — сначала сделайте «Экспорт JSON».`,
      okText: "Заменить",
    }, () => {
      state = res.st;
      if(!commit()) return;
      toast(res.fixes.length ? "Импортировано с исправлениями: " + res.fixes.join("; ") + "." : "Данные восстановлены из файла.", res.fixes.length ? "warn" : "ok");
    });
  };
  reader.onerror = () => toast("Не удалось прочитать файл.", "err");
  reader.readAsText(file);
}

function resetAll(){
  confirmDialog({
    title: "Сбросить к значениям по умолчанию?",
    html: "Останется только ИИС-3 с долями, ценами и позициями из таблицы ИИС-3; добавленные счета удалятся. Если текущие данные могут понадобиться — сначала сделайте «Экспорт JSON».",
    okText: "Сбросить",
  }, () => {
    state = defaultState();
    if(commit()) toast("Восстановлены значения по умолчанию.", "ok");
  });
}

/* ---------- обработчики (делегирование) ---------- */
document.addEventListener("click", e => {
  const t = e.target.closest("button, [role=button]");
  if(!t) return;
  if(t.closest("nav.tabbar")){
    if(t.dataset.view === "more") openMore(); else setView(t.dataset.view);
    return;
  }
  if(t.dataset.preset){
    t.parentElement.querySelectorAll("[data-preset]").forEach(b => b.classList.toggle("active", b === t));
    return;
  }
  if(t.dataset.go){ setView(t.dataset.go, t.dataset.acc || t.dataset.sub); return; }
  if(t.dataset.acc){ ui.acc = t.dataset.acc; ui.period = null; updateHash(); render(); return; }
  if(t.dataset.period != null){ ui.period = +t.dataset.period; render(); return; }
  if(t.dataset.amount){ ui.amountMode = t.dataset.amount; render(); return; }
  if(t.dataset.strategy){ changeStrategy(t.dataset.strategy); return; }
  if(t.dataset.sub != null && ui.view === "reference"){ setView("reference", t.dataset.sub); return; }
  if(t.dataset.filter != null){ ui.instrFilter = t.dataset.filter; render(); return; }
  if(t.dataset.toggle){ setPath(t.dataset.toggle, t.dataset.val === "true"); commit(); return; }
  if(t.dataset.expand){
    const id = t.dataset.expand;
    ui.expanded.has(id) ? ui.expanded.delete(id) : ui.expanded.add(id);
    render(); return;
  }
  const a = t.dataset.action, id = t.dataset.id;
  if(a === "export") exportJSON();
  else if(a === "import") document.getElementById("importFile").click();
  else if(a === "reset") resetAll();
  else if(a === "addAcc") addAccount();
  else if(a === "renameAcc") renameAccount(id);
  else if(a === "delAcc") deleteAccount(id);
  else if(a === "addAsset") addAsset();
  else if(a === "editAsset") editAsset(id);
  else if(a === "delAsset") deleteAsset(id);
  else if(a === "addPos") addPosition();
  else if(a === "delPos") deletePosition(id);
});

document.getElementById("main").addEventListener("change", e => {
  const el = e.target;
  if(el.matches("[data-path]")) onInputChange(el);
});
document.addEventListener("keydown", e => {
  if(e.key !== "Enter" || e.target.tagName !== "INPUT") return;
  if(e.target.matches("[data-path]")){ e.preventDefault(); e.target.blur(); }
  else if(e.target.closest(".modal")){ e.preventDefault(); document.querySelector(".modal [data-m-ok]")?.click(); }
});
document.getElementById("importFile").addEventListener("change", e => {
  const f = e.target.files[0];
  if(f) importFile(f);
  e.target.value = "";
});
window.addEventListener("resize", () => setupMarquees(document.getElementById("main")));

/* ================= PWA: установка + Service Worker ================= */
let deferredPrompt = null;
const A2HS_KEY = "iis3_a2hs_dismissed";
const a2hsSeen = () => { try{ return !!localStorage.getItem(A2HS_KEY); }catch(e){ return true; } };
const a2hsHide = () => { document.getElementById("a2hs").classList.add("hidden"); try{ localStorage.setItem(A2HS_KEY, "1"); }catch(e){} };
window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredPrompt = e;
  if(!a2hsSeen()) document.getElementById("a2hs").classList.remove("hidden");
});
document.getElementById("a2hsInstall").addEventListener("click", async () => {
  if(!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  a2hsHide();
});
document.getElementById("a2hsClose").addEventListener("click", a2hsHide);
window.addEventListener("appinstalled", a2hsHide);
if("serviceWorker" in navigator && location.protocol !== "file:"){
  window.addEventListener("load", () => { navigator.serviceWorker.register("./sw.js").catch(() => {}); });
}

/* ---------- старт ---------- */
// Экран из адреса: #shares/iis3, #reference/aaa. Реагируем и на смену адреса
// без перезагрузки (ручная правка, «Назад»).
function viewFromHash(){
  let h = location.hash.slice(1);
  try{ h = decodeURIComponent(h); }catch(e){}   // битый адрес вроде «#%» — просто не наш экран
  const [v, arg] = h.split("/");
  if(!VIEWS[v]) return false;
  ui.view = v;
  if(arg && VIEWS[v].perAccount && state.accounts.some(a => a.id === arg)) ui.acc = arg;
  if(arg && v === "reference" && SUBS.some(s => s.value === arg)) ui.instrSub = arg;
  return true;
}
window.addEventListener("hashchange", () => {
  if(viewFromHash()){ document.querySelector(".modal-back")?.remove(); render(); document.getElementById("main").scrollTop = 0; }
});
viewFromHash();
render();
loaded.notices.forEach(n => toast(n.msg, n.type));

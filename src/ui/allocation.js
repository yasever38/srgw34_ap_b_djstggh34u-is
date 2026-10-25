/* Экран «Доли»: доли активов выбранного счёта (у ИИС-3 — по периодам),
   рубли от взноса или от своей суммы, акции → секторы → бумаги, бюджет на акции. */

import { fmt, pct, esc, num, plural, dateRu } from "../lib/format.js";
import { isLocked } from "../lib/iis.js";
import { ASSETS, ASSET_ORDER, PRESETS } from "../data/defaults.js";
import { row, line, numField, seg, banner, mq, accountPicker } from "./components.js";

// Цвет актива — как в «Бюджете»: оттенки через «золотой угол».
export function catColor(i){
  const hue = (39 + i * 137.508) % 360;
  const light = [62, 52, 72][i % 3];
  const sat = [62, 70, 52][Math.floor(i / 3) % 3];
  return `hsl(${hue.toFixed(1)}, ${sat}%, ${light}%)`;
}

// Кольцевая диаграмма на SVG: длина окружности r=15.915 равна 100.
function donut(rows){
  let off = 25;
  const segs = rows.map((r, i) => {
    const len = Math.max(0, Math.min(100, r.share * 100));
    const el = len > 0 ? `<circle r="15.915" cx="21" cy="21" fill="none" stroke="${catColor(i)}" stroke-width="6"
      stroke-dasharray="${len.toFixed(3)} ${(100 - len).toFixed(3)}" stroke-dashoffset="${off.toFixed(3)}"></circle>` : "";
    off -= len;
    return el;
  }).join("");
  return `<svg class="donut" viewBox="0 0 42 42" aria-hidden="true">
    <circle r="15.915" cx="21" cy="21" fill="none" stroke="var(--navy)" stroke-width="6"></circle>${segs}</svg>`;
}

// Секторы и бумаги под строкой «Акции» (общие для всех счетов).
function stocksBlock(x, d, ui, p){
  const sr = x.calc.sectorRows, st = x.stocks;
  return `<div class="sub-block">
    ${d.sectors.map((sec, i) => {
      const t = st.sectors[i], open = ui.expanded.has(sec.id);
      const papers = open ? sec.papers.map((pp, j) => {
        const tp = t.papers[j];
        const mps = tp.monthsPerShare;
        return `<div class="cat-level-row sub2 ${tp.main ? "is-main" : ""}">
          <div class="cat-left"><div class="cat-name">${mq(`<b>${esc(pp.ticker)}</b> ${esc(pp.name)}`)}</div>
            <div class="cat-desc">${esc(pp.role)}${mps != null && x.amount === x.acc.monthly ? ` · копить на 1 акцию ${num(mps, 1)} мес.` : ""}</div></div>
          <div class="cat-right">${numField(`sectors.${sec.id}.papers.${pp.ticker}.share`, pp.share, "pct", { cls: "sm", min: 0, max: 100, label: "Доля " + pp.ticker })}
            <span class="amount">${fmt(sr[i].papers[j].amount[p])}</span></div>
        </div>`;
      }).join("") + (t.ok ? "" : `<div class="lvl-note err">⚠ Доли бумаг дают ${pct(t.paperSum, 2)} — должно быть 100%.</div>`)
        + (t.banks > 2 ? `<div class="lvl-note err">⚠ ${t.banks} банка с долей &gt; 0 — держите не больше 2: банки падают вместе.</div>` : "") : "";
      return `<div class="cat-level-row sub">
          <div class="cat-left">
            <div class="cat-name"><button type="button" class="link-row" data-expand="${sec.id}" aria-expanded="${open}"><span class="cnt">${open ? "▾" : "▸"}</span> ${esc(sec.name)}</button>
              <span class="tag ${t.ok ? "good" : "bad"}">${t.ok ? "OK" : "≠100%"}</span></div>
            <div class="cat-desc">${esc(t.mains.join(", ") || "нет основных бумаг")}${t.banks > 2 ? " · ⚠ банков больше 2" : ""}</div>
          </div>
          <div class="cat-right">${numField(`sectors.${sec.id}.share`, sec.share, "pct", { cls: "sm", min: 0, max: 100, label: "Доля сектора " + sec.name })}
            <span class="amount">${fmt(sr[i].amount[p])}</span></div>
        </div>${papers}`;
    }).join("")}
    ${st.sectorsOk ? "" : `<div class="lvl-note err">⚠ Доли секторов дают ${pct(st.sectorSum, 2)} — должно быть 100%.</div>`}
    <div class="lock-note">Секторы и бумаги общие для всех счетов. P/E, дивиденды и цены — Ещё → Справочник → Акции.</div>
  </div>`;
}

export function renderAllocation({ state, d, ui, x }){
  const acc = x.acc, close = state.settings.closeAtEnd;
  const p = ui.period == null ? x.cur : Math.min(ui.period, x.periods.length - 1);
  const sc = x.sched;
  const al = x.calc.periods[p];
  const base = `accounts.#${acc.id}.assets`;
  const custom = ui.amountMode === "custom";

  const legend = al.rows.map((r, i) => r.share > 0 ? `
    <div class="lg"><span class="sw" style="background:${catColor(i)}"></span>
      <span class="nm">${esc(x.assets[i].name)}</span><span class="vv">${pct(r.share)}</span></div>` : "").join("");

  const rows = x.assets.map((a, i) => {
    const r = al.rows[i];
    const locked = isLocked(a, p, close);
    const isStocks = a.ref === "stocks";
    const open = ui.expanded.has("stocks");
    return `
    <div class="cat-level-row">
      <div class="cat-left">
        <div class="cat-name">${mq(esc(a.name) + (a.custom ? ' <span class="cnt">[свой]</span>' : "") + ' <span class="tag safe">%</span>')}
          <button type="button" class="cat-edit" data-action="editAsset" data-id="${esc(a.id)}" title="Изменить актив" aria-label="Изменить актив">✎</button></div>
        <div class="cat-desc">${esc(a.role)} · ожид. ${pct(a.yield)}</div>
        ${a.where ? `<div class="cat-desc"><button type="button" class="link" data-go="reference" data-sub="${a.where}">где выбирать: ${esc(a.whereText)} →</button></div>` : ""}
        ${isStocks ? `<div class="cat-desc"><button type="button" class="link" data-expand="stocks">${open ? "▾ скрыть секторы" : "▸ секторы и бумаги"}</button></div>` : ""}
        ${locked ? `<div class="lock-note">🔒 С ${sc.periods[2].from} не докупаем: ИИС закрывается в ${sc.closeYear} (Настройки)</div>` : ""}
      </div>
      <div class="cat-right">
        ${numField(`${base}.#${a.id}.shares.${p}`, locked ? 0 : a.shares[p], "pct", { cls: "sm", min: 0, max: 100, disabled: locked, label: a.name })}
        <span class="amount">${fmt(r.amount)}</span>
      </div>
    </div>${isStocks && open ? stocksBlock(x, d, ui, p) : ""}`;
  }).join("");

  const b = x.budget;
  const budgetCard = x.stockIdx >= 0 && b.month > 0 ? `
    <div class="card">
      <h2>Бюджет на акции</h2>
      ${row("На акции, ₽/мес", fmt(b.month))}
      <div class="cat-level-row">
        <div class="cat-left"><div class="cat-name">Сразу на первые ступени</div><div class="cat-desc">остальное — в резерв докупок (фонд ДР)</div></div>
        <div class="cat-right">${numField("settings.stocksImmediate", state.settings.stocksImmediate, "pct", { cls: "sm", min: 0, max: 100 })}</div>
      </div>
      ${row("Сразу покупаем / в резерв", `${fmt(b.now)} / ${fmt(b.reserve)}`)}
      ${row("За год", fmt(b.year))}
      ${row(`Основных бумаг: ${b.count}`, "")}
      ${line("План на позицию на 2 года", fmt(b.perPosition), { container: true })}
      <div class="lock-note" style="margin-top:6px;">= за год × 2 / число бумаг. План по умолчанию для «Докупки акций»; ступень = план × ${pct(state.settings.ladderShares[0])}.</div>
    </div>` : "";

  return `
    <div class="card">
      ${accountPicker(state, acc.id)}
      <label class="field">Стратегия</label>
      <div class="seg-wrap">${seg("data-strategy", PRESETS.map(s => ({ value: s.id, label: s.label })), x.strategy)}</div>
      ${x.strategy ? "" : `<div class="lock-note" style="margin:-4px 2px 8px;">Сейчас свои доли — выберите стратегию, чтобы заменить их готовым набором.</div>`}
      ${x.periods.length > 1 ? `<div class="seg-wrap">${seg("data-period", x.periods.map((t, i) => ({ value: i, label: t })), p)}</div>
        <div class="lock-note" style="margin:-4px 2px 8px;">Открыт ${dateRu(acc.opened)}, срок ${sc.years} ${plural(sc.years, "год", "года", "лет")} → разблокируется ${dateRu(sc.unlock)}. Сейчас действуют доли ${esc(x.periods[x.cur])}. Дата — на экране «Счета».</div>` : ""}
      <div class="seg-wrap">${seg("data-amount", [{ value: "monthly", label: `Взнос ${fmt(acc.monthly)}` }, { value: "custom", label: "Своя сумма" }], ui.amountMode)}
        ${custom ? `<span style="display:inline-flex; align-items:center; gap:6px;">${numField("calcAmount", state.calcAmount, "rub", { label: "Своя сумма" })}</span>` : ""}</div>
      <div class="donut-wrap">${donut(al.rows)}<div class="legend">${legend || `<div class="lock-note">Доли не заданы</div>`}</div></div>
      ${banner(al.ok, `Сумма долей — 100%`, `Сумма долей — ${pct(al.shareSum, 2)}, должна быть 100%`)}
      <div style="margin-top:6px;">${rows}</div>
      ${line("Итого", `${fmt(al.total)} <span class="pct">· ${pct(al.shareSum, 2)}</span>`, { container: true })}
      ${line("Доходность по долям", pct(x.periods.length > 1 ? weighted(x, p, close) : x.yieldNow, 2))}
      ${line("Ожидаемый доход за год", fmt(incomeOf(x, al)))}
      <div style="height:10px;"></div>
      <button type="button" class="btn secondary" data-action="addAsset">＋ Добавить актив</button>
    </div>
    ${budgetCard}`;
}

function weighted(x, p, close){
  return x.assets.reduce((s, a) => s + (isLocked(a, p, close) ? 0 : (a.shares[p] || 0)) * a.yield, 0);
}
function incomeOf(x, al){ return al.rows.reduce((s, r, i) => s + r.amount * x.assets[i].yield, 0); }

// Окно «Добавить актив»: стандартный из каталога (которого нет в счёте) или свой.
export function addAssetHTML(acc, periodLabel){
  const have = new Set(acc.assets.map(a => a.ref).filter(Boolean));
  const opts = Object.keys(ASSETS).filter(k => !have.has(k)).map(k => `<option value="${k}">${esc(ASSETS[k].name)} · ${pct(ASSETS[k].yield)}</option>`).join("");
  return `<div class="m-form">
      <label class="field">Актив</label>
      <select id="assetRef" class="form-select">${opts}<option value="" ${opts ? "" : "selected"}>Свой актив…</option></select>
      <div id="assetCustom" ${opts ? 'class="hidden"' : ""}>
        <div style="height:8px;"></div>
        <label class="field">Название</label>
        <input type="text" id="assetName" placeholder="Напр. Облигации застройщика" maxlength="40" autocomplete="off">
        <div style="height:8px;"></div>
        <label class="field">Ожидаемая доходность, % годовых</label>
        <input type="text" id="assetYield" placeholder="Напр. 18" inputmode="decimal" autocomplete="off">
      </div>
      <div style="height:8px;"></div>
      <label class="field">Доля${periodLabel ? ` (${esc(periodLabel)})` : ""}, %</label>
      <input type="text" id="assetShare" placeholder="0" inputmode="decimal" autocomplete="off">
    </div>
    Чтобы сумма долей осталась 100%, уменьшите доли других активов.`;
}

// Окно «Сменить стратегию»: какие доли будут у новых взносов.
const SHORT = { ofz: "ОФЗ", aaa: "ААА", float: "флоатеры", stocks: "акции", gold: "золото", mm: "ДР" };
export function strategyHTML(x, preset){
  const lineOf = get => ASSET_ORDER.filter(r => get(r) > 0).map(r => `${SHORT[r]} ${pct(get(r))}`).join(" · ");
  const rows = x.isIis
    ? x.periods.map((t, p) => `<div><b>${esc(t)}:</b> ${lineOf(r => (preset.iisShares[r] || [])[p] || 0)}</div>`).join("")
    : `<div>${lineOf(r => preset.shares[r] || 0)}</div>`;
  const own = x.assets.some(a => a.custom && a.shares.some(v => v > 0));
  return `<div class="section-note" style="margin-bottom:8px;">${esc(preset.note)}</div>
    <div class="lock-note" style="line-height:1.6;">${rows}</div>
    <div style="margin-top:10px;">Меняются доли только <b>новых взносов</b> — купленное не продаём.
    ${own ? "Свои активы сохраняют доли, остальное делится в пропорциях стратегии." : ""} Доли потом можно подправить вручную.</div>`;
}

// Окно «Изменить актив»: название и ожидаемая доходность.
export function editAssetHTML(a){
  return `<div class="m-form">
      <label class="field">Название</label>
      <input type="text" id="assetName" value="${esc(a.name)}" maxlength="40" autocomplete="off">
      <div style="height:8px;"></div>
      <label class="field">Ожидаемая доходность, % годовых</label>
      <input type="text" id="assetYield" value="${esc(String(Math.round(a.yield * 1e4) / 100).replace(".", ","))}" inputmode="decimal" autocomplete="off">
    </div>`;
}

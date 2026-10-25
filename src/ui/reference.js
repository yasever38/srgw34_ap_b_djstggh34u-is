/* Экран «Справочник»: ОФЗ, корпоративные ААА, флоатеры, фонды и акции. */

import { fmt, pct, pctSigned, esc, num, dateRu, plural } from "../lib/format.js";
import { yearsTo, unitPrice, discount, statusGroup } from "../lib/iis.js";
import { OFZ, AAA, FLOATERS, FUNDS } from "../data/instruments.js";
import { STOCK_NOTES } from "../data/stocks.js";
import { seg, mq, metric, numField } from "./components.js";

export const SUBS = [
  { value: "ofz", label: "ОФЗ" }, { value: "aaa", label: "ААА" },
  { value: "float", label: "Флоатеры" }, { value: "funds", label: "Фонды" }, { value: "stocks", label: "Акции" },
];

// Акции: бумаги по секторам с мультипликаторами; цены редактируются (общие для всех счетов).
function stocksHTML(d, f){
  let count = 0;
  const body = d.sectors.map(sec => {
    const papers = sec.papers.filter(p => {
      const main = sec.share > 0 && p.share > 0;
      return f === "all" || (f === "main" && main) || (f === "alt" && !main);
    });
    count += papers.length;
    if(!papers.length) return "";
    return `<div class="group-title">${esc(sec.name)} · ${pct(sec.share)} акций</div><div class="cm">${esc(sec.note)}</div>` + papers.map(p => {
      const main = sec.share > 0 && p.share > 0;
      return `
      <div class="paper ${main ? "main" : ""}">
        <div class="paper-head"><span class="tk">${esc(p.ticker)}</span><div class="co">${mq(esc(p.name))}</div>
          <span class="tag ${main ? "safe" : "gray"}">${main ? "Основная · " + pct(p.share) : "Запасная"}</span></div>
        <div class="inp-row"><label>цена ${numField(`sectors.${sec.id}.papers.${p.ticker}.price`, p.price, "rub", { cls: "sm", label: "Цена " + p.ticker })}</label></div>
        <div class="metrics">
          ${metric(p.pe == null ? "—" : num(p.pe, 1), "P/E")}
          ${metric(p.div == null ? "—" : pct(p.div), "дивдоходность")}
          ${metric(p.fromMax == null ? "—" : pctSigned(p.fromMax), "от макс. 52 нед.")}
          ${metric(p.potential == null ? "—" : pctSigned(p.potential), "потенциал")}
        </div>
        <div class="why">${esc(p.why)}</div>
      </div>`;
    }).join("");
  }).join("");
  return { body, count };
}
const FILTERS = [
  { value: "all", label: "Все" }, { value: "main", label: "★ Основа" },
  { value: "alt", label: "Альтернатива" }, { value: "no", label: "Не брать" },
];

function statusTag(status){
  const g = statusGroup(status);
  return `<span class="tag ${g === "main" ? "gold" : g === "no" ? "bad" : "safe"}">${esc(status)}</span>`;
}
const kv = (k, v) => v == null || v === "" ? "" : `<span>${k} <b>${v}</b></span>`;

function bondHTML(it, dataDate, extra){
  const y = yearsTo(it.maturity, dataDate);
  const price = unitPrice(it.pricePct), disc = discount(it.pricePct);
  return `
  <div class="inst">
    <div class="inst-head"><span class="nm">${esc(it.name)}</span>${statusTag(it.status)}</div>
    <div class="kvs">
      ${kv("погашение", dateRu(it.maturity))}
      ${kv("лет до погашения", y == null ? null : num(y, 1))}
      ${kv("купон", typeof it.coupon === "number" ? pct(it.coupon, 2) : it.coupon ? esc(it.coupon) : null)}
      ${kv("цена", it.pricePct == null ? "—" : pct(it.pricePct, 2))}
      ${kv("1 шт.", price == null ? "—" : fmt(price))}
      ${kv("до номинала", disc == null ? null : fmt(disc))}
      ${kv("YTM", it.ytm == null ? null : pct(it.ytm, 2))}
      ${extra || ""}
    </div>
    ${it.comment ? `<div class="cm">${esc(it.comment)}</div>` : ""}
  </div>`;
}

export function renderReference({ state, d, ui }){
  const dataDate = state.settings.dataDate;
  const f = ui.instrFilter;
  const pass = it => f === "all" || statusGroup(it.status) === f;
  let title, note, body, count = 0;
  let filters = FILTERS;

  if(ui.instrSub === "stocks"){
    title = "Акции по секторам";
    note = STOCK_NOTES.join(" ");
    filters = [{ value: "all", label: "Все" }, { value: "main", label: "Основные" }, { value: "alt", label: "Запасные" }];
    ({ body, count } = stocksHTML(d, f === "no" ? "all" : f));
  } else if(ui.instrSub === "funds"){
    title = FUNDS.title; note = FUNDS.note;
    body = FUNDS.groups.map(g => {
      const items = g.items.filter(pass);
      count += items.length;
      if(!items.length) return "";
      return `<div class="group-title">${esc(g.title)}</div>` + items.map(it => `
        <div class="inst">
          <div class="inst-head"><span class="nm">${esc(it.ticker)}</span>${statusTag(it.status)}</div>
          <div class="kvs">${kv("", esc(it.name))}${kv("УК", esc(it.uk))}${kv("комиссия (TER)", it.ter == null ? "—" : pct(it.ter, 2))}${kv("СЧА", esc(it.size))}</div>
          ${it.comment ? `<div class="cm">${esc(it.comment)}</div>` : ""}
        </div>`).join("");
    }).join("");
  } else {
    const src = ui.instrSub === "aaa" ? AAA : ui.instrSub === "float" ? FLOATERS : OFZ;
    title = src.title; note = src.note;
    const items = src.items.filter(pass);
    count = items.length;
    body = items.map(it => {
      let extra = "";
      if(ui.instrSub === "ofz") extra = kv("дюрация", num(it.duration, 1) + " г.") + kv("оборот", num(it.turnover, 1) + " млн ₽/день");
      if(ui.instrSub === "aaa") extra = kv("эмитент", esc(it.issuer)) + kv("рейтинг", esc(it.rating)) + kv("выплат в год", it.perYear) + kv("ISIN", esc(it.isin)) + kv("данные", esc(it.asOf));
      if(ui.instrSub === "float") extra = kv("оборот", it.turnover == null ? null : num(it.turnover, 1) + " млн ₽/день");
      return bondHTML(it, dataDate, extra);
    }).join("");
  }

  return `
    <div class="card">
      <h2>Где выбирать</h2>
      <div class="seg-wrap">${seg("data-sub", SUBS, ui.instrSub)}</div>
      <div class="seg-wrap">${seg("data-filter", filters, f)}</div>
      <div class="section-note" style="margin:0;">${ui.instrSub === "stocks" ? `Данные на ${dateRu(dataDate)}, скринер investmint.ru. Доли бумаг — на экране «Доли» (строка «Акции»).` : `Цена 1 шт. = % номинала × 1 000 ₽ (без НКД). Лет до погашения — от даты данных ${dateRu(dataDate)}.`}</div>
    </div>
    <div class="card">
      <h2>${esc(title)}</h2>
      <div class="section-note">${esc(note)}</div>
      ${body || `<div class="empty">Нет инструментов с таким статусом</div>`}
      ${count ? `<div class="lock-note" style="margin-top:6px;">${count} ${plural(count, "инструмент", "инструмента", "инструментов")}</div>` : ""}
    </div>`;
}

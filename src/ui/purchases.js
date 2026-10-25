/* Экран «Покупки»: план покупок на месяц по выбранному счёту и докупка акций (лесенка). */

import { fmt, pct, esc, num } from "../lib/format.js";
import { numField, line, mq, accountPicker } from "./components.js";
import { renderLadder } from "./ladder.js";

export function renderPurchases({ state, d, x, ui }){
  const acc = x.acc, pp = x.purchase;
  const assetName = id => (x.assets.find(a => a.id === id) || {}).name || "";

  const rows = acc.purchases.map((def, i) => {
    const r = pp.rows[i];
    if(!(r.share > 0) && !def.noPrice && def.price == null) return "";   // актив с долей 0 и без цены — не показываем
    const right = def.noPrice
      ? `<span class="inp-sfx">без цены</span>`
      : numField(`accounts.#${acc.id}.purchases.#${def.id}.price`, def.price, "rub", { nullable: true, placeholder: "цена", label: "Цена 1 шт., " + def.name });
    const result = def.noPrice
      ? `${fmt(r.amount)} → в остаток`
      : r.price == null
        ? `введите цену — пока ${fmt(r.amount)} в остатке`
        : `<b>${num(r.qty, 0)} шт.</b> · потрачено ${fmt(r.spent)} · остаток ${fmt(r.rest)}`;
    return `
    <div class="cat-level-row">
      <div class="cat-left">
        <div class="cat-name">${mq(esc(def.name) + (def.name !== assetName(def.asset) ? ` <span class="tag gray">${esc(assetName(def.asset))}</span>` : ""))}</div>
        <div class="cat-desc">доля ${pct(r.share, 2)} · сумма <b>${fmt(r.amount)}</b></div>
        <div class="cat-desc" style="color:var(--text);">${result}</div>
        ${def.note ? `<div class="lock-note">${esc(def.note)}</div>` : ""}
      </div>
      <div class="cat-right">${right}</div>
    </div>`;
  }).join("");

  const ladder = x.stockIdx >= 0 ? renderLadder({ state, d, x, ui }) : "";

  return `
    <div class="card">
      ${accountPicker(state, acc.id)}
      <h2>План покупок на месяц</h2>
      <div class="section-note">Взнос ${fmt(acc.monthly)}${x.periods.length > 1 ? ` по долям ${esc(x.periods[x.cur])}` : ""}. Цена 1 шт. — с НКД для облигаций; штуки = вниз до целого.</div>
      ${rows || `<div class="empty">Нет активов с долей</div>`}
      <div style="margin-top:6px;">
        ${line("Потрачено на покупки", fmt(pp.spent))}
        ${line("Остаток (округление + строки без цены)", fmt(pp.rest), { container: true })}
      </div>
      ${pp.rest > 0.005 ? `<div class="lvl-note warn" style="margin-top:8px;">💡 Остаток ${fmt(pp.rest)} → докупите фондом денежного рынка (LQDT / AKMM / SBMM). Он же — резерв для докупок акций.</div>` : ""}
    </div>
    ${ladder}`;
}

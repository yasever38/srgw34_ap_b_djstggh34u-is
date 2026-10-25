/* Экран «Счета»: ИИС-3 и добавленные инвестиционные счета — взносы, доходность,
   через 12 месяцев и 5 лет, вычет по ИИС-3. */

import { fmt, fmt0, pct, esc, plural, dateRu } from "../lib/format.js";
import { PRESETS } from "../data/defaults.js";
import { line, numField } from "./components.js";
import { openedField } from "./settings.js";

function setRow(name, note, field){
  return `
    <div class="cat-level-row">
      <div class="cat-left"><div class="cat-name">${name}</div>${note ? `<div class="cat-desc">${note}</div>` : ""}</div>
      <div class="cat-right">${field}</div>
    </div>`;
}

function accountCard(x, s){
  const a = x.acc, sm = x.summary;
  const base = `accounts.#${a.id}`;
  const preset = PRESETS.find(p => p.id === x.strategy);
  const tag = `<span class="tag gray">${preset ? esc(preset.label.toLowerCase()) : "свои доли"}</span>`
    + (x.isIis ? ` <span class="tag gold">вычет ${pct(s.ndfl)}</span>` : "");
  const over = sm.overLimit > 0
    ? `<div class="lvl-note warn" style="margin-top:8px;">⚠ Взносы за год больше лимита вычета на ${fmt(sm.overLimit)} — на этот излишек вычета нет. Взнос до ${fmt(Math.floor(s.deductionLimit / 12))} в месяц даёт полный вычет.</div>` : "";
  return `
    <div class="card">
      <div class="h2-row">
        <h2>${esc(a.name)}</h2>
        <div style="display:flex; align-items:center; gap:6px;">${tag}
          <button type="button" class="icon-btn sm" data-action="renameAcc" data-id="${esc(a.id)}" aria-label="Переименовать" title="Переименовать">✎</button>
          ${x.isIis ? "" : `<button type="button" class="icon-btn sm" data-action="delAcc" data-id="${esc(a.id)}" aria-label="Удалить счёт" title="Удалить счёт">✕</button>`}
        </div>
      </div>
      ${x.isIis ? setRow("Дата открытия", `срок ${x.sched.years} ${plural(x.sched.years, "год", "года", "лет")} · разблокируется ${dateRu(x.sched.unlock)}`, openedField(a)) : ""}
      ${setRow("Взнос в месяц", x.isIis ? "вычет — с взносов до " + fmt(s.deductionLimit) + " в год" : "", numField(base + ".monthly", a.monthly, "rub", { label: "Взнос в месяц, " + a.name }))}
      ${line("В год", fmt(sm.year))}
      ${line(`Доходность по долям${x.isIis ? " " + x.periods[x.cur] : ""}`, pct(x.yieldNow, 2))}
      ${line("Через 12 мес. (взносы + доход)", fmt0(sm.fv12))}
      ${x.isIis ? line(`Налоговый вычет за год <span class="tag safe">${pct(s.ndfl)}</span>`, fmt0(sm.deduction)) : ""}
      ${line(x.isIis ? "Итого за год с вычетом" : "Итого за год", fmt0(sm.total12), { container: true })}
      ${over}
      <div style="height:6px;"></div>
      ${setRow("Доходность на 5 лет", "среднегодовая; пусто — как по долям", numField(base + ".rate5", a.rate5, "pct", { cls: "sm", nullable: true, min: -50, max: 100, placeholder: pct(x.yieldNow, 2).replace("%", ""), label: "Доходность на 5 лет" }))}
      ${line(x.isIis ? "Через 5 лет + вычеты" : "Через 5 лет", fmt0(sm.total5), { container: true })}
      <div class="add-income" style="margin-top:10px;">
        <button type="button" class="btn secondary" data-go="shares" data-acc="${esc(a.id)}">🥧 Доли</button>
        <button type="button" class="btn secondary" data-go="purchases" data-acc="${esc(a.id)}">🛒 Покупки</button>
      </div>
    </div>`;
}

export function renderAccounts({ state, d }){
  const t = d.totals, n = state.accounts.length;
  return `
    <div class="card">
      <h2>Всего по ${n} ${plural(n, "счёту", "счетам", "счетам")}</h2>
      ${line("Вкладываю в месяц", fmt(t.month), { container: true })}
      ${line("В год", fmt(t.year))}
      ${line("Через 12 мес." + (t.deduction > 0 ? " + вычет" : ""), fmt0(t.total12))}
      ${line("Через 5 лет" + (t.deduction5 > 0 ? " + вычеты" : ""), fmt0(t.total5), { container: true })}
    </div>
    ${d.accounts.map(x => accountCard(x, state.settings)).join("")}
    <button type="button" class="btn" data-action="addAcc">＋ Добавить счёт</button>
    <div class="lock-note" style="margin:8px 4px 12px;">Брокерский счёт, второй портфель, копилка на цель — с готовым набором долей: консервативные, умеренные или агрессивные накопления. Доли и активы потом можно менять.</div>`;
}

// Окно «Новый счёт»: название, взнос и пресет.
export function addAccountHTML(){
  return `<div class="m-form">
      <label class="field">Название</label>
      <input type="text" id="accName" placeholder="Напр. Брокерский счёт" maxlength="40" autocomplete="off">
      <div style="height:8px;"></div>
      <label class="field">Взнос в месяц, ₽</label>
      <input type="text" id="accMonthly" placeholder="0" inputmode="decimal" autocomplete="off">
      <div style="height:10px;"></div>
      <label class="field">Набор долей</label>
      <div class="more-list" style="margin:0;">${PRESETS.map((p, i) => `
        <button type="button" data-preset="${p.id}" class="${i === 1 ? "active" : ""}">
          <span>${esc(p.name)}<small>${esc(p.note)}</small><small>${presetLine(p)}</small></span></button>`).join("")}</div>
    </div>`;
}

const SHORT = { ofz: "ОФЗ", aaa: "ААА", float: "флоатеры", stocks: "акции", gold: "золото", mm: "ДР" };
function presetLine(p){
  return Object.keys(p.shares).map(k => `${SHORT[k]} ${pct(p.shares[k])}`).join(" · ");
}

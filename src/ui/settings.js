/* Экраны «Настройки» и «Правила». */

import { esc, plural, dateRu } from "../lib/format.js";
import { iisMinTerm } from "../lib/iis.js";
import { RULES } from "../data/rules.js";
import { MIN_TERM, MAX_TERM } from "../state.js";
import { withYears } from "../model.js";
import { numField, seg } from "./components.js";
import { ladderSettingsHTML } from "./ladder.js";

// Поле «Дата открытия» ИИС-3 (и на экране «Счета»).
export function openedField(acc){
  return `<input type="date" class="cat-inp" style="width:150px;" data-path="accounts.#${esc(acc.id)}.opened" data-kind="date" min="2024-01-01" value="${esc(acc.opened)}" aria-label="Дата открытия ИИС-3">`;
}

function setRow(name, note, field){
  return `
    <div class="cat-level-row">
      <div class="cat-left"><div class="cat-name">${name}</div>${note ? `<div class="cat-desc">${note}</div>` : ""}</div>
      <div class="cat-right">${field}</div>
    </div>`;
}

export function renderSettings({ state, d }){
  const s = state.settings, x = d.iis, sc = x.sched;
  const last = sc.periods[2];
  return `
    <div class="card">
      <h2>ИИС-3</h2>
      ${setRow("Дата открытия", `срок ${sc.years} ${plural(sc.years, "год", "года", "лет")} · разблокируется ${dateRu(sc.unlock)}`, openedField(x.acc))}
      ${setRow("Срок, лет", `пусто — минимальный по закону: ${iisMinTerm(sc.openYear)} для счёта ${sc.openYear} г.`,
        numField(`accounts.#${x.acc.id}.term`, x.acc.term, "int", { cls: "sm", nullable: true, min: MIN_TERM, max: MAX_TERM, sfx: "", placeholder: String(iisMinTerm(sc.openYear)), label: "Срок ИИС, лет" }))}
      ${setRow(`ИИС закрываю в ${sc.closeYear}`, `да — с ${last.from} акции и золото не докупаем (их доли ${esc(last.label)} = 0)`,
        seg('data-toggle="settings.closeAtEnd" data-val', [{ value: "true", label: "Да" }, { value: "false", label: "Нет" }], String(s.closeAtEnd)))}
      ${setRow("Ставка НДФЛ (вычет)", "", numField("settings.ndfl", s.ndfl, "pct", { cls: "sm", min: 0, max: 100, label: "НДФЛ" }))}
      ${setRow("Лимит взносов для вычета", "₽ в год", numField("settings.deductionLimit", s.deductionLimit, "rub", { label: "Лимит вычета" }))}
    </div>

    <div class="card">
      <h2>Акции и лесенка</h2>
      ${setRow("Сразу на первые ступени", "доля бюджета на акции; остальное — в резерв докупок", numField("settings.stocksImmediate", s.stocksImmediate, "pct", { cls: "sm", min: 0, max: 100, label: "Доля сразу на акции" }))}
      ${ladderSettingsHTML(state, d)}
    </div>

    <div class="card">
      <h2>Данные</h2>
      ${setRow("Дата рыночных данных", "от неё считаются «лет до погашения»",
        `<input type="date" class="cat-inp" style="width:150px;" data-path="settings.dataDate" data-kind="date" value="${esc(s.dataDate)}" aria-label="Дата рыночных данных">`)}
      <div class="section-note" style="margin-top:8px;">Всё хранится только в этом браузере. Делайте резервную копию — браузер может очистить свои данные.</div>
      <div class="add-income">
        <button type="button" class="btn" data-action="export">⬇ Экспорт JSON</button>
        <button type="button" class="btn secondary" data-action="import">⬆ Импорт JSON</button>
      </div>
      <div style="height:8px;"></div>
      <button type="button" class="btn danger" data-action="reset">↺ Сбросить к значениям по умолчанию</button>
    </div>`;
}

export function renderRules({ d }){
  let n = 0;
  const sc = d.iis.sched;
  return RULES.map(g => `
    <div class="card">
      <h2>${esc(g.title)}</h2>
      <ul class="nl">${g.items.map(t => `<li><span class="n">${++n}</span><span>${esc(withYears(t, sc))}</span></li>`).join("")}</ul>
    </div>`).join("");
}

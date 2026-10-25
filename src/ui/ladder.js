/* Докупка акций (лесенка) — блок экрана «Покупки» для выбранного счёта,
   и настройки ступеней для экрана «Настройки». */

import { fmt, fmt0, pct, pctSigned, esc, num } from "../lib/format.js";
import { numField, banner, metric, seg } from "./components.js";

export function ladderSettingsHTML(state, d){
  const s = state.settings;
  const lv = s.ladderLevels.map((v, i) => `
    <div><label class="field">Ступень ${i + 2}: падение от 1-й цены</label>
      <div style="display:flex; align-items:center; gap:6px;"><span class="inp-sfx">−</span>${numField(`settings.ladderLevels.${i}`, v, "pct", { cls: "sm", min: 0, max: 99, label: `Уровень ступени ${i + 2}` })}</div></div>`).join("");
  const sh = s.ladderShares.map((v, i) => `
    <div><label class="field">Доля ступени ${i + 1}</label>${numField(`settings.ladderShares.${i}`, v, "pct", { cls: "sm", min: 0, max: 100, label: `Доля ступени ${i + 1}` })}</div>`).join("");
  const sum = s.ladderShares.reduce((a, b) => a + b, 0);
  return `
    <div class="field-grid">${lv}</div>
    <div class="field-grid" style="margin-top:10px;">${sh}</div>
    <div style="margin-top:8px;">${banner(d.ladderOk, "Доли ступеней — 100%", `Доли ступеней дают ${pct(sum, 2)} — должно быть 100%`)}</div>`;
}

function hintHTML(h){
  if(h.kind === "good") return `<div class="hint-chip good">✓ ${h.verb} ${num(h.qty, 0)} шт. ≈ ${fmt0(h.cost)}</div>`;
  if(h.kind === "bad") return `<div class="hint-chip bad">⛔ ${esc(h.text)}</div>`;
  if(h.noFirst) return `<div class="hint-chip gray">⏳ Ждать: плана 1-й ступени не хватает на 1 лот</div>`;
  return `<div class="hint-chip gray">⏳ Ждать: следующая ступень при цене ${num(h.nextPrice, 2)} ₽</div>`;
}

export function renderLadder({ state, d, x, ui }){
  const acc = x.acc, s = state.settings;
  const opts = sel => d.sectors.map(sec => `<optgroup label="${esc(sec.name)}">${sec.papers.map(p =>
    `<option value="${esc(p.ticker)}" ${p.ticker === sel ? "selected" : ""}>${esc(p.ticker)} — ${esc(p.name)}${p.share > 0 && sec.share > 0 ? "" : " (запасная)"}</option>`).join("")}</optgroup>`).join("");

  const positions = x.positions.map(y => {
    const { pos, paper, sector: sec, calc: c } = y;
    const base = `accounts.#${acc.id}.ladder.#${pos.id}`;
    const main = paper && paper.share > 0 && sec && sec.share > 0;
    const roleTag = paper ? (main ? `<span class="tag safe">Основная</span>` : `<span class="tag gray">Запасная</span>`) : "";
    const tooSmall = c.firstStepTooSmall
      ? `<div class="lvl-note warn" style="margin-top:8px;">⚠ План × доля 1-й ступени (${fmt(y.plan * s.ladderShares[0])}) меньше цены лота (${fmt(y.price * c.lot)}). Уменьшите число компаний, увеличьте план или выберите бумагу дешевле.</div>` : "";
    // Поля позиции свёрнуты под ✎ — на экране остаются подсказка и главные цифры.
    const open = ui.expanded.has("pos:" + pos.id);
    const avg = c.avgNow == null && c.avgAfter == null ? "—" : `${c.avgNow == null ? "—" : fmt(c.avgNow)} → ${c.avgAfter == null ? "—" : fmt(c.avgAfter)}`;
    const be = c.beNow == null && c.beAfter == null ? "—" : `${c.beNow == null ? "—" : pctSigned(c.beNow)} → ${c.beAfter == null ? "—" : pctSigned(c.beAfter)}`;
    return `
    <div class="pos">
      <div class="pos-head">
        <select class="form-select" data-path="${base}.ticker" data-kind="str" aria-label="Тикер">${opts(pos.ticker)}</select>
        ${roleTag}
        <button type="button" class="icon-btn ${open ? "active-btn" : ""}" data-expand="pos:${esc(pos.id)}" aria-expanded="${open}" aria-label="Данные позиции" title="Данные позиции">✎</button>
        <button type="button" class="icon-btn" data-action="delPos" data-id="${esc(pos.id)}" aria-label="Удалить позицию" title="Удалить позицию">✕</button>
      </div>
      <div class="pos-sum">цена <b>${y.price == null ? "—" : fmt(y.price)}</b> · 1-я покупка <b>${pos.p1 ? fmt(pos.p1) : "—"}</b> · вложено <b>${fmt(pos.invested)}</b> · <b>${num(pos.bought, 0)} шт.</b> · план <b>${fmt(y.plan)}</b>${pos.problems ? ' · <b style="color:var(--danger)">проблемы в компании</b>' : ""}</div>
      ${open ? `<div class="field-grid">
        <div><label class="field">Цена сейчас</label>${paper && sec ? numField(`sectors.${sec.id}.papers.${paper.ticker}.price`, y.price, "rub", { label: "Цена сейчас" }) : "—"}</div>
        <div><label class="field">Цена 1-й покупки</label>${numField(base + ".p1", pos.p1, "rub", { nullable: true, placeholder: "ещё не покупал", label: "Цена 1-й покупки" })}</div>
        <div><label class="field">Вложено</label>${numField(base + ".invested", pos.invested, "rub", { label: "Вложено" })}</div>
        <div><label class="field">Куплено, шт.</label>${numField(base + ".bought", pos.bought, "int", { sfx: "", label: "Куплено, шт." })}</div>
        <div><label class="field">План на позицию</label>${numField(base + ".plan", pos.plan, "rub", { nullable: true, placeholder: num(x.budget.perPosition, 0), label: "План на позицию" })}</div>
        <div><label class="field">Лот, шт.</label>${numField(base + ".lot", pos.lot, "int", { min: 1, sfx: "", label: "Лот" })}</div>
        <div class="full"><label class="field">Проблемы в самой компании?</label>${seg(`data-toggle="${base}.problems" data-val`, [{ value: "false", label: "Нет" }, { value: "true", label: "Да" }], String(!!pos.problems))}</div>
      </div>` : ""}
      ${hintHTML(c.hint)}
      <div class="metrics">
        ${metric(`ступень ${c.step} из 4`, pos.p1 ? "падение " + pctSigned(c.fall) : "1-я покупка", true)}
        ${metric(fmt(c.target), "должно быть вложено")}
        ${metric(fmt(c.toBuy), "докупить, ₽")}
        ${metric(c.nextPrice == null ? "—" : fmt(c.nextPrice), "цена след. ступени")}
        <div class="metric" style="grid-column:span 2;"><div class="mv">${avg}</div><div class="mc">средняя: сейчас → после</div></div>
        <div class="metric" style="grid-column:span 2;"><div class="mv">${be}</div><div class="mc">до безубытка: сейчас → после</div></div>
      </div>
      ${tooSmall}
    </div>`;
  }).join("");

  const lv = s.ladderLevels.map(v => "−" + pct(v)).join(" / ");
  return `
    <div class="card">
      <h2>Докупка акций</h2>
      <div class="section-note">Ступени 2 / 3 / 4 — при падении ${lv} от цены 1-й покупки, доли ступеней ${s.ladderShares.map(v => pct(v)).join(" / ")} (Ещё → Настройки). Деньги на докупки ждут в фонде денежного рынка.</div>
      ${positions || `<div class="empty">Позиций пока нет</div>`}
      <div style="height:10px;"></div>
      <button type="button" class="btn secondary" data-action="addPos">＋ Добавить позицию</button>
    </div>`;
}

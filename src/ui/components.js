/* Общие компоненты интерфейса — перенесены из приложения «Бюджет»:
   уведомления (toast), окно подтверждения, бегущая строка; плюс мелкие
   HTML-помощники экранов ИИС-3. */

import { esc, fmt, numInp } from "../lib/format.js";

/* ---------- уведомления ----------
   Сверху поверх экрана. Закрыть: ✕, смахнуть вбок или подождать.
   type: "err" | "warn" | "ok". */
const TOAST_MS = 7000;
export function toast(msg, type){
  type = type || "err";
  const box = document.getElementById("toasts");
  if(!box) return;
  [...box.children].forEach(el => { if(el.dataset.msg === msg) el.remove(); });
  while(box.children.length >= 3) box.firstElementChild.remove();
  const el = document.createElement("div");
  el.className = "toast " + type;
  el.dataset.msg = msg;
  el.setAttribute("role", type === "ok" ? "status" : "alert");
  const ic = document.createElement("span"); ic.className = "t-ic"; ic.textContent = type === "ok" ? "✓" : type === "warn" ? "💡" : "⚠";
  const txt = document.createElement("span"); txt.className = "t-txt"; txt.textContent = msg;
  const x = document.createElement("button"); x.type = "button"; x.className = "t-x"; x.setAttribute("aria-label", "Закрыть"); x.textContent = "✕";
  el.append(ic, txt, x);
  box.appendChild(el);

  let timer = null;
  const close = (dir) => {
    clearTimeout(timer);
    el.style.transform = dir ? `translateX(${dir * 120}%)` : "translateY(-10px)";
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 200);
  };
  const arm = () => { clearTimeout(timer); timer = setTimeout(() => close(0), TOAST_MS); };
  x.addEventListener("click", () => close(0));
  arm();

  let startX = null, dx = 0;
  el.addEventListener("pointerdown", e => {
    if(e.target === x) return;
    startX = e.clientX; dx = 0;
    el.classList.add("dragging");
    el.setPointerCapture(e.pointerId);
    clearTimeout(timer);
  });
  el.addEventListener("pointermove", e => {
    if(startX === null) return;
    dx = e.clientX - startX;
    el.style.transform = `translateX(${dx}px)`;
    el.style.opacity = String(Math.max(0.2, 1 - Math.abs(dx) / 240));
  });
  const end = () => {
    if(startX === null) return;
    startX = null;
    el.classList.remove("dragging");
    if(Math.abs(dx) > 70) close(dx > 0 ? 1 : -1);
    else { el.style.transform = ""; el.style.opacity = ""; arm(); }
  };
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
}

/* ---------- окно подтверждения ----------
   confirmDialog({title, html, okText, okClass, noButtons}, onOk). Закрывается по
   «Отмена», тапу по фону или Esc. onOk() вернул false — окно остаётся.
   Возвращает функцию закрытия. */
export function confirmDialog(opts, onOk){
  document.querySelector(".modal-back")?.remove();
  const back = document.createElement("div");
  back.className = "modal-back";
  back.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <h3>${esc(opts.title || "Подтвердите действие")}</h3>
      <div class="m-txt">${opts.html || ""}</div>
      <div class="m-btns">
        <button type="button" class="btn secondary" data-m-cancel>${esc(opts.cancelText || "Отмена")}</button>
        ${opts.noOk ? "" : `<button type="button" class="btn ${opts.okClass == null ? "danger-solid" : opts.okClass}" data-m-ok>${esc(opts.okText || "Удалить")}</button>`}
      </div>
    </div>`;
  const close = () => { back.remove(); document.removeEventListener("keydown", onKey); };
  const onKey = e => { if(e.key === "Escape") close(); };
  back.addEventListener("click", e => { if(e.target === back) close(); });
  back.querySelector("[data-m-cancel]").addEventListener("click", close);
  back.querySelector("[data-m-ok]")?.addEventListener("click", () => { if(onOk() !== false) close(); });
  document.addEventListener("keydown", onKey);
  document.body.appendChild(back);
  (opts.focus && back.querySelector(opts.focus) || back.querySelector("[data-m-ok]") || back.querySelector("[data-m-cancel]")).focus();
  return { el: back, close };
}

/* ---------- бегущая строка ----------
   Дублируем текст, анимация сдвига на −50%; прокрутка включается,
   только если текст не влезает. */
export function mq(html){
  return `<div class="marquee"><div class="marquee-track"><span>${html}</span><span>${html}</span></div></div>`;
}
export function setupMarquees(root){
  root.querySelectorAll(".marquee").forEach(el => {
    const track = el.querySelector(".marquee-track");
    const first = track.querySelector("span");
    el.classList.remove("scrolling"); el.classList.add("static");
    track.style.animationDuration = "";
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if(first.scrollWidth > el.clientWidth + 1){
        el.classList.remove("static"); el.classList.add("scrolling");
        track.style.animationDuration = Math.max(6, (first.scrollWidth + 28) / 40) + "s";
      }
    }));
  });
}

/* ---------- помощники разметки ---------- */
export const DISCLAIMER = "Не является индивидуальной инвестиционной рекомендацией.";

// Строка «подпись — значение» (стиль .row).
export function row(label, value, cls){
  return `<div class="row"><div class="label">${label}</div><div class="value ${cls || ""}">${value}</div></div>`;
}
// Строка дерева («Название [чип] … 13 675 ₽ · 50%»); container — итог золотом.
export function line(nameHTML, amountHTML, opts){
  const o = opts || {};
  return `<div class="tree-line ${o.container ? "container" : ""}">
    <div class="tname">${mq(nameHTML)}</div>
    <div class="tamount">${amountHTML}</div>
  </div>`;
}
// Поле ввода числа, привязанное к пути в состоянии (см. app.js → onChange).
// kind: rub | pct (в поле — проценты, в состоянии — доля) | int | num.
export function numField(path, value, kind, opts){
  const o = opts || {};
  const shown = value == null ? "" : kind === "pct" ? numInp(value * 100) : numInp(value);
  const sfx = o.sfx != null ? o.sfx : kind === "pct" ? "%" : kind === "rub" ? "₽" : "";
  return `<input type="text" class="cat-inp ${o.cls || ""}" data-path="${esc(path)}" data-kind="${kind}"
      ${o.nullable ? "data-null" : ""} ${o.min != null ? `data-min="${o.min}"` : ""} ${o.max != null ? `data-max="${o.max}"` : ""}
      ${o.disabled ? "disabled" : ""} value="${esc(shown)}" placeholder="${esc(o.placeholder || "")}"
      inputmode="decimal" autocomplete="off" aria-label="${esc(o.label || "")}">${sfx ? `<span class="inp-sfx">${sfx}</span>` : ""}`;
}
// Переключатель из чипов (.seg).
export function seg(attr, items, active){
  return `<div class="seg">${items.map(it =>
    `<button type="button" ${attr}="${esc(it.value)}" class="${String(it.value) === String(active) ? "active" : ""}">${esc(it.label)}</button>`).join("")}</div>`;
}
export function banner(ok, okText, badText){
  return `<div class="check-banner ${ok ? "good" : "bad"}">${ok ? "✓ " + okText : "⚠ " + badText}</div>`;
}
export function metric(value, caption, hl){
  return `<div class="metric ${hl ? "hl" : ""}"><div class="mv">${value}</div><div class="mc">${caption}</div></div>`;
}
export function footer(dataDate){
  return `<div class="foot-note">${DISCLAIMER}<br>Рыночные данные на ${esc(dataDate)}. Это расчёт по допущениям, а не прогноз.</div>`;
}
export function money(v){ return v == null ? "—" : fmt(v); }

// Выбор счёта (чипы). Один счёт — выбирать нечего, показываем название.
export function accountPicker(state, accId){
  if(state.accounts.length < 2) return "";
  return `<div class="seg-wrap acc-pick">${seg("data-acc", state.accounts.map(a => ({ value: a.id, label: a.name })), accId)}</div>`;
}

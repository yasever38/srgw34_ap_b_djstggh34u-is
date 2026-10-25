/* Форматирование по-русски (ru-RU) — чистые функции без DOM. */

export function n2(v){ return (typeof v === "number" && isFinite(v)) ? v : 0; }
export function round2(v){ return Math.round(n2(v) * 100) / 100; }

// «13 675 ₽», с копейками только если они есть: «4 102,50 ₽».
export function fmt(n){
  n = round2(n);
  if(n % 1 === 0) return n.toLocaleString("ru-RU", { maximumFractionDigits: 0 }) + " ₽";
  return n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₽";
}
// Целые рубли — для прогнозов, где копейки ничего не значат: «351 110 ₽».
export function fmt0(n){ return Math.round(n2(n)).toLocaleString("ru-RU", { maximumFractionDigits: 0 }) + " ₽"; }
// Число без знака рубля: «8», «4 102,5».
export function num(n, digits){
  const d = digits == null ? 2 : digits;
  return n2(n).toLocaleString("ru-RU", { maximumFractionDigits: d });
}
// Доля (0,157) → «15,7%». digits — максимум знаков после запятой, minDigits — минимум («55,0%»).
export function pct(frac, digits, minDigits){
  const d = digits == null ? 1 : digits;
  return (n2(frac) * 100).toLocaleString("ru-RU", { maximumFractionDigits: d, minimumFractionDigits: minDigits || 0 }) + "%";
}
// Доля со знаком: «−11,5%», «+26,3%».
export function pctSigned(frac, digits){
  const v = n2(frac);
  const s = pct(Math.abs(v), digits);
  return (v > 0 ? "+" : v < 0 ? "−" : "") + s;
}

// Число из поля ввода: «37,5», «37.5», «1 000». Пусто или мусор — NaN.
export function parseNum(s){
  const t = String(s == null ? "" : s).replace(/[\s  ]/g, "").replace(",", ".");
  return /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t) ? parseFloat(t) : NaN;
}
// Значение для поля ввода — с запятой: 61.5 → «61,5». null → пусто.
export function numInp(v){ return v == null ? "" : String(round2Smart(v)).replace(".", ","); }
function round2Smart(v){ return Math.round(n2(v) * 1e6) / 1e6; }

export function esc(s){
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Склонение: plural(5, "бумага", "бумаги", "бумаг") → «бумаг».
export function plural(n, one, few, many){
  const a = Math.abs(n) % 100, b = a % 10;
  if(a > 10 && a < 20) return many;
  if(b === 1) return one;
  if(b >= 2 && b <= 4) return few;
  return many;
}

// 2026-10-23 → 23.10.2026
export function dateRu(iso){
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
  return m ? `${m[3]}.${m[2]}.${m[1]}` : String(iso || "");
}

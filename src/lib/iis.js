/* =====================================================================
   РАСЧЁТЫ ИИС-3 — чистые функции, без DOM и без состояния приложения.
   Все доли и ставки — дробями (0,157 = 15,7%), суммы — в рублях.
   Формулы повторяют таблицу ИИС-3.xlsx (листы «Сводка», «ИИС — распределение»,
   «Акции — топ»), план покупок и лесенку докупок.
   ===================================================================== */

const EPS = 1e-9;
const isNum = v => typeof v === "number" && isFinite(v);
const sum = a => a.reduce((s, x) => s + x, 0);

/* ---------- будущая стоимость ---------- */
// Аналог Excel FV(rate; n; −pmt): платёж в конце каждого периода.
export function fv(rate, n, pmt){
  if(Math.abs(rate) < EPS) return pmt * n;
  return pmt * (Math.pow(1 + rate, n) - 1) / rate;
}
// FV12(P, r) = P × ((1 + r/12)^12 − 1) / (r/12)
export function fv12(P, r){ return fv(r / 12, 12, P); }

/* ---------- срок ИИС-3 ----------
   Минимальный срок: 5 лет для счетов, открытых в 2024–2026 гг., дальше +1 год
   за каждый год открытия, с 2031 г. — 10 лет. */
export function iisMinTerm(openYear){
  return openYear <= 2026 ? 5 : Math.min(10, openYear - 2021);
}

// opened — дата открытия «ГГГГ-ММ-ДД», term — свой срок в годах (null — по закону).
// Три периода долей: последние 2 года срока, 2 года перед ними и всё раньше.
export function iisSchedule(opened, term){
  const openYear = +opened.slice(0, 4);
  const years = term || iisMinTerm(openYear);
  const closeYear = openYear + years;
  const leap = y => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const md = opened.slice(5) === "02-29" && !leap(closeYear) ? "02-28" : opened.slice(5);
  const span = (from, to) => ({ from, to, label: from === to ? String(from) : `${from}–${to}` });
  return {
    openYear, years, closeYear, unlock: `${closeYear}-${md}`,
    periods: [span(openYear, closeYear - 4), span(closeYear - 3, closeYear - 2), span(closeYear - 1, closeYear)],
  };
}

// Номер периода, в который попадает год (раньше срока — первый, позже — последний).
export function periodOfYear(periods, year){
  const i = periods.findIndex(p => year >= p.from && year <= p.to);
  return i >= 0 ? i : year < periods[0].from ? 0 : periods.length - 1;
}

/* ---------- доли активов ----------
   asset: {id, yield, shares:[доля по периодам], lockWhenClosing?}.
   У ИИС-3 три периода (см. iisSchedule), у других счетов — один. */
export const LAST_PERIOD = 2;

// Действующая доля актива в периоде. Если ИИС закрывается по окончании срока,
// активы с lockWhenClosing (акции, золото) в последние 2 года не докупаются — 0.
export function effectiveShare(asset, period, closeAtEnd){
  if(isLocked(asset, period, closeAtEnd)) return 0;
  const v = asset.shares && asset.shares[period];
  return isNum(v) ? v : 0;
}
export function isLocked(asset, period, closeAtEnd){
  return !!(closeAtEnd && period === LAST_PERIOD && asset.lockWhenClosing);
}

// Распределение суммы amount по активам периода.
export function allocate(amount, assets, period, closeAtEnd){
  const rows = assets.map(a => {
    const share = effectiveShare(a, period, closeAtEnd);
    return { id: a.id, share, amount: amount * share };
  });
  const shareSum = sum(rows.map(r => r.share));
  return { rows, shareSum, ok: Math.abs(shareSum - 1) < 1e-6, total: sum(rows.map(r => r.amount)) };
}

// Взвешенная доходность периода = Σ(доля × ожидаемая доходность).
export function weightedYield(assets, period, closeAtEnd){
  return sum(assets.map(a => effectiveShare(a, period, closeAtEnd) * a.yield));
}

/* ---------- сводка по счёту ---------- */
// monthly — взнос ₽/мес; rate — доходность на год (взвешенная по долям);
// rate5 — среднегодовая на 5 лет; iis — счёт ИИС-3 (вычет 13%).
export function accountSummary(monthly, rate, rate5, iis, s){
  const year = monthly * 12;
  const deduction = iis ? Math.min(year, s.deductionLimit) * s.ndfl : 0;
  const fvYear = fv12(monthly, rate);
  const fv5 = fv(rate5 / 12, 60, monthly);
  return {
    month: monthly, year, rate, rate5,
    fv12: fvYear, deduction, total12: fvYear + deduction,
    overLimit: iis ? Math.max(0, year - s.deductionLimit) : 0,
    fv5, deduction5: 5 * deduction, total5: fv5 + 5 * deduction,
  };
}

/* ---------- акции: секторы и бумаги ---------- */
// sectors: [{id, share, papers:[{ticker, share, price, bank?}]}]
// Основные бумаги — с долей > 0 в секторе с долей > 0.
export function mainPapers(sectors){
  const out = [];
  sectors.forEach(sec => {
    if(!(sec.share > 0)) return;
    sec.papers.forEach(p => { if(p.share > 0) out.push(p); });
  });
  return out;
}

// Бюджет на акции (по долям текущего периода). immediate — доля сразу на первые ступени.
export function stockBudget(iisMonthly, stocksShare, immediate, sectors){
  const month = iisMonthly * stocksShare;
  const now = month * immediate;
  const year = month * 12;
  const count = mainPapers(sectors).length;
  return { month, now, reserve: month - now, year, count, perPosition: count > 0 ? year * 2 / count : 0 };
}

// Суммы по секторам и бумагам: monthly — от ₽/мес на акции, calc — от суммы
// калькулятора на акции (текущий период).
export function stockTable(sectors, stocksMonthly, stocksCalc){
  const secSum = sum(sectors.map(s => s.share));
  return {
    sectorsOk: Math.abs(secSum - 1) < 1e-6, sectorSum: secSum,
    sectors: sectors.map(sec => {
      const monthly = stocksMonthly * sec.share, calc = stocksCalc * sec.share;
      const paperSum = sum(sec.papers.map(p => p.share));
      const papers = sec.papers.map(p => {
        const pm = monthly * p.share;
        return { ticker: p.ticker, share: p.share, monthly: pm, calc: calc * p.share,
          monthsPerShare: pm > 0 && p.price > 0 ? p.price / pm : null, main: sec.share > 0 && p.share > 0 };
      });
      const banks = sec.papers.filter(p => p.bank && p.share > 0).length;
      return { id: sec.id, share: sec.share, monthly, calc, papers, paperSum,
        ok: Math.abs(paperSum - 1) < 1e-6, mains: papers.filter(p => p.share > 0).map(p => p.ticker), banks };
    }),
  };
}

/* ---------- калькулятор суммы ---------- */
// Активы × периоды в рублях; под акциями (stockIdx, −1 — нет) — секторы и бумаги.
// income — ожидаемый доход за год по долям периода period.
export function calculator(amount, assets, periodCount, closeAtEnd, sectors, stockIdx, period){
  const periods = [];
  for(let p = 0; p < periodCount; p++) periods.push(allocate(amount, assets, p, closeAtEnd));
  const stockAmt = pr => stockIdx >= 0 ? pr.rows[stockIdx].amount : 0;
  const stockShare = pr => stockIdx >= 0 ? pr.rows[stockIdx].share : 0;
  const sectorRows = sectors.map(sec => ({
    id: sec.id,
    share: periods.map(pr => stockShare(pr) * sec.share),
    amount: periods.map(pr => stockAmt(pr) * sec.share),
    papers: sec.papers.map(p => ({ ticker: p.ticker, share: p.share,
      amount: periods.map(pr => stockAmt(pr) * sec.share * p.share) })),
  }));
  const pi = period || 0;
  const income = sum(assets.map((a, i) => periods[pi].rows[i].amount * a.yield));
  const checks = periods.map((pr, p) => ({
    distributed: Math.abs(pr.total - amount) < 0.5,
    sectors: Math.abs(sum(sectorRows.map(s => s.amount[p])) - stockAmt(pr)) < 0.5,
  }));
  return { periods, sectorRows, income, checks };
}

/* ---------- план покупок на месяц ---------- */
// rows: [{id, share, price|null}] — доля от взноса на ИИС и цена 1 шт. с НКД.
// шт. = floor(сумма / цена); строки без цены целиком уходят в остаток.
export function purchasePlan(iisMonthly, rows){
  const out = rows.map(r => {
    const amount = iisMonthly * r.share;
    const hasPrice = isNum(r.price) && r.price > 0;
    const qty = hasPrice ? Math.floor(amount / r.price + EPS) : 0;
    const spent = Math.round(qty * (hasPrice ? r.price : 0) * 100) / 100;
    return { id: r.id, share: r.share, amount, price: hasPrice ? r.price : null, qty, spent, rest: amount - spent };
  });
  const total = sum(out.map(r => r.amount)), spent = sum(out.map(r => r.spent));
  return { rows: out, total, spent, rest: total - spent };
}

/* ---------- лесенка докупок ---------- */
// ladder: {levels:[0.15,0.25,0.35] — падение для ступеней 2/3/4, shares:[4 доли, сумма 1]}
// pos: {plan, p1|null, invested, bought, lot, problems}; price — текущая цена 1 акции.
export function ladderStep(fall, levels){
  if(fall <= -levels[2] + EPS) return 4;
  if(fall <= -levels[1] + EPS) return 3;
  if(fall <= -levels[0] + EPS) return 2;
  return 1;
}

export function ladderPosition(pos, price, ladder){
  const lot = pos.lot > 0 ? pos.lot : 1;
  const hasP1 = isNum(pos.p1) && pos.p1 > 0;
  const hasPrice = isNum(price) && price > 0;
  const fall = hasP1 && hasPrice ? price / pos.p1 - 1 : 0;
  const step = ladderStep(fall, ladder.levels);
  const cumShare = sum(ladder.shares.slice(0, step));
  const target = pos.plan * cumShare;
  const invested = pos.invested || 0, bought = pos.bought || 0;
  const toBuy = pos.problems ? 0 : Math.max(0, target - invested);
  const lotCost = hasPrice ? price * lot : 0;
  const qty = lotCost > 0 ? Math.floor(toBuy / lotCost + EPS) * lot : 0;
  const cost = qty * (hasPrice ? price : 0);
  const avgNow = bought > 0 ? invested / bought : null;
  const avgAfter = bought + qty > 0 ? (invested + cost) / (bought + qty) : null;
  const beNow = avgNow != null && hasPrice ? avgNow / price - 1 : null;
  const beAfter = avgAfter != null && hasPrice ? avgAfter / price - 1 : null;
  const nextPrice = hasP1 && step < 4 ? pos.p1 * (1 - ladder.levels[step - 1]) : null;
  const firstStepTooSmall = hasPrice && pos.plan * ladder.shares[0] < price * lot;

  let hint;
  if(pos.problems) hint = { kind: "bad", text: "НЕ докупать: сначала разберитесь в причинах падения" };
  else if(qty > 0) hint = { kind: "good", verb: bought > 0 ? "Докупить" : "Купить", qty, cost };
  else if(step === 4) hint = { kind: "bad", text: "Лесенка исчерпана — дальше НЕ докупать" };
  else if(nextPrice != null) hint = { kind: "gray", nextPrice };
  else hint = { kind: "gray", noFirst: true };

  return { fall, step, cumShare, target, toBuy, qty, cost, avgNow, avgAfter, beNow, beAfter,
    nextPrice, firstStepTooSmall, hint, lot };
}

/* ---------- справочник инструментов ---------- */
const DAY = 86400000;
function isoToUtc(iso){
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : NaN;
}
// Лет до погашения от даты рыночных данных (как в xlsx: дни / 365,25).
export function yearsTo(maturity, dataDate){
  const a = isoToUtc(maturity), b = isoToUtc(dataDate);
  return isFinite(a) && isFinite(b) ? (a - b) / DAY / 365.25 : null;
}
// Цена 1 шт. = % номинала × 1000; дисконт до номинала = 1000 − цена.
export function unitPrice(pricePct){ return isNum(pricePct) ? pricePct * 1000 : null; }
export function discount(pricePct){ return isNum(pricePct) ? 1000 - pricePct * 1000 : null; }

// Статусы из xlsx → три группы фильтра.
export function statusGroup(status){
  const s = String(status || "");
  if(s.indexOf("★") === 0) return "main";
  if(/^(Не брать|Осторожно)/i.test(s)) return "no";
  return "alt";
}

/* ---------- проверки ---------- */
export function sharesOk(arr){ return Math.abs(sum(arr) - 1) < 1e-6; }

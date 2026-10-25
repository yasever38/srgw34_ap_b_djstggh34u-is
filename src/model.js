/* Модель: из состояния (что ввёл пользователь) + справочников собирает
   входы для src/lib/iis.js и возвращает рассчитанные величины по каждому
   счёту и итоги. Без DOM. */

import * as iis from "./lib/iis.js";
import { ASSETS, IIS_ROLES, PLAIN_PERIODS } from "./data/defaults.js";
import { SECTORS } from "./data/stocks.js";
import { matchPreset } from "./state.js";

const sum = a => a.reduce((s, x) => s + x, 0);

// Справочник секторов с долями и ценами пользователя.
export function mergedSectors(state){
  return SECTORS.map(sec => {
    const us = state.sectors[sec.id] || {};
    return Object.assign({}, sec, {
      share: us.share != null ? us.share : sec.share,
      papers: sec.papers.map(p => {
        const up = (us.papers || {})[p.ticker] || {};
        return Object.assign({}, p, {
          share: up.share != null ? up.share : p.share,
          price: up.price != null ? up.price : p.price,
        });
      }),
    });
  });
}

export function findPaper(sectors, ticker){
  for(const sec of sectors){
    const p = sec.papers.find(x => x.ticker === ticker);
    if(p) return { sector: sec, paper: p };
  }
  return null;
}

// Годы в тексте: {last} — начало последнего периода ИИС-3, {close} — год окончания срока.
export function withYears(text, sched){
  return text.replace(/\{last\}/g, sched.periods[2].from).replace(/\{close\}/g, sched.closeYear);
}

// Активы счёта с ролью, ссылкой «где выбирать» и блокировкой последних 2 лет (только ИИС-3).
export function accountAssets(acc, sched){
  const isIis = acc.kind === "iis3";
  return acc.assets.map(a => {
    const c = a.ref ? ASSETS[a.ref] : null;
    return Object.assign({}, a, {
      custom: !c,
      role: c ? (isIis && IIS_ROLES[a.ref] && withYears(IIS_ROLES[a.ref], sched)) || c.role : "Свой актив",
      where: c ? c.where : null, whereText: c ? c.whereText : "",
      lockWhenClosing: isIis && (a.ref === "stocks" || a.ref === "gold"),
    });
  });
}

// Всё по одному счёту. amount — сумма для раскладки в рублях (по умолчанию взнос);
// year — текущий год: по нему выбирается действующий период долей ИИС-3.
export function deriveAccount(state, acc, sectors, amount, year){
  const s = state.settings, close = s.closeAtEnd;
  const isIis = acc.kind === "iis3";
  const sched = isIis ? iis.iisSchedule(acc.opened, acc.term) : null;
  const assets = accountAssets(acc, sched);
  const periods = isIis ? sched.periods.map(p => p.label) : PLAIN_PERIODS;
  const cur = isIis ? iis.periodOfYear(sched.periods, year || new Date().getFullYear()) : 0;
  const yieldNow = iis.weightedYield(assets, cur, close);
  const rate5 = acc.rate5 != null ? acc.rate5 : yieldNow;
  const summary = iis.accountSummary(acc.monthly, yieldNow, rate5, isIis, s);
  const alloc = periods.map((_, p) => iis.allocate(acc.monthly, assets, p, close));

  const stockIdx = assets.findIndex(a => a.ref === "stocks");
  const stockShare = stockIdx >= 0 ? iis.effectiveShare(assets[stockIdx], cur, close) : 0;
  const budget = iis.stockBudget(acc.monthly, stockShare, s.stocksImmediate, sectors);

  const amt = amount != null ? amount : acc.monthly;
  const calc = iis.calculator(amt, assets, periods.length, close, sectors, stockIdx, cur);
  const stocks = iis.stockTable(sectors, budget.month, stockIdx >= 0 ? calc.periods[cur].rows[stockIdx].amount : 0);

  const shareOf = id => { const i = assets.findIndex(a => a.id === id); return i >= 0 ? iis.effectiveShare(assets[i], cur, close) : 0; };
  const partOf = part => part === "now" ? s.stocksImmediate : part === "reserve" ? 1 - s.stocksImmediate : part;
  const purchase = iis.purchasePlan(acc.monthly, acc.purchases.map(r => ({
    id: r.id, share: shareOf(r.asset) * partOf(r.part), price: r.noPrice ? null : r.price,
  })));

  const ladder = { levels: s.ladderLevels, shares: s.ladderShares };
  const positions = acc.ladder.map(pos => {
    const hit = findPaper(sectors, pos.ticker);
    const price = hit ? hit.paper.price : null;
    const plan = pos.plan != null ? pos.plan : budget.perPosition;
    return { pos, paper: hit && hit.paper, sector: hit && hit.sector, price, plan,
      calc: iis.ladderPosition(Object.assign({}, pos, { plan }), price, ladder) };
  });

  return { acc, isIis, sched, assets, periods, cur, strategy: matchPreset(acc), yieldNow, rate5, summary, alloc, stockIdx, budget, calc, stocks, purchase, positions, amount: amt };
}

export function derive(state, amounts, year){
  const sectors = mergedSectors(state);
  const accounts = state.accounts.map(acc => deriveAccount(state, acc, sectors, amounts && amounts[acc.id], year));
  const total = k => sum(accounts.map(a => a.summary[k]));
  return {
    sectors, accounts, iis: accounts.find(a => a.isIis),
    totals: { month: total("month"), year: total("year"), fv12: total("fv12"), deduction: total("deduction"),
      total12: total("total12"), fv5: total("fv5"), deduction5: total("deduction5"), total5: total("total5") },
    ladderOk: iis.sharesOk(state.settings.ladderShares),
  };
}

/* Значения по умолчанию — из таблицы ИИС-3.xlsx (лист «ИИС — распределение»).
   Доли и ставки — дробями. Рыночные данные на DATA_DATE. */

export const DATA_DATE = "2026-10-23";

export const SETTINGS = {
  ndfl: 0.13,
  deductionLimit: 400000, // лимит взносов на ИИС-3 для вычета, ₽/год
  stocksImmediate: 0.5,   // доля бюджета на акции сразу на первые ступени
  ladderLevels: [0.15, 0.25, 0.35],      // падение для ступеней 2 / 3 / 4
  ladderShares: [0.25, 0.25, 0.25, 0.25], // доли ступеней 1–4
  closeAtEnd: true,       // «ИИС закрываю по окончании срока»
  dataDate: DATA_DATE,
};

// Каталог стандартных активов. where — раздел справочника «где выбирать».
export const ASSETS = {
  ofz:    { name: "ОФЗ с фикс. купоном",  yield: 0.157, role: "Основа; держать до погашения", where: "ofz",   whereText: "ОФЗ: 26218 + 26235" },
  aaa:    { name: "Корп. облигации ААА",  yield: 0.148, role: "≤5% портфеля на эмитента",     where: "aaa",   whereText: "Корп ААА" },
  float:  { name: "Флоатеры ОФЗ-ПК",      yield: 0.13,  role: "Страховка от роста ставки",    where: "float", whereText: "Флоатеры: 29018" },
  stocks: { name: "Надёжные акции",       yield: 0.15,  role: "Лесенка докупок",              where: "stocks", whereText: "Акции: секторы и бумаги" },
  gold:   { name: "Золото (фонд)",        yield: 0.08,  role: "Защита от слабого рубля",      where: "funds", whereText: "Фонды: SBGD / AKGD" },
  mm:     { name: "Фонд денежного рынка", yield: 0.12,  role: "Резерв для докупок, «парковка»", where: "funds", whereText: "Фонды: LQDT / AKMM / SBMM" },
};
export const ASSET_ORDER = ["ofz", "aaa", "float", "stocks", "gold", "mm"];

// ИИС-3: роли с учётом срока счёта (лист «ИИС — распределение», колонка B).
// {last} — первый год последнего периода, {close} — год окончания срока.
export const IIS_ROLES = {
  ofz: "Основа; с {last} только погашение до 31.12.{close}",
  stocks: "Лесенка докупок; с {last} не докупать",
};

// У ИИС-3 три периода от даты открытия (iisSchedule), у остальных счетов — одна раскладка.
export const PLAIN_PERIODS = ["Доли"];

// Доли ИИС-3 по периодам: [первые годы, 2 года до последних, последние 2 года]
// (для счёта, открытого в 2026 г.: 2026–2027 / 2028–2029 / 2030–2031)
export const IIS_SHARES = {
  ofz:    [0.50, 0.40, 0.35],
  aaa:    [0.15, 0.15, 0.15],
  float:  [0.10, 0.10, 0.00],
  stocks: [0.15, 0.15, 0.00],
  gold:   [0.05, 0.05, 0.00],
  mm:     [0.05, 0.15, 0.50],
};

export const IIS_ACCOUNT = {
  kind: "iis3",
  name: "ИИС-3",
  monthly: 27350,
  rate5: 0.115, // среднегодовая за 5 лет (лист «Сводка», B33)
  opened: "2026-12-01", // дата открытия: от неё срок и периоды долей
  term: null,           // свой срок, лет; null — минимальный по закону
};

// Стратегии (пресеты) счетов. Ориентиры — доли можно менять.
// shares — для обычного счёта, iisShares — для ИИС-3 по трём периодам
// (в последние 2 года акций и золота нет: счёт закрывается). Умеренная у ИИС-3 — доли из таблицы.
export const PRESETS = [
  { id: "conservative", name: "Консервативные накопления", label: "Консервативная",
    note: "Облигации и денежный рынок, акций минимум. Меньше колебаний, ниже доход.",
    shares: { ofz: 0.45, aaa: 0.25, stocks: 0.05, gold: 0.05, mm: 0.20 },
    iisShares: { ofz: [0.55, 0.50, 0.40], aaa: [0.20, 0.20, 0.15], float: [0.10, 0.10, 0], stocks: [0.05, 0.05, 0], gold: [0.05, 0.05, 0], mm: [0.05, 0.10, 0.45] } },
  { id: "moderate", name: "Умеренные накопления", label: "Умеренная",
    note: "Половина — облигации, треть — акции. Баланс дохода и риска.",
    shares: { ofz: 0.30, aaa: 0.15, float: 0.05, stocks: 0.35, gold: 0.10, mm: 0.05 },
    iisShares: IIS_SHARES },
  { id: "aggressive", name: "Агрессивные накопления", label: "Агрессивная",
    note: "Основа — акции. Выше ожидаемый доход, глубокие просадки.",
    shares: { ofz: 0.15, aaa: 0.05, stocks: 0.60, gold: 0.10, mm: 0.10 },
    iisShares: { ofz: [0.30, 0.25, 0.35], aaa: [0.10, 0.10, 0.15], float: [0.05, 0.05, 0], stocks: [0.40, 0.35, 0], gold: [0.10, 0.10, 0], mm: [0.05, 0.15, 0.50] } },
];

export const CALC_AMOUNT = 100000;

// План покупок ИИС-3 на месяц. part — доля от доли актива: число, либо
// "now" / "reserve" — часть акций сразу на первые ступени / в резерв.
// price — цена 1 шт. с НКД (null — вводит пользователь).
export const IIS_PURCHASES = [
  { asset: "ofz",    name: "ОФЗ 26218",  part: 0.5, price: 784 },
  { asset: "ofz",    name: "ОФЗ 26235",  part: 0.5, price: 718 },
  { asset: "aaa",    name: "Атомэнпр10", part: 1,   price: 1024,
    note: "Дальше чередовать: Сбер Sb56R → РЖД 1Р-44R (не больше 5% на эмитента)" },
  { asset: "float",  name: "ОФЗ 29018",  part: 1,   price: 980 },
  { asset: "stocks", name: "Акции, первые ступени", part: "now", noPrice: true, note: "Что и сколько — в «Докупке акций» ниже" },
  { asset: "stocks", name: "Акции, резерв докупок → в фонд ДР", part: "reserve", noPrice: true, note: "Копится в фонде денежного рынка до просадки" },
  { asset: "gold",   name: "Фонд золота (SBGD / AKGD)", part: 1, price: 30.37 },
  { asset: "mm",     name: "Фонд денежного рынка", part: 1, price: null, note: "Цену пая введите сами (LQDT / AKMM / SBMM)" },
];

// Примерные позиции лесенки ИИС-3. plan: null — по умолчанию.
export const IIS_LADDER = [
  { ticker: "SBER", lot: 1, plan: 16000, p1: 330,  invested: 3960, bought: 12, problems: false },
  { ticker: "YDEX", lot: 1, plan: 16000, p1: 4300, invested: 4300, bought: 1,  problems: false },
  { ticker: "T",    lot: 1, plan: 16000, p1: null, invested: 0,    bought: 0,  problems: false },
];

/* Справочник инструментов — листы «ОФЗ», «Корп ААА», «Флоатеры», «Фонды»
   из ИИС-3.xlsx (данные на 23.10.2026). pricePct — цена в долях номинала
   (0,7759 = 77,59%), без НКД. null — данных нет. */

export const OFZ = {
  title: "ОФЗ с фиксированным купоном (ОФЗ-ПД)",
  note: "Погашение до конца 2031 г. Источник: investmint.ru (Мосбиржа). Доходность меняется ежедневно.",
  items: [
    { name: "ОФЗ 26218", maturity: "2031-09-17", coupon: 0.085, pricePct: 0.7759, ytm: 0.1571, duration: 3.9, turnover: 68,   status: "★ Основа", comment: "Гасится к концу срока ИИС; большая часть дохода — дисконт" },
    { name: "ОФЗ 26235", maturity: "2031-03-12", coupon: 0.059, pricePct: 0.7118, ytm: 0.1571, duration: 3.8, turnover: 1466, status: "★ Основа", comment: "Самая ликвидная, самый низкий купон — минимальный риск реинвестирования" },
    { name: "ОФЗ 26239", maturity: "2031-07-23", coupon: 0.069, pricePct: 0.7343, ytm: 0.1546, duration: 3.9, turnover: 33,   status: "Альтернатива", comment: "Ликвидность ниже — лимитной заявкой" },
    { name: "ОФЗ 26251", maturity: "2030-08-28", coupon: 0.095, pricePct: 0.8425, ytm: 0.156,  duration: 3.2, turnover: 857,  status: "Резерв", comment: "Гасится за год до конца срока" },
    { name: "ОФЗ 26228", maturity: "2030-04-10", coupon: 0.0765, pricePct: 0.8114, ytm: 0.1536, duration: 3,  turnover: 59,   status: "Резерв", comment: "" },
    { name: "ОФЗ 26242", maturity: "2029-08-29", coupon: 0.09,  pricePct: 0.8755, ytm: 0.1501, duration: 2.5, turnover: 90,   status: "Для 2028–2029", comment: "" },
    { name: "ОФЗ 26224", maturity: "2029-05-23", coupon: 0.069, pricePct: 0.8412, ytm: 0.1503, duration: 2.3, turnover: 117,  status: "Для 2028–2029", comment: "" },
    { name: "ОФЗ 26237", maturity: "2029-03-14", coupon: 0.067, pricePct: 0.848,  ytm: 0.1498, duration: 2.2, turnover: 151,  status: "Для 2028–2029", comment: "" },
    { name: "ОФЗ 26236", maturity: "2028-05-17", coupon: 0.057, pricePct: 0.8851, ytm: 0.1467, duration: 1.5, turnover: 604,  status: "Короткая", comment: "Парковка до 2028" },
    { name: "ОФЗ 26249", maturity: "2032-06-16", coupon: 0.11,  pricePct: 0.8341, ytm: 0.1611, duration: 4,   turnover: 1919, status: "Не брать", comment: "За горизонтом ИИС" },
    { name: "ОФЗ 26252", maturity: "2033-10-12", coupon: 0.125, pricePct: 0.8605, ytm: 0.1651, duration: 4.7, turnover: 2693, status: "Не брать", comment: "За горизонтом ИИС" },
    { name: "ОФЗ 26253", maturity: "2038-10-06", coupon: 0.13,  pricePct: 0.8403, ytm: 0.1669, duration: 5.9, turnover: 4922, status: "Не брать", comment: "12 лет: при росте ставок на 2 п.п. цена −12%" },
  ],
};

export const AAA = {
  title: "Корпоративные облигации ААА",
  note: "Фиксированный купон, погашение до 2031 г. Не более 5% портфеля на эмитента → чередуйте минимум 3 эмитентов.",
  items: [
    { name: "Атомэнпр10", isin: "RU000A10DYG9", issuer: "Атомэнергопром", rating: "AAA(RU) / ruAAA", maturity: "2031-06-18", coupon: 0.1511, perYear: 4,  pricePct: 1.009,  ytm: 0.145,  asOf: "окт. 2026",     status: "★ Топ-1", comment: "Срок совпадает с концом ИИС" },
    { name: "Сбер Sb56R", isin: "RU000A10F7R7", issuer: "Сбербанк",       rating: "AAA(RU)",         maturity: "2029-06-16", coupon: 0.134,  perYear: 12, pricePct: 0.9865, ytm: 0.1497, asOf: "06–09.10.2026", status: "★ Топ-2", comment: "Ежемесячный купон" },
    { name: "РЖД 1Р-44R", isin: "RU000A10C8C0", issuer: "РЖД",            rating: "AAA(RU)",         maturity: "2029-02-10", coupon: 0.1395, perYear: 12, pricePct: 0.9723, ytm: 0.165,  asOf: "06.10.2026",    status: "★ Топ-3", comment: "Ежемесячный купон; по разным источникам 15,5–16,5%" },
    { name: "Атомэнпр09", isin: "RU000A10DPS2", issuer: "Атомэнергопром", rating: "AAA(RU) / ruAAA", maturity: "2031-05-29", coupon: 0.1506, perYear: 4,  pricePct: 1.0012, ytm: 0.145,  asOf: "окт. 2026",     status: "Альтернатива", comment: "Тот же эмитент, что Атомэнпр10" },
    { name: "Атомэнпр07", isin: "RU000A10C6L5", issuer: "Атомэнергопром", rating: "AAA(RU) / ruAAA", maturity: "2030-07-19", coupon: 0.1431, perYear: 4,  pricePct: 0.9809, ytm: 0.15,   asOf: "окт. 2026",     status: "Альтернатива", comment: "" },
    { name: "Атомэнпр11", isin: "RU000A10EJQ7", issuer: "Атомэнергопром", rating: "AAA(RU) / ruAAA", maturity: "2029-12-07", coupon: 0.1466, perYear: 4,  pricePct: 0.99,   ytm: 0.144,  asOf: "окт. 2026",     status: "Альтернатива", comment: "" },
    { name: "ВТБ Б1-360", isin: "RU000A1095M5", issuer: "ВТБ",            rating: "AAA(RU) / ruAAA / AAA.ru", maturity: "2029-07-31", coupon: 0.156, perYear: null, pricePct: null, ytm: null, asOf: "окт. 2026", status: "Проверить", comment: "Проверьте цену, доходность и тип купона" },
    { name: "ПГК 3Р02",   isin: "RU000A10DSL1", issuer: "Первая грузовая компания", rating: "ruAA / AA+.ru", maturity: "2030-11-16", coupon: 0.1595, perYear: 12, pricePct: 0.9965, ytm: 0.1578, asOf: "28.08.2026", status: "АА+ (опционально)", comment: "Оферта 29.03.2029" },
  ],
};

export const FLOATERS = {
  title: "Флоатеры ОФЗ-ПК и варианты страховки",
  note: "Купон ОФЗ-ПК следует за RUONIA.",
  items: [
    { name: "ОФЗ 29018", maturity: "2031-11-26", pricePct: 0.9733, coupon: "плавающий (RUONIA)", turnover: 190, status: "★ Топ-1", comment: "Гасится к концу срока ИИС; +2,7% до номинала" },
    { name: "ОФЗ 29015", maturity: "2028-10-18", pricePct: 0.9933, coupon: "плавающий (RUONIA)", turnover: 333, status: "Топ-2", comment: "Самый ликвидный; погасится в 2028" },
    { name: "ОФЗ 29021", maturity: "2030-11-27", pricePct: 0.9811, coupon: "плавающий (RUONIA)", turnover: 2.2, status: "Альтернатива", comment: "Низкая ликвидность" },
    { name: "ОФЗ 29013", maturity: "2030-09-18", pricePct: 0.981,  coupon: "плавающий (RUONIA)", turnover: 4.5, status: "Альтернатива", comment: "Низкая ликвидность" },
    { name: "ОФЗ 29008", maturity: "2029-10-03", pricePct: 1.017,  coupon: "текущий 15,54%",     turnover: 15,  status: "Осторожно", comment: "Дороже номинала: −1,7% при погашении" },
    { name: "МТС 3Р-02 (RU000A10F8N4)", maturity: "2029-05-16", pricePct: 0.9977, coupon: "КС + 1,5%", turnover: null, status: "Опционально", comment: "Корпоративный флоатер ААА; дата — колл-опцион, погашение 2038" },
    { name: "ОФЗ 52003 (ОФЗ-ИН)", maturity: "2030-07-17", pricePct: 0.8658, coupon: "2,5% + индексация на инфляцию", turnover: 2, status: "Опционально", comment: "Реальная доходность ≈6,7% сверх инфляции; низкая ликвидность" },
  ],
};

export const FUNDS = {
  title: "Биржевые фонды",
  note: "Берите фонды УК вашего брокера — сделки часто без комиссии (Сбер → Первая, ВТБ → ВИМ, Т-Банк → Т-Капитал, Альфа → Альфа-Капитал). Пустая комиссия — нет надёжных данных, проверьте на сайте УК.",
  groups: [
    { title: "Денежный рынок (резерв для докупок, «парковка»)", items: [
      { ticker: "LQDT", name: "ВИМ – Ликвидность", uk: "ВИМ (ВТБ)", ter: 0.003, size: "крупнейший", status: "★ Топ-1", comment: "В ВТБ без комиссии за сделки" },
      { ticker: "AMNR", name: "Атон – Накопительный", uk: "Атон", ter: 0.0031, size: "—", status: "★ Топ-2", comment: "" },
      { ticker: "SBMM", name: "Первая – Сберегательный", uk: "Первая (Сбер)", ter: 0.0033, size: "≈342 млрд ₽", status: "★ Топ-3", comment: "Удобен в Сбере" },
      { ticker: "AKMM", name: "Альфа-Капитал Денежный рынок", uk: "Альфа-Капитал", ter: null, size: "≈327 млрд ₽", status: "Альтернатива", comment: "Комиссия по источникам 0,34–0,6%; в Альфе без комиссии за сделки" },
      { ticker: "TMON", name: "Т-Капитал Денежный рынок", uk: "Т-Капитал", ter: 0.0109, size: "≈30 млрд ₽", status: "Альтернатива", comment: "Высокая комиссия — только внутри Т-Банка" },
    ]},
    { title: "Золото", items: [
      { ticker: "SBGD", name: "Первая – Доступное золото", uk: "Первая (Сбер)", ter: 0.013, size: "—", status: "★ Топ-1", comment: "Биржевое золото GLDRUB_TOM; пай ≈30 ₽; комиссия «не более 1,3%»" },
      { ticker: "AKGD", name: "Альфа-Капитал Золото", uk: "Альфа-Капитал", ter: null, size: "—", status: "★ Топ-2", comment: "Удобен в Альфе; комиссию уточните" },
      { ticker: "TGLD", name: "Т-Капитал Золото", uk: "Т-Капитал", ter: null, size: "—", status: "Альтернатива", comment: "Комиссию уточните" },
      { ticker: "GOLD", name: "ВИМ – Золото", uk: "ВИМ (ВТБ)", ter: null, size: "—", status: "Альтернатива", comment: "Комиссию уточните" },
      { ticker: "GL/GD/GLDRUBF", name: "Фьючерсы на золото", uk: "—", ter: null, size: "—", status: "Не брать", comment: "Нужен тест неквала; плечо, вариационная маржа" },
    ]},
    { title: "Индекс МосБиржи (если не хотите выбирать компании)", items: [
      { ticker: "EQMX", name: "ВИМ – Индекс МосБиржи", uk: "ВИМ (ВТБ)", ter: 0.0067, size: "≈11+ млрд ₽", status: "★ Топ-1", comment: "Самая низкая комиссия среди крупных" },
      { ticker: "TMOS", name: "Т-Капитал Индекс МосБиржи", uk: "Т-Капитал", ter: 0.008, size: "≈11+ млрд ₽", status: "★ Топ-2", comment: "Очень ликвидный" },
      { ticker: "SBMX", name: "Первая – Топ Российских акций", uk: "Первая (Сбер)", ter: 0.0095, size: "≈17+ млрд ₽", status: "★ Топ-3", comment: "Самый крупный и старый" },
    ]},
  ],
};

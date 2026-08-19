import { AuditResult, AuditRisk, DocumentType, RiskLevel } from "./types";

const documentLabels: Record<DocumentType, string> = {
  supply: "Договор поставки",
  nda: "NDA",
  it: "ИТ-подряд",
  procurement: "Закупки"
};

type Rule = {
  id: string;
  level: RiskLevel;
  title: string;
  clause: string;
  match: RegExp;
  finding: string;
  recommendation: string;
  replacementText: string;
  appliesTo: DocumentType[] | "all";
};

const rules: Rule[] = [
  {
    id: "unlimited-liability",
    level: "critical",
    title: "Неограниченная ответственность",
    clause: "Ответственность сторон",
    match: /(неограниченн[а-я]+ ответственност|в полном объ[её]ме.*убытк|возмещает все убытки|любые косвенные убытки)/i,
    finding: "Формулировка может возложить на сторону ответственность без финансового ограничения, включая косвенные убытки.",
    recommendation: "Ограничить ответственность прямыми доказанными убытками и установить лимит, например размер оплаты по договору за 6 или 12 месяцев.",
    replacementText: "Ответственность стороны ограничивается прямыми документально подтвержденными убытками и не превышает сумму платежей по договору за последние 12 месяцев. Косвенные убытки и упущенная выгода не возмещаются.",
    appliesTo: "all"
  },
  {
    id: "payment-no-term",
    level: "warning",
    title: "Неочевидный срок оплаты",
    clause: "Расчеты и оплата",
    match: /(оплата производится|стоимость услуг|цена договора|сумма договора)/i,
    finding: "В договоре есть блок оплаты, но необходимо проверить наличие конкретного срока оплаты и условия закрывающих документов.",
    recommendation: "Зафиксировать срок оплаты, событие начала отсчета и перечень документов для оплаты.",
    replacementText: "Оплата производится в течение 10 банковских дней с даты подписания акта выполненных работ и получения счета на оплату.",
    appliesTo: "all"
  },
  {
    id: "no-confidentiality-term",
    level: "critical",
    title: "Нет срока конфиденциальности",
    clause: "Конфиденциальность",
    match: /(конфиденциальн[а-я]+ информац|коммерческ[а-я]+ тайн|nda|неразглаш)/i,
    finding: "Раздел конфиденциальности найден, но срок действия обязательств должен быть явно указан.",
    recommendation: "Добавить срок действия обязательств по неразглашению после прекращения договора.",
    replacementText: "Обязательства по сохранению конфиденциальности действуют в течение срока договора и 5 лет после его прекращения, если более длительный срок не предусмотрен законом.",
    appliesTo: ["nda", "it", "procurement"]
  },
  {
    id: "ip-rights",
    level: "critical",
    title: "Риск по правам на результат работ",
    clause: "Интеллектуальная собственность",
    match: /(исключительн[а-я]+ прав|интеллектуальн[а-я]+ собственност|исходн[а-я]+ код|результат работ)/i,
    finding: "В ИТ-договоре важно прямо определить переход исключительных прав, объем лицензии, исходный код и момент передачи прав.",
    recommendation: "Указать, какие права передаются заказчику, на какой территории, на какой срок и с какого момента.",
    replacementText: "Исключительные права на результаты работ, включая исходный код, документацию и производные материалы, переходят Заказчику после полной оплаты соответствующего этапа, если иное не согласовано сторонами письменно.",
    appliesTo: ["it"]
  },
  {
    id: "sla-acceptance",
    level: "warning",
    title: "Неполная процедура приемки",
    clause: "Приемка работ",
    match: /(акт выполненных работ|приемк[а-я]+ работ|замечан[а-я]+|срок устранения)/i,
    finding: "Процедура приемки должна снижать риск бесконечного цикла замечаний и неоплаты.",
    recommendation: "Добавить срок мотивированного отказа, порядок повторной сдачи и презумпцию приемки.",
    replacementText: "Если Заказчик в течение 5 рабочих дней не направил мотивированный отказ, результат считается принятым без замечаний. Исполнитель устраняет обоснованные замечания в согласованный сторонами срок.",
    appliesTo: ["it", "procurement", "supply"]
  },
  {
    id: "delivery-incoterms",
    level: "warning",
    title: "Не зафиксирован момент перехода риска",
    clause: "Поставка и переход риска",
    match: /(поставка|товар|передача товара|накладн[а-я]+|склад|доставка)/i,
    finding: "Для поставки важно определить момент перехода риска случайной гибели товара и подтверждающие документы.",
    recommendation: "Указать точку поставки, документы передачи и момент перехода риска.",
    replacementText: "Риск случайной гибели или повреждения товара переходит к Покупателю с момента подписания товарной накладной уполномоченным представителем Покупателя.",
    appliesTo: ["supply", "procurement"]
  },
  {
    id: "termination",
    level: "warning",
    title: "Неясное одностороннее расторжение",
    clause: "Срок действия и расторжение",
    match: /(расторжени[ея]|односторонн[а-я]+ отказ|прекращени[ея] договор)/i,
    finding: "Условие расторжения должно содержать уведомление, срок исправления нарушения и порядок расчетов.",
    recommendation: "Добавить cure period и порядок оплаты фактически выполненных работ или поставленных товаров.",
    replacementText: "Сторона вправе отказаться от договора при существенном нарушении другой стороной, если нарушение не устранено в течение 15 календарных дней с даты получения письменного уведомления.",
    appliesTo: "all"
  },
  {
    id: "procurement-conflict",
    level: "critical",
    title: "Антикоррупционная оговорка отсутствует или неполная",
    clause: "Compliance / закупки",
    match: /(антикоррупционн|конфликт интересов|комплаенс|санкци[ия]|аффилирован)/i,
    finding: "Для закупочных документов важно явно закрепить отсутствие конфликта интересов, санкционных ограничений и незаконного вознаграждения.",
    recommendation: "Добавить compliance-заверения, право проверки и право расторжения при нарушении.",
    replacementText: "Поставщик подтверждает отсутствие конфликта интересов, санкционных ограничений и фактов предложения незаконного вознаграждения. Нарушение данного заверения является основанием для одностороннего отказа от договора.",
    appliesTo: ["procurement"]
  }
];

const requiredClauses: Record<DocumentType, { title: string; clause: string; pattern: RegExp; recommendation: string; replacementText: string }[]> = {
  supply: [
    { title: "Нет явного условия о качестве товара", clause: "Качество", pattern: /(качество|гаранти[яи]|сертификат)/i, recommendation: "Добавить требования к качеству, сертификатам и гарантийному сроку.", replacementText: "Товар должен соответствовать спецификации, обязательным требованиям законодательства и сопровождаться сертификатами либо иными документами качества." }
  ],
  nda: [
    { title: "Нет исключений из конфиденциальной информации", clause: "Исключения", pattern: /(не относится к конфиденциальной|исключени[ея]|общедоступн)/i, recommendation: "Указать информацию, которая не считается конфиденциальной.", replacementText: "К конфиденциальной информации не относится информация, которая была общедоступной, получена законным способом от третьего лица или разработана получателем самостоятельно." }
  ],
  it: [
    { title: "Нет SLA или критериев результата", clause: "SLA / критерии результата", pattern: /(sla|уровень сервиса|критери[йи] приемки|техническое задание)/i, recommendation: "Добавить measurable SLA, критерии готовности и порядок фиксации инцидентов.", replacementText: "Критерии приемки, уровни сервиса, приоритеты инцидентов и сроки реакции определяются в техническом задании, являющемся неотъемлемой частью договора." }
  ],
  procurement: [
    { title: "Нет требования к подтверждающим документам", clause: "Закупочная документация", pattern: /(коммерческое предложение|ценовое предложение|техническая спецификация|подтверждающ)/i, recommendation: "Указать обязательный пакет документов поставщика и критерии оценки.", replacementText: "Поставщик предоставляет коммерческое предложение, техническую спецификацию, документы о правоспособности и подтверждение соответствия требованиям закупки." }
  ]
};

function normalize(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function context(text: string, regexp: RegExp) {
  const match = regexp.exec(text);
  if (!match?.index) return "Фрагмент найден по смысловому признаку в тексте документа.";
  const start = Math.max(0, match.index - 130);
  const end = Math.min(text.length, match.index + 260);
  return normalize(text.slice(start, end));
}

function makeSafe(id: string, title: string, clause: string, finding: string): AuditRisk {
  return {
    id,
    level: "safe",
    title,
    clause,
    finding,
    recommendation: "Сохранить формулировку, но проверить ее согласованность с коммерческими условиями и приложениями.",
    replacementText: "Правка не требуется.",
    evidence: "В документе найдено релевантное условие."
  };
}

export function runAudit(fileName: string, documentType: DocumentType, rawText: string): AuditResult {
  const text = normalize(rawText);
  const risks: AuditRisk[] = [];
  const activeRules = rules.filter((rule) => rule.appliesTo === "all" || rule.appliesTo.includes(documentType));

  activeRules.forEach((rule) => {
    const found = rule.match.test(text);
    if (found) {
      risks.push({
        id: rule.id,
        level: rule.level,
        title: rule.title,
        clause: rule.clause,
        finding: rule.finding,
        recommendation: rule.recommendation,
        replacementText: rule.replacementText,
        evidence: context(text, rule.match)
      });
    }
  });

  requiredClauses[documentType].forEach((clause, index) => {
    const found = clause.pattern.test(text);
    if (!found) {
      risks.push({
        id: `missing-${documentType}-${index}`,
        level: "critical",
        title: clause.title,
        clause: clause.clause,
        finding: `Для типа документа «${documentLabels[documentType]}» не обнаружен обязательный блок: ${clause.clause}.`,
        recommendation: clause.recommendation,
        replacementText: clause.replacementText,
        evidence: "В извлеченном тексте не найдено устойчивых формулировок по данному условию."
      });
    } else {
      risks.push(makeSafe(`safe-${documentType}-${index}`, clause.title.replace("Нет ", "Проверено: "), clause.clause, `Блок «${clause.clause}» найден в тексте документа.`));
    }
  });

  const safeConditions = [
    { id: "safe-parties", title: "Проверено: стороны договора", clause: "Реквизиты сторон", pattern: /(сторон[аы]|заказчик|исполнитель|поставщик|покупатель)/i },
    { id: "safe-subject", title: "Проверено: предмет договора", clause: "Предмет", pattern: /(предмет договора|обязуется|выполнить|поставить|оказать услуги)/i }
  ];

  safeConditions.forEach((item) => {
    if (item.pattern.test(text)) {
      risks.push(makeSafe(item.id, item.title, item.clause, `В документе найден базовый блок: ${item.clause}.`));
    }
  });

  if (risks.length === 0) {
    risks.push({
      id: "low-signal",
      level: "warning",
      title: "Недостаточно юридически значимых условий",
      clause: "Общая структура",
      finding: "В документе мало распознаваемых договорных условий. Возможно, текст извлечен неполностью или файл содержит сканы без OCR.",
      recommendation: "Проверьте качество текста и при необходимости загрузите DOCX или PDF с текстовым слоем.",
      replacementText: "Добавьте полный текст договора с предметом, оплатой, ответственностью, сроками, приемкой и реквизитами сторон.",
      evidence: text.slice(0, 300) || "Текст не извлечен."
    });
  }

  const critical = risks.filter((risk) => risk.level === "critical").length;
  const warning = risks.filter((risk) => risk.level === "warning").length;
  const safe = risks.filter((risk) => risk.level === "safe").length;
  const score = Math.max(0, Math.min(100, 100 - critical * 18 - warning * 8 + safe * 4));

  return {
    fileName,
    documentType,
    extractedText: text,
    risks,
    summary: { critical, warning, safe, score },
    auditedAt: new Date().toISOString()
  };
}

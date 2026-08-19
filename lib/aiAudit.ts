import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { AuditResult, DocumentType } from "./types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const RiskSchema = z.object({
  level: z.enum(["critical", "warning", "safe"]),
  title: z.string(),
  clause: z.string(),
  finding: z.string(),
  recommendation: z.string(),
  replacementText: z.string(),
  evidence: z.string()
});

const ContractAuditSchema = z.object({
  executiveSummary: z.string(),
  risks: z.array(RiskSchema)
});

type AiRisk = z.infer<typeof RiskSchema>;

const documentLabels: Record<DocumentType, string> = {
  supply: "Договор поставки",
  nda: "NDA",
  it: "ИТ-подряд",
  procurement: "Закупки"
};

function calculateSummary(risks: AiRisk[]) {
  const critical = risks.filter((risk) => risk.level === "critical").length;
  const warning = risks.filter((risk) => risk.level === "warning").length;
  const safe = risks.filter((risk) => risk.level === "safe").length;

  const score = Math.max(
    0,
    Math.min(100, 100 - critical * 18 - warning * 8 + safe * 4)
  );

  return {
    critical,
    warning,
    safe,
    score
  };
}

function limitContractText(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();

  if (normalized.length <= 60000) {
    return normalized;
  }

  return normalized.slice(0, 60000);
}

export async function runAiAudit(
  fileName: string,
  documentType: DocumentType,
  extractedText: string
): Promise<AuditResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY не найден. Добавьте ключ в .env.local локально или в Environment Variables на Vercel."
    );
  }

  const contractText = limitContractText(extractedText);

  const response = await openai.responses.parse({
    model: process.env.OPENAI_MODEL || "gpt-4o-2024-08-06",
    input: [
      {
        role: "system",
        content:
          "Ты опытный корпоративный юрист и LegalTech AI-аудитор. Анализируй договоры строго по тексту документа. Не выдумывай факты. Если условие отсутствует, прямо укажи, что оно не обнаружено. Ответ всегда возвращай строго в заданной JSON-структуре."
      },
      {
        role: "user",
        content: `
Проанализируй договор на русском языке.

Тип документа: ${documentLabels[documentType]}

Цель анализа:
Найти юридические, финансовые, операционные и коммерческие риски в договоре.

Проверь обязательно:
1. Предмет договора.
2. Сроки исполнения.
3. Сроки оплаты.
4. Ответственность сторон.
5. Штрафы, пеня, неустойка.
6. Ограничение ответственности.
7. Одностороннее расторжение.
8. Порядок приемки работ, услуг или товара.
9. Конфиденциальность.
10. Персональные данные, если встречаются.
11. Интеллектуальная собственность, если применимо.
12. SLA, качество услуг, гарантийные обязательства.
13. Форс-мажор.
14. Подсудность и применимое право.
15. Закупочные, санкционные, антикоррупционные и compliance-риски.
16. Неясные, односторонние, опасные или слишком широкие формулировки.
17. Отсутствующие важные условия для данного типа договора.

Для каждого найденного пункта верни:
- level:
  - critical, если риск может привести к существенным убыткам, спору, потере прав, неоплате, неограниченной ответственности или невозможности защитить интересы стороны;
  - warning, если условие требует уточнения, детализации или может создать спор;
  - safe, если важный блок договора выглядит приемлемо.
- title: короткое название риска или проверки.
- clause: раздел договора или тема.
- finding: что именно найдено или чего не хватает.
- recommendation: что нужно сделать.
- replacementText: готовая улучшенная формулировка для договора.
- evidence: точный фрагмент договора или объяснение, почему сделан вывод.

Правила:
- Не называй это юридическим заключением.
- Не выдумывай условия, которых нет в тексте.
- Если текст содержит неоднозначную формулировку, объясни риск простым деловым языком.
- Если условие отсутствует, evidence должно указывать: "Условие не обнаружено в предоставленном тексте".
- Верни минимум 6 и максимум 15 пунктов.
- Пиши на русском языке.
- Стиль: B2B, понятно для собственника бизнеса, руководителя закупок и юриста.

Текст договора:
${contractText}
`
      }
    ],
    text: {
      format: zodTextFormat(ContractAuditSchema, "contract_audit")
    }
  });

  const parsed = response.output_parsed;

  if (!parsed) {
    throw new Error("GPT-4o не вернул структурированный результат аудита.");
  }

  const risks = parsed.risks.map((risk, index) => ({
    id: `ai-risk-${index + 1}`,
    level: risk.level,
    title: risk.title,
    clause: risk.clause,
    finding: risk.finding,
    recommendation: risk.recommendation,
    replacementText: risk.replacementText,
    evidence: risk.evidence
  }));

  return {
    fileName,
    documentType,
    extractedText,
    risks,
    summary: calculateSummary(parsed.risks),
    auditedAt: new Date().toISOString()
  };
}

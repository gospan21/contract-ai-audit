import { NextRequest } from "next/server";
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { AuditResult } from "@/lib/types";

export const runtime = "nodejs";

const riskLabel = {
  critical: "Критический",
  warning: "Внимание",
  safe: "Безопасно"
};

export async function POST(request: NextRequest) {
  const result = (await request.json()) as AuditResult;
  const children: Paragraph[] = [
    new Paragraph({ text: "Отчет ИИ-аудита договора", heading: HeadingLevel.TITLE }),
    new Paragraph({ children: [new TextRun({ text: `Файл: ${result.fileName}`, bold: true })] }),
    new Paragraph(`Дата аудита: ${new Date(result.auditedAt).toLocaleString("ru-RU")}`),
    new Paragraph(`Итоговый индекс безопасности: ${result.summary.score}/100`),
    new Paragraph(`Критические: ${result.summary.critical}. Внимание: ${result.summary.warning}. Безопасно: ${result.summary.safe}.`),
    new Paragraph({ text: "Найденные риски", heading: HeadingLevel.HEADING_1 })
  ];

  result.risks.forEach((risk, index) => {
    children.push(
      new Paragraph({ text: `${index + 1}. ${risk.title}`, heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ children: [new TextRun({ text: `Уровень: ${riskLabel[risk.level]}`, bold: true })] }),
      new Paragraph(`Раздел: ${risk.clause}`),
      new Paragraph(`Вывод: ${risk.finding}`),
      new Paragraph(`Рекомендация: ${risk.recommendation}`),
      new Paragraph(`Предлагаемая правка: ${risk.replacementText}`),
      new Paragraph(`Фрагмент: ${risk.evidence}`)
    );
  });

  const doc = new Document({ sections: [{ children }] });
  const buffer = await Packer.toBuffer(doc);

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="contract-audit-report.docx"`
    }
  });
}

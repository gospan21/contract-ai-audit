import { NextRequest } from "next/server";
import PDFDocument from "pdfkit";
import { AuditResult } from "@/lib/types";

export const runtime = "nodejs";

const riskLabel = {
  critical: "Критический",
  warning: "Внимание",
  safe: "Безопасно"
};

function writeWrapped(doc: PDFKit.PDFDocument, label: string, value: string) {
  doc.font("Helvetica-Bold").text(label, { continued: true });
  doc.font("Helvetica").text(` ${value}`);
}

export async function POST(request: NextRequest) {
  const result = (await request.json()) as AuditResult;

  const chunks: Buffer[] = [];
  const doc = new PDFDocument({ margin: 48, size: "A4" });
  doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));

  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  doc.font("Helvetica-Bold").fontSize(20).text("Contract AI Audit Report");
  doc.moveDown(0.8);
  doc.font("Helvetica").fontSize(10).text("Примечание: базовые PDF-шрифты могут ограниченно отображать кириллицу в некоторых viewer. DOCX-экспорт сохраняет русский текст полностью.");
  doc.moveDown();
  doc.fontSize(12);
  writeWrapped(doc, "File:", result.fileName);
  writeWrapped(doc, "Audit date:", new Date(result.auditedAt).toLocaleString("ru-RU"));
  writeWrapped(doc, "Security score:", `${result.summary.score}/100`);
  writeWrapped(doc, "Summary:", `Critical ${result.summary.critical}, Warning ${result.summary.warning}, Safe ${result.summary.safe}`);
  doc.moveDown();

  result.risks.forEach((risk, index) => {
    doc.font("Helvetica-Bold").fontSize(14).text(`${index + 1}. ${risk.title}`);
    doc.fontSize(11);
    writeWrapped(doc, "Level:", riskLabel[risk.level]);
    writeWrapped(doc, "Clause:", risk.clause);
    writeWrapped(doc, "Finding:", risk.finding);
    writeWrapped(doc, "Recommendation:", risk.recommendation);
    writeWrapped(doc, "Suggested edit:", risk.replacementText);
    writeWrapped(doc, "Evidence:", risk.evidence);
    doc.moveDown();
  });

  doc.end();
  const buffer = await done;

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="contract-audit-report.pdf"`
    }
  });
}

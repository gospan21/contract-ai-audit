import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { runAiAudit } from "@/lib/aiAudit";
import { DocumentType } from "@/lib/types";

export const runtime = "nodejs";

async function extractText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const lowerName = file.name.toLowerCase();

  if (file.type === "application/pdf" || lowerName.endsWith(".pdf")) {
    const pdfParse = (await import("pdf-parse")).default;
    const parsed = await pdfParse(buffer);
    return parsed.text || "";
  }

  if (
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lowerName.endsWith(".docx")
  ) {
    const parsed = await mammoth.extractRawText({ buffer });
    return parsed.value || "";
  }

  throw new Error("Поддерживаются только PDF и DOCX файлы.");
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const file = formData.get("file");
    const documentType = formData.get("documentType") as DocumentType | null;

    if (!(file instanceof File)) {
      return NextResponse.json(
        { message: "Файл не найден." },
        { status: 400 }
      );
    }

    if (
      !documentType ||
      !["supply", "nda", "it", "procurement"].includes(documentType)
    ) {
      return NextResponse.json(
        { message: "Выберите корректный тип документа." },
        { status: 400 }
      );
    }

    const text = await extractText(file);

    if (!text.trim()) {
      return NextResponse.json(
        {
          message:
            "Не удалось извлечь текст. Загрузите DOCX или PDF с текстовым слоем."
        },
        { status: 422 }
      );
    }

    const result = await runAiAudit(file.name, documentType, text);

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Неизвестная ошибка аудита.";

    return NextResponse.json({ message }, { status: 500 });
  }
}

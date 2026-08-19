"use client";

import { ChangeEvent, DragEvent, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCopy,
  Download,
  FileText,
  Loader2,
  Moon,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Sun,
  UploadCloud,
  XCircle
} from "lucide-react";
import { AuditResult, AuditRisk, DocumentType, RiskLevel } from "@/lib/types";

const docTypeOptions: { value: DocumentType; label: string }[] = [
  { value: "supply", label: "Договор поставки" },
  { value: "nda", label: "NDA" },
  { value: "it", label: "ИТ-подряд" },
  { value: "procurement", label: "Закупки" }
];

const riskStyle: Record<RiskLevel, { label: string; badge: string; ring: string; icon: JSX.Element }> = {
  critical: {
    label: "Критический",
    badge: "bg-red-500/10 text-red-600 ring-red-500/20 dark:text-red-300",
    ring: "border-red-500/30 bg-red-500/[0.04]",
    icon: <XCircle className="h-4 w-4" />
  },
  warning: {
    label: "Внимание",
    badge: "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300",
    ring: "border-amber-500/30 bg-amber-500/[0.05]",
    icon: <AlertTriangle className="h-4 w-4" />
  },
  safe: {
    label: "Безопасно",
    badge: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300",
    ring: "border-emerald-500/30 bg-emerald-500/[0.05]",
    icon: <CheckCircle2 className="h-4 w-4" />
  }
};

function cn(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const [dark, setDark] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>("supply");
  const [result, setResult] = useState<AuditResult | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const documentLabel = useMemo(
    () => docTypeOptions.find((option) => option.value === documentType)?.label ?? "Договор",
    [documentType]
  );

  function applyFile(nextFile?: File) {
    if (!nextFile) return;
    const valid = nextFile.name.toLowerCase().endsWith(".pdf") || nextFile.name.toLowerCase().endsWith(".docx");
    if (!valid) {
      setMessage("Загрузите файл в формате PDF или DOCX.");
      return;
    }
    setFile(nextFile);
    setMessage(null);
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(nextFile.name.toLowerCase().endsWith(".pdf") ? URL.createObjectURL(nextFile) : null);
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    applyFile(event.dataTransfer.files?.[0]);
  }

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    applyFile(event.target.files?.[0]);
  }

  async function startAudit() {
    if (!file) {
      setMessage("Сначала загрузите PDF или DOCX документ.");
      return;
    }
    setLoading(true);
    setMessage(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("documentType", documentType);

    const response = await fetch("/api/audit", { method: "POST", body: formData });
    const payload = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(payload.message ?? "Не удалось выполнить аудит.");
      return;
    }

    setResult(payload as AuditResult);
  }

  async function exportDocx() {
    if (!result) return;
    const response = await fetch("/api/export/docx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result)
    });
    const blob = await response.blob();
    downloadBlob(blob, "contract-audit-report.docx");
  }

  async function exportPdf() {
    if (!result) return;
    const printRoot = document.getElementById("print-report");
    if (printRoot) window.print();
  }

  async function copyEdits() {
    if (!result) return;
    const edits = result.risks
      .filter((risk) => risk.replacementText !== "Правка не требуется.")
      .map((risk, index) => `${index + 1}. ${risk.title}\n${risk.replacementText}`)
      .join("\n\n");
    await navigator.clipboard.writeText(edits || "Критические правки не требуются.");
    setMessage("Правки скопированы в буфер обмена.");
  }

  return (
    <main className={cn(dark && "dark")}>
      <div className="min-h-screen overflow-hidden bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
        <div className="pointer-events-none fixed inset-0 bg-grid bg-[size:36px_36px] [mask-image:linear-gradient(to_bottom,black,transparent_78%)]" />
        <div className="pointer-events-none fixed left-1/2 top-[-180px] h-[420px] w-[780px] -translate-x-1/2 rounded-full bg-blue-500/20 blur-3xl dark:bg-blue-500/25" />

        <header className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-6 no-print">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-glow">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide text-blue-600 dark:text-blue-300">Contract AI Audit</p>
              <h1 className="text-lg font-semibold">B2B-аудит договоров</h1>
            </div>
          </div>
          <button
            onClick={() => setDark((value) => !value)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {dark ? "Light" : "Dark"}
          </button>
        </header>

        <section className="relative mx-auto grid max-w-7xl gap-6 px-6 pb-8 lg:grid-cols-[420px_1fr]">
          <aside className="glass rounded-[2rem] border border-slate-200 p-6 shadow-soft dark:border-white/10 no-print">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-200">
              <Sparkles className="h-3.5 w-3.5" />
              Dashboard
            </div>

            <h2 className="text-3xl font-semibold tracking-tight">Запустите ИИ-аудит договора</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Загрузите PDF или DOCX, выберите тип документа и получите карту рисков с предложенными правками.
            </p>

            <label
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              className={cn(
                "mt-8 flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed p-8 text-center transition",
                isDragging
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-slate-300 bg-white/60 hover:border-blue-400 dark:border-white/15 dark:bg-white/[0.03]"
              )}
            >
              <UploadCloud className="h-10 w-10 text-blue-600 dark:text-blue-300" />
              <span className="mt-4 text-base font-semibold">Перетащите договор сюда</span>
              <span className="mt-1 text-sm text-slate-500 dark:text-slate-400">или выберите PDF/DOCX файл</span>
              <input type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={onChange} />
              {file && (
                <span className="mt-4 inline-flex max-w-full items-center gap-2 truncate rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white dark:bg-white dark:text-slate-950">
                  <FileText className="h-3.5 w-3.5" /> {file.name}
                </span>
              )}
            </label>

            <div className="mt-6">
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Тип документа</label>
              <select
                value={documentType}
                onChange={(event) => setDocumentType(event.target.value as DocumentType)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-blue-500/20 transition focus:ring-4 dark:border-white/10 dark:bg-slate-900"
              >
                {docTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <button
              onClick={startAudit}
              disabled={loading}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
              {loading ? "Аудит выполняется" : "Запустить ИИ-аудит"}
            </button>

            {message && <p className="mt-4 rounded-2xl bg-slate-900/5 p-3 text-sm text-slate-700 dark:bg-white/10 dark:text-slate-200">{message}</p>}
          </aside>

          <section className="relative min-h-[720px] rounded-[2rem] border border-slate-200 bg-white/80 p-4 shadow-soft dark:border-white/10 dark:bg-white/[0.04]">
            {!result ? (
              <div className="flex h-full min-h-[680px] flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/80 p-8 text-center dark:border-white/10 dark:bg-slate-900/50">
                <ShieldCheck className="h-14 w-14 text-blue-600 dark:text-blue-300" />
                <h3 className="mt-5 text-2xl font-semibold">Результаты появятся здесь</h3>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  После аудита вы увидите исходный документ слева и структурированные карточки рисков справа.
                </p>
              </div>
            ) : (
              <div className="grid h-full gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)]">
                <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-slate-900">
                  <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-white/10">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Исходный документ</p>
                      <h3 className="truncate text-sm font-semibold">{result.fileName}</h3>
                    </div>
                    <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-200">{documentLabel}</span>
                  </div>
                  {pdfUrl ? (
                    <iframe src={pdfUrl} className="h-[670px] w-full" title="PDF viewer" />
                  ) : (
                    <pre className="risk-scrollbar h-[670px] overflow-auto whitespace-pre-wrap p-5 text-sm leading-7 text-slate-700 dark:text-slate-200">{result.extractedText}</pre>
                  )}
                </div>

                <div className="flex min-h-[700px] flex-col rounded-[1.5rem] border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950/80">
                  <div className="border-b border-slate-200 p-4 dark:border-white/10">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500">Карта рисков</p>
                        <h3 className="text-xl font-semibold">Индекс безопасности: {result.summary.score}/100</h3>
                      </div>
                      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-slate-950 text-lg font-bold text-white dark:bg-white dark:text-slate-950">
                        {result.summary.score}
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-medium">
                      <div className="rounded-2xl bg-red-500/10 p-3 text-red-600 dark:text-red-300">{result.summary.critical}<br />крит.</div>
                      <div className="rounded-2xl bg-amber-500/10 p-3 text-amber-700 dark:text-amber-300">{result.summary.warning}<br />вним.</div>
                      <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-700 dark:text-emerald-300">{result.summary.safe}<br />безоп.</div>
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      <button onClick={exportDocx} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold transition hover:border-blue-300 dark:border-white/10"><Download className="h-3.5 w-3.5" />DOCX</button>
                      <button onClick={exportPdf} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold transition hover:border-blue-300 dark:border-white/10"><Download className="h-3.5 w-3.5" />PDF</button>
                      <button onClick={copyEdits} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold transition hover:border-blue-300 dark:border-white/10"><ClipboardCopy className="h-3.5 w-3.5" />Правки</button>
                    </div>
                  </div>

                  <div className="risk-scrollbar flex-1 space-y-3 overflow-auto p-4">
                    {result.risks.map((risk) => <RiskCard key={risk.id} risk={risk} />)}
                  </div>
                </div>
              </div>
            )}
          </section>
        </section>

        {result && (
          <section id="print-report" className="hidden print:block">
            <h1>Отчет ИИ-аудита договора</h1>
            <p><strong>Файл:</strong> {result.fileName}</p>
            <p><strong>Индекс безопасности:</strong> {result.summary.score}/100</p>
            <p><strong>Критические:</strong> {result.summary.critical}; <strong>Внимание:</strong> {result.summary.warning}; <strong>Безопасно:</strong> {result.summary.safe}</p>
            {result.risks.map((risk, index) => (
              <article key={risk.id} style={{ marginTop: 24 }}>
                <h2>{index + 1}. {risk.title}</h2>
                <p><strong>Уровень:</strong> {riskStyle[risk.level].label}</p>
                <p><strong>Раздел:</strong> {risk.clause}</p>
                <p><strong>Вывод:</strong> {risk.finding}</p>
                <p><strong>Рекомендация:</strong> {risk.recommendation}</p>
                <p><strong>Правка:</strong> {risk.replacementText}</p>
                <p><strong>Фрагмент:</strong> {risk.evidence}</p>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

function RiskCard({ risk }: { risk: AuditRisk }) {
  const style = riskStyle[risk.level];
  return (
    <article className={cn("rounded-2xl border p-4", style.ring)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1", style.badge)}>
            {style.icon}
            {style.label}
          </span>
          <h4 className="mt-3 text-base font-semibold">{risk.title}</h4>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{risk.clause}</p>
        </div>
      </div>
      <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700 dark:text-slate-200">
        <p><span className="font-semibold text-slate-950 dark:text-white">Вывод:</span> {risk.finding}</p>
        <p><span className="font-semibold text-slate-950 dark:text-white">Рекомендация:</span> {risk.recommendation}</p>
        <div className="rounded-xl bg-slate-950/[0.04] p-3 dark:bg-white/[0.06]">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Предлагаемая правка</p>
          <p className="mt-1">{risk.replacementText}</p>
        </div>
        <details className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-500">Фрагмент документа</summary>
          <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">{risk.evidence}</p>
        </details>
      </div>
    </article>
  );
}

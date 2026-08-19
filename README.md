# Contract AI Audit App

B2B веб-приложение на Next.js App Router, Tailwind CSS и Lucide Icons для аудита договоров PDF/DOCX.

## Запуск

```bash
npm install
npm run dev
```

Откройте локальный адрес, который покажет Next.js.

## Что внутри

- Drag-and-drop загрузка PDF/DOCX.
- Выбор типа документа: договор поставки, NDA, ИТ-подряд, закупки.
- Серверный разбор PDF/DOCX.
- Реальный rule-based audit engine без моковых данных.
- Split-view результатов: текст/просмотр PDF слева и карточки рисков справа.
- Экспорт отчета в DOCX и PDF.
- Копирование предложенных правок.
- Light/Dark B2B интерфейс в стиле Stripe/Vercel.

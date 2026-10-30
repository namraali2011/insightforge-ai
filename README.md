# InsightForge AI

InsightForge AI turns uploaded CSV and Excel data into editable business dashboards and illustrated reports with AI-generated explanations.

Upload a dataset, describe the dashboard you want, adjust the charts and filters, then generate a report and download a PDF that preserves the report webpage's design.

## Features

- Browser-based CSV and XLSX uploads with column profiling, record previews, search, sorting and data-quality warnings.
- Gemini-assisted dashboard planning with validation against the uploaded dataset's columns.
- Up to six charts in an initial AI-generated dashboard, four configurable KPI cards and three categorical slicers.
- Additional charts through manual editing or the AI add-chart prompt, without a fixed total chart-count limit.
- Editable chart titles, types, fields, aggregations and order.
- Responsive layouts and fullscreen dashboard viewing.
- A Datasets page for inspecting and replacing the active dataset.
- One-click report generation with KPI explanations, an overview and a summary below each chart.
- Direct PDF download that preserves the report's colors, cards, charts and summaries.

## Supported chart types

- **Horizontal bar** (`bar`): category comparisons with horizontal bars.
- **Column** (`column`): category comparisons with vertical bars.
- **Line** (`line`): trends such as monthly sales.
- **Area** (`area`): a single filled trend.
- **Donut** (`donut`): category shares; values must be nonnegative with a positive total.
- **Scatter** (`scatter`): individual observations comparing two numeric fields.
- **Stacked column** (`stacked`): sums or counts broken down by a second grouping field, with up to twelve series.

Heatmaps, grouped-bar charts and stacked-area charts are not implemented. Use the supported names above in prompts. A stacked column chart is different from a stacked area chart.

## KPI calculations

- `sum`: total of valid numeric values.
- `average`: mean of valid numeric values; missing and invalid numeric values are excluded.
- `count`: number of non-empty values in the selected field.
- `distinctCount`: number of distinct non-empty values after trimming whitespace; case is preserved.

Use `distinctCount` for unique customers. The Matching Records card shows the number of rows remaining after filters.

## Technology

- Next.js App Router, React and TypeScript
- Tailwind CSS and Lucide icons
- Zustand for in-memory application state
- Recharts for visualizations
- Papa Parse and ExcelJS for file parsing
- Google GenAI SDK and Zod for AI output handling
- html-to-image and pdf-lib for styled browser PDF downloads

## Local setup

1. Download or clone the project and open a terminal in its root directory.
2. Install dependencies:

   ```bash
   npm ci
   ```

3. Create `.env.local` in the project root:

   ```env
   GEMINI_API_KEY=your_gemini_api_key
   GEMINI_MODEL=gemini-2.5-flash
   ```

   Keep the model that already works with your Gemini account. The model above is the project's current fallback, not a guarantee of availability or quota. Keep the API key server-side; do not use a `NEXT_PUBLIC_` prefix or commit `.env.local`.

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open the local address printed by Next.js, normally `http://localhost:3000`.

Uploads, manual editing and rule-based dashboards can be used without a Gemini key. AI planning, AI chart additions and complete AI reports require a working key and model.

## Using the application

1. Upload a CSV or XLSX file and inspect the detected columns.
2. Open Dashboard and enter a dashboard-generation prompt.
3. Review the generated KPIs, charts and any request limitations.
4. Use Edit to add, configure, reorder or remove visualizations, then Save.
5. Apply slicers to narrow the dashboard's records.
6. Click Generate report to create explanations for the saved dashboard and current filter selections.
7. Open the completed report and choose Download PDF.

Generate / Replace Dashboard and Use Rule-Based replace the current layout. Add one chart with AI appends a chart. Save draft edits before generating a report.

Reports created from the Reports page use all records. Reports created from the dashboard include its current filter selections.

## Example: main dashboard prompt

This example assumes these exact columns exist: `Date`, `Total Amount`, `Quantity`, `Customer ID`, `Product Category`, `Gender` and `Age`. Adjust the field names to match your dataset.

```text
Create an executive retail sales dashboard using the uploaded dataset.
Use only existing columns and preserve the requested chart types and order.

Include four KPIs:
- Total Sales: sum of Total Amount.
- Average Order Value: average of Total Amount.
- Total Quantity Sold: sum of Quantity.
- Unique Customers: distinctCount of Customer ID, not a count of rows.

Include these six visualizations:
1. Line Chart: sum of Total Amount by Date, aggregated monthly.
2. Column Chart: sum of Total Amount by Product Category.
3. Donut Chart: sum of Total Amount by Product Category to show category contribution.
4. Horizontal Bar Chart: sum of Total Amount by Gender.
5. Scatter Plot: Age versus Total Amount, using individual observations without aggregation.
6. Stacked Column Chart: sum of Total Amount by Date, grouped by Product Category, aggregated monthly.

Use Product Category and Gender as categorical filters.
Give the dashboard and charts clear business titles.
If a requested field is unavailable, explain the limitation rather than inventing a column.
Do not invent business findings from column metadata.
```

## Example: add one chart

Enter this in Add one chart with AI:

```text
Add a stacked column chart showing the sum of Total Amount by Date, grouped by Product Category, aggregated monthly.
```

Other single-chart examples:

```text
Add a horizontal bar chart showing the average of Total Amount by Product Category.
```

```text
Add a scatter plot comparing Quantity versus Total Amount using individual observations without aggregation.
```

Request one chart at a time. Use actual column names and one of the supported chart types. Adding a chart preserves the existing dashboard.

## Data scope and persistence

- There is one active dataset in each browser tab.
- A successful replacement upload resets that dataset's dashboard. Failed uploads retain the last successfully loaded dataset.
- Saved dashboard edits and report snapshots remain available during navigation in the current session.
- Report snapshots retain their calculated values when the dataset is later replaced or removed.
- Refreshing or closing the tab clears datasets, dashboard state and reports. There is no database or browser-storage persistence.
- Downloaded PDFs remain on your computer after refresh.

## AI and data handling

Files are parsed in the browser. Dashboard planning sends dataset name, row count and column metadata to the server-side Gemini integration, not uploaded source rows.

Report commentary uses calculated KPI values and chart statistics, including category labels where relevant. AI explanations are interpretations to review; calculated values are the source of truth. Charts alone do not establish causation or justify forecasts.

AI requests depend on the configured model, project access and available Gemini quota.

## Current limits

- Maximum upload size: 5 MB.
- Maximum dataset size: 10,000 data rows.
- AI planning accepts metadata for up to 100 columns.
- Dashboard and add-chart prompts accept 3–6,000 characters.
- Initial AI dashboards support up to six charts, four configured KPIs and three categorical slicers.
- Additional charts have no fixed total count limit, but larger dashboards may be slower.
- AI report commentary supports up to 200 charts, subject to request duration and service limits.
- Date charts group records by month. Other category charts show up to fifteen categories ranked by value.
- Scatter plots show up to one thousand valid observations, sampled evenly in source order when necessary.
- Styled PDFs contain high-resolution report images. Report text is not selectable, and larger reports produce larger files.

## Build checks

Run these from the project root:

```bash
npx tsc --noEmit
npm run build
```

To run a production build locally:

```bash
npm run start
```

Before deployment, verify CSV/XLSX uploads, chart editing, slicers, AI chart additions, report generation and styled PDF download. Configure `GEMINI_API_KEY` and your working `GEMINI_MODEL` in the deployment environment as well as locally.

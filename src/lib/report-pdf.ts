"use client";

import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";

import { toPng } from "html-to-image";

import {
  PDFDocument,
  StandardFonts,
  rgb,
} from "pdf-lib";

import { ReportDocument } from "@/components/reports/ReportDocument";
import type { Report } from "@/lib/reports";

const EXPORT_WIDTH = 900;

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;

const MARGIN = 28;
const FOOTER_SPACE = 22;

const nextFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });

async function waitForCharts(
  article: HTMLElement
) {
  const deadline = performance.now() + 6000;

  while (performance.now() < deadline) {
    await nextFrame();

    const containers = [
      ...article.querySelectorAll<HTMLElement>(
        ".recharts-responsive-container"
      ),
    ];

    const ready = containers.every((container) => {
      const svg =
        container.querySelector<SVGElement>(
          "svg.recharts-surface"
        );

      return (
        svg &&
        svg.getBoundingClientRect().width > 0 &&
        svg.getBoundingClientRect().height > 0
      );
    });

    if (ready) {
      await nextFrame();
      await nextFrame();
      return;
    }
  }

  throw new Error(
    "Some report charts were not ready. " +
    "Wait a moment and download again."
  );
}

function setDesktopLayout(
  article: HTMLElement
) {
  // Keep the exported layout consistent even when
  // downloading from a mobile-width browser.
  article.style.width = `${EXPORT_WIDTH}px`;
  article.style.maxWidth = "none";
  article.style.boxSizing = "border-box";
  article.style.boxShadow = "none";

  for (const selector of [
    ".if-report-metadata",
    ".if-report-kpis",
  ]) {
    article
      .querySelectorAll<HTMLElement>(selector)
      .forEach((element) => {
        element.style.gridTemplateColumns =
          "repeat(2, minmax(0, 1fr))";
      });
  }

  article
    .querySelectorAll<HTMLElement>(
      ".if-report-header"
    )
    .forEach((element) => {
      element.style.padding = "28px";
    });

  article
    .querySelectorAll<HTMLElement>(
      ".if-report-header h2"
    )
    .forEach((element) => {
      element.style.fontSize = "26px";
    });

  article
    .querySelectorAll<HTMLElement>(
      ".if-report-body"
    )
    .forEach((element) => {
      element.style.padding = "26px";
    });

  article
    .querySelectorAll<HTMLElement>(
      ".if-report-chart"
    )
    .forEach((element) => {
      element.style.padding = "20px";
    });
}

interface ExportPage {
  element: HTMLElement;
  body: HTMLElement;
  blocks: number;
}

function paginate(
  article: HTMLElement,
  host: HTMLElement
): HTMLElement[] {
  const usableWidth =
    PAGE_WIDTH - MARGIN * 2;

  const usableHeight =
    PAGE_HEIGHT -
    MARGIN * 2 -
    FOOTER_SPACE;

  const maximumHeight =
    (usableHeight / usableWidth) *
      EXPORT_WIDTH -
    4;

  const header =
    article.querySelector<HTMLElement>(
      ".if-report-header"
    );

  const originalBody =
    article.querySelector<HTMLElement>(
      ".if-report-body"
    );

  if (!header || !originalBody) {
    throw new Error(
      "The styled report layout could not be found."
    );
  }

  const pages: ExportPage[] = [];

  function makePage(): ExportPage {
    const element = article.cloneNode(
      false
    ) as HTMLElement;

    const body = originalBody!.cloneNode(
      false
    ) as HTMLElement;

    element.style.margin = "0";
    element.style.width = `${EXPORT_WIDTH}px`;
    element.style.height = "auto";
    element.style.minHeight = "0";

    host.append(element);

    const page: ExportPage = {
      element,
      body,
      blocks: 0,
    };

    pages.push(page);

    return page;
  }

  let currentPage = makePage();

  currentPage.element.append(
    header.cloneNode(true)
  );

  currentPage.blocks++;

  // Each body child is kept intact:
  // notices, KPI section, overview, chart + summary,
  // and the final methodology note.
  for (const original of [
    ...originalBody.children,
  ]) {
    const block = original.cloneNode(
      true
    ) as HTMLElement;

    if (!currentPage.body.isConnected) {
      currentPage.element.append(
        currentPage.body
      );
    }

    currentPage.body.append(block);

    const pageHeight =
      currentPage.element
        .getBoundingClientRect()
        .height;

    if (
      pageHeight > maximumHeight &&
      currentPage.blocks > 0
    ) {
      block.remove();

      if (!currentPage.body.children.length) {
        currentPage.body.remove();
      }

      currentPage = makePage();

      currentPage.element.append(
        currentPage.body
      );

      currentPage.body.append(block);
    }

    currentPage.blocks++;
  }

  return pages.map((page) => page.element);
}

export async function buildReportPDF(
  report: Report
): Promise<Uint8Array> {
  if (typeof document === "undefined") {
    throw new Error(
      "Styled PDF export must run in the browser."
    );
  }

  const host = document.createElement("div");

  host.setAttribute("aria-hidden", "true");

  Object.assign(host.style, {
    position: "fixed",
    left: "-100000px",
    top: "0",
    width: `${EXPORT_WIDTH}px`,
    background: "#ffffff",
    pointerEvents: "none",
  });

  document.body.append(host);

  const root = createRoot(host);

  try {
    // Render the same component used by the Reports page.
    flushSync(() => {
      root.render(
        createElement(ReportDocument, {
          report,
        })
      );
    });

    if (document.fonts) {
      await document.fonts.ready;
    }

    const article =
      host.querySelector<HTMLElement>(
        ".if-report-document"
      );

    if (!article) {
      throw new Error(
        "The report could not be rendered for download."
      );
    }

    setDesktopLayout(article);

    await waitForCharts(article);

    const pages = paginate(
      article,
      host
    );

    const pdf = await PDFDocument.create();

    pdf.setTitle(report.title);
    pdf.setAuthor("InsightForge AI");
    pdf.setSubject(
      "Styled report exported from the webpage layout"
    );

    const footerFont = await pdf.embedFont(
      StandardFonts.Helvetica
    );

    for (
      let index = 0;
      index < pages.length;
      index++
    ) {
      const element = pages[index];

      const height = Math.ceil(
        element.getBoundingClientRect().height
      );

      const png = await toPng(element, {
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        width: EXPORT_WIDTH,
        height,
        skipFonts: true,
      });

      const image = await pdf.embedPng(png);

      const page = pdf.addPage([
        PAGE_WIDTH,
        PAGE_HEIGHT,
      ]);

      // An unusually tall section is scaled to fit
      // rather than cutting through its cards or chart.
      const scale = Math.min(
        (PAGE_WIDTH - MARGIN * 2) /
          image.width,

        (
          PAGE_HEIGHT -
          MARGIN * 2 -
          FOOTER_SPACE
        ) / image.height
      );

      const imageWidth =
        image.width * scale;

      const imageHeight =
        image.height * scale;

      page.drawImage(image, {
        x:
          (PAGE_WIDTH - imageWidth) / 2,

        y:
          PAGE_HEIGHT -
          MARGIN -
          imageHeight,

        width: imageWidth,
        height: imageHeight,
      });

      page.drawText(
        `InsightForge AI  |  Page ${
          index + 1
        } of ${pages.length}`,
        {
          x: MARGIN,
          y: 17,
          size: 8,
          font: footerFont,
          color: rgb(0.39, 0.45, 0.55),
        }
      );
    }

    return await pdf.save();
  } finally {
    root.unmount();
    host.remove();
  }
}

export async function downloadReportPDF(
  report: Report
) {
  const bytes = await buildReportPDF(report);

  const blob = new Blob(
    [Uint8Array.from(bytes).buffer],
    {
      type: "application/pdf",
    }
  );

  const url = URL.createObjectURL(blob);

  const anchor =
    document.createElement("a");

  anchor.href = url;
  anchor.download =
    `insightforge-${report.id}.pdf`;

  document.body.append(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}
"use client";

import { Sparkles } from "lucide-react";

import type { Report } from "@/lib/reports";
import { Visualization } from "@/components/dashboard/Visualization";
import { formatValue } from "@/lib/analytics";

export function ReportDocument({
  report,
}: {
  report: Report;
}) {
  return (
    <article className="if-report-document">
      <header className="if-report-header">
        <span className="if-report-brand">
          <Sparkles size={17} />
          INSIGHTFORGE AI / REPORT
        </span>

        <h2>{report.title}</h2>
        <p>{report.description}</p>

        <dl className="if-report-metadata">
          <div>
            <dt>Dataset</dt>
            <dd>{report.dataset.name}</dd>
          </div>

          <div>
            <dt>Created</dt>
            <dd>
              {new Date(
                report.createdAt
              ).toLocaleString()}
            </dd>
          </div>

          <div>
            <dt>Records included</dt>
            <dd>
              {report.matchingRows.toLocaleString()}
              {" / "}
              {report.dataset.rowCount.toLocaleString()}
            </dd>
          </div>

          <div>
            <dt>Filters</dt>
            <dd>
              {report.filters.length
                ? report.filters
                    .map(
                      (filter) =>
                        `${filter.field}: ${filter.value}`
                    )
                    .join("; ")
                : "All records"}
            </dd>
          </div>
        </dl>
      </header>

      <div className="if-report-body">
        {report.warnings.map(
          (warning, index) => (
            <p
              key={index}
              className="if-notice"
            >
              {warning}
            </p>
          )
        )}

        <section>
          <div className="if-section-heading">
            <span className="if-step">01</span>
            <h3>KPIs and explanations</h3>
          </div>

          <div className="if-report-kpis">
            {report.metrics.map((metric) => (
              <div
                key={metric.id}
                className="if-metric-card"
              >
                <h4>{metric.title}</h4>

                <p className="if-metric-value">
                  {formatValue(metric.value)}
                </p>

                <span className="if-metric-formula">
                  {metric.aggregation} of{" "}
                  {metric.field}
                </span>

                <p className="if-metric-explanation">
                  {report.narrative?.metrics.find(
                    (item) =>
                      item.id === metric.id
                  )?.text ||
                    (
                      "This older snapshot has no AI " +
                      "explanation. Generate a new report."
                    )}
                </p>
              </div>
            ))}
          </div>
        </section>

        {report.narrative?.overview && (
          <section className="if-ai-overview">
            <h3>
              <Sparkles size={17} />
              AI overview
            </h3>

            <p>{report.narrative.overview}</p>
          </section>
        )}

        {report.charts.map((chart, index) => (
          <section
            key={chart.config.id}
            className="if-report-chart"
          >
            <div className="if-section-heading">
              <span className="if-step">
                {String(index + 2).padStart(2, "0")}
              </span>

              <div>
                <h3>{chart.config.title}</h3>

                <p className="if-chart-caption">
                  {chart.config.type === "scatter"
                    ? (
                        `${chart.config.dimension} versus ` +
                        `${chart.config.measure}; ` +
                        "individual observations"
                      )
                    : (
                        `${chart.config.aggregation} of ` +
                        `${chart.config.measure} by ` +
                        `${chart.config.dimension}` +
                        (
                          chart.config.series
                            ? ` / ${chart.config.series}`
                            : ""
                        )
                      )}
                </p>
              </div>
            </div>

            <Visualization
              chart={chart.config}
              data={chart.result.points}
              series={chart.result.series}
              staticRender
            />

            <p className="if-chart-caption">
              {chart.result.note}
            </p>

            <div className="if-chart-summary">
              <h4>
                <Sparkles size={16} />
                AI summary
              </h4>

              <p>
                {report.narrative?.charts.find(
                  (item) =>
                    item.id === chart.config.id
                )?.text ||
                  (
                    "This older snapshot has no AI " +
                    "summary. Generate a new report."
                  )}
              </p>
            </div>
          </section>
        ))}

        <p className="if-footnote">
          Calculated values are the source of truth.
          AI commentary is an interpretation to review.
          Count counts non-empty values; distinctCount
          counts unique non-empty values.
          This report is a session snapshot.
        </p>
      </div>
    </article>
  );
}
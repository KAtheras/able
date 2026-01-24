"use client";

import React, { useMemo, useState } from "react";
import {
  ChartNoAxesCombined,
  CircleDollarSign,
  Form,
  StickyNote,
  TableRowsSplit,
} from "lucide-react";
import { getThemeForClient, themeToCssVars } from "@/lib/theme";
import { uiPreviewCopy, type UiPreviewLanguage } from "@/data/copy";

// IMPORTANT:
// This imports your existing big page component so /report uses the SAME:
// - language toggle + copy system
// - themeVars (client/theme)
// - API logic (/api/calculate, disclosures, etc.)
// Zero risk while you build the new report UI shell.
import UiPreviewPage, {
  type UiPreviewPageReportMode,
} from "../page";

type ReportTabId =
  | "overview"
  | "table"
  | "charts"
  | "amortization"
  | "notes";

type ReportTab = {
  id: ReportTabId;
  label: string;
  icon: React.ReactNode;
  activeBorderColor?: string;
};

const ICON_BOX_CLASS = "h-[86px] w-[86px]";

function classNames(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function ReportShellPage() {
  const tabs: ReportTab[] = useMemo(
    () => [
      {
        id: "overview",
        label: "Inputs",
        icon: <Form className="h-11 w-11 md:h-14 md:w-14 text-[color:var(--theme-accent)]" />,
        activeBorderColor: "var(--theme-accent)",
      },
      {
        id: "table",
        label: "Account activity",
        icon: (
          <ChartNoAxesCombined className="h-11 w-11 md:h-14 md:w-14 text-red-600" />
        ),
        activeBorderColor: "#dc2626",
      },
      {
        id: "charts",
        label: "Tax benefits",
        icon: <CircleDollarSign className="h-11 w-11 md:h-14 md:w-14 text-green-600" />,
        activeBorderColor: "#16a34a",
      },
      {
        id: "amortization",
        label: "Amortization",
        icon: (
          <TableRowsSplit className="h-11 w-11 md:h-14 md:w-14 text-[#f97316]" />
        ),
        activeBorderColor: "#f97316",
      },
      {
        id: "notes",
        label: "Disclosures",
        icon: <StickyNote className="h-11 w-11 md:h-14 md:w-14 text-[color:var(--theme-fg)]" />,
        activeBorderColor: "var(--theme-fg)",
      },
    ],
    [],
  );

  const [activeTab, setActiveTab] = useState<ReportTabId>("overview");
  const [selectedClientId, setSelectedClientId] = useState("state-il");
  const [reportLanguage, setReportLanguage] =
    useState<UiPreviewLanguage>("en");
  const copy = uiPreviewCopy.en;
  const steps = copy.steps;
  const step = 0;
  const reportStepIndex = steps.length - 1;
  const themeVars = useMemo(
    () => themeToCssVars(getThemeForClient(selectedClientId)),
    [selectedClientId],
  );
  const iconOnlyTabIds = new Set<ReportTabId>([
    "overview",
    "table",
    "charts",
    "amortization",
    "notes",
  ]);

  return (
    <div
      className="min-h-screen bg-[color:var(--theme-bg)] text-[color:var(--theme-fg)]"
      style={{
        ...themeVars,
        backgroundColor: "var(--theme-bg)",
        color: "var(--theme-fg)",
      }}
    >
      <div className="mx-auto w-full max-w-[90rem] px-4 py-0">
        <header className="flex shrink-0 flex-col gap-2 rounded-3xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface-1)] px-6 py-2 shadow-lg backdrop-blur">
          <p className="text-xs uppercase tracking-[0.4em] text-[color:var(--theme-muted)]">
            {copy.header.bannerPlaceholder}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--theme-fg)]">
                {copy.header.clientName}
              </h1>
              <p className="mt-1 text-sm text-[color:var(--theme-muted)]">
                {copy.header.clientSubtitle}
              </p>
            </div>
            <div className="flex flex-row flex-wrap items-center gap-3 max-[1024px]:flex-col max-[1024px]:items-stretch">
              <select
                className="select-pill rounded-full border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] px-3 py-2 text-xs uppercase tracking-[0.35em] text-[color:var(--theme-muted)]"
                value={selectedClientId}
                onChange={(event) => setSelectedClientId(event.target.value)}
              >
                <option value="base">{copy.themes.base}</option>
                <option value="state-ca">{copy.themes.ca}</option>
                <option value="state-il">{copy.themes.il}</option>
                <option value="state-ut">{copy.themes.ut}</option>
                <option value="state-tx">{copy.themes.tx}</option>
              </select>
              <div className="rounded-full border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] px-4 py-2 text-xs uppercase tracking-[0.35em] text-[color:var(--theme-muted)]">
                {copy.screenLabel(step + 1, steps.length)}
              </div>
            </div>
          </div>
        </header>
        <div className="w-full rounded-3xl bg-transparent shadow-none">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1">
              <div
                id="report-horizon-control"
                className="flex items-center justify-start"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                aria-label="Refresh"
                className="rounded-full border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] p-2 text-[color:var(--theme-fg)]"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v6h-6" />
                </svg>
              </button>
              <div className="flex items-center gap-2 rounded-full border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] px-3 py-2 text-xs uppercase tracking-[0.35em] text-[color:var(--theme-muted)]">
                <span className="sr-only">{copy.languageLabel}</span>
                {(["en", "es"] as const).map((lang) => {
                  const isActive = reportLanguage === lang;
                  return (
                    <button
                      key={`report-lang-${lang}`}
                      type="button"
                      onClick={() => setReportLanguage(lang)}
                      className={`rounded-full px-2 py-1 text-[0.6rem] font-semibold tracking-[0.25em] transition ${
                        isActive
                          ? "bg-[color:var(--theme-accent)] text-[color:var(--theme-accent-text)]"
                          : "text-[color:var(--theme-muted)] hover:text-[color:var(--theme-fg)]"
                      }`}
                    >
                      {lang.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        <div className="grid min-h-[calc(100vh-2rem)] grid-cols-1 gap-0 md:grid-cols-[10.95rem_1fr]">
          {/* Left rail (desktop) */}
          <aside className="hidden md:flex flex-col rounded-3xl bg-[color:var(--theme-surface-1)] shadow-lg backdrop-blur">

            <nav className="flex flex-col gap-2 px-3 pb-4 pt-3">
              {tabs.map((t) => {
                const isActive = t.id === activeTab;
                const isIconTab = iconOnlyTabIds.has(t.id);
                const activeBorderStyle =
                  isActive && t.activeBorderColor
                    ? { borderColor: t.activeBorderColor }
                    : undefined;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id)}
                    className={classNames(
                      "group rounded-2xl transition min-h-[3.6rem] transform",
                      isIconTab
                        ? "border-0 md:border md:border-transparent bg-transparent px-0 py-0"
                        : "border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] px-4 py-3 text-[color:var(--theme-fg)] hover:bg-[color:var(--theme-surface-1)]",
                      isActive && !isIconTab
                        ? "border-[color:var(--theme-accent)] bg-[color:var(--theme-accent)] text-[color:var(--theme-accent-text)]"
                        : "",
                      isActive ? "scale-[1.2]" : "scale-[0.95]",
                    )}
                    aria-current={isActive ? "page" : undefined}
                    style={activeBorderStyle}
                  >
                    <div
                      className={classNames(
                        "flex",
                        !isIconTab ? "items-center gap-3" : "flex-col items-center gap-0",
                      )}
                    >
                      <span
                        className={classNames(
                          "inline-flex items-center justify-center transition-transform duration-200",
                          isIconTab
                            ? `${ICON_BOX_CLASS} bg-[color:var(--theme-surface-1)]`
                            : "h-10 w-10 rounded-2xl",
                          !isIconTab &&
                            (isActive
                              ? "bg-white/15"
                              : "bg-[color:var(--theme-surface-1)]"),
                        )}
                      >
                        <span className="text-current">{t.icon}</span>
                      </span>
                      <span
                        className={classNames(
                          isIconTab
                            ? "text-[0.45rem] sm:text-[0.55rem] md:text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-[color:var(--theme-muted)] md:-mt-1 -mt-0"
                            : "text-sm font-semibold",
                          isActive ? "font-black text-[color:var(--theme-accent)]" : "",
                        )}
                      >
                        {isIconTab ? t.label.toUpperCase() : t.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Main panel */}
          <main className="min-h-0">
            <div className="min-h-0">
              {(() => {
                const shouldShowPreview =
                  activeTab === "overview" ||
                  activeTab === "table" ||
                  activeTab === "amortization";
                const reportMode: UiPreviewPageReportMode | undefined =
                  activeTab === "overview"
                    ? "inputs"
                    : activeTab === "table"
                      ? "report-table"
                      : activeTab === "amortization"
                        ? "report-amortization"
                        : undefined;
                const horizonControlPortalId =
                  reportMode && reportMode !== "inputs"
                    ? "report-horizon-control"
                    : undefined;
                const maxStepIndexValue =
                  reportMode === "inputs" ? 1 : reportStepIndex;
                const initialStepValue =
                  reportMode === "inputs" ? 0 : reportStepIndex;
                const initialReportViewModeValue =
                  reportMode === "inputs" ? "default" : "table";
                return (
                  <>
                    <div className={shouldShowPreview ? "" : "hidden"}>
                      <UiPreviewPage
                        maxStepIndex={maxStepIndexValue}
                        initialStepIndex={initialStepValue}
                        initialReportViewMode={initialReportViewModeValue}
                        hideHeader
                        language={reportLanguage}
                        reportMode={reportMode}
                        horizonControlPortalId={horizonControlPortalId}
                      />
                    </div>
                    {!shouldShowPreview ? (
                      <div className="p-6">
                        <div className="rounded-3xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] p-6">
                          <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--theme-muted)]">
                            Placeholder
                          </p>
                          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                            {tabs.find((t) => t.id === activeTab)?.label}
                          </h2>
                          <p className="mt-2 text-sm text-[color:var(--theme-muted)]">
                            We’ll build this report page next. For now it’s a
                            blank canvas.
                          </p>

                          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {Array.from({ length: 6 }).map((_, i) => (
                              <div
                                key={i}
                                className="rounded-3xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface-1)] p-5"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="h-11 w-11 rounded-2xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)]" />
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold">
                                      Square Tile {i + 1}
                                    </p>
                                    <p className="text-xs text-[color:var(--theme-muted)]">
                                      Replace with PNG/icon later
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </>
                );
              })()}
            </div>

            {/* Bottom bar (mobile) */}
            <div className="sticky bottom-0 z-40 border-t-0 bg-[color:var(--theme-surface-1)] px-2 py-2 md:hidden">
              <nav className="grid grid-cols-5 gap-2">
                {tabs.map((t) => {
                  const isActive = t.id === activeTab;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActiveTab(t.id)}
                    className={classNames(
                      "flex flex-col items-center justify-center gap-1 rounded-2xl border-none px-2 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.22em] transition",
                      isActive
                        ? "bg-[#e5e7eb] text-[color:var(--theme-fg)]"
                        : "bg-[color:var(--theme-surface)] text-[color:var(--theme-muted)]",
                    )}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <span className="text-current">{t.icon}</span>
                      <span className="leading-none text-[0.45rem] uppercase tracking-[0.35em]">
                        {t.label}
                      </span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

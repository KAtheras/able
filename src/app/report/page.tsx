"use client";

import React, { useMemo, useState } from "react";
import { getThemeForClient, themeToCssVars } from "@/lib/theme";
import { uiPreviewCopy } from "@/data/copy";

// IMPORTANT:
// This imports your existing big page component so /report uses the SAME:
// - language toggle + copy system
// - themeVars (client/theme)
// - API logic (/api/calculate, disclosures, etc.)
// Zero risk while you build the new report UI shell.
import UiPreviewPage from "../page";

type ReportTabId = "overview" | "summary" | "charts" | "table" | "notes";

type ReportTab = {
  id: ReportTabId;
  label: string;
  icon: React.ReactNode;
};

function IconBars(props: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={props.className ?? "h-5 w-5"}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 20V10" />
      <path d="M12 20V4" />
      <path d="M18 20v-8" />
    </svg>
  );
}

function IconDoc(props: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={props.className ?? "h-5 w-5"}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
    </svg>
  );
}

function IconChart(props: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={props.className ?? "h-5 w-5"}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M7 15l3-3 3 2 4-6" />
      <path d="M17 8h0" />
    </svg>
  );
}

function IconTable(props: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={props.className ?? "h-5 w-5"}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 5h18v14H3z" />
      <path d="M3 10h18" />
      <path d="M8 5v14" />
      <path d="M16 5v14" />
    </svg>
  );
}

function IconNote(props: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={props.className ?? "h-5 w-5"}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 4h16v16H4z" />
      <path d="M8 9h8" />
      <path d="M8 13h8" />
      <path d="M8 17h6" />
    </svg>
  );
}

function classNames(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function ReportShellPage() {
  const tabs: ReportTab[] = useMemo(
    () => [
      { id: "overview", label: "Inputs", icon: <IconDoc /> },
      { id: "summary", label: "Summary", icon: <IconBars /> },
      { id: "charts", label: "Charts", icon: <IconChart /> },
      { id: "table", label: "Table", icon: <IconTable /> },
      { id: "notes", label: "Notes", icon: <IconNote /> },
    ],
    [],
  );

  const [activeTab, setActiveTab] = useState<ReportTabId>("overview");
  const [selectedClientId, setSelectedClientId] = useState("state-il");
  const copy = uiPreviewCopy.en;
  const steps = copy.steps;
  const step = 0;
  const themeVars = useMemo(
    () => themeToCssVars(getThemeForClient(selectedClientId)),
    [selectedClientId],
  );

  return (
    <div
      className="min-h-screen bg-[color:var(--theme-bg)] text-[color:var(--theme-fg)]"
      style={{
        ...themeVars,
        backgroundColor: "var(--theme-bg)",
        color: "var(--theme-fg)",
      }}
    >
      <div className="mx-auto w-full max-w-[90rem] px-4 py-4">
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
        <div className="grid min-h-[calc(100vh-2rem)] grid-cols-1 gap-4 mt-4 md:grid-cols-[10.95rem_1fr]">
          {/* Left rail (desktop) */}
          <aside className="hidden md:flex flex-col rounded-3xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface-1)] shadow-lg backdrop-blur">
            <div className="px-5 pt-5 pb-3">
              <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--theme-muted)]">
                Report navigation
              </p>
              <h1 className="mt-2 text-xl font-semibold tracking-tight">
                Final report
              </h1>
              <p className="mt-1 text-sm text-[color:var(--theme-muted)]">
                Switch between views
              </p>
            </div>

      <nav className="flex flex-col gap-2 px-3 pb-4">
              {tabs.map((t) => {
                const isActive = t.id === activeTab;
                return (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={classNames(
              "group flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition",
              "min-h-[5rem]",
              isActive
                ? "border-[color:var(--theme-accent)] bg-[color:var(--theme-accent)] text-[color:var(--theme-accent-text)]"
                : "border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] text-[color:var(--theme-fg)] hover:bg-[color:var(--theme-surface-1)]",
            )}
            aria-current={isActive ? "page" : undefined}
          >
                    <span
                      className={classNames(
                        "inline-flex h-10 w-10 items-center justify-center rounded-2xl",
                        isActive
                          ? "bg-white/15"
                          : "bg-[color:var(--theme-surface-1)]",
                      )}
                    >
                      <span className="text-current">{t.icon}</span>
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="text-sm font-semibold">{t.label}</span>
                    </span>
                  </button>
                );
              })}
            </nav>

          </aside>

          {/* Main panel */}
          <main className="min-h-0 rounded-3xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface-1)] shadow-lg backdrop-blur">
            <div className="min-h-0">
              {activeTab === "overview" ? (
                // This is the key: the existing planner page renders here
                // so copy/themeVars/API behavior stays identical.
                <UiPreviewPage />
              ) : (
                <div className="p-6">
                  <div className="rounded-3xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] p-6">
                    <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--theme-muted)]">
                      Placeholder
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                      {tabs.find((t) => t.id === activeTab)?.label}
                    </h2>
                    <p className="mt-2 text-sm text-[color:var(--theme-muted)]">
                      We’ll build this report page next. For now it’s a blank
                      canvas.
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
              )}
            </div>

            {/* Bottom bar (mobile) */}
            <div className="sticky bottom-0 z-40 border-t border-[color:var(--theme-border)] bg-[color:var(--theme-surface-1)] px-2 py-2 md:hidden">
              <nav className="grid grid-cols-5 gap-2">
                {tabs.map((t) => {
                  const isActive = t.id === activeTab;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActiveTab(t.id)}
                      className={classNames(
                        "flex flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.22em] transition",
                        isActive
                          ? "border-[color:var(--theme-accent)] bg-[color:var(--theme-accent)] text-[color:var(--theme-accent-text)]"
                          : "border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] text-[color:var(--theme-muted)]",
                      )}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <span className="text-current">{t.icon}</span>
                      <span className="leading-none">{t.label}</span>
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

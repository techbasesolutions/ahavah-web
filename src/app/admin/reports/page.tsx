"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  FileDown,
  Mail,
  MoreHorizontal,
  Search,
  Shield,
  ShieldCheck,
  UserX,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pill } from "@/components/kibo-ui/pill";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/app/empty-state";
import {
  PageHeader,
  PageHeaderTitle,
  PageShell,
} from "@/components/app/page-shell";

import { apiClient, ApiError } from "@/lib/api-client";
import { useProfile } from "@/lib/use-profile";
import { isAdminOrMod } from "@/lib/profile-schema";

/**
 * /admin/reports — moderator-gated abuse-report listing.
 *
 * Canonical port from `8-New-Desktops/new-desktop-export/desktop-extra.jsx:1062`.
 * Desktop layout is a 3-col grid:
 *   - LEFT (260px)  — filter/stats rail (placeholder counts until /admin/stats
 *                     endpoint ships)
 *   - CENTER (1fr)  — quick filter row + report list (real data)
 *   - RIGHT (380px) — selected-report detail + action rail (action buttons
 *                     wired to placeholders until /admin/moderation actions
 *                     ship)
 *
 * Mobile (<md): single-column list as before — admin is a desktop-primary
 * surface; mobile gives a serviceable read-only view.
 *
 * Severity inference (since the backend has no `severity` field):
 *   - reported_verification_required → "high"
 *   - !reported_active                → "med"
 *   - otherwise                        → "low"
 */
type AdminReport = {
  created_at: string;
  reporter_id: number;
  reporter_uuid: string;
  reporter_name: string;
  reporter_email: string;
  reported_id: number;
  reported_uuid: string;
  reported_name: string;
  reported_email: string;
  reported_active: boolean;
  reported_verification_required: boolean;
  reason: string;
};

type ReportsResponse = {
  reports: ReadonlyArray<AdminReport>;
  count: number;
};

type State =
  | { kind: "loading" }
  | { kind: "happy"; reports: ReadonlyArray<AdminReport> }
  | { kind: "empty" }
  | { kind: "forbidden" }
  | { kind: "error"; message: string };

type Severity = "high" | "med" | "low";

const reportKey = (r: AdminReport) =>
  `${r.reporter_id}-${r.reported_id}-${r.created_at}`;

function severityOf(r: AdminReport): Severity {
  if (r.reported_verification_required) return "high";
  if (!r.reported_active) return "med";
  return "low";
}

// Placeholder stats — real counts will come from /admin/stats once it lands.
const PLACEHOLDER_STATS = [
  { label: "Open",      value: "23",  tone: "pink" as const },
  { label: "This week", value: "41",  tone: "lavender" as const },
  { label: "Resolved",  value: "312", tone: "lime" as const },
  { label: "Avg. time", value: "4h",  tone: "lavender" as const },
];

const SEVERITY_FACETS = [
  { label: "High", count: 12, dot: "pink" as const,     active: true  },
  { label: "Med.", count:  9, dot: "lavender" as const, active: false },
  { label: "Low",  count:  2, dot: "lime" as const,     active: false },
];

const STATUS_FACETS = [
  { label: "Open",                  count: 18, on: true  },
  { label: "Account inactive",      count:  4, on: false },
  { label: "Verification flagged",  count:  7, on: false },
  { label: "Resolved",              count: 12, on: false },
];

export default function AdminReportsPage() {
  const { profile, loaded } = useProfile();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const isAuthorized = isAdminOrMod(profile);

  useEffect(() => {
    if (!loaded) return;
    if (!isAuthorized) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ kind: "forbidden" });
      return;
    }
    let cancelled = false;
    setState({ kind: "loading" });
    void apiClient
      .get<ReportsResponse>("/admin/reports")
      .then((res) => {
        if (cancelled) return;
        if (!res.reports || res.reports.length === 0) {
          setState({ kind: "empty" });
        } else {
          setState({ kind: "happy", reports: res.reports });
          setSelectedKey(reportKey(res.reports[0]));
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 403) {
          setState({ kind: "forbidden" });
          return;
        }
        const msg =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Couldn't load reports.";
        setState({ kind: "error", message: msg });
      });
    return () => {
      cancelled = true;
    };
  }, [loaded, isAuthorized, reloadKey]);

  const selectedReport = useMemo<AdminReport | null>(() => {
    if (state.kind !== "happy" || !selectedKey) return null;
    return state.reports.find((r) => reportKey(r) === selectedKey) ?? null;
  }, [state, selectedKey]);

  return (
    <PageShell
      bottomPad="none"
      desktopShell="sidebar"
      topBarTitle="Abuse reports"
      topBarActions={
        <div className="hidden md:flex items-center gap-2.5">
          <Pill variant="lavender" size="sm">
            <Shield className="size-3" /> Moderator
          </Pill>
          <Button variant="outline" size="sm">
            <FileDown className="size-3.5" />
            Export CSV
          </Button>
        </div>
      }
    >
      {/* ── Mobile header ───────────────────────────────────────────── */}
      <PageHeader pad="tight" className="md:hidden flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          aria-label="Back to profile"
          render={<Link href="/profile" prefetch={false} />}
          className="bg-card border-(--hairline) text-(--ink)"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <PageHeaderTitle>Abuse reports</PageHeaderTitle>
      </PageHeader>

      {/* ── Mobile body — list-only (admin is desktop-primary) ────── */}
      <div className="md:hidden px-5 pb-12 pt-4">
        <RouterBody
          state={state}
          onReload={() => setReloadKey((k) => k + 1)}
          renderHappy={(reports) => (
            <section className="flex flex-col gap-3">
              <p className="text-caption text-(--ink-2)">
                Showing {reports.length} most recent · server caps at 200
              </p>
              {reports.map((r) => (
                <ReportCard
                  key={reportKey(r)}
                  report={r}
                  selected={false}
                  onSelect={() => {}}
                />
              ))}
            </section>
          )}
        />
      </div>

      {/* ── Desktop 3-col body ─────────────────────────────────────── */}
      <div className="hidden md:grid grid-cols-[260px_1fr_380px] gap-6 px-8 pt-6 pb-8 flex-1 min-h-0 overflow-hidden">
        {/* LEFT — filter / stats rail */}
        <aside className="flex flex-col gap-3.5 overflow-y-auto min-h-0 pr-1">
          <div className="grid grid-cols-2 gap-2.5">
            {PLACEHOLDER_STATS.map((s) => (
              <StatTile key={s.label} label={s.label} value={s.value} dot={s.tone} />
            ))}
          </div>

          <Card tone="default">
            <CardContent className="p-4">
              <p className="text-overline text-(--ink-2) mb-2.5 m-0">Severity</p>
              <div className="flex flex-col">
                {SEVERITY_FACETS.map((f) => (
                  <div
                    key={f.label}
                    className={
                      f.active
                        ? "flex items-center gap-2.5 py-2 px-1.5 rounded-lg bg-lavender/12"
                        : "flex items-center gap-2.5 py-2 px-1.5 rounded-lg"
                    }
                  >
                    <span
                      aria-hidden
                      className={`size-2 rounded-full bg-${f.dot}`}
                    />
                    <span
                      className={
                        f.active
                          ? "flex-1 text-meta font-bold text-(--ink)"
                          : "flex-1 text-meta font-medium text-(--ink)"
                      }
                    >
                      {f.label}
                    </span>
                    <span className="text-caption text-(--ink-3) tabular-nums">
                      {f.count}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-overline text-(--ink-2) mt-4 mb-2.5 m-0">
                Status
              </p>
              <div className="flex flex-col">
                {STATUS_FACETS.map((f) => (
                  <div
                    key={f.label}
                    className="flex items-center gap-2.5 py-2 px-1.5"
                  >
                    <span
                      aria-hidden
                      className={
                        f.on
                          ? "flex size-4 shrink-0 items-center justify-center rounded bg-lime border border-lime"
                          : "flex size-4 shrink-0 items-center justify-center rounded bg-card border border-(--hairline)"
                      }
                    >
                      {f.on ? (
                        <Check className="size-2.5 text-black" strokeWidth={3} />
                      ) : null}
                    </span>
                    <span className="flex-1 text-meta text-(--ink-2)">
                      {f.label}
                    </span>
                    <span className="text-caption text-(--ink-3) tabular-nums">
                      {f.count}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </aside>

        {/* CENTER — quick filter + report list */}
        <div className="flex flex-col gap-2.5 overflow-hidden min-w-0">
          <div className="flex items-center gap-2">
            <div className="flex flex-1 min-w-0 h-10.5 items-center gap-2 rounded-xl border border-(--hairline) bg-card px-3.5">
              <Search className="size-3.5 shrink-0 text-(--ink-3)" />
              <span className="flex-1 text-sm text-(--ink-3) truncate">
                Search by reporter or reason…
              </span>
            </div>
            <Pill
              size="sm"
              variant="outline"
              className="border-lavender/40 text-lavender bg-transparent"
            >
              All
            </Pill>
            <Pill variant="lime" size="sm">
              Open
            </Pill>
            <Pill
              size="sm"
              variant="outline"
              className="border-lavender/40 text-lavender bg-transparent"
            >
              High severity
            </Pill>
            <Pill
              size="sm"
              variant="outline"
              className="border-lavender/40 text-lavender bg-transparent"
            >
              Today
            </Pill>
          </div>

          <div className="flex flex-col gap-2.5 overflow-y-auto min-h-0 pr-1">
            <RouterBody
              state={state}
              onReload={() => setReloadKey((k) => k + 1)}
              renderHappy={(reports) =>
                reports.map((r) => {
                  const key = reportKey(r);
                  return (
                    <ReportCard
                      key={key}
                      report={r}
                      selected={key === selectedKey}
                      onSelect={() => setSelectedKey(key)}
                    />
                  );
                })
              }
            />
          </div>
        </div>

        {/* RIGHT — selected report detail + actions */}
        <aside className="flex flex-col gap-4 overflow-y-auto min-h-0 pl-1">
          {selectedReport ? (
            <DetailRail report={selectedReport} />
          ) : (
            <Card tone="default">
              <CardContent className="flex flex-col gap-2 p-5">
                <p className="text-overline text-(--ink-2) m-0">
                  Nothing selected
                </p>
                <p className="text-caption text-(--ink-2) leading-relaxed m-0">
                  Pick a report from the list to inspect the reported account
                  and take action.
                </p>
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </PageShell>
  );
}

/** Branch over State for both mobile + desktop body. */
function RouterBody({
  state,
  onReload,
  renderHappy,
}: {
  state: State;
  onReload: () => void;
  renderHappy: (reports: ReadonlyArray<AdminReport>) => React.ReactNode;
}) {
  if (state.kind === "loading") {
    return (
      <div className="space-y-3" aria-busy="true" aria-live="polite">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
    );
  }
  if (state.kind === "forbidden") {
    return (
      <EmptyState
        variant="you-blocked-everyone"
        title="Moderator access required"
        description="This surface is only available to operators with the admin or mod role on their account."
        action={{ label: "Back to profile", href: "/profile" }}
      />
    );
  }
  if (state.kind === "error") {
    return (
      <ErrorState
        title="Couldn't load reports"
        description={state.message}
        retry={{ onClick: onReload }}
      />
    );
  }
  if (state.kind === "empty") {
    return (
      <EmptyState
        variant="no-messages"
        title="Inbox zero, no open reports"
        description="Anyone the community blocks with a report reason shows up here."
      />
    );
  }
  return <>{renderHappy(state.reports)}</>;
}

function StatTile({
  label,
  value,
  dot,
}: {
  label: string;
  value: string;
  dot: "pink" | "lavender" | "lime";
}) {
  return (
    <Card tone="default">
      <CardContent className="p-3.5">
        <div className="flex items-center gap-1.5">
          <span aria-hidden className={`size-2 rounded-full bg-${dot}`} />
          <span className="text-caption text-(--ink-3) truncate">{label}</span>
        </div>
        <p className="mt-1 text-h3 text-(--ink) tabular-nums m-0">{value}</p>
      </CardContent>
    </Card>
  );
}

function ReportCard({
  report,
  selected,
  onSelect,
}: {
  report: AdminReport;
  selected: boolean;
  onSelect: () => void;
}) {
  const sev = severityOf(report);
  const sevStrip =
    sev === "high" ? "bg-pink" : sev === "med" ? "bg-lavender" : "bg-lime";
  const sevPill =
    sev === "high" ? "pink" : sev === "med" ? "lavender" : "lime";
  return (
    <Card
      tone="default"
      className={
        selected
          ? "border-2 border-lavender shadow-[0_0_0_4px_color-mix(in_oklch,var(--color-lavender)_14%,transparent)]"
          : ""
      }
    >
      <CardContent className="p-0">
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={selected ? "true" : "false"}
          className="w-full text-left flex items-stretch gap-3.5 p-4.5 rounded-2xl"
        >
          <span
            aria-hidden
            className={`w-2 self-stretch rounded shrink-0 ${sevStrip}`}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-meta font-bold text-(--ink)">
                {report.reporter_name} reported {report.reported_name}
              </span>
              <span className="text-caption text-(--ink-3)">
                · {formatStamp(report.created_at)}
              </span>
              <span className="flex-1" />
              <Pill variant={sevPill} size="sm">
                {sev.toUpperCase()}
              </Pill>
              {!report.reported_active ? (
                <Pill variant="lavender" size="sm">
                  Inactive
                </Pill>
              ) : null}
              {report.reported_verification_required ? (
                <Pill variant="pink" size="sm">
                  Verify flag
                </Pill>
              ) : null}
            </div>
            <div className="mt-2.5 rounded-xl border border-(--hairline) bg-(--app) px-3.5 py-2.5">
              <span className="text-sm italic leading-relaxed text-(--ink-2)">
                &ldquo;{report.reason || "(no reason given)"}&rdquo;
              </span>
            </div>
            <div className="flex items-center gap-4.5 mt-3">
              <Link
                href={`/profile/${report.reported_uuid}?from=admin`}
                prefetch={false}
                onClick={(e) => e.stopPropagation()}
                className="text-caption font-semibold text-lavender hover:underline"
              >
                View reported →
              </Link>
              <Link
                href={`/profile/${report.reporter_uuid}?from=admin`}
                prefetch={false}
                onClick={(e) => e.stopPropagation()}
                className="text-caption font-semibold text-(--ink-3) hover:text-(--ink)"
              >
                View reporter
              </Link>
              <span className="flex-1" />
              <MoreHorizontal
                aria-hidden
                className="size-3.5 text-(--ink-3)"
              />
            </div>
          </div>
        </button>
      </CardContent>
    </Card>
  );
}

function DetailRail({ report }: { report: AdminReport }) {
  const sev = severityOf(report);
  const sevPill =
    sev === "high" ? "pink" : sev === "med" ? "lavender" : "lime";
  const initial = (report.reported_name || "?")[0]?.toUpperCase() ?? "?";

  return (
    <>
      <Card tone="default">
        <CardContent className="p-5">
          <div className="flex items-center gap-2.5 mb-3.5">
            <Pill variant={sevPill} size="sm">
              {sev.toUpperCase()}
            </Pill>
            <span className="text-caption text-(--ink-3)">
              Selected · {formatStamp(report.created_at)}
            </span>
          </div>
          <div className="flex gap-4 items-center">
            <span
              aria-hidden
              className="flex size-16 shrink-0 items-center justify-center rounded-2xl text-white text-2xl font-extrabold"
              style={{
                background:
                  "linear-gradient(135deg, var(--bg-indigo), var(--color-lavender))",
              }}
            >
              {initial}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-meta font-bold text-(--ink) m-0 truncate">
                {report.reported_name}
              </p>
              <p className="text-caption text-(--ink-3) m-0 truncate">
                {report.reported_email}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {!report.reported_active ? (
                  <Pill variant="lavender" size="sm">
                    Inactive
                  </Pill>
                ) : null}
                {report.reported_verification_required ? (
                  <Pill variant="pink" size="sm">
                    Verify flag
                  </Pill>
                ) : null}
              </div>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-(--hairline) bg-(--app) px-3.5 py-3">
            <span className="text-sm italic leading-relaxed text-(--ink-2)">
              &ldquo;{report.reason || "(no reason given)"}&rdquo;
            </span>
          </div>
          {/* Placeholder account-signal tiles until /admin/account-signal lands */}
          <p className="text-overline text-(--ink-2) mt-4.5 mb-2.5 m-0">
            Account signal
          </p>
          <div className="grid grid-cols-2 gap-2">
            <StatTile label="Reports against" value="-" dot="pink" />
            <StatTile label="Reports by them" value="-" dot="lavender" />
            <StatTile label="Days active"     value="-" dot="lavender" />
            <StatTile label="Match rate"      value="-" dot="lime" />
          </div>
        </CardContent>
      </Card>

      {/* Action rail — placeholder onClicks until backend endpoints ship */}
      <Card tone="default">
        <CardContent className="p-5">
          <p className="text-overline text-(--ink-2) mb-3 m-0">Take action</p>
          <div className="flex flex-col gap-2">
            <Button size="tap" tone="action" disabled>
              <UserX className="size-4" />
              Ban account
            </Button>
            <Button size="tap" tone="brand" disabled>
              <ShieldCheck className="size-4" />
              Force re-verification
            </Button>
            <Button size="tap" variant="outline" disabled>
              <Mail className="size-3.5" />
              Send warning
            </Button>
            <Button size="tap" variant="outline" disabled>
              <CheckCircle2 className="size-3.5" />
              Mark resolved
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function formatStamp(iso: string): string {
  // Backend ships timestamps without timezone (created_at is timestamp
  // without time zone). Treat as UTC for display consistency.
  const d = new Date(iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

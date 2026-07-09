"use client";

/**
 * Marriage checklist — the client activity, transcribed faithfully from the
 * Claude Design export ("Ahavah Marriage Checklist"). All styling lives in
 * src/app/marriage-checklist/marriage-checklist.css (mc- prefixed classes,
 * including ports of the export's inline styles).
 *
 * Flow: intro -> section 1 (role pick, scripture passages) -> open sections
 * (nice-to-haves, challenges) -> summary -> OTP gate -> send -> done.
 * Answers live in state, mirrored to localStorage mid-session (client-only),
 * sent via POST /marriage-checklist/send, and cleared on send. Copy rule:
 * no em dashes anywhere.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ExternalLink,
  Mail,
  Mountain,
  Plus,
  ScrollText,
  Share2,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { LogoMark } from "@/components/brand/logo-mark";
import { AntibotFields, type AntibotHandle } from "@/components/app/antibot-fields";
import { ApiError } from "@/lib/api-client";
import { checkOtp, requestEmailOtp } from "@/lib/auth-otp";
import { sendChecklistResults } from "@/lib/marriage-checklist";
import {
  FREQ_LABEL,
  PASSAGES,
  SECTIONS,
  type CustomItem,
  type Frequency,
  type Passage,
  type PassageAnswer,
  type Role,
  type Section,
  type SendAnswer,
  type Stance,
} from "@/app/marriage-checklist/content";

const STORE = "ahavah.marriage-checklist.v5";
const STANCE_LABEL: Record<Stance, string> = { agree: "Agree", disagree: "Disagree", other: "Other" };
const SECTION_ICON: Record<Section, React.ReactNode> = {
  biblical: <ScrollText size={34} />,
  "nice-to-have": <Sparkles size={34} />,
  challenge: <Mountain size={34} />,
};
const SECTION_CLS: Record<Section, string> = {
  biblical: "biblical",
  "nice-to-have": "nice",
  challenge: "challenge",
};

type Screen =
  | { type: "intro" }
  | { type: "section"; section: "biblical" }
  | { type: "obligation"; id: string }
  | { type: "open"; section: "nice-to-have" | "challenge" }
  | { type: "summary" }
  | { type: "gate" }
  | { type: "done" };

function buildScreens(role: Role | null): Screen[] {
  const s: Screen[] = [{ type: "intro" }, { type: "section", section: "biblical" }];
  PASSAGES.filter((p) => role && p.roles.includes(role)).forEach((p) =>
    s.push({ type: "obligation", id: p.id }),
  );
  s.push({ type: "open", section: "nice-to-have" });
  s.push({ type: "open", section: "challenge" });
  s.push({ type: "summary" }, { type: "gate" }, { type: "done" });
  return s;
}

type RatedItem = (Passage | CustomItem) & PassageAnswer & { section: Section; role?: Role };

// Sorted list of rated items (scripture answers + the couple's own items).
// Used by the summary and the send payload.
function computeRated(
  answers: Record<string, PassageAnswer>,
  custom: CustomItem[],
): RatedItem[] {
  const list: RatedItem[] = [];
  PASSAGES.forEach((p) => {
    const a = answers[p.id];
    if (a && a.importance) list.push({ ...p, ...a, section: "biblical" });
  });
  custom.forEach((c) => {
    if (c.title && c.title.trim() && c.importance) list.push(c as RatedItem);
  });
  return list.sort((x, y) => (y.importance || 0) - (x.importance || 0));
}

function toSendAnswers(rated: RatedItem[]): SendAnswer[] {
  return rated.map((r) => ({
    section: r.section,
    ...("ref" in r && r.ref ? { ref: r.ref } : {}),
    ...("title" in r && r.title ? { title: r.title } : {}),
    importance: r.importance as number,
    stance: r.stance as Stance,
    ...(r.frequency ? { frequency: r.frequency } : {}),
    ...(r.comment && r.comment.trim() ? { comment: r.comment.trim() } : {}),
    ...(r.examples && r.examples.some((e) => e.trim())
      ? { examples: r.examples.map((e) => e.trim()).filter(Boolean) }
      : {}),
    ...(r.stance === "other" && r.otherNote && r.otherNote.trim()
      ? { other_note: r.otherNote.trim() }
      : {}),
  }));
}

/* -------------------------------- inputs -------------------------------- */

// Auto-growing textarea: starts at the field's default height (CSS
// min-height) and expands with the content, so longer answers never
// scroll inside a fixed box. Height is set imperatively (not a JSX
// style prop) to track scrollHeight.
function GrowArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [props.value]);
  return <textarea ref={ref} rows={1} {...props} />;
}

/* ---------------------------------- pickers ---------------------------------- */

function ImportancePicker({ value, onChange }: { value?: number | null; onChange: (v: 1 | 2 | 3 | 4 | 5) => void }) {
  return (
    <div>
      <div className="mc-importance" role="radiogroup" aria-label="Importance to you">
        {([1, 2, 3, 4, 5] as const).map((n) => (
          <button key={n} type="button" role="radio" aria-checked={value === n}
            className={"mc-imp-dot" + (value && n <= value ? " mc-on" : "")}
            onClick={() => onChange(n)}>{n}</button>
        ))}
      </div>
      <div className="mc-imp-scale"><span>Matters a little</span><span>Matters most</span></div>
    </div>
  );
}

function StancePicker({ value, onChange }: { value?: Stance | null; onChange: (v: Stance) => void }) {
  return (
    <div className="mc-stance" role="radiogroup" aria-label="Your stance">
      {(Object.keys(STANCE_LABEL) as Stance[]).map((k) => (
        <button key={k} type="button" role="radio" aria-checked={value === k}
          className={"mc-stance-btn" + (value === k ? " mc-on-" + k : "")}
          onClick={() => onChange(k)}>{STANCE_LABEL[k]}</button>
      ))}
    </div>
  );
}

// Frequency is the respondent's own choice, not a suggestion.
function FrequencyPicker({ value, onChange }: { value?: Frequency | null; onChange: (v: Frequency | null) => void }) {
  return (
    <div className="mc-stance mc-stance--4" role="radiogroup" aria-label="How often you would practice this">
      {(Object.keys(FREQ_LABEL) as Frequency[]).map((k) => (
        <button key={k} type="button" role="radio" aria-checked={value === k}
          className={"mc-stance-btn mc-stance-btn--freq" + (value === k ? " mc-on-freq" : "")}
          onClick={() => onChange(value === k ? null : k)}>{FREQ_LABEL[k]}</button>
      ))}
    </div>
  );
}

/* ---------------------------------- screens ---------------------------------- */

function StepRow({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="mc-step-row">
      <div className="mc-step-num">{n}</div>
      <div>
        <div className="mc-step-title">{title}</div>
        <div className="mc-step-body">{body}</div>
      </div>
    </div>
  );
}

function IntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="mc-screen mc-col">
      <div className="mc-center">
        <span className="mc-pill mc-pill--lavender">A guided activity for couples</span>
        <h1 className="mc-display mc-d-hero mc-hero-title">The<br />Marriage<br />Checklist<span className="mc-lime-dot">.</span></h1>
        <p className="mc-lede mc-mt-24 mc-maxw-480">
          Read the passages set for a husband and a wife, then add your own nice-to-haves and challenges. Rate what matters most to you, and send a personal summary to you both.
        </p>
      </div>

      <div className="mc-card mc-mt-32">
        <div className="mc-notice">
          <ShieldCheck size={18} />
          <div>We never store your answers. Your responses live only on this page until you send your summary, and then they are gone. Nothing is saved to our servers.</div>
        </div>
        <div className="mc-steps">
          <StepRow n="1" title="Read the scripture" body="Section one shows the passages themselves, quoted in full. We add no titles and no interpretation." />
          <StepRow n="2" title="Make it yours" body="Rate what matters, set your own frequency, and write your own items for the other two sections." />
          <StepRow n="3" title="Share your summary" body="Sign in, add your spouse's email, and send it to you both." />
        </div>
        <button className="mc-btn mc-btn--cta mc-mt-24 mc-w-full" onClick={onStart}>
          Begin the checklist <ArrowRight size={18} />
        </button>
        <p className="mc-hint mc-center mc-mt-16">Takes about eight minutes. You can go back at any point.</p>
      </div>
    </div>
  );
}

function SectionScreen({ role, setRole, onNext, onBack }: {
  role: Role | null; setRole: (r: Role) => void; onNext: () => void; onBack: () => void;
}) {
  const meta = SECTIONS.biblical;
  return (
    <div className="mc-screen mc-col">
      <div className="mc-card mc-center">
        <div className="mc-medallion mc-medallion--biblical">{SECTION_ICON.biblical}</div>
        <span className="mc-overline">Section {meta.n} of 3</span>
        <h2 className="mc-display mc-d-lg mc-h-gap">{meta.label}</h2>
        <p className="mc-lede mc-mt-16 mc-maxw-440">{meta.blurb}</p>

        <div className="mc-mt-24">
          <label className="mc-field-label mc-label--center">Which are you completing?</label>
          <div className="mc-stance mc-stance--2">
            <button type="button" className={"mc-stance-btn mc-stance-btn--role" + (role === "husband" ? " mc-on-other" : "")} onClick={() => setRole("husband")}>I am the husband</button>
            <button type="button" className={"mc-stance-btn mc-stance-btn--role" + (role === "wife" ? " mc-on-other" : "")} onClick={() => setRole("wife")}>I am the wife</button>
          </div>
          <p className="mc-hint mc-center mc-mt-16">Your spouse can complete their own from the same page.</p>
        </div>

        <button className="mc-btn mc-btn--cta mc-mt-24 mc-w-full" disabled={!role} onClick={onNext}>
          {!role ? "Choose to continue" : "Continue"} <ArrowRight size={18} />
        </button>
      </div>
      <div className="mc-nav-row mc-nav-row--center">
        <button className="mc-btn mc-btn--ghost mc-btn--sm" onClick={onBack}><ArrowLeft size={16} /> Back</button>
      </div>
    </div>
  );
}

function ObligationScreen({ passage, role, answer, setAnswer, onNext, onBack }: {
  passage: Passage; role: Role | null; answer?: PassageAnswer;
  setAnswer: (a: PassageAnswer) => void; onNext: () => void; onBack: () => void;
}) {
  const a = answer || {};
  const canAdvance = Boolean(a.importance && a.stance);
  const roleLabel = role === "husband" ? "Husband" : role === "wife" ? "Wife" : null;
  const examples = a.examples && a.examples.length ? a.examples : [""];
  const setExample = (i: number, val: string) => { const arr = [...examples]; arr[i] = val; setAnswer({ ...a, examples: arr }); };
  // Server caps examples at 10 per item; stop adding at the cap so the
  // send never 400s on a limit the UI allowed.
  const addExample = () => { if (examples.length < 10) setAnswer({ ...a, examples: [...examples, ""] }); };
  const removeExample = (i: number) => { const arr = examples.filter((_, j) => j !== i); setAnswer({ ...a, examples: arr.length ? arr : [""] }); };

  return (
    <div className="mc-screen mc-col">
      <div className="mc-card">
        <div className="mc-chip-row">
          <span className="mc-pill mc-pill--lavender">{SECTIONS.biblical.label}</span>
          {roleLabel ? <span className="mc-role-tag">{roleLabel}</span> : null}
        </div>

        <div className="mc-verse-wrap">
          <a className="mc-verse-chip" href={passage.link} target="_blank" rel="noopener noreferrer">
            <ScrollText size={14} /> {passage.ref} <ExternalLink size={13} />
          </a>
        </div>
        <p className="mc-scripture">{passage.text}</p>
        <div className="mc-attribution">{passage.translation} &middot; read on YouVersion</div>

        <label className="mc-field-label mc-label--28">What does this mean to you?</label>
        <GrowArea className="mc-comment mc-comment--flush mc-grow" placeholder="In your own words." value={a.comment || ""}
          onChange={(e) => setAnswer({ ...a, comment: e.target.value })} />

        <label className="mc-field-label mc-label--26">What does this look like, practically? <span className="mc-sub">(your own examples)</span></label>
        {examples.map((ex, i) => (
          <div className="mc-example-row" key={i}>
            <GrowArea className="mc-input mc-grow" placeholder={"Example " + (i + 1)} value={ex} onChange={(e) => setExample(i, e.target.value)} />
            {examples.length > 1 ? (
              <button type="button" className="mc-example-x" aria-label="Remove example" onClick={() => removeExample(i)}><X size={17} /></button>
            ) : null}
          </div>
        ))}
        <button type="button" className="mc-add-example" onClick={addExample}><Plus size={16} /> Add another example</button>

        <hr className="mc-hr" />

        <label className="mc-field-label">How much does this matter to you? <span className="mc-sub">(1 to 5)</span></label>
        <ImportancePicker value={a.importance} onChange={(v) => setAnswer({ ...a, importance: v })} />

        <label className="mc-field-label mc-label--26">How often would you practice this? <span className="mc-sub">(you decide)</span></label>
        <FrequencyPicker value={a.frequency} onChange={(v) => setAnswer({ ...a, frequency: v })} />

        <label className="mc-field-label mc-label--26">Where do you stand?</label>
        <StancePicker value={a.stance} onChange={(v) => setAnswer({ ...a, stance: v })} />
        {a.stance === "other" ? (
          <GrowArea className="mc-comment mc-grow" placeholder="Tell us more about where you stand." value={a.otherNote || ""}
            onChange={(e) => setAnswer({ ...a, otherNote: e.target.value })} />
        ) : null}
      </div>

      <div className="mc-nav-row">
        <button className="mc-btn mc-btn--ghost mc-btn--sm" onClick={onBack}><ArrowLeft size={16} /> Back</button>
        <button className="mc-btn mc-btn--cta" disabled={!canAdvance} onClick={onNext}>
          {canAdvance ? "Next" : "Rate and choose first"} <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}

// Sections 2 and 3: entirely open. The couple writes their own items;
// we suggest nothing. Each item carries the same rating controls.
function OpenSectionScreen({ section, items, setItems, onNext, onBack }: {
  section: "nice-to-have" | "challenge"; items: CustomItem[];
  setItems: (items: CustomItem[]) => void; onNext: () => void; onBack: () => void;
}) {
  const meta = SECTIONS[section];
  const mine = items.filter((it) => it.section === section);

  function add() {
    // Server caps the send at 60 answers total (9 passages + own items).
    // 20 per open section keeps the worst case at 49, so the UI can never
    // build a payload the API rejects.
    if (mine.length >= 20) return;
    setItems([...items, {
      id: section + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
      section, title: "", importance: null, frequency: null, stance: null, comment: "",
    }]);
  }
  function update(id: string, patch: Partial<CustomItem>) {
    setItems(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }
  function remove(id: string) { setItems(items.filter((it) => it.id !== id)); }

  return (
    <div className="mc-screen mc-col">
      <div className="mc-card mc-center mc-open-head">
        <div className={"mc-medallion mc-medallion--" + SECTION_CLS[section]}>{SECTION_ICON[section]}</div>
        <span className="mc-overline">Section {meta.n} of 3</span>
        <h2 className="mc-display mc-d-lg mc-h-gap">{meta.label}</h2>
        <p className="mc-lede mc-mt-16 mc-maxw-460">{meta.blurb}</p>
      </div>

      {mine.map((it, i) => (
        <div className="mc-card mc-open-item" key={it.id}>
          <div className="mc-item-head">
            <span className="mc-role-tag">Your {meta.short} {i + 1}</span>
            <button className="mc-btn mc-btn--ghost mc-btn--sm mc-btn--remove" onClick={() => remove(it.id)}>Remove</button>
          </div>
          <GrowArea className="mc-input mc-h-gap-12 mc-grow" placeholder={meta.placeholder}
            value={it.title} onChange={(e) => update(it.id, { title: e.target.value })} />

          <label className="mc-field-label mc-label--22">How much does this matter to you? <span className="mc-sub">(1 to 5)</span></label>
          <ImportancePicker value={it.importance} onChange={(v) => update(it.id, { importance: v })} />

          <label className="mc-field-label mc-label--22">How often would you practice this? <span className="mc-sub">(you decide)</span></label>
          <FrequencyPicker value={it.frequency} onChange={(v) => update(it.id, { frequency: v })} />

          <label className="mc-field-label mc-label--22">Where do you stand?</label>
          <StancePicker value={it.stance} onChange={(v) => update(it.id, { stance: v })} />
          {it.stance === "other" ? (
            <GrowArea className="mc-comment mc-grow" placeholder="Tell us more about where you stand." value={it.otherNote || ""}
              onChange={(e) => update(it.id, { otherNote: e.target.value })} />
          ) : null}

          <label className="mc-field-label mc-label--22">Your notes <span className="mc-sub">(optional)</span></label>
          <GrowArea className="mc-comment mc-comment--flush mc-grow" placeholder="In your own words."
            value={it.comment || ""} onChange={(e) => update(it.id, { comment: e.target.value })} />
        </div>
      ))}

      <button className="mc-btn mc-btn--ghost mc-w-full mc-mt-16" onClick={add}>
        <Plus size={18} /> Add {mine.length === 0 ? "your first" : "another"}
      </button>

      <div className="mc-nav-row">
        <button className="mc-btn mc-btn--ghost mc-btn--sm" onClick={onBack}><ArrowLeft size={16} /> Back</button>
        <button className="mc-btn mc-btn--cta" onClick={onNext}>
          {section === "challenge" ? "See your summary" : "Continue"} <ArrowRight size={18} />
        </button>
      </div>
      {mine.length === 0 ? <p className="mc-hint mc-center mc-mt-16">This section is optional. Add your own, or continue.</p> : null}
    </div>
  );
}

function SummaryScreen({ rated, role, onNext, onBack }: {
  rated: RatedItem[]; role: Role | null; onNext: () => void; onBack: () => void;
}) {
  const top = rated.slice(0, 6);
  return (
    <div className="mc-screen mc-col">
      <div className="mc-center mc-summary-intro">
        <span className="mc-overline">Your summary</span>
        <h2 className="mc-display mc-d-lg mc-h-gap">What matters most to you</h2>
        <p className="mc-lede mc-mt-16 mc-lede--16">These are the items you rated highest. This is the card your spouse will receive.</p>
      </div>

      <div className="mc-summary-card">
        <div className="mc-summary-mark" aria-hidden>
          <LogoMark size={150} decorative />
        </div>
        <div className="mc-summary-head">
          <Logo variant="horizontal" forceTheme="light" height={22} />
        </div>
        <div className="mc-summary-caption">
          Marriage checklist, your top priorities{role ? " · completed as the " + role : ""}
        </div>

        <div className="mc-summary-list">
          {top.length === 0 ? <div className="mc-summary-empty">Go back and rate a few items to build your summary.</div> : null}
          {top.map((r, i) => {
            const exs = (r.examples || []).map((s) => (s || "").trim()).filter(Boolean);
            return (
              <div className="mc-summary-row" key={r.id}>
                <div className="mc-summary-rank">{i + 1}</div>
                <div className="mc-flex-1">
                  <div className="mc-summary-title">{("ref" in r && r.ref) || ("title" in r && r.title)}</div>
                  <div className="mc-summary-sub">
                    {SECTIONS[r.section].label}
                    {r.section === "biblical" && role ? " · " + (role === "husband" ? "Husband" : "Wife") : ""}
                    {r.frequency ? " · " + FREQ_LABEL[r.frequency] : ""}
                  </div>
                  {"text" in r && r.text ? <div className="mc-summary-sub mc-summary-sub--4">{r.text}</div> : null}
                  {r.comment ? <div className="mc-summary-sub mc-summary-sub--quote">&ldquo;{r.comment}&rdquo;</div> : null}
                  {r.stance === "other" && r.otherNote ? <div className="mc-summary-sub mc-summary-sub--4">Other: {r.otherNote}</div> : null}
                  {exs.length > 0 ? <div className="mc-summary-sub mc-summary-sub--4">How: {exs.join("; ")}</div> : null}
                  <div className="mc-imp-mini mc-summary-dots">
                    {[1, 2, 3, 4, 5].map((n) => <i key={n} className={n <= (r.importance || 0) ? "mc-on" : ""} />)}
                  </div>
                </div>
                {r.stance ? <span className={"mc-summary-stance mc-st-" + r.stance}>{STANCE_LABEL[r.stance]}</span> : null}
              </div>
            );
          })}
        </div>
      </div>

      <p className="mc-hint mc-center mc-mt-16">{rated.length} item{rated.length === 1 ? "" : "s"} rated. Showing your top {top.length}.</p>

      <div className="mc-nav-row">
        <button className="mc-btn mc-btn--ghost mc-btn--sm" onClick={onBack}><ArrowLeft size={16} /> Back</button>
        <button className="mc-btn mc-btn--cta" onClick={onNext}>Send to us both <ArrowRight size={18} /></button>
      </div>
    </div>
  );
}

/* -------------------------- OTP gate + send -------------------------- */

function GateScreen({ rated, role, onDone, onBack }: {
  rated: RatedItem[]; role: Role | null;
  onDone: (info: { email: string; spouse: string }) => void; onBack: () => void;
}) {
  const [phase, setPhase] = useState<"email" | "code" | "spouse">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [spouse, setSpouse] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const cellRefs = useRef<Array<HTMLInputElement | null>>([]);
  const antibotRef = useRef<AntibotHandle>(null);

  const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

  async function sendCode() {
    setErr("");
    if (!validEmail(email)) { setErr("Please enter a valid email address."); return; }
    setBusy(true);
    try {
      await requestEmailOtp(email.trim(), antibotRef.current?.payload() ?? {});
      antibotRef.current?.reset();
      setPhase("code");
      setTimeout(() => cellRefs.current[0]?.focus(), 50);
    } catch {
      setErr("We could not send your code. Please try again in a moment.");
    } finally {
      setBusy(false);
    }
  }
  function onCell(i: number, v: string) {
    v = v.replace(/\D/g, "").slice(-1);
    const next = [...code]; next[i] = v; setCode(next);
    if (v && i < 5) cellRefs.current[i + 1]?.focus();
  }
  function onCellKey(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !code[i] && i > 0) cellRefs.current[i - 1]?.focus();
  }
  async function verify() {
    setErr("");
    const otp = code.join("");
    if (otp.length < 6) { setErr("Enter the 6-digit code we sent you."); return; }
    setBusy(true);
    try {
      await checkOtp(email.trim(), otp, { source: "marriage_checklist" });
      setPhase("spouse");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setErr("That code did not match. Try again.");
      else if (e instanceof ApiError && e.status === 429) setErr("Too many attempts. Try again in a few minutes.");
      else setErr("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function send() {
    setErr("");
    if (!validEmail(spouse)) { setErr("Please enter a valid email for your spouse."); return; }
    if (rated.length === 0) { setErr("Go back and rate at least one item first."); return; }
    setBusy(true);
    try {
      await sendChecklistResults(spouse.trim(), role, toSendAnswers(rated));
      onDone({ email: email.trim(), spouse: spouse.trim() });
    } catch {
      setErr("We could not send your summary. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mc-screen mc-col">
      <AntibotFields ref={antibotRef} />
      <div className="mc-card">
        <span className="mc-overline">Almost there</span>

        {phase === "email" ? (
          <div>
            <h2 className="mc-display mc-d-md mc-h-gap">Where should we send it?</h2>
            <p className="mc-lede mc-mt-16 mc-lede--16">
              Enter your email and we will send a one-time code to confirm it is you. This creates a free Ahavah account, no matchmaking profile required.
            </p>
            <label className="mc-field-label mc-mt-24">Your email</label>
            <input className="mc-input" type="email" placeholder="you@example.com" autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendCode()} />
            {err ? <div className="mc-field-err">{err}</div> : null}
            <button className="mc-btn mc-btn--cta mc-mt-24 mc-w-full" disabled={busy} onClick={sendCode}>
              {busy ? "Sending code..." : "Send my code"} {!busy ? <Mail size={18} /> : null}
            </button>
            <div className="mc-notice mc-mt-16">
              <ShieldCheck size={18} />
              <div>You join as an activity guest, kept separate from the matchmaking pool. We do not add you to any dating emails.</div>
            </div>
          </div>
        ) : null}

        {phase === "code" ? (
          <div>
            <h2 className="mc-display mc-d-md mc-h-gap">Enter your code</h2>
            <p className="mc-lede mc-mt-16 mc-lede--16">We sent a 6-digit code to <strong className="mc-strong">{email}</strong>. Enter it below.</p>
            <div className="mc-code-row mc-mt-24">
              {code.map((c, i) => (
                <input key={i} ref={(el) => { cellRefs.current[i] = el; }} className="mc-code-cell"
                  inputMode="numeric" maxLength={1} value={c}
                  onChange={(e) => onCell(i, e.target.value)} onKeyDown={(e) => onCellKey(i, e)} />
              ))}
            </div>
            {err ? <div className="mc-field-err">{err}</div> : null}
            <button className="mc-btn mc-btn--cta mc-mt-24 mc-w-full" disabled={busy} onClick={verify}>
              {busy ? "Verifying..." : "Verify and continue"} {!busy ? <ArrowRight size={18} /> : null}
            </button>
            <p className="mc-hint mc-center mc-mt-16">
              Did not get it?{" "}
              <a href="#" onClick={(e) => { e.preventDefault(); setCode(["", "", "", "", "", ""]); setPhase("email"); }}>Use a different email</a>.
            </p>
          </div>
        ) : null}

        {phase === "spouse" ? (
          <div>
            <div className="mc-confirm-row">
              <Check size={18} /> Email confirmed
            </div>
            <h2 className="mc-display mc-d-md mc-h-gap-12">Send it to your spouse</h2>
            <p className="mc-lede mc-mt-16 mc-lede--16">
              Add your spouse&apos;s email. We will send the same summary to you both, so it is easy to compare and talk it through.
            </p>
            <label className="mc-field-label mc-mt-24">Spouse&apos;s email</label>
            <input className="mc-input" type="email" placeholder="spouse@example.com" autoComplete="off"
              value={spouse} onChange={(e) => setSpouse(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
            {err ? <div className="mc-field-err">{err}</div> : null}
            <button className="mc-btn mc-btn--cta mc-mt-24 mc-w-full" disabled={busy} onClick={send}>
              {busy ? "Sending your summary..." : "Send to us both"} {!busy ? <Share2 size={18} /> : null}
            </button>
            <p className="mc-hint mc-center mc-mt-16">Once sent, your answers are cleared from this page.</p>
          </div>
        ) : null}
      </div>

      {phase === "email" ? (
        <div className="mc-nav-row mc-nav-row--center">
          <button className="mc-btn mc-btn--ghost mc-btn--sm" onClick={onBack}><ArrowLeft size={16} /> Back to summary</button>
        </div>
      ) : null}
    </div>
  );
}

function DoneScreen({ sentTo, onRestart }: {
  sentTo: { email: string; spouse: string }; onRestart: () => void;
}) {
  return (
    <div className="mc-screen mc-col">
      <div className="mc-card mc-center">
        <div className="mc-done-mark"><Check size={44} strokeWidth={3} /></div>
        <h2 className="mc-display mc-d-lg">Sent<span className="mc-lime-dot">.</span></h2>
        <p className="mc-lede mc-mt-16 mc-maxw-420">
          Your summary is on its way to <strong className="mc-strong">{sentTo.email}</strong> and <strong className="mc-strong">{sentTo.spouse}</strong>. Your answers have been cleared from this page.
        </p>
        <div className="mc-notice mc-mt-24">
          <ShieldCheck size={18} />
          <div>Nothing was stored. We composed your email and then discarded your responses.</div>
        </div>
      </div>

      <div className="mc-card mc-share-card mc-mt-24">
        <span className="mc-overline">Pass it on</span>
        <h3 className="mc-share-title">
          Know someone seeking a Torah-observant spouse?
        </h3>
        <p className="mc-share-body">
          Ahavah helps observant singles find a partner across borders. Share it with someone it could serve.
        </p>
        <div className="mc-share-actions">
          <a className="mc-btn mc-btn--cta mc-btn--sm mc-btn--share" href="https://ahavah.app/">Share Ahavah <Share2 size={16} /></a>
          <button className="mc-btn mc-btn--sm mc-btn--glass" onClick={onRestart}>Take it again</button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------- app / stepper -------------------------- */

type Persisted = {
  idx?: number;
  role?: Role | null;
  answers?: Record<string, PassageAnswer>;
  custom?: CustomItem[];
};

export function ChecklistClient() {
  const [idx, setIdx] = useState(0);
  const [role, setRole] = useState<Role | null>(null);
  const [answers, setAnswers] = useState<Record<string, PassageAnswer>>({});
  const [custom, setCustom] = useState<CustomItem[]>([]);
  const [sentTo, setSentTo] = useState<{ email: string; spouse: string } | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Restore mid-session progress from localStorage (client-only; nothing
  // leaves the browser). Deferred to an effect so SSR markup stays stable.
  useEffect(() => {
    // Deferred to a frame so we never setState synchronously in the effect
    // body (react-hooks/set-state-in-effect) and SSR markup stays stable.
    const raf = requestAnimationFrame(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(STORE) || "{}") as Persisted;
        if (saved.role === "husband" || saved.role === "wife") setRole(saved.role);
        if (saved.answers) setAnswers(saved.answers);
        if (saved.custom) setCustom(saved.custom);
        if (typeof saved.idx === "number") setIdx(saved.idx);
      } catch { /* fresh start */ }
      setHydrated(true);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const SCREENS = useMemo(() => buildScreens(role), [role]);
  const TOTAL_PASSAGES = useMemo(() => SCREENS.filter((s) => s.type === "obligation").length, [SCREENS]);

  // Persist progress locally so a refresh mid-session keeps your place.
  // Never on the done screen: onDone clears the store, and re-writing it
  // here would resurrect it (and a reload would land on a hollow "Sent"
  // screen instead of a fresh start).
  useEffect(() => {
    if (!hydrated) return;
    if (SCREENS[Math.min(idx, SCREENS.length - 1)]?.type === "done") return;
    try { localStorage.setItem(STORE, JSON.stringify({ idx, role, answers, custom })); } catch { /* private mode */ }
  }, [idx, role, answers, custom, hydrated, SCREENS]);

  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [idx]);

  const screen = SCREENS[Math.min(idx, SCREENS.length - 1)];
  const go = (d: number) => setIdx((i) => Math.max(0, Math.min(SCREENS.length - 1, i + d)));
  const rated = useMemo(() => computeRated(answers, custom), [answers, custom]);

  const obNumber = useMemo(() => {
    let count = 0;
    for (let i = 0; i <= idx && i < SCREENS.length; i++) if (SCREENS[i].type === "obligation") count++;
    return count;
  }, [idx, SCREENS]);
  const showProgress = ["section", "obligation", "open"].includes(screen.type);
  const summaryIdx = useMemo(() => SCREENS.findIndex((s) => s.type === "summary"), [SCREENS]);
  const pct = summaryIdx > 0 ? Math.min(100, Math.round((idx / summaryIdx) * 100)) : 0;
  const sectionOfScreen: Section | undefined =
    screen.type === "section" || screen.type === "open" ? screen.section : screen.type === "obligation" ? "biblical" : undefined;
  const sectionLabel = sectionOfScreen ? SECTIONS[sectionOfScreen].label : "";
  const rightLabel = screen.type === "obligation" ? "Passage " + obNumber + " of " + TOTAL_PASSAGES
    : screen.type === "open" ? "Your own" : "Getting started";

  function restart() {
    setAnswers({}); setCustom([]); setSentTo(null); setRole(null); setIdx(0);
    try { localStorage.removeItem(STORE); } catch { /* private mode */ }
  }

  let body: React.ReactNode = null;
  if (screen.type === "intro") body = <IntroScreen onStart={() => go(1)} />;
  else if (screen.type === "section") body = <SectionScreen role={role} setRole={setRole} onNext={() => go(1)} onBack={() => go(-1)} />;
  else if (screen.type === "obligation") {
    const passage = PASSAGES.find((p) => p.id === screen.id)!;
    body = <ObligationScreen passage={passage} role={role} answer={answers[passage.id]}
      setAnswer={(a) => setAnswers((prev) => ({ ...prev, [passage.id]: a }))}
      onNext={() => go(1)} onBack={() => go(-1)} />;
  }
  else if (screen.type === "open") body = <OpenSectionScreen section={screen.section} items={custom} setItems={setCustom} onNext={() => go(1)} onBack={() => go(-1)} />;
  else if (screen.type === "summary") body = <SummaryScreen rated={rated} role={role} onNext={() => go(1)} onBack={() => go(-1)} />;
  else if (screen.type === "gate") body = <GateScreen rated={rated} role={role}
    onDone={(info) => {
      setSentTo(info); setAnswers({}); setCustom([]);
      try { localStorage.removeItem(STORE); } catch { /* private mode */ }
      go(1);
    }} onBack={() => go(-1)} />;
  else if (screen.type === "done") body = <DoneScreen sentTo={sentTo || { email: "you", spouse: "your spouse" }} onRestart={restart} />;

  return (
    <div className="mc">
      <header className="mc-nav">
        <div className="mc-nav__inner">
          <a href="https://ahavah.app/" aria-label="Ahavah home"><Logo variant="horizontal" forceTheme="light" height={30} /></a>
          <span className="mc-nav__note"><ShieldCheck size={15} /><span>Answers never stored</span></span>
        </div>
      </header>

      {showProgress ? (
        <div className="mc-progress">
          <div className="mc-progress__track">
            <div
              className="mc-progress__fill"
              style={{ "--mc-fill": pct + "%" } as React.CSSProperties}
            />
          </div>
          <div className="mc-progress__meta">
            <span>{sectionLabel}</span>
            <span>{rightLabel}</span>
          </div>
        </div>
      ) : null}

      <main className="mc-stage">{body}</main>

      <footer className="mc-footer-mini">
        A free resource from <a href="https://ahavah.app/">Ahavah</a>. Find a Torah-observant spouse across borders.
      </footer>
    </div>
  );
}

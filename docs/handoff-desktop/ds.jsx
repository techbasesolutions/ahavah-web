/* eslint-disable react/no-unknown-property */
/* Ahavah design-system showcase artboards — themed via CSS variables
   in tokens.css. Drop a <ThemedRoot theme="light|dark"> around any
   subtree to flip surfaces / ink / chrome wholesale. Brand colors
   (lime / lavender / pink / indigo / tier colors) are immutable. */
(function(){
const { Icon } = window;

const SPARKLE_D =
  "M50 5 C50 30 70 50 95 50 C70 50 50 70 50 95 C50 70 30 50 5 50 C30 50 50 30 50 5 Z";

function Sparkle({ size = 56, color = "#D7FF81" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <path d={SPARKLE_D} fill={color} />
    </svg>
  );
}
function SparkleTile({ size = 56, tileColor = "#1A1340", sparkleColor = "#D7FF81" }) {
  return (
    <div style={{
      width: size, height: size, background: tileColor,
      borderRadius: Math.round(size * 0.22),
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <Sparkle size={Math.round(size * 0.62)} color={sparkleColor} />
    </div>
  );
}
function BrandMark({ size = "md", wordColor = "var(--ink)" }) {
  const cfg = { sm:{tile:24,word:18,gap:6}, md:{tile:36,word:28,gap:10},
                lg:{tile:56,word:44,gap:14}, xl:{tile:96,word:72,gap:22} }[size];
  return (
    <div style={{display:"flex",alignItems:"center",gap:cfg.gap}}>
      <SparkleTile size={cfg.tile} />
      <span style={{
        fontSize: cfg.word, lineHeight: `${cfg.word*1.05}px`,
        fontWeight: 700, letterSpacing: "-0.03em", color: wordColor,
      }}>ahavah</span>
    </div>
  );
}

/* ThemedRoot — applies data-theme so all child components inherit the
   matching CSS-variable values. Pure surface; lays no other style. */
function ThemedRoot({ theme = "dark", style, children }) {
  return (
    <div data-theme={theme} style={{
      width:"100%", height:"100%", background:"var(--app)", color:"var(--ink)",
      ...style,
    }}>{children}</div>
  );
}

window.Sparkle = Sparkle;
window.SparkleTile = SparkleTile;
window.BrandMark = BrandMark;
window.ThemedRoot = ThemedRoot;

/* ============================================================== */
/* Frame — themed dark/light surface for design-system artboards.  */
/* ============================================================== */
function Frame({ title, children, pad = 28 }) {
  return (
    <div style={{
      width:"100%", height:"100%",
      background:"var(--app)", color:"var(--ink)",
      padding: pad, boxSizing:"border-box", overflow:"hidden",
      display:"flex", flexDirection:"column", gap: 20,
    }}>
      {title ? (
        <div className="t-overline" style={{color:"var(--ink-2)"}}>{title}</div>
      ) : null}
      {children}
    </div>
  );
}

/* ============================================================== */
/* 1 — Brand mark                                                  */
/* ============================================================== */
function BrandArtboard() {
  return (
    <Frame title="Brand mark">
      <div style={{flex:1, display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"center", gap: 36}}>
        <BrandMark size="xl" />
        <div style={{display:"flex", alignItems:"flex-end", gap:36}}>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
            <SparkleTile size={88} />
            <div className="t-caption" style={{color:"var(--ink-3)"}}>App icon</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
            <Sparkle size={88} color="#D7FF81" />
            <div className="t-caption" style={{color:"var(--ink-3)"}}>Sparkle, lime</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
            <Sparkle size={88} color="#FF4566" />
            <div className="t-caption" style={{color:"var(--ink-3)"}}>Sparkle, pink</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
            <Sparkle size={88} color="#BC96FF" />
            <div className="t-caption" style={{color:"var(--ink-3)"}}>Sparkle, lavender</div>
          </div>
        </div>
      </div>
      <div className="t-caption" style={{color:"var(--ink-3)"}}>
        The 4-point sparkle is the one bespoke SVG owned by the brand. Wordmark is lowercase Plus Jakarta Sans, 700, −0.03em. Indigo tile stays in both themes — the lockup IS the logo.
      </div>
    </Frame>
  );
}

/* ============================================================== */
/* 2 — Color palette                                               */
/* ============================================================== */
function Swatch({ name, value, css, fg = "#000", note }) {
  return (
    <div style={{
      background: css, color: fg, borderRadius: 18, padding: 18,
      minHeight: 132, display:"flex", flexDirection:"column", justifyContent:"space-between",
      border: "1px solid var(--hairline)",
    }}>
      <div className="t-body-s">{name}</div>
      <div style={{display:"flex",flexDirection:"column",gap:2}}>
        <div className="t-caption" style={{opacity:0.85, fontFamily:"ui-monospace, SFMono-Regular, Menlo, monospace"}}>{value}</div>
        {note ? <div className="t-caption" style={{opacity:0.75}}>{note}</div> : null}
      </div>
    </div>
  );
}
function ColorArtboard() {
  return (
    <Frame title="Palette">
      <div style={{display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:14}}>
        <Swatch name="Indigo" value="#5524F5" css="var(--indigo)" fg="#fff" note="Persian Indigo" />
        <Swatch name="Lime"   value="#D7FF81" css="var(--lime)"   note="Mindaro — primary CTA" />
        <Swatch name="Lavender" value="#BC96FF" css="var(--lavender)" note="brand accent" />
        <Swatch name="Pink"   value="#FF4566" css="var(--pink)"   note="action / danger" />
        <Swatch name="App bg"   value="#1A1340 / #FBF9F4" css="var(--app)"   fg="var(--ink)" note="phone background (themes)" />
        <Swatch name="Card"     value="#0F0B1F / #FFFFFF" css="var(--card)"  fg="var(--ink)" note="elevated surface (themes)" />
        <Swatch name="Ink"      value="#fff / #0F0B1F" css="var(--ink)" fg="var(--app)" note="text primary (themes)" />
        <Swatch name="Ink·2"    value="text-secondary"  css="var(--ink-2)" fg="var(--card)" note="themes" />
      </div>
      <div style={{display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:14}}>
        <Swatch name="Bronze" value="#CD7F32" css="var(--bronze)" />
        <Swatch name="Silver" value="#C0C0C0" css="var(--silver)" />
        <Swatch name="Gold"   value="#FFD700" css="var(--gold)" />
        <Swatch name="Success" value="#9FE870" css="var(--success)" note="online dot" />
      </div>
      <div className="t-caption" style={{color:"var(--ink-3)"}}>
        Lime / lavender / pink pair with text-black only — white on these brand fills fails AA. Tier colors (bronze/silver/gold) likewise pair with black. Brand colors stay vivid in both themes.
      </div>
    </Frame>
  );
}

/* ============================================================== */
/* 3 — Typography                                                  */
/* ============================================================== */
function TypeRow({ label, sample, cls, meta }) {
  return (
    <div style={{display:"grid", gridTemplateColumns:"110px 1fr 220px", alignItems:"baseline", gap:18, padding:"14px 0", borderTop:"1px solid var(--hairline)"}}>
      <div className="t-overline" style={{color:"var(--ink-3)"}}>{label}</div>
      <div className={cls} style={{color:"var(--ink)"}}>{sample}</div>
      <div className="t-caption" style={{color:"var(--ink-3)", fontFamily:"ui-monospace, SFMono-Regular, Menlo, monospace"}}>{meta}</div>
    </div>
  );
}
function TypeArtboard() {
  return (
    <Frame title="Type — Plus Jakarta Sans">
      <div style={{display:"flex", flexDirection:"column"}}>
        <TypeRow label="Display"  cls="t-display"  sample="Find love." meta="30 / 1.1 / -0.02em / 800" />
        <TypeRow label="H1"       cls="t-h1"       sample="It’s a match!" meta="24 / 1.2 / -0.015em / 800" />
        <TypeRow label="H2"       cls="t-h2"       sample="Get verified" meta="20 / 1.25 / -0.01em / 700" />
        <TypeRow label="H3"       cls="t-h3"       sample="Bronze · Profile verified" meta="18 / 1.3 / 700" />
        <TypeRow label="Body"     cls="t-body"     sample="Connect with people from anywhere, in any language." meta="16 / 1.5 / 400" />
        <TypeRow label="Body·str" cls="t-body-s"   sample="Continue $34.99" meta="16 / 1.5 / 600" />
        <TypeRow label="Meta"     cls="t-meta"     sample="Say hi to your match" meta="14 / 1.45 / 400" />
        <TypeRow label="Caption"  cls="t-caption"  sample="Photos, bio, basics" meta="12 / 1.4 / 400" />
        <TypeRow label="Overline" cls="t-overline" sample="Best value" meta="11 / 1.3 / 0.08em / 700" />
      </div>
    </Frame>
  );
}

/* ============================================================== */
/* 4 — Buttons                                                     */
/* ============================================================== */
function PrimaryBtn({ children, tone = "cta", lift = "float", full = true, size = "cta" }) {
  const tones = {
    cta:      { bg:"var(--lime)",       fg:"var(--cta-ink, #000)", border:"transparent" },
    brand:    { bg:"var(--lavender)",   fg:"#000", border:"transparent" },
    action:   { bg:"var(--pink)",       fg:"#000", border:"transparent" },
    elevated: { bg:"var(--card)",       fg:"var(--ink)", border:"var(--hairline)" },
    dark:     { bg:"var(--ink)",        fg:"var(--app)", border:"transparent" },
    outline:  { bg:"transparent",       fg:"var(--ink)", border:"var(--border)" },
  };
  const t = tones[tone];
  const sizes = {
    cta: { h: 56, px: 24, radius: 16, font: "16px", weight: 700 },
    tap: { h: 44, px: 16, radius: 12, font: "14px", weight: 600 },
  };
  const s = sizes[size];
  return (
    <button style={{
      height: s.h, width: full ? "100%" : "auto",
      paddingInline: s.px, borderRadius: s.radius,
      border: `1px solid ${t.border}`, background: t.bg, color: t.fg,
      fontSize: s.font, fontWeight: s.weight, letterSpacing: "-0.005em",
      boxShadow: lift === "float" ? "var(--shadow-cta)" : "none",
      display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8,
      cursor: "default",
    }}>{children}</button>
  );
}
function CircleBtn({ tone = "cta", size = 48, children }) {
  const tones = {
    cta:    { bg:"var(--lime)",     fg:"var(--cta-ink, #000)" },
    brand:  { bg:"var(--lavender)", fg:"#000" },
    action: { bg:"var(--pink)",     fg:"#fff" },
    overlay:{ bg:"rgba(0,0,0,0.45)",fg:"#fff" },
    elev:   { bg:"var(--card)",     fg:"var(--ink)" },
  };
  const t = tones[tone];
  return (
    <div style={{
      width:size, height:size, borderRadius:"50%",
      background:t.bg, color:t.fg,
      display:"flex", alignItems:"center", justifyContent:"center",
      boxShadow:"var(--shadow-cta)",
    }}>{children}</div>
  );
}

function ButtonArtboard() {
  return (
    <Frame title="Buttons">
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:18}}>
        <div style={{display:"flex", flexDirection:"column", gap:14}}>
          <div className="t-caption" style={{color:"var(--ink-3)"}}>Primary CTA · 56px lime</div>
          <PrimaryBtn tone="cta"><Icon name="sparkles" size={18}/> Upgrade to Premium</PrimaryBtn>
          <div className="t-caption" style={{color:"var(--ink-3)", marginTop:6}}>Brand · lavender</div>
          <PrimaryBtn tone="brand">Continue</PrimaryBtn>
          <div className="t-caption" style={{color:"var(--ink-3)", marginTop:6}}>Action · pink</div>
          <PrimaryBtn tone="action">Send</PrimaryBtn>
          <div className="t-caption" style={{color:"var(--ink-3)", marginTop:6}}>Outline subtle</div>
          <PrimaryBtn tone="outline">View profile</PrimaryBtn>
        </div>
        <div style={{display:"flex", flexDirection:"column", gap:14}}>
          <div className="t-caption" style={{color:"var(--ink-3)"}}>Circle action stack (Discover)</div>
          <div style={{display:"flex", alignItems:"center", justifyContent:"center", gap:20, padding:"6px 0"}}>
            <CircleBtn tone="brand" size={48}><Icon name="x" size={20} color="#000" strokeWidth={2.4}/></CircleBtn>
            <CircleBtn tone="cta"   size={56}><Icon name="play" size={22} color="#000" fill="#000"/></CircleBtn>
            <CircleBtn tone="action"size={48}><Icon name="heart" size={20} color="#fff" fill="#fff"/></CircleBtn>
          </div>
          <div className="t-caption" style={{color:"var(--ink-3)", marginTop:6}}>Tap pills (44px, lavender outline)</div>
          <div style={{display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:8}}>
            {["@gmail.com","@proton.me","@yahoo.com","@hotmail.com","@outlook.com"].map(s => (
              <div key={s} style={{
                height:44, borderRadius:12, border:"1px solid rgba(188,150,255,0.4)",
                color:"var(--lavender)", display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:14, fontWeight:500,
              }}>{s}</div>
            ))}
          </div>
        </div>
      </div>
    </Frame>
  );
}

/* ============================================================== */
/* 5 — Pills, icon badges, cards                                   */
/* ============================================================== */
function Pill({ children, variant = "lime" }) {
  const variants = {
    lime:     { bg:"var(--lime)",     fg:"#000" },
    lavender: { bg:"var(--lavender)", fg:"#000" },
    pink:     { bg:"var(--pink)",     fg:"#000" },
    success:  { bg:"var(--success)",  fg:"#000" },
    glassDark:{ bg:"var(--pill-glass)", fg:"var(--pill-glass-ink)", border:"var(--pill-glass-border)" },
    lavOutline:{bg:"transparent",     fg:"var(--lavender)", border:"var(--lavender)"},
  };
  const v = variants[variant];
  return (
    <span style={{
      height:24, padding:"0 10px", borderRadius:999,
      background: v.bg, color: v.fg,
      border: v.border ? `1px solid ${v.border}` : "1px solid transparent",
      fontSize:12, fontWeight:700, letterSpacing:"-0.005em",
      display:"inline-flex", alignItems:"center", gap:4,
      backdropFilter: variant === "glassDark" ? "blur(8px)" : undefined,
    }}>{children}</span>
  );
}
function IconBadgeBox({ tone = "brand", size = 36, shape = "square", children }) {
  const tones = {
    brand: { bg:"color-mix(in oklch, var(--lavender) 14%, transparent)", fg:"var(--lavender)" },
    success:{bg:"color-mix(in oklch, var(--success) 14%, transparent)", fg:"var(--success)" },
    destructive:{bg:"color-mix(in oklch, var(--pink) 14%, transparent)", fg:"var(--pink)" },
    muted: { bg:"var(--hairline)", fg:"var(--ink-3)" },
    cta:   { bg:"var(--lime)", fg:"#000" },
    elev:  { bg:"var(--card)", fg:"var(--ink)" },
  };
  const t = tones[tone];
  return (
    <span style={{
      width:size, height:size,
      // flexShrink + aspectRatio guard against squashing when the badge
      // sits inside a flex row (e.g. paywall FeatureRow). Without these
      // the text content compresses the badge into an oval.
      flexShrink:0, aspectRatio:"1",
      borderRadius: shape === "circle" ? "50%" : size >= 48 ? 16 : 12,
      background: t.bg, color: t.fg,
      display:"inline-flex", alignItems:"center", justifyContent:"center",
    }}>{children}</span>
  );
}
function ComponentsArtboard() {
  return (
    <Frame title="Pills · icon badges · cards">
      <div style={{display:"flex", flexDirection:"column", gap:18}}>
        <div>
          <div className="t-caption" style={{color:"var(--ink-3)", marginBottom:10}}>Pills</div>
          <div style={{display:"flex", flexWrap:"wrap", gap:10}}>
            <Pill variant="lime">98%</Pill>
            <Pill variant="lavender">NEW</Pill>
            <Pill variant="pink">3 left</Pill>
            <Pill variant="success">Online</Pill>
            <Pill variant="lavOutline">Verified</Pill>
            <Pill variant="glassDark"><Icon name="shield" size={11}/> Bronze verified</Pill>
            <Pill variant="lime">POPULAR</Pill>
            <Pill variant="lime">BEST VALUE</Pill>
          </div>
        </div>
        <div>
          <div className="t-caption" style={{color:"var(--ink-3)", marginBottom:10}}>Icon badges</div>
          <div style={{display:"flex", alignItems:"center", gap:14}}>
            <IconBadgeBox tone="brand"><Icon name="userpen" size={16}/></IconBadgeBox>
            <IconBadgeBox tone="success"><Icon name="shield" size={16}/></IconBadgeBox>
            <IconBadgeBox tone="success"><Icon name="card" size={16}/></IconBadgeBox>
            <IconBadgeBox tone="muted"><Icon name="settings" size={16}/></IconBadgeBox>
            <IconBadgeBox tone="destructive"><Icon name="userx" size={16}/></IconBadgeBox>
            <IconBadgeBox tone="cta" shape="circle" size={28}><Icon name="check" size={14} color="#000" strokeWidth={3}/></IconBadgeBox>
          </div>
        </div>
        <div>
          <div className="t-caption" style={{color:"var(--ink-3)", marginBottom:10}}>Cards</div>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:14}}>
            <div style={{
              borderRadius:24, padding:18, color:"#fff",
              background:"linear-gradient(135deg,#5524F5 0%,#9F76EA 70%,#BC96FF 100%)",
            }}>
              <div className="t-overline" style={{opacity:0.8}}>Gradient hero</div>
              <div className="t-h2" style={{marginTop:6}}>Ehud, 30</div>
              <Pill variant="glassDark"><Icon name="shield" size={11} color="#fff"/> Bronze verified</Pill>
            </div>
            <div style={{
              borderRadius:24, padding:18, color:"var(--ink)",
              background:"var(--card)",
              boxShadow:"inset 0 0 0 1.5px var(--hairline)",
            }}>
              <div className="t-overline" style={{color:"var(--ink-3)"}}>Tier (inactive)</div>
              <div className="t-h3" style={{marginTop:6}}>Silver</div>
              <div className="t-caption" style={{color:"var(--ink-3)"}}>Liveness verified</div>
            </div>
          </div>
        </div>
      </div>
    </Frame>
  );
}

/* ============================================================== */
/* 6 — Inputs · spacing                                            */
/* ============================================================== */
function InputArtboard() {
  return (
    <Frame title="Inputs · sliders · spacing">
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:18}}>
        <div style={{display:"flex", flexDirection:"column", gap:12}}>
          <div className="t-caption" style={{color:"var(--ink-3)"}}>Single-line input · 56px</div>
          <div style={{
            height:56, borderRadius:16, background:"var(--card)",
            border:"1px solid var(--hairline)", padding:"0 18px",
            display:"flex", alignItems:"center", color:"var(--ink-3)", fontSize:16,
          }}>Enter your email to begin</div>
          <div style={{
            height:56, borderRadius:16, background:"var(--card)",
            border:"1px solid var(--hairline)", padding:"0 8px 0 18px",
            display:"flex", alignItems:"center", color:"var(--ink)", fontSize:16,
          }}>
            <span style={{flex:1, color:"var(--ink-3)"}}>Say hi…</span>
            <CircleBtn tone="cta" size={40}><Icon name="send" size={18} color="#000"/></CircleBtn>
          </div>
          <div className="t-caption" style={{color:"var(--ink-3)", marginTop:6}}>Choicebox</div>
          <div style={{
            borderRadius:18, border:"1.5px solid var(--lime)",
            background:"color-mix(in oklch, var(--lime) 8%, transparent)", padding:16,
            display:"flex", alignItems:"center", gap:14,
          }}>
            <div style={{
              width:22, height:22, borderRadius:"50%",
              background:"var(--lime)", display:"flex", alignItems:"center", justifyContent:"center",
            }}><Icon name="check" size={14} color="#000" strokeWidth={3}/></div>
            <div style={{flex:1}}>
              <div className="t-body-s" style={{display:"flex",alignItems:"center",gap:8}}>
                1 year <Pill variant="lime">BEST VALUE</Pill>
              </div>
              <div className="t-caption" style={{color:"var(--ink-3)"}}>$2.92 / month</div>
            </div>
            <div className="t-h3" style={{fontVariantNumeric:"tabular-nums"}}>$34.99</div>
          </div>
        </div>

        <div style={{display:"flex", flexDirection:"column", gap:12}}>
          <div className="t-caption" style={{color:"var(--ink-3)"}}>Touch targets</div>
          <div style={{display:"flex", gap:10, alignItems:"flex-end"}}>
            {[
              {h:44,l:"tap 44"},
              {h:48,l:"lg 48"},
              {h:56,l:"xl 56"},
              {h:64,l:"2xl 64"},
            ].map(({h,l}) => (
              <div key={l} style={{display:"flex", flexDirection:"column", alignItems:"center", gap:6}}>
                <div style={{
                  width:h, height:h, borderRadius:"50%",
                  background:"var(--lavender)", color:"#000",
                  fontSize:11, fontWeight:700,
                  display:"flex", alignItems:"center", justifyContent:"center",
                }}>{h}</div>
                <div className="t-caption" style={{color:"var(--ink-3)"}}>{l}</div>
              </div>
            ))}
          </div>
          <div className="t-caption" style={{color:"var(--ink-3)", marginTop:14}}>Radii</div>
          <div style={{display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:8}}>
            {[
              ["sm","9.6"],["md","12.8"],["lg","16"],["xl","22.4"],["2xl","28.8"],["3xl","35.2"],
            ].map(([k,v]) => (
              <div key={k} style={{
                aspectRatio:"1/1", background:"var(--hairline)",
                border:"1px solid var(--hairline)",
                borderRadius: `${v}px`,
                display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                color:"var(--ink-2)", fontSize:11,
              }}>
                <div className="t-overline">{k}</div>
                <div className="t-caption" style={{color:"var(--ink-3)"}}>{v}px</div>
              </div>
            ))}
          </div>
          <div className="t-caption" style={{color:"var(--ink-3)", marginTop:14}}>Shadows</div>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:14}}>
            <div style={{
              height:60, borderRadius:14, background:"var(--card)",
              boxShadow:"var(--shadow-soft)", display:"flex",
              alignItems:"center", justifyContent:"center", color:"var(--ink-2)", fontSize:12,
            }}>card-floating</div>
            <div style={{
              height:60, borderRadius:14, background:"var(--lime)", color:"#000",
              boxShadow:"var(--shadow-cta)", display:"flex",
              alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700,
            }}>float-cta</div>
          </div>
        </div>
      </div>
    </Frame>
  );
}

window.BrandArtboard = BrandArtboard;
window.ColorArtboard = ColorArtboard;
window.TypeArtboard = TypeArtboard;
window.ButtonArtboard = ButtonArtboard;
window.ComponentsArtboard = ComponentsArtboard;
window.InputArtboard = InputArtboard;
window.Pill = Pill;
window.IconBadgeBox = IconBadgeBox;
window.CircleBtn = CircleBtn;
window.PrimaryBtn = PrimaryBtn;
})();

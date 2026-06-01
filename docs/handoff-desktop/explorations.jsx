/* eslint-disable react/no-unknown-property */
/* Exploratory artboards: Match Celebration variants + Animations canvas.
   These sit alongside the production screen artboards as design forks. */
(function(){
const { Icon, Pill, CircleBtn, PrimaryBtn, BrandMark, Sparkle } = window;
const PHONE_W = window.PHONE_W;
const PHONE_H = window.PHONE_H;

const NAME_GRADIENTS = {
  Yael:    "linear-gradient(135deg,#5524F5 0%,#9F76EA 70%,#BC96FF 100%)",
  Ehud:    "linear-gradient(135deg,#5524F5 0%,#9F76EA 70%,#BC96FF 100%)",
  Daniel:  "linear-gradient(135deg,#1A1340 0%,#5524F5 100%)",
  Adina:   "linear-gradient(135deg,#FF4566 0%,#BC96FF 100%)",
  Default: "linear-gradient(135deg,#5524F5,#BC96FF)",
};
const g = (n) => NAME_GRADIENTS[n] ?? NAME_GRADIENTS.Default;

function PhoneShell({ children, label, statusBar = true }) {
  return (
    <div style={{
      width: PHONE_W, height: PHONE_H,
      background: "var(--app)", color: "var(--ink)",
      position:"relative", overflow:"hidden",
      fontFamily:"'Plus Jakarta Sans', system-ui, sans-serif",
      display:"flex", flexDirection:"column",
    }} aria-label={label}>
      {statusBar ? (
        <div data-statusbar style={{
          height:44, paddingInline:24, display:"flex", alignItems:"center", justifyContent:"space-between",
          fontSize:15, fontWeight:600, color:"var(--status)",
        }}>
          <span>9:41</span>
          <span style={{display:"inline-flex", alignItems:"center", gap:6}}>
            <span style={{display:"inline-flex", gap:2, alignItems:"flex-end"}}>
              {[6,8,10,12].map(h => <span key={h} style={{width:3, height:h, background:"var(--status)", borderRadius:1}}/>)}
            </span>
            <span style={{
              width:24, height:11, border:"1.4px solid var(--status)", borderRadius:3,
              position:"relative",
            }}>
              <span style={{position:"absolute", inset:1.5, background:"var(--status)", borderRadius:1.5, width:"75%"}}/>
            </span>
          </span>
        </div>
      ) : null}
      <div style={{flex:1, position:"relative", display:"flex", flexDirection:"column", minHeight:0}}>
        {children}
      </div>
    </div>
  );
}

/* ============================================================== */
/* MATCH CELEBRATION — Variant A · Newspaper headline               */
/* Typewriter front-page treatment. Treats the match as a story    */
/* breaking on the cream-paper page of an editorial broadsheet —   */
/* invigorating but reserved, plays well with the brand's              */
/* "Find love across borders." headline restraint.                    */
/* ============================================================== */
function MatchNewspaper() {
  return (
    <PhoneShell label="Match · Newspaper">
      <div style={{
        flex:1, margin:"12px", padding:"24px 22px",
        background:"#F5F1E8",
        backgroundImage:"radial-gradient(ellipse at 30% 20%, rgba(0,0,0,0.04), transparent 60%), radial-gradient(ellipse at 80% 90%, rgba(0,0,0,0.04), transparent 60%)",
        borderRadius:8, color:"#1a1410",
        boxShadow:"0 10px 30px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(0,0,0,0.08)",
        display:"flex", flexDirection:"column", overflow:"hidden",
      }}>
        {/* Masthead */}
        <div style={{
          borderTop:"3px solid #1a1410", borderBottom:"1px solid #1a1410",
          padding:"6px 0",
          display:"flex", justifyContent:"space-between", alignItems:"center",
          fontFamily:"'Times New Roman', Georgia, serif",
          fontSize:11, letterSpacing:"0.08em", textTransform:"uppercase",
        }}>
          <span>THE AHAVAH HERALD</span>
          <span>VOL. I · NO. 1</span>
        </div>
        {/* Hairline rule under masthead */}
        <div style={{borderTop:"1px solid #1a1410", marginTop:2}}/>

        {/* Headline */}
        <div style={{padding:"22px 0 8px", textAlign:"center"}}>
          <div style={{
            fontFamily:"'Times New Roman', Georgia, serif",
            fontSize:11, letterSpacing:"0.16em", textTransform:"uppercase",
            color:"#7a6855", paddingBottom:6,
          }}>Late Edition · Tuesday</div>
          <h1 style={{
            margin:0,
            fontFamily:"'Times New Roman', Georgia, serif",
            fontSize:44, lineHeight:1, fontWeight:900,
            letterSpacing:"-0.02em",
          }}>It's a Match.</h1>
          <div style={{
            marginTop:10, fontFamily:"'Times New Roman', Georgia, serif",
            fontStyle:"italic", fontSize:14, color:"#5c4f3d",
          }}>Two readers like each other. Coffee imminent.</div>
        </div>

        <div style={{borderTop:"1px solid #1a1410", margin:"4px 0 18px"}}/>

        {/* Photo pair — sepia-tinted polaroid look */}
        <div style={{display:"flex", gap:14, justifyContent:"center", padding:"0 4px"}}>
          {["Ehud","Yael"].map((n,i) => (
            <div key={n} style={{
              flex:1, aspectRatio:"3/4",
              background:g(n),
              border:"3px solid #1a1410",
              boxShadow:"0 2px 0 #1a1410",
              transform:`rotate(${i === 0 ? -1.5 : 1.5}deg)`,
              filter:"sepia(0.25) contrast(1.05)",
              position:"relative",
            }}>
              <div style={{
                position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
                color:"rgba(255,255,255,0.25)", fontSize:80, fontWeight:800,
              }}>{n[0]}</div>
              <div style={{
                position:"absolute", bottom:-22, left:0, right:0, textAlign:"center",
                fontFamily:"'Times New Roman', Georgia, serif",
                fontSize:11, fontStyle:"italic",
              }}>{n}</div>
            </div>
          ))}
        </div>

        <div style={{flex:1}}/>

        {/* Body lede + CTA */}
        <div style={{
          fontFamily:"'Times New Roman', Georgia, serif",
          fontSize:13, lineHeight:1.55, columnCount:2, columnGap:14,
          padding:"32px 0 16px",
          color:"#3a2e22",
        }}>
          <span style={{
            fontSize:32, fontWeight:900, lineHeight:0.9,
            float:"left", paddingRight:6, paddingTop:2,
          }}>A</span>
          fter weeks of swiping across borders, two compatible readers liked each other tonight. Sources at the matching desk confirmed the development moments after the second tap. A short conversation is expected to follow.
        </div>

        {/* Footer CTA — newspaper "Continued on page 2" treatment */}
        <div style={{
          marginTop:"auto", paddingTop:14, borderTop:"1px solid #1a1410",
          display:"flex", justifyContent:"space-between", alignItems:"center",
          fontFamily:"'Times New Roman', Georgia, serif",
          fontSize:12, fontStyle:"italic",
        }}>
          <span>Say hello to Yael</span>
          <span style={{
            background:"#1a1410", color:"#F5F1E8",
            padding:"6px 12px", fontStyle:"normal", fontWeight:700,
            letterSpacing:"0.04em", textTransform:"uppercase", fontSize:11,
          }}>→ Cont. p. 2</span>
        </div>
      </div>
    </PhoneShell>
  );
}

/* ============================================================== */
/* Variant B · Polaroid stack                                       */
/* Photos shot in person and pinned to a corkboard — confetti       */
/* sparkles imply joyous fluttering. Same brand colors, different    */
/* metaphor: matchmaking IS keeping a memento.                          */
/* ============================================================== */
function MatchPolaroid() {
  return (
    <PhoneShell label="Match · Polaroid">
      {/* Soft halo */}
      <div style={{
        position:"absolute", inset:0, pointerEvents:"none",
        background:"radial-gradient(ellipse 75% 45% at 50% 28%, color-mix(in oklch, var(--lime) 16%, transparent), transparent 70%)",
      }}/>
      {/* Background sparkles */}
      {Array.from({length:14}).map((_,i) => {
        const cols = [["lime","#D7FF81"],["lavender","#BC96FF"],["pink","#FF4566"]];
        const [, color] = cols[i % cols.length];
        const left  = (i * 73) % 100;
        const top   = (i * 41 + 5) % 100;
        const rot   = (i * 37) % 360;
        const size  = 12 + (i % 4) * 6;
        return (
          <span key={i} style={{
            position:"absolute", left:`${left}%`, top:`${top}%`,
            transform:`rotate(${rot}deg)`, opacity:0.55,
            pointerEvents:"none",
          }}>
            <Sparkle size={size} color={color}/>
          </span>
        );
      })}

      <div style={{flex:1, padding:"0 20px", display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"center", gap:32, position:"relative"}}>
        {/* Polaroid pair */}
        <div style={{position:"relative", display:"flex", alignItems:"center"}}>
          {["Ehud","Yael"].map((n, i) => (
            <div key={n} style={{
              width:172, padding:"12px 12px 32px",
              background:"#FAF8F1",
              transform:`rotate(${i === 0 ? -6 : 5}deg) translate(${i === 0 ? -10 : -28}px, ${i === 0 ? 0 : 14}px)`,
              boxShadow:"0 12px 32px rgba(0,0,0,0.45)",
              position:"relative", zIndex: i+1,
            }}>
              <div style={{
                aspectRatio:"1", background:g(n),
                position:"relative", overflow:"hidden",
              }}>
                <div style={{
                  position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
                  color:"rgba(255,255,255,0.22)", fontSize:84, fontWeight:800,
                }}>{n[0]}</div>
                {/* Sparkle pinned to photo */}
                <span style={{position:"absolute", top:6, right:6}}>
                  <Sparkle size={20} color={i === 0 ? "#D7FF81" : "#FF4566"}/>
                </span>
              </div>
              <div style={{
                marginTop:10, textAlign:"center",
                fontFamily:"'Caveat', 'Marker Felt', cursive",
                fontSize:24, color:"#1a1410",
              }}>{n}</div>
              {/* Tape strip */}
              <span style={{
                position:"absolute", top:-10, left:i === 0 ? 30 : 90,
                width:46, height:18,
                background: i === 0 ? "rgba(215,255,129,0.7)" : "rgba(255,69,102,0.65)",
                transform:`rotate(${i === 0 ? -8 : 8}deg)`,
                boxShadow:"0 1px 2px rgba(0,0,0,0.2)",
              }}/>
            </div>
          ))}
        </div>

        <div style={{textAlign:"center"}}>
          <h1 className="t-display" style={{margin:0, color:"var(--ink)"}}>
            Look at you<span style={{color:"var(--lime)"}}>.</span>
          </h1>
          <p className="t-meta" style={{marginTop:8, color:"var(--ink-2)"}}>
            You and Yael both said yes. Pin this somewhere?
          </p>
        </div>
      </div>

      <div style={{padding:"0 20px 28px", display:"flex", flexDirection:"column", gap:10}}>
        <PrimaryBtn tone="cta">Send the first note</PrimaryBtn>
        <div className="t-meta" style={{textAlign:"center", color:"var(--ink-3)"}}>Save for later</div>
      </div>
    </PhoneShell>
  );
}

/* ============================================================== */
/* Variant C · Spotlight                                            */
/* Big single composite photo, theatre-spotlight halo, restrained   */
/* type below. The most "premium dating app" of the three.            */
/* ============================================================== */
function MatchSpotlight() {
  return (
    <PhoneShell label="Match · Spotlight">
      {/* Theatrical gradient backdrop */}
      <div style={{
        position:"absolute", inset:0,
        background:"radial-gradient(ellipse 70% 50% at 50% 30%, rgba(215,255,129,0.32), transparent 60%), radial-gradient(circle at 50% 80%, rgba(255,69,102,0.18), transparent 60%), #0c0820",
        pointerEvents:"none",
      }}/>
      <div style={{position:"absolute", top:14, right:14, zIndex:2}}>
        <div style={{width:40, height:40, borderRadius:"50%",
          background:"rgba(255,255,255,0.10)",
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          <Icon name="x" size={18} color="#fff"/>
        </div>
      </div>

      <div style={{
        flex:1, display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        padding:"0 32px 16px", position:"relative",
      }}>
        {/* Composite photo — single circular frame split diagonally */}
        <div style={{
          position:"relative", width:260, height:260, borderRadius:"50%",
          overflow:"hidden",
          boxShadow:"0 0 0 4px rgba(255,255,255,0.95), 0 0 60px rgba(215,255,129,0.45), 0 18px 60px rgba(0,0,0,0.5)",
        }}>
          <div style={{position:"absolute", inset:0,
            background:g("Ehud"),
            clipPath:"polygon(0 0, 100% 0, 0 100%)",
          }}>
            <div style={{
              position:"absolute", top:"30%", left:"22%",
              color:"rgba(255,255,255,0.4)", fontSize:80, fontWeight:800,
            }}>E</div>
          </div>
          <div style={{position:"absolute", inset:0,
            background:g("Yael"),
            clipPath:"polygon(100% 0, 100% 100%, 0 100%)",
          }}>
            <div style={{
              position:"absolute", bottom:"22%", right:"22%",
              color:"rgba(255,255,255,0.4)", fontSize:80, fontWeight:800,
            }}>Y</div>
          </div>
          {/* Diagonal seam */}
          <div style={{
            position:"absolute", inset:0,
            background:"linear-gradient(45deg, transparent 49%, rgba(255,255,255,0.65) 49.5%, rgba(255,255,255,0.65) 50.5%, transparent 51%)",
          }}/>
          {/* Center sparkle */}
          <div style={{
            position:"absolute", top:"50%", left:"50%",
            transform:"translate(-50%,-50%)",
          }}>
            <Sparkle size={36} color="#D7FF81"/>
          </div>
        </div>

        <div style={{textAlign:"center", marginTop:34}}>
          <div className="t-overline" style={{color:"var(--lime)", marginBottom:8}}>
            A match · Tuesday, 9:41 PM
          </div>
          <h1 style={{
            margin:0, fontSize:36, fontWeight:800, letterSpacing:"-0.02em", lineHeight:1.05,
            color:"#fff",
          }}>
            Ehud<span style={{color:"var(--lime)"}}> & </span>Yael
          </h1>
          <p className="t-body" style={{marginTop:10, color:"rgba(255,255,255,0.75)", maxWidth:280, margin:"10px auto 0"}}>
            Two yeses. The rest is up to you.
          </p>
        </div>
      </div>

      <div style={{padding:"0 24px 28px", display:"flex", flexDirection:"column", gap:10}}>
        <PrimaryBtn tone="cta">Start the conversation</PrimaryBtn>
        <div style={{
          height:44, borderRadius:14, color:"rgba(255,255,255,0.8)",
          border:"1px solid rgba(255,255,255,0.15)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:14, fontWeight:600,
        }}>View Yael's profile</div>
      </div>
    </PhoneShell>
  );
}

/* ============================================================== */
/* Variant D · Minimal                                              */
/* Restrained, indigo background, single line. Bumble's "It's a    */
/* match" minus the Bumble lemon. For the brand's "less is more"     */
/* register.                                                         */
/* ============================================================== */
function MatchMinimal() {
  return (
    <PhoneShell label="Match · Minimal">
      <div style={{padding:"0 20px", flex:1, display:"flex", flexDirection:"column", justifyContent:"space-between"}}>
        <div style={{paddingTop:6, display:"flex", justifyContent:"flex-end"}}>
          <div style={{width:44, height:44, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center"}}>
            <Icon name="x" size={22} color="var(--ink)"/>
          </div>
        </div>
        <div style={{display:"flex", flexDirection:"column", alignItems:"center", gap:48}}>
          {/* Two overlapping circles, simple and tight */}
          <div style={{position:"relative", display:"flex"}}>
            <div style={{
              width:120, height:120, borderRadius:"50%", overflow:"hidden",
              background:g("Ehud"),
              border:"3px solid var(--ink)",
              transform:"translateX(14px)", zIndex:1,
              position:"relative",
            }}>
              <div style={{
                position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
                color:"rgba(255,255,255,0.3)", fontSize:60, fontWeight:800,
              }}>E</div>
            </div>
            <div style={{
              width:120, height:120, borderRadius:"50%", overflow:"hidden",
              background:g("Yael"),
              border:"3px solid var(--ink)",
              marginLeft:-28, position:"relative",
            }}>
              <div style={{
                position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
                color:"rgba(255,255,255,0.3)", fontSize:60, fontWeight:800,
              }}>Y</div>
            </div>
          </div>
          <div style={{textAlign:"center"}}>
            <h1 style={{
              margin:0, fontSize:42, fontWeight:800, letterSpacing:"-0.025em", lineHeight:1,
              color:"var(--ink)",
            }}>
              Mutual<span style={{color:"var(--lime)"}}>.</span>
            </h1>
            <p className="t-meta" style={{marginTop:14, color:"var(--ink-2)"}}>
              Ehud · Yael
            </p>
          </div>
        </div>
        <div style={{paddingBottom:28, display:"flex", flexDirection:"column", gap:10}}>
          <div style={{
            height:56, borderRadius:16, background:"var(--card)",
            border:"1px solid var(--hairline)", padding:"0 8px 0 18px",
            display:"flex", alignItems:"center", gap:12,
          }}>
            <span className="t-body" style={{flex:1, color:"var(--ink-3)"}}>Write to Yael</span>
            <CircleBtn tone="cta" size={44}><Icon name="send" size={18} color="#000"/></CircleBtn>
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}

/* ============================================================== */
/* ANIMATIONS CANVAS                                               */
/* Single wide card visualizing motion patterns: easing curves,    */
/* primary entrance/exit transforms, timing budgets, motion-budget  */
/* carve-outs (per match.tsx celebration override).                */
/* ============================================================== */
function AnimationsArtboard() {
  // Easing curve renderers — pure SVG path approximations.
  const easings = [
    { name: "linear",      d: "M0,40 L80,0",                                  desc: "instant transitions" },
    { name: "easeOut",     d: "M0,40 C24,4 48,0 80,0",                        desc: "standard entrance" },
    { name: "easeIn",      d: "M0,40 C32,40 56,36 80,0",                      desc: "standard exit" },
    { name: "easeInOut",   d: "M0,40 C24,40 56,0 80,0",                       desc: "drawer / sheet" },
    { name: "spring(180,18)", d: "M0,40 C16,0 28,-4 36,2 C44,8 50,-2 56,0 C66,2 72,0 80,0", desc: "match badge climax" },
    { name: "decel",       d: "M0,40 C4,0 12,0 80,0",                         desc: "card-swipe rebound" },
  ];

  return (
    <div style={{
      width:"100%", height:"100%",
      background:"var(--app)", color:"var(--ink)",
      padding:28, boxSizing:"border-box", overflow:"hidden",
      display:"flex", flexDirection:"column", gap:20,
    }}>
      <div className="t-overline" style={{color:"var(--ink-2)"}}>Motion language</div>

      {/* Easing grid */}
      <div>
        <div className="t-caption" style={{color:"var(--ink-3)", marginBottom:10}}>Easing curves</div>
        <div style={{display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:14}}>
          {easings.map(e => (
            <div key={e.name} style={{
              borderRadius:14, padding:14,
              background:"var(--card)",
              border:"1px solid var(--hairline)",
              display:"flex", flexDirection:"column", gap:8,
            }}>
              <svg width="100%" height="56" viewBox="0 0 80 56" preserveAspectRatio="none" style={{display:"block"}}>
                {/* Grid */}
                <line x1="0" y1="48" x2="80" y2="48" stroke="var(--ink-3)" strokeWidth="0.5" opacity="0.3"/>
                <line x1="0" y1="0"  x2="80" y2="0"  stroke="var(--ink-3)" strokeWidth="0.5" opacity="0.3"/>
                {/* Curve baseline (40,40 → 80,0 reference) */}
                <path d="M0,40 L80,0" stroke="var(--ink-3)" strokeWidth="0.5" strokeDasharray="2,3" opacity="0.5" fill="none" transform="translate(0,8)"/>
                {/* Active curve */}
                <path d={e.d} stroke="var(--lime)" strokeWidth="2" fill="none" strokeLinecap="round" transform="translate(0,8)"/>
              </svg>
              <div style={{display:"flex", flexDirection:"column"}}>
                <div className="t-meta" style={{color:"var(--ink)", fontWeight:600, fontFamily:"ui-monospace, monospace"}}>{e.name}</div>
                <div className="t-caption" style={{color:"var(--ink-3)"}}>{e.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Timing budgets */}
      <div>
        <div className="t-caption" style={{color:"var(--ink-3)", marginBottom:10}}>Timing budgets</div>
        <div style={{display:"flex", flexDirection:"column", gap:8}}>
          {[
            { lbl:"Standard entrance (fadeUp)", val:250, max:1200 },
            { lbl:"Standard exit",              val:200, max:1200 },
            { lbl:"Stagger between siblings",   val:60,  max:1200, sub:"capped after 7" },
            { lbl:"Drawer / sheet (in-out)",    val:280, max:1200 },
            { lbl:"Card swipe rebound",         val:300, max:1200 },
            { lbl:"Match badge climax (carve-out)", val:1000, max:1200, accent:"lime" },
          ].map((r, i) => (
            <div key={i} style={{display:"grid", gridTemplateColumns:"260px 1fr 60px", alignItems:"center", gap:14}}>
              <div className="t-meta" style={{color:"var(--ink)"}}>{r.lbl}{r.sub ? <span style={{color:"var(--ink-3)"}}> · {r.sub}</span> : null}</div>
              <div style={{height:6, borderRadius:3, background:"var(--hairline)", position:"relative"}}>
                <div style={{
                  position:"absolute", left:0, top:0, bottom:0,
                  width:`${(r.val / r.max) * 100}%`,
                  borderRadius:3,
                  background: r.accent === "lime" ? "var(--lime)" : "var(--lavender)",
                }}/>
              </div>
              <div className="t-caption" style={{color:"var(--ink-2)", textAlign:"right", fontVariantNumeric:"tabular-nums"}}>{r.val} ms</div>
            </div>
          ))}
        </div>
      </div>

      {/* Pattern strip — entrance / swipe / pulse */}
      <div>
        <div className="t-caption" style={{color:"var(--ink-3)", marginBottom:10}}>Primary patterns</div>
        <div style={{display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:14}}>

          {/* fadeUp — three frames */}
          <div style={{borderRadius:14, padding:14, background:"var(--card)", border:"1px solid var(--hairline)"}}>
            <div className="t-meta" style={{color:"var(--ink)", fontWeight:600}}>fadeUp</div>
            <div className="t-caption" style={{color:"var(--ink-3)", marginBottom:10}}>opacity 0→1 · y 12→0</div>
            <div style={{display:"flex", gap:6, alignItems:"flex-end", height:60}}>
              {[0, 0.4, 1].map((p,i) => (
                <div key={i} style={{
                  flex:1, height: 24 + p*16, borderRadius:6,
                  background:"var(--lavender)",
                  opacity: 0.3 + p*0.7,
                  transform:`translateY(${(1-p)*8}px)`,
                  color:"#000", fontSize:10, fontWeight:700,
                  display:"flex", alignItems:"center", justifyContent:"center",
                }}>t={Math.round(p*100)}%</div>
              ))}
            </div>
          </div>

          {/* Card swipe — rotation arc */}
          <div style={{borderRadius:14, padding:14, background:"var(--card)", border:"1px solid var(--hairline)", overflow:"hidden"}}>
            <div className="t-meta" style={{color:"var(--ink)", fontWeight:600}}>Card swipe</div>
            <div className="t-caption" style={{color:"var(--ink-3)", marginBottom:10}}>rotate ±15° · x ±200</div>
            <div style={{position:"relative", height:60, display:"flex", alignItems:"center", justifyContent:"center"}}>
              {[-12, 0, 12].map((deg,i) => (
                <div key={i} style={{
                  position:"absolute",
                  width:38, height:50, borderRadius:6,
                  background: i === 1 ? "var(--lime)" : "var(--lavender)",
                  opacity: i === 1 ? 1 : 0.45,
                  transform:`rotate(${deg}deg) translateX(${deg*1.5}px)`,
                }}/>
              ))}
            </div>
          </div>

          {/* Match badge — keyframe pulse */}
          <div style={{borderRadius:14, padding:14, background:"var(--card)", border:"1px solid var(--hairline)"}}>
            <div className="t-meta" style={{color:"var(--ink)", fontWeight:600}}>Badge climax</div>
            <div className="t-caption" style={{color:"var(--ink-3)", marginBottom:10}}>scale 0.4→1→1.05→1</div>
            <div style={{display:"flex", gap:4, alignItems:"center", justifyContent:"space-between", height:60}}>
              {[0.4, 1, 1.05, 1].map((s,i) => (
                <div key={i} style={{
                  width:36, height:36, borderRadius:8,
                  background:"var(--lime)", color:"#000",
                  transform:`scale(${s})`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:10, fontWeight:800,
                  boxShadow: i === 2 ? "0 0 14px rgba(215,255,129,0.6)" : "none",
                }}>{["0s","0.5s","0.75s","1.0s"][i]}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="t-caption" style={{color:"var(--ink-3)", marginTop:"auto"}}>
        All animations honor `prefers-reduced-motion: reduce` (duration → 0.01ms) via globals.css.
        Match badge is the only documented carve-out from the 300ms entrance budget.
      </div>
    </div>
  );
}

window.MatchNewspaper = MatchNewspaper;
window.MatchPolaroid = MatchPolaroid;
window.MatchSpotlight = MatchSpotlight;
window.MatchMinimal = MatchMinimal;
window.AnimationsArtboard = AnimationsArtboard;
})();

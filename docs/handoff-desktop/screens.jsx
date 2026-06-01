/* eslint-disable react/no-unknown-property */
/* Ahavah screens — 414×896 mobile artboards.
   Themed via CSS variables in tokens.css. Every component reads
   var(--app), var(--card), var(--ink), etc., so the same JSX renders
   correctly under data-theme="dark" or data-theme="light".
   Brand fills (lime/lavender/pink/indigo/tier) stay vivid in both modes. */
(function(){
const { Icon, Pill, IconBadgeBox, CircleBtn, PrimaryBtn,
        BrandMark, Sparkle } = window;
const PHONE_W = 414;
const PHONE_H = 896;

/* Gradient placeholders for missing photo assets. Mirrors the
   photoOrGradient helper in src/lib/photo-or-gradient.ts. Vivid brand
   gradients work on both light + dark page backgrounds. */
const NAME_GRADIENTS = {
  Yael:    "linear-gradient(135deg,#5524F5 0%,#9F76EA 70%,#BC96FF 100%)",
  Adina:   "linear-gradient(135deg,#FF4566 0%,#BC96FF 100%)",
  Daniel:  "linear-gradient(135deg,#1A1340 0%,#5524F5 100%)",
  Esther:  "linear-gradient(135deg,#BC96FF 0%,#FF4566 100%)",
  Caleb:   "linear-gradient(135deg,#5524F5 0%,#FF4566 100%)",
  Yosef:   "linear-gradient(135deg,#0F0B1F 0%,#5524F5 100%)",
  Rivka:   "linear-gradient(135deg,#FF4566 0%,#5524F5 100%)",
  Tirzah:  "linear-gradient(135deg,#BC96FF 0%,#5524F5 100%)",
  Ehud:    "linear-gradient(135deg,#5524F5 0%,#9F76EA 70%,#BC96FF 100%)",
  Default: "linear-gradient(135deg,#5524F5,#BC96FF)",
};
function gradientFor(name) {
  return NAME_GRADIENTS[name] ?? NAME_GRADIENTS.Default;
}

/* ----- Phone shell ----- */
function Phone({ children, label }) {
  return (
    <div style={{
      width: PHONE_W, height: PHONE_H,
      background: "var(--app)",
      color: "var(--ink)",
      position:"relative",
      overflow:"hidden",
      fontFamily:"'Plus Jakarta Sans', system-ui, sans-serif",
      display:"flex", flexDirection:"column",
    }} aria-label={label}>
      {/* Status bar */}
      <div data-statusbar style={{
        height:44, paddingInline:24, display:"flex", alignItems:"center", justifyContent:"space-between",
        fontSize:15, fontWeight:600, color: "var(--status)",
      }}>
        <span>9:41</span>
        <span style={{display:"inline-flex", alignItems:"center", gap:6}}>
          <span style={{display:"inline-flex", gap:2, alignItems:"flex-end"}}>
            <span style={{width:3,height:6,background:"var(--status)",borderRadius:1}}/>
            <span style={{width:3,height:8,background:"var(--status)",borderRadius:1}}/>
            <span style={{width:3,height:10,background:"var(--status)",borderRadius:1}}/>
            <span style={{width:3,height:12,background:"var(--status)",borderRadius:1}}/>
          </span>
          <span style={{
            width:24, height:11, border:`1.4px solid var(--status)`, borderRadius:3,
            position:"relative", opacity:0.95,
          }}>
            <span style={{position:"absolute", inset:1.5, background:"var(--status)", borderRadius:1.5, width:"75%"}}/>
          </span>
        </span>
      </div>
      <div style={{flex:1, display:"flex", flexDirection:"column", position:"relative", minHeight:0}}>
        {children}
      </div>
    </div>
  );
}

/* ----- Bottom nav ----- */
function BottomNav({ active = "discover" }) {
  const tabs = [
    { k:"discover", l:"Discover", i:"home" },
    { k:"map",      l:"Map",      i:"globe" },
    { k:"matches",  l:"Matches",  i:"heart" },
    { k:"inbox",    l:"Inbox",    i:"mail" },
    { k:"profile",  l:"Profile",  i:"user" },
  ];
  return (
    <div style={{
      position:"absolute", left:16, right:16, bottom:12,
      height:56, borderRadius:24,
      background:"var(--nav-bg)",
      border:"1px solid var(--nav-border)",
      boxShadow:"var(--shadow-soft)",
      display:"flex", alignItems:"center", justifyContent:"space-around",
      paddingInline:8, zIndex: 10,
    }}>
      {tabs.map(t => {
        const on = active === t.k;
        const showBadge = t.k === "inbox";
        return (
          <div key={t.k} style={{
            width:48, height:48, position:"relative",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <span style={{
              width:40, height:40, flexShrink:0, aspectRatio:"1", borderRadius:"var(--avatar-r, 50%)",
              background: on ? "var(--lime)" : "transparent",
              display:"flex", alignItems:"center", justifyContent:"center",
              position:"relative",
            }}>
              <Icon name={t.i} size={20}
                    color={on ? "var(--cta-ink, #000)" : "var(--nav-inactive)"}
                    strokeWidth={on ? 2.4 : 1.8}
                    fill={on && t.k === "matches" ? "currentColor" : "none"} />
              {showBadge ? (
                <span data-navbadge style={{
                  position:"absolute", top:-2, right:-2,
                  minWidth:16, height:16, padding:"0 4px", borderRadius:999,
                  background:"var(--lime)", color:"#000",
                  fontSize:11, fontWeight:700, lineHeight:1,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  border:"2px solid var(--nav-bg)",
                }}>3</span>
              ) : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* Common back arrow header tile */
function HeaderIconTile({ children }) {
  return (
    <div style={{
      width:40, height:40, flexShrink:0, aspectRatio:"1", borderRadius:"var(--avatar-r, 50%)",
      background:"var(--card)", border:"1px solid var(--hairline)",
      display:"flex", alignItems:"center", justifyContent:"center",
    }}>{children}</div>
  );
}

/* ============================================================== */
/* 1 — Welcome (/)                                                 */
/* ============================================================== */
function WelcomeScreen() {
  return (
    <Phone label="Welcome">
      <div style={{flex:1, padding:"4px 20px 24px", display:"flex", flexDirection:"column"}}>
        <div style={{display:"flex", justifyContent:"center", paddingTop:8}}>
          <BrandMark size="md" wordColor="var(--ink)" />
        </div>
        <div style={{flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center", gap:16}}>
          <h1 className="t-display" style={{margin:0, color:"var(--ink)"}}>
            Find love<br/>across borders<span style={{color:"var(--lime)"}}>.</span>
          </h1>
          <p className="t-body" style={{maxWidth:280, color:"var(--ink-2)", margin:0}}>
            Connect with people from anywhere, in any language.
          </p>
        </div>
        <div style={{display:"flex", flexDirection:"column", gap:12}}>
          <div style={{
            height:56, borderRadius:16, background:"var(--card)",
            border:"1px solid var(--hairline)", padding:"0 18px",
            display:"flex", alignItems:"center", color:"var(--ink-3)", fontSize:16,
          }}>Enter your email to begin</div>
          <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8}}>
            {["@gmail.com","@proton.me","@yahoo.com","@hotmail.com","@outlook.com"].map(s => (
              <div key={s} style={{
                height:44, borderRadius:12, border:"1px solid rgba(188,150,255,0.5)",
                color:"var(--lavender)", display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:13, fontWeight:500,
              }}>{s}</div>
            ))}
          </div>
        </div>
        <div style={{marginTop:24, display:"flex", flexDirection:"column", gap:12, alignItems:"center"}}>
          <PrimaryBtn tone="cta">Create account</PrimaryBtn>
          <div className="t-meta" style={{color:"var(--ink-2)"}}>
            Already have an account? <span style={{color:"var(--lavender)", fontWeight:600}}>Sign in</span>
          </div>
          <div className="t-caption" style={{color:"var(--ink-3)", textAlign:"center", maxWidth:300, lineHeight:1.55}}>
            By signing up you agree to our <u style={{color:"var(--ink-2)"}}>Terms</u>,{" "}
            <u style={{color:"var(--ink-2)"}}>Privacy Policy</u> and{" "}
            <u style={{color:"var(--ink-2)"}}>Community Guidelines</u>.
          </div>
        </div>
      </div>
    </Phone>
  );
}

/* ============================================================== */
/* 1b — Sign up (/auth/sign-up)                                    */
/* ============================================================== */
function SignUpScreen() {
  return (
    <Phone label="Sign up">
      <div style={{flex:1, padding:"4px 20px 24px", display:"flex", flexDirection:"column", gap:18}}>
        <div style={{display:"flex", alignItems:"center", gap:12, paddingTop:4}}>
          <HeaderIconTile><Icon name="chevl" size={20} color="var(--ink)"/></HeaderIconTile>
          <BrandMark size="sm" wordColor="var(--ink)"/>
        </div>
        <div>
          <h1 className="t-h1" style={{margin:0, color:"var(--ink)"}}>
            Create your account<span style={{color:"var(--lime)"}}>.</span>
          </h1>
          <p className="t-body" style={{marginTop:8, color:"var(--ink-2)"}}>
            We'll email you a 6-digit code to sign in. No password to remember.
          </p>
        </div>
        <div style={{display:"flex", flexDirection:"column", gap:14}}>
          <div>
            <div className="t-caption" style={{color:"var(--ink-2)", marginBottom:6}}>Email</div>
            <div style={{
              height:56, borderRadius:16, background:"var(--card)",
              border:"1px solid var(--lavender)", padding:"0 18px",
              display:"flex", alignItems:"center", color:"var(--ink)", fontSize:16,
            }}>ehud@proton.me</div>
          </div>
          <div>
            <div className="t-caption" style={{color:"var(--ink-2)", marginBottom:6}}>Password</div>
            <div style={{
              height:56, borderRadius:16, background:"var(--card)",
              border:"1px solid var(--hairline)", padding:"0 18px",
              display:"flex", alignItems:"center", color:"var(--ink)", fontSize:16, letterSpacing:6,
            }}>••••••••••</div>
            <div style={{marginTop:10, display:"flex", alignItems:"center", gap:8}}>
              <div style={{display:"flex", gap:4, flex:1}}>
                {[1,2,3,4].map(i => (
                  <div key={i} style={{
                    height:6, flex:1, borderRadius:3,
                    background: i <= 3 ? "var(--lime)" : "var(--hairline)",
                  }}/>
                ))}
              </div>
              <div className="t-caption" style={{color:"var(--ink-2)"}}>Good</div>
            </div>
          </div>
          <div style={{display:"flex", gap:10, alignItems:"flex-start", paddingTop:6}}>
            <div style={{
              width:22, height:22, borderRadius:6,
              background:"var(--lime)", display:"flex", alignItems:"center", justifyContent:"center",
              flexShrink:0, marginTop:2,
            }}>
              <Icon name="check" size={14} color="#000" strokeWidth={3}/>
            </div>
            <div className="t-caption" style={{color:"var(--ink-2)", lineHeight:1.5}}>
              I'm 18+, and I agree to the{" "}
              <u style={{color:"var(--ink)"}}>Terms</u> &{" "}
              <u style={{color:"var(--ink)"}}>Privacy Policy</u>.
            </div>
          </div>
        </div>
        <div style={{marginTop:"auto", display:"flex", flexDirection:"column", gap:12}}>
          <PrimaryBtn tone="cta">Send me a code</PrimaryBtn>
        </div>
      </div>
    </Phone>
  );
}

/* ============================================================== */
/* 1c — Onboarding step (/onboarding/name)                         */
/* ============================================================== */
function OnboardingScreen() {
  return (
    <Phone label="Onboarding · name">
      <div style={{flex:1, padding:"4px 20px 24px", display:"flex", flexDirection:"column", gap:24}}>
        {/* header: back + progress bar */}
        <div style={{display:"flex", alignItems:"center", gap:14, paddingTop:4}}>
          <HeaderIconTile><Icon name="chevl" size={20} color="var(--ink)"/></HeaderIconTile>
          <div style={{flex:1, display:"flex", gap:4}}>
            {Array.from({length:16}).map((_,i) => (
              <div key={i} style={{
                flex:1, height:4, borderRadius:2,
                background: i < 1 ? "var(--lime)" : "var(--hairline)",
              }}/>
            ))}
          </div>
          <div className="t-caption" style={{color:"var(--ink-3)"}}>1 / 16</div>
        </div>

        <div>
          <h1 className="t-display" style={{margin:0, color:"var(--ink)"}}>
            What's your name<span style={{color:"var(--lime)"}}>?</span>
          </h1>
          <p className="t-body" style={{marginTop:8, color:"var(--ink-2)"}}>
            This is what people will see.
          </p>
        </div>

        <div style={{display:"flex", flexDirection:"column", gap:8}}>
          <div className="t-meta" style={{color:"var(--ink)"}}>First name</div>
          <div style={{
            height:56, borderRadius:16, background:"var(--card)",
            border:"1.5px solid var(--lavender)", padding:"0 18px",
            display:"flex", alignItems:"center", color:"var(--ink)", fontSize:16,
          }}>
            Ehud<span style={{
              width:1.5, height:22, background:"var(--lavender)", marginLeft:2,
            }}/>
          </div>
          <div style={{display:"flex", justifyContent:"space-between"}}>
            <div className="t-caption" style={{color:"var(--ink-3)"}}>
              Just your first name, change anytime in Settings.
            </div>
            <div className="t-caption" style={{color:"var(--ink-3)", fontVariantNumeric:"tabular-nums"}}>4/30</div>
          </div>
        </div>

        <div style={{marginTop:"auto"}}>
          <PrimaryBtn tone="cta">Continue</PrimaryBtn>
        </div>
      </div>
    </Phone>
  );
}

/* ============================================================== */
/* 2 — Discover (/discover)                                        */
/* ============================================================== */
function DiscoverScreen() {
  return (
    <Phone label="Discover">
      <div style={{padding:"4px 20px 0", display:"flex", alignItems:"center", justifyContent:"space-between"}}>
        <BrandMark size="sm" wordColor="var(--ink)"/>
        <div style={{display:"flex", alignItems:"center", gap:12}}>
          <div style={{
            width:48, height:48, flexShrink:0, aspectRatio:"1", borderRadius:"var(--avatar-r, 50%)",
            background:"var(--card)", border:"1px solid var(--hairline)",
            display:"flex", alignItems:"center", justifyContent:"center",
            position:"relative",
          }}>
            <Icon name="sliders" size={20} color="var(--lavender)"/>
            <span data-filterbadge style={{
              position:"absolute", top:-2, right:-2, minWidth:20, height:20, padding:"0 6px",
              borderRadius:999, background:"var(--lime)", color:"var(--cta-ink, #000)",
              fontSize:11, fontWeight:700,
              display:"flex", alignItems:"center", justifyContent:"center",
              border:"2px solid var(--app)",
            }}>1</span>
          </div>
          {/* User avatar — AvatarFallback variant="brand" per avatar.tsx:
              `bg-bg-indigo text-lime font-bold`. Reads as a near-flush
              dark disc on the indigo canvas with a vivid lime initial,
              not the gradient placeholder I'd been using. */}
          <div style={{
            width:48, height:48, flexShrink:0, aspectRatio:"1", borderRadius:"var(--avatar-r, 50%)",
            background:"var(--bg-indigo)", color:"var(--lime)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:18, fontWeight:800, position:"relative",
          }}>
            J
            <span style={{
              position:"absolute", top:0, right:0, width:12, height:12, flexShrink:0, aspectRatio:"1", borderRadius:"50%",
              background:"var(--lime)", border:"3px solid var(--app)",
            }}/>
          </div>
        </div>
      </div>

      <div style={{flex:1, minHeight:0, padding:"12px 20px 88px", display:"flex", flexDirection:"column", gap:16}}>
        <div style={{
          flex:1, borderRadius:24, overflow:"hidden", position:"relative",
          background: gradientFor("Daniel"),
          boxShadow:"0 10px 30px rgba(0,0,0,0.20)",
        }}>
          {/* Photo timeline — Progress kit: 4px tall, lime fill on a
              dark track (NOT white on white-30%). Soft lime glow on the
              active segment. */}
          <div style={{position:"absolute", top:20, left:20, right:20, display:"flex", gap:6, zIndex:2}}>
            {[1,0,0].map((on,i) => (
              <div key={i} style={{
                flex:1, height:4, borderRadius:999,
                background: on ? "var(--lime)" : "rgba(255,255,255,0.18)",
                boxShadow: on ? "0 0 8px rgba(215,255,129,0.45)" : "none",
              }}/>
            ))}
          </div>
          <div style={{
            position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
            color:"rgba(255,255,255,0.18)", fontSize:160, fontWeight:800,
          }}>E</div>
          {/* PhotoCaption — bottom-anchored gradient scrim per
              src/components/app/photo-caption.tsx. Last-seen text is the
              formatLastSeen output, not a static "Online now" — most
              candidates aren't currently online. */}
          <div style={{
            position:"absolute", left:0, right:0, bottom:0, padding:"60px 24px 22px",
            background:"linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.75) 100%)",
          }}>
            <div style={{display:"flex", alignItems:"center", gap:4}}>
              <span className="t-h2" style={{
                color:"#fff",
                textDecoration:"underline",
                textDecorationColor:"rgba(255,255,255,0.3)",
                textDecorationThickness:"1px",
                textUnderlineOffset:4,
              }}>Ehud, 42</span>
              <Icon name="chevr" size={20} color="rgba(255,255,255,0.7)"/>
            </div>
            <div className="t-caption" style={{marginTop:6, color:"rgba(255,255,255,0.85)", display:"flex", alignItems:"center", gap:4}}>
              <Icon name="mappin" size={12} color="rgba(255,255,255,0.85)"/> Blackmans, BB
            </div>
            <div className="t-caption" style={{marginTop:4, color:"rgba(255,255,255,0.75)"}}>
              Last seen 2h ago
            </div>
          </div>
        </div>

        <div style={{display:"flex", alignItems:"center", justifyContent:"center", gap:20}}>
          <CircleBtn tone="brand" size={48}><Icon name="x" size={20} color="#000" strokeWidth={2.4}/></CircleBtn>
          <CircleBtn tone="cta" size={56}><Icon name="play" size={22} color="#000" fill="#000"/></CircleBtn>
          <CircleBtn tone="action" size={48}><Icon name="heart" size={20} color="#fff" fill="#fff"/></CircleBtn>
        </div>
      </div>

      <BottomNav active="discover" />
    </Phone>
  );
}

/* ============================================================== */
/* 3 — Match (/match)                                              */
/* ============================================================== */
function MatchScreen() {
  return (
    <Phone label="Match">
      <div style={{
        position:"absolute", inset:0, pointerEvents:"none",
        background:"radial-gradient(ellipse 60% 40% at 50% 25%, color-mix(in oklch, var(--lime) 18%, transparent), transparent 70%), radial-gradient(ellipse 70% 50% at 50% 90%, color-mix(in oklch, var(--pink) 12%, transparent), transparent 75%)",
      }}/>
      <div style={{padding:"0 20px", display:"flex", flexDirection:"column", flex:1, position:"relative"}}>
        <div style={{display:"flex", justifyContent:"flex-end", paddingTop:8}}>
          <div style={{width:44, height:44, flexShrink:0, aspectRatio:"1", borderRadius:"var(--avatar-r, 50%)", display:"flex", alignItems:"center", justifyContent:"center"}}>
            <Icon name="x" size={22} color="var(--ink)"/>
          </div>
        </div>
        <div style={{flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:28}}>
          <div style={{position:"relative", display:"flex", alignItems:"center"}}>
            <div style={{
              position:"absolute", inset:-30, borderRadius:"50%",
              background:"radial-gradient(circle, color-mix(in oklch, var(--lime) 30%, transparent), transparent 70%)",
              filter:"blur(20px)", zIndex:0,
            }}/>
            <div style={{
              position:"relative", zIndex:1,
              width:170, height:218, borderRadius:24, overflow:"hidden",
              border:"3px solid #fff",
              background: gradientFor("Ehud"),
              boxShadow:"var(--shadow-soft)",
              transform:"rotate(-3deg)",
            }}>
              <span style={{
                position:"absolute", top:8, right:8, width:24, height:6,
                background:"rgba(188,150,255,0.7)", borderRadius:2, transform:"rotate(12deg)",
              }}/>
            </div>
            <div style={{
              position:"relative", zIndex:1, marginLeft:-32, marginTop:16,
              width:170, height:218, borderRadius:24, overflow:"hidden",
              border:"3px solid #fff",
              background: gradientFor("Yael"),
              boxShadow:"var(--shadow-soft)",
              transform:"rotate(5deg)",
            }}>
              <span style={{
                position:"absolute", top:8, right:8, width:24, height:6,
                background:"rgba(255,69,102,0.7)", borderRadius:2, transform:"rotate(12deg)",
              }}/>
            </div>
            <div style={{
              position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", zIndex:2,
            }}>
              <Icon name="sparkles" size={28} color="var(--lime)"/>
            </div>
          </div>

          <div style={{
            display:"inline-flex", padding:"14px 28px", borderRadius:18,
            background:"var(--lime)", color:"#000",
            transform:"rotate(-3deg)",
            boxShadow:"0 4px 20px rgba(215,255,129,0.4)",
          }}>
            <span className="t-display" style={{lineHeight:1.05}}>It's a match!</span>
          </div>

          <p className="t-meta" style={{color:"var(--ink-2)", textAlign:"center"}}>
            You and <span style={{color:"var(--lavender)", fontWeight:600}}>Yael</span> liked each other.
          </p>
        </div>

        <div style={{paddingBottom:24, display:"flex", flexDirection:"column", gap:12}}>
          <div style={{
            height:56, borderRadius:16, background:"var(--card)",
            border:"1px solid var(--hairline)", padding:"0 8px 0 18px",
            display:"flex", alignItems:"center", gap:12,
          }}>
            <span className="t-body" style={{flex:1, color:"var(--ink-3)"}}>Say hi</span>
            <CircleBtn tone="cta" size={44}><Icon name="send" size={18} color="#000"/></CircleBtn>
          </div>
          <PrimaryBtn tone="outline">View Yael's profile</PrimaryBtn>
          <div className="t-meta" style={{textAlign:"center", color:"var(--ink-3)", padding:"4px 0"}}>Keep swiping</div>
        </div>
      </div>
    </Phone>
  );
}

/* ============================================================== */
/* 4 — Inbox (/inbox)                                              */
/* ============================================================== */
function InboxRow({ name, age, msg, time, unread, ring }) {
  return (
    <div style={{
      display:"flex", alignItems:"center", gap:14, padding:"10px 12px", borderRadius:16,
    }}>
      <div style={{position:"relative"}}>
        {/* Brand-fallback avatar — indigo disc + lime initial.
            Optional lime ring when there are unread messages. */}
        <div style={{
          width:56, height:56, flexShrink:0, aspectRatio:"1", borderRadius:"var(--avatar-r, 50%)",
          background: "var(--bg-indigo)",
          color: "var(--lime)", fontSize:20, fontWeight:800,
          display:"flex", alignItems:"center", justifyContent:"center",
          border: ring === "lime" ? "2.5px solid var(--lime)" : "none",
          boxSizing:"border-box",
        }}>{name[0]}</div>
      </div>
      <div style={{flex:1, minWidth:0}}>
        <div className="t-body" style={{color:"var(--ink)", marginBottom:2}}>{name}, {age}</div>
        <div className="t-meta" style={{
          color: unread > 0 ? "var(--ink)" : "var(--ink-2)",
          fontWeight: unread > 0 ? 500 : 400,
          whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:240,
        }}>{msg}</div>
      </div>
      <div style={{display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6}}>
        <div className="t-caption" style={{color:"var(--ink-3)"}}>{time}</div>
        {unread > 0 ? <Pill variant="lime">{unread}</Pill> : null}
      </div>
    </div>
  );
}
function InboxScreen() {
  const rows = [
    { name:"Yael",   age:27, msg:"Shabbat shalom! How was your week?", time:"9:32", unread:2, ring:"lime" },
    { name:"Adina",  age:24, msg:"That sounds wonderful — yes I'd love to meet up.", time:"8:14", unread:1, ring:"lime" },
    { name:"Esther", age:28, msg:"You: Thanks for sharing the article 🙂", time:"Mon", unread:0 },
    { name:"Rivka",  age:31, msg:"I think Tuesday works better for me — does that suit you?", time:"Mon", unread:0 },
    { name:"Tirzah", age:22, msg:"You: Looking forward to it!", time:"Sun", unread:0 },
    { name:"Daniel", age:32, msg:"Same here — let me know if you want suggestions.", time:"Sat", unread:0 },
    { name:"Yosef",  age:41, msg:"Have a good week!", time:"Fri", unread:0 },
  ];
  return (
    <Phone label="Inbox">
      <div style={{flex:1, display:"flex", flexDirection:"column", padding:"4px 0 0"}}>
        <div style={{padding:"12px 20px 12px", display:"flex", alignItems:"center", justifyContent:"space-between"}}>
          <h1 className="t-display" style={{margin:0, color:"var(--ink)"}}>Chat</h1>
          <div style={{
            width:48, height:48, flexShrink:0, aspectRatio:"1", borderRadius:"var(--avatar-r, 50%)",
            background:"var(--card)", border:"1px solid var(--hairline)",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <Icon name="search" size={20} color="var(--ink)"/>
          </div>
        </div>
        <div style={{flex:1, overflow:"hidden", padding:"4px 8px 90px"}}>
          {rows.map((r,i) => <InboxRow key={i} {...r}/>)}
        </div>
      </div>
      <BottomNav active="inbox" />
    </Phone>
  );
}

/* ============================================================== */
/* 5 — Chat thread (/chat/[id])                                    */
/* ============================================================== */
function Bubble({ side, children, avatar }) {
  const them = side === "them";
  return (
    <div style={{
      display:"flex", alignItems:"flex-end", gap:8,
      alignSelf: them ? "flex-start" : "flex-end",
      maxWidth:"80%",
    }}>
      {them && avatar ? (
        /* Brand-fallback xs avatar — 28px (size-7) indigo + lime per
           chat-bubble.tsx <Avatar size="xs"><AvatarFallback variant="brand">. */
        <div style={{
          width:28, height:28, flexShrink:0, aspectRatio:"1", borderRadius:"50%",
          background:"var(--bg-indigo)",
          color:"var(--lime)", fontSize:12, fontWeight:800,
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>{avatar[0]}</div>
      ) : null}
      <div style={{
        padding:"12px 16px", borderRadius:18,
        background: them ? "var(--lavender)" : "var(--lime)",
        color:"#000", fontSize:16, lineHeight:1.4,
        borderBottomLeftRadius: them ? 4 : 18,
        borderBottomRightRadius: them ? 18 : 4,
      }}>{children}</div>
    </div>
  );
}
function ChatScreen() {
  return (
    <Phone label="Chat thread">
      <div style={{
        padding:"10px 14px 12px", display:"flex", alignItems:"center", gap:12,
        borderBottom:"1px solid var(--hairline)",
      }}>
        <div style={{width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center"}}>
          <Icon name="chevl" size={22} color="var(--ink)"/>
        </div>
        <div style={{position:"relative"}}>
          {/* Chat-header avatar — 48px brand fallback per
              `<Avatar size="tap-lg">` in chat-header.tsx. */}
          <div style={{
            width:48, height:48, flexShrink:0, aspectRatio:"1", borderRadius:"50%",
            background:"var(--bg-indigo)",
            color:"var(--lime)", fontSize:18, fontWeight:800,
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>Y</div>
          <span style={{
            position:"absolute", bottom:0, right:0, width:12, height:12, flexShrink:0, aspectRatio:"1", borderRadius:"50%",
            background:"var(--lime)", border:"2.5px solid var(--app)",
          }}/>
        </div>
        <div style={{flex:1}}>
          <div className="t-body-s" style={{color:"var(--ink)"}}>Yael, 27</div>
          <div className="t-caption" style={{color:"var(--ink-2)"}}>Online now</div>
        </div>
        <div style={{width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center"}}>
          <Icon name="settings" size={20} color="var(--ink-2)"/>
        </div>
      </div>

      <div style={{flex:1, minHeight:0, overflow:"hidden", padding:"16px 16px 12px",
                   display:"flex", flexDirection:"column", gap:10}}>
        <div className="t-caption" style={{alignSelf:"center", color:"var(--ink-3)", padding:"6px 12px"}}>
          You matched on Sunday
        </div>
        <Bubble side="them" avatar="Yael">Shalom! Loved your photo of the Old City — when was that taken?</Bubble>
        <Bubble side="me">Last Sukkot 🌿 I try to get back every few months. You?</Bubble>
        <Bubble side="them" avatar="Yael">I live in Jerusalem actually — Nachlaot. Have you ever been?</Bubble>
        <Bubble side="me">Once, years ago. I remember the courtyards and the cats everywhere.</Bubble>
        <Bubble side="them" avatar="Yael">Ha! The cats are still in charge. Coffee if you're ever back?</Bubble>
        <div style={{alignSelf:"flex-start", display:"flex", alignItems:"flex-end", gap:8}}>
          <div style={{
            width:28, height:28, flexShrink:0, aspectRatio:"1", borderRadius:"50%",
            background:"var(--bg-indigo)",
            color:"var(--lime)", fontSize:12, fontWeight:800,
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>Y</div>
          <div style={{
            padding:"12px 16px", borderRadius:18, borderBottomLeftRadius:4,
            background:"var(--lavender)", color:"#000",
            display:"flex", gap:4, alignItems:"center",
          }}>
            {[0,1,2].map(i => <span key={i} style={{width:6,height:6,borderRadius:"50%",background:"#000",opacity:0.55}}/>)}
          </div>
        </div>
      </div>

      <div style={{padding:"10px 16px 18px", display:"flex", alignItems:"center", gap:10}}>
        <div style={{
          flex:1, height:48, borderRadius:24, background:"var(--card)",
          border:"1px solid var(--hairline)",
          padding:"0 18px", display:"flex", alignItems:"center", color:"var(--ink-3)",
        }}>Type a message…</div>
        <CircleBtn tone="cta" size={48}><Icon name="send" size={20} color="#000"/></CircleBtn>
      </div>
    </Phone>
  );
}

/* ============================================================== */
/* 6 — Profile (/profile)                                          */
/* ============================================================== */
function ProfileRow({ tone, icon, title, sub }) {
  return (
    <div style={{
      display:"flex", alignItems:"center", gap:14, padding:"14px 12px", borderRadius:16,
    }}>
      <IconBadgeBox tone={tone}><Icon name={icon} size={16}/></IconBadgeBox>
      <div style={{flex:1, minWidth:0}}>
        <div className="t-meta" style={{color:"var(--ink)", fontWeight:500}}>{title}</div>
        <div className="t-caption" style={{color:"var(--ink-3)"}}>{sub}</div>
      </div>
      <Icon name="chevr" size={16} color="var(--ink-3)"/>
    </div>
  );
}
function ProfileScreen() {
  return (
    <Phone label="Profile">
      <div style={{flex:1, display:"flex", flexDirection:"column", padding:"4px 0 90px", overflow:"hidden"}}>
        <div style={{padding:"24px 20px 0"}}>
          <div style={{
            borderRadius:28, overflow:"hidden",
            background:"linear-gradient(135deg,#5524F5 0%,#9F76EA 70%,#BC96FF 100%)",
            color:"#fff",
          }}>
            <div style={{padding:"20px 20px 16px", display:"flex", alignItems:"center", gap:16}}>
              {/* Hero avatar — brand fallback (indigo + lime) atop the
                  brand-gradient card. Subtle white ring lifts it off. */}
              <div style={{
                width:64, height:64, flexShrink:0, aspectRatio:"1", borderRadius:"var(--avatar-r, 50%)",
                background:"var(--bg-indigo)",
                color:"var(--lime)", fontSize:24, fontWeight:800,
                display:"flex", alignItems:"center", justifyContent:"center",
                boxShadow:"0 0 0 2px rgba(255,255,255,0.4)",
              }}>E</div>
              <div style={{flex:1, minWidth:0}}>
                <div className="t-h1">Ehud, 30</div>
                <div style={{marginTop:6}}>
                  <Pill variant="glassDark"><Icon name="shield" size={11} color="#fff"/> Bronze verified</Pill>
                </div>
              </div>
            </div>
            <div style={{padding:"0 20px 20px"}}>
              <PrimaryBtn tone="cta">
                <Icon name="sparkles" size={16} color="#000"/> Upgrade to Premium
              </PrimaryBtn>
            </div>
          </div>
        </div>

        <div style={{padding:"16px 12px 0"}}>
          <ProfileRow tone="brand"   icon="userpen" title="Edit profile" sub="Photos, bio, basics" />
          <ProfileRow tone="success" icon="shield"  title="Verification" sub="Bronze · upgrade to Silver" />
          <ProfileRow tone="success" icon="card"    title="Subscription" sub="Upgrade to Premium →" />
          <ProfileRow tone="muted"   icon="settings" title="Settings" sub="Notifications, privacy, account" />
        </div>

        <div style={{padding:"20px 20px 0"}}>
          <PrimaryBtn tone="outline">Sign out</PrimaryBtn>
        </div>
      </div>
      <BottomNav active="profile" />
    </Phone>
  );
}

/* ============================================================== */
/* 6b — Profile detail (/profile/[uuid])                           */
/* ============================================================== */
function ProfileDetailScreen() {
  // Tag chips — lavender solid Pills (size sm), one per attribute.
  // Matches src/app/profile/[uuid]/page.tsx (nationality → ethnicity
  // → maritalStatus → children). Ehud, 42 = the live test profile
  // surfaced in the user's screenshot.
  const tags = ["Saint Lucian", "Afro-Caribbean", "Married", "3 children"];
  return (
    <Phone label="Profile detail">
      <div style={{flex:1, display:"flex", flexDirection:"column", overflow:"hidden", position:"relative"}}>
        {/* Photo — full-bleed 4/5 aspect, no rounding (the bio card sits
            on top of its bottom edge with a rounded top). */}
        <div style={{position:"relative", width:"100%", aspectRatio:"4/5",
                     background: gradientFor("Daniel")}}>
          {/* Glyph stand-in for the photo */}
          <div style={{
            position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
            color:"rgba(255,255,255,0.18)", fontSize:200, fontWeight:800,
          }}>E</div>

          {/* Top center — progress dots / pill paginator.
              Active segment is a wider white pill; inactive ones are
              short circles. Matches <ProgressDots size="sm" tone="white">
              over the photo. */}
          <div style={{
            position:"absolute", top:56, left:"50%", transform:"translateX(-50%)",
            display:"flex", alignItems:"center", gap:6, zIndex:10,
          }}>
            <span style={{width:22, height:4, borderRadius:2, background:"#fff"}}/>
            <span style={{width:4, height:4, borderRadius:"50%", background:"rgba(255,255,255,0.55)"}}/>
            <span style={{width:4, height:4, borderRadius:"50%", background:"rgba(255,255,255,0.55)"}}/>
          </div>

          {/* Top chrome — back (left) / more (right). Both are the
              `tone="overlay"` Button — translucent black 48px disc
              with white glyph, sits at top-3 with px-3 gutter. */}
          <div style={{
            position:"absolute", top:56, left:16, right:16, zIndex:10,
            display:"flex", justifyContent:"space-between",
          }}>
            <div style={{
              width:48, height:48, flexShrink:0, aspectRatio:"1",
              borderRadius:"50%",
              background:"rgba(0,0,0,0.45)", backdropFilter:"blur(8px)",
              display:"flex", alignItems:"center", justifyContent:"center",
            }}><Icon name="chevl" size={22} color="#fff"/></div>
            <div style={{
              width:48, height:48, flexShrink:0, aspectRatio:"1",
              borderRadius:"50%",
              background:"rgba(0,0,0,0.45)", backdropFilter:"blur(8px)",
              display:"flex", alignItems:"center", justifyContent:"center",
              gap:3,
            }}>
              {[0,0,0].map((_,i) => (
                <span key={i} style={{width:4, height:4, borderRadius:"50%", background:"#fff"}}/>
              ))}
            </div>
          </div>

          {/* Compatibility pill — bottom-right of photo, OVER the photo,
              not inside the bio card. Variant is lavender when 65-84,
              lime ≥85, pink <65. Anchored bottom-12 right-4 so it never
              overlaps the bio card's top edge. Pill is a CompatPill =
              Sparkles icon + percent, tabular-nums bold, size="sm". */}
          <div style={{
            position:"absolute", bottom:56, right:16, zIndex:10,
            display:"inline-flex", alignItems:"center", gap:6,
            height:28, padding:"0 12px", borderRadius:999,
            background:"var(--lavender)", color:"#000",
            fontSize:13, fontWeight:700,
          }}>
            <Icon name="sparkles" size={12} color="#000"/>
            <span style={{fontVariantNumeric:"tabular-nums"}}>66%</span>
          </div>
        </div>

        {/* Bio card — overlaps photo by 32px, rounded-t-3xl, tone="overlap"
            = bg-bg-indigo (NOT elevated) with shadow-card-overlap. */}
        <div style={{
          marginTop:-32, position:"relative", zIndex:5,
          background:"var(--app)",
          borderRadius:"24px 24px 0 0",
          padding:"24px 20px 24px",
          flex:1, overflow:"hidden",
          boxShadow:"0 -8px 24px rgba(0,0,0,0.45)",
          display:"flex", flexDirection:"column", gap:20,
        }}>
          {/* Name + AKA + location + tag pills cluster */}
          <div>
            <h1 className="t-h1" style={{margin:0, color:"var(--ink)"}}>Ehud, 42</h1>
            <p style={{
              margin:"2px 0 0", fontSize:14, lineHeight:1.45,
              fontStyle:"italic", color:"var(--ink-2)",
            }}>
              also known as &ldquo;Ehud Israel&rdquo;
            </p>
            <p className="t-meta" style={{
              margin:"6px 0 0", color:"var(--ink-2)",
              display:"flex", alignItems:"center", gap:6,
            }}>
              <Icon name="mappin" size={12}/> BB
            </p>
            <div style={{marginTop:12, display:"flex", flexWrap:"wrap", gap:8}}>
              {tags.map(t => <Pill key={t} variant="lavender">{t}</Pill>)}
            </div>
          </div>

          {/* Bio paragraph — text-white/85 in dark mode */}
          <p style={{
            margin:0, fontSize:16, lineHeight:1.55,
            color:"var(--ink)",
            opacity:0.92,
          }}>I'm fly</p>

          {/* About section — divider + uppercase heading + dl rows */}
          <div style={{
            display:"flex", flexDirection:"column", gap:10,
            borderTop:"1px solid var(--hairline)", paddingTop:16,
          }}>
            <div className="t-meta" style={{
              fontWeight:600, textTransform:"uppercase",
              color:"var(--ink-2)", letterSpacing:"0.04em",
            }}>About</div>
            <dl style={{margin:0, display:"flex", flexDirection:"column", gap:8}}>
              {[
                ["Gender",    "Man"],
                ["Work",      "Consultant"],
                ["Education", "Bachelor's Degree"],
              ].map(([k, v]) => (
                <div key={k} style={{display:"flex", gap:8}}>
                  <dt className="t-meta" style={{color:"var(--ink-2)"}}>{k}:</dt>
                  <dd className="t-meta" style={{margin:0, color:"var(--ink)", fontWeight:500}}>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </Phone>
  );
}

/* ============================================================== */
/* 7 — Paywall (/paywall)                                          */
/* ============================================================== */
function FeatureRow({ children }) {
  return (
    <div style={{display:"flex", alignItems:"center", gap:12, padding:"6px 0"}}>
      <IconBadgeBox tone="cta" shape="circle" size={24}>
        <Icon name="check" size={12} color="#000" strokeWidth={3}/>
      </IconBadgeBox>
      <div className="t-body" style={{color:"var(--ink)"}}>{children}</div>
    </div>
  );
}
function TierRow({ label, per, price, badge, selected }) {
  return (
    <div style={{
      borderRadius:18, padding:"16px 18px",
      background: selected ? "color-mix(in oklch, var(--lime) 10%, var(--card))" : "var(--card)",
      border: selected ? "1.5px solid var(--lime)" : "1px solid var(--hairline)",
      display:"flex", alignItems:"center", gap:14,
    }}>
      <div style={{
        width:22, height:22, flexShrink:0, aspectRatio:"1", borderRadius:"50%",
        background: selected ? "var(--lime)" : "transparent",
        border: selected ? "none" : "1.5px solid var(--ink-3)",
        display:"flex", alignItems:"center", justifyContent:"center",
      }}>
        {selected ? <Icon name="check" size={12} color="#000" strokeWidth={3}/> : null}
      </div>
      <div style={{flex:1, minWidth:0}}>
        <div className="t-body-s" style={{display:"flex", alignItems:"center", gap:8, color:"var(--ink)"}}>
          {label} {badge ? <Pill variant="lime">{badge}</Pill> : null}
        </div>
        <div className="t-caption" style={{color:"var(--ink-3)"}}>{per}</div>
      </div>
      <div className="t-h3" style={{fontWeight:800, fontVariantNumeric:"tabular-nums", color:"var(--ink)"}}>{price}</div>
    </div>
  );
}
function PaywallScreen() {
  return (
    <Phone label="Paywall">
      <div style={{flex:1, padding:"4px 20px 18px", display:"flex", flexDirection:"column"}}>
        <div style={{display:"flex", justifyContent:"flex-end", paddingTop:6}}>
          <div style={{width:44, height:44, display:"flex", alignItems:"center", justifyContent:"center"}}>
            <Icon name="x" size={22} color="var(--ink)"/>
          </div>
        </div>
        <div style={{display:"flex", flexDirection:"column", alignItems:"center", gap:10, paddingTop:6}}>
          <Sparkle size={48} color="#D7FF81"/>
          <h1 className="t-display" style={{margin:0, textAlign:"center", color:"var(--ink)"}}>Ahavah Premium</h1>
          <p className="t-meta" style={{color:"var(--ink-2)", textAlign:"center", maxWidth:280, margin:0}}>
            Match more. Worry less.
          </p>
        </div>

        <div style={{marginTop:28, display:"flex", flexDirection:"column", gap:6}}>
          <FeatureRow>See everyone who liked you (full list, not just the count)</FeatureRow>
          <FeatureRow>Help build a Torah-observant community at the price of a coffee</FeatureRow>
          <FeatureRow>Cancel anytime from the billing portal</FeatureRow>
        </div>

        <div style={{marginTop:24, display:"flex", flexDirection:"column", gap:10}}>
          <TierRow label="1 month"  per="$4.99 / month" price="$4.99"  />
          <TierRow label="3 months" per="$4.00 / month" price="$11.99" badge="POPULAR" />
          <TierRow label="1 year"   per="$2.92 / month" price="$34.99" badge="BEST VALUE" selected />
        </div>

        <div style={{marginTop:"auto", paddingTop:24, display:"flex", flexDirection:"column", gap:14}}>
          <PrimaryBtn tone="cta">Continue $34.99</PrimaryBtn>
          <p className="t-caption" style={{textAlign:"center", color:"var(--ink-3)", lineHeight:1.55, margin:0}}>
            Auto-renews. Cancel anytime in settings. By continuing you accept our{" "}
            <u>Terms</u> and <u>Privacy Policy</u>.
          </p>
        </div>
      </div>
    </Phone>
  );
}

/* ============================================================== */
/* 8 — Verify (/verify)                                            */
/* ============================================================== */
function TierCard({ color, label, sub, body, ctaLabel, icon, done }) {
  return (
    <div style={{
      borderRadius:24, padding:18, background:"var(--card)",
      boxShadow: done
        ? `inset 0 0 0 1.5px ${color}`
        : "inset 0 0 0 1.5px var(--hairline)",
      display:"flex", flexDirection:"column", gap:14,
    }}>
      <div style={{display:"flex", alignItems:"center", gap:14}}>
        <span style={{
          width:48, height:48, borderRadius:14,
          background: color, color:"#000",
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          <Icon name={icon} size={22} color="#000"/>
        </span>
        <div style={{flex:1, minWidth:0}}>
          <div className="t-h3" style={{display:"flex", alignItems:"center", gap:8, color:"var(--ink)"}}>
            {label}
            {done ? (
              <span style={{display:"inline-flex", alignItems:"center", gap:4, color}}>
                <Icon name="check" size={14} color={color} strokeWidth={3}/>
                <span className="t-caption" style={{fontWeight:700}}>Verified</span>
              </span>
            ) : null}
          </div>
          <div className="t-caption" style={{color:"var(--ink-3)"}}>{sub}</div>
        </div>
      </div>
      <p className="t-meta" style={{color:"var(--ink-2)", margin:0, lineHeight:1.5}}>{body}</p>
      {!done ? (
        <div style={{
          height:44, borderRadius:14, color:"var(--ink)",
          border:`1px solid ${color}`,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:14, fontWeight:600,
        }}>{ctaLabel}</div>
      ) : null}
    </div>
  );
}
function VerifyScreen() {
  return (
    <Phone label="Verify">
      <div style={{flex:1, padding:"4px 0 24px", overflow:"hidden"}}>
        <div style={{padding:"12px 20px 8px", display:"flex", alignItems:"center", gap:12}}>
          <HeaderIconTile><Icon name="chevl" size={20} color="var(--ink)"/></HeaderIconTile>
          <h1 className="t-display" style={{margin:0, color:"var(--ink)"}}>Get verified</h1>
        </div>
        <p className="t-meta" style={{color:"var(--ink-2)", margin:0, padding:"8px 20px 18px"}}>
          Verified profiles get more matches and signal you're a real person.
        </p>
        <div style={{display:"flex", flexDirection:"column", gap:14, padding:"0 20px"}}>
          <TierCard color="#CD7F32" label="Bronze" sub="Profile verified" icon="phone"
            body="Selfie + photo cross-check. Confirms you're a real person matching your photos."
            ctaLabel="Take a selfie" done />
          <TierCard color="#C0C0C0" label="Silver" sub="Liveness verified" icon="scan"
            body="Three quick selfies at different angles confirm you're a real person, not a static photo."
            ctaLabel="Take 3 selfies" />
          <TierCard color="#FFD700" label="Gold" sub="ID verified" icon="idcard"
            body="Government ID + face match (via Stripe Identity). Highest trust signal."
            ctaLabel="Verify with government ID" />
        </div>
      </div>
    </Phone>
  );
}

/* ============================================================== */
/* 9 — Settings (/settings)                                        */
/* ============================================================== */
function SettingsGroup({ label, items }) {
  return (
    <div style={{padding:"18px 20px 0"}}>
      <div style={{display:"flex", alignItems:"center", gap:10, padding:"0 4px 10px"}}>
        <span style={{width:6, height:6, borderRadius:3, background:"var(--lavender)"}}/>
        <div className="t-overline" style={{color:"var(--ink-2)"}}>{label}</div>
      </div>
      <div style={{display:"flex", flexDirection:"column"}}>
        {items.map((it,i) => (
          <ProfileRow key={i} tone="muted" icon={it.icon} title={it.title} sub={it.sub}/>
        ))}
      </div>
    </div>
  );
}
function SettingsScreen() {
  return (
    <Phone label="Settings">
      <div style={{flex:1, padding:"4px 0 100px", overflow:"hidden"}}>
        <div style={{padding:"12px 20px 4px", display:"flex", alignItems:"center", gap:12}}>
          <HeaderIconTile><Icon name="chevl" size={20} color="var(--ink)"/></HeaderIconTile>
          <h1 className="t-display" style={{margin:0, color:"var(--ink)"}}>Settings</h1>
        </div>

        <SettingsGroup label="Account" items={[
          {icon:"settings", title:"Account", sub:"Email & sign out"},
        ]}/>
        <SettingsGroup label="App" items={[
          {icon:"bell",   title:"Notifications", sub:"Push notifications"},
          {icon:"lock",   title:"Privacy",       sub:"What others see about you"},
          {icon:"userx",  title:"Blocked users", sub:"People you've blocked"},
        ]}/>
        <SettingsGroup label="Safety & Legal" items={[
          {icon:"shield", title:"Safety tips",          sub:"Stay safe on Ahavah"},
          {icon:"book",   title:"Community guidelines", sub:"How we keep it kind"},
          {icon:"shield", title:"Privacy policy",       sub:"How we handle your data"},
          {icon:"file",   title:"Terms of service",     sub:"What you agree to"},
        ]}/>
        <SettingsGroup label="Support" items={[
          {icon:"help", title:"Help center", sub:"FAQs & contact"},
        ]}/>
      </div>
      <BottomNav active="profile" />
    </Phone>
  );
}

/* ============================================================== */
/* 10 — Map (/map)                                                 */
/* ============================================================== */
/* Hand-traced world silhouette covering continents at the scale a
   phone-sized map shows. Drawn in cream over light-blue water — OSM
   Mapnik palette match (#A9D2E8 water, #F2EFE9 land). */
const WORLD_LAND = "M-10,90 C20,70 70,72 110,80 C150,86 175,98 210,98 C240,98 265,88 290,86 C320,84 340,90 360,98 C380,108 396,118 414,118 L424,118 L424,30 L-10,30 Z M40,160 C58,155 76,158 95,168 C112,178 120,194 130,210 C140,228 148,250 162,270 C176,290 200,310 218,322 C238,334 252,340 268,348 C284,358 296,374 302,390 C310,410 314,432 322,452 C328,466 332,476 332,490 L322,510 C310,512 296,508 286,498 C268,478 258,452 250,428 C242,402 234,378 220,360 C200,338 178,322 158,308 C140,294 122,278 110,258 C94,230 80,196 64,178 C56,168 48,162 40,160 Z M210,180 C232,172 256,176 278,184 C296,192 314,206 326,224 C338,242 344,258 348,278 C354,302 360,330 358,358 C354,398 340,438 322,476 C310,500 296,524 280,548 C264,572 248,600 240,632 C232,664 230,700 232,734 C234,758 240,776 232,790 L218,790 C212,772 210,750 208,728 C204,700 204,672 208,644 C214,608 226,572 240,538 C254,506 270,476 282,444 C294,412 304,378 308,344 C312,310 306,278 296,250 C282,222 264,200 244,194 C228,188 218,184 210,180 Z M310,170 C336,168 360,172 380,178 C398,184 412,196 414,212 L414,266 C396,272 378,272 362,266 C346,260 332,250 320,240 C306,228 296,210 296,196 C296,184 302,176 310,170 Z M312,310 C330,304 354,308 372,318 C388,326 402,340 410,358 C414,368 414,378 414,388 L414,438 C400,442 386,440 372,432 C354,420 340,402 332,382 C322,358 314,338 312,318 Z";
function MapPin({ name, top, left, badge }) {
  // Photo-marker: 44px gradient disc + 3px lime ring + drop shadow,
  // 18px white flag bubble bottom-right with a 2-stripe SVG flag stand-in.
  const flagStripes = name === "Ehud"
    ? ["#00267F", "#FFCD00", "#00267F"] // Barbados approximation
    : ["#fff", "#ddd", "#fff"];
  return (
    <div style={{
      position:"absolute", top:`${top}%`, left:`${left}%`,
      transform:"translate(-50%,-50%)",
    }}>
      <div style={{position:"relative", width:44, height:44}}>
        <div style={{
          width:44, height:44, flexShrink:0, aspectRatio:"1", borderRadius:"50%",
          background:gradientFor(name),
          color:"#000", fontSize:16, fontWeight:800,
          display:"flex", alignItems:"center", justifyContent:"center",
          boxShadow:"0 0 0 3px var(--lime), 0 2px 8px rgba(0,0,0,0.45)",
        }}>{name[0]}</div>
        <div style={{
          position:"absolute", bottom:-2, right:-2,
          width:18, height:18, flexShrink:0, aspectRatio:"1", borderRadius:"50%",
          background:"#fff",
          overflow:"hidden",
          boxShadow:"0 1px 3px rgba(0,0,0,0.4)",
          display:"flex", flexDirection:"column",
        }}>
          {flagStripes.map((c,i) => (
            <span key={i} style={{flex:1, background:c}}/>
          ))}
        </div>
        {badge ? (
          <div style={{
            position:"absolute", top:-2, right:-2,
            width:18, height:18, flexShrink:0, aspectRatio:"1", borderRadius:"50%",
            background: badge === "match" ? "var(--lime)" : badge === "chat" ? "var(--lavender)" : "var(--pink)",
            display:"flex", alignItems:"center", justifyContent:"center",
            border:"2px solid #fff",
            color:"#000", fontSize:10, fontWeight:800,
          }}>
            {badge === "match" ? <Icon name="sparkles" size={9} color="#000"/> :
             badge === "chat" ? <Icon name="msg" size={9} color="#000" fill="#000"/> :
             <Icon name="heart" size={9} color="#fff" fill="#fff"/>}
          </div>
        ) : null}
      </div>
    </div>
  );
}
function MapScreen() {
  return (
    <Phone label="Map">
      {/* OSM-style water + land silhouette. */}
      <div style={{position:"absolute", inset:"44px 0 0", background:"#A9D2E8", overflow:"hidden"}}>
        <svg width="100%" height="100%" viewBox="0 0 414 780" preserveAspectRatio="xMidYMid slice"
             style={{display:"block"}} aria-hidden="true">
          <path d={WORLD_LAND} fill="#F2EFE9" stroke="#D8D2C6" strokeWidth="0.8"/>
        </svg>
      </div>

      {/* Top bar — black/55 backdrop blur, full-width per real /map page. */}
      <div style={{
        position:"absolute", top:44, left:0, right:0,
        padding:"12px 16px",
        background:"rgba(0,0,0,0.55)",
        backdropFilter:"blur(12px) saturate(160%)",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        zIndex:10,
      }}>
        <BrandMark size="sm" wordColor="#fff"/>
        {/* tone="elevated" = bg-bg-elevated dark indigo, white icon. */}
        <div style={{
          width:48, height:48, flexShrink:0, aspectRatio:"1", borderRadius:"50%",
          background:"var(--bg-elevated)",
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          <Icon name="sliders" size={20} color="#fff"/>
        </div>
      </div>

      {/* Single Barbados-region marker — same density as live screenshot. */}
      <div style={{position:"absolute", inset:"96px 0 80px"}}>
        <MapPin name="Ehud" top={52} left={32} />
      </div>

      {/* Leaflet attribution — bottom-right, tiny grey. */}
      <div style={{
        position:"absolute", bottom:80, right:8,
        fontSize:10, color:"#666", background:"rgba(255,255,255,0.7)",
        padding:"2px 6px", borderRadius:3, zIndex:5,
      }}>
        Leaflet | © OpenStreetMap contributors
      </div>

      <BottomNav active="map" />
    </Phone>
  );
}

/* ============================================================== */
/* 11 — Matches (/matches)                                         */
/* ============================================================== */
function MatchTile({ name, age, location, online }) {
  return (
    <div style={{
      borderRadius:18, overflow:"hidden",
      background:"var(--card)",
      display:"flex", flexDirection:"column",
    }}>
      <div style={{aspectRatio:"4/5", position:"relative", background:gradientFor(name)}}>
        <div style={{
          position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
          color:"rgba(255,255,255,0.20)", fontSize:80, fontWeight:800,
        }}>{name[0]}</div>
      </div>
      <div style={{padding:"10px 12px 12px"}}>
        <div className="t-body-s" style={{color:"var(--ink)", display:"flex", alignItems:"center", gap:6}}>
          {name}, {age}
          {online ? <span style={{width:8,height:8,borderRadius:"50%",background:"var(--lime)"}}/> : null}
        </div>
        <div className="t-caption" style={{color:"var(--ink-3)", display:"flex", alignItems:"center", gap:4, marginTop:2}}>
          <Icon name="mappin" size={11}/>{location}
        </div>
        <div style={{
          marginTop:8, height:36, borderRadius:10,
          background:"transparent", border:"1px solid var(--hairline)",
          color:"var(--ink)",
          display:"flex", alignItems:"center", justifyContent:"center", gap:6,
          fontSize:13, fontWeight:600,
        }}>
          <Icon name="msg" size={14} color="var(--lavender)"/>
          Message
        </div>
      </div>
    </div>
  );
}
function MatchesScreen() {
  const grid = [
    { name:"Yael",   age:27, location:"Jerusalem, IL", online:true },
    { name:"Adina",  age:24, location:"Brooklyn, US",  online:true },
    { name:"Esther", age:28, location:"Paris, FR",     online:false },
    { name:"Rivka",  age:31, location:"Toronto, CA",   online:false },
    { name:"Tirzah", age:22, location:"Tel Aviv, IL",  online:true },
    { name:"Yosef",  age:41, location:"London, UK",    online:false },
  ];
  return (
    <Phone label="Matches">
      <div style={{flex:1, display:"flex", flexDirection:"column", padding:"4px 0 90px", overflow:"hidden"}}>
        {/* Display heading aligned left, no rounded chrome around it. */}
        <div style={{padding:"16px 20px 4px"}}>
          <h1 className="t-display" style={{margin:0, color:"var(--ink)"}}>Matches</h1>
        </div>
        {/* Tabs — variant="brand" per kit: pill-shaped TabsList with rounded
            transparent track; active trigger lights with lime fill. */}
        <div style={{padding:"12px 20px 12px"}}>
          <div style={{
            display:"flex", padding:4, gap:4,
            borderRadius:14,
            background:"transparent",
            border:"1px solid var(--hairline)",
          }}>
            <div style={{
              flex:1, height:40, borderRadius:10,
              background:"var(--lime)", color:"var(--cta-ink, #000)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:14, fontWeight:700,
            }}>Matches</div>
            <div style={{
              flex:1, height:40, borderRadius:10, color:"var(--ink-2)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:14, fontWeight:500, gap:8,
            }}>
              Liked you <Pill variant="lime">7</Pill>
            </div>
          </div>
        </div>
        <div style={{padding:"8px 20px 0", display:"grid", gridTemplateColumns:"1fr 1fr", gap:16}}>
          {grid.map((m,i) => <MatchTile key={i} {...m}/>)}
        </div>
      </div>
      <BottomNav active="matches" />
    </Phone>
  );
}

/* ============================================================== */
/* 12 — Edge state — Locked (/locked)                              */
/* ============================================================== */
function LockedScreen() {
  return (
    <Phone label="Locked">
      <div style={{flex:1, padding:"40px 28px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center", gap:18}}>
        <div style={{
          width:88, height:88, borderRadius:24,
          background:"color-mix(in oklch, var(--lavender) 14%, transparent)",
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          <Icon name="lock" size={40} color="var(--lavender)"/>
        </div>
        <h1 className="t-h2" style={{margin:0, color:"var(--ink)", maxWidth:280}}>
          Account temporarily locked
        </h1>
        <p className="t-body" style={{color:"var(--ink-2)", margin:0, maxWidth:300, lineHeight:1.55}}>
          We noticed unusual activity on your account. We've paused sign-ins
          for 24 hours as a precaution. You can sign back in from this device
          after that.
        </p>
        <div style={{width:"100%", marginTop:8}}>
          <PrimaryBtn tone="outline">
            <Icon name="mail" size={16}/> Contact support
          </PrimaryBtn>
        </div>
      </div>
    </Phone>
  );
}

window.WelcomeScreen = WelcomeScreen;
window.SignUpScreen = SignUpScreen;
window.OnboardingScreen = OnboardingScreen;
window.DiscoverScreen = DiscoverScreen;
window.MatchScreen = MatchScreen;
window.InboxScreen = InboxScreen;
window.ChatScreen = ChatScreen;
window.ProfileScreen = ProfileScreen;
window.ProfileDetailScreen = ProfileDetailScreen;
window.PaywallScreen = PaywallScreen;
window.VerifyScreen = VerifyScreen;
window.SettingsScreen = SettingsScreen;
window.MapScreen = MapScreen;
window.MatchesScreen = MatchesScreen;
window.LockedScreen = LockedScreen;
window.PHONE_W = PHONE_W;
window.PHONE_H = PHONE_H;
})();

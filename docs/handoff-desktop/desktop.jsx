/* eslint-disable react/no-unknown-property */
/* Ahavah — desktop adaptations. 1440×900 frame for each of the 15
   shipped mobile screens. Each is a fresh layout (not just a wider
   phone column) — the design responsibility on desktop is to use the
   horizontal space, not waste it.
   Brand language is preserved verbatim via the same CSS variables.   */
(function(){
const { Icon, Pill, IconBadgeBox, CircleBtn, PrimaryBtn,
        BrandMark, Sparkle } = window;

const DW = 1440;
const DH = 900;

const NAME_GRADIENTS = {
  Yael:    "linear-gradient(135deg,#5524F5 0%,#9F76EA 70%,#BC96FF 100%)",
  Ehud:    "linear-gradient(135deg,#5524F5 0%,#9F76EA 70%,#BC96FF 100%)",
  Adina:   "linear-gradient(135deg,#FF4566 0%,#BC96FF 100%)",
  Esther:  "linear-gradient(135deg,#BC96FF 0%,#FF4566 100%)",
  Daniel:  "linear-gradient(135deg,#1A1340 0%,#5524F5 100%)",
  Rivka:   "linear-gradient(135deg,#FF4566 0%,#5524F5 100%)",
  Tirzah:  "linear-gradient(135deg,#BC96FF 0%,#5524F5 100%)",
  Yosef:   "linear-gradient(135deg,#0F0B1F 0%,#5524F5 100%)",
  Caleb:   "linear-gradient(135deg,#5524F5 0%,#FF4566 100%)",
  Default: "linear-gradient(135deg,#5524F5,#BC96FF)",
};
const g = (n) => NAME_GRADIENTS[n] ?? NAME_GRADIENTS.Default;

/* ---------- Shared chrome --------------------------------------- */

function DesktopShell({ children, label, withSidebar = true, active = "discover" }) {
  return (
    <div style={{
      width:DW, height:DH, position:"relative",
      background:"var(--app)", color:"var(--ink)",
      fontFamily:"'Plus Jakarta Sans', system-ui, sans-serif",
      display:"flex", overflow:"hidden",
    }} aria-label={label}>
      {withSidebar ? <Sidebar active={active}/> : null}
      <div style={{flex:1, minWidth:0, display:"flex", flexDirection:"column"}}>
        {children}
      </div>
    </div>
  );
}

function Sidebar({ active }) {
  const items = [
    { k:"discover", l:"Discover", i:"home"   },
    { k:"map",      l:"Map",      i:"globe"  },
    { k:"matches",  l:"Matches",  i:"heart"  },
    { k:"inbox",    l:"Inbox",    i:"mail", badge:3 },
    { k:"profile",  l:"Profile",  i:"user"   },
  ];
  return (
    <aside style={{
      width:260, flexShrink:0,
      background:"var(--card)",
      borderRight:"1px solid var(--hairline)",
      padding:"28px 16px 20px",
      display:"flex", flexDirection:"column", gap:8,
    }}>
      <div style={{padding:"0 8px 12px"}}>
        <BrandMark size="md" wordColor="var(--ink)"/>
      </div>
      <nav style={{display:"flex", flexDirection:"column", gap:4, marginTop:12}}>
        {items.map(it => {
          const on = it.k === active;
          return (
            <div key={it.k} style={{
              display:"flex", alignItems:"center", gap:12,
              padding:"12px 14px", borderRadius:14,
              background: on ? "color-mix(in oklch, var(--lime) 14%, transparent)" : "transparent",
              color: on ? "var(--ink)" : "var(--ink-2)",
              fontSize:15, fontWeight: on ? 700 : 500,
              cursor:"default",
            }}>
              <span style={{
                width:36, height:36, flexShrink:0, aspectRatio:"1", borderRadius:"50%",
                background: on ? "var(--lime)" : "transparent",
                display:"flex", alignItems:"center", justifyContent:"center",
              }}>
                <Icon name={it.i} size={18}
                      color={on ? "var(--cta-ink, #000)" : "var(--lavender)"}
                      strokeWidth={on ? 2.4 : 1.8}/>
              </span>
              <span style={{flex:1}}>{it.l}</span>
              {it.badge ? <Pill variant="lime">{it.badge}</Pill> : null}
            </div>
          );
        })}
      </nav>
      <div style={{marginTop:"auto", display:"flex", flexDirection:"column", gap:10, paddingTop:16}}>
        <div style={{
          padding:14, borderRadius:14,
          background:"linear-gradient(135deg,#5524F5 0%,#9F76EA 70%,#BC96FF 100%)",
          color:"#fff",
        }}>
          <div className="t-overline" style={{opacity:0.8}}>Premium</div>
          <div className="t-body-s" style={{marginTop:4}}>See everyone who liked you</div>
          <div style={{
            marginTop:10, height:36, borderRadius:10,
            background:"var(--lime)", color:"var(--cta-ink, #000)",
            display:"flex", alignItems:"center", justifyContent:"center", gap:6,
            fontSize:13, fontWeight:700,
          }}>
            <Icon name="sparkles" size={14} color="var(--cta-ink, #000)"/> Upgrade
          </div>
        </div>
        <div style={{
          display:"flex", alignItems:"center", gap:10,
          padding:"10px 8px", borderRadius:12,
        }}>
          <span style={{
            width:36, height:36, flexShrink:0, aspectRatio:"1", borderRadius:"50%",
            background:"var(--bg-indigo)", color:"var(--lime)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:14, fontWeight:800,
          }}>E</span>
          <div style={{flex:1, minWidth:0}}>
            <div className="t-meta" style={{color:"var(--ink)", fontWeight:600}}>Ehud, 42</div>
            <div className="t-caption" style={{color:"var(--ink-3)"}}>Bronze verified</div>
          </div>
          <Icon name="settings" size={16} color="var(--ink-3)"/>
        </div>
      </div>
    </aside>
  );
}

function TopBar({ title, right }) {
  return (
    <header style={{
      height:72, padding:"0 32px",
      borderBottom:"1px solid var(--hairline)",
      display:"flex", alignItems:"center", justifyContent:"space-between",
      flexShrink:0,
    }}>
      <h1 className="t-h1" style={{margin:0, color:"var(--ink)"}}>{title}</h1>
      <div style={{display:"flex", alignItems:"center", gap:10}}>{right}</div>
    </header>
  );
}

/* ===============================================================
   1 · Welcome / sign-in (no sidebar)
   Split-hero: brand statement left, signup form right.
   =============================================================== */
function WelcomeDesktop() {
  return (
    <DesktopShell label="Welcome" withSidebar={false}>
      <div style={{flex:1, display:"grid", gridTemplateColumns:"7fr 5fr"}}>
        {/* Left — brand statement */}
        <div style={{
          padding:"56px 64px",
          background:"linear-gradient(135deg, var(--app) 0%, color-mix(in oklch, var(--lavender) 20%, var(--app)) 100%)",
          display:"flex", flexDirection:"column", justifyContent:"space-between",
          position:"relative", overflow:"hidden",
        }}>
          {/* Decorative sparkles */}
          {[[80,420,52,"#D7FF81"],[420,180,40,"#BC96FF"],[640,520,32,"#FF4566"]].map(([l,t,s,c],i)=>(
            <span key={i} style={{position:"absolute", left:l, top:t, opacity:0.45}}>
              <Sparkle size={s} color={c}/>
            </span>
          ))}
          <BrandMark size="lg" wordColor="var(--ink)"/>
          <div style={{maxWidth:540, position:"relative"}}>
            <h1 style={{
              margin:0, fontSize:80, lineHeight:0.95, letterSpacing:"-0.03em", fontWeight:800,
              color:"var(--ink)",
            }}>
              Find love<br/>across borders<span style={{color:"var(--lime)"}}>.</span>
            </h1>
            <p style={{marginTop:24, fontSize:20, lineHeight:1.55, color:"var(--ink-2)", maxWidth:460}}>
              Verified profiles, 100+ languages, real connections.
              Built for Torah-observant singles who don't fit anywhere else.
            </p>
            <div style={{display:"flex", gap:24, marginTop:36}}>
              {[
                ["12,400+", "verified profiles"],
                ["63", "countries served"],
                ["3,200+", "ongoing chats"],
              ].map(([k,v]) => (
                <div key={k}>
                  <div className="t-h2" style={{color:"var(--ink)"}}>{k}</div>
                  <div className="t-caption" style={{color:"var(--ink-3)"}}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="t-caption" style={{color:"var(--ink-3)", position:"relative"}}>
            © 2026 Ahavah — Made for the diaspora.
          </div>
        </div>
        {/* Right — signup card */}
        <div style={{
          padding:"56px", display:"flex", flexDirection:"column", justifyContent:"center", gap:24,
          background:"var(--card)",
          borderLeft:"1px solid var(--hairline)",
        }}>
          <div>
            <div className="t-overline" style={{color:"var(--ink-2)"}}>Start here</div>
            <h2 className="t-display" style={{marginTop:6, color:"var(--ink)"}}>Create your account</h2>
            <p className="t-meta" style={{marginTop:8, color:"var(--ink-2)"}}>
              We'll email you a 6-digit code. No password to remember.
            </p>
          </div>
          <div style={{display:"flex", flexDirection:"column", gap:12}}>
            <div style={{
              height:56, borderRadius:14, background:"var(--app)",
              border:"1.5px solid var(--lavender)", padding:"0 18px",
              display:"flex", alignItems:"center", color:"var(--ink)", fontSize:16,
            }}>ehud@proton.me</div>
            <div style={{display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:8}}>
              {["@gmail.com","@proton.me","@yahoo.com","@hotmail.com","@outlook.com"].map(s => (
                <div key={s} style={{
                  height:40, borderRadius:10, border:"1px solid rgba(188,150,255,0.5)",
                  color:"var(--lavender)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:12, fontWeight:500,
                }}>{s}</div>
              ))}
            </div>
          </div>
          <PrimaryBtn tone="cta">Send me a code</PrimaryBtn>
          <div className="t-meta" style={{textAlign:"center", color:"var(--ink-2)"}}>
            Already have an account? <span style={{color:"var(--lavender)", fontWeight:600}}>Sign in</span>
          </div>
        </div>
      </div>
    </DesktopShell>
  );
}

/* ===============================================================
   1b · Sign up (full-screen card on left, illustration right)
   =============================================================== */
function SignUpDesktop() {
  return (
    <DesktopShell label="Sign up" withSidebar={false}>
      <div style={{flex:1, display:"grid", gridTemplateColumns:"5fr 7fr"}}>
        <div style={{padding:"56px 64px", display:"flex", flexDirection:"column", gap:24, background:"var(--card)"}}>
          <BrandMark size="md" wordColor="var(--ink)"/>
          <div style={{flex:1, display:"flex", flexDirection:"column", justifyContent:"center", gap:18, maxWidth:420}}>
            <div>
              <h2 className="t-display" style={{margin:0, color:"var(--ink)"}}>Create your account<span style={{color:"var(--lime)"}}>.</span></h2>
              <p className="t-meta" style={{marginTop:10, color:"var(--ink-2)"}}>
                We'll email you a 6-digit code to sign in.
              </p>
            </div>
            <div>
              <div className="t-caption" style={{color:"var(--ink-2)", marginBottom:6}}>Email</div>
              <div style={{
                height:56, borderRadius:14, background:"var(--app)",
                border:"1.5px solid var(--lavender)", padding:"0 18px",
                display:"flex", alignItems:"center", color:"var(--ink)", fontSize:16,
              }}>ehud@proton.me</div>
            </div>
            <div>
              <div className="t-caption" style={{color:"var(--ink-2)", marginBottom:6}}>Password</div>
              <div style={{
                height:56, borderRadius:14, background:"var(--app)",
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
            <div style={{display:"flex", gap:10, alignItems:"flex-start"}}>
              <div style={{
                width:22, height:22, borderRadius:6, flexShrink:0,
                background:"var(--lime)",
                display:"flex", alignItems:"center", justifyContent:"center",
                marginTop:2,
              }}>
                <Icon name="check" size={14} color="#000" strokeWidth={3}/>
              </div>
              <div className="t-caption" style={{color:"var(--ink-2)", lineHeight:1.5}}>
                I'm 18+, and I agree to the <u style={{color:"var(--ink)"}}>Terms</u> & <u style={{color:"var(--ink)"}}>Privacy Policy</u>.
              </div>
            </div>
            <PrimaryBtn tone="cta">Send me a code</PrimaryBtn>
          </div>
        </div>
        {/* Right — visual */}
        <div style={{
          background:"linear-gradient(135deg, var(--bg-indigo) 0%, var(--bg-elevated) 100%)",
          position:"relative", overflow:"hidden", padding:64,
          display:"flex", flexDirection:"column", justifyContent:"flex-end",
        }}>
          {/* Floating profile cards */}
          {[
            {n:"Yael",   x:60,  y:80,  rot:-6, scale:1.0},
            {n:"Adina",  x:300, y:200, rot:4,  scale:1.1},
            {n:"Daniel", x:540, y:120, rot:-3, scale:0.95},
            {n:"Esther", x:140, y:380, rot:5,  scale:1.05},
            {n:"Rivka",  x:430, y:430, rot:-4, scale:1.0},
          ].map(c => (
            <div key={c.n} style={{
              position:"absolute", left:c.x, top:c.y,
              width:180, height:220, borderRadius:18, overflow:"hidden",
              background:g(c.n),
              border:"3px solid #fff",
              transform:`rotate(${c.rot}deg) scale(${c.scale})`,
              boxShadow:"0 16px 40px rgba(0,0,0,0.45)",
            }}>
              <div style={{
                position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
                color:"rgba(255,255,255,0.25)", fontSize:80, fontWeight:800,
              }}>{c.n[0]}</div>
              <div style={{
                position:"absolute", left:14, right:14, bottom:14,
                color:"#fff", fontSize:16, fontWeight:700,
                textShadow:"0 1px 4px rgba(0,0,0,0.6)",
              }}>{c.n}</div>
            </div>
          ))}
          <div style={{position:"relative", color:"#fff", maxWidth:420}}>
            <Sparkle size={36} color="#D7FF81"/>
            <div style={{marginTop:18, fontSize:32, fontWeight:800, letterSpacing:"-0.02em", lineHeight:1.1}}>
              Real people.<br/>Verified profiles.
            </div>
            <p style={{marginTop:12, fontSize:16, color:"rgba(255,255,255,0.7)"}}>
              Every member completes selfie verification before they can match.
            </p>
          </div>
        </div>
      </div>
    </DesktopShell>
  );
}

/* ===============================================================
   1c · Onboarding (wizard center column with side context)
   =============================================================== */
function OnboardingDesktop() {
  return (
    <DesktopShell label="Onboarding" withSidebar={false}>
      <div style={{flex:1, display:"grid", gridTemplateColumns:"1fr 720px 1fr"}}>
        <div style={{
          background:"linear-gradient(135deg, var(--app) 0%, color-mix(in oklch, var(--lavender) 16%, var(--app)) 100%)",
          padding:48,
        }}>
          <BrandMark size="sm" wordColor="var(--ink)"/>
        </div>
        <div style={{padding:"48px 56px", display:"flex", flexDirection:"column"}}>
          {/* Stepper */}
          <div style={{display:"flex", alignItems:"center", gap:12}}>
            <div style={{
              width:40, height:40, flexShrink:0, aspectRatio:"1", borderRadius:"50%",
              background:"var(--card)", border:"1px solid var(--hairline)",
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              <Icon name="chevl" size={20} color="var(--ink)"/>
            </div>
            <div style={{flex:1, display:"flex", gap:4}}>
              {Array.from({length:16}).map((_,i)=>(
                <div key={i} style={{
                  flex:1, height:4, borderRadius:2,
                  background: i < 1 ? "var(--lime)" : "var(--hairline)",
                }}/>
              ))}
            </div>
            <div className="t-caption" style={{color:"var(--ink-3)"}}>1 / 16</div>
          </div>
          <div style={{flex:1, display:"flex", flexDirection:"column", justifyContent:"center", gap:32, paddingBlock:48}}>
            <div>
              <h1 style={{margin:0, fontSize:48, lineHeight:1.1, letterSpacing:"-0.025em", fontWeight:800, color:"var(--ink)"}}>
                What's your name<span style={{color:"var(--lime)"}}>?</span>
              </h1>
              <p className="t-body" style={{marginTop:14, color:"var(--ink-2)"}}>
                This is what people will see.
              </p>
            </div>
            <div style={{display:"flex", flexDirection:"column", gap:8}}>
              <div className="t-meta" style={{color:"var(--ink)"}}>First name</div>
              <div style={{
                height:64, borderRadius:18, background:"var(--card)",
                border:"1.5px solid var(--lavender)", padding:"0 22px",
                display:"flex", alignItems:"center", color:"var(--ink)", fontSize:20,
              }}>Ehud<span style={{width:1.5, height:24, background:"var(--lavender)", marginLeft:4}}/></div>
              <div style={{display:"flex", justifyContent:"space-between"}}>
                <div className="t-caption" style={{color:"var(--ink-3)"}}>
                  Just your first name, change anytime in Settings.
                </div>
                <div className="t-caption" style={{color:"var(--ink-3)", fontVariantNumeric:"tabular-nums"}}>4/30</div>
              </div>
            </div>
          </div>
          <PrimaryBtn tone="cta">Continue</PrimaryBtn>
        </div>
        <div style={{
          background:"var(--card)",
          padding:48, display:"flex", flexDirection:"column", gap:18,
        }}>
          <div className="t-overline" style={{color:"var(--ink-2)"}}>What's next</div>
          {[
            ["Name & basics", true],
            ["Photos", false],
            ["Identity", false],
            ["Faith & doctrine", false],
            ["Lifestyle", false],
            ["Looking for", false],
            ["Verification", false],
          ].map(([l,done], i) => (
            <div key={l} style={{display:"flex", alignItems:"center", gap:12}}>
              <span style={{
                width:24, height:24, flexShrink:0, aspectRatio:"1", borderRadius:"50%",
                background: done ? "var(--lime)" : "var(--hairline)",
                color: done ? "#000" : "var(--ink-3)",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:12, fontWeight:800,
              }}>{done ? <Icon name="check" size={12} color="#000" strokeWidth={3}/> : i+1}</span>
              <span className="t-meta" style={{color: done ? "var(--ink)" : "var(--ink-2)"}}>{l}</span>
            </div>
          ))}
        </div>
      </div>
    </DesktopShell>
  );
}

/* ===============================================================
   2 · Discover (center card + filters rail + activity rail)
   =============================================================== */
function DiscoverDesktop() {
  return (
    <DesktopShell label="Discover" active="discover">
      <TopBar title="Discover" right={
        <div style={{display:"flex", alignItems:"center", gap:10}}>
          <Pill variant="glassDark"><Icon name="sliders" size={12}/> 1 filter</Pill>
          <div style={{
            width:40, height:40, flexShrink:0, aspectRatio:"1", borderRadius:"50%",
            background:"var(--card)", border:"1px solid var(--hairline)",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}><Icon name="bell" size={18} color="var(--lavender)"/></div>
        </div>
      }/>
      <div style={{flex:1, display:"grid", gridTemplateColumns:"260px 1fr 320px", gap:24, padding:24, overflow:"hidden"}}>
        {/* Left filter rail */}
        <div style={{display:"flex", flexDirection:"column", gap:14}}>
          <div className="t-overline" style={{color:"var(--ink-2)"}}>Filters</div>
          {[
            ["Age range", "27 – 38"],
            ["Country", "Israel, US"],
            ["Languages", "Hebrew, English"],
            ["Marital status", "Never married"],
            ["Verified only", "Yes"],
          ].map(([k,v])=>(
            <div key={k} style={{
              padding:"14px 16px", borderRadius:14,
              background:"var(--card)", border:"1px solid var(--hairline)",
            }}>
              <div className="t-caption" style={{color:"var(--ink-3)"}}>{k}</div>
              <div className="t-meta" style={{color:"var(--ink)", marginTop:2, fontWeight:600}}>{v}</div>
            </div>
          ))}
          <div style={{
            marginTop:8, height:44, borderRadius:12,
            border:"1px solid var(--hairline)", color:"var(--ink)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:14, fontWeight:600,
          }}>Reset filters</div>
        </div>

        {/* Center card */}
        <div style={{
          display:"flex", flexDirection:"column", alignItems:"center",
          justifyContent:"center", gap:24,
        }}>
          <div style={{
            width:460, height:640, borderRadius:28,
            background:g("Ehud"), position:"relative", overflow:"hidden",
            boxShadow:"0 24px 60px rgba(0,0,0,0.45)",
          }}>
            <div style={{position:"absolute", top:22, left:22, right:22, display:"flex", gap:6}}>
              {[1,0,0].map((on,i)=>(
                <div key={i} style={{
                  flex:1, height:5, borderRadius:999,
                  background: on ? "var(--lime)" : "rgba(255,255,255,0.18)",
                  boxShadow: on ? "0 0 8px rgba(215,255,129,0.45)" : "none",
                }}/>
              ))}
            </div>
            <div style={{
              position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
              color:"rgba(255,255,255,0.18)", fontSize:240, fontWeight:800,
            }}>E</div>
            <div style={{
              position:"absolute", left:0, right:0, bottom:0, padding:"100px 32px 28px",
              background:"linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.7) 100%)",
            }}>
              <div style={{display:"flex", alignItems:"center", gap:8}}>
                <div style={{fontSize:32, fontWeight:800, color:"#fff", letterSpacing:"-0.02em"}}>Ehud, 42</div>
                <Icon name="chevr" size={24} color="rgba(255,255,255,0.7)"/>
              </div>
              <div style={{marginTop:8, color:"rgba(255,255,255,0.85)", display:"flex", alignItems:"center", gap:6, fontSize:14}}>
                <Icon name="mappin" size={14}/> Blackmans, BB · Last seen 2h ago
              </div>
            </div>
          </div>
          <div style={{display:"flex", alignItems:"center", gap:28}}>
            <CircleBtn tone="brand" size={64}><Icon name="x" size={26} color="#000" strokeWidth={2.4}/></CircleBtn>
            <CircleBtn tone="cta" size={80}><Icon name="play" size={32} color="#000" fill="#000"/></CircleBtn>
            <CircleBtn tone="action" size={64}><Icon name="heart" size={26} color="#fff" fill="#fff"/></CircleBtn>
          </div>
        </div>

        {/* Right activity rail */}
        <div style={{display:"flex", flexDirection:"column", gap:14}}>
          <div className="t-overline" style={{color:"var(--ink-2)"}}>New likes</div>
          <div style={{
            padding:18, borderRadius:18,
            background:"linear-gradient(135deg, #5524F5 0%, #BC96FF 100%)",
            color:"#fff",
          }}>
            <div className="t-overline" style={{opacity:0.85}}>3 likes this week</div>
            <div className="t-h3" style={{marginTop:6}}>See who liked you</div>
            <div style={{marginTop:12, display:"flex", gap:-12}}>
              {["Yael","Adina","Esther"].map((n,i)=>(
                <div key={n} style={{
                  width:40, height:40, flexShrink:0, aspectRatio:"1", borderRadius:"50%",
                  background:g(n), color:"#fff",
                  border:"2px solid #fff",
                  marginLeft: i === 0 ? 0 : -12,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:14, fontWeight:700, filter:"blur(2.5px)",
                }}>{n[0]}</div>
              ))}
            </div>
            <div style={{
              marginTop:12, height:36, borderRadius:10,
              background:"var(--lime)", color:"var(--cta-ink, #000)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:13, fontWeight:700,
            }}>Unlock with Premium</div>
          </div>

          <div className="t-overline" style={{color:"var(--ink-2)", marginTop:10}}>Recently seen</div>
          {[
            { n:"Yael",   age:27, loc:"Jerusalem, IL", online:true },
            { n:"Adina",  age:24, loc:"Brooklyn, US",  online:true },
            { n:"Esther", age:28, loc:"Paris, FR",     online:false },
          ].map(p => (
            <div key={p.n} style={{
              display:"flex", alignItems:"center", gap:12,
              padding:"10px 12px", borderRadius:14,
              background:"var(--card)", border:"1px solid var(--hairline)",
            }}>
              <div style={{
                width:44, height:44, flexShrink:0, aspectRatio:"1", borderRadius:"50%",
                background:"var(--bg-indigo)", color:"var(--lime)",
                fontSize:16, fontWeight:800,
                display:"flex", alignItems:"center", justifyContent:"center",
                position:"relative",
              }}>{p.n[0]}
                {p.online ? <span style={{
                  position:"absolute", top:0, right:0,
                  width:10, height:10, flexShrink:0, aspectRatio:"1", borderRadius:"50%",
                  background:"var(--lime)", border:"2px solid var(--card)",
                }}/> : null}
              </div>
              <div style={{flex:1, minWidth:0}}>
                <div className="t-meta" style={{color:"var(--ink)", fontWeight:600}}>{p.n}, {p.age}</div>
                <div className="t-caption" style={{color:"var(--ink-3)"}}>{p.loc}</div>
              </div>
              <Icon name="chevr" size={14} color="var(--ink-3)"/>
            </div>
          ))}
        </div>
      </div>
    </DesktopShell>
  );
}

/* ===============================================================
   3 · Match celebration — full-bleed celebration, no sidebar
   =============================================================== */
function MatchDesktop() {
  return (
    <DesktopShell label="Match" withSidebar={false}>
      <div style={{
        flex:1, position:"relative", overflow:"hidden",
        background:"radial-gradient(ellipse 50% 40% at 50% 30%, color-mix(in oklch, var(--lime) 18%, transparent), transparent 70%), radial-gradient(ellipse 60% 50% at 50% 90%, color-mix(in oklch, var(--pink) 12%, transparent), transparent 75%), var(--app)",
        display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:64,
      }}>
        <div style={{position:"absolute", top:32, right:32}}>
          <div style={{width:48, height:48, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center"}}>
            <Icon name="x" size={26} color="var(--ink)"/>
          </div>
        </div>
        {/* Photo pair */}
        <div style={{position:"relative", display:"flex", alignItems:"center", marginBottom:48}}>
          <div style={{
            position:"absolute", inset:-60, borderRadius:"50%",
            background:"radial-gradient(circle, color-mix(in oklch, var(--lime) 30%, transparent), transparent 70%)",
            filter:"blur(28px)",
          }}/>
          <div style={{
            position:"relative", zIndex:1,
            width:280, height:340, borderRadius:32, overflow:"hidden",
            border:"4px solid #fff", background:g("Ehud"),
            transform:"rotate(-4deg)",
            boxShadow:"0 20px 60px rgba(0,0,0,0.45)",
          }}>
            <div style={{
              position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
              color:"rgba(255,255,255,0.22)", fontSize:140, fontWeight:800,
            }}>E</div>
          </div>
          <div style={{
            position:"relative", zIndex:1, marginLeft:-50, marginTop:24,
            width:280, height:340, borderRadius:32, overflow:"hidden",
            border:"4px solid #fff", background:g("Yael"),
            transform:"rotate(6deg)",
            boxShadow:"0 20px 60px rgba(0,0,0,0.45)",
          }}>
            <div style={{
              position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
              color:"rgba(255,255,255,0.22)", fontSize:140, fontWeight:800,
            }}>Y</div>
          </div>
          <div style={{position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", zIndex:2}}>
            <Sparkle size={56} color="#D7FF81"/>
          </div>
        </div>
        <div style={{
          padding:"18px 38px", borderRadius:22, background:"var(--lime)",
          color:"#000", transform:"rotate(-3deg)",
          boxShadow:"0 12px 40px rgba(215,255,129,0.45)",
        }}>
          <span style={{fontSize:48, fontWeight:800, letterSpacing:"-0.02em", lineHeight:1}}>It's a match!</span>
        </div>
        <p className="t-body" style={{marginTop:32, color:"var(--ink-2)", textAlign:"center"}}>
          You and <span style={{color:"var(--lavender)", fontWeight:600}}>Yael</span> liked each other.
        </p>
        <div style={{marginTop:36, display:"flex", gap:14, alignItems:"center", width:480}}>
          <div style={{
            flex:1, height:56, borderRadius:16, background:"var(--card)",
            border:"1px solid var(--hairline)", padding:"0 8px 0 18px",
            display:"flex", alignItems:"center", gap:12,
          }}>
            <span style={{flex:1, color:"var(--ink-3)", fontSize:16}}>Say hi to Yael…</span>
            <CircleBtn tone="cta" size={44}><Icon name="send" size={18} color="#000"/></CircleBtn>
          </div>
          <div style={{
            height:56, padding:"0 22px", borderRadius:16,
            border:"1px solid var(--border)", color:"var(--ink)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:14, fontWeight:600, whiteSpace:"nowrap",
          }}>View Yael's profile</div>
        </div>
      </div>
    </DesktopShell>
  );
}

/* ===============================================================
   4 · Inbox + Chat — list rail + thread pane
   =============================================================== */
function InboxDesktop() {
  const rows = [
    { name:"Yael",   age:27, msg:"Shabbat shalom! How was your week?", time:"9:32", unread:2, active:true },
    { name:"Adina",  age:24, msg:"That sounds wonderful — yes I'd love to meet up.", time:"8:14", unread:1 },
    { name:"Esther", age:28, msg:"You: Thanks for sharing the article 🙂", time:"Mon" },
    { name:"Rivka",  age:31, msg:"I think Tuesday works better for me…", time:"Mon" },
    { name:"Tirzah", age:22, msg:"You: Looking forward to it!", time:"Sun" },
    { name:"Daniel", age:32, msg:"Same here — let me know if you want suggestions.", time:"Sat" },
    { name:"Yosef",  age:41, msg:"Have a good week!", time:"Fri" },
  ];
  return (
    <DesktopShell label="Inbox" active="inbox">
      <div style={{flex:1, display:"grid", gridTemplateColumns:"380px 1fr", overflow:"hidden"}}>
        {/* List rail */}
        <div style={{
          borderRight:"1px solid var(--hairline)",
          display:"flex", flexDirection:"column", overflow:"hidden",
        }}>
          <div style={{padding:"24px 24px 12px"}}>
            <h2 className="t-h1" style={{margin:0, color:"var(--ink)"}}>Chat</h2>
            <div style={{
              marginTop:12, height:44, borderRadius:14, background:"var(--card)",
              border:"1px solid var(--hairline)", padding:"0 16px",
              display:"flex", alignItems:"center", gap:10, color:"var(--ink-3)", fontSize:14,
            }}>
              <Icon name="search" size={16} color="var(--ink-3)"/> Search conversations
            </div>
          </div>
          <div style={{flex:1, overflow:"hidden", padding:"4px 8px"}}>
            {rows.map((r,i) => (
              <div key={i} style={{
                display:"flex", alignItems:"center", gap:14,
                padding:"12px 14px", borderRadius:14,
                background: r.active ? "color-mix(in oklch, var(--lavender) 14%, transparent)" : "transparent",
              }}>
                <div style={{
                  width:48, height:48, flexShrink:0, aspectRatio:"1", borderRadius:"50%",
                  background:"var(--bg-indigo)", color:"var(--lime)", fontSize:18, fontWeight:800,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  border: r.unread ? "2.5px solid var(--lime)" : "none",
                  boxSizing:"border-box",
                }}>{r.name[0]}</div>
                <div style={{flex:1, minWidth:0}}>
                  <div className="t-meta" style={{color:"var(--ink)", fontWeight:600}}>{r.name}, {r.age}</div>
                  <div style={{
                    fontSize:13, color: r.unread ? "var(--ink)" : "var(--ink-2)",
                    fontWeight: r.unread ? 500 : 400,
                    whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:240,
                  }}>{r.msg}</div>
                </div>
                <div style={{display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4}}>
                  <div className="t-caption" style={{color:"var(--ink-3)"}}>{r.time}</div>
                  {r.unread ? <Pill variant="lime">{r.unread}</Pill> : null}
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Thread pane */}
        <ChatThreadPane />
      </div>
    </DesktopShell>
  );
}
function ChatThreadPane() {
  const Bubble = ({ side, children }) => {
    const them = side === "them";
    return (
      <div style={{
        display:"flex", alignItems:"flex-end", gap:10,
        alignSelf: them ? "flex-start" : "flex-end",
        maxWidth:560,
      }}>
        {them ? (
          <div style={{
            width:32, height:32, flexShrink:0, aspectRatio:"1", borderRadius:"50%",
            background:"var(--bg-indigo)", color:"var(--lime)", fontSize:13, fontWeight:800,
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>Y</div>
        ) : null}
        <div style={{
          padding:"14px 18px", borderRadius:20,
          background: them ? "var(--lavender)" : "var(--lime)",
          color:"#000", fontSize:16, lineHeight:1.45,
          borderBottomLeftRadius: them ? 6 : 20,
          borderBottomRightRadius: them ? 20 : 6,
        }}>{children}</div>
      </div>
    );
  };
  return (
    <div style={{display:"flex", flexDirection:"column", overflow:"hidden"}}>
      {/* Header */}
      <div style={{
        padding:"18px 32px", display:"flex", alignItems:"center", gap:14,
        borderBottom:"1px solid var(--hairline)", flexShrink:0,
      }}>
        <div style={{
          width:48, height:48, flexShrink:0, aspectRatio:"1", borderRadius:"50%",
          background:"var(--bg-indigo)", color:"var(--lime)",
          fontSize:18, fontWeight:800,
          display:"flex", alignItems:"center", justifyContent:"center",
          position:"relative",
        }}>Y
          <span style={{
            position:"absolute", bottom:0, right:0, width:12, height:12,
            borderRadius:"50%", background:"var(--lime)", border:"2.5px solid var(--app)",
          }}/>
        </div>
        <div style={{flex:1}}>
          <div className="t-h3" style={{color:"var(--ink)"}}>Yael, 27</div>
          <div className="t-caption" style={{color:"var(--ink-2)"}}>Online now · Jerusalem, IL</div>
        </div>
        <div style={{display:"flex", gap:10}}>
          <div style={{
            width:40, height:40, borderRadius:"50%",
            background:"var(--card)", border:"1px solid var(--hairline)",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}><Icon name="phone" size={18} color="var(--lavender)"/></div>
          <div style={{
            width:40, height:40, borderRadius:"50%",
            background:"var(--card)", border:"1px solid var(--hairline)",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}><Icon name="more" size={18} color="var(--ink-2)"/></div>
        </div>
      </div>
      {/* Messages */}
      <div style={{
        flex:1, overflow:"hidden", padding:"24px 32px",
        display:"flex", flexDirection:"column", gap:14,
      }}>
        <div className="t-caption" style={{alignSelf:"center", color:"var(--ink-3)", padding:"4px 12px"}}>
          You matched on Sunday
        </div>
        <Bubble side="them">Shalom! Loved your photo of the Old City — when was that taken?</Bubble>
        <Bubble side="me">Last Sukkot 🌿 I try to get back every few months. You?</Bubble>
        <Bubble side="them">I live in Jerusalem actually — Nachlaot. Have you ever been?</Bubble>
        <Bubble side="me">Once, years ago. I remember the courtyards and the cats everywhere.</Bubble>
        <Bubble side="them">Ha! The cats are still in charge. Coffee if you're ever back?</Bubble>
      </div>
      {/* Composer */}
      <div style={{
        padding:"16px 32px 24px", display:"flex", alignItems:"center", gap:14,
        flexShrink:0,
      }}>
        <div style={{
          flex:1, height:56, borderRadius:24, background:"var(--card)",
          border:"1px solid var(--hairline)", padding:"0 22px",
          display:"flex", alignItems:"center", color:"var(--ink-3)", fontSize:16,
        }}>Type a message…</div>
        <CircleBtn tone="cta" size={56}><Icon name="send" size={22} color="#000"/></CircleBtn>
      </div>
    </div>
  );
}

/* ===============================================================
   5 · Profile (own) — sidebar + hero card + detail rows
   =============================================================== */
function ProfileDesktop() {
  return (
    <DesktopShell label="Profile" active="profile">
      <TopBar title="Profile"/>
      <div style={{flex:1, padding:32, display:"grid", gridTemplateColumns:"480px 1fr", gap:32, overflow:"hidden"}}>
        <div style={{display:"flex", flexDirection:"column", gap:24}}>
          {/* Hero */}
          <div style={{
            borderRadius:28, padding:28, color:"#fff",
            background:"linear-gradient(135deg,#5524F5 0%,#9F76EA 70%,#BC96FF 100%)",
          }}>
            <div style={{display:"flex", alignItems:"center", gap:20}}>
              <div style={{
                width:80, height:80, flexShrink:0, aspectRatio:"1", borderRadius:"50%",
                background:"var(--bg-indigo)", color:"var(--lime)",
                fontSize:32, fontWeight:800,
                display:"flex", alignItems:"center", justifyContent:"center",
                boxShadow:"0 0 0 3px rgba(255,255,255,0.4)",
              }}>E</div>
              <div style={{flex:1}}>
                <div className="t-h1">Ehud, 42</div>
                <div style={{marginTop:8}}>
                  <Pill variant="glassDark"><Icon name="shield" size={11}/> Bronze verified</Pill>
                </div>
              </div>
            </div>
            <div style={{marginTop:24}}>
              <PrimaryBtn tone="cta">
                <Icon name="sparkles" size={16} color="var(--cta-ink, #000)"/> Upgrade to Premium
              </PrimaryBtn>
            </div>
          </div>
          {/* Profile completeness */}
          <div style={{
            padding:20, borderRadius:18,
            background:"var(--card)", border:"1px solid var(--hairline)",
          }}>
            <div style={{display:"flex", alignItems:"center", justifyContent:"space-between"}}>
              <div className="t-meta" style={{color:"var(--ink)", fontWeight:600}}>Profile completeness</div>
              <div className="t-meta" style={{color:"var(--lime)", fontWeight:700}}>76%</div>
            </div>
            <div style={{marginTop:10, height:8, borderRadius:4, background:"var(--hairline)"}}>
              <div style={{width:"76%", height:"100%", borderRadius:4, background:"var(--lime)"}}/>
            </div>
            <div className="t-caption" style={{marginTop:8, color:"var(--ink-3)"}}>
              Add 2 more photos and write a bio to reach 100%.
            </div>
          </div>
        </div>
        <div style={{display:"flex", flexDirection:"column", gap:14}}>
          {[
            { Icon: "userpen",  t:"Edit profile", s:"Photos, bio, basics", tone:"brand" },
            { Icon: "shield",   t:"Verification", s:"Bronze · upgrade to Silver", tone:"success" },
            { Icon: "card",     t:"Subscription", s:"Free · upgrade to Premium", tone:"success" },
            { Icon: "settings", t:"Settings",     s:"Notifications, privacy, account", tone:"muted" },
            { Icon: "help",     t:"Help center",  s:"FAQs, contact support", tone:"muted" },
          ].map(r => (
            <div key={r.t} style={{
              display:"flex", alignItems:"center", gap:18,
              padding:"22px 24px", borderRadius:18,
              background:"var(--card)", border:"1px solid var(--hairline)",
            }}>
              <IconBadgeBox tone={r.tone}><Icon name={r.Icon} size={20}/></IconBadgeBox>
              <div style={{flex:1}}>
                <div className="t-body-s" style={{color:"var(--ink)"}}>{r.t}</div>
                <div className="t-caption" style={{color:"var(--ink-3)"}}>{r.s}</div>
              </div>
              <Icon name="chevr" size={18} color="var(--ink-3)"/>
            </div>
          ))}
        </div>
      </div>
    </DesktopShell>
  );
}

/* ===============================================================
   5b · Profile detail (peer) — gallery + bio
   =============================================================== */
function ProfileDetailDesktop() {
  // 2-column rebuild — the prior 3-column grid (640 / 1fr / 360) squeezed
  // the middle pane to ~50px on a 1180px content area. New layout: photos
  // left (540px), bio panel right (flex), action row promoted to a sticky
  // bar above the bio so it's discoverable without scrolling.
  const interests = ["Hiking","Shabbat","Torah study","Israeli music","Hebrew","Coffee","Cooking","Travel","Hebrew calligraphy","Backgammon"];
  return (
    <DesktopShell label="Profile detail" active="discover">
      <div style={{flex:1, padding:"24px 32px 32px", display:"grid",
                   gridTemplateColumns:"540px 1fr", gap:32, overflow:"hidden"}}>
        {/* Photo gallery */}
        <div style={{display:"flex", flexDirection:"column", gap:14, overflow:"hidden"}}>
          <div style={{
            display:"flex", alignItems:"center", gap:10,
            color:"var(--ink-2)", fontSize:13, cursor:"default",
          }}>
            <Icon name="chevl" size={16} color="var(--ink-2)"/> Back to discover
          </div>
          <div style={{
            aspectRatio:"4/5", borderRadius:24, overflow:"hidden",
            background:g("Daniel"), position:"relative",
            boxShadow:"0 16px 40px rgba(0,0,0,0.30)",
          }}>
            <div style={{position:"absolute", top:20, left:20, right:20, display:"flex", gap:6, zIndex:2}}>
              {[1,0,0,0].map((on,i) => (
                <div key={i} style={{
                  flex:1, height:4, borderRadius:999,
                  background: on ? "#fff" : "rgba(255,255,255,0.30)",
                }}/>
              ))}
            </div>
            <div style={{
              position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
              color:"rgba(255,255,255,0.18)", fontSize:240, fontWeight:800,
            }}>E</div>
            <div style={{
              position:"absolute", bottom:24, right:24,
              display:"inline-flex", alignItems:"center", gap:6,
              height:32, padding:"0 14px", borderRadius:999,
              background:"var(--lavender)", color:"#000",
              fontSize:14, fontWeight:700,
            }}>
              <Icon name="sparkles" size={14} color="#000"/> 66%
            </div>
          </div>
          <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10}}>
            {["Daniel","Yael","Ehud","Esther"].map((n,i)=>(
              <div key={i} style={{
                aspectRatio:"1", borderRadius:14, background:g(n),
                opacity: i === 0 ? 1 : 0.65,
                border: i === 0 ? "2px solid var(--lime)" : "2px solid transparent",
                cursor:"default",
              }}/>
            ))}
          </div>
        </div>

        {/* Bio panel */}
        <div style={{
          display:"flex", flexDirection:"column", gap:24, overflow:"hidden", minWidth:0,
        }}>
          {/* Header — name + location + pills + action bar in same row */}
          <div style={{display:"flex", alignItems:"flex-start", gap:24}}>
            <div style={{flex:1, minWidth:0}}>
              <h1 style={{
                margin:0, fontSize:40, lineHeight:1.05, letterSpacing:"-0.025em",
                fontWeight:800, color:"var(--ink)",
              }}>Ehud, 42</h1>
              <p style={{margin:"4px 0 0", fontSize:14, fontStyle:"italic", color:"var(--ink-2)"}}>
                also known as "Ehud Israel"
              </p>
              <p className="t-meta" style={{marginTop:10, color:"var(--ink-2)", display:"flex", alignItems:"center", gap:6}}>
                <Icon name="mappin" size={14}/> Blackmans, Barbados
              </p>
              <div style={{marginTop:14, display:"flex", flexWrap:"wrap", gap:8}}>
                {["Saint Lucian","Afro-Caribbean","Married","3 children","Looking for marriage"].map(t=>(
                  <Pill key={t} variant="lavender">{t}</Pill>
                ))}
              </div>
            </div>
            {/* Vertical action stack */}
            <div style={{display:"flex", flexDirection:"column", gap:10, width:160, flexShrink:0}}>
              <div style={{
                height:48, borderRadius:14, background:"var(--lime)", color:"var(--cta-ink, #000)",
                display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                fontSize:14, fontWeight:700,
              }}>
                <Icon name="heart" size={16} color="var(--cta-ink, #000)" fill="var(--cta-ink, #000)"/> Like
              </div>
              <div style={{
                height:48, borderRadius:14, background:"var(--lavender)", color:"#000",
                display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                fontSize:14, fontWeight:700,
              }}>
                <Icon name="msg" size={16} color="#000" fill="#000"/> Message
              </div>
              <div style={{
                height:40, borderRadius:12, color:"var(--ink-2)",
                border:"1px solid var(--hairline)",
                display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                fontSize:13, fontWeight:600,
              }}>
                <Icon name="x" size={14}/> Pass
              </div>
            </div>
          </div>

          {/* Scrollable bio content */}
          <div style={{flex:1, overflow:"hidden", display:"flex", flexDirection:"column", gap:24, paddingRight:8}}>
            {/* Bio paragraph */}
            <p style={{
              margin:0, fontSize:17, lineHeight:1.6,
              color:"var(--ink)", textWrap:"pretty",
            }}>
              Consultant by day, beach walker by sunset. I grew up between Barbados and the diaspora &mdash; looking for someone who values shomer Shabbat, long Friday meals, and the kind of patience that comes from raising three.
            </p>

            {/* About + Compat in a side-by-side 2-col grid */}
            <div style={{
              display:"grid", gridTemplateColumns:"1fr 1fr", gap:24,
              borderTop:"1px solid var(--hairline)", paddingTop:24,
            }}>
              <div>
                <div className="t-overline" style={{color:"var(--ink-2)", marginBottom:10}}>About</div>
                <dl style={{margin:0, display:"flex", flexDirection:"column", gap:10}}>
                  {[
                    ["Gender","Man"],
                    ["Work","Consultant"],
                    ["Education","Bachelor's Degree"],
                    ["Religion","Hebrew Israelite"],
                    ["Children","3 (live with me)"],
                    ["Languages","English, Hebrew, Spanish"],
                  ].map(([k,v])=>(
                    <div key={k} style={{display:"grid", gridTemplateColumns:"110px 1fr", gap:8}}>
                      <dt className="t-meta" style={{color:"var(--ink-2)"}}>{k}</dt>
                      <dd className="t-meta" style={{margin:0, color:"var(--ink)", fontWeight:500}}>{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div>
                <div className="t-overline" style={{color:"var(--ink-2)", marginBottom:10}}>Compatibility · 66%</div>
                <div style={{display:"flex", flexDirection:"column", gap:12}}>
                  {[
                    ["Calendar",     78],
                    ["Family",       62],
                    ["Lifestyle",    58],
                    ["Languages",    90],
                    ["Observance",   72],
                    ["Polygyny",     55],
                  ].map(([k,v])=>(
                    <div key={k}>
                      <div style={{display:"flex", justifyContent:"space-between"}}>
                        <div className="t-meta" style={{color:"var(--ink)"}}>{k}</div>
                        <div className="t-meta" style={{color:"var(--ink-2)", fontVariantNumeric:"tabular-nums"}}>{v}%</div>
                      </div>
                      <div style={{marginTop:5, height:5, borderRadius:3, background:"var(--hairline)"}}>
                        <div style={{
                          width:`${v}%`, height:"100%", borderRadius:3,
                          background: v >= 85 ? "var(--lime)" : v >= 65 ? "var(--lavender)" : "var(--pink)",
                        }}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Interests */}
            <div style={{borderTop:"1px solid var(--hairline)", paddingTop:24}}>
              <div className="t-overline" style={{color:"var(--ink-2)", marginBottom:10}}>Interests</div>
              <div style={{display:"flex", flexWrap:"wrap", gap:8}}>
                {interests.map(i => (
                  <span key={i} style={{
                    padding:"8px 14px", borderRadius:999,
                    background:"var(--card)", border:"1px solid var(--hairline)",
                    color:"var(--ink)", fontSize:14, fontWeight:500,
                  }}>{i}</span>
                ))}
              </div>
            </div>

            {/* Footer — report / share */}
            <div style={{
              marginTop:"auto", paddingTop:16, borderTop:"1px solid var(--hairline)",
              display:"flex", justifyContent:"space-between", alignItems:"center",
            }}>
              <div style={{display:"flex", alignItems:"center", gap:8, color:"var(--ink-3)", fontSize:13}}>
                <Icon name="alert" size={14} color="var(--ink-3)"/> Report or block
              </div>
              <div style={{display:"flex", alignItems:"center", gap:8, color:"var(--ink-3)", fontSize:13}}>
                Joined 2 months ago · Last seen 2h ago
              </div>
            </div>
          </div>
        </div>
      </div>
    </DesktopShell>
  );
}

/* ===============================================================
   6 · Paywall — center modal over indigo
   =============================================================== */
function PaywallDesktop() {
  return (
    <DesktopShell label="Paywall" withSidebar={false}>
      <div style={{flex:1, position:"relative", background:"var(--bg-elevated)",
                   display:"flex", alignItems:"center", justifyContent:"center", padding:48}}>
        {/* Background photo cards */}
        {[
          {n:"Yael",   x:60,  y:60,  rot:-8},
          {n:"Adina",  x:1180,y:80,  rot:6},
          {n:"Daniel", x:80,  y:560, rot:5},
          {n:"Esther", x:1200,y:580, rot:-6},
        ].map(c=>(
          <div key={c.n} style={{
            position:"absolute", left:c.x, top:c.y,
            width:200, height:260, borderRadius:24, overflow:"hidden",
            background:g(c.n), border:"4px solid #fff",
            transform:`rotate(${c.rot}deg)`,
            boxShadow:"0 16px 50px rgba(0,0,0,0.45)",
            opacity:0.85, filter:"blur(0.5px)",
          }}>
            <div style={{
              position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
              color:"rgba(255,255,255,0.20)", fontSize:96, fontWeight:800,
            }}>{c.n[0]}</div>
          </div>
        ))}

        <div style={{
          width:640, padding:48, borderRadius:28,
          background:"var(--app)", border:"1px solid var(--hairline)",
          boxShadow:"0 30px 80px rgba(0,0,0,0.55)",
          position:"relative", zIndex:2,
          display:"flex", flexDirection:"column", gap:24,
        }}>
          <div style={{position:"absolute", top:18, right:18}}>
            <Icon name="x" size={22} color="var(--ink-2)"/>
          </div>
          <div style={{display:"flex", flexDirection:"column", alignItems:"center", gap:10}}>
            <Sparkle size={56} color="#D7FF81"/>
            <h1 className="t-display" style={{margin:0, color:"var(--ink)", textAlign:"center"}}>Ahavah Premium</h1>
            <p className="t-meta" style={{color:"var(--ink-2)", textAlign:"center", margin:0}}>
              Match more. Worry less.
            </p>
          </div>
          <div style={{display:"flex", flexDirection:"column", gap:10, padding:"4px 0"}}>
            {[
              "See everyone who liked you (full list, not just the count)",
              "Help build a Torah-observant community at the price of a coffee",
              "Cancel anytime from the billing portal",
            ].map(f => (
              <div key={f} style={{display:"flex", alignItems:"center", gap:14}}>
                <IconBadgeBox tone="cta" shape="circle" size={26}>
                  <Icon name="check" size={14} color="#000" strokeWidth={3}/>
                </IconBadgeBox>
                <div className="t-body" style={{color:"var(--ink)"}}>{f}</div>
              </div>
            ))}
          </div>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10}}>
            {[
              {l:"1 month",  per:"$4.99/mo",  price:"$4.99"},
              {l:"3 months", per:"$4.00/mo",  price:"$11.99", badge:"POPULAR"},
              {l:"1 year",   per:"$2.92/mo",  price:"$34.99", badge:"BEST VALUE", on:true},
            ].map(t => (
              <div key={t.l} style={{
                padding:16, borderRadius:18,
                background: t.on ? "color-mix(in oklch, var(--lime) 10%, var(--card))" : "var(--card)",
                border: t.on ? "1.5px solid var(--lime)" : "1px solid var(--hairline)",
                display:"flex", flexDirection:"column", alignItems:"center", gap:6, position:"relative",
              }}>
                {t.badge ? (
                  <span style={{position:"absolute", top:-10}}>
                    <Pill variant="lime">{t.badge}</Pill>
                  </span>
                ) : null}
                <div className="t-body-s" style={{color:"var(--ink)", marginTop:6}}>{t.l}</div>
                <div className="t-h2" style={{color:"var(--ink)", fontVariantNumeric:"tabular-nums"}}>{t.price}</div>
                <div className="t-caption" style={{color:"var(--ink-3)"}}>{t.per}</div>
              </div>
            ))}
          </div>
          <PrimaryBtn tone="cta">Continue $34.99</PrimaryBtn>
          <p className="t-caption" style={{textAlign:"center", color:"var(--ink-3)", margin:0}}>
            Auto-renews. Cancel anytime. <u>Terms</u> · <u>Privacy</u>
          </p>
        </div>
      </div>
    </DesktopShell>
  );
}

/* ===============================================================
   7 · Verify — three-tier flow, side context rail
   =============================================================== */
function VerifyDesktop() {
  const tiers = [
    { color:"#CD7F32", label:"Bronze", sub:"Profile verified", icon:"phone",
      body:"Selfie + photo cross-check. Confirms you're a real person matching your photos.",
      cta:"Take a selfie", done:true },
    { color:"#C0C0C0", label:"Silver", sub:"Liveness verified", icon:"scan",
      body:"Three quick selfies at different angles confirm you're a real person, not a static photo.",
      cta:"Take 3 selfies", done:false, active:true },
    { color:"#FFD700", label:"Gold", sub:"ID verified", icon:"idcard",
      body:"Government ID + face match via Stripe Identity. Highest trust signal.",
      cta:"Verify with government ID", done:false },
  ];
  return (
    <DesktopShell label="Verify" active="profile">
      <TopBar title="Get verified"/>
      <div style={{flex:1, padding:32, display:"grid", gridTemplateColumns:"1fr 360px", gap:32}}>
        <div style={{display:"flex", flexDirection:"column", gap:18}}>
          <p className="t-body" style={{margin:0, color:"var(--ink-2)"}}>
            Verified profiles get more matches and signal you're a real person.
          </p>
          {tiers.map(t => (
            <div key={t.label} style={{
              padding:24, borderRadius:22, background:"var(--card)",
              boxShadow: t.done || t.active
                ? `inset 0 0 0 1.5px ${t.color}`
                : "inset 0 0 0 1.5px var(--hairline)",
              display:"grid", gridTemplateColumns:"60px 1fr auto", gap:20, alignItems:"center",
            }}>
              <span style={{
                width:60, height:60, flexShrink:0, aspectRatio:"1", borderRadius:18,
                background: t.color, color:"#000",
                display:"flex", alignItems:"center", justifyContent:"center",
              }}>
                <Icon name={t.icon} size={28} color="#000"/>
              </span>
              <div>
                <div style={{display:"flex", alignItems:"center", gap:10}}>
                  <div className="t-h2" style={{color:"var(--ink)"}}>{t.label}</div>
                  {t.done ? (
                    <span style={{display:"inline-flex", alignItems:"center", gap:4, color:t.color}}>
                      <Icon name="check" size={16} color={t.color} strokeWidth={3}/>
                      <span className="t-caption" style={{fontWeight:700}}>Verified</span>
                    </span>
                  ) : null}
                </div>
                <div className="t-caption" style={{color:"var(--ink-3)"}}>{t.sub}</div>
                <p className="t-meta" style={{marginTop:8, color:"var(--ink-2)", lineHeight:1.5}}>{t.body}</p>
              </div>
              {!t.done ? (
                <div style={{
                  padding:"0 22px", height:48, borderRadius:14, color:"var(--ink)",
                  border:`1px solid ${t.color}`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:14, fontWeight:600, whiteSpace:"nowrap",
                  background: t.active ? `color-mix(in oklch, ${t.color} 12%, transparent)` : "transparent",
                }}>{t.cta}</div>
              ) : (
                <div className="t-caption" style={{color:"var(--ink-3)"}}>Completed</div>
              )}
            </div>
          ))}
        </div>
        <div style={{
          padding:24, borderRadius:18,
          background:"var(--card)", border:"1px solid var(--hairline)",
          display:"flex", flexDirection:"column", gap:14, alignSelf:"flex-start",
        }}>
          <div className="t-overline" style={{color:"var(--ink-2)"}}>Why verify</div>
          {[
            ["3.4×", "more matches"],
            ["2.1×", "more replies to first message"],
            ["98%", "of premium users verified"],
          ].map(([k,v])=>(
            <div key={k} style={{padding:"10px 0", borderBottom:"1px solid var(--hairline)"}}>
              <div className="t-h2" style={{color:"var(--ink)"}}>{k}</div>
              <div className="t-caption" style={{color:"var(--ink-3)"}}>{v}</div>
            </div>
          ))}
          <p className="t-caption" style={{margin:0, color:"var(--ink-3)", lineHeight:1.55}}>
            We never share your government ID with other users. Stripe Identity holds the document; we only see the match result.
          </p>
        </div>
      </div>
    </DesktopShell>
  );
}

/* ===============================================================
   8 · Settings — left sub-nav + content panel
   =============================================================== */
function SettingsDesktop() {
  const groups = [
    { label:"Account",  items:[{i:"settings",t:"Account",s:"Email & sign out"}] },
    { label:"App",      items:[
      {i:"bell",  t:"Notifications", s:"Push notifications", active:true},
      {i:"lock",  t:"Privacy",       s:"What others see"},
      {i:"userx", t:"Blocked users", s:"People you've blocked"},
    ]},
    { label:"Safety & Legal", items:[
      {i:"shield",t:"Safety tips",          s:"Stay safe on Ahavah"},
      {i:"book",  t:"Community guidelines", s:"How we keep it kind"},
      {i:"shield",t:"Privacy policy",       s:"How we handle your data"},
      {i:"file",  t:"Terms of service",     s:"What you agree to"},
    ]},
    { label:"Support",  items:[{i:"help", t:"Help center", s:"FAQs & contact"}] },
  ];
  return (
    <DesktopShell label="Settings" active="profile">
      <TopBar title="Settings"/>
      <div style={{flex:1, padding:32, display:"grid", gridTemplateColumns:"320px 1fr", gap:32, overflow:"hidden"}}>
        <div style={{display:"flex", flexDirection:"column", gap:18}}>
          {groups.map(g => (
            <div key={g.label}>
              <div className="t-overline" style={{color:"var(--ink-2)", marginBottom:8, paddingInline:14}}>{g.label}</div>
              {g.items.map(it => (
                <div key={it.t} style={{
                  display:"flex", alignItems:"center", gap:14,
                  padding:"12px 14px", borderRadius:14,
                  background: it.active ? "color-mix(in oklch, var(--lavender) 14%, transparent)" : "transparent",
                }}>
                  <IconBadgeBox tone="muted" size={36}><Icon name={it.i} size={16}/></IconBadgeBox>
                  <div style={{flex:1}}>
                    <div className="t-meta" style={{color:"var(--ink)", fontWeight: it.active ? 700 : 500}}>{it.t}</div>
                    <div className="t-caption" style={{color:"var(--ink-3)"}}>{it.s}</div>
                  </div>
                  <Icon name="chevr" size={14} color="var(--ink-3)"/>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div style={{
          padding:32, borderRadius:24,
          background:"var(--card)", border:"1px solid var(--hairline)",
          display:"flex", flexDirection:"column", gap:24,
        }}>
          <div>
            <h2 className="t-h1" style={{margin:0, color:"var(--ink)"}}>Notifications</h2>
            <p className="t-meta" style={{marginTop:6, color:"var(--ink-2)"}}>
              Choose what we send. We never share with third parties.
            </p>
          </div>
          <div style={{display:"flex", flexDirection:"column", gap:8}}>
            {[
              ["New matches",          true],
              ["New messages",         true],
              ["Profile views",        false],
              ["Verification updates", true],
              ["Weekly digest",        false],
              ["Marketing & tips",     false],
            ].map(([l,on]) => (
              <div key={l} style={{
                display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"16px 18px", borderRadius:14,
                background:"var(--app)", border:"1px solid var(--hairline)",
              }}>
                <div className="t-body" style={{color:"var(--ink)"}}>{l}</div>
                <div style={{
                  width:48, height:28, borderRadius:14,
                  background: on ? "var(--lime)" : "var(--hairline)",
                  position:"relative",
                }}>
                  <div style={{
                    position:"absolute", top:3, left: on ? 22 : 3, width:22, height:22,
                    borderRadius:"50%", background:"#fff",
                    boxShadow:"0 1px 3px rgba(0,0,0,0.3)",
                  }}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DesktopShell>
  );
}

/* ===============================================================
   9 · Map — full-bleed map with floating panel
   =============================================================== */
const WORLD_LAND_DESK = "M-10,180 C40,140 100,142 170,160 C220,176 280,200 360,200 C440,200 520,180 600,170 C700,158 780,180 900,200 C1000,216 1100,220 1180,200 C1260,180 1340,140 1440,150 L1440,40 L-10,40 Z M40,320 C70,310 110,316 140,330 C170,344 200,372 220,400 C240,432 260,470 300,500 C340,532 400,556 440,580 C480,604 510,640 530,680 C560,740 600,800 620,850 L580,860 C540,820 520,780 490,740 C460,700 420,670 380,640 C340,610 300,580 270,540 C240,500 220,460 200,420 C180,380 160,360 130,340 C100,320 70,316 40,320 Z M280,360 C320,344 380,348 430,360 C470,370 520,380 560,400 C600,420 640,440 680,470 C720,500 760,540 780,580 C800,620 800,660 780,700 C760,740 720,780 690,820 C660,860 620,900 600,940 C580,980 580,1020 600,1040 L560,1060 C520,1020 480,980 460,940 C440,900 460,860 480,820 C500,780 540,740 560,700 C580,660 600,620 580,580 C560,540 520,500 480,470 C440,440 400,420 360,400 C320,380 300,360 280,360 Z M860,310 C920,300 1000,310 1060,328 C1110,344 1160,370 1180,400 C1190,420 1180,440 1160,460 C1120,490 1060,500 1000,495 C940,490 880,470 850,440 C830,420 830,400 840,380 C850,360 850,330 860,310 Z M1100,440 C1160,432 1240,440 1280,460 C1320,480 1340,510 1330,540 C1320,570 1280,590 1240,595 C1200,600 1160,590 1130,570 C1100,550 1080,520 1080,490 C1080,470 1090,452 1100,440 Z";
function MapDesktop() {
  return (
    <DesktopShell label="Map" active="map">
      <div style={{flex:1, position:"relative", overflow:"hidden", display:"flex"}}>
        {/* Map */}
        <div style={{position:"absolute", inset:0, background:"#A9D2E8"}}>
          <svg width="100%" height="100%" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" style={{display:"block"}}>
            <path d={WORLD_LAND_DESK} fill="#F2EFE9" stroke="#D8D2C6" strokeWidth="0.8"/>
          </svg>
        </div>

        {/* Top bar */}
        <div style={{
          position:"absolute", top:0, left:0, right:0,
          padding:"20px 32px", display:"flex", alignItems:"center", justifyContent:"space-between",
          background:"rgba(0,0,0,0.55)", backdropFilter:"blur(12px) saturate(160%)",
          color:"#fff", zIndex:10,
        }}>
          <div className="t-h2" style={{color:"#fff"}}>Discover Map</div>
          <div style={{display:"flex", gap:12, alignItems:"center"}}>
            <Pill variant="glassDark">2,840 people visible</Pill>
            <div style={{
              width:48, height:48, flexShrink:0, aspectRatio:"1", borderRadius:"50%",
              background:"var(--bg-elevated)",
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              <Icon name="sliders" size={20} color="#fff"/>
            </div>
          </div>
        </div>

        {/* Markers */}
        {[
          {n:"Ehud",   top:55, left:30, badge:null},
          {n:"Yael",   top:38, left:60, badge:"match"},
          {n:"Adina",  top:34, left:20, badge:"chat"},
          {n:"Esther", top:36, left:54, badge:null},
          {n:"Rivka",  top:30, left:48, badge:null},
          {n:"Daniel", top:30, left:50, badge:null},
        ].map(m => (
          <div key={m.n} style={{
            position:"absolute", top:`${m.top}%`, left:`${m.left}%`,
            transform:"translate(-50%,-50%)", zIndex:5,
          }}>
            <div style={{position:"relative", width:48, height:48}}>
              <div style={{
                width:48, height:48, flexShrink:0, aspectRatio:"1", borderRadius:"50%",
                background:g(m.n), color:"#000", fontSize:18, fontWeight:800,
                display:"flex", alignItems:"center", justifyContent:"center",
                boxShadow:"0 0 0 3px var(--lime), 0 2px 8px rgba(0,0,0,0.45)",
              }}>{m.n[0]}</div>
              {m.badge ? (
                <div style={{
                  position:"absolute", top:-2, right:-2,
                  width:20, height:20, flexShrink:0, aspectRatio:"1", borderRadius:"50%",
                  background: m.badge === "match" ? "var(--lime)" : "var(--lavender)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  border:"2px solid #fff",
                }}>
                  {m.badge === "match"
                    ? <Icon name="sparkles" size={10} color="#000"/>
                    : <Icon name="msg" size={10} color="#000" fill="#000"/>}
                </div>
              ) : null}
            </div>
          </div>
        ))}

        {/* Selected marker info card */}
        <div style={{
          position:"absolute", left:32, bottom:32, width:340, zIndex:8,
          borderRadius:20, overflow:"hidden",
          background:"var(--card)", border:"1px solid var(--hairline)",
          boxShadow:"0 20px 50px rgba(0,0,0,0.30)",
        }}>
          <div style={{height:160, background:g("Yael"), position:"relative"}}>
            <div style={{position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
                          color:"rgba(255,255,255,0.20)", fontSize:80, fontWeight:800}}>Y</div>
          </div>
          <div style={{padding:18}}>
            <div className="t-h3" style={{color:"var(--ink)"}}>Yael, 27</div>
            <div className="t-caption" style={{marginTop:4, color:"var(--ink-2)", display:"flex", alignItems:"center", gap:4}}>
              <Icon name="mappin" size={12}/> Jerusalem, IL
            </div>
            <div style={{marginTop:10, display:"flex", gap:6}}>
              <Pill variant="lime">Match</Pill>
              <Pill variant="lavender">98%</Pill>
            </div>
            <div style={{
              marginTop:14, height:40, borderRadius:10,
              background:"var(--lime)", color:"var(--cta-ink, #000)",
              display:"flex", alignItems:"center", justifyContent:"center", gap:6,
              fontSize:13, fontWeight:700,
            }}>
              <Icon name="msg" size={14} color="var(--cta-ink, #000)"/> Open chat
            </div>
          </div>
        </div>

        {/* Attribution */}
        <div style={{
          position:"absolute", bottom:8, right:8, zIndex:5,
          fontSize:11, color:"#444", background:"rgba(255,255,255,0.75)",
          padding:"2px 8px", borderRadius:3,
        }}>Leaflet | © OpenStreetMap contributors</div>
      </div>
    </DesktopShell>
  );
}

/* ===============================================================
   10 · Matches — wider grid (4 cols)
   =============================================================== */
function MatchesDesktop() {
  const grid = [
    { name:"Yael",   age:27, location:"Jerusalem, IL", online:true },
    { name:"Adina",  age:24, location:"Brooklyn, US",  online:true },
    { name:"Esther", age:28, location:"Paris, FR",     online:false },
    { name:"Rivka",  age:31, location:"Toronto, CA",   online:false },
    { name:"Tirzah", age:22, location:"Tel Aviv, IL",  online:true },
    { name:"Yosef",  age:41, location:"London, UK",    online:false },
    { name:"Caleb",  age:36, location:"Lagos, NG",     online:false },
    { name:"Daniel", age:32, location:"Sydney, AU",    online:true },
  ];
  return (
    <DesktopShell label="Matches" active="matches">
      <TopBar title="Matches" right={
        <div style={{display:"flex", padding:4, gap:4, borderRadius:14, border:"1px solid var(--hairline)"}}>
          <div style={{padding:"8px 18px", borderRadius:10, background:"var(--lime)", color:"var(--cta-ink, #000)", fontSize:14, fontWeight:700}}>Matches</div>
          <div style={{padding:"8px 18px", borderRadius:10, color:"var(--ink-2)", fontSize:14, fontWeight:500, display:"flex", alignItems:"center", gap:8}}>
            Liked you <Pill variant="lime">7</Pill>
          </div>
        </div>
      }/>
      <div style={{flex:1, padding:32, overflow:"hidden"}}>
        <div style={{display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:20}}>
          {grid.map(m => (
            <div key={m.name} style={{display:"flex", flexDirection:"column", gap:10}}>
              <div style={{aspectRatio:"4/5", borderRadius:18, overflow:"hidden", background:g(m.name), position:"relative"}}>
                <div style={{
                  position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
                  color:"rgba(255,255,255,0.20)", fontSize:90, fontWeight:800,
                }}>{m.name[0]}</div>
              </div>
              <div>
                <div className="t-body-s" style={{color:"var(--ink)", display:"flex", alignItems:"center", gap:6}}>
                  <span style={{whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{m.name}, {m.age}</span>
                  {m.online ? <span style={{width:8,height:8,flexShrink:0, aspectRatio:"1", borderRadius:"50%",background:"var(--lime)"}}/> : null}
                </div>
                <div className="t-caption" style={{color:"var(--ink-2)", display:"flex", alignItems:"center", gap:4, marginTop:2}}>
                  <Icon name="mappin" size={11}/><span>{m.location}</span>
                </div>
              </div>
              <div style={{
                height:40, borderRadius:999,
                background:"var(--lime)", color:"var(--cta-ink, #000)",
                display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                fontSize:14, fontWeight:600,
              }}>
                <Icon name="msg" size={14} color="var(--cta-ink, #000)"/> Message
              </div>
            </div>
          ))}
        </div>
      </div>
    </DesktopShell>
  );
}

/* ===============================================================
   11 · Locked (edge state) — centered card on dark canvas
   =============================================================== */
function LockedDesktop() {
  return (
    <DesktopShell label="Locked" withSidebar={false}>
      <div style={{
        flex:1, background:"var(--bg-elevated)",
        display:"flex", alignItems:"center", justifyContent:"center", padding:48,
      }}>
        <div style={{
          width:560, padding:48, borderRadius:28, textAlign:"center",
          background:"var(--app)", border:"1px solid var(--hairline)",
          boxShadow:"0 30px 80px rgba(0,0,0,0.55)",
          display:"flex", flexDirection:"column", alignItems:"center", gap:18,
        }}>
          <div style={{
            width:96, height:96, flexShrink:0, aspectRatio:"1", borderRadius:24,
            background:"color-mix(in oklch, var(--lavender) 14%, transparent)",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <Icon name="lock" size={44} color="var(--lavender)"/>
          </div>
          <h1 className="t-h1" style={{margin:0, color:"var(--ink)"}}>Account temporarily locked</h1>
          <p className="t-body" style={{color:"var(--ink-2)", margin:0, maxWidth:420, lineHeight:1.6}}>
            We noticed unusual activity on your account. We've paused sign-ins for 24 hours as a precaution.
            You can sign back in from this device after that.
          </p>
          <div style={{width:"100%", marginTop:8}}>
            <PrimaryBtn tone="outline"><Icon name="mail" size={16}/> Contact support</PrimaryBtn>
          </div>
        </div>
      </div>
    </DesktopShell>
  );
}

window.WelcomeDesktop       = WelcomeDesktop;
window.SignUpDesktop        = SignUpDesktop;
window.OnboardingDesktop    = OnboardingDesktop;
window.DiscoverDesktop      = DiscoverDesktop;
window.MatchDesktop         = MatchDesktop;
window.InboxDesktop         = InboxDesktop;
window.ProfileDesktop       = ProfileDesktop;
window.ProfileDetailDesktop = ProfileDetailDesktop;
window.PaywallDesktop       = PaywallDesktop;
window.VerifyDesktop        = VerifyDesktop;
window.SettingsDesktop      = SettingsDesktop;
window.MapDesktop           = MapDesktop;
window.MatchesDesktop       = MatchesDesktop;
window.LockedDesktop        = LockedDesktop;
window.DW = DW;
window.DH = DH;
})();

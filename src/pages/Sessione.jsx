import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { useAuth } from '../lib/auth.jsx'
import { useTheme } from '../lib/theme.jsx'
import {
  caricaSessioneCompleta, aggiungiDrink, chiudiSessione,
  salvaProfile, caricaProfile, eliminaDrink,
} from '../lib/supabase.js'
import {
  creaProfiloUtente, calcolaBACTotale, generaCurvaBac,
  calcolaGhostPeak, calcolaCountdownGuida, analizzaDrinkRavvicinati,
  getGrammiPreset, getZonaBac,
} from '../lib/bacEngine.js'
import s from './Sessione.module.css'
 
const CATS = [
  { key: 'birra',    emoji: '🍺', label: 'Birra'    },
  { key: 'vino',     emoji: '🍷', label: 'Vino'     },
  { key: 'cocktail', emoji: '🍹', label: 'Cocktail' },
  { key: 'shot',     emoji: '🥃', label: 'Shot'     },
]
const INTENS = ['leggero', 'ideale', 'pesante']
const BAC_MAX_DISPLAY = 1.5 // g/l — massimo della barra visiva
 
function drinkToCalcolo(d) {
  return {
    grammi: Number(d.grammi_alcol),
    timestamp_ms: new Date(d.timestamp).getTime(),
  }
}
 
// ── Barra orizzontale BAC ─────────────────────────────────────────────
function BacBar({ bac }) {
  const pct     = Math.min(bac / BAC_MAX_DISPLAY, 1) * 100
  const zona    = getZonaBac(bac)
  const color   = zona === 'sobrio' ? '#94a3b8' : zona === 'sweet_spot' ? '#16a34a' : '#dc2626'
  const label   = zona === 'sobrio' ? 'Sobrio' : zona === 'sweet_spot' ? 'Sweet Spot' : 'Alterato'
 
  return (
    <div className={s.bacBar}>
      <div className={s.bacBarLabels}>
        <span className={s.bacBarTitle}>Livello alcolemico</span>
        <span className={s.bacBarZona} style={{ color }}>{label} · {Number(bac).toFixed(3)} g/l</span>
      </div>
      <div className={s.bacBarTrack}>
        {/* Zone colorate fisse */}
        <div className={s.bacBarZoneSobrio}   style={{ width: `${(0.2 / BAC_MAX_DISPLAY) * 100}%` }} />
        <div className={s.bacBarZoneSweet}    style={{ width: `${(0.3 / BAC_MAX_DISPLAY) * 100}%` }} />
        <div className={s.bacBarZoneAlterato} style={{ width: `${(1.0 / BAC_MAX_DISPLAY) * 100}%` }} />
        {/* Indicatore posizione */}
        <div className={s.bacBarIndicator} style={{ left: `calc(${pct}% - 6px)`, background: color }} />
        {/* Linee di soglia */}
        <div className={s.bacBarThreshold} style={{ left: `${(0.2 / BAC_MAX_DISPLAY) * 100}%` }}>
          <span>0.2</span>
        </div>
        <div className={s.bacBarThreshold} style={{ left: `${(0.5 / BAC_MAX_DISPLAY) * 100}%` }}>
          <span>0.5</span>
        </div>
      </div>
      <div className={s.bacBarLegend}>
        <span style={{ color:'#94a3b8' }}>Sobrio</span>
        <span style={{ color:'#16a34a' }}>Sweet Spot</span>
        <span style={{ color:'#dc2626' }}>Alterato</span>
      </div>
    </div>
  )
}
 
// ── Gauge numerica ────────────────────────────────────────────────────
function BacGauge({ bac, zona }) {
  const color =
    zona === 'sobrio'     ? 'var(--text-muted)' :
    zona === 'sweet_spot' ? 'var(--green)'       : 'var(--red)'
  const label =
    zona === 'sobrio'     ? 'Sobrio'         :
    zona === 'sweet_spot' ? '🎯 Sweet Spot'  : '⚠️ Alterato'
  return (
    <div className={s.gauge} style={{ borderColor: color }}>
      <span className={s.gaugeLabel}>BAC attuale</span>
      <span className={s.gaugeValue} style={{ color }}>{Number(bac).toFixed(3)}</span>
      <span className={s.gaugeUnit}>g/l</span>
      <span className={s.gaugeBadge} style={{ background: color + '22', color }}>{label}</span>
    </div>
  )
}
 
// ── Pannello Admin: simulazione temporale ─────────────────────────────
function AdminPanel({ drinks, profilo, onTimeOffset }) {
  const [offset, setOffset] = useState(0)
  if (!profilo) return null
 
  const handleChange = (val) => {
    setOffset(val)
    onTimeOffset(val * 60 * 1000) // converte minuti in ms
  }
 
  const mapped  = drinks.filter(d => d.categoria !== 'acqua').map(drinkToCalcolo)
  const simTime = Date.now() + offset * 60 * 1000
  const simBac  = mapped.length ? calcolaBACTotale(mapped, simTime, profilo) : 0
  const simZona = getZonaBac(simBac)
  const simColor = simZona === 'sobrio' ? '#94a3b8' : simZona === 'sweet_spot' ? '#16a34a' : '#dc2626'
 
  return (
    <div className={s.adminPanel}>
      <div className={s.adminHeader}>
        <span className={s.adminBadge}>🛠 Admin Debug</span>
        <span className={s.adminSub}>Simula il BAC nel tempo senza aspettare</span>
      </div>
 
      <div className={s.adminSliderRow}>
        <span className={s.adminSliderLabel}>
          {offset === 0
            ? 'Adesso'
            : offset > 0
            ? `+${offset} min (futuro)`
            : `${offset} min (passato)`}
        </span>
        <span className={s.adminSimBac} style={{ color: simColor }}>
          BAC simulato: {simBac.toFixed(3)} g/l
        </span>
      </div>
 
      <input
        type="range"
        className={s.adminSlider}
        min={-120}
        max={480}
        step={5}
        value={offset}
        onChange={e => handleChange(Number(e.target.value))}
      />
 
      <div className={s.adminSliderTicks}>
        <span>-2h</span>
        <span>Ora</span>
        <span>+4h</span>
        <span>+8h</span>
      </div>
 
      <div className={s.adminStats}>
        {[-60,-30,0,60,120,180,240].map(min => {
          const t   = Date.now() + min * 60 * 1000
          const b   = mapped.length ? calcolaBACTotale(mapped, t, profilo) : 0
          const z   = getZonaBac(b)
          const c   = z === 'sobrio' ? '#94a3b8' : z === 'sweet_spot' ? '#16a34a' : '#dc2626'
          const lbl = min === 0 ? 'Ora' : min > 0 ? `+${min}m` : `${min}m`
          return (
            <div key={min} className={s.adminStatCell} style={{ borderTopColor: c }}>
              <span className={s.adminStatTime}>{lbl}</span>
              <span className={s.adminStatVal} style={{ color: c }}>{b.toFixed(3)}</span>
            </div>
          )
        })}
      </div>
 
      <button className={s.adminReset} onClick={() => handleChange(0)}>
        ↺ Torna all'ora attuale
      </button>
    </div>
  )
}
 
// ── Componente principale ─────────────────────────────────────────────
export default function Sessione() {
  const { id }     = useParams()
  const { user }   = useAuth()
  const { isDark } = useTheme()
  const nav        = useNavigate()
 
  const [sessione, setSessione]     = useState(null)
  const [drinks, setDrinks]         = useState([])
  const [profilo, setProfilo]       = useState(null)
  const [isAdmin, setIsAdmin]       = useState(false)
  const [bac, setBac]               = useState(0)
  const [zona, setZona]             = useState('sobrio')
  const [ghost, setGhost]           = useState(null)
  const [countdown, setCountdown]   = useState(null)
  const [avviso, setAvviso]         = useState(null)
  const [curva, setCurva]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [timeOffset, setTimeOffset] = useState(0) // ms, solo admin
 
  // Drink modal
  const [showModal, setShowModal] = useState(false)
  const [catSel, setCatSel]       = useState('birra')
  const [intSel, setIntSel]       = useState('ideale')
  const [adding, setAdding]       = useState(false)
 
  // Profile modal
  const [showProfile, setShowProfile] = useState(false)
  const [peso, setPeso]               = useState('70')
  const [sesso, setSesso]             = useState('uomo')
  const [patente, setPatente]         = useState('standard')
 
  // Ref per timer
  const drinksRef      = useRef([])
  const profiloRef     = useRef(null)
  const timeOffsetRef  = useRef(0)
 
  // ── Ricalcola ────────────────────────────────────────────────────
  const ricalcola = (drinksAgg, prof, offsetMs = 0) => {
    const mapped = drinksAgg
      .filter(d => d.categoria !== 'acqua')
      .map(drinkToCalcolo)
 
    if (mapped.length === 0) {
      setBac(0); setZona('sobrio'); setGhost(null)
      setCountdown(null); setAvviso({ avviso: false, messaggio: '' }); setCurva([])
      return
    }
 
    const now    = Date.now() + offsetMs
    const bacVal = calcolaBACTotale(mapped, now, prof)
 
    setBac(Math.round(bacVal * 1000) / 1000)
    setZona(getZonaBac(bacVal))
    setGhost(calcolaGhostPeak(mapped, prof))
    setCountdown(calcolaCountdownGuida(mapped, prof))
    setAvviso(analizzaDrinkRavvicinati(mapped))
    setCurva(generaCurvaBac(mapped, prof, 5))
  }
 
  // ── Caricamento iniziale ─────────────────────────────────────────
  useEffect(() => {
    if (!user || !id) return
    ;(async () => {
      try {
        const { sessione: sess, drinks: d } = await caricaSessioneCompleta(id)
        setSessione(sess)
        setDrinks(d)
        drinksRef.current = d
 
        const p = await caricaProfile(user.id)
        if (!p) { setShowProfile(true); setLoading(false); return }
 
        // Controlla ruolo admin dal metadata
        const meta = user.user_metadata ?? {}
        setIsAdmin(meta.role === 'admin')
 
        const prof = creaProfiloUtente(p.peso_kg, p.sesso, p.tipo_patente, sess.stomaco)
        setProfilo(prof)
        profiloRef.current = prof
        ricalcola(d, prof, 0)
      } catch (e) { alert('Errore: ' + e.message) }
      finally { setLoading(false) }
    })()
  }, [user, id])
 
  // ── Timer 30s ───────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => {
      if (drinksRef.current.length > 0 && profiloRef.current)
        ricalcola(drinksRef.current, profiloRef.current, timeOffsetRef.current)
    }, 30000)
    return () => clearInterval(t)
  }, [])
 
  // ── Admin: time offset ───────────────────────────────────────────
  const handleTimeOffset = (offsetMs) => {
    setTimeOffset(offsetMs)
    timeOffsetRef.current = offsetMs
    if (drinksRef.current.length > 0 && profiloRef.current)
      ricalcola(drinksRef.current, profiloRef.current, offsetMs)
  }
 
  // ── Salva profilo ────────────────────────────────────────────────
  const handleSalvaProfilo = async () => {
    if (!user) return
    try {
      const p    = await salvaProfile({ id: user.id, peso_kg: parseFloat(peso), sesso, tipo_patente: patente })
      const prof = creaProfiloUtente(p.peso_kg, p.sesso, p.tipo_patente, sessione.stomaco)
      setProfilo(prof); profiloRef.current = prof
      setShowProfile(false)
      ricalcola(drinksRef.current, prof, timeOffsetRef.current)
    } catch (e) { alert(e.message) }
  }
 
  // ── Aggiungi drink ───────────────────────────────────────────────
  const handleAggiungiDrink = async () => {
    if (!user || !id || !profilo) return
    setAdding(true)
    try {
      const grammi = getGrammiPreset(catSel, intSel)
      const nd     = await aggiungiDrink(id, user.id, catSel, grammi, intSel)
      const nuovi  = [...drinksRef.current, nd]
      drinksRef.current = nuovi
      setDrinks(nuovi)
      ricalcola(nuovi, profilo, timeOffsetRef.current)
      setShowModal(false)
    } catch (e) { alert(e.message) }
    finally { setAdding(false) }
  }
 
  // ── Rimuovi drink ────────────────────────────────────────────────
  const handleRimuoviDrink = async (drinkId) => {
    if (!window.confirm('Rimuovere questo drink?')) return
    try {
      await eliminaDrink(drinkId)
      const nuovi = drinksRef.current.filter(d => d.id !== drinkId)
      drinksRef.current = nuovi
      setDrinks(nuovi)
      ricalcola(nuovi, profilo, timeOffsetRef.current)
    } catch (e) { alert(e.message) }
  }
 
  // ── Acqua ────────────────────────────────────────────────────────
  const handleAcqua = async () => {
    if (!user || !id) return
    try {
      const nd    = await aggiungiDrink(id, user.id, 'acqua', 0, null)
      const nuovi = [...drinksRef.current, nd]
      drinksRef.current = nuovi
      setDrinks(nuovi)
    } catch (e) { alert(e.message) }
  }
 
  // ── Chiudi serata ────────────────────────────────────────────────
  const handleChiudi = async () => {
    if (!window.confirm('Vuoi concludere questa serata?')) return
    try {
      const picco   = curva.length ? Math.max(...curva.map(p => p.bac), 0) : 0
      const mlAcqua = drinks.filter(d => d.categoria === 'acqua').length * 250
      await chiudiSessione(id, picco, mlAcqua, '', 80)
      nav('/')
    } catch (e) { alert(e.message) }
  }
 
  // ── Chart data ───────────────────────────────────────────────────
  const chartData = curva.map(p => ({
    label_ora: p.label_ora,
    is_futuro: p.is_futuro,
    sobrio:    p.bac > 0 && p.bac <= 0.2 ? p.bac : p.bac > 0.2 ? 0.2 : 0,
    sweet:     p.bac > 0.2 && p.bac <= 0.5 ? p.bac : p.bac > 0.5 ? 0.5 : 0,
    alterato:  p.bac > 0.5 ? p.bac : 0,
    bac:       p.bac,
  }))
 
  const drinkCount = drinks.filter(d => d.categoria !== 'acqua').length
  const acquaCount = drinks.filter(d => d.categoria === 'acqua').length
  const greenColor = isDark ? '#4ade80' : '#16a34a'
  const redColor   = isDark ? '#f87171' : '#dc2626'
 
  if (loading) return (
    <div className={s.loadingScreen}>
      <div style={{ width:36,height:36,border:'3px solid var(--border)',borderTopColor:'var(--accent)',borderRadius:'50%',animation:'spin .7s linear infinite' }} />
    </div>
  )
 
  return (
    <div className={s.root}>
      <header className={`${s.header} card`}>
        <button className={s.back} onClick={() => nav('/')}>← Home</button>
        <div className={s.headerCenter}>
          <span style={{ fontSize:13, color:'var(--text-muted)' }}>
            {sessione ? new Date(sessione.data_inizio).toLocaleDateString('it-IT', { weekday:'long', day:'numeric', month:'long' }) : ''}
          </span>
          {isAdmin && <span className={s.adminTag}>👑 Admin</span>}
        </div>
        <button className={`btn-ghost ${s.closeBtn}`} onClick={handleChiudi}>Chiudi serata</button>
      </header>
 
      <div className={s.layout}>
 
        {/* ── Sinistra ──────────────────────────────────────────── */}
        <div className={s.leftCol}>
 
          <div className="fade-up">
            <BacGauge bac={bac} zona={zona} />
          </div>
 
          <div className="fade-up-2">
            <BacBar bac={bac} />
          </div>
 
          <div className={`${s.infoCards} fade-up-3`}>
            {ghost && ghost.bac_picco > bac + 0.005 && (
              <div className={`card ${s.infoCard}`}
                style={{ borderLeft:`3px solid ${ghost.is_pericoloso ? redColor : greenColor}` }}>
                <div className={s.infoCardTitle}>👻 Ghost Peak</div>
                <div className={s.infoCardVal}>{Number(ghost.bac_picco).toFixed(3)} g/l</div>
                <div className={s.infoCardSub}>
                  {ghost.minuti_al_picco === 0 ? 'Sei già al picco' : `tra ${ghost.minuti_al_picco}min · alle ${ghost.label_ora_picco}`}
                </div>
              </div>
            )}
            {countdown && (
              <div className={`card ${s.infoCard}`}
                style={{ borderLeft:`3px solid ${countdown.puo_guidare ? greenColor : redColor}` }}>
                <div className={s.infoCardTitle}>🚗 Guida</div>
                <div className={s.infoCardVal} style={{ fontSize:15 }}>{countdown.messaggio}</div>
                {!countdown.puo_guidare && countdown.bac_attuale && (
                  <div className={s.infoCardSub}>BAC attuale: {countdown.bac_attuale} g/l</div>
                )}
              </div>
            )}
            {avviso?.avviso && (
              <div className={`card ${s.infoCard}`} style={{ borderLeft:'3px solid var(--red)' }}>
                <div className={s.infoCardVal} style={{ fontSize:13 }}>{avviso.messaggio}</div>
              </div>
            )}
          </div>
 
          <div className={`card ${s.counters} fade-up-4`}>
            <div className={s.counter}>
              <span className={s.counterVal}>{drinkCount}</span>
              <span className={s.counterLbl}>drink</span>
            </div>
            <div className={s.counterDiv} />
            <div className={s.counter}>
              <span className={s.counterVal}>{acquaCount * 250}ml</span>
              <span className={s.counterLbl}>acqua</span>
            </div>
            <div className={s.counterDiv} />
            <div className={s.counter}>
              <span className={s.counterVal} style={{ textTransform:'capitalize', fontSize:12 }}>
                {sessione?.stomaco.replace(/_/g,' ')}
              </span>
              <span className={s.counterLbl}>stomaco</span>
            </div>
          </div>
 
          <div className={`${s.actions} fade-up-4`}>
            <button className="btn-ghost" style={{ flex:1 }} onClick={handleAcqua}>💧 Acqua</button>
            <button className="btn-primary" style={{ flex:2 }} onClick={() => setShowModal(true)}>+ Drink</button>
          </div>
        </div>
 
        {/* ── Destra ────────────────────────────────────────────── */}
        <div className={s.rightCol}>
 
          {/* Admin panel */}
          {isAdmin && (
            <AdminPanel
              drinks={drinks}
              profilo={profilo}
              onTimeOffset={handleTimeOffset}
            />
          )}
 
          {/* Grafico curva */}
          {chartData.length > 0 ? (
            <div className={`card ${s.chartCard} fade-up`}>
              <h3 className={s.chartTitle}>
                Curva BAC
                {timeOffset !== 0 && (
                  <span style={{ fontSize:12, color:'var(--accent)', marginLeft:8 }}>
                    [simulazione {timeOffset > 0 ? '+' : ''}{Math.round(timeOffset/60000)}min]
                  </span>
                )}
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={chartData} margin={{ top:10, right:16, bottom:0, left:-20 }}>
                  <defs>
                    <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#94a3b8" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={greenColor} stopOpacity={0.5} />
                      <stop offset="95%" stopColor={greenColor} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={redColor} stopOpacity={0.5} />
                      <stop offset="95%" stopColor={redColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label_ora" tick={{ fontSize:10, fill:'var(--text-muted)' }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize:10, fill:'var(--text-muted)' }} domain={[0,'auto']} tickFormatter={v => v.toFixed(2)} />
                  <Tooltip
                    contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, fontSize:12 }}
                    formatter={(val, name) => {
                      if (!val || val === 0) return null
                      const labels = { sobrio:'Sobrio', sweet:'Sweet Spot', alterato:'Alterato' }
                      return [`${Number(val).toFixed(3)} g/l`, labels[name] ?? name]
                    }}
                    labelStyle={{ color:'var(--text-sec)', marginBottom:4 }}
                  />
                  <ReferenceLine y={0.5} stroke={redColor}   strokeDasharray="4 4" strokeWidth={1.5} label={{ value:'0.5', fill:redColor,   fontSize:10, position:'right' }} />
                  <ReferenceLine y={0.2} stroke={greenColor} strokeDasharray="4 4" strokeWidth={1.5} label={{ value:'0.2', fill:greenColor, fontSize:10, position:'right' }} />
                  <Area type="monotone" dataKey="sobrio"   stroke="#94a3b8"  strokeWidth={2} fill="url(#gS)" dot={false} activeDot={{ r:4 }} />
                  <Area type="monotone" dataKey="sweet"    stroke={greenColor} strokeWidth={2} fill="url(#gG)" dot={false} activeDot={{ r:4 }} />
                  <Area type="monotone" dataKey="alterato" stroke={redColor}   strokeWidth={2} fill="url(#gR)" dot={false} activeDot={{ r:4 }} />
                </AreaChart>
              </ResponsiveContainer>
              <div className={s.chartLegend}>
                <span style={{ color:'#94a3b8' }}>⬤ Sobrio &lt;0.2</span>
                <span style={{ color:greenColor }}>⬤ Sweet Spot 0.2–0.5</span>
                <span style={{ color:redColor }}>⬤ Alterato &gt;0.5</span>
              </div>
            </div>
          ) : (
            <div className={`card ${s.chartCard} fade-up`} style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:200 }}>
              <p style={{ color:'var(--text-muted)', fontSize:14 }}>Aggiungi il primo drink per vedere il grafico</p>
            </div>
          )}
 
          {/* Lista drink con rimozione */}
          <div className={`card ${s.drinkList} fade-up-2`}>
            <h3 className={s.drinkListTitle}>
              Drink della serata
              {drinkCount > 0 && (
                <span style={{ fontSize:13, fontWeight:400, color:'var(--text-muted)', marginLeft:8 }}>
                  · {drinks.filter(d=>d.categoria!=='acqua').reduce((acc,d)=>acc+Number(d.grammi_alcol),0).toFixed(0)}g alcol
                </span>
              )}
            </h3>
            {drinkCount === 0
              ? <p className={s.drinkEmpty}>Nessun drink ancora</p>
              : drinks.filter(d => d.categoria !== 'acqua').map(d => (
                <div key={d.id} className={s.drinkRow}>
                  <span className={s.drinkEmoji}>
                    {d.categoria==='birra'?'🍺':d.categoria==='vino'?'🍷':d.categoria==='cocktail'?'🍹':'🥃'}
                  </span>
                  <div className={s.drinkInfo}>
                    <span className={s.drinkName}>
                      {d.categoria.charAt(0).toUpperCase()+d.categoria.slice(1)}
                      {d.intensita ? ` · ${d.intensita}` : ''}
                    </span>
                    <span className={s.drinkTime}>
                      {new Date(d.timestamp).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})}
                    </span>
                  </div>
                  <span className={s.drinkG}>{d.grammi_alcol}g</span>
                  <button
                    className={s.drinkRemove}
                    onClick={() => handleRimuoviDrink(d.id)}
                    title="Rimuovi drink">
                    ✕
                  </button>
                </div>
              ))
            }
          </div>
 
        </div>
      </div>
 
      {/* ── Modal drink ───────────────────────────────────────────────── */}
      {showModal && (
        <div className={s.overlay} onClick={() => setShowModal(false)}>
          <div className={`card ${s.modal}`} onClick={e => e.stopPropagation()}>
            <div className={s.modalHead}>
              <h3>Aggiungi drink</h3>
              <button className={s.modalClose} onClick={() => setShowModal(false)}>✕</button>
            </div>
            <p className={s.modalLabel}>Categoria</p>
            <div className={s.catGrid}>
              {CATS.map(c => (
                <button key={c.key} className={`${s.catBtn} ${catSel===c.key ? s.catBtnSel : ''}`}
                  onClick={() => setCatSel(c.key)}>
                  <span className={s.catEmoji}>{c.emoji}</span>
                  <span className={s.catLabel}>{c.label}</span>
                </button>
              ))}
            </div>
            <p className={s.modalLabel}>Intensità</p>
            <div className={s.intRow}>
              {INTENS.map(i => (
                <button key={i} className={`${s.intBtn} ${intSel===i ? s.intBtnSel : ''}`}
                  onClick={() => setIntSel(i)}>
                  <span className={s.intLabel}>{i}</span>
                  <span className={s.intG}>{getGrammiPreset(catSel, i)}g alcol</span>
                </button>
              ))}
            </div>
            <div className={s.modalPreview}>
              Stai aggiungendo: <strong>{CATS.find(c=>c.key===catSel)?.emoji} {catSel} {intSel}</strong> · <strong>{getGrammiPreset(catSel, intSel)}g</strong> di alcol puro
            </div>
            <button className="btn-primary" style={{ width:'100%', marginTop:16 }}
              onClick={handleAggiungiDrink} disabled={adding}>
              {adding ? <span className="spinner" /> : 'Aggiungi'}
            </button>
          </div>
        </div>
      )}
 
      {/* ── Modal profilo ─────────────────────────────────────────────── */}
      {showProfile && (
        <div className={s.overlay}>
          <div className={`card ${s.modal}`}>
            <h3 style={{ marginBottom:8 }}>Il tuo profilo</h3>
            <p style={{ fontSize:13, color:'var(--text-sec)', marginBottom:20 }}>Necessario per calcolare il BAC accuratamente</p>
            <p className={s.modalLabel}>Peso (kg)</p>
            <input className="input-field" type="number" placeholder="es. 72"
              value={peso} onChange={e => setPeso(e.target.value)} />
            <p className={s.modalLabel} style={{ marginTop:14 }}>Sesso biologico</p>
            <div className={s.intRow}>
              {['uomo','donna'].map(v => (
                <button key={v} className={`${s.intBtn} ${sesso===v ? s.intBtnSel : ''}`} onClick={() => setSesso(v)}>
                  <span className={s.intLabel}>{v==='uomo' ? '♂ Uomo' : '♀ Donna'}</span>
                </button>
              ))}
            </div>
            <p className={s.modalLabel} style={{ marginTop:14 }}>Tipo di patente</p>
            <div className={s.intRow}>
              {['standard','neopatentato'].map(v => (
                <button key={v} className={`${s.intBtn} ${patente===v ? s.intBtnSel : ''}`} onClick={() => setPatente(v)}>
                  <span className={s.intLabel}>{v==='standard' ? 'Standard (≥0.5)' : 'Neopat. (0.0)'}</span>
                </button>
              ))}
            </div>
            <button className="btn-primary" style={{ width:'100%', marginTop:24 }} onClick={handleSalvaProfilo}>
              Salva e continua
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
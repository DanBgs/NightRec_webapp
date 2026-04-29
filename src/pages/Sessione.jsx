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
  calcolaTempoAZero, getGrammiPreset, getZonaBac, DATABASE_BEVANDE,
} from '../lib/bacEngine.js'
import { DrinkIcon } from '../components/DrinkIcon.jsx'
import s from './Sessione.module.css'

const CATS = [
  { key: 'birra',    label: 'Birra'    },
  { key: 'vino',     label: 'Vino'     },
  { key: 'cocktail', label: 'Cocktail' },
  { key: 'shot',     label: 'Shot'     },
]
const INTENS       = ['leggero', 'ideale', 'pesante']
const BAC_MAX_DISPLAY = 1.5

// Ora di chiusura automatica (6:00 del mattino successivo)
function calcolaChiusuraAutomatica(dataInizio) {
  const inizio = new Date(dataInizio)
  const chiusura = new Date(inizio)
  chiusura.setDate(chiusura.getDate() + 1)
  chiusura.setHours(6, 0, 0, 0)
  return chiusura
}

function drinkToCalcolo(d) {
  return { grammi: Number(d.grammi_alcol), timestamp_ms: new Date(d.timestamp).getTime() }
}

// ── Barra BAC ─────────────────────────────────────────────────────────
function BacBar({ bac }) {
  const pct   = Math.min(bac / BAC_MAX_DISPLAY, 1) * 100
  const zona  = getZonaBac(bac)
  const color = zona === 'sobrio' ? '#94a3b8' : zona === 'sweet_spot' ? '#16a34a' : '#dc2626'
  const label = zona === 'sobrio' ? 'Sobrio' : zona === 'sweet_spot' ? 'Sweet Spot' : 'Alterato'
  return (
    <div className={s.bacBar}>
      <div className={s.bacBarLabels}>
        <span className={s.bacBarTitle}>Livello alcolemico</span>
        <span className={s.bacBarZona} style={{ color }}>{label} · {Number(bac).toFixed(3)} g/l</span>
      </div>
      <div style={{ position: 'relative', paddingBottom: 28 }}>
        <div className={s.bacBarTrack}>
          <div className={s.bacBarZoneSobrio}   style={{ width: `${(0.2/BAC_MAX_DISPLAY)*100}%` }} />
          <div className={s.bacBarZoneSweet}    style={{ width: `${(0.3/BAC_MAX_DISPLAY)*100}%` }} />
          <div className={s.bacBarZoneAlterato} style={{ width: `${(1.0/BAC_MAX_DISPLAY)*100}%` }} />
          <div className={s.bacBarIndicator}    style={{ left: `calc(${pct}% - 10px)`, background: color }} />
          <div className={s.bacBarThreshold}    style={{ left: `${(0.2/BAC_MAX_DISPLAY)*100}%` }}><span>0.2</span></div>
          <div className={s.bacBarThreshold}    style={{ left: `${(0.5/BAC_MAX_DISPLAY)*100}%` }}><span>0.5</span></div>
        </div>
        <div className={s.bacBarLegend}>
          <span style={{ color:'#94a3b8' }}>Sobrio</span>
          <span style={{ color:'#16a34a' }}>Sweet Spot</span>
          <span style={{ color:'#dc2626' }}>Alterato</span>
        </div>
      </div>
    </div>
  )
}

// ── Gauge numerica ────────────────────────────────────────────────────
function BacGauge({ bac, zona }) {
  const color = zona==='sobrio' ? 'var(--text-muted)' : zona==='sweet_spot' ? 'var(--green)' : 'var(--red)'
  const label = zona==='sobrio' ? 'Sobrio' : zona==='sweet_spot' ? '🎯 Sweet Spot' : '⚠️ Alterato'
  return (
    <div className={s.gauge} style={{ borderColor: color }}>
      <span className={s.gaugeLabel}>BAC attuale</span>
      <span className={s.gaugeValue} style={{ color }}>{Number(bac).toFixed(3)}</span>
      <span className={s.gaugeUnit}>g/l</span>
      <span className={s.gaugeBadge} style={{ background: color+'22', color }}>{label}</span>
    </div>
  )
}

// ── Vista serata chiusa (sola lettura) ────────────────────────────────
function SessioneChiusa({ sessione, drinks, isDark }) {
  const nav        = useNavigate()
  const greenColor = isDark ? '#4ade80' : '#16a34a'
  const redColor   = isDark ? '#f87171' : '#dc2626'

  const drinkAlcol = drinks.filter(d => d.categoria !== 'acqua')
  const totGrammi  = drinkAlcol.reduce((s, d) => s + Number(d.grammi_alcol), 0)
  const zona       = getZonaBac(sessione.bac_picco ?? 0)
  const zonaColor  = zona==='sobrio' ? '#94a3b8' : zona==='sweet_spot' ? greenColor : redColor
  const zonaLabel  = zona==='sobrio' ? 'Sobrio' : zona==='sweet_spot' ? 'Sweet Spot' : 'Alterato'

  const fmtOra = (iso) => new Date(iso).toLocaleTimeString('it-IT', { hour:'2-digit', minute:'2-digit' })
  const fmtData = (iso) => new Date(iso).toLocaleDateString('it-IT', { weekday:'long', day:'numeric', month:'long', year:'numeric' })

  // Dati grafico dalla curva salvata — ricostuiamo dai drink
  // (la curva storica non è salvata in dettaglio quindi la ricalcoliamo)
  const durataOre = sessione.data_fine
    ? (new Date(sessione.data_fine) - new Date(sessione.data_inizio)) / 3600000
    : 0

  return (
    <div className={s.root}>
      <header className={`${s.header} card`}>
        <button className={s.back} onClick={() => nav('/')}>← Home</button>
        <div className={s.headerCenter}>
          <span style={{ fontSize:13, color:'var(--text-muted)' }}>{fmtData(sessione.data_inizio)}</span>
        </div>
        <span className={s.closedBadge}>✓ Serata chiusa</span>
      </header>

      <div className={s.closedLayout}>

        {/* Riepilogo */}
        <div className={`card ${s.closedSummary}`}>
          <h2 className={s.closedTitle}>Riepilogo serata</h2>
          <div className={s.closedStats}>
            <div className={s.closedStat}>
              <span className={s.closedStatVal} style={{ color: zonaColor }}>
                {sessione.bac_picco != null ? Number(sessione.bac_picco).toFixed(3) : '—'}
              </span>
              <span className={s.closedStatLbl}>BAC picco (g/l)</span>
              <span className={s.closedStatZona} style={{ color: zonaColor }}>{zonaLabel}</span>
            </div>
            <div className={s.closedStat}>
              <span className={s.closedStatVal}>{drinkAlcol.length}</span>
              <span className={s.closedStatLbl}>drink</span>
            </div>
            <div className={s.closedStat}>
              <span className={s.closedStatVal}>{totGrammi.toFixed(0)}g</span>
              <span className={s.closedStatLbl}>alcol totale</span>
            </div>
            <div className={s.closedStat}>
              <span className={s.closedStatVal}>{drinks.filter(d=>d.categoria==='acqua').length * 250}ml</span>
              <span className={s.closedStatLbl}>acqua</span>
            </div>
            <div className={s.closedStat}>
              <span className={s.closedStatVal}>{durataOre.toFixed(1)}h</span>
              <span className={s.closedStatLbl}>durata</span>
            </div>
          </div>
          <div className={s.closedTimes}>
            <span>🕐 Inizio: {fmtOra(sessione.data_inizio)}</span>
            {sessione.data_fine && <span>🏁 Fine: {fmtOra(sessione.data_fine)}</span>}
          </div>
        </div>

        {/* Lista drink */}
        <div className={`card ${s.drinkList}`}>
          <h3 className={s.drinkListTitle}>Drink della serata</h3>
          {drinkAlcol.length === 0
            ? <p className={s.drinkEmpty}>Nessun drink registrato</p>
            : drinkAlcol.map(d => (
              <div key={d.id} className={s.drinkRow}>
                <div className={s.drinkIconWrap}>
                  <DrinkIcon categoria={d.categoria} size={22} color="var(--accent)" />
                </div>
                <div className={s.drinkInfo}>
                  <span className={s.drinkName}>
                    {d.categoria.charAt(0).toUpperCase()+d.categoria.slice(1)}
                    {d.intensita ? ` · ${d.intensita}` : ''}
                  </span>
                  <span className={s.drinkTime}>
                    {new Date(d.timestamp).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})}
                  </span>
                </div>
                <span className={s.drinkG}>{Number(d.grammi_alcol).toFixed(1)}g</span>
              </div>
            ))
          }
        </div>

      </div>
    </div>
  )
}

// ── Admin panel ───────────────────────────────────────────────────────
function AdminPanel({ drinks, profilo, onTimeOffset }) {
  const [offset, setOffset] = useState(0)
  if (!profilo) return null
  const mapped   = drinks.filter(d=>d.categoria!=='acqua').map(drinkToCalcolo)
  const simTime  = Date.now() + offset * 60000
  const simBac   = mapped.length ? calcolaBACTotale(mapped, simTime, profilo) : 0
  const simZona  = getZonaBac(simBac)
  const simColor = simZona==='sobrio' ? '#94a3b8' : simZona==='sweet_spot' ? '#16a34a' : '#dc2626'
  const handle   = (val) => { setOffset(val); onTimeOffset(val * 60000) }

  return (
    <div className={s.adminPanel}>
      <div className={s.adminHeader}>
        <span className={s.adminBadge}>🛠 Admin Debug</span>
        <span className={s.adminSub}>Simula il BAC nel tempo senza aspettare</span>
      </div>
      <div className={s.adminSliderRow}>
        <span className={s.adminSliderLabel}>
          {offset===0 ? 'Adesso' : offset>0 ? `+${offset} min` : `${offset} min`}
        </span>
        <span className={s.adminSimBac} style={{ color: simColor }}>
          BAC sim: {simBac.toFixed(3)} g/l
        </span>
      </div>
      <input type="range" className={s.adminSlider}
        min={-120} max={480} step={5} value={offset}
        onChange={e => handle(Number(e.target.value))} />
      <div className={s.adminSliderTicks}><span>-2h</span><span>Ora</span><span>+4h</span><span>+8h</span></div>
      <div className={s.adminStats}>
        {[-60,-30,0,60,120,180,240].map(min => {
          const b = mapped.length ? calcolaBACTotale(mapped, Date.now()+min*60000, profilo) : 0
          const z = getZonaBac(b)
          const c = z==='sobrio'?'#94a3b8':z==='sweet_spot'?'#16a34a':'#dc2626'
          return (
            <div key={min} className={s.adminStatCell} style={{ borderTopColor: c }}>
              <span className={s.adminStatTime}>{min===0?'Ora':min>0?`+${min}m`:`${min}m`}</span>
              <span className={s.adminStatVal} style={{ color: c }}>{b.toFixed(3)}</span>
            </div>
          )
        })}
      </div>
      <button className={s.adminReset} onClick={() => handle(0)}>↺ Torna all'ora attuale</button>
    </div>
  )
}

// ── Modale conferma chiusura ──────────────────────────────────────────
function CloseConfirmModal({ onConfirm, onCancel }) {
  return (
    <div className={s.overlay} onClick={onCancel}>
      <div className={`card ${s.confirmModal}`} onClick={e => e.stopPropagation()}>
        <div className={s.confirmIcon}>🔒</div>
        <h3 className={s.confirmTitle}>Chiudi la serata?</h3>
        <p className={s.confirmText}>
          Una volta chiusa, la serata <strong>non potrà essere riaperta</strong>.<br/>
          Potrai comunque visualizzare il grafico e l'elenco dei drink.
        </p>
        <div className={s.confirmDisclaimer}>
          ℹ️ Le serate vengono chiuse automaticamente alle <strong>06:00</strong> del mattino seguente.
        </div>
        <div className={s.confirmActions}>
          <button className="btn-ghost" onClick={onCancel}>Annulla</button>
          <button className={s.confirmBtn} onClick={onConfirm}>Sì, chiudi la serata</button>
        </div>
      </div>
    </div>
  )
}

// ── Componente principale ─────────────────────────────────────────────
export default function Sessione() {
  const { id }      = useParams()
  const { user }    = useAuth()
  const { isDark }  = useTheme()
  const nav         = useNavigate()

  const [sessione, setSessione]         = useState(null)
  const [drinks, setDrinks]             = useState([])
  const [profilo, setProfilo]           = useState(null)
  const [isAdmin, setIsAdmin]           = useState(false)
  const [bac, setBac]                   = useState(0)
  const [zona, setZona]                 = useState('sobrio')
  const [ghost, setGhost]               = useState(null)
  const [countdown, setCountdown]       = useState(null)
  const [avviso, setAvviso]             = useState(null)
  const [tempoAZero, setTempoAZero]     = useState(null)
  const [curva, setCurva]               = useState([])
  const [loading, setLoading]           = useState(true)
  const [timeOffset, setTimeOffset]     = useState(0)
  const [showConfirmClose, setShowConfirmClose] = useState(false)

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

  const drinksRef     = useRef([])
  const profiloRef    = useRef(null)
  const timeOffsetRef = useRef(0)

  // ── Ricalcola ──────────────────────────────────────────────────────
  const ricalcola = (drinksAgg, prof, offsetMs = 0) => {
    const mapped = drinksAgg.filter(d=>d.categoria!=='acqua').map(drinkToCalcolo)
    if (mapped.length === 0) {
      setBac(0); setZona('sobrio'); setGhost(null)
      setCountdown(null); setAvviso({avviso:false,messaggio:''}); setTempoAZero(null); setCurva([])
      return
    }
    const now    = Date.now() + offsetMs
    const bacVal = calcolaBACTotale(mapped, now, prof)
    setBac(Math.round(bacVal*1000)/1000)
    setZona(getZonaBac(bacVal))
    setGhost(calcolaGhostPeak(mapped, prof))
    setCountdown(calcolaCountdownGuida(mapped, prof))
    setAvviso(analizzaDrinkRavvicinati(mapped))
    setTempoAZero(calcolaTempoAZero(mapped, prof))
    setCurva(generaCurvaBac(mapped, prof, 5))
  }

  // ── Chiusura automatica alle 6:00 ─────────────────────────────────
  const eseguiChiusuraAutomatica = async (sess, drinksAttuali, prof) => {
    try {
      const mapped  = drinksAttuali.filter(d=>d.categoria!=='acqua').map(drinkToCalcolo)
      const curvaC  = generaCurvaBac(mapped, prof, 5)
      const picco   = curvaC.length ? Math.max(...curvaC.map(p=>p.bac),0) : 0
      const mlAcqua = drinksAttuali.filter(d=>d.categoria==='acqua').length * 250
      await chiudiSessione(sess.id, picco, mlAcqua, 'Chiusura automatica alle 06:00', 80)
      // Ricarica la sessione aggiornata
      const { sessione: sAggiornata } = await caricaSessioneCompleta(sess.id)
      setSessione(sAggiornata)
    } catch(e) { console.error('Errore chiusura automatica:', e) }
  }

  // ── Caricamento iniziale ───────────────────────────────────────────
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
        const meta = user.user_metadata ?? {}
        setIsAdmin(meta.role === 'admin')
        const prof = creaProfiloUtente(p.peso_kg, p.sesso, p.tipo_patente, sess.stomaco)
        setProfilo(prof)
        profiloRef.current = prof

        // Se la serata è aperta, controlla se va chiusa automaticamente
        if (!sess.data_fine) {
          const chiusuraAuto = calcolaChiusuraAutomatica(sess.data_inizio)
          if (new Date() >= chiusuraAuto) {
            await eseguiChiusuraAutomatica(sess, d, prof)
          } else {
            ricalcola(d, prof, 0)
          }
        }
      } catch(e) { alert('Errore: ' + e.message) }
      finally { setLoading(false) }
    })()
  }, [user, id])

  // ── Timer: ricalcola ogni 30s + controlla chiusura auto ───────────
  useEffect(() => {
    const t = setInterval(async () => {
      if (!drinksRef.current.length || !profiloRef.current) return
      // Controlla chiusura automatica
      if (sessione && !sessione.data_fine) {
        const chiusuraAuto = calcolaChiusuraAutomatica(sessione.data_inizio)
        if (new Date() >= chiusuraAuto) {
          await eseguiChiusuraAutomatica(sessione, drinksRef.current, profiloRef.current)
          return
        }
      }
      ricalcola(drinksRef.current, profiloRef.current, timeOffsetRef.current)
    }, 30000)
    return () => clearInterval(t)
  }, [sessione])

  const handleTimeOffset = (offsetMs) => {
    setTimeOffset(offsetMs); timeOffsetRef.current = offsetMs
    if (drinksRef.current.length && profiloRef.current)
      ricalcola(drinksRef.current, profiloRef.current, offsetMs)
  }

  const handleSalvaProfilo = async () => {
    if (!user) return
    try {
      const p    = await salvaProfile({ id:user.id, peso_kg:parseFloat(peso), sesso, tipo_patente:patente })
      const prof = creaProfiloUtente(p.peso_kg, p.sesso, p.tipo_patente, sessione.stomaco)
      setProfilo(prof); profiloRef.current = prof
      setShowProfile(false)
      ricalcola(drinksRef.current, prof, timeOffsetRef.current)
    } catch(e) { alert(e.message) }
  }

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
    } catch(e) { alert(e.message) }
    finally { setAdding(false) }
  }

  const handleRimuoviDrink = async (drinkId) => {
    if (!window.confirm('Rimuovere questo drink?')) return
    try {
      await eliminaDrink(drinkId)
      const nuovi = drinksRef.current.filter(d=>d.id!==drinkId)
      drinksRef.current = nuovi
      setDrinks(nuovi)
      ricalcola(nuovi, profilo, timeOffsetRef.current)
    } catch(e) { alert(e.message) }
  }

  const handleAcqua = async () => {
    if (!user || !id) return
    try {
      const nd    = await aggiungiDrink(id, user.id, 'acqua', 0, null)
      const nuovi = [...drinksRef.current, nd]
      drinksRef.current = nuovi; setDrinks(nuovi)
    } catch(e) { alert(e.message) }
  }

  const handleChiudi = async () => { setShowConfirmClose(true) }

  const confermaChiusura = async () => {
    setShowConfirmClose(false)
    try {
      const picco   = curva.length ? Math.max(...curva.map(p=>p.bac),0) : 0
      const mlAcqua = drinks.filter(d=>d.categoria==='acqua').length * 250
      await chiudiSessione(id, picco, mlAcqua, '', 80)
      nav('/')
    } catch(e) { alert(e.message) }
  }

  const chartData = curva.map(p => ({
    label_ora: p.label_ora,
    sobrio:    p.bac>0 && p.bac<=0.2 ? p.bac : p.bac>0.2 ? 0.2 : 0,
    sweet:     p.bac>0.2 && p.bac<=0.5 ? p.bac : p.bac>0.5 ? 0.5 : 0,
    alterato:  p.bac>0.5 ? p.bac : 0,
    bac:       p.bac,
  }))

  const drinkCount = drinks.filter(d=>d.categoria!=='acqua').length
  const acquaCount = drinks.filter(d=>d.categoria==='acqua').length
  const greenColor = isDark ? '#4ade80' : '#16a34a'
  const redColor   = isDark ? '#f87171' : '#dc2626'

  if (loading) return (
    <div className={s.loadingScreen}>
      <div style={{width:36,height:36,border:'3px solid var(--border)',borderTopColor:'var(--accent)',borderRadius:'50%',animation:'spin .7s linear infinite'}} />
    </div>
  )

  // ── Vista sola lettura se serata chiusa ───────────────────────────
  if (sessione?.data_fine) {
    return <SessioneChiusa sessione={sessione} drinks={drinks} isDark={isDark} />
  }

  // ── Vista attiva ──────────────────────────────────────────────────
  return (
    <div className={s.root}>
      <header className={`${s.header} card`}>
        <button className={s.back} onClick={() => nav('/')}>← Home</button>
        <div className={s.headerCenter}>
          <span style={{fontSize:13,color:'var(--text-muted)'}}>
            {sessione ? new Date(sessione.data_inizio).toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long'}) : ''}
          </span>
          {isAdmin && <span className={s.adminTag}>👑 Admin</span>}
        </div>
        <div className={s.userIcon} style={{marginLeft:8, marginRight:8, fontWeight:500, fontSize:15}}>
          {user && user.user_metadata && user.user_metadata.username
            ? user.user_metadata.username
            : 'profilo'}
        </div>
        <button className={`btn-ghost ${s.closeBtn}`} onClick={handleChiudi}>Chiudi serata</button>
      </header>

      <div className={s.layout}>
        {/* Sinistra */}
        <div className={s.leftCol}>
          <div className="fade-up"><BacGauge bac={bac} zona={zona} /></div>
          <div className="fade-up-2"><BacBar bac={bac} /></div>

          <div className={`${s.infoCards} fade-up-3`}>
            {ghost && ghost.bac_picco > bac + 0.005 && (
              <div className={`card ${s.infoCard}`} style={{borderLeft:`3px solid ${ghost.is_pericoloso?redColor:greenColor}`}}>
                <div className={s.infoCardTitle}>👻 Ghost Peak</div>
                <div className={s.infoCardVal}>{Number(ghost.bac_picco).toFixed(3)} g/l</div>
                <div className={s.infoCardSub}>{ghost.minuti_al_picco===0 ? 'Sei già al picco' : `tra ${ghost.minuti_al_picco}min · alle ${ghost.label_ora_picco}`}</div>
              </div>
            )}
            {countdown && (
              <div className={`card ${s.infoCard}`} style={{borderLeft:`3px solid ${countdown.puo_guidare?greenColor:redColor}`}}>
                <div className={s.infoCardTitle}>🚗 Guida</div>
                <div className={s.infoCardVal} style={{fontSize:15}}>{countdown.messaggio}</div>
                {!countdown.puo_guidare && countdown.bac_attuale && (
                  <div className={s.infoCardSub}>BAC attuale: {countdown.bac_attuale} g/l</div>
                )}
              </div>
            )}
            {tempoAZero !== null && tempoAZero > 0 && (
              <div className={`card ${s.infoCard}`} style={{borderLeft:'3px solid var(--text-muted)'}}>
                <div className={s.infoCardTitle}>⏱ Smaltimento completo</div>
                <div className={s.infoCardVal} style={{fontSize:15}}>
                  {Math.floor(tempoAZero/60)>0 ? `${Math.floor(tempoAZero/60)}h ${tempoAZero%60}min` : `${tempoAZero} min`}
                </div>
                <div className={s.infoCardSub}>
                  Alcol a zero alle {new Date(Date.now()+tempoAZero*60000).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})}
                </div>
              </div>
            )}
            {avviso?.avviso && (
              <div className={`card ${s.infoCard}`} style={{borderLeft:'3px solid var(--red)'}}>
                <div className={s.infoCardVal} style={{fontSize:13}}>{avviso.messaggio}</div>
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
              <span className={s.counterVal}>{acquaCount*250}ml</span>
              <span className={s.counterLbl}>acqua</span>
            </div>
            <div className={s.counterDiv} />
            <div className={s.counter}>
              <span className={s.counterVal} style={{textTransform:'capitalize',fontSize:12}}>
                {sessione?.stomaco.replace(/_/g,' ')}
              </span>
              <span className={s.counterLbl}>stomaco</span>
            </div>
          </div>

          <div className={`${s.actions} fade-up-4`}>
            <button className="btn-ghost" style={{flex:1}} onClick={handleAcqua}>
              <DrinkIcon categoria="acqua" size={18} color="var(--text-sec)" /> Acqua
            </button>
            <button className="btn-primary" style={{flex:2}} onClick={() => setShowModal(true)}>
              + Drink
            </button>
          </div>
        </div>

        {/* Destra */}
        <div className={s.rightCol}>
          {isAdmin && <AdminPanel drinks={drinks} profilo={profilo} onTimeOffset={handleTimeOffset} />}

          {chartData.length > 0 ? (
            <div className={`card ${s.chartCard} fade-up`}>
              <h3 className={s.chartTitle}>
                Curva BAC
                {timeOffset!==0 && <span style={{fontSize:12,color:'var(--accent)',marginLeft:8}}>[sim {timeOffset>0?'+':''}{Math.round(timeOffset/60000)}min]</span>}
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={chartData} margin={{top:10,right:16,bottom:0,left:-20}}>
                  <defs>
                    <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#94a3b8" stopOpacity={0.4}/><stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/></linearGradient>
                    <linearGradient id="gG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={greenColor} stopOpacity={0.5}/><stop offset="95%" stopColor={greenColor} stopOpacity={0}/></linearGradient>
                    <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={redColor} stopOpacity={0.5}/><stop offset="95%" stopColor={redColor} stopOpacity={0}/></linearGradient>
                  </defs>
                  <XAxis dataKey="label_ora" tick={{fontSize:10,fill:'var(--text-muted)'}} interval="preserveStartEnd"/>
                  <YAxis tick={{fontSize:10,fill:'var(--text-muted)'}} domain={[0,'auto']} tickFormatter={v=>v.toFixed(2)}/>
                  <Tooltip
                    contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:10,fontSize:12}}
                    formatter={(val,name)=>{
                      if(!val||val===0) return null
                      const l={sobrio:'Sobrio',sweet:'Sweet Spot',alterato:'Alterato'}
                      return [`${Number(val).toFixed(3)} g/l`,l[name]??name]
                    }}
                    labelStyle={{color:'var(--text-sec)',marginBottom:4}}
                  />
                  <ReferenceLine y={0.5} stroke={redColor}   strokeDasharray="4 4" strokeWidth={1.5} label={{value:'0.5',fill:redColor,  fontSize:10,position:'right'}}/>
                  <ReferenceLine y={0.2} stroke={greenColor} strokeDasharray="4 4" strokeWidth={1.5} label={{value:'0.2',fill:greenColor,fontSize:10,position:'right'}}/>
                  <Area type="monotone" dataKey="sobrio"   stroke="#94a3b8"  strokeWidth={2} fill="url(#gS)" dot={false} activeDot={{r:4}}/>
                  <Area type="monotone" dataKey="sweet"    stroke={greenColor} strokeWidth={2} fill="url(#gG)" dot={false} activeDot={{r:4}}/>
                  <Area type="monotone" dataKey="alterato" stroke={redColor}   strokeWidth={2} fill="url(#gR)" dot={false} activeDot={{r:4}}/>
                </AreaChart>
              </ResponsiveContainer>
              <div className={s.chartLegend}>
                <span style={{color:'#94a3b8'}}>⬤ Sobrio &lt;0.2</span>
                <span style={{color:greenColor}}>⬤ Sweet Spot 0.2–0.5</span>
                <span style={{color:redColor}}>⬤ Alterato &gt;0.5</span>
              </div>
            </div>
          ) : (
            <div className={`card ${s.chartCard} fade-up`} style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:200}}>
              <p style={{color:'var(--text-muted)',fontSize:14}}>Aggiungi il primo drink per vedere il grafico</p>
            </div>
          )}

          <div className={`card ${s.drinkList} fade-up-2`}>
            <h3 className={s.drinkListTitle}>
              Drink della serata
              {drinkCount>0 && <span style={{fontSize:13,fontWeight:400,color:'var(--text-muted)',marginLeft:8}}>· {drinks.filter(d=>d.categoria!=='acqua').reduce((a,d)=>a+Number(d.grammi_alcol),0).toFixed(0)}g alcol</span>}
            </h3>
            {drinkCount===0
              ? <p className={s.drinkEmpty}>Nessun drink ancora</p>
              : drinks.filter(d=>d.categoria!=='acqua').map(d => (
                <div key={d.id} className={s.drinkRow}>
                  <div className={s.drinkIconWrap}>
                    <DrinkIcon categoria={d.categoria} size={22} color="var(--accent)" />
                  </div>
                  <div className={s.drinkInfo}>
                    <span className={s.drinkName}>{d.categoria.charAt(0).toUpperCase()+d.categoria.slice(1)}{d.intensita?` · ${d.intensita}`:''}</span>
                    <span className={s.drinkTime}>{new Date(d.timestamp).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})}</span>
                  </div>
                  <span className={s.drinkG}>{Number(d.grammi_alcol).toFixed(1)}g</span>
                  <button className={s.drinkRemove} onClick={()=>handleRimuoviDrink(d.id)} title="Rimuovi">✕</button>
                </div>
              ))
            }
          </div>
        </div>
      </div>

      {/* Modal drink */}
      {showModal && (
        <div className={s.overlay} onClick={()=>setShowModal(false)}>
          <div className={`card ${s.modal}`} onClick={e=>e.stopPropagation()}>
            <div className={s.modalHead}>
              <h3>Aggiungi drink</h3>
              <button className={s.modalClose} onClick={()=>setShowModal(false)}>✕</button>
            </div>
            <p className={s.modalLabel}>Categoria</p>
            <div className={s.catGrid}>
              {CATS.map(c => (
                <button key={c.key} className={`${s.catBtn} ${catSel===c.key?s.catBtnSel:''}`} onClick={()=>setCatSel(c.key)}>
                  <div className={s.catIconWrap}>
                    <DrinkIcon categoria={c.key} size={32} color={catSel===c.key?'var(--accent)':'var(--text-sec)'} />
                  </div>
                  <span className={s.catLabel}>{c.label}</span>
                </button>
              ))}
            </div>
            <p className={s.modalLabel}>Intensità</p>
            <div className={s.intRow}>
              {INTENS.map(i => {
                const v = DATABASE_BEVANDE[catSel]?.varianti[i]
                const g = getGrammiPreset(catSel, i)
                return (
                  <button key={i} className={`${s.intBtn} ${intSel===i?s.intBtnSel:''}`} onClick={()=>setIntSel(i)}>
                    <span className={s.intLabel}>{i}</span>
                    <span className={s.intG}>{v?`${v.abv}% · ${g.toFixed(0)}g`:`${g.toFixed(0)}g`}</span>
                  </button>
                )
              })}
            </div>
            <div className={s.modalPreview}>
              {(() => {
                const v = DATABASE_BEVANDE[catSel]?.varianti[intSel]
                const g = getGrammiPreset(catSel, intSel)
                return v
                  ? <><strong>{v.label}</strong> · {v.volume_ml}ml {v.abv}% · <strong>{g.toFixed(1)}g</strong> alcol puro</>
                  : <><strong>{g.toFixed(1)}g</strong> di alcol puro</>
              })()}
            </div>
            <button className="btn-primary" style={{width:'100%',marginTop:16}} onClick={handleAggiungiDrink} disabled={adding}>
              {adding ? <span className="spinner"/> : 'Aggiungi'}
            </button>
          </div>
        </div>
      )}

      {/* Modal profilo */}
      {showProfile && (
        <div className={s.overlay}>
          <div className={`card ${s.modal}`}>
            <h3 style={{marginBottom:8}}>Il tuo profilo</h3>
            <p style={{fontSize:13,color:'var(--text-sec)',marginBottom:20}}>Necessario per calcolare il BAC accuratamente</p>
            <p className={s.modalLabel}>Peso (kg)</p>
            <input className="input-field" type="number" placeholder="es. 72" value={peso} onChange={e=>setPeso(e.target.value)}/>
            <p className={s.modalLabel} style={{marginTop:14}}>Sesso biologico</p>
            <div className={s.intRow}>
              {['uomo','donna'].map(v=>(
                <button key={v} className={`${s.intBtn} ${sesso===v?s.intBtnSel:''}`} onClick={()=>setSesso(v)}>
                  <span className={s.intLabel}>{v==='uomo'?'♂ Uomo':'♀ Donna'}</span>
                </button>
              ))}
            </div>
            <p className={s.modalLabel} style={{marginTop:14}}>Tipo di patente</p>
            <div className={s.intRow}>
              {['standard','neopatentato'].map(v=>(
                <button key={v} className={`${s.intBtn} ${patente===v?s.intBtnSel:''}`} onClick={()=>setPatente(v)}>
                  <span className={s.intLabel}>{v==='standard'?'Standard (≥0.5)':'Neopat. (0.0)'}</span>
                </button>
              ))}
            </div>
            <button className="btn-primary" style={{width:'100%',marginTop:24}} onClick={handleSalvaProfilo}>Salva e continua</button>
          </div>
        </div>
      )}

      {/* Modal conferma chiusura */}
      {showConfirmClose && (
        <CloseConfirmModal onConfirm={confermaChiusura} onCancel={()=>setShowConfirmClose(false)} />
      )}
    </div>
  )
}
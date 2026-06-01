import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, LineChart, Line, Legend,
} from 'recharts'
import { useAuth } from '../lib/auth.jsx'
import { useTheme } from '../lib/theme.jsx'
import { caricaProfile } from '../lib/supabase.js'
import {
  caricaPartecipanti, aggiornaBacPartecipante, caricaMenu,
  aggiornaMenu, aggiungiDrinkJam, caricaDrinkJam, eliminaDrinkJam,
  avviaJam, chiudiJam, subscribeJam, uniscitiJam, caricaFotoJam,
  uploadFotoJam,
} from '../lib/supabaseJam.js'
import {
  creaProfiloUtente, calcolaBACTotale, generaCurvaBac,
  getZonaBac, getGrammiPreset, DATABASE_BEVANDE,
} from '../lib/bacEngine.js'
import { DrinkIcon } from '../components/DrinkIcon.jsx'
import s from './JamSessione.module.css'

// ── Colori per ogni partecipante ──────────────────────────────────────
const PALETTE = [
  '#E8593C','#3B82F6','#A855F7','#F59E0B',
  '#10B981','#EC4899','#06B6D4','#84CC16',
]
const getColor = (idx) => PALETTE[idx % PALETTE.length]

function drinkToCalcolo(d) {
  return { grammi: Number(d.grammi_alcol), timestamp_ms: new Date(d.timestamp).getTime() }
}

// ── Badge zona BAC ────────────────────────────────────────────────────
function ZonaBac({ bac }) {
  const z = getZonaBac(bac)
  const c = z === 'sobrio' ? '#94a3b8' : z === 'sweet_spot' ? '#16a34a' : '#dc2626'
  return <span className={s.zonaBac} style={{ color: c, borderColor: c + '44' }}>{bac.toFixed(3)}</span>
}

// ── Classifica partecipanti ───────────────────────────────────────────
function Classifica({ partecipanti, myId }) {
  const sorted = [...partecipanti].sort((a, b) => (b.bac_attuale ?? 0) - (a.bac_attuale ?? 0))
  return (
    <div className={s.classifica}>
      <div className={s.classificaTitle}> Partecipanti</div>
      {sorted.map((p, i) => {
        const color = getColor(partecipanti.findIndex(x => x.user_id === p.user_id))
        const isMe  = p.user_id === myId
        return (
          <div key={p.user_id} className={`${s.classificaRow} ${isMe ? s.classificaMe : ''}`}>
            <span className={s.classificaColor} style={{ background: color }} />
            <span className={s.classificaName}>
              {p.username || 'Utente'} {isMe ? '(tu)' : ''}
            </span>
            <ZonaBac bac={p.bac_attuale ?? 0} />
          </div>
        )
      })}
    </div>
  )
}

// ── Grafico multi-linea ───────────────────────────────────────────────
function GraficoCollettivo({ curveMap, partecipanti }) {
  if (!curveMap || Object.keys(curveMap).length === 0) {
    return (
      <div className={s.emptyChart}>
        <p>Il grafico apparirà quando i partecipanti iniziano a bere</p>
      </div>
    )
  }

  // Merge tutte le curve su un unico asse temporale
  const allLabels = new Set()
  Object.values(curveMap).forEach(curva =>
    curva.forEach(p => allLabels.add(p.label_ora))
  )
  const labelsSorted = Array.from(allLabels).sort()
  const merged = labelsSorted.map(label => {
    const row = { label_ora: label }
    Object.entries(curveMap).forEach(([uid, curva]) => {
      const pt = curva.find(p => p.label_ora === label)
      row[uid] = pt?.bac ?? 0
    })
    return row
  })

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={merged} margin={{ top: 10, right: 16, bottom: 0, left: -20 }}>
        <XAxis dataKey="label_ora" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} domain={[0, 'auto']} tickFormatter={v => v.toFixed(2)} />
        <Tooltip
          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 11 }}
          formatter={(val, name) => {
            const p = partecipanti.find(x => x.user_id === name)
            return [`${Number(val).toFixed(3)} g/l`, p?.username || 'Utente']
          }}
          labelStyle={{ color: 'var(--text-sec)', marginBottom: 4 }}
        />
        <ReferenceLine y={0.5} stroke="#dc2626" strokeDasharray="4 4" strokeWidth={1} />
        <ReferenceLine y={0.2} stroke="#16a34a" strokeDasharray="4 4" strokeWidth={1} />
        {partecipanti.map((p, i) => (
          <Line
            key={p.user_id}
            type="monotone"
            dataKey={p.user_id}
            stroke={getColor(i)}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: getColor(i) }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

// ── Host panel: menu + controlli ──────────────────────────────────────
function HostPanel({ jamId, menu, onMenuChange, jam, onAvvia, onChiudi }) {
  const CAT_ORDER = ['birra', 'vino', 'cocktail', 'shot', 'acqua']
  const INT_LABELS = { leggero: 'Leg.', ideale: 'Std.', pesante: 'Pes.' }

  return (
    <div className={s.hostPanel}>
      <div className={s.hostTitle}>
        👑 Controlli host
      </div>

      {/* Stato jam */}
      <div className={s.hostStato}>
        <span className={`${s.statoBadge} ${s['stato_' + jam.stato]}`}>
          {jam.stato === 'attesa' ? '⏳ In attesa' : jam.stato === 'attiva' ? '🟢 Attiva' : '🔴 Chiusa'}
        </span>
        <span className={s.jamCode}>Codice: <strong>{jam.code}</strong></span>
      </div>

      {jam.stato === 'attesa' && (
        <button className={s.hostBtn} onClick={onAvvia}>
          🚀 Avvia la serata
        </button>
      )}
      {jam.stato === 'attiva' && (
        <button className={`${s.hostBtn} ${s.hostBtnDanger}`} onClick={onChiudi}>
          🔒 Chiudi la serata
        </button>
      )}

      {/* Menu drink */}
      <div className={s.menuTitle}>Menu drink disponibili</div>
      {CAT_ORDER.map(cat => {
        const voci = menu.filter(m => m.categoria === cat)
        if (voci.length === 0) return null
        return (
          <div key={cat} className={s.menuCategoria}>
            <div className={s.menuCatHeader}>
              <DrinkIcon categoria={cat} size={16} color="var(--accent)" />
              <span>{cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
            </div>
            <div className={s.menuVoci}>
              {voci.map(v => (
                <label key={v.id} className={s.menuVoce}>
                  <input
                    type="checkbox"
                    checked={v.disponibile}
                    onChange={e => onMenuChange(cat, v.intensita, e.target.checked)}
                    className={s.menuCheck}
                  />
                  <span className={`${s.menuLabel} ${!v.disponibile ? s.menuLabelOff : ''}`}>
                    {INT_LABELS[v.intensita] || v.intensita}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Modale aggiunta drink ─────────────────────────────────────────────
function DrinkModal({ menu, onAggiungi, onClose, adding }) {
  const [catSel, setCatSel] = useState('birra')
  const [intSel, setIntSel] = useState('ideale')

  const disponibili = menu.filter(m => m.disponibile)
  const catDisp = [...new Set(disponibili.map(m => m.categoria))]
  const intDisp = disponibili.filter(m => m.categoria === catSel).map(m => m.intensita)

  // Se la cat/int selezionata non è disponibile, resetta
  useEffect(() => {
    if (!catDisp.includes(catSel) && catDisp.length > 0) setCatSel(catDisp[0])
  }, [menu])
  useEffect(() => {
    if (!intDisp.includes(intSel) && intDisp.length > 0) setIntSel(intDisp[0])
  }, [catSel, menu])

  const CATS_INFO = { birra: 'Birra', vino: 'Vino', cocktail: 'Cocktail', shot: 'Shot', acqua: 'Acqua' }
  const INT_INFO  = { leggero: 'Leggero', ideale: 'Ideale', pesante: 'Pesante' }

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} onClick={e => e.stopPropagation()}>
        <div className={s.modalHead}>
          <h3>Cosa stai bevendo?</h3>
          <button className={s.modalClose} onClick={onClose}>✕</button>
        </div>

        <p className={s.modalLabel}>Categoria</p>
        <div className={s.catGrid}>
          {catDisp.map(cat => (
            <button key={cat} className={`${s.catBtn} ${catSel === cat ? s.catBtnSel : ''}`}
              onClick={() => setCatSel(cat)}>
              <DrinkIcon categoria={cat} size={28} color={catSel === cat ? 'var(--accent)' : 'var(--text-sec)'} />
              <span className={s.catLabel}>{CATS_INFO[cat]}</span>
            </button>
          ))}
        </div>

        {intDisp.length > 0 && (
          <>
            <p className={s.modalLabel}>Intensità</p>
            <div className={s.intRow}>
              {intDisp.map(i => {
                const g = getGrammiPreset(catSel, i)
                return (
                  <button key={i} className={`${s.intBtn} ${intSel === i ? s.intBtnSel : ''}`}
                    onClick={() => setIntSel(i)}>
                    <span className={s.intLabel}>{INT_INFO[i]}</span>
                    <span className={s.intG}>{g.toFixed(0)}g</span>
                  </button>
                )
              })}
            </div>
          </>
        )}

        <button className={s.addBtn} onClick={() => onAggiungi(catSel, intSel)} disabled={adding}>
          {adding ? <span className="spinner" /> : '+ Aggiungi'}
        </button>
      </div>
    </div>
  )
}

// ── Modale attesa (prima dell'avvio) ──────────────────────────────────
function SalaAttesa({ jam, partecipanti, isHost, onAvvia }) {
  return (
    <div className={s.salaAttesa}>
      <div className={s.salaIcon}>🎉</div>
      <h2 className={s.salaTitle}>{jam.name}</h2>
      <div className={s.salaCodice}>
        <span>Codice serata</span>
        <strong className={s.salaCode}>{jam.code}</strong>
        <span className={s.salaCodeHint}>Condividilo con gli amici</span>
      </div>
      <div className={s.salaPartecipanti}>
        <div className={s.salaPartTitle}>
          {partecipanti.length} partecipant{partecipanti.length === 1 ? 'e' : 'i'}
        </div>
        {partecipanti.map((p, i) => (
          <div key={p.user_id} className={s.salaAvatar}>
            <span className={s.salaAvatarDot} style={{ background: getColor(i) }} />
            {p.username || 'Utente'}
          </div>
        ))}
      </div>
      {isHost && (
        <button className={s.avviaBtn} onClick={onAvvia}>
          🚀 Avvia la serata
        </button>
      )}
      {!isHost && (
        <p className={s.salaWait}>In attesa che il host avvii la serata…</p>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPALE
// ══════════════════════════════════════════════════════════════════════
export default function JamSessione() {
  const { id }      = useParams()          // jam_id
  const { user }    = useAuth()
  const { isDark }  = useTheme()
  const nav         = useNavigate()

  const [jam, setJam]                   = useState(null)
  const [partecipanti, setPartecipanti] = useState([])
  const [menu, setMenu]                 = useState([])
  const [allDrinks, setAllDrinks]       = useState([])
  const [profilo, setProfilo]           = useState(null)
  const [loading, setLoading]           = useState(true)
  const [showDrinkModal, setShowDrinkModal] = useState(false)
  const [adding, setAdding]             = useState(false)
  const [foto, setFoto]                 = useState([])

  // BAC calcolati
  const [myBac, setMyBac]           = useState(0)
  const [myZona, setMyZona]         = useState('sobrio')
  const [myCurva, setMyCurva]       = useState([])
  const [curveMap, setCurveMap]     = useState({}) // { userId: curva[] }

  const isHost = jam?.host_id === user?.id
  const greenColor = isDark ? '#4ade80' : '#16a34a'
  const redColor   = isDark ? '#f87171' : '#dc2626'

  // ── Ricalcola BAC ───────────────────────────────────────────────────
  const ricalcola = useCallback((drinks, parts, prof) => {
    if (!prof) return
    const now = Date.now()

    // Calcola BAC per ogni partecipante
    const nuoveCurve = {}
    parts.forEach(p => {
      const pDrinks = drinks
        .filter(d => d.user_id === p.user_id && d.categoria !== 'acqua')
        .map(drinkToCalcolo)

      const pProfilo = creaProfiloUtente(
        p.peso_kg || 70,
        p.sesso || 'uomo',
        p.tipo_patente || 'standard',
        p.stomaco || 'pasto_completo'
      )

      const bac = pDrinks.length > 0 ? calcolaBACTotale(pDrinks, now, pProfilo) : 0
      if (p.user_id === user?.id) {
        setMyBac(Math.round(bac * 1000) / 1000)
        setMyZona(getZonaBac(bac))
        setMyCurva(generaCurvaBac(pDrinks, pProfilo, 5))
      }

      if (pDrinks.length > 0) {
        nuoveCurve[p.user_id] = generaCurvaBac(pDrinks, pProfilo, 5)
      }
    })
    setCurveMap(nuoveCurve)

    // Aggiorna il proprio BAC su Supabase (throttled)
    if (jam?.id && user?.id) {
      const myDrinks = drinks
        .filter(d => d.user_id === user.id && d.categoria !== 'acqua')
        .map(drinkToCalcolo)
      const myBacVal = myDrinks.length > 0 ? calcolaBACTotale(myDrinks, now, prof) : 0
      aggiornaBacPartecipante(jam.id, user.id, myBacVal).catch(() => {})
    }
  }, [jam, user])

  // ── Caricamento iniziale ─────────────────────────────────────────────
  useEffect(() => {
    if (!user || !id) return
    ;(async () => {
      try {
        // Carica jam, partecipanti, menu, drink
        const [jamRes, partsRes, menuRes, drinksRes, profileRes] = await Promise.all([
          import('../lib/supabase.js').then(m =>
            m.supabase.from('jam_sessions').select('*').eq('id', id).single()
          ),
          caricaPartecipanti(id),
          caricaMenu(id),
          caricaDrinkJam(id),
          caricaProfile(user.id),
        ])

        if (jamRes.error) throw jamRes.error
        setJam(jamRes.data)
        setPartecipanti(partsRes)
        setMenu(menuRes)
        setAllDrinks(drinksRes)

        if (profileRes) {
          const prof = creaProfiloUtente(
            profileRes.peso_kg, profileRes.sesso,
            profileRes.tipo_patente, profileRes.stomaco || 'pasto_completo'
          )
          setProfilo(prof)
          // Assicurati di essere tra i partecipanti
          await uniscitiJam(id, user.id, { ...profileRes, stomaco: 'pasto_completo' })
          ricalcola(drinksRes, partsRes, prof)
        }
      } catch(e) { console.error(e) }
      finally { setLoading(false) }
    })()
  }, [user, id])

  // ── Realtime ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return
    const unsub = subscribeJam(
      id,
      // Partecipanti aggiornati
      async () => {
        const parts = await caricaPartecipanti(id)
        setPartecipanti(parts)
      },
      // Nuovo drink aggiunto da qualcuno
      async (payload) => {
        const nuovoDrink = payload.new
        setAllDrinks(prev => {
          const aggiornati = [...prev, nuovoDrink]
          // Ricalcola con dati aggiornati
          setPartecipanti(parts => {
            ricalcola(aggiornati, parts, profilo)
            return parts
          })
          return aggiornati
        })
      },
      // Nuova foto
      async () => {
        const f = await caricaFotoJam(id)
        setFoto(f)
      }
    )
    return unsub
  }, [id, profilo, ricalcola])

  // ── Timer aggiornamento BAC ogni 60s ─────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => {
      if (allDrinks.length > 0 && profilo) {
        ricalcola(allDrinks, partecipanti, profilo)
      }
    }, 60000)
    return () => clearInterval(t)
  }, [allDrinks, partecipanti, profilo, ricalcola])

  // ── Handlers ─────────────────────────────────────────────────────────
  const handleAggiungiDrink = async (cat, int) => {
    if (!user || !id) return
    setAdding(true)
    try {
      const nd = await aggiungiDrinkJam(id, user.id, cat, int)
      const nuovi = [...allDrinks, nd]
      setAllDrinks(nuovi)
      ricalcola(nuovi, partecipanti, profilo)
      setShowDrinkModal(false)
    } catch(e) { alert(e.message) }
    finally { setAdding(false) }
  }

  const handleMenuChange = async (cat, int, disp) => {
    await aggiornaMenu(id, cat, int, disp)
    setMenu(prev => prev.map(m =>
      m.categoria === cat && m.intensita === int ? { ...m, disponibile: disp } : m
    ))
  }

  const handleAvvia = async () => {
    if (!jam) return
    await avviaJam(jam.id)
    setJam(prev => ({ ...prev, stato: 'attiva', data_inizio: new Date().toISOString() }))
  }

  const handleChiudi = async () => {
    if (!window.confirm('Vuoi chiudere la serata per tutti?')) return
    await chiudiJam(jam.id)
    setJam(prev => ({ ...prev, stato: 'chiusa' }))
  }

  const myDrinks = allDrinks.filter(d => d.user_id === user?.id)
  const myDrinkChart = myCurva.map(p => ({
    label_ora: p.label_ora,
    sobrio:    p.bac > 0 && p.bac <= 0.2 ? p.bac : p.bac > 0.2 ? 0.2 : 0,
    sweet:     p.bac > 0.2 && p.bac <= 0.5 ? p.bac : p.bac > 0.5 ? 0.5 : 0,
    alterato:  p.bac > 0.5 ? p.bac : 0,
    bac:       p.bac,
  }))

  const zonaColor = myZona === 'sobrio' ? 'var(--text-muted)' : myZona === 'sweet_spot' ? 'var(--green)' : 'var(--red)'

  if (loading) return (
    <div className={s.loading}>
      <div className={s.spinner} />
      <p>Connessione alla jam...</p>
    </div>
  )

  if (!jam) return (
    <div className={s.loading}><p>Jam non trovata</p></div>
  )

  // ── Sala attesa ───────────────────────────────────────────────────────
  if (jam.stato === 'attesa') return (
    <SalaAttesa
      jam={jam}
      partecipanti={partecipanti}
      isHost={isHost}
      onAvvia={handleAvvia}
    />
  )

  // ── Vista principale ──────────────────────────────────────────────────
  return (
    <div className={s.root}>
      {/* Header */}
      <header className={`${s.header} card`}>
        <button className={s.backBtn} onClick={() => nav('/')}>← Home</button>
        <div className={s.headerCenter}>
          <span className={s.jamName}>{jam.name}</span>
          <span className={`${s.stato} ${s['stato_' + jam.stato]}`}>
            {jam.stato === 'attiva' ? '● Live' : '✓ Chiusa'}
          </span>
        </div>
        <span className={s.jamCodeBadge}>{jam.code}</span>
      </header>

      <div className={s.layout}>
        {/* Colonna sinistra */}
        <div className={s.leftCol}>

          {/* Il mio BAC */}
          <div className={`card ${s.myBacCard}`} style={{ borderColor: zonaColor }}>
            <div className={s.myBacLabel}>Il mio BAC</div>
            <div className={s.myBacVal} style={{ color: zonaColor }}>{myBac.toFixed(3)}</div>
            <div className={s.myBacUnit}>g/l</div>
            <div className={s.myBacZona} style={{ background: zonaColor + '22', color: zonaColor }}>
              {myZona === 'sobrio' ? 'Sobrio' : myZona === 'sweet_spot' ? '🎯 Sweet Spot' : '⚠️ Alterato'}
            </div>
          </div>

          {/* Classifica live */}
          <div className={`card ${s.classificaCard}`}>
            <Classifica partecipanti={partecipanti} myId={user?.id} />
          </div>

          {/* I miei drink */}
          <div className={`card ${s.myDrinks}`}>
            <div className={s.myDrinksTitle}>
              I miei drink
              {myDrinks.filter(d => d.categoria !== 'acqua').length > 0 && (
                <span className={s.myDrinksCount}>
                  {myDrinks.filter(d => d.categoria !== 'acqua').length}
                </span>
              )}
            </div>
            {myDrinks.filter(d => d.categoria !== 'acqua').length === 0
              ? <p className={s.empty}>Nessun drink ancora</p>
              : myDrinks.filter(d => d.categoria !== 'acqua').map(d => (
                <div key={d.id} className={s.drinkRow}>
                  <DrinkIcon categoria={d.categoria} size={18} color="var(--accent)" />
                  <div className={s.drinkInfo}>
                    <span className={s.drinkName}>{d.categoria} · {d.intensita}</span>
                    <span className={s.drinkTime}>{new Date(d.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <span className={s.drinkG}>{Number(d.grammi_alcol).toFixed(0)}g</span>
                </div>
              ))
            }
          </div>

          {/* Azioni */}
          {jam.stato === 'attiva' && (
            <div className={s.actions}>
              <button className={s.waterBtn} onClick={() => handleAggiungiDrink('acqua', 'ideale')}>
                💧 Acqua
              </button>
              <button className={s.drinkBtn} onClick={() => setShowDrinkModal(true)}>
                + Drink
              </button>
            </div>
          )}

          {/* Host controls */}
          {isHost && (
            <HostPanel
              jamId={id}
              menu={menu}
              onMenuChange={handleMenuChange}
              jam={jam}
              onAvvia={handleAvvia}
              onChiudi={handleChiudi}
            />
          )}
        </div>

        {/* Colonna destra */}
        <div className={s.rightCol}>

          {/* Grafico personale */}
          {myDrinkChart.length > 0 && (
            <div className={`card ${s.chartCard}`}>
              <h3 className={s.chartTitle}>Il mio BAC</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={myDrinkChart} margin={{ top: 8, right: 16, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="jgS" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#94a3b8" stopOpacity={0.4}/><stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/></linearGradient>
                    <linearGradient id="jgG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={greenColor} stopOpacity={0.5}/><stop offset="95%" stopColor={greenColor} stopOpacity={0}/></linearGradient>
                    <linearGradient id="jgR" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={redColor} stopOpacity={0.5}/><stop offset="95%" stopColor={redColor} stopOpacity={0}/></linearGradient>
                  </defs>
                  <XAxis dataKey="label_ora" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} interval="preserveStartEnd"/>
                  <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} domain={[0,'auto']} tickFormatter={v => v.toFixed(2)}/>
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 11 }} formatter={(val, name) => { if(!val||val===0) return null; const l={sobrio:'Sobrio',sweet:'Sweet Spot',alterato:'Alterato'}; return [`${Number(val).toFixed(3)} g/l`, l[name]??name] }} labelStyle={{ color: 'var(--text-sec)' }}/>
                  <ReferenceLine y={0.5} stroke={redColor} strokeDasharray="4 4" strokeWidth={1}/>
                  <ReferenceLine y={0.2} stroke={greenColor} strokeDasharray="4 4" strokeWidth={1}/>
                  <Area type="monotone" dataKey="sobrio"   stroke="#94a3b8"   strokeWidth={2} fill="url(#jgS)" dot={false}/>
                  <Area type="monotone" dataKey="sweet"    stroke={greenColor} strokeWidth={2} fill="url(#jgG)" dot={false}/>
                  <Area type="monotone" dataKey="alterato" stroke={redColor}   strokeWidth={2} fill="url(#jgR)" dot={false}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Grafico collettivo */}
          <div className={`card ${s.chartCard}`}>
            <h3 className={s.chartTitle}>🏟 Confronto BAC — tutti</h3>
            <GraficoCollettivo curveMap={curveMap} partecipanti={partecipanti} />
            {/* Legenda nomi */}
            <div className={s.legendaNomi}>
              {partecipanti.map((p, i) => (
                <span key={p.user_id} className={s.legendaNome}>
                  <span className={s.legendaDot} style={{ background: getColor(i) }} />
                  {p.username || 'Utente'}{p.user_id === user?.id ? ' (tu)' : ''}
                </span>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Modal drink */}
      {showDrinkModal && (
        <DrinkModal
          menu={menu}
          onAggiungi={handleAggiungiDrink}
          onClose={() => setShowDrinkModal(false)}
          adding={adding}
        />
      )}
    </div>
  )
}

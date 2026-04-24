import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { useAuth } from '../lib/auth.jsx'
import { useTheme } from '../lib/theme.jsx'
import { caricaSessioneCompleta, aggiungiDrink, chiudiSessione, salvaProfile, caricaProfile } from '../lib/supabase.js'
import {
  creaProfiloUtente, calcolaBACTotale, generaCurvaBac,
  calcolaGhostPeak, calcolaCountdownGuida, analizzaDrinkRavvicinati,
  getGrammiPreset, getZonaBac,
} from '../lib/bacEngine.js'
import s from './Sessione.module.css'

const CATS = [
  { key:'birra',    emoji:'🍺', label:'Birra'    },
  { key:'vino',     emoji:'🍷', label:'Vino'     },
  { key:'cocktail', emoji:'🍹', label:'Cocktail' },
  { key:'shot',     emoji:'🥃', label:'Shot'     },
]
const INTENS = ['leggero', 'ideale', 'pesante']

function BacGauge({ bac, zona }) {
  const color = zona === 'sobrio' ? 'var(--text-muted)' : zona === 'sweet_spot' ? 'var(--green)' : 'var(--red)'
  const label = zona === 'sobrio' ? 'Sobrio' : zona === 'sweet_spot' ? '🎯 Sweet Spot' : '⚠️ Alterato'
  return (
    <div className={s.gauge} style={{ borderColor: color }}>
      <span className={s.gaugeLabel}>BAC attuale</span>
      <span className={s.gaugeValue} style={{ color }}>{Number(bac).toFixed(3)}</span>
      <span className={s.gaugeUnit}>g/l</span>
      <span className={s.gaugeBadge} style={{ background: color + '22', color }}>{label}</span>
    </div>
  )
}

export default function Sessione() {
  const { id } = useParams()
  const { user } = useAuth()
  const { isDark } = useTheme()
  const nav = useNavigate()

  const [sessione, setSessione] = useState(null)
  const [drinks, setDrinks] = useState([])
  const [profilo, setProfilo] = useState(null)
  const [bac, setBac] = useState(0)
  const [zona, setZona] = useState('sobrio')
  const [ghost, setGhost] = useState(null)
  const [countdown, setCountdown] = useState(null)
  const [avviso, setAvviso] = useState(null)
  const [curva, setCurva] = useState([])
  const [loading, setLoading] = useState(true)

  // Drink modal
  const [showModal, setShowModal] = useState(false)
  const [catSel, setCatSel] = useState('birra')
  const [intSel, setIntSel] = useState('ideale')
  const [adding, setAdding] = useState(false)

  // Profile modal
  const [showProfile, setShowProfile] = useState(false)
  const [peso, setPeso] = useState('70')
  const [sesso, setSesso] = useState('uomo')
  const [patente, setPatente] = useState('standard')

  const toCalcolo = (d) =>
    d.filter(x => x.categoria !== 'acqua')
     .map(x => ({ grammi: x.grammi_alcol, timestamp_ms: new Date(x.timestamp).getTime() }))

  const ricalcola = useCallback((d, prof) => {
    const mapped = toCalcolo(d)
    const bacVal = calcolaBACTotale(mapped, Date.now(), prof)
    setBac(Math.round(bacVal * 1000) / 1000)
    setZona(getZonaBac(bacVal))
    setGhost(calcolaGhostPeak(mapped, prof))
    setCountdown(calcolaCountdownGuida(mapped, prof))
    setAvviso(analizzaDrinkRavvicinati(mapped))
    setCurva(generaCurvaBac(mapped, prof, 5))
  }, [])

  useEffect(() => {
    if (!user || !id) return
    ;(async () => {
      try {
        const { sessione: sess, drinks: d } = await caricaSessioneCompleta(id)
        setSessione(sess)
        setDrinks(d)
        const p = await caricaProfile(user.id)
        if (!p) { setShowProfile(true); setLoading(false); return }
        const prof = creaProfiloUtente(p.peso_kg, p.sesso, p.tipo_patente, sess.stomaco)
        setProfilo(prof)
        ricalcola(d, prof)
      } catch (e) { alert(e.message) }
      finally { setLoading(false) }
    })()
  }, [user, id])

  useEffect(() => {
    if (!profilo || drinks.length === 0) return
    const t = setInterval(() => ricalcola(drinks, profilo), 60000)
    return () => clearInterval(t)
  }, [drinks, profilo, ricalcola])

  const handleSalvaProfilo = async () => {
    if (!user) return
    const p = await salvaProfile({ id: user.id, peso_kg: parseFloat(peso), sesso, tipo_patente: patente })
    const prof = creaProfiloUtente(p.peso_kg, p.sesso, p.tipo_patente, sessione.stomaco)
    setProfilo(prof)
    setShowProfile(false)
    ricalcola(drinks, prof)
  }

  const handleAggiungiDrink = async () => {
    if (!user || !id || !profilo) return
    setAdding(true)
    try {
      const grammi = getGrammiPreset(catSel, intSel)
      const nd = await aggiungiDrink(id, user.id, catSel, grammi, intSel)
      const nuovi = [...drinks, nd]
      setDrinks(nuovi)
      ricalcola(nuovi, profilo)
      setShowModal(false)
    } catch (e) { alert(e.message) }
    finally { setAdding(false) }
  }

  const handleAcqua = async () => {
    if (!user || !id) return
    try {
      const nd = await aggiungiDrink(id, user.id, 'acqua', 0, null)
      setDrinks(prev => [...prev, nd])
    } catch (e) { alert(e.message) }
  }

  const handleChiudi = async () => {
    if (!window.confirm('Vuoi concludere questa serata?')) return
    try {
      const picco = curva.length ? Math.max(...curva.map(p => p.bac), 0) : 0
      const mlAcqua = drinks.filter(d => d.categoria === 'acqua').length * 250
      await chiudiSessione(id, picco, mlAcqua, '', 80)
      nav('/')
    } catch (e) { alert(e.message) }
  }

  const drinkCount  = drinks.filter(d => d.categoria !== 'acqua').length
  const acquaCount  = drinks.filter(d => d.categoria === 'acqua').length
  const greenColor  = isDark ? '#4ade80' : '#16a34a'
  const redColor    = isDark ? '#f87171' : '#dc2626'

  const chartData = curva.map(p => ({
    ...p,
    sobrio:   p.bac < 0.2 ? p.bac : 0.2,
    sweet:    p.bac >= 0.2 && p.bac < 0.5 ? p.bac : p.bac < 0.2 ? 0 : 0.5,
    alterato: p.bac >= 0.5 ? p.bac : 0,
  }))

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
        </div>
        <button className={`btn-ghost ${s.closeBtn}`} onClick={handleChiudi}>Chiudi serata</button>
      </header>

      <div className={s.layout}>
        {/* Left col */}
        <div className={s.leftCol}>
          <div className="fade-up"><BacGauge bac={bac} zona={zona} /></div>

          <div className={`${s.infoCards} fade-up-2`}>
            {ghost && ghost.bac_picco > bac + 0.01 && (
              <div className={`card ${s.infoCard}`} style={{ borderLeft:`3px solid ${ghost.is_pericoloso ? redColor : greenColor}` }}>
                <div className={s.infoCardTitle}>👻 Ghost Peak</div>
                <div className={s.infoCardVal}>{Number(ghost.bac_picco).toFixed(3)} g/l</div>
                <div className={s.infoCardSub}>tra {ghost.minuti_al_picco}min · alle {ghost.label_ora_picco}</div>
              </div>
            )}
            {countdown && (
              <div className={`card ${s.infoCard}`} style={{ borderLeft:`3px solid ${countdown.puo_guidare ? greenColor : redColor}` }}>
                <div className={s.infoCardTitle}>🚗 Guida</div>
                <div className={s.infoCardVal} style={{ fontSize:15 }}>{countdown.messaggio}</div>
              </div>
            )}
            {avviso?.avviso && (
              <div className={`card ${s.infoCard}`} style={{ borderLeft:'3px solid var(--red)' }}>
                <div className={s.infoCardVal} style={{ fontSize:13 }}>{avviso.messaggio}</div>
              </div>
            )}
          </div>

          <div className={`card ${s.counters} fade-up-3`}>
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
              <span className={s.counterVal} style={{ textTransform:'capitalize', fontSize:13 }}>
                {sessione?.stomaco.replace(/_/g, ' ')}
              </span>
              <span className={s.counterLbl}>stomaco</span>
            </div>
          </div>

          <div className={`${s.actions} fade-up-4`}>
            <button className="btn-ghost" style={{ flex:1 }} onClick={handleAcqua}>💧 Acqua</button>
            <button className="btn-primary" style={{ flex:2 }} onClick={() => setShowModal(true)}>+ Aggiungi drink</button>
          </div>
        </div>

        {/* Right col */}
        <div className={s.rightCol}>
          {curva.length > 0 && (
            <div className={`card ${s.chartCard} fade-up`}>
              <h3 className={s.chartTitle}>Curva BAC</h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top:10, right:10, bottom:0, left:-20 }}>
                  <defs>
                    <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#94a3b8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={greenColor} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={greenColor} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={redColor} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={redColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label_ora" tick={{ fontSize:10, fill:'var(--text-muted)' }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize:10, fill:'var(--text-muted)' }} domain={[0,'auto']} />
                  <Tooltip
                    contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, fontSize:12 }}
                    formatter={(val) => [`${Number(val).toFixed(3)} g/l`, 'BAC']}
                    labelStyle={{ color:'var(--text-sec)' }}
                  />
                  <ReferenceLine y={0.5} stroke={redColor}   strokeDasharray="4 4" strokeWidth={1} />
                  <ReferenceLine y={0.2} stroke={greenColor} strokeDasharray="4 4" strokeWidth={1} />
                  <Area type="monotone" dataKey="sobrio"   stroke="#94a3b8"  fill="url(#gS)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="sweet"    stroke={greenColor} fill="url(#gG)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="alterato" stroke={redColor}   fill="url(#gR)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
              <div className={s.chartLegend}>
                <span style={{ color:'#94a3b8' }}>⬤ Sobrio &lt;0.2</span>
                <span style={{ color:greenColor }}>⬤ Sweet Spot 0.2–0.5</span>
                <span style={{ color:redColor }}>⬤ Alterato &gt;0.5</span>
              </div>
            </div>
          )}

          <div className={`card ${s.drinkList} fade-up-2`}>
            <h3 className={s.drinkListTitle}>Drink della serata</h3>
            {drinkCount === 0
              ? <p className={s.drinkEmpty}>Nessun drink aggiunto ancora</p>
              : drinks.filter(d => d.categoria !== 'acqua').map(d => (
                <div key={d.id} className={s.drinkRow}>
                  <span className={s.drinkEmoji}>
                    {d.categoria==='birra'?'🍺':d.categoria==='vino'?'🍷':d.categoria==='cocktail'?'🍹':'🥃'}
                  </span>
                  <div className={s.drinkInfo}>
                    <span className={s.drinkName}>{d.categoria.charAt(0).toUpperCase()+d.categoria.slice(1)}{d.intensita ? ` · ${d.intensita}` : ''}</span>
                    <span className={s.drinkTime}>{new Date(d.timestamp).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})}</span>
                  </div>
                  <span className={s.drinkG}>{d.grammi_alcol}g</span>
                </div>
              ))
            }
          </div>
        </div>
      </div>

      {/* Drink modal */}
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
                <button key={c.key} className={`${s.catBtn} ${catSel===c.key ? s.catBtnSel : ''}`} onClick={() => setCatSel(c.key)}>
                  <span className={s.catEmoji}>{c.emoji}</span>
                  <span className={s.catLabel}>{c.label}</span>
                </button>
              ))}
            </div>
            <p className={s.modalLabel}>Intensità</p>
            <div className={s.intRow}>
              {INTENS.map(i => (
                <button key={i} className={`${s.intBtn} ${intSel===i ? s.intBtnSel : ''}`} onClick={() => setIntSel(i)}>
                  <span className={s.intLabel}>{i}</span>
                  <span className={s.intG}>{getGrammiPreset(catSel, i)}g</span>
                </button>
              ))}
            </div>
            <div className={s.modalPreview}>
              Stai aggiungendo: <strong>{CATS.find(c=>c.key===catSel)?.emoji} {catSel} {intSel}</strong> · {getGrammiPreset(catSel, intSel)}g di alcol puro
            </div>
            <button className="btn-primary" style={{ width:'100%', marginTop:16 }} onClick={handleAggiungiDrink} disabled={adding}>
              {adding ? <span className="spinner" /> : 'Aggiungi'}
            </button>
          </div>
        </div>
      )}

      {/* Profile modal */}
      {showProfile && (
        <div className={s.overlay}>
          <div className={`card ${s.modal}`}>
            <h3 style={{ marginBottom:8 }}>Il tuo profilo</h3>
            <p style={{ fontSize:13, color:'var(--text-sec)', marginBottom:20 }}>Necessario per calcolare il BAC accuratamente</p>
            <p className={s.modalLabel}>Peso (kg)</p>
            <input className="input-field" type="number" value={peso} onChange={e => setPeso(e.target.value)} />
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

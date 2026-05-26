import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../lib/theme.jsx'
import { useAuth } from '../lib/auth.jsx'
import { caricaSessioni, caricaProfile, salvaProfile, signOut, eliminaSessione } from '../lib/supabase.js'
import s from './Home.module.css'

const fmtData = (iso) => new Date(iso).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
const fmtOra  = (iso) => new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })

function ZonaBadge({ bac, aperta }) {
  if (aperta)             return <span className={`${s.badge} ${s.badgeLive}`}>● Live</span>
  if (!bac || bac < 0.2)  return <span className={`${s.badge} ${s.badgeSobrio}`}>Sobrio</span>
  if (bac < 0.5)          return <span className={`${s.badge} ${s.badgeSweet}`}>Sweet Spot</span>
  return                          <span className={`${s.badge} ${s.badgeAlterato}`}>Alterato</span>
}

// ── Modal profilo ─────────────────────────────────────────────────────
function ProfileModal({ user, onClose }) {
  const [username, setUsername] = useState('')
  const [peso, setPeso]         = useState('')
  const [sesso, setSesso]       = useState('uomo')
  const [patente, setPatente]   = useState('standard')
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState(false)

  useEffect(() => {
    caricaProfile(user.id).then(p => {
      if (p) { setUsername(p.username ?? ''); setPeso(String(p.peso_kg)); setSesso(p.sesso); setPatente(p.tipo_patente) }
      setLoading(false)
    })
  }, [user.id])

  const handleSalva = async () => {
    setError('')
    if (!peso || isNaN(parseFloat(peso))) { setError('Inserisci un peso valido'); return }
    setSaving(true)
    try {
      await salvaProfile({ id: user.id, username: username.trim() || null, peso_kg: parseFloat(peso), sesso, tipo_patente: patente })
      setSuccess(true)
      setTimeout(onClose, 800)
    } catch(e) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={`card ${s.modal}`} onClick={e => e.stopPropagation()}>
        <div className={s.modalHead}>
          <h3>Il tuo profilo</h3>
          <button className={s.modalClose} onClick={onClose}>✕</button>
        </div>
        {loading ? (
          <div style={{ textAlign:'center', padding:'32px 0' }}>
            <div style={{ width:28,height:28,border:'2px solid var(--border)',borderTopColor:'var(--accent)',borderRadius:'50%',animation:'spin .7s linear infinite',margin:'0 auto' }} />
          </div>
        ) : (
          <>
            {error   && <div className={s.modalError}>{error}</div>}
            {success && <div className={s.modalSuccess}>✅ Salvato!</div>}
            <label className={s.modalLabel}>Username</label>
            <input className="input-field" placeholder="es. Marco" value={username} onChange={e => setUsername(e.target.value)} />
            <label className={s.modalLabel}>Peso corporeo (kg)</label>
            <input className="input-field" type="number" placeholder="es. 72" value={peso} onChange={e => setPeso(e.target.value)} />
            <label className={s.modalLabel}>Sesso biologico</label>
            <div className={s.modalOptRow}>
              {[{k:'uomo',l:'♂  Uomo'},{k:'donna',l:'♀  Donna'}].map(o => (
                <button key={o.k} className={`${s.modalOpt} ${sesso===o.k?s.modalOptSel:''}`} onClick={() => setSesso(o.k)}>
                  {o.l}
                </button>
              ))}
            </div>
            <label className={s.modalLabel}>Tipo di patente</label>
            <div className={s.modalOptRow}>
              {[{k:'standard',l:'Standard'},{k:'neopatentato',l:'Neopatentato'}].map(o => (
                <button key={o.k} className={`${s.modalOpt} ${patente===o.k?s.modalOptSel:''}`} onClick={() => setPatente(o.k)}>
                  {o.l}
                </button>
              ))}
            </div>
            <div className={s.modalFooter}>
              <button className="btn-ghost" onClick={onClose}>Annulla</button>
              <button className="btn-primary" onClick={handleSalva} disabled={saving}>
                {saving ? <span className="spinner"/> : 'Salva'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Modal conferma eliminazione ───────────────────────────────────────
function DeleteModal({ sessione, onConfirm, onCancel }) {
  const [loading, setLoading] = useState(false)
  const handle = async () => {
    setLoading(true)
    await onConfirm()
    setLoading(false)
  }
  const fmtD = (iso) => new Date(iso).toLocaleDateString('it-IT', { weekday:'short', day:'numeric', month:'long' })
  return (
    <div className={s.overlay} onClick={onCancel}>
      <div className={`card ${s.deleteModal}`} onClick={e => e.stopPropagation()}>
        <div className={s.deleteIcon}>🗑</div>
        <h3 className={s.deleteTitle}>Eliminare questa serata?</h3>
        <p className={s.deleteText}>
          <strong>{fmtD(sessione.data_inizio)}</strong><br/>
          Questa azione è <strong>irreversibile</strong>. Tutti i drink e i dati associati verranno eliminati.
        </p>
        <div className={s.deleteActions}>
          <button className="btn-ghost" onClick={onCancel}>Annulla</button>
          <button className={s.deleteBtn} onClick={handle} disabled={loading}>
            {loading ? <span className="spinner" style={{ borderTopColor:'#fff' }}/> : 'Elimina'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Home ──────────────────────────────────────────────────────────────
export default function Home() {
  const { isDark, toggle } = useTheme()
  const { user }           = useAuth()
  const nav                = useNavigate()

  const [sessioni, setSessioni]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [showProfile, setShowProfile]   = useState(false)
  const [sessioneDaEliminare, setSessioneDaEliminare] = useState(null)
  const [nomeUtente, setNomeUtente]     = useState('')
  const [menuAperto, setMenuAperto]     = useState(false)

  // Chiude il menu mobile cliccando fuori
  useEffect(() => {
    if (!menuAperto) return
    const handle = (e) => {
      if (!e.target.closest('[data-mobile-menu]')) setMenuAperto(false)
    }
    document.addEventListener('click', handle)
    return () => document.removeEventListener('click', handle)
  }, [menuAperto])

  const carica = () => {
    if (!user) return
    caricaSessioni(user.id).then(data => { setSessioni(data); setLoading(false) })
    caricaProfile(user.id).then(p => {
      if (p && p.username) setNomeUtente(p.username)
      else setNomeUtente(user.email ? user.email.split('@')[0] : '')
    }).catch(() => {})
  }

  useEffect(() => { carica() }, [user])

  const handleLogout = async () => { await signOut(); nav('/auth') }

  const handleElimina = async () => {
    if (!sessioneDaEliminare) return
    try {
      await eliminaSessione(sessioneDaEliminare.id)
      setSessioni(prev => prev.filter(s => s.id !== sessioneDaEliminare.id))
      setSessioneDaEliminare(null)
    } catch(e) { alert(e.message) }
  }

  return (
    <div className={s.root}>
      <header className={`${s.header} card`}>
        <div className={s.headerLeft}>
          <span className={s.logo}>🌙</span>
          <div>
            <h1 className={s.title}>NightRecorder</h1>
            <p className={s.sub}>{sessioni.length} serate registrate</p>
          </div>
        </div>

        {/* Desktop actions */}
        <div className={s.headerRight}>
          <button className={s.themeSwitch} onClick={toggle} aria-label="Cambia tema">
            <span className={`${s.themeSwitchTrack} ${isDark ? s.themeSwitchDark : ''}`}>
              <span className={s.themeSwitchThumb}>{isDark ? '🌙' : '☀️'}</span>
            </span>
          </button>
          <button className={s.iconBtn} onClick={() => setShowProfile(true)}>
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.6"/><path d="M3 17c0-3.3 3.1-6 7-6s7 2.7 7 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
            {nomeUtente || 'Profilo'}
          </button>
          <button className={s.iconBtn} onClick={() => nav('/jam')}>
            🎉 Jam
          </button>
          <button className={s.iconBtn} onClick={handleLogout}>
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none"><path d="M13 3h4v14h-4M8 14l4-4-4-4M12 10H3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Esci
          </button>
          <button className={s.newBtn} onClick={() => nav('/nuova')}>+ Nuova serata</button>
        </div>

        {/* Mobile: solo switch tema + hamburger */}
        <div className={s.mobileActions} data-mobile-menu>
          <button className={s.themeSwitch} onClick={toggle} aria-label="Cambia tema">
            <span className={`${s.themeSwitchTrack} ${isDark ? s.themeSwitchDark : ''}`}>
              <span className={s.themeSwitchThumb}>{isDark ? '🌙' : '☀️'}</span>
            </span>
          </button>
          <button className={s.hamburger} onClick={() => setMenuAperto(p => !p)} aria-label="Menu">
            <span className={`${s.hamburgerLine} ${menuAperto ? s.hamburgerLine1Open : ''}`} />
            <span className={`${s.hamburgerLine} ${menuAperto ? s.hamburgerLineHidden : ''}`} />
            <span className={`${s.hamburgerLine} ${menuAperto ? s.hamburgerLine3Open : ''}`} />
          </button>
        </div>

        {/* Mobile dropdown menu */}
        {menuAperto && (
          <div className={s.mobileMenu} data-mobile-menu>
            <button className={s.mobileMenuItem} onClick={() => { setShowProfile(true); setMenuAperto(false) }}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.6"/><path d="M3 17c0-3.3 3.1-6 7-6s7 2.7 7 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
              {nomeUtente || 'Profilo'}
            </button>
            <button className={s.mobileMenuItem} onClick={() => { nav('/jam'); setMenuAperto(false) }}>
              🎉 Jam Session
            </button>
            <button className={s.mobileMenuItem} onClick={() => { nav('/nuova'); setMenuAperto(false) }}>
              + Nuova serata
            </button>
            <div className={s.mobileMenuDivider} />
            <button className={`${s.mobileMenuItem} ${s.mobileMenuItemDanger}`} onClick={handleLogout}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M13 3h4v14h-4M8 14l4-4-4-4M12 10H3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Esci
            </button>
          </div>
        )}
      </header>

      <main className={s.main}>
        {loading ? (
          <div className={s.loading}>
            <div style={{ width:32,height:32,border:'3px solid var(--border)',borderTopColor:'var(--accent)',borderRadius:'50%',animation:'spin .7s linear infinite' }} />
          </div>
        ) : sessioni.length === 0 ? (
          <div className={s.emptyWrapper}>
            <div className={`card ${s.jamCard} ${s.jamCardLarge} fade-up`} onClick={() => nav('/jam')}>
              <div className={s.jamCardIcon}>🎉</div>
              <div className={s.jamCardContent}>
                <div className={s.jamCardTitle}>Jam Session</div>
                <div className={s.jamCardSub}>Monitora il BAC con gli amici in tempo reale</div>
              </div>
              <div className={s.jamCardArrow}>→</div>
            </div>
            <div className={`${s.empty} card fade-up-2`}>
              <div className={s.emptyIcon}>🌙</div>
              <h2>Nessuna serata ancora</h2>
              <p>Inizia la tua prima serata per monitorare il BAC</p>
              <button className="btn-primary" onClick={() => nav('/nuova')}>+ Inizia adesso</button>
            </div>
          </div>
        ) : (
          <div className={s.grid}>

            {/* Card Jam Session — sempre visibile */}
            <div className={`card ${s.jamCard} fade-up`} onClick={() => nav('/jam')}>
              <div className={s.jamCardIcon}>🎉</div>
              <div className={s.jamCardContent}>
                <div className={s.jamCardTitle}>Jam Session</div>
                <div className={s.jamCardSub}>Monitora il BAC con gli amici in tempo reale</div>
              </div>
              <div className={s.jamCardArrow}>→</div>
            </div>

            {sessioni.map((sess, i) => (
              <div key={sess.id} className={`card ${s.sessionCard} fade-up`}
                style={{ animationDelay: `${i * 0.05}s` }}>

                {/* Area cliccabile per aprire la serata */}
                <div className={s.cardClickArea} onClick={() => nav(`/sessione/${sess.id}`)}>
                  <div className={s.cardTop}>
                    <div>
                      <div className={s.cardData}>{fmtData(sess.data_inizio)}</div>
                      <div className={s.cardOra}>
                        {fmtOra(sess.data_inizio)}
                        {sess.data_fine ? ` → ${fmtOra(sess.data_fine)}` : ' — in corso'}
                      </div>
                    </div>
                    <ZonaBadge bac={sess.bac_picco} aperta={!sess.data_fine} />
                  </div>

                  <div className={s.cardStats}>
                    {sess.bac_picco != null && (
                      <div className={s.stat}>
                        <span className={s.statVal}>{Number(sess.bac_picco).toFixed(2)}</span>
                        <span className={s.statLbl}>BAC picco</span>
                      </div>
                    )}
                    <div className={s.stat}>
                      <span className={s.statVal}>{sess.ml_acqua ?? 0}ml</span>
                      <span className={s.statLbl}>Acqua</span>
                    </div>
                    <div className={s.stat}>
                      <span className={s.statVal} style={{ textTransform:'capitalize', fontSize:13 }}>
                        {sess.stomaco.replace(/_/g,' ')}
                      </span>
                      <span className={s.statLbl}>Stomaco</span>
                    </div>
                  </div>

                  {sess.note && sess.note !== 'Chiusura automatica alle 06:00' && (
                    <p className={s.note}>📝 {sess.note}</p>
                  )}
                </div>

                {/* Footer card con azioni */}
                <div className={s.cardFooter}>
                  <button
                    className={s.deleteCardBtn}
                    onClick={e => { e.stopPropagation(); setSessioneDaEliminare(sess) }}
                    title="Elimina serata">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9a1 1 0 001 1h6a1 1 0 001-1l1-9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Elimina
                  </button>
                  <button className={s.cardOpenBtn} onClick={() => nav(`/sessione/${sess.id}`)}>
                    {sess.data_fine ? 'Vedi dettagli' : 'Apri serata'} →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showProfile && <ProfileModal user={user} onClose={() => setShowProfile(false)} />}

      {sessioneDaEliminare && (
        <DeleteModal
          sessione={sessioneDaEliminare}
          onConfirm={handleElimina}
          onCancel={() => setSessioneDaEliminare(null)}
        />
      )}
    </div>
  )
}
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../lib/theme.jsx'
import { useAuth } from '../lib/auth.jsx'
import { caricaSessioni, caricaProfile, signOut } from '../lib/supabase.js'
import ProfileModal from '../components/ProfileModal.jsx'
import s from './Home.module.css'

const fmtData = (iso) => new Date(iso).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
const fmtOra  = (iso) => new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })

function ZonaBadge({ bac, aperta }) {
  if (aperta)            return <span className={`${s.badge} ${s.badgeLive}`}>● Live</span>
  if (!bac || bac < 0.2) return <span className={`${s.badge} ${s.badgeSobrio}`}>Sobrio</span>
  if (bac < 0.5)         return <span className={`${s.badge} ${s.badgeSweet}`}>Sweet Spot</span>
  return <span className={`${s.badge} ${s.badgeAlterato}`}>Alterato</span>
}

export default function Home() {
  const { isDark, toggle } = useTheme()
  const { user } = useAuth()
  const nav = useNavigate()

  const [sessioni, setSessioni] = useState([])
  const [profilo, setProfilo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showProfile, setShowProfile] = useState(false)

  useEffect(() => {
    if (!user) return
    Promise.all([
      caricaSessioni(user.id),
      caricaProfile(user.id),
    ]).then(([sess, prof]) => {
      setSessioni(sess)
      setProfilo(prof)
      setLoading(false)
    })
  }, [user])

  const handleLogout = async () => { await signOut(); nav('/auth') }

  const displayName = profilo?.username || user?.email?.split('@')[0] || 'Utente'

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
        <div className={s.headerRight}>
          <button className="btn-ghost" onClick={toggle} title="Cambia tema">
            {isDark ? '☀️' : '🌙'}
          </button>
          <button className={`btn-ghost ${s.profileBtn}`} onClick={() => setShowProfile(true)}>
            <span className={s.profileAvatar}>
              {displayName.charAt(0).toUpperCase()}
            </span>
            <span className={s.profileName}>{displayName}</span>
            <span className={s.profileEdit}>✏️</span>
          </button>
          <button className="btn-ghost" onClick={handleLogout}>Esci</button>
          <button className="btn-primary" onClick={() => nav('/nuova')}>+ Nuova serata</button>
        </div>
      </header>

      <main className={s.main}>
        {loading ? (
          <div className={s.loading}>
            <div style={{ width:32, height:32, border:'3px solid var(--border)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin .7s linear infinite' }} />
          </div>
        ) : sessioni.length === 0 ? (
          <div className={`${s.empty} card fade-up`}>
            <div className={s.emptyIcon}>🌙</div>
            <h2>Nessuna serata ancora</h2>
            <p>Inizia la tua prima serata per monitorare il BAC</p>
            <button className="btn-primary" onClick={() => nav('/nuova')}>+ Inizia adesso</button>
          </div>
        ) : (
          <div className={s.grid}>
            {sessioni.map((sess, i) => (
              <div key={sess.id}
                className={`card ${s.sessionCard} fade-up`}
                style={{ animationDelay: `${i * 0.05}s` }}
                onClick={() => nav(`/sessione/${sess.id}`)}>
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
                      {sess.stomaco.replace(/_/g, ' ')}
                    </span>
                    <span className={s.statLbl}>Stomaco</span>
                  </div>
                </div>
                {sess.note && <p className={s.note}>📝 {sess.note}</p>}
                <div className={s.cardArrow}>→</div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showProfile && user && (
        <ProfileModal
          userId={user.id}
          onClose={() => setShowProfile(false)}
          onSaved={(p) => setProfilo(p)}
        />
      )}
    </div>
  )
}

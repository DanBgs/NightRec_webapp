// ============================================================
//  JamLobby.jsx — Crea o unisciti a una Jam Session
// ============================================================
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { useTheme } from '../lib/theme.jsx'
import { caricaProfile } from '../lib/supabase.js'
import { creaJam, uniscitiJamViaCodice } from '../lib/supabaseJam.js'
import s from './JamLobby.module.css'

const STOMACO_OPT = [
  { key: 'digiuno',        emoji: '🫙', label: 'Digiuno'        },
  { key: 'pasto_leggero',  emoji: '🥗', label: 'Pasto leggero'  },
  { key: 'pasto_completo', emoji: '🍝', label: 'Pasto completo' },
]

export default function JamLobby() {
  const { user }   = useAuth()
  const { isDark, toggle } = useTheme()
  const nav        = useNavigate()
  const [tab, setTab]     = useState('crea') // 'crea' | 'unisciti'
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  // Crea
  const [nomeJam, setNomeJam]         = useState('')
  const [stomacoHost, setStomacoHost] = useState('pasto_completo')

  // Unisciti
  const [codice, setCodice]             = useState('')
  const [stomacoGuest, setStomacoGuest] = useState('pasto_completo')

  const handleCrea = async () => {
    setError('')
    if (!nomeJam.trim()) { setError('Dai un nome alla serata'); return }
    setLoading(true)
    try {
      const profile = await caricaProfile(user.id)
      if (!profile) { nav('/'); return }
      const jam = await creaJam(user.id, nomeJam.trim(), stomacoHost)
      nav(`/jam/${jam.id}`)
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const handleUnisciti = async () => {
    setError('')
    if (codice.length !== 6) { setError('Inserisci un codice a 6 cifre'); return }
    setLoading(true)
    try {
      const profile = await caricaProfile(user.id)
      const jam = await uniscitiJamViaCodice(user.id, codice, stomacoGuest, profile?.username || user.email?.split('@')[0])
      nav(`/jam/${jam.id}`)
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className={s.root}>
      <header className={s.header}>
        <button className={s.back} onClick={() => nav('/')}>← Home</button>
        <button className={s.themeBtn} onClick={toggle}>{isDark ? '☀️' : '🌙'}</button>
      </header>

      <div className={s.hero}>
        <div className={s.heroIcon}>🎉</div>
        <h1 className={s.heroTitle}>Jam Session</h1>
        <p className={s.heroSub}>Monitora il BAC con i tuoi amici in tempo reale</p>
      </div>

      <div className={`card ${s.card}`}>
        <div className={s.tabs}>
          <button className={`${s.tab} ${tab==='crea'?s.tabActive:''}`} onClick={() => { setTab('crea'); setError('') }}>
            Crea serata
          </button>
          <button className={`${s.tab} ${tab==='unisciti'?s.tabActive:''}`} onClick={() => { setTab('unisciti'); setError('') }}>
            Unisciti
          </button>
        </div>

        {error && <div className={s.error}>{error}</div>}

        {tab === 'crea' ? (
          <div className={s.form}>
            <label className={s.label}>Nome della serata</label>
            <input className="input-field" placeholder='es. "Sabato da Marco"'
              value={nomeJam} onChange={e => setNomeJam(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCrea()} />

            <label className={s.label}>Il tuo stato gastrico</label>
            <div className={s.stomacoRow}>
              {STOMACO_OPT.map(o => (
                <button key={o.key} className={`${s.stomacoBtn} ${stomacoHost===o.key?s.stomacoBtnSel:''}`}
                  onClick={() => setStomacoHost(o.key)}>
                  <span>{o.emoji}</span>
                  <span className={s.stomacoBtnLabel}>{o.label}</span>
                </button>
              ))}
            </div>

            <div className={s.infoBox}>
              <span>👑</span>
              <p>Come host potrai avviare e terminare la serata, gestire il menu drink e invitare gli amici con il codice.</p>
            </div>

            <button className={`btn-primary ${s.submit}`} onClick={handleCrea} disabled={loading}>
              {loading ? <span className="spinner"/> : '🎉 Crea la jam'}
            </button>
          </div>
        ) : (
          <div className={s.form}>
            <label className={s.label}>Codice serata (6 cifre)</label>
            <input className={`input-field ${s.codeInput}`}
              placeholder="000000" maxLength={6}
              value={codice} onChange={e => setCodice(e.target.value.replace(/\D/g,''))}
              onKeyDown={e => e.key === 'Enter' && handleUnisciti()}
              inputMode="numeric" />

            <label className={s.label}>Il tuo stato gastrico</label>
            <div className={s.stomacoRow}>
              {STOMACO_OPT.map(o => (
                <button key={o.key} className={`${s.stomacoBtn} ${stomacoGuest===o.key?s.stomacoBtnSel:''}`}
                  onClick={() => setStomacoGuest(o.key)}>
                  <span>{o.emoji}</span>
                  <span className={s.stomacoBtnLabel}>{o.label}</span>
                </button>
              ))}
            </div>

            <button className={`btn-primary ${s.submit}`} onClick={handleUnisciti} disabled={loading}>
              {loading ? <span className="spinner"/> : '🚀 Entra nella jam'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
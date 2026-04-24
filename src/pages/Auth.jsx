import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../lib/theme.jsx'
import { signIn, signUp, salvaProfile } from '../lib/supabase.js'
import s from './Auth.module.css'

const STEPS = { AUTH: 'auth', PROFILE: 'profile' }

export default function Auth() {
  const { isDark, toggle } = useTheme()
  const nav = useNavigate()

  const [mode, setMode] = useState('login')
  const [step, setStep] = useState(STEPS.AUTH)
  const [pendingUserId, setPendingUserId] = useState(null)

  // Auth fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Profile fields
  const [username, setUsername] = useState('')
  const [peso, setPeso] = useState('')
  const [sesso, setSesso] = useState('uomo')
  const [patente, setPatente] = useState('standard')
  const [savingProfile, setSavingProfile] = useState(false)

  const handleAuth = async () => {
    setError('')
    if (!email || !password) { setError('Inserisci email e password'); return }
    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
        nav('/')
      } else {
        const data = await signUp(email, password)
        // Dopo registrazione vai allo step profilo
        setPendingUserId(data.user?.id)
        setStep(STEPS.PROFILE)
      }
    } catch (e) {
      setError(e.message ?? 'Errore sconosciuto')
    } finally { setLoading(false) }
  }

  const handleSalvaProfilo = async () => {
    if (!pendingUserId) return
    if (!peso || isNaN(parseFloat(peso))) { setError('Inserisci un peso valido'); return }
    setError('')
    setSavingProfile(true)
    try {
      await salvaProfile({
        id: pendingUserId,
        username: username.trim() || null,
        peso_kg: parseFloat(peso),
        sesso,
        tipo_patente: patente,
      })
      // Ora fai il login vero (la sessione è già attiva dopo signUp)
      nav('/')
    } catch (e) {
      setError(e.message ?? 'Errore nel salvataggio del profilo')
    } finally { setSavingProfile(false) }
  }

  // ── STEP PROFILO ────────────────────────────────────────────
  if (step === STEPS.PROFILE) {
    return (
      <div className={s.root}>
        <button className={s.themeBtn} onClick={toggle}>{isDark ? '☀️' : '🌙'}</button>
        <div className={s.left}>
          <div className={s.brand}>
            <span className={s.brandIcon}>🌙</span>
            <h1>NightRecorder</h1>
            <p>Quasi pronto.<br />Inserisci i tuoi dati per calibrare il calcolo BAC.</p>
          </div>
          <div className={s.featureList}>
            {['Il peso influenza il volume di distribuzione', 'Il sesso determina il coefficiente r di Widmark', 'Il tipo di patente imposta il limite legale', 'Potrai modificare tutto dalla home'].map(f => (
              <div key={f} className={s.feature}>
                <span className={s.featureDot} />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={s.right}>
          <div className={`card ${s.card} fade-up`}>
            <div className={s.profileHeader}>
              <span className={s.profileStep}>Passo 2 di 2</span>
              <h2 className={s.cardTitle}>Il tuo profilo 👤</h2>
              <p className={s.profileSub}>Questi dati sono necessari per calcolare il BAC in modo accurato.</p>
            </div>

            {error && <div className={s.error}>{error}</div>}

            <label className={s.label}>Username <span className={s.optional}>(opzionale)</span></label>
            <input className="input-field" type="text" placeholder="Come vuoi essere chiamato?"
              value={username} onChange={e => setUsername(e.target.value)} />

            <label className={s.label}>Peso (kg) <span className={s.required}>*</span></label>
            <input className="input-field" type="number" placeholder="es. 72"
              value={peso} onChange={e => setPeso(e.target.value)} min="30" max="200" />

            <label className={s.label}>Sesso biologico <span className={s.required}>*</span></label>
            <div className={s.toggleRow}>
              {[
                { val: 'uomo',  label: '♂  Uomo',  sub: 'Coeff. r = 0.7' },
                { val: 'donna', label: '♀  Donna', sub: 'Coeff. r = 0.6' },
              ].map(o => (
                <button key={o.val}
                  className={`${s.toggleBtn} ${sesso === o.val ? s.toggleBtnSel : ''}`}
                  onClick={() => setSesso(o.val)}>
                  <span className={s.toggleLabel}>{o.label}</span>
                  <span className={s.toggleSub}>{o.sub}</span>
                </button>
              ))}
            </div>

            <label className={s.label}>Tipo di patente <span className={s.required}>*</span></label>
            <div className={s.toggleRow}>
              {[
                { val: 'standard',     label: 'Standard',     sub: 'Limite 0.5 g/l' },
                { val: 'neopatentato', label: 'Neopatentato', sub: 'Limite 0.0 g/l' },
              ].map(o => (
                <button key={o.val}
                  className={`${s.toggleBtn} ${patente === o.val ? s.toggleBtnSel : ''}`}
                  onClick={() => setPatente(o.val)}>
                  <span className={s.toggleLabel}>{o.label}</span>
                  <span className={s.toggleSub}>{o.sub}</span>
                </button>
              ))}
            </div>

            <button className={`btn-primary ${s.submit}`} onClick={handleSalvaProfilo} disabled={savingProfile}>
              {savingProfile ? <span className="spinner" /> : 'Entra in NightRecorder →'}
            </button>

            <p className={s.disclaimer}>
              I dati BAC sono stime teoriche e non sostituiscono un etilometro ufficiale.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── STEP AUTH ───────────────────────────────────────────────
  return (
    <div className={s.root}>
      <button className={s.themeBtn} onClick={toggle}>{isDark ? '☀️' : '🌙'}</button>

      <div className={s.left}>
        <div className={s.brand}>
          <span className={s.brandIcon}>🌙</span>
          <h1>NightRecorder</h1>
          <p>Monitora il tuo BAC in tempo reale.<br />Divertiti in sicurezza.</p>
        </div>
        <div className={s.featureList}>
          {['Formula di Widmark evoluta', 'Ghost Peak — vedi il futuro', 'Countdown guida in tempo reale', 'Storico serate completo'].map(f => (
            <div key={f} className={s.feature}>
              <span className={s.featureDot} />
              <span>{f}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={s.right}>
        <div className={`card ${s.card} fade-up`}>
          <h2 className={s.cardTitle}>{mode === 'login' ? 'Bentornato 👋' : 'Crea account'}</h2>

          <div className={s.tabs}>
            <button className={`${s.tab} ${mode === 'login' ? s.tabActive : ''}`} onClick={() => { setMode('login'); setError('') }}>Accedi</button>
            <button className={`${s.tab} ${mode === 'register' ? s.tabActive : ''}`} onClick={() => { setMode('register'); setError('') }}>Registrati</button>
          </div>

          {error && <div className={s.error}>{error}</div>}

          <label className={s.label}>Email</label>
          <input className="input-field" type="email" placeholder="tuo@email.com"
            value={email} onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAuth()} />

          <label className={s.label}>Password</label>
          <input className="input-field" type="password" placeholder="••••••••"
            value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAuth()} />

          <button className={`btn-primary ${s.submit}`} onClick={handleAuth} disabled={loading}>
            {loading ? <span className="spinner" /> : mode === 'login' ? 'Accedi' : 'Continua →'}
          </button>

          <p className={s.disclaimer}>
            I dati BAC sono stime teoriche e non sostituiscono un etilometro ufficiale.
          </p>
        </div>
      </div>
    </div>
  )
}

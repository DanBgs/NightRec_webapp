import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../lib/theme.jsx'
import { signIn, signUp, salvaProfile } from '../lib/supabase.js'
import s from './Auth.module.css'

// ── Indicatore di progresso ───────────────────────────────────────────
function StepIndicator({ step }) {
  return (
    <div className={s.stepIndicator}>
      <div className={`${s.stepDot} ${step >= 1 ? s.stepDotActive : ''}`}>
        {step > 1 ? <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1.5 5l2.5 2.5 4.5-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg> : '1'}
      </div>
      <div className={`${s.stepLine} ${step > 1 ? s.stepLineActive : ''}`} />
      <div className={`${s.stepDot} ${step >= 2 ? s.stepDotActive : ''}`}>2</div>
    </div>
  )
}

export default function Auth() {
  const { isDark, toggle } = useTheme()
  const nav = useNavigate()

  // step: 1 = auth (login/registrazione), 2 = profilo
  const [step, setStep]     = useState(1)
  const [mode, setMode]     = useState('login') // 'login' | 'register'
  const [pendingUserId, setPendingUserId] = useState(null)

  // Campi auth
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  // Campi profilo
  const [username, setUsername] = useState('')
  const [peso, setPeso]         = useState('')
  const [sesso, setSesso]       = useState('uomo')
  const [patente, setPatente]   = useState('standard')
  const [saving, setSaving]     = useState(false)

  const goBack = () => {
    setError('')
    if (step === 2) {
      setStep(1)
      setMode('register') // torna alla registrazione, non al login
    }
  }

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
        setPendingUserId(data.user?.id)
        setStep(2)
      }
    } catch (e) {
      setError(e.message ?? 'Errore sconosciuto')
    } finally { setLoading(false) }
  }

  const handleSalvaProfilo = async () => {
    if (!pendingUserId) { setError('Sessione non valida, torna indietro e riprova'); return }
    if (!peso || isNaN(parseFloat(peso))) { setError('Inserisci un peso valido'); return }
    if (parseFloat(peso) < 30 || parseFloat(peso) > 250) { setError('Peso non valido (30–250 kg)'); return }
    setError('')
    setSaving(true)
    try {
      await salvaProfile({
        id:          pendingUserId,
        username:    username.trim() || null,
        peso_kg:     parseFloat(peso),
        sesso,
        tipo_patente: patente,
      })
      nav('/')
    } catch (e) {
      setError(e.message ?? 'Errore nel salvataggio')
    } finally { setSaving(false) }
  }

  const isProfileStep = step === 2

  return (
    <div className={s.root}>
      {/* Theme toggle */}
      <button className={s.themeBtn} onClick={toggle} title="Cambia tema">
        {isDark ? '☀️' : '🌙'}
      </button>

      {/* Pannello sinistra */}
      <div className={s.left}>
        <div className={s.brand}>
          <span className={s.brandIcon}>🌙</span>
          <h1>NightRecorder</h1>
          <p>{isProfileStep
            ? 'Quasi pronto.\nInserisci i tuoi dati per calibrare il calcolo BAC.'
            : 'Monitora il tuo BAC in tempo reale.\nDivertiti in sicurezza.'
          }</p>
        </div>
        <div className={s.featureList}>
          {(isProfileStep
            ? ['Il peso influenza il volume di distribuzione', 'Il sesso determina il coefficiente r di Widmark', 'Il tipo di patente imposta il limite legale', 'Potrai modificare tutto dalla home']
            : ['Formula di Widmark evoluta', 'Ghost Peak — vedi il futuro', 'Countdown guida in tempo reale', 'Storico serate completo']
          ).map(f => (
            <div key={f} className={s.feature}>
              <span className={s.featureDot} />
              <span>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pannello destra */}
      <div className={s.right}>
        <div className={`card ${s.card} fade-up`}>

          {/* Header con back button e step indicator */}
          <div className={s.cardHeader}>
            {isProfileStep ? (
              <button className={s.backBtn} onClick={goBack}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Indietro
              </button>
            ) : (
              <div /> /* spacer */
            )}
            {mode === 'register' && <StepIndicator step={step} />}
          </div>

          {/* Titolo */}
          {isProfileStep ? (
            <div className={s.profileHeader}>
              <span className={s.profileStep}>Passo 2 di 2</span>
              <h2 className={s.cardTitle}>Il tuo profilo 👤</h2>
              <p className={s.profileSub}>
                Questi dati calibrano il calcolo BAC. Puoi modificarli in qualsiasi momento.
              </p>
            </div>
          ) : (
            <>
              <h2 className={s.cardTitle}>{mode === 'login' ? 'Bentornato 👋' : 'Crea account'}</h2>
              <div className={s.tabs}>
                <button className={`${s.tab} ${mode === 'login' ? s.tabActive : ''}`}
                  onClick={() => { setMode('login'); setError('') }}>Accedi</button>
                <button className={`${s.tab} ${mode === 'register' ? s.tabActive : ''}`}
                  onClick={() => { setMode('register'); setError('') }}>Registrati</button>
              </div>
            </>
          )}

          {error && <div className={s.error}>{error}</div>}

          {/* ── Step 1: Auth ─────────────────────────────────── */}
          {!isProfileStep && (
            <>
              <label className={s.label}>Email</label>
              <input className="input-field" type="email" placeholder="tuo@email.com"
                value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAuth()} autoComplete="email" />

              <label className={s.label}>Password</label>
              <input className="input-field" type="password" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAuth()} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />

              <button className={`btn-primary ${s.submit}`} onClick={handleAuth} disabled={loading}>
                {loading ? <span className="spinner" /> : mode === 'login' ? 'Accedi' : 'Continua →'}
              </button>
            </>
          )}

          {/* ── Step 2: Profilo ──────────────────────────────── */}
          {isProfileStep && (
            <>
              <label className={s.label}>Username <span className={s.optional}>(opzionale)</span></label>
              <input className="input-field" type="text" placeholder="Come vuoi essere chiamato?"
                value={username} onChange={e => setUsername(e.target.value)} autoComplete="nickname" />

              <label className={s.label}>Peso (kg) <span className={s.required}>*</span></label>
              <input className="input-field" type="number" placeholder="es. 75"
                value={peso} onChange={e => setPeso(e.target.value)} min="30" max="250" />

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

              <button className={`btn-primary ${s.submit}`} onClick={handleSalvaProfilo} disabled={saving}>
                {saving ? <span className="spinner" /> : 'Entra in NightRecorder →'}
              </button>
            </>
          )}

          <p className={s.disclaimer}>
            I dati BAC sono stime teoriche e non sostituiscono un etilometro ufficiale.
          </p>
        </div>
      </div>
    </div>
  )
}
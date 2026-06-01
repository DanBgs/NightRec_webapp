import { useNavigate } from 'react-router-dom'
import { useTheme } from '../lib/theme.jsx'
import s from './JamLobby.module.css'


export default function JamLobby() {
  const nav = useNavigate()
  const { isDark, toggle } = useTheme()

  return (
    <div className={s.root}>
      <button className={s.themeBtn} onClick={toggle}>{isDark ? '☀️' : '🌙'}</button>

      <div className={s.content}>
        <div className={s.iconWrap}>
          <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="36" cy="36" r="36" fill="var(--accent-bg)"/>
            <text x="36" y="50" textAnchor="middle" fontSize="36">🎉</text>
          </svg>
        </div>

        <h1 className={s.title}>Jam Session</h1>

        <div className={s.badge}>Coming Soon</div>

        <p className={s.desc}>
          Stiamo lavorando per portarti la modalità Jam — monitora il BAC con i tuoi amici in tempo reale, confronta i grafici e condividi la serata.
        </p>

        <div className={s.features}>
          {[
            { icon: '📊', label: 'BAC live di tutti i partecipanti' },
            { icon: '🎸', label: 'Grafico collettivo e personale' },
            { icon: '🍹', label: 'Menu drink condiviso dall\'host' },
            { icon: '📸', label: 'Foto e ricordi di gruppo' },
          ].map(f => (
            <div key={f.label} className={s.featureItem}>
              <span className={s.featureIcon}>{f.icon}</span>
              <span className={s.featureLabel}>{f.label}</span>
            </div>
          ))}
        </div>

        <button className="btn-primary" style={{ width: '100%', marginTop: 8 }} onClick={() => nav('/')}>
          ← Torna alla home
        </button>
      </div>
    </div>
  )
}
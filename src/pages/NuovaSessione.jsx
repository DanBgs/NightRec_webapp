import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { creaNuovaSessione } from '../lib/supabase.js'
import { IconDigiuno, IconPastoLeggero, IconPastoCompleto } from '../components/DrinkIcon.jsx'
import s from './NuovaSessione.module.css'

const STOMACO_OPT = [
  {
    key:   'digiuno',
    Icon:  IconDigiuno,
    label: 'Digiuno',
    desc:  'Non hai mangiato nulla',
  },
  {
    key:   'pasto_leggero',
    Icon:  IconPastoLeggero,
    label: 'Pasto leggero',
    desc:  'Spuntino o piatto leggero',
  },
  {
    key:   'pasto_completo',
    Icon:  IconPastoCompleto,
    label: 'Pasto completo',
    desc:  'Cena o pranzo abbondante',
  },
]

export default function NuovaSessione() {
  const { user }  = useAuth()
  const nav       = useNavigate()
  const [stomaco, setStomaco] = useState('pasto_completo')
  const [loading, setLoading] = useState(false)

  const inizia = async () => {
    if (!user) return
    setLoading(true)
    try {
      const sess = await creaNuovaSessione(user.id, stomaco)
      nav(`/sessione/${sess.id}`)
    } catch (e) { alert(e.message); setLoading(false) }
  }

  return (
    <div className={s.root}>
      <div className={s.container}>
        <button className={s.back} onClick={() => nav('/')}>← Home</button>

        <div className="fade-up">
          <h1 className={s.title}>Nuova serata</h1>
          <p className={s.sub}>Hai mangiato qualcosa di recente?</p>
        </div>

        <div className={`${s.options} fade-up-2`}>
          {STOMACO_OPT.map(({ key, Icon, label, desc }) => (
            <button
              key={key}
              className={`card ${s.option} ${stomaco === key ? s.optionSel : ''}`}
              onClick={() => setStomaco(key)}>
              <div className={s.optIconWrap}>
                <Icon size={40} color={stomaco === key ? 'var(--accent)' : 'var(--text-muted)'} />
              </div>
              <div className={s.optText}>
                <span className={`${s.optLabel} ${stomaco === key ? s.optLabelSel : ''}`}>{label}</span>
                <span className={s.optDesc}>{desc}</span>
              </div>
              <span className={`${s.optCheck} ${stomaco === key ? s.optCheckVis : ''}`}>✓</span>
            </button>
          ))}
        </div>

        <div className={`card ${s.infoBox} fade-up-3`}>
          <span className={s.infoIcon}>ℹ️</span>
          <p>
            Il cibo rallenta l'assorbimento dell'alcol nel sangue.
            Un pasto recente riduce e posticipa il picco del tuo BAC.
          </p>
        </div>

        <button className={`btn-primary ${s.startBtn} fade-up-4`} onClick={inizia} disabled={loading}>
          {loading ? <span className="spinner" /> : '🌙  Inizia la serata'}
        </button>
      </div>
    </div>
  )
}
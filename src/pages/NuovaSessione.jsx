import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { creaNuovaSessione } from '../lib/supabase.js'
import s from './NuovaSessione.module.css'

const STOMACO_OPT = [
  { key: 'digiuno',        emoji: '🫙', label: 'Digiuno',        desc: 'Stomaco vuoto',        detail: 'Assorbimento 100% — picco in ~30 min. Effetti molto più rapidi e intensi.' },
  { key: 'pasto_leggero',  emoji: '🥗', label: 'Pasto leggero',  desc: 'Qualcosa di leggero',  detail: 'Assorbimento ~85% — picco in ~50 min. Moderato rallentamento.' },
  { key: 'pasto_completo', emoji: '🍝', label: 'Pasto completo', desc: 'Cena abbondante',       detail: 'Assorbimento ~70% — picco in ~75 min. Protezione significativa.' },
]

export default function NuovaSessione() {
  const { user } = useAuth()
  const nav = useNavigate()
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
          <h1 className={s.title}>Nuova serata 🌙</h1>
          <p className={s.sub}>Come stai entrando? Lo stato gastrico influenza la velocità di assorbimento dell'alcol.</p>
        </div>

        <div className={`${s.options} fade-up-2`}>
          {STOMACO_OPT.map(o => (
            <button key={o.key} className={`card ${s.option} ${stomaco === o.key ? s.optionSel : ''}`}
              onClick={() => setStomaco(o.key)}>
              <span className={s.optEmoji}>{o.emoji}</span>
              <div className={s.optText}>
                <span className={s.optLabel}>{o.label}</span>
                <span className={s.optDesc}>{o.desc}</span>
                <span className={s.optDetail}>{o.detail}</span>
              </div>
              <span className={`${s.optCheck} ${stomaco === o.key ? s.optCheckVis : ''}`}>✓</span>
            </button>
          ))}
        </div>

        <div className={`card ${s.infoBox} fade-up-3`}>
          <span className={s.infoIcon}>🔬</span>
          <div>
            <strong>Come funziona il calcolo</strong>
            <p>Utilizziamo la Formula di Widmark evoluta che considera peso, sesso, stomaco e tempo trascorso per calcolare il BAC in tempo reale. Il Ghost Peak anticipa il tuo picco futuro.</p>
          </div>
        </div>

        <button className={`btn-primary ${s.startBtn} fade-up-4`} onClick={inizia} disabled={loading}>
          {loading ? <span className="spinner" /> : '🌙 Inizia la serata'}
        </button>
      </div>
    </div>
  )
}

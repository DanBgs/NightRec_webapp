import { useState, useEffect } from 'react'
import { salvaProfile, caricaProfile } from '../lib/supabase.js'
import s from './ProfileModal.module.css'

export default function ProfileModal({ userId, onClose, onSaved }) {
  const [username, setUsername] = useState('')
  const [peso, setPeso] = useState('')
  const [sesso, setSesso] = useState('uomo')
  const [patente, setPatente] = useState('standard')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    caricaProfile(userId).then(p => {
      if (p) {
        setUsername(p.username ?? '')
        setPeso(String(p.peso_kg))
        setSesso(p.sesso)
        setPatente(p.tipo_patente)
      }
      setLoading(false)
    })
  }, [userId])

  const handleSave = async () => {
    setError('')
    if (!peso || isNaN(parseFloat(peso))) { setError('Inserisci un peso valido'); return }
    setSaving(true)
    try {
      const p = await salvaProfile({
        id: userId,
        username: username.trim() || null,
        peso_kg: parseFloat(peso),
        sesso,
        tipo_patente: patente,
      })
      onSaved?.(p)
      onClose()
    } catch (e) {
      setError(e.message ?? 'Errore nel salvataggio')
    } finally { setSaving(false) }
  }

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={`card ${s.modal}`} onClick={e => e.stopPropagation()}>
        <div className={s.head}>
          <h3>Modifica profilo</h3>
          <button className={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <div className={s.loadingWrap}><div className={s.spinner} /></div>
        ) : (
          <>
            {error && <div className={s.error}>{error}</div>}

            <label className={s.label}>Username <span className={s.optional}>(opzionale)</span></label>
            <input className="input-field" type="text" placeholder="Come vuoi essere chiamato?"
              value={username} onChange={e => setUsername(e.target.value)} />

            <label className={s.label}>Peso (kg)</label>
            <input className="input-field" type="number" placeholder="es. 72"
              value={peso} onChange={e => setPeso(e.target.value)} min="30" max="200" />

            <label className={s.label}>Sesso biologico</label>
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

            <label className={s.label}>Tipo di patente</label>
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

            <div className={s.footer}>
              <button className="btn-ghost" onClick={onClose}>Annulla</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <span className="spinner" /> : '💾  Salva modifiche'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

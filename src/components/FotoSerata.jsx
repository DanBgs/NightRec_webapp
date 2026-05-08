import { useState, useRef, useEffect } from 'react'
import { uploadFoto, caricaFotoSessione, eliminaFoto, getUrlFoto } from '../lib/supabase.js'
import s from './FotoSerata.module.css'

// ── Icona fotocamera SVG ─────────────────────────────────────────────
function IconCamera({ size = 22, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 3H15L17 5H21C21.6 5 22 5.4 22 6V19C22 19.6 21.6 20 21 20H3C2.4 20 2 19.6 2 19V6C2 5.4 2.4 5 3 5H7L9 3Z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <circle cx="12" cy="12" r="3.5" stroke={color} strokeWidth="1.8" fill="none"/>
    </svg>
  )
}

function IconTrash({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9a1 1 0 001 1h6a1 1 0 001-1l1-9"
        stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IconClose({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M3 3l10 10M13 3L3 13" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}

function IconExpand({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ── Lightbox ─────────────────────────────────────────────────────────
function Lightbox({ foto, onClose, onElimina, solarLettura }) {
  useEffect(() => {
    const handle = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [onClose])

  return (
    <div className={s.lightboxOverlay} onClick={onClose}>
      <div className={s.lightboxContent} onClick={e => e.stopPropagation()}>
        <button className={s.lightboxClose} onClick={onClose}>
          <IconClose size={20} color="white" />
        </button>
        <img src={getUrlFoto(foto.storage_path)} alt={foto.caption || ''} className={s.lightboxImg} />
        {foto.caption && <p className={s.lightboxCaption}>{foto.caption}</p>}
        <div className={s.lightboxMeta}>
          <span>{new Date(foto.taken_at).toLocaleString('it-IT', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</span>
          {!solarLettura && (
            <button className={s.lightboxDelete} onClick={() => onElimina(foto)}>
              <IconTrash size={14} color="currentColor" /> Elimina foto
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Componente principale ─────────────────────────────────────────────
export default function FotoSerata({ sessionId, userId, solaLettura = false }) {
  const [foto, setFoto]             = useState([])
  const [loading, setLoading]       = useState(true)
  const [uploading, setUploading]   = useState(false)
  const [fotoSelezionata, setFotoSelezionata] = useState(null)
  const [showCamera, setShowCamera] = useState(false)
  const [caption, setCaption]       = useState('')
  const [error, setError]           = useState('')

  // Refs per camera e file input
  const fileInputRef   = useRef(null)
  const videoRef       = useRef(null)
  const canvasRef      = useRef(null)
  const streamRef      = useRef(null)
  const [cameraReady, setCameraReady]   = useState(false)
  const [cameraFacing, setCameraFacing] = useState('user') // 'user' | 'environment'
  const [capturedBlob, setCapturedBlob] = useState(null)
  const [capturedPreview, setCapturedPreview] = useState(null)

  useEffect(() => {
    if (!sessionId) return
    caricaFotoSessione(sessionId)
      .then(data => setFoto(data || []))
      .catch(() => setFoto([]))
      .finally(() => setLoading(false))
  }, [sessionId])

  // ── Apertura camera ────────────────────────────────────────────────
  const apriCamera = async () => {
    setError('')
    setCapturedBlob(null)
    setCapturedPreview(null)
    setCaption('')
    setShowCamera(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraFacing, width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play()
          setCameraReady(true)
        }
      }
    } catch (e) {
      setError('Fotocamera non disponibile. Usa il pulsante "Carica foto".')
      setShowCamera(false)
    }
  }

  const chiudiCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setCameraReady(false)
    setCapturedBlob(null)
    setCapturedPreview(null)
    setShowCamera(false)
    setCaption('')
  }

  const cambiaDirezione = async () => {
    const nuova = cameraFacing === 'user' ? 'environment' : 'user'
    setCameraFacing(nuova)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: nuova },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
    } catch (e) { setError('Errore nel cambio fotocamera') }
  }

  // ── Scatta foto ────────────────────────────────────────────────────
  const scattaFoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    const video  = videoRef.current
    const canvas = canvasRef.current
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    canvas.toBlob(blob => {
      if (!blob) return
      setCapturedBlob(blob)
      setCapturedPreview(URL.createObjectURL(blob))
      // Ferma lo stream video
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    }, 'image/jpeg', 0.85)
  }

  const riscatta = async () => {
    setCapturedBlob(null)
    setCapturedPreview(null)
    // Riavvia camera
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraFacing },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
    } catch(e) { setError('Errore riavvio camera') }
  }

  // ── Upload foto (da camera o file) ─────────────────────────────────
  const uploadFotoData = async (blob, filename) => {
    if (!userId || !sessionId) return
    setUploading(true)
    setError('')
    try {
      const file   = new File([blob], filename, { type: blob.type || 'image/jpeg' })
      const nuova  = await uploadFoto(userId, sessionId, file, caption.trim())
      setFoto(prev => [...prev, nuova])
      chiudiCamera()
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (e) {
      setError('Errore upload: ' + (e.message || 'riprova'))
    } finally { setUploading(false) }
  }

  const confermaFotoScattata = () => {
    if (!capturedBlob) return
    uploadFotoData(capturedBlob, `foto-${Date.now()}.jpg`)
  }

  // ── Upload da file ────────────────────────────────────────────────
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Seleziona un file immagine'); return }
    if (file.size > 10 * 1024 * 1024) { setError('La foto è troppo grande (max 10MB)'); return }
    setCaption('')
    // Mostra anteprima per aggiungere caption prima dell'upload
    const preview = URL.createObjectURL(file)
    setCapturedBlob(file)
    setCapturedPreview(preview)
    setShowCamera(true)
  }

  // ── Elimina foto ──────────────────────────────────────────────────
  const handleElimina = async (f) => {
    if (!window.confirm('Eliminare questa foto?')) return
    try {
      await eliminaFoto(f.id, f.storage_path)
      setFoto(prev => prev.filter(x => x.id !== f.id))
      if (fotoSelezionata?.id === f.id) setFotoSelezionata(null)
    } catch(e) { setError('Errore eliminazione: ' + e.message) }
  }

  return (
    <div className={s.root}>
      <div className={s.header}>
        <h3 className={s.title}>
          <IconCamera size={18} color="var(--accent)" />
          Ricordi della serata
          {foto.length > 0 && <span className={s.count}>{foto.length}</span>}
        </h3>
        {!solaLettura && (
          <div className={s.actions}>
            <button className={s.uploadBtn} onClick={() => fileInputRef.current?.click()}>
              ↑ Carica
            </button>
            <button className={s.cameraBtn} onClick={apriCamera}>
              <IconCamera size={16} color="white" /> Scatta
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className={s.hidden}
              onChange={handleFileChange} />
          </div>
        )}
      </div>

      {error && <div className={s.error}>{error}</div>}

      {/* Griglia foto */}
      {loading ? (
        <div className={s.loadingGrid}>
          {[1,2,3].map(i => <div key={i} className={s.skeleton} />)}
        </div>
      ) : foto.length === 0 ? (
        <div className={s.empty}>
          <IconCamera size={32} color="var(--text-muted)" />
          <p>{solaLettura ? 'Nessuna foto per questa serata' : 'Scatta o carica le prime foto della serata'}</p>
        </div>
      ) : (
        <div className={s.grid}>
          {foto.map(f => (
            <div key={f.id} className={s.thumb} onClick={() => setFotoSelezionata(f)}>
              <img src={getUrlFoto(f.storage_path)} alt={f.caption || ''} className={s.thumbImg} loading="lazy" />
              <div className={s.thumbOverlay}>
                <IconExpand size={14} color="white" />
              </div>
              {f.caption && <div className={s.thumbCaption}>{f.caption}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Modal camera / anteprima */}
      {showCamera && (
        <div className={s.cameraOverlay} onClick={e => { if(e.target===e.currentTarget) chiudiCamera() }}>
          <div className={s.cameraModal}>
            <div className={s.cameraHeader}>
              <span className={s.cameraTitle}>
                {capturedPreview ? 'Anteprima' : 'Fotocamera'}
              </span>
              <button className={s.cameraCloseBtn} onClick={chiudiCamera}>
                <IconClose size={18} color="currentColor"/>
              </button>
            </div>

            {/* Video live o anteprima scattata */}
            <div className={s.cameraViewport}>
              {capturedPreview ? (
                <img src={capturedPreview} alt="anteprima" className={s.cameraPreviewImg} />
              ) : (
                <video ref={videoRef} className={s.cameraVideo} playsInline muted />
              )}
              <canvas ref={canvasRef} className={s.hidden} />
            </div>

            {/* Caption */}
            <div className={s.captionRow}>
              <input
                className={s.captionInput}
                placeholder="Aggiungi una didascalia... (opzionale)"
                value={caption}
                onChange={e => setCaption(e.target.value)}
                maxLength={120}
              />
            </div>

            {/* Controlli */}
            <div className={s.cameraControls}>
              {capturedPreview ? (
                <>
                  <button className={s.ctrlBtnSecondary} onClick={riscatta} disabled={uploading}>
                    ↺ Riscatta
                  </button>
                  <button className={s.ctrlBtnPrimary} onClick={confermaFotoScattata} disabled={uploading}>
                    {uploading ? <span className="spinner"/> : '✓ Salva foto'}
                  </button>
                </>
              ) : (
                <>
                  <button className={s.ctrlBtnSecondary} onClick={cambiaDirezione} disabled={!cameraReady}>
                    ⇄ Ruota
                  </button>
                  <button className={s.shutterBtn} onClick={scattaFoto} disabled={!cameraReady}>
                    <span className={s.shutterInner} />
                  </button>
                  <div style={{width:80}} />
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {fotoSelezionata && (
        <Lightbox
          foto={fotoSelezionata}
          onClose={() => setFotoSelezionata(null)}
          onElimina={handleElimina}
          solarLettura={solaLettura}
        />
      )}
    </div>
  )
}

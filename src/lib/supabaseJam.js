// ============================================================
//  supabaseJam.js — Tutte le funzioni Jam Session
//  Compatibile con JamSessione.jsx e JamLobby.jsx
// ============================================================
import { supabase } from './supabase.js'

// ── CREA JAM ─────────────────────────────────────────────────────────
export const creaJam = async (hostId, nome, stomaco) => {
  // Genera codice univoco a 6 cifre
  let code
  for (let i = 0; i < 10; i++) {
    code = Math.floor(100000 + Math.random() * 900000).toString()
    const { data } = await supabase.from('jam_sessions').select('id').eq('code', code).maybeSingle()
    if (!data) break
  }

  const { data: jam, error } = await supabase
    .from('jam_sessions')
    .insert({
      code,
      name: nome,
      host_id: hostId,
      status: 'waiting',
      stomaco_default: stomaco,
    })
    .select()
    .single()
  if (error) throw error

  // Inizializza il menu con tutti i drink standard
  const vociMenu = []
  for (const cat of ['birra', 'vino', 'cocktail', 'shot']) {
    for (const int of ['leggero', 'ideale', 'pesante']) {
      vociMenu.push({ jam_id: jam.id, categoria: cat, intensita: int, disponibile: true })
    }
  }
  await supabase.from('jam_menu').insert(vociMenu)

  return jam
}

// ── UNISCITI ALLA JAM ─────────────────────────────────────────────────
export const uniscitiJam = async (jamId, userId, profileData) => {
  // Controlla se già membro
  const { data: esistente } = await supabase
    .from('jam_members')
    .select('id')
    .eq('jam_id', jamId)
    .eq('user_id', userId)
    .maybeSingle()
  if (esistente) return esistente

  const { data, error } = await supabase
    .from('jam_members')
    .insert({
      jam_id:      jamId,
      user_id:     userId,
      username:    profileData?.username || null,
      stomaco:     profileData?.stomaco || 'pasto_completo',
      peso_kg:     profileData?.peso_kg || 70,
      sesso:       profileData?.sesso || 'uomo',
      tipo_patente: profileData?.tipo_patente || 'standard',
      bac_attuale: 0,
      is_host:     false,
    })
    .select()
    .single()
  if (error && error.code !== '23505') throw error // ignora duplicate
  return data
}

// ── UNISCITI VIA CODICE (da JamLobby) ────────────────────────────────
export const uniscitiJamViaCodice = async (userId, code, stomaco, username) => {
  const { data: jam, error: errJam } = await supabase
    .from('jam_sessions')
    .select('*')
    .eq('code', code)
    .single()
  if (errJam || !jam) throw new Error('Codice non valido o jam non trovata')
  if (jam.status === 'closed') throw new Error('Questa jam è già terminata')

  const { data: esistente } = await supabase
    .from('jam_members')
    .select('id')
    .eq('jam_id', jam.id)
    .eq('user_id', userId)
    .maybeSingle()
  if (!esistente) {
    await supabase.from('jam_members').insert({
      jam_id: jam.id, user_id: userId,
      stomaco, username, bac_attuale: 0, is_host: false,
    })
  }
  return jam
}

// ── CARICA PARTECIPANTI ───────────────────────────────────────────────
export const caricaPartecipanti = async (jamId) => {
  const { data, error } = await supabase
    .from('jam_members')
    .select('*')
    .eq('jam_id', jamId)
    .order('joined_at')
  if (error) throw error
  return data || []
}

// ── CARICA MENU ───────────────────────────────────────────────────────
export const caricaMenu = async (jamId) => {
  const { data, error } = await supabase
    .from('jam_menu')
    .select('*')
    .eq('jam_id', jamId)
    .order('categoria')
  if (error) throw error
  return data || []
}

// ── AGGIORNA VOCE MENU ────────────────────────────────────────────────
export const aggiornaMenu = async (jamId, categoria, intensita, disponibile) => {
  const { error } = await supabase
    .from('jam_menu')
    .update({ disponibile })
    .eq('jam_id', jamId)
    .eq('categoria', categoria)
    .eq('intensita', intensita)
  if (error) throw error
}

// ── CARICA DRINK JAM ──────────────────────────────────────────────────
export const caricaDrinkJam = async (jamId) => {
  const { data, error } = await supabase
    .from('jam_drinks')
    .select('*')
    .eq('jam_id', jamId)
    .order('timestamp')
  if (error) throw error
  return data || []
}

// ── AGGIUNGI DRINK JAM ────────────────────────────────────────────────
export const aggiungiDrinkJam = async (jamId, userId, categoria, intensita, customTs) => {
  const { getGrammiPreset } = await import('./bacEngine.js')
  const grammi = getGrammiPreset(categoria, intensita)
  const { data, error } = await supabase
    .from('jam_drinks')
    .insert({
      jam_id: jamId, user_id: userId,
      categoria, intensita,
      grammi_alcol: grammi,
      timestamp: customTs || new Date().toISOString(),
    })
    .select()
    .single()
  if (error) throw error
  return data
}

// ── ELIMINA DRINK JAM ─────────────────────────────────────────────────
export const eliminaDrinkJam = async (drinkId) => {
  const { error } = await supabase.from('jam_drinks').delete().eq('id', drinkId)
  if (error) throw error
}

// ── AGGIORNA BAC PARTECIPANTE ─────────────────────────────────────────
export const aggiornaBacPartecipante = async (jamId, userId, bacAttuale) => {
  const { error } = await supabase
    .from('jam_members')
    .update({ bac_attuale: Math.round(bacAttuale * 1000) / 1000 })
    .eq('jam_id', jamId)
    .eq('user_id', userId)
  if (error) console.warn('aggiornaBacPartecipante:', error.message)
}

// ── AVVIA JAM ─────────────────────────────────────────────────────────
export const avviaJam = async (jamId) => {
  const { error } = await supabase
    .from('jam_sessions')
    .update({ status: 'active', data_inizio: new Date().toISOString() })
    .eq('id', jamId)
  if (error) throw error
}

// ── CHIUDI JAM ────────────────────────────────────────────────────────
export const chiudiJam = async (jamId) => {
  const { error } = await supabase
    .from('jam_sessions')
    .update({ status: 'closed', data_fine: new Date().toISOString() })
    .eq('id', jamId)
  if (error) throw error
}

// ── REALTIME SUBSCRIPTION ─────────────────────────────────────────────
// Accetta 3 callback separate: onPartecipanti, onDrink, onFoto
export const subscribeJam = (jamId, onPartecipanti, onDrink, onFoto) => {
  const channel = supabase
    .channel(`jam-${jamId}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'jam_members', filter: `jam_id=eq.${jamId}` },
      onPartecipanti
    )
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'jam_drinks', filter: `jam_id=eq.${jamId}` },
      onDrink
    )
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'jam_photos', filter: `jam_id=eq.${jamId}` },
      onFoto || (() => {})
    )
    .subscribe()
  return () => supabase.removeChannel(channel)
}

// ── FOTO JAM ──────────────────────────────────────────────────────────
export const caricaFotoJam = async (jamId) => {
  const { data, error } = await supabase
    .from('jam_photos')
    .select('*')
    .eq('jam_id', jamId)
    .order('taken_at', { ascending: false })
  if (error) throw error
  return data || []
}

export const uploadFotoJam = async (userId, jamId, file, caption = '') => {
  const ext  = file.name.split('.').pop()
  const path = `${userId}/${jamId}/${Date.now()}.${ext}`
  const { error: upErr } = await supabase.storage
    .from('session-photos')
    .upload(path, file, { contentType: file.type })
  if (upErr) throw upErr
  const { data, error } = await supabase
    .from('jam_photos')
    .insert({ jam_id: jamId, user_id: userId, storage_path: path, caption })
    .select()
    .single()
  if (error) throw error
  return data
}

// ── LISTA JAM DELL'UTENTE ─────────────────────────────────────────────
export const caricaMieJam = async (userId) => {
  const { data, error } = await supabase
    .from('jam_members')
    .select('jam_id, is_host, joined_at, jam_sessions(*)')
    .eq('user_id', userId)
    .order('joined_at', { ascending: false })
  if (error) throw error
  return (data || []).map(r => ({
    ...r.jam_sessions,
    is_host: r.is_host,
    joined_at: r.joined_at,
  }))
}

// Alias per compatibilità con JamLobby.jsx
export const uniscitiJamLobby = uniscitiJamViaCodice
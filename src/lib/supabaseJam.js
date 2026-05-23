import { supabase } from './supabase.js'
import { getGrammiPreset } from './bacEngine.js'

// ── CODICE JAM ────────────────────────────────────────────────────────
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // niente O,0,I,1 per leggibilità
export const generaCodiceJam = () =>
  Array.from({ length: 6 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('')

// ── CREA JAM (host) ───────────────────────────────────────────────────
export const creaJam = async (hostId, nome, stomaco) => {
  const code = generaCodiceJam()
  const { data, error } = await supabase
    .from('jam_sessions')
    .insert({ code, name: nome, host_id: hostId, stomaco, stato: 'attesa' })
    .select().single()
  if (error) throw error

  // Predisponi il menu completo di default
  const menuDefault = ['birra','vino','cocktail','shot'].flatMap(cat =>
    ['leggero','ideale','pesante'].map(int => ({
      jam_id: data.id, categoria: cat, intensita: int, disponibile: true
    }))
  )
  menuDefault.push({ jam_id: data.id, categoria: 'acqua', intensita: 'ideale', disponibile: true })
  await supabase.from('jam_menu').insert(menuDefault)

  return data
}

// ── TROVA JAM PER CODICE ──────────────────────────────────────────────
export const trovaPerCodice = async (code) => {
  const { data, error } = await supabase
    .from('jam_sessions')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .single()
  if (error) throw new Error('Codice non valido o serata non trovata')
  return data
}

// ── UNISCITI ALLA JAM ─────────────────────────────────────────────────
export const uniscitiJam = async (jamId, userId, profilo) => {
  const { data, error } = await supabase
    .from('jam_participants')
    .upsert({
      jam_id: jamId, user_id: userId,
      username: profilo.username,
      peso_kg: profilo.peso_kg,
      sesso: profilo.sesso,
      tipo_patente: profilo.tipo_patente,
      stomaco: profilo.stomaco,
      bac_attuale: 0,
    }, { onConflict: 'jam_id,user_id' })
    .select().single()
  if (error) throw error
  return data
}

// ── CARICA PARTECIPANTI ───────────────────────────────────────────────
export const caricaPartecipanti = async (jamId) => {
  const { data, error } = await supabase
    .from('jam_participants')
    .select('*')
    .eq('jam_id', jamId)
    .order('joined_at')
  if (error) throw error
  return data
}

// ── AGGIORNA BAC UTENTE ───────────────────────────────────────────────
export const aggiornaBacPartecipante = async (jamId, userId, bac) => {
  const { error } = await supabase
    .from('jam_participants')
    .update({ bac_attuale: Math.round(bac * 1000) / 1000 })
    .eq('jam_id', jamId)
    .eq('user_id', userId)
  if (error) console.error('Errore update BAC:', error)
}

// ── MENU ──────────────────────────────────────────────────────────────
export const caricaMenu = async (jamId) => {
  const { data, error } = await supabase
    .from('jam_menu')
    .select('*')
    .eq('jam_id', jamId)
    .order('categoria')
  if (error) throw error
  return data
}

export const aggiornaMenu = async (jamId, categoria, intensita, disponibile) => {
  const { error } = await supabase
    .from('jam_menu')
    .update({ disponibile })
    .eq('jam_id', jamId)
    .eq('categoria', categoria)
    .eq('intensita', intensita)
  if (error) throw error
}

// ── DRINK JAM ─────────────────────────────────────────────────────────
export const aggiungiDrinkJam = async (jamId, userId, categoria, intensita, customTimestamp) => {
  const grammi = getGrammiPreset(categoria, intensita)
  const { data, error } = await supabase
    .from('jam_drinks')
    .insert({
      jam_id: jamId, user_id: userId, categoria, intensita,
      grammi_alcol: grammi,
      timestamp: customTimestamp || new Date().toISOString(),
    })
    .select().single()
  if (error) throw error
  return data
}

export const caricaDrinkJam = async (jamId) => {
  const { data, error } = await supabase
    .from('jam_drinks')
    .select('*')
    .eq('jam_id', jamId)
    .order('timestamp')
  if (error) throw error
  return data
}

export const eliminaDrinkJam = async (drinkId) => {
  const { error } = await supabase.from('jam_drinks').delete().eq('id', drinkId)
  if (error) throw error
}

// ── CONTROLLO JAM (host) ──────────────────────────────────────────────
export const avviaJam = async (jamId) => {
  const { error } = await supabase
    .from('jam_sessions')
    .update({ stato: 'attiva', data_inizio: new Date().toISOString() })
    .eq('id', jamId)
  if (error) throw error
}

export const chiudiJam = async (jamId) => {
  const { error } = await supabase
    .from('jam_sessions')
    .update({ stato: 'chiusa', data_fine: new Date().toISOString() })
    .eq('id', jamId)
  if (error) throw error
}

// ── FOTO JAM ──────────────────────────────────────────────────────────
export const caricaFotoJam = async (jamId) => {
  const { data, error } = await supabase
    .from('jam_photos')
    .select('*')
    .eq('jam_id', jamId)
    .order('taken_at')
  if (error) throw error
  return data
}

export const uploadFotoJam = async (jamId, userId, file, caption = '') => {
  const ext  = file.name.split('.').pop()
  const path = `${userId}/${jamId}/${Date.now()}.${ext}`
  const { error: upErr } = await supabase.storage
    .from('session-photos')
    .upload(path, file, { contentType: file.type, upsert: false })
  if (upErr) throw upErr

  const { data, error } = await supabase
    .from('jam_photos')
    .insert({ jam_id: jamId, user_id: userId, storage_path: path, caption, taken_at: new Date().toISOString() })
    .select().single()
  if (error) throw error
  return data
}

// ── REALTIME SUBSCRIPTION ─────────────────────────────────────────────
export const subscribeJam = (jamId, onPartecipantiChange, onDrinkChange, onFotoChange) => {
  const channel = supabase.channel(`jam:${jamId}`)

  channel
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'jam_participants',
      filter: `jam_id=eq.${jamId}`
    }, onPartecipantiChange)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'jam_drinks',
      filter: `jam_id=eq.${jamId}`
    }, onDrinkChange)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'jam_photos',
      filter: `jam_id=eq.${jamId}`
    }, onFotoChange)
    .subscribe()

  return () => supabase.removeChannel(channel)
}

// ── LISTA JAM DELL'UTENTE ────────────────────────────────────
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

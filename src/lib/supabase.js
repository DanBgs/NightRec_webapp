import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// AUTH
export const signUp = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  return data
}

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export const signOut = async () => {
  await supabase.auth.signOut()
}

export const getCurrentUser = async () => {
  const { data } = await supabase.auth.getUser()
  return data.user
}

// PROFILE
export const salvaProfile = async (profile) => {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ ...profile, updated_at: new Date().toISOString() })
    .select()
    .single()
  if (error) throw error
  return data
}

export const caricaProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

// SESSIONS
export const creaNuovaSessione = async (userId, stomaco) => {
  const { data, error } = await supabase
    .from('sessions')
    .insert({ user_id: userId, stomaco, ml_acqua: 0, data_inizio: new Date().toISOString() })
    .select()
    .single()
  if (error) throw error
  return data
}

export const chiudiSessione = async (id, bacPicco, mlAcqua, note, idratazione) => {
  const { error } = await supabase
    .from('sessions')
    .update({
      data_fine: new Date().toISOString(),
      bac_picco: bacPicco,
      ml_acqua: mlAcqua,
      note,
      indice_idratazione: idratazione,
    })
    .eq('id', id)
  if (error) throw error
}

export const caricaSessioni = async (userId) => {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .order('data_inizio', { ascending: false })
  if (error) throw error
  return data
}

export const caricaSessioneCompleta = async (sessionId) => {
  const [sRes, dRes] = await Promise.all([
    supabase.from('sessions').select('*').eq('id', sessionId).single(),
    supabase.from('drinks').select('*').eq('session_id', sessionId).order('timestamp'),
  ])
  if (sRes.error) throw sRes.error
  if (dRes.error) throw dRes.error
  return { sessione: sRes.data, drinks: dRes.data }
}

// DRINKS
export const aggiungiDrink = async (sessionId, userId, categoria, grammiAlcol, intensita) => {
  const { data, error } = await supabase
    .from('drinks')
    .insert({
      session_id: sessionId,
      user_id: userId,
      categoria,
      grammi_alcol: grammiAlcol,
      intensita,
      timestamp: new Date().toISOString(),
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export const eliminaDrink = async (id) => {
  const { error } = await supabase.from('drinks').delete().eq('id', id)
  if (error) throw error
}

// BAC SNAPSHOTS
export const salvaCurvaBAC = async (sessionId, punti) => {
  const rows = punti.map((p) => ({ session_id: sessionId, ...p }))
  const { error } = await supabase.from('bac_snapshots').insert(rows)
  if (error) throw error
}

export const caricaCurvaBAC = async (sessionId) => {
  const { data, error } = await supabase
    .from('bac_snapshots')
    .select('*')
    .eq('session_id', sessionId)
    .order('minuto')
  if (error) throw error
  return data
}

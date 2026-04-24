// ============================================================
//  NightRecorder — bacEngine.js
//  Motore BAC con Formula di Widmark evoluta
// ============================================================

const COEFFICIENTE_R = { uomo: 0.7, donna: 0.6 }
const TASSO_ELIMINAZIONE = 0.15 // g/l per ora

export const LIMITI_GUIDA = { standard: 0.5, neopatentato: 0.0 }

export const PRESET_DRINK = {
  birra:    { leggero: 8,  ideale: 13, pesante: 20 },
  vino:     { leggero: 9,  ideale: 12, pesante: 18 },
  cocktail: { leggero: 10, ideale: 16, pesante: 26 },
  shot:     { leggero: 13, ideale: 13, pesante: 13 },
}

export const ASSORBIMENTO = {
  digiuno:        { fattore: 1.0,  picco_min: 30 },
  pasto_leggero:  { fattore: 0.85, picco_min: 50 },
  pasto_completo: { fattore: 0.7,  picco_min: 75 },
}

export function creaProfiloUtente(peso_kg, sesso, patente, stomaco) {
  return {
    peso_kg,
    sesso,
    patente,
    stomaco,
    r: COEFFICIENTE_R[sesso] ?? 0.7,
    limite_guida: LIMITI_GUIDA[patente] ?? 0.5,
    assorbimento: ASSORBIMENTO[stomaco] ?? ASSORBIMENTO.pasto_completo,
  }
}

export function bacSingoloDrink(grammi, minuti, profilo) {
  const { peso_kg, r, assorbimento: { fattore, picco_min } } = profilo
  const bac_picco = (grammi * fattore) / (peso_kg * r * 10)
  if (minuti <= 0) return 0
  const bac = minuti < picco_min
    ? bac_picco * (minuti / picco_min)
    : bac_picco - TASSO_ELIMINAZIONE * ((minuti - picco_min) / 60)
  return Math.max(0, bac)
}

export function calcolaBACTotale(drinks, ora_ms, profilo) {
  return drinks.reduce((tot, d) => {
    return tot + bacSingoloDrink(d.grammi, (ora_ms - d.timestamp_ms) / 60000, profilo)
  }, 0)
}

export function generaCurvaBac(drinks, profilo, intervallo = 5) {
  if (!drinks.length) return []
  const ora_ms = Date.now()
  const inizio_ms = Math.min(...drinks.map(d => d.timestamp_ms))
  const punti = []
  let zeroCount = 0

  for (let delta = 0; delta <= 8 * 3600000; delta += intervallo * 60000) {
    const t = inizio_ms + delta
    const bac = Math.round(calcolaBACTotale(drinks, t, profilo) * 1000) / 1000
    punti.push({
      minuto: Math.round(delta / 60000),
      bac,
      label_ora: new Date(t).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
      zona: getZonaBac(bac),
      is_futuro: t > ora_ms,
    })
    if (bac < 0.01) { if (++zeroCount >= 6) break } else zeroCount = 0
  }
  return punti
}

export function calcolaGhostPeak(drinks, profilo) {
  const ora_ms = Date.now()
  let bac_max = 0, minuti_al_picco = 0
  for (let d = 0; d <= 180; d += 2) {
    const bac = calcolaBACTotale(drinks, ora_ms + d * 60000, profilo)
    if (bac > bac_max) { bac_max = bac; minuti_al_picco = d }
  }
  return {
    bac_picco: Math.round(bac_max * 1000) / 1000,
    minuti_al_picco,
    label_ora_picco: new Date(ora_ms + minuti_al_picco * 60000)
      .toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
    is_pericoloso: bac_max > 0.5,
  }
}

export function calcolaCountdownGuida(drinks, profilo) {
  const ora_ms = Date.now()
  const bac_att = calcolaBACTotale(drinks, ora_ms, profilo)
  const lim = profilo.limite_guida
  const bac_attuale = Math.round(bac_att * 1000) / 1000

  if (bac_att <= lim) return {
    puo_guidare: true, minuti_al_limite: 0, bac_attuale,
    messaggio: lim === 0 ? '✅ BAC a zero. Puoi guidare.' : '✅ Sotto il limite. Puoi guidare.',
  }

  let min = null
  for (let d = 1; d <= 720; d++) {
    if (calcolaBACTotale(drinks, ora_ms + d * 60000, profilo) <= lim) { min = d; break }
  }
  if (!min) return { puo_guidare: false, minuti_al_limite: null, bac_attuale, messaggio: '🚫 BAC troppo elevato' }

  const ore = Math.floor(min / 60)
  const m = min % 60
  const label = new Date(ora_ms + min * 60000).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  return {
    puo_guidare: false, minuti_al_limite: min, bac_attuale, label_ora_ok: label,
    messaggio: `🕐 Tra ${ore > 0 ? ore + 'h ' : ''}${m}min (alle ${label})`,
  }
}

export function analizzaDrinkRavvicinati(drinks) {
  if (drinks.length < 2) return { avviso: false, messaggio: '' }
  const ord = [...drinks].sort((a, b) => a.timestamp_ms - b.timestamp_ms)
  let count = 0
  for (let i = 1; i < ord.length; i++)
    if ((ord[i].timestamp_ms - ord[i-1].timestamp_ms) / 60000 < 30) count++
  return {
    avviso: count >= 2,
    messaggio: count >= 2 ? `⚠️ ${count} drink ravvicinati — carico epatico critico` : '',
  }
}

export function getZonaBac(bac) {
  if (bac < 0.2) return 'sobrio'
  if (bac < 0.5) return 'sweet_spot'
  return 'alterato'
}

export function getGrammiPreset(cat, intensita) {
  return PRESET_DRINK[cat]?.[intensita] ?? 0
}

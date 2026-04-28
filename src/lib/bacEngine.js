// ============================================================
//  NightRecorder — bacEngine.js  v4
//
//  Formula di Widmark calibrata per il contesto italiano,
//  integrata con il prompt di progetto BAC Monitoring.
//
//  G (grammi alcol puro) = V(ml) × (ABV/100) × 0.789
//  BAC_picco = (G × fattore_stomaco) / (P × r_eff)
//
//  r_eff calibrato empiricamente:
//    Uomo:  r_eff = 1.05  (equivalente a r_Widmark 0.68 × fattore 1.54)
//    Donna: r_eff = 0.91  (equivalente a r_Widmark 0.55 × fattore 1.65)
//
//  → 1 birra 330ml 5% su 70kg uomo = picco ~0.178 g/L ✓
//  → 1 calice vino 125ml 12% su 60kg donna = picco ~0.22 g/L ✓
//
//  Tasso eliminazione: β = 0.15 g/L/h (media adulto sano)
//
//  Fase temporale:
//    0 → picco_min: salita lineare (assorbimento gastrico)
//    picco_min → ∞: discesa lineare (eliminazione epatica)
// ============================================================

// Coefficiente di distribuzione effettivo (già include conversione g/kg → g/L)
const R_EFF = { uomo: 1.05, donna: 0.91 }

// Tasso di eliminazione epatica standard
const BETA = 0.15  // g/L per ora

// Densità dell'etanolo (g/ml) — usata per calcolare i grammi da volume+gradazione
const DENSITA_ALCOL = 0.789

export const LIMITI_GUIDA = {
  standard:     0.5,
  neopatentato: 0.0,
}

// ── Database bevande ──────────────────────────────────────────────────
// Ogni categoria ha 3 livelli di intensità (leggero/ideale/pesante)
// definiti da volume (ml) e gradazione ABV (%)
// G viene calcolato come: V × (ABV/100) × 0.789
export const DATABASE_BEVANDE = {
  birra: {
    label: 'Birra',
    emoji: '🍺',
    varianti: {
      leggero:  { label: '33cl leggera', volume_ml: 330, abv: 3.5 },
      ideale:   { label: '33cl normale', volume_ml: 330, abv: 5.0 },
      pesante:  { label: '50cl scura',   volume_ml: 500, abv: 6.5 },
    },
  },
  vino: {
    label: 'Vino',
    emoji: '🍷',
    varianti: {
      leggero:  { label: 'Calice leggero',  volume_ml: 125, abv: 10.0 },
      ideale:   { label: 'Calice standard', volume_ml: 125, abv: 12.0 },
      pesante:  { label: 'Calice abbond.',  volume_ml: 175, abv: 14.0 },
    },
  },
  cocktail: {
    label: 'Cocktail',
    emoji: '🍹',
    varianti: {
      leggero:  { label: 'Spritz / Aperol', volume_ml: 200, abv: 8.0  },
      ideale:   { label: 'Gin Tonic / Mojito', volume_ml: 200, abv: 13.0 },
      pesante:  { label: 'Long Island / Negroni', volume_ml: 200, abv: 20.0 },
    },
  },
  shot: {
    label: 'Shot',
    emoji: '🥃',
    varianti: {
      leggero:  { label: 'Shot leggero', volume_ml: 30, abv: 30.0 },
      ideale:   { label: 'Shot normale', volume_ml: 40, abv: 40.0 },
      pesante:  { label: 'Shot doppio',  volume_ml: 60, abv: 40.0 },
    },
  },
}

// Calcola grammi di alcol puro da volume e gradazione
export function calcolaGrammi(volume_ml, abv_percent) {
  return volume_ml * (abv_percent / 100) * DENSITA_ALCOL
}

// Grammi per una variante preset
export function getGrammiPreset(categoria, intensita) {
  const variante = DATABASE_BEVANDE[categoria]?.varianti[intensita]
  if (!variante) return 0
  return calcolaGrammi(variante.volume_ml, variante.abv_percent ?? variante.abv)
}

// Parametri di assorbimento per stato gastrico
// fattore: riduce la quota di alcol che raggiunge il sangue (effetto cibo)
// picco_min: minuti per raggiungere il BAC massimo
export const ASSORBIMENTO = {
  digiuno:        { fattore: 1.00, picco_min: 30, label: 'Digiuno'        },
  pasto_leggero:  { fattore: 0.90, picco_min: 45, label: 'Pasto leggero'  },
  pasto_completo: { fattore: 0.75, picco_min: 75, label: 'Pasto completo' },
}

// ── Crea profilo utente ──────────────────────────────────────────────
export function creaProfiloUtente(peso_kg, sesso, patente, stomaco) {
  return {
    peso_kg,
    sesso,
    patente,
    stomaco,
    r_eff:        R_EFF[sesso] ?? R_EFF.uomo,
    limite_guida: LIMITI_GUIDA[patente] ?? 0.5,
    assorbimento: ASSORBIMENTO[stomaco] ?? ASSORBIMENTO.pasto_completo,
  }
}

// ── BAC di un singolo drink al tempo T ──────────────────────────────
// grammi  = grammi di alcol puro (calcolati con calcolaGrammi)
// minuti  = minuti trascorsi dall'ingestione del drink
// profilo = oggetto profilo utente
export function bacSingoloDrink(grammi, minuti, profilo) {
  if (minuti <= 0) return 0

  const { peso_kg, r_eff, assorbimento: { fattore, picco_min } } = profilo

  // BAC al picco per questo drink
  const bac_picco = (grammi * fattore) / (peso_kg * r_eff)

  let bac
  if (minuti <= picco_min) {
    // Fase di assorbimento: salita lineare da 0 al picco
    bac = bac_picco * (minuti / picco_min)
  } else {
    // Fase di eliminazione: discesa lineare al ritmo di β g/L/h
    const ore_post_picco = (minuti - picco_min) / 60
    bac = bac_picco - (BETA * ore_post_picco)
  }

  return Math.max(0, bac)
}

// ── BAC totale: somma contributi di tutti i drink ────────────────────
export function calcolaBACTotale(drinks, ora_ms, profilo) {
  if (!drinks || drinks.length === 0) return 0
  return drinks.reduce((totale, d) => {
    const minuti = (ora_ms - d.timestamp_ms) / 60000
    return totale + bacSingoloDrink(d.grammi, minuti, profilo)
  }, 0)
}

// ── Genera curva BAC completa nel tempo ──────────────────────────────
// Restituisce un array di punti {minuto, bac, label_ora, zona, is_futuro}
// dalla prima consumazione fino al ritorno a zero
export function generaCurvaBac(drinks, profilo, intervallo_min = 5) {
  if (!drinks || drinks.length === 0) return []

  const ora_ms    = Date.now()
  // Inizia 10 minuti prima del primo drink per mostrare la partenza a zero
  const inizio_ms = Math.min(...drinks.map(d => d.timestamp_ms)) - 10 * 60000
  const fine_ms   = inizio_ms + 14 * 3600000  // finestra massima 14 ore

  const punti       = []
  let   zeroCount   = 0
  const SOGLIA_ZERO = 0.003

  for (let t = inizio_ms; t <= fine_ms; t += intervallo_min * 60000) {
    const bac = calcolaBACTotale(drinks, t, profilo)
    const bacR = Math.round(bac * 1000) / 1000

    punti.push({
      t_ms:      t,
      minuto:    Math.round((t - inizio_ms) / 60000),
      bac:       bacR,
      label_ora: new Date(t).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
      zona:      getZonaBac(bacR),
      is_futuro: t > ora_ms,
    })

    // Interrompi se rimane a zero per 30 minuti consecutivi (solo dopo il picco)
    if (punti.length > 12 && bacR < SOGLIA_ZERO) {
      if (++zeroCount >= Math.ceil(30 / intervallo_min)) break
    } else {
      zeroCount = 0
    }
  }

  return punti
}

// ── Ghost Peak ───────────────────────────────────────────────────────
// Picco BAC massimo atteso nelle prossime 3 ore (risoluzione 1 minuto)
export function calcolaGhostPeak(drinks, profilo) {
  if (!drinks || drinks.length === 0) return null

  const ora_ms         = Date.now()
  const bac_adesso     = calcolaBACTotale(drinks, ora_ms, profilo)
  let   bac_max        = bac_adesso
  let   minuti_al_picco = 0

  for (let min = 1; min <= 180; min++) {
    const bac = calcolaBACTotale(drinks, ora_ms + min * 60000, profilo)
    if (bac > bac_max) {
      bac_max        = bac
      minuti_al_picco = min
    }
  }

  const ts_picco = ora_ms + minuti_al_picco * 60000

  return {
    bac_picco:        Math.round(bac_max * 1000) / 1000,
    minuti_al_picco,
    label_ora_picco:  new Date(ts_picco).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
    is_pericoloso:    bac_max >= 0.5,
    gia_al_picco:     minuti_al_picco === 0,
  }
}

// ── Tempo al ritorno a zero ──────────────────────────────────────────
// Stima i minuti necessari per smaltire completamente l'alcol
export function calcolaTempoAZero(drinks, profilo) {
  if (!drinks || drinks.length === 0) return 0
  for (let min = 1; min <= 840; min++) {
    const bac = calcolaBACTotale(drinks, Date.now() + min * 60000, profilo)
    if (bac < 0.003) return min
  }
  return null
}

// ── Countdown guida ──────────────────────────────────────────────────
export function calcolaCountdownGuida(drinks, profilo) {
  if (!drinks || drinks.length === 0) {
    return { puo_guidare: true, minuti_al_limite: 0, bac_attuale: 0, messaggio: '✅ Puoi guidare.' }
  }

  const ora_ms      = Date.now()
  const bac_attuale = Math.round(calcolaBACTotale(drinks, ora_ms, profilo) * 1000) / 1000
  const limite      = profilo.limite_guida

  // Controlla se il BAC supererà il limite nelle prossime 2 ore (fase assorbimento)
  let supera_limite = bac_attuale > limite
  if (!supera_limite) {
    for (let min = 1; min <= 120; min++) {
      if (calcolaBACTotale(drinks, ora_ms + min * 60000, profilo) > limite) {
        supera_limite = true
        break
      }
    }
  }

  if (!supera_limite) {
    return {
      puo_guidare:      true,
      minuti_al_limite: 0,
      bac_attuale,
      messaggio: limite === 0 ? '✅ BAC a zero. Puoi guidare.' : '✅ Sotto il limite. Puoi guidare.',
    }
  }

  // Cerca quando il BAC scende stabilmente sotto il limite
  let minuti_ok = null
  for (let min = 1; min <= 840; min++) {
    if (calcolaBACTotale(drinks, ora_ms + min * 60000, profilo) <= limite) {
      // Verifica che rimanga sotto per 30 minuti
      let stabile = true
      for (let check = 5; check <= 30; check += 5) {
        if (calcolaBACTotale(drinks, ora_ms + (min + check) * 60000, profilo) > limite) {
          stabile = false; break
        }
      }
      if (stabile) { minuti_ok = min; break }
    }
  }

  if (!minuti_ok) {
    return { puo_guidare: false, minuti_al_limite: null, bac_attuale, messaggio: '🚫 Impossibile stimare (BAC molto elevato).' }
  }

  const ore   = Math.floor(minuti_ok / 60)
  const min_r = minuti_ok % 60
  const label = new Date(ora_ms + minuti_ok * 60000)
    .toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })

  return {
    puo_guidare:      false,
    minuti_al_limite: minuti_ok,
    bac_attuale,
    label_ora_ok:     label,
    messaggio:        `🕐 Tra ${ore > 0 ? ore + 'h ' : ''}${min_r}min (alle ${label})`,
  }
}

// ── Analisi drink ravvicinati ────────────────────────────────────────
export function analizzaDrinkRavvicinati(drinks) {
  if (!drinks || drinks.length < 2) return { avviso: false, messaggio: '' }
  const ord   = [...drinks].sort((a, b) => a.timestamp_ms - b.timestamp_ms)
  let   count = 0
  for (let i = 1; i < ord.length; i++)
    if ((ord[i].timestamp_ms - ord[i - 1].timestamp_ms) / 60000 < 20) count++
  return {
    avviso:    count >= 2,
    messaggio: count >= 2
      ? `⚠️ ${count} drink in meno di 20 minuti — il picco sarà più alto e rapido del previsto`
      : '',
  }
}

// ── Utility ──────────────────────────────────────────────────────────
export function getZonaBac(bac) {
  if (bac < 0.2)  return 'sobrio'
  if (bac < 0.5)  return 'sweet_spot'
  return 'alterato'
}

// Etichetta zona leggibile
export function getLabelZona(zona) {
  if (zona === 'sobrio')     return 'Sobrio'
  if (zona === 'sweet_spot') return 'Sweet Spot'
  return 'Alterato'
}

// Compatibilità con il vecchio preset fisso (usato in Sessione.jsx)
export const PRESET_DRINK = {
  birra:    { leggero: 9,  ideale: 13, pesante: 26 },
  vino:     { leggero: 10, ideale: 12, pesante: 20 },
  cocktail: { leggero: 13, ideale: 21, pesante: 32 },
  shot:     { leggero: 8,  ideale: 13, pesante: 19 },
}

export function getGrammiPresetLegacy(cat, intensita) {
  return PRESET_DRINK[cat]?.[intensita] ?? 0
}

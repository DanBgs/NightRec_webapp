// ── Icone SVG drink ───────────────────────────────────────────────────

export function IconBirra({ size = 28, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="10" width="16" height="18" rx="2" stroke={color} strokeWidth="1.8" fill="none"/>
      <path d="M21 14h3a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-3" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M8 10V7M12 10V5.5M16 10V7" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      <rect x="5" y="19" width="16" height="9" rx="0 0 2 2" fill={color} opacity="0.12"/>
    </svg>
  )
}

export function IconVino({ size = 28, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Calice simmetrico */}
      <path d="M11 5h10" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M11 5 C11 12 13 16 16 17.5 C19 16 21 12 21 5" stroke={color} strokeWidth="1.8" fill="none"/>
      {/* Riempimento vino */}
      <path d="M12.5 11 C13 13.5 14.2 15.5 16 16.8" stroke={color} strokeWidth="3.5" strokeLinecap="round" opacity="0.15"/>
      {/* Stelo verticale */}
      <line x1="16" y1="17.5" x2="16" y2="26" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      {/* Base */}
      <path d="M12 26h8" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}

export function IconCocktail({ size = 28, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 5h20L16 18v8" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10 26h12" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      {/* Riempimento */}
      <path d="M9 8l7 10" stroke={color} strokeWidth="5" strokeLinecap="round" opacity="0.13"/>
      {/* Cannuccia */}
      <line x1="21" y1="7" x2="15" y2="22" stroke={color} strokeWidth="1.6" strokeLinecap="round" opacity="0.65"/>
    </svg>
  )
}

export function IconShot({ size = 28, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Bicchierino basso e tozzo — proporzionato */}
      <path d="M9 9h14l-2 16H11L9 9z" stroke={color} strokeWidth="1.8" fill="none" strokeLinejoin="round"/>
      <path d="M9 9h14" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      {/* Riempimento */}
      <path d="M10.5 18h11" stroke={color} strokeWidth="5" strokeLinecap="round" opacity="0.13"/>
      {/* Riflesso */}
      <path d="M12 11.5l0.4 7" stroke={color} strokeWidth="1.3" strokeLinecap="round" opacity="0.3"/>
    </svg>
  )
}

export function IconAcqua({ size = 28, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 4 C16 4 8 14 8 19a8 8 0 0 0 16 0C24 14 16 4 16 4z" stroke={color} strokeWidth="1.8" fill="none"/>
      <path d="M16 4 C16 4 8 14 8 19" stroke={color} strokeWidth="4" strokeLinecap="round" opacity="0.1"/>
      <path d="M12 21a4 4 0 0 0 4 3" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.45"/>
    </svg>
  )
}

// ── Icone stomaco ─────────────────────────────────────────────────────

export function IconDigiuno({ size = 36, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Piatto vuoto */}
      <ellipse cx="20" cy="26" rx="13" ry="4" stroke={color} strokeWidth="1.8" fill="none"/>
      <path d="M7 26 C7 20 13 16 20 16 C27 16 33 20 33 26" stroke={color} strokeWidth="1.8" fill="none"/>
      {/* Coperchio con manico */}
      <path d="M11 16 C11 10 14 7 20 7 C26 7 29 10 29 16" stroke={color} strokeWidth="1.8" fill="none"/>
      <circle cx="20" cy="6" r="2" stroke={color} strokeWidth="1.6" fill="none"/>
    </svg>
  )
}

export function IconPastoLeggero({ size = 36, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Insalatiera */}
      <path d="M8 20 C8 28 12 32 20 32 C28 32 32 28 32 20" stroke={color} strokeWidth="1.8" fill="none"/>
      <line x1="6" y1="20" x2="34" y2="20" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      {/* Foglie stilizzate */}
      <path d="M14 17 C14 12 18 10 20 13" stroke={color} strokeWidth="1.6" strokeLinecap="round" fill="none"/>
      <path d="M20 13 C22 10 26 11 25 16" stroke={color} strokeWidth="1.6" strokeLinecap="round" fill="none"/>
      <path d="M17 16 C17 13 20 11 22 14" stroke={color} strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.6"/>
    </svg>
  )
}

export function IconPastoCompleto({ size = 36, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Piatto */}
      <circle cx="20" cy="24" r="12" stroke={color} strokeWidth="1.8" fill="none"/>
      <circle cx="20" cy="24" r="8"  stroke={color} strokeWidth="1.2" fill="none" opacity="0.3"/>
      {/* Forchetta */}
      <line x1="10" y1="10" x2="10" y2="18" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
      <line x1="8"  y1="10" x2="8"  y2="13" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="10" y1="10" x2="10" y2="13" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="12" y1="10" x2="12" y2="13" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
      {/* Coltello */}
      <path d="M30 10 L30 18 M30 10 C32 10 33 11 33 13 L30 14" stroke={color} strokeWidth="1.6" strokeLinecap="round" fill="none"/>
      {/* Cibo nel piatto */}
      <path d="M16 24 Q20 19 24 24" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5"/>
    </svg>
  )
}

// ── Componente generico drink ─────────────────────────────────────────
export function DrinkIcon({ categoria, size = 28, color = 'currentColor' }) {
  switch (categoria) {
    case 'birra':    return <IconBirra    size={size} color={color} />
    case 'vino':     return <IconVino     size={size} color={color} />
    case 'cocktail': return <IconCocktail size={size} color={color} />
    case 'shot':     return <IconShot     size={size} color={color} />
    case 'acqua':    return <IconAcqua    size={size} color={color} />
    default:         return <IconCocktail size={size} color={color} />
  }
}
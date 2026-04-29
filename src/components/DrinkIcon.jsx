// SVG icons per i drink — sostituiscono le emoji
export function IconBirra({ size = 28, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="10" width="16" height="18" rx="2" stroke={color} strokeWidth="1.8" fill="none"/>
      <path d="M21 14h4a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-4" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M5 16h16" stroke={color} strokeWidth="1.5" strokeDasharray="2 2" opacity="0.4"/>
      <path d="M8 10V7" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M12 10V6" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M16 10V7" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      {/* Liquid fill */}
      <rect x="5" y="18" width="16" height="10" rx="0 0 2 2" fill={color} opacity="0.15"/>
    </svg>
  )
}

export function IconVino({ size = 28, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 4h12" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M10 4c0 6 2 10 6 12S22 20 22 4" stroke={color} strokeWidth="1.8" fill="none"/>
      <path d="M11 10c0 3 1.5 5.5 5 6.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" opacity="0.5"/>
      {/* Liquid */}
      <path d="M11 12c1 2.5 2.5 4.5 5 5.5" stroke={color} strokeWidth="4" strokeLinecap="round" opacity="0.2"/>
      <line x1="16" y1="16" x2="16" y2="26" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M11 26h10" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}

export function IconCocktail({ size = 28, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Glass */}
      <path d="M6 5l8 10v11" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M26 5l-8 10" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M6 5h20" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M10 26h12" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      {/* Liquid fill */}
      <path d="M9 9l5 7h0" stroke={color} strokeWidth="5" strokeLinecap="round" opacity="0.18"/>
      {/* Straw */}
      <line x1="20" y1="8" x2="14" y2="22" stroke={color} strokeWidth="1.6" strokeLinecap="round" opacity="0.7"/>
      {/* Umbrella */}
      <path d="M20 8 l-3-3 3-1 3 1z" fill={color} opacity="0.5"/>
    </svg>
  )
}

export function IconShot({ size = 28, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 6h14l-2 20H11L9 6z" stroke={color} strokeWidth="1.8" fill="none" strokeLinejoin="round"/>
      <path d="M9 6h14" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      {/* Liquid */}
      <path d="M10.5 16h11" stroke={color} strokeWidth="6" strokeLinecap="round" opacity="0.15"/>
      <path d="M11.5 22h9" stroke={color} strokeWidth="3" strokeLinecap="round" opacity="0.15"/>
      {/* Shine */}
      <path d="M12 9l0.5 8" stroke={color} strokeWidth="1.4" strokeLinecap="round" opacity="0.35"/>
    </svg>
  )
}

export function IconAcqua({ size = 28, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 4 C16 4 8 14 8 19a8 8 0 0 0 16 0C24 14 16 4 16 4z" stroke={color} strokeWidth="1.8" fill="none"/>
      <path d="M12 21a4 4 0 0 0 4 3" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
      <path d="M16 4 C16 4 8 14 8 19" stroke={color} strokeWidth="4" strokeLinecap="round" opacity="0.1"/>
    </svg>
  )
}

// Componente generico che seleziona l'icona giusta
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

export function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 240 240"
      role="presentation"
      aria-hidden="true"
      className="h-auto w-full max-w-sm"
    >
      <rect x="40" y="60" width="160" height="120" rx="6" fill="var(--secondary)" stroke="var(--border)" strokeWidth="2" />
      <line x1="120" y1="60" x2="120" y2="180" stroke="var(--border)" strokeWidth="2" />
      <path
        d="M60 90h40M60 110h40M60 130h40M140 90h40M140 110h40M140 130h40"
        stroke="var(--muted-foreground)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="120" cy="150" r="26" fill="var(--primary)" />
      <path
        d="M120 134c-6 6-6 10 0 16 6-6 6-10 0-16zM104 150c6-6 10-6 16 0-6 6-10 6-16 0zM136 150c-6-6-10-6-16 0 6 6 10 6 16 0z"
        fill="var(--primary-foreground)"
      />
    </svg>
  )
}
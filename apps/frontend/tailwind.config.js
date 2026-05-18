/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Chalkboard-noir palette — visual-identity spec.
      colors: {
        board: '#1F3529',
        'board-shadow': '#172B22',
        parchment: '#EDE8D0',
        chalk: '#F0EBD8',
        'chalk-muted': '#9DB89A',
        string: '#C0392B',
        'amber-pin': '#D4A017',
        rule: '#2D5040',
        'stamp-verified': '#27AE60',
        'stamp-alleged': '#E67E22',
        'stamp-reported': '#3498DB',
        'stamp-disputed': '#8E44AD',
        'stamp-unverified': '#95A5A6',
        // Wood frame tokens — visual-identity spec
        wood: '#8B5E15',
        'wood-mid': '#C4922A',
        'wood-light': '#E8B84B',
        // Cork sidebar tokens — visual-identity spec
        cork: '#C19A6B',
        'cork-shadow': '#A07850',
      },
      fontFamily: {
        // Body font — IBM Plex Serif (default sans alias so existing font-sans usages work)
        sans: ['"IBM Plex Serif"', 'Georgia', 'serif'],
        // Headline — Playfair Display
        headline: ['"Playfair Display"', 'Georgia', 'serif'],
        // Typewriter IDs / timestamps / source snippets — Special Elite
        mono: ['"Special Elite"', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
};

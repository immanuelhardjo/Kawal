/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Calm, document-like palette per presentation-principles / cool tone.
      colors: {
        paper: '#fafaf9',
        ink: '#1f1f1f',
        muted: '#6b7280',
        rule: '#e5e7eb',
        accent: '#374151',
        certainty: {
          established: '#1f4f3a',
          alleged: '#7a4f1a',
          reported: '#37526b',
          disputed: '#7a2f3a',
          unverified: '#4b5563',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['"Source Serif Pro"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			fontFamily: {
				sans: ['Inter', 'Inter var', 'system-ui', 'sans-serif'],
			},
			colors: {
				// Premium Monchrome Palette
				primary: {
					50: '#f8fafc',
					100: '#f1f5f9',
					200: '#e2e8f0',
					300: '#cbd5e1',
					400: '#94a3b8',
					500: '#64748b',
					600: '#475569',
					700: '#334155',
					800: '#1e293b',
					900: '#0f172a', // Slate-900 as primary dark
				},
				// Accents (can be used for highlights)
				accent: {
					blue: '#3b82f6',
					red: '#ef4444',
					green: '#22c55e',
					orange: '#f97316'
				}
			},
			boxShadow: {
				'soft': '0 10px 30px -10px rgba(0, 0, 0, 0.05), 0 4px 10px -5px rgba(0, 0, 0, 0.02)',
				'glow': '0 0 20px rgba(66, 153, 225, 0.3)',
			},
			animation: {
				'float': 'float 6s ease-in-out infinite',
			},
			keyframes: {
				float: {
					'0%, 100%': { transform: 'translateY(0)' },
					'50%': { transform: 'translateY(-10px)' },
				}
			}
		}
	},
	plugins: []
};

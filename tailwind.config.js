/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['class', 'class'],
  theme: {
  	extend: {
  		colors: {
  			void: '#030308',
  			abyss: '#07070f',
  			deep: '#0c0c18',
  			surface: '#12121f',
  			elevated: '#1a1a2e',
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			cyan: {
  				glow: '#00f5ff',
  				bright: '#00d4e4',
  				DEFAULT: '#00a8b5',
  				dim: '#007a85'
  			},
  			magenta: {
  				glow: '#ff00ff',
  				bright: '#e100e1',
  				DEFAULT: '#b300b3',
  				dim: '#800080'
  			},
  			violet: {
  				glow: '#8b5cf6',
  				bright: '#7c3aed',
  				DEFAULT: '#6d28d9'
  			},
  			success: '#00ff88',
  			warning: '#ffaa00',
  			danger: '#ff3366',
  			info: '#00aaff',
  			'text-primary': '#f0f0ff',
  			'text-secondary': '#a0a0c0',
  			'text-muted': '#606080',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		fontFamily: {
  			display: [
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'system-ui',
  				'Segoe UI',
  				'Roboto',
  				'Helvetica Neue',
  				'Arial',
  				'sans-serif'
  			],
  			body: [
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'system-ui',
  				'Segoe UI',
  				'Roboto',
  				'Helvetica Neue',
  				'Arial',
  				'sans-serif'
  			],
  			mono: [
  				'ui-monospace',
  				'SFMono-Regular',
  				'SF Mono',
  				'Menlo',
  				'Monaco',
  				'Consolas',
  				'Liberation Mono',
  				'Courier New',
  				'monospace'
  			],
  			reading: [
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'system-ui',
  				'Georgia',
  				'Times New Roman',
  				'serif'
  			],
  			code: [
  				'ui-monospace',
  				'SFMono-Regular',
  				'SF Mono',
  				'Menlo',
  				'Monaco',
  				'Consolas',
  				'Liberation Mono',
  				'Courier New',
  				'monospace'
  			]
  		},
  		boxShadow: {
  			'glow-cyan': '0 0 20px rgba(0, 245, 255, 0.5), 0 0 40px rgba(0, 245, 255, 0.2)',
  			'glow-magenta': '0 0 20px rgba(255, 0, 255, 0.5), 0 0 40px rgba(255, 0, 255, 0.2)',
  			'glow-violet': '0 0 20px rgba(139, 92, 246, 0.5), 0 0 40px rgba(139, 92, 246, 0.2)',
  			'glow-success': '0 0 15px rgba(0, 255, 136, 0.4)',
  			'glow-warning': '0 0 15px rgba(255, 170, 0, 0.4)',
  			'glow-danger': '0 0 15px rgba(255, 51, 102, 0.4)',
  			'inner-glow': 'inset 0 0 20px rgba(0, 245, 255, 0.1)',
  			glass: '0 4px 30px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
  		},
  		backgroundImage: {
  			'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
  			'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
  			'cyber-grid': '`\\\\r\\\\n          linear-gradient(rgba(0, 245, 255, 0.03) 1px, transparent 1px),\\\\r\\\\n          linear-gradient(90deg, rgba(0, 245, 255, 0.03) 1px, transparent 1px)\\\\r\\\\n        `',
  			holographic: 'linear-gradient(135deg, rgba(0, 245, 255, 0.1) 0%, rgba(255, 0, 255, 0.1) 50%, rgba(139, 92, 246, 0.1) 100%)'
  		},
  		animation: {
  			'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
  			float: 'float 6s ease-in-out infinite',
  			shimmer: 'shimmer 3s infinite',
  			'spin-slow': 'spin 3s linear infinite',
  			'gradient-rotate': 'gradient-rotate 4s linear infinite',
  			'pulse-slow': 'pulse-slow 3s ease-in-out infinite'
  		},
  		keyframes: {
  			'pulse-glow': {
  				'0%, 100%': {
  					boxShadow: '0 0 5px rgba(0, 245, 255, 0.3), 0 0 10px rgba(0, 245, 255, 0.2)'
  				},
  				'50%': {
  					boxShadow: '0 0 15px rgba(0, 245, 255, 0.5), 0 0 30px rgba(0, 245, 255, 0.3)'
  				}
  			},
  			float: {
  				'0%, 100%': {
  					transform: 'translateY(0px)'
  				},
  				'50%': {
  					transform: 'translateY(-10px)'
  				}
  			},
  			shimmer: {
  				'0%': {
  					transform: 'translateX(-100%)'
  				},
  				'100%': {
  					transform: 'translateX(100%)'
  				}
  			},
  			'pulse-slow': {
  				'0%, 100%': {
  					transform: 'translateX(-100%)'
  				},
  				'50%': {
  					transform: 'translateX(100%)'
  				}
  			}
  		},
  		borderRadius: {
  			xl: '1rem',
  			'2xl': '1.5rem',
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		backdropBlur: {
  			xs: '2px'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}

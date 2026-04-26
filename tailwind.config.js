/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
      './pages/**/*.{js,jsx}',
      './components/**/*.{js,jsx}',
      './app/**/*.{js,jsx}',
      './src/**/*.{js,jsx}',
    ],
    prefix: "",
    theme: {
    	container: {
    		center: true,
    		padding: '2rem',
    		screens: {
    			'2xl': '1400px'
    		}
    	},
    	extend: {
    		colors: {
    			/* Semantic surface */
    			bg:                'hsl(var(--bg))',
    			'bg-elevated':     'hsl(var(--bg-elevated))',
    			'bg-muted':        'hsl(var(--bg-muted))',
    			'bg-subtle':       'hsl(var(--bg-subtle))',
    			/* Semantic text */
    			fg:                'hsl(var(--fg))',
    			'fg-muted':        'hsl(var(--fg-muted))',
    			'fg-subtle':       'hsl(var(--fg-subtle))',
    			'fg-disabled':     'hsl(var(--fg-disabled))',
    			'fg-inverse':      'hsl(var(--fg-inverse))',
    			/* Borders */
    			border: 'hsl(var(--border))',
    			'border-strong':   'hsl(var(--border-strong))',
    			input:  'hsl(var(--input))',
    			ring:   'hsl(var(--ring))',
    			/* Brand */
    			brand: {
    				DEFAULT: 'hsl(var(--brand))',
    				fg:      'hsl(var(--brand-fg))',
    				soft:    'hsl(var(--brand-soft))',
    				strong:  'hsl(var(--brand-strong))',
    			},
    			/* Status */
    			success: {
    				DEFAULT: 'hsl(var(--success))',
    				fg:      'hsl(var(--success-fg))',
    				soft:    'hsl(var(--success-soft))',
    			},
    			warning: {
    				DEFAULT: 'hsl(var(--warning))',
    				fg:      'hsl(var(--warning-fg))',
    				soft:    'hsl(var(--warning-soft))',
    			},
    			danger: {
    				DEFAULT: 'hsl(var(--danger))',
    				fg:      'hsl(var(--danger-fg))',
    				soft:    'hsl(var(--danger-soft))',
    			},
    			info: {
    				DEFAULT: 'hsl(var(--info))',
    				fg:      'hsl(var(--info-fg))',
    				soft:    'hsl(var(--info-soft))',
    			},
    			/* shadcn-compat */
    			background: 'hsl(var(--background))',
    			foreground: 'hsl(var(--foreground))',
    			primary: {
    				DEFAULT: 'hsl(var(--primary))',
    				foreground: 'hsl(var(--primary-foreground))'
    			},
    			secondary: {
    				DEFAULT: 'hsl(var(--secondary))',
    				foreground: 'hsl(var(--secondary-foreground))'
    			},
    			destructive: {
    				DEFAULT: 'hsl(var(--destructive))',
    				foreground: 'hsl(var(--destructive-foreground))'
    			},
    			muted: {
    				DEFAULT: 'hsl(var(--muted))',
    				foreground: 'hsl(var(--muted-foreground))'
    			},
    			accent: {
    				DEFAULT: 'hsl(var(--accent))',
    				foreground: 'hsl(var(--accent-foreground))'
    			},
    			popover: {
    				DEFAULT: 'hsl(var(--popover))',
    				foreground: 'hsl(var(--popover-foreground))'
    			},
    			card: {
    				DEFAULT: 'hsl(var(--card))',
    				foreground: 'hsl(var(--card-foreground))'
    			},
    		},
    		borderRadius: {
    			sm: 'var(--radius-sm)',
    			md: 'var(--radius-md)',
    			lg: 'var(--radius-lg)',
    			xl: 'var(--radius-xl)',
    		},
    		boxShadow: {
    			sm: 'var(--shadow-sm)',
    			md: 'var(--shadow-md)',
    			lg: 'var(--shadow-lg)',
    			xl: 'var(--shadow-xl)',
    		},
    		transitionTimingFunction: {
    			out: 'var(--ease-out)',
    			spring: 'var(--ease-spring)',
    		},
    		transitionDuration: {
    			fast: 'var(--duration-fast)',
    			base: 'var(--duration-base)',
    			slow: 'var(--duration-slow)',
    		},
    		fontSize: {
    			'2xs': ['0.6875rem', { lineHeight: '1rem' }],   // 11
    			caption: ['0.75rem', { lineHeight: '1rem' }],    // 12
    		},
    		keyframes: {
    			'accordion-down': {
    				from: {
    					height: '0'
    				},
    				to: {
    					height: 'var(--radix-accordion-content-height)'
    				}
    			},
    			'accordion-up': {
    				from: {
    					height: 'var(--radix-accordion-content-height)'
    				},
    				to: {
    					height: '0'
    				}
    			}
    		},
    		animation: {
    			'accordion-down': 'accordion-down 0.2s ease-out',
    			'accordion-up': 'accordion-up 0.2s ease-out'
    		}
    	}
    },
    plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
  }
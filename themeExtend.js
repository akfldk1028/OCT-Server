module.exports = {
  fontFamily: {
    sans: [
      'Inter',
      'ui-sans-serif',
      'system-ui',
      'sans-serif',
      'Apple Color Emoji',
      'Segoe UI Emoji',
      'Segoe UI Symbol',
      'Noto Color Emoji',
      'sans-serif',
    ],
  },
  borderRadius: {
    lg: 'var(--radius)',
    md: 'calc(var(--radius) - 2px)',
    sm: 'calc(var(--radius) - 4px)',
  },
  colors: {
    background: 'hsl(var(--background))',
    foreground: 'hsl(var(--foreground))',
    card: {
      DEFAULT: 'hsl(var(--card))',
      foreground: 'hsl(var(--card-foreground))',
    },
    popover: {
      DEFAULT: 'hsl(var(--popover))',
      foreground: 'hsl(var(--popover-foreground))',
    },
    primary: {
      DEFAULT: 'hsl(var(--primary))',
      foreground: 'hsl(var(--primary-foreground))',
    },
    secondary: {
      DEFAULT: 'hsl(var(--secondary))',
      foreground: 'hsl(var(--secondary-foreground))',
    },
    muted: {
      DEFAULT: 'hsl(var(--muted))',
      foreground: 'hsl(var(--muted-foreground))',
    },
    accent: {
      DEFAULT: 'hsl(var(--accent))',
      foreground: 'hsl(var(--accent-foreground))',
    },
    destructive: {
      DEFAULT: 'hsl(var(--destructive))',
      foreground: 'hsl(var(--destructive-foreground))',
    },
    border: 'hsl(var(--border))',
    input: 'hsl(var(--input))',
    ring: 'hsl(var(--ring))',
    chart: {
      1: 'hsl(var(--chart-1))',
      2: 'hsl(var(--chart-2))',
      3: 'hsl(var(--chart-3))',
      4: 'hsl(var(--chart-4))',
      5: 'hsl(var(--chart-5))',
    },
    sidebar: {
      DEFAULT: 'hsl(var(--sidebar-background))',
      background: 'hsl(var(--sidebar-background))',
      foreground: 'hsl(var(--sidebar-foreground))',
      primary: 'hsl(var(--sidebar-primary))',
      'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
      accent: 'hsl(var(--sidebar-accent))',
      'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
      border: 'hsl(var(--sidebar-border))',
      ring: 'hsl(var(--sidebar-ring))',
    },
  },
  animation: {
    'background-position-spin':
      'background-position-spin 3000ms infinite alternate',
    'accordion-down': 'accordion-down 0.2s ease-out',
    'accordion-up': 'accordion-up 0.2s ease-out',
    marquee: 'marquee var(--duration) infinite linear',
    'marquee-vertical': 'marquee-vertical var(--duration) linear infinite',
    grid: 'grid 15s linear infinite',
    ripple: 'ripple var(--duration,2s) ease calc(var(--i, 0)*.2s) infinite',
  },
  keyframes: {
    'background-position-spin': {
      '0%': {
        backgroundPosition: 'top center',
      },
      '100%': {
        backgroundPosition: 'bottom center',
      },
    },
    'accordion-down': {
      from: {
        height: '0',
      },
      to: {
        height: 'var(--radix-accordion-content-height)',
      },
    },
    'accordion-up': {
      from: {
        height: 'var(--radix-accordion-content-height)',
      },
      to: {
        height: '0',
      },
    },
    marquee: {
      from: {
        transform: 'translateX(0)',
      },
      to: {
        transform: 'translateX(calc(-100% - var(--gap)))',
      },
    },
    'marquee-vertical': {
      from: {
        transform: 'translateY(0)',
      },
      to: {
        transform: 'translateY(calc(-100% - var(--gap)))',
      },
    },
    grid: {
      '0%': {
        transform: 'translateY(-50%)',
      },
      '100%': {
        transform: 'translateY(0)',
      },
    },
    ripple: {
      '0%, 100%': {
        transform: 'translate(-50%, -50%) scale(1)',
      },
      '50%': {
        transform: 'translate(-50%, -50%) scale(0.9)',
      },
    },
  },
};

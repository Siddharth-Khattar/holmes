# Frontend Development Guide

## Theming

### Theme Architecture
- **Dark mode**: Default (`:root`, `.dark`)
- **Light mode**: Warm sepia/parchment (`.light` class)
- **Provider**: `next-themes` with `attribute="class"`

### CSS Variable Usage

**Always use CSS variables for theme-aware colors:**

```tsx
// Correct - uses CSS variables
style={{
  backgroundColor: "var(--card)",
  color: "var(--foreground)",
  borderColor: "var(--border)"
}}

// Wrong - hardcoded colors won't adapt to theme
className="bg-charcoal text-smoke border-smoke/10"
```

### Available CSS Variables

| Variable | Usage |
|----------|-------|
| `--background` | Page background |
| `--foreground` | Primary text |
| `--card` | Card/panel backgrounds |
| `--card-foreground` | Text on cards |
| `--muted` | Subtle backgrounds |
| `--muted-foreground` | Secondary/muted text |
| `--border` | Borders and dividers |
| `--primary` | Primary buttons/accents |
| `--primary-foreground` | Text on primary |
| `--popover` | Dropdown/popover backgrounds |
| `--popover-foreground` | Text in popovers |

### Component Patterns

**Inline styles for theme colors:**
```tsx
<div
  className="rounded-lg p-4"
  style={{
    backgroundColor: "var(--card)",
    border: "1px solid var(--border)",
  }}
>
  <p style={{ color: "var(--foreground)" }}>Content</p>
</div>
```

**Tailwind `dark:` prefix works** for non-semantic colors:
```tsx
// Status colors - use dark: variant for contrast
className="text-amber-500 dark:text-amber-400"
```

### Pages That Stay Dark

- **Landing/Marketing** (`app/(marketing)/`): Uses `var(--color-charcoal)` directly
- **Auth pages** (`app/(auth)/`): Uses `var(--color-charcoal)` directly

These pages ignore user theme preference by design.

### Themed Logo

Use `<ThemedLogo>` component in the app shell - it applies `filter: brightness(0)` in light mode via the `.logo-themed` CSS class.

### Glass Effects

Glass components (`.liquid-glass-*`, `.glass-panel`) have light mode variants. They work automatically via CSS.

### Adding New Components

1. Use CSS variables (`var(--*)`) for all theme-aware colors
2. Use `style={{ }}` for backgrounds, text colors, borders
3. Test in both light and dark modes
4. Avoid hardcoded color classes (`bg-jet`, `text-smoke`) in app UI

# Theme Palette and Style Tokens

This document exports the color palette and style tokens currently used by the app for both light and dark themes.

Source of truth:
- `constants/theme.ts`
- `utils/sphere-styles.ts`

## Global Theme Colors

### Light Theme (`Colors.light`)

- `text`: `#0D0D0D`
- `background`: `#FFFFFF`
- `textHighEmphasis`: `#0D0D0D`
- `textMediumEmphasis`: `#444444`
- `textDisabled`: `#94A3B8`
- `tint`: `#0C3819`
- `icon`: `#2E2E2E`
- `tabIconDefault`: `#64748B`
- `tabIconSelected`: `#0C3819`
- `primary`: `#166A31`
- `primaryLight`: `#228B41`
- `primaryDark`: `#0A4D22`
- `primaryText`: `#FFFFFF`
- `error`: `#D32F2F`
- `surface`: `#FFFFFF`
- `surfaceElevated1`: `#F8FAFC`
- `surfaceElevated2`: `#F1F5F9`
- `surfaceElevated4`: `#E2E8F0`
- `surfaceElevated8`: `#CBD5E1`

### Dark Theme (`Colors.dark`)

- `text`: `#F8FAFC`
- `background`: `#0B1120`
- `textHighEmphasis`: `#FFFFFF`
- `textMediumEmphasis`: `#94A3B8`
- `textDisabled`: `#475569`
- `tint`: `#34D399`
- `primary`: `#10B981`
- `primaryLight`: `#34D399`
- `primaryDark`: `#059669`
- `primaryDeep`: `#047857`
- `primaryText`: `#0B1120`
- `icon`: `#F8FAFC`
- `tabIconDefault`: `#475569`
- `tabIconSelected`: `#34D399`
- `error`: `#EF4444`
- `surface`: `#0B1120`
- `surfaceElevated1`: `#151E32`
- `surfaceElevated2`: `#1D283E`
- `surfaceElevated4`: `#2A3750`
- `surfaceElevated8`: `#3A4C6A`

## Shared Accent/Gradient Tokens

From `constants/theme.ts`:

- `darkPrimaryGradient3`: [`#34D399`, `#10B981`, `#059669`]
- `darkPrimaryShareGradient`: [`#10B981`, `#34D399`]
- `fabAccentBackground`: `#10B981`

## Sphere Styles (All Spheres)

Spheres:
- `relationships`
- `career`
- `family`
- `friends`
- `hobbies`

### Light Sphere Background Gradients (`LIGHT_SPHERE_GRADIENT`)

- `relationships`
  - `sunny`: `rgb(255,247,247)`, `rgb(253,238,240)`, `rgb(250,227,230)`
  - `cloudy`: `rgb(250,241,242)`, `rgb(245,233,235)`, `rgb(238,223,226)`
- `career`
  - `sunny`: `rgb(244,249,255)`, `rgb(235,244,253)`, `rgb(223,237,251)`
  - `cloudy`: `rgb(238,245,252)`, `rgb(229,239,249)`, `rgb(216,231,244)`
- `family`
  - `sunny`: `rgb(244,252,246)`, `rgb(235,247,238)`, `rgb(224,241,229)`
  - `cloudy`: `rgb(239,248,241)`, `rgb(230,243,234)`, `rgb(217,235,223)`
- `friends`
  - `sunny`: `rgb(248,244,255)`, `rgb(240,234,252)`, `rgb(230,223,248)`
  - `cloudy`: `rgb(243,239,252)`, `rgb(234,228,248)`, `rgb(222,216,241)`
- `hobbies`
  - `sunny`: `rgb(255,248,241)`, `rgb(252,239,228)`, `rgb(248,228,212)`
  - `cloudy`: `rgb(251,244,237)`, `rgb(245,233,222)`, `rgb(238,220,206)`

### Sphere Icon Colors (`getSphereIconColor`)

#### Light

- `relationships`: `#6D1414`
- `career`: `#0D47A1`
- `family`: `#174D1B`
- `friends`: `#4A148C`
- `hobbies`: `#8C2E0F`

#### Dark

Dark icon colors depend on sunny/cloudy state:

- `relationships`: sunny `#FECACA`, cloudy `#FCA5A5`
- `career`: sunny `#DBEAFE`, cloudy `#93C5FD`
- `family`: sunny `#D1FAE5`, cloudy `#6EE7B7`
- `friends`: sunny `#EDE9FE`, cloudy `#C4B5FD`
- `hobbies`: sunny `#FFEDD5`, cloudy `#FDBA74`

### Sphere Solid "Sfera" Colors (`getSphereSferaColor`)

#### Light

- `relationships`: `#C62828`
- `career`: `#1565C0`
- `family`: `#2E7D32`
- `friends`: `#6A1B9A`
- `hobbies`: `#8C2E0F`

#### Dark

- `relationships`: `#EF4444`
- `career`: `#3B82F6`
- `family`: `#10B981`
- `friends`: `#8B5CF6`
- `hobbies`: `#F97316`

### Sphere Shadow/Glow Colors (`getSphereShadowColor`)

#### Light

- all spheres: `#000`

#### Dark

- `relationships`: `#EF4444`
- `career`: `#3B82F6`
- `family`: `#10B981`
- `friends`: `#8B5CF6`
- `hobbies`: `#F97316`

### Sphere Accent Colors (`getSphereAccentColor`)

#### Light

- `relationships`: `#D32F2F`
- `career`: `#1976D2`
- `family`: `#388E3C`
- `friends`: `#7B1FA2`
- `hobbies`: `#F57C00`

#### Dark

- `relationships`: `#FCA5A5`
- `career`: `#93C5FD`
- `family`: `#6EE7B7`
- `friends`: `#C4B5FD`
- `hobbies`: `#FDBA74`

## Dynamic Sphere Gradient Logic in Dark Theme

Dark sphere backgrounds are generated in `getSphereGradientColors(...)` from each sphere's dark "sfera" solid color:

- When `sunnyPercentage >= 50` (Sunny state):
  - Gradient: transparent edge -> `rgba(sferaColor, 0.4)` center -> transparent edge
- When `sunnyPercentage < 50` (Cloudy state):
  - Center uses a softened mix of `rgba(sferaColor, 0.15)` with slate tint `#334155`
  - Full gradient fades to transparent edges (`rgba(0,0,0,0)`)

This keeps each sphere hue recognizable while giving the dark theme a softer nebula effect.

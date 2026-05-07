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

- `text`: `#FFFFFF`
- `background`: `#1A2332`
- `textHighEmphasis`: `#FFFFFF`
- `textMediumEmphasis`: `#E8EDF6`
- `textDisabled`: `#E4EDF8`
- `tint`: `#64B5F6`
- `primary`: `#64B5F6`
- `primaryLight`: `#90CAF9`
- `primaryDark`: `#42A5F5`
- `primaryDeep`: `#1E88E5`
- `primaryText`: `#1A2332`
- `icon`: `#E8EDF6`
- `tabIconDefault`: `#E8EDF6`
- `tabIconSelected`: `#64B5F6`
- `error`: `#EF5350`
- `surface`: `#1A2332`
- `surfaceElevated1`: `#243041`
- `surfaceElevated2`: `#2D3A4F`
- `surfaceElevated4`: `#364557`
- `surfaceElevated8`: `#424E62`

## Shared Accent/Gradient Tokens

From `constants/theme.ts`:

- `darkPrimaryGradient3`: [`#64B5F6`, `#42A5F5`, `#1E88E5`]
- `darkPrimaryShareGradient`: [`#42A5F5`, `#64B5F6`]
- `fabAccentBackground`: `#64B5F6`

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

- `relationships`: sunny `#CC3838`, cloudy `#F56868`
- `career`: sunny `#1565C0`, cloudy `#90CAF9`
- `family`: sunny `#5E35B1`, cloudy `#CE93D8`
- `friends`: sunny `#512DA8`, cloudy `#B39DDB`
- `hobbies`: sunny `#E65100`, cloudy `#FFCC80`

### Sphere Solid "Sfera" Colors (`getSphereSferaColor`)

#### Light

- `relationships`: `#C62828`
- `career`: `#1565C0`
- `family`: `#2E7D32`
- `friends`: `#6A1B9A`
- `hobbies`: `#8C2E0F`

#### Dark

- `relationships`: `#FF9696`
- `career`: `#96C8FF`
- `family`: `#C896FF`
- `friends`: `#8B5CF6`
- `hobbies`: `#F97B16`

### Sphere Shadow/Glow Colors (`getSphereShadowColor`)

#### Light

- all spheres: `#000`

#### Dark

- `relationships`: `#FF9696`
- `career`: `#96CAFF`
- `family`: `#C89CFF`
- `friends`: `#9B7AFF`
- `hobbies`: `#FFAA5A`

### Sphere Accent Colors (`getSphereAccentColor`)

#### Light

- `relationships`: `#D32F2F`
- `career`: `#1976D2`
- `family`: `#388E3C`
- `friends`: `#7B1FA2`
- `hobbies`: `#F57C00`

#### Dark

- `relationships`: `#E57373`
- `career`: `#64B5F6`
- `family`: `#81C784`
- `friends`: `#BA68C8`
- `hobbies`: `#FFB74D`

## Dynamic Sphere Gradient Logic in Dark Theme

Dark sphere backgrounds are generated with dynamic RGBA values in `getSphereGradientColors(...)`, where opacity changes based on `sunnyPercentage`:

- When `sunnyPercentage >= 50`: uses brighter "sunny" RGBA gradients.
- When `sunnyPercentage < 50`: uses deeper "cloudy" RGBA gradients.
- Opacity ramps are computed per sphere and per state, instead of static dark palette entries.

This means dark sphere gradients are style-defined formulas, not only fixed hex tokens.

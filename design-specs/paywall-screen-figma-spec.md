# Paywall Screen - Figma Design Specification

## Screen Overview
- **Screen Type**: Premium Subscription Paywall
- **Theme**: Dark Mode
- **Language**: Bulgarian
- **Device**: iPhone (with Dynamic Island)

---

## Layout Structure

### 1. Status Bar
- **Height**: 44px (safe area)
- **Background**: Transparent
- **Content**:
  - Left: Time "23:10"
  - Center: Dynamic Island cutout
  - Right: Wi-Fi signal + Battery icon (100%)

### 2. Navigation Header
- **Height**: ~88px (including safe area)
- **Padding Top**: 50px (safe area)
- **Padding Horizontal**: 16px
- **Padding Bottom**: 8px
- **Background**: Transparent

#### Back Button (Left)
- **Size**: 48px × 48px
- **Icon**: Left arrow (Material Icons)
- **Icon Size**: 24px
- **Color**: White/Text color

#### Title Section (Center)
- **Layout**: Horizontal flex, centered
- **Gap**: 8px
- **Star Icon**: 
  - Size: 20px
  - Color: Light Blue (#4A9EFF or similar)
- **Text**: "Отключи Премиум"
  - Font Size: Large (18-20px)
  - Font Weight: Bold
  - Color: White/Text color

#### Spacer (Right)
- **Width**: 48px (matches back button)

---

### 3. Main Content Area

#### Primary Title
- **Text**: "Отключи Премиум"
- **Font Size**: 32px
- **Font Weight**: Bold
- **Text Align**: Center
- **Color**: White
- **Margin Bottom**: 8px

#### Subtitle
- **Text**: "Получи неограничен достъп до всички функции"
- **Font Size**: 16px
- **Text Align**: Center
- **Color**: White with 70% opacity
- **Margin Bottom**: 24px

#### Features List
- **Container**: Vertical stack
- **Gap**: 16px between items
- **Margin Bottom**: 24px

**Feature Item Structure:**
- **Layout**: Horizontal flex
- **Gap**: 12px
- **Checkmark Icon Container**:
  - Size: 24px × 24px
  - Border Radius: 12px (circular)
  - Background: Light Blue (#4A9EFF or similar)
  - Icon: Checkmark (white, 16px)
- **Feature Text**:
  - Font Size: 16px (Medium)
  - Color: White
  - Line Height: ~24px

**Features:**
1. "Неограничени партньори, работни места, приятели членове на семейството и хобита"
2. "Достъп до премиум анализи и статистики"
3. "Приоритетна поддръжка и актуализации"

---

### 4. Subscription Packages

#### Container
- **Layout**: Vertical stack
- **Gap**: 16px between packages
- **Margin Bottom**: 24px

#### Package Card (Annual - Selected)
- **Width**: Full width (minus padding)
- **Border Radius**: 16px
- **Border**: 2px solid Light Blue (#4A9EFF)
- **Background**: 
  - Dark: rgba(255, 255, 255, 0.05)
  - Light: rgba(0, 0, 0, 0.05)
- **Padding**: 20px
- **Layout**: Horizontal flex, space-between

**Left Section:**
- **Title**: "Годишно"
  - Font Size: 20px
  - Font Weight: Bold
  - Color: White
- **Price**: "79,99 US$"
  - Font Size: 24px
  - Font Weight: Bold
  - Color: White
- **Period**: "на година"
  - Font Size: 14px
  - Color: White with 70% opacity
  - Margin Top: 4px

**Right Section:**
- **Savings Badge**:
  - Background: Light Blue (#4A9EFF)
  - Padding: 8px horizontal, 4px vertical
  - Border Radius: 8px
  - Text: "Спестете 33%"
    - Font Size: 12px
    - Font Weight: 600
    - Color: White
  - Margin Top: 8px
  - Align Self: Flex-start

#### Package Card (Monthly - Unselected)
- **Same structure as Annual**
- **Border**: None (or transparent)
- **No savings badge**

**Content:**
- **Title**: "Месечно"
- **Price**: "9,99 US$"
- **Period**: "на месец"

---

### 5. Action Buttons

#### RevenueCat Paywall Button (Top)
- **Width**: Full width
- **Height**: ~56px
- **Border Radius**: 12px
- **Background**: 
  - Dark: rgba(255, 255, 255, 0.1)
  - Light: rgba(0, 0, 0, 0.1)
- **Border**: 2px solid Light Blue (#4A9EFF)
- **Padding**: 16px
- **Margin Top**: 24px
- **Text**: "View Subscription Options" (or translation)
  - Font Size: 18px
  - Font Weight: Bold
  - Color: White
- **Alignment**: Center

#### Subscribe Button (Primary)
- **Width**: Full width
- **Height**: ~56px
- **Border Radius**: 12px
- **Background**: Light Blue (#4A9EFF)
- **Padding**: 16px
- **Margin Top**: 16px
- **Text**: "Абонирай се"
  - Font Size: 18px
  - Font Weight: Bold
  - Color: White
- **Alignment**: Center

#### Restore Purchases Button
- **Padding**: 16px
- **Text**: "Restore Purchases" (or translation)
  - Font Size: 14px
  - Color: Light Blue (#4A9EFF)
- **Alignment**: Center
- **Margin Top**: 8px

#### Close Button
- **Padding**: 16px
- **Text**: "Close" (or translation)
  - Font Size: 14px
  - Color: Light Blue (#4A9EFF)
- **Alignment**: Center

---

## Color Palette

### Primary Colors
- **Light Blue (Primary)**: #4A9EFF (or #007AFF for iOS standard)
- **White**: #FFFFFF
- **Text Primary**: #FFFFFF
- **Text Secondary**: rgba(255, 255, 255, 0.7)

### Background Colors
- **Main Background**: Dark gradient
  - Start: #1A2332
  - End: #1A2332
- **Card Background (Dark)**: rgba(255, 255, 255, 0.05)
- **Card Background (Light)**: rgba(0, 0, 0, 0.05)
- **Button Secondary Background**: rgba(255, 255, 255, 0.1)

### Border Colors
- **Selected Border**: Light Blue (#4A9EFF)
- **Unselected Border**: Transparent

---

## Typography

### Font Families
- **Primary**: System font (SF Pro on iOS, Roboto on Android)
- **Fallback**: San-serif

### Font Sizes
- **Extra Large (Title)**: 32px
- **Large (Header)**: 18-20px
- **Medium (Body)**: 16px
- **Small (Secondary)**: 14px
- **Extra Small (Badge)**: 12px

### Font Weights
- **Bold**: 700
- **Semi-Bold**: 600
- **Regular**: 400

---

## Spacing System

- **Base Unit**: 4px
- **Small Gap**: 8px
- **Medium Gap**: 12px
- **Large Gap**: 16px
- **Extra Large Gap**: 24px
- **Screen Padding**: 16px
- **Card Padding**: 20px
- **Button Padding**: 16px

---

## Component Specifications

### Checkmark Icon
- **Size**: 16px × 16px
- **Container**: 24px × 24px circle
- **Color**: White
- **Background**: Light Blue (#4A9EFF)

### Star Icon (Header)
- **Size**: 20px × 20px
- **Color**: Light Blue (#4A9EFF)

### Arrow Icon (Back Button)
- **Size**: 24px × 24px
- **Color**: White/Text color

---

## Responsive Behavior

### Tablet/Large Devices
- **Max Content Width**: ~600px (centered)
- **Scale factors**: Apply font scale multiplier (1.3x for tablets)

### Small Devices
- **Min Padding**: 12px
- **Font Scale**: 1.0x

---

## Interactive States

### Button States
- **Default**: Full opacity
- **Pressed**: 0.7 opacity
- **Disabled**: 0.5 opacity

### Package Card States
- **Default**: No border
- **Selected**: 2px blue border
- **Pressed**: Slight scale (0.98)

---

## Notes for Figma Implementation

1. **Use Auto Layout** for all containers to ensure proper spacing
2. **Create Component Variants** for:
   - Package cards (selected/unselected)
   - Buttons (primary/secondary/disabled)
   - Feature items
3. **Use Constraints** for responsive behavior
4. **Create Color Styles** for all colors mentioned above
5. **Create Text Styles** for all typography variants
6. **Use Effects** for shadows/elevation where appropriate
7. **Set up Dark Mode** variants if needed

---

## Export Specifications

- **Format**: PNG/PDF for design handoff
- **Resolution**: 2x and 3x for assets
- **Frames**: Create separate frames for different screen sizes (iPhone SE, iPhone 14 Pro, iPad)


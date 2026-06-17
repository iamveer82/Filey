---
version: alpha
name: Filely Fintech
description: Modern fintech dashboard with deep navy surfaces, bright cobalt blue accents, and clean white content cards.
colors:
  primary: "#0F53DC"
  primaryDark: "#0A3DA6"
  background: "#000E28"
  backgroundSecondary: "#001029"
  surface: "#0F1B3D"
  surfaceElevated: "#16244A"
  card: "#FFFFFF"
  cardDark: "#141B2D"
  text: "#FFFFFF"
  textDark: "#0B1324"
  textSecondary: "#8B95AD"
  textMuted: "#5C6780"
  border: "#1A2540"
  borderCard: "#E8EBF0"
  positive: "#16A34A"
  negative: "#EF4444"
  warning: "#F59E0B"
typography:
  hero:
    fontFamily: System
    fontSize: 34
    fontWeight: "800"
    letterSpacing: "-0.03em"
    lineHeight: 1.2
  sectionTitle:
    fontFamily: System
    fontSize: 20
    fontWeight: "700"
    letterSpacing: "-0.01em"
    lineHeight: 1.3
  cardTitle:
    fontFamily: System
    fontSize: 17
    fontWeight: "600"
    lineHeight: 1.3
  body:
    fontFamily: System
    fontSize: 15
    fontWeight: "500"
    lineHeight: 1.5
  bodySmall:
    fontFamily: System
    fontSize: 13
    fontWeight: "500"
    lineHeight: 1.4
  caption:
    fontFamily: System
    fontSize: 12
    fontWeight: "500"
    lineHeight: 1.3
  label:
    fontFamily: System
    fontSize: 11
    fontWeight: "700"
    letterSpacing: "0.08em"
    lineHeight: 1.2
  valueXL:
    fontFamily: System
    fontSize: 36
    fontWeight: "800"
    letterSpacing: "-0.03em"
    lineHeight: 1.2
rounded:
  sm: 8px
  md: 12px
  lg: 16px
  xl: 20px
  xxl: 24px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 20px
  xxl: 24px
  xxxl: 32px
components:
  card-primary:
    backgroundColor: "{colors.card}"
    textColor: "{colors.textDark}"
    rounded: "{rounded.xl}"
  card-metric:
    backgroundColor: "{colors.surfaceElevated}"
    textColor: "{colors.text}"
    rounded: "{rounded.xl}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.full}"
    padding: 14px
  button-primary-hover:
    backgroundColor: "{colors.primaryDark}"
    textColor: "#FFFFFF"
  search-bar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.textSecondary}"
    rounded: "{rounded.md}"
  tab-inactive:
    textColor: "{colors.textMuted}"
  tab-active:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.full}"
---

## Overview

Filely Fintech is a modern mobile banking/tool dashboard. Deep navy anchors the brand — confident, premium, technical. Cobalt blue (#0F53DC) drives every interaction: CTAs, active states, chart accents, notifications. White content cards on the lower screens create a clean, airy reading surface that contrasts sharply against the dark background. The overall feel is sharp, high-contrast, and professional.

The dashboard layout follows: Header (greeting + avatar) → Metric summary cards (navy cards: Balance, Income, Spending) → Tab row (pill tabs: Dashboard, Cards, Analytics) → Search bar → Content (white cards with transaction rows, bills, charts).

## Colors

- **Primary (#0F53DC):** Cobalt blue — the single interaction color. Buttons, active tabs, metric highlights, chart lines, notification dots.
- **PrimaryDark (#0A3DA6):** Pressed/hover state for primary. Used on button press states and dark mode hover.
- **Background (#000E28):** Deep navy base. Anchors all screens in a premium dark mode.
- **BackgroundSecondary (#001029):** Slightly lighter navy for cards and elevated surfaces.
- **Surface (#0F1B3D):** Card background on dark sections. Search bar, metric card backgrounds.
- **SurfaceElevated (#16244A):** Brighter navy for featured/elevated metric cards.
- **Card (#FFFFFF):** Pure white for content cards, transaction rows, and list items.
- **CardDark (#141B2D):** Dark card variant for sections within the navy background.
- **Text (#FFFFFF):** White text on dark backgrounds. High contrast, readable.
- **TextDark (#0B1324):** Near-black for text on white cards and light surfaces.
- **TextSecondary (#8B95AD):** Muted white-blue for secondary text, subtitles, search placeholders.
- **TextMuted (#5C6780):** Dim text for tertiary info, inactive tabs.
- **Border (#1A2540):** Subtle border for dark surface separators.
- **Positive (#16A34A):** Green for income, up arrows, success states.
- **Negative (#EF4444):** Red for expenses, down arrows, error states.
- **Warning (#F59E0B):** Amber for alerts, pending states, attention items.

## Typography

System font throughout with bold, confident weights. Numbers (metrics, amounts) use weight 800 at large sizes for impact. Headings use tight letter-spacing. Labels use uppercase tracking (0.08em).

## Layout & Spacing

Consistent 4px grid. Cards use 20px border radius. Content cards (white) sit against the dark background with visible padding gaps. The search bar sits as a content connector between the header/metric area and the transaction list.

## Components

- **button-primary:** Pill-shaped cobalt blue CTA. Full-width, 14px padding, shadowed. Pressed → primaryDark.
- **card-primary:** White card with textDark text. Used for transaction rows, settings, list items. 20px rounded.
- **card-metric:** Elevated navy card for balance/income/spending widgets. White text.
- **search-bar:** Dark surface input with textSecondary text. 12px rounded. Positioned as a visual bridge between header and scrollable content.
- **tab-active / tab-inactive:** Pill-shaped tab row. Active fills with primary blue + white text. Inactive shows muted text only (no bg).

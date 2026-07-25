---
name: BiteSize
colors:
  surface: '#FAFAFA'
  surface-dim: '#d5dcd1'
  surface-bright: '#f4fcf0'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff6ea'
  surface-container: '#FFFFFF'
  surface-container-high: '#e3eadf'
  surface-container-highest: '#dde5d9'
  on-surface: '#171d16'
  on-surface-variant: '#3e4a3d'
  inverse-surface: '#2b322b'
  inverse-on-surface: '#ecf3e7'
  outline: '#E5E7EB'
  outline-variant: '#bdcaba'
  surface-tint: '#006e2d'
  primary: '#006b2c'
  on-primary: '#ffffff'
  primary-container: '#00873a'
  on-primary-container: '#f7fff2'
  inverse-primary: '#62df7d'
  secondary: '#9d4300'
  on-secondary: '#ffffff'
  secondary-container: '#fd761a'
  on-secondary-container: '#5c2400'
  tertiary: '#a72d51'
  on-tertiary: '#ffffff'
  tertiary-container: '#c74668'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#7ffc97'
  primary-fixed-dim: '#62df7d'
  on-primary-fixed: '#002109'
  on-primary-fixed-variant: '#005320'
  secondary-fixed: '#ffdbca'
  secondary-fixed-dim: '#ffb690'
  on-secondary-fixed: '#341100'
  on-secondary-fixed-variant: '#783200'
  tertiary-fixed: '#ffd9de'
  tertiary-fixed-dim: '#ffb2bf'
  on-tertiary-fixed: '#3f0016'
  on-tertiary-fixed-variant: '#8a143c'
  background: '#f4fcf0'
  on-background: '#171d16'
  surface-variant: '#dde5d9'
  text-primary: '#0F172A'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  title-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  margin-mobile: 16px
  margin-desktop: 24px
  gutter: 16px
  sidebar-width: 30%
  canvas-width: 70%
---

# 🎨 DESIGN.md — BiteSize Web Application Architecture & Design System

## 1. Design Overview & Vision
**BiteSize** is an ingredient-first recipe finder engineered to reduce household food waste. The design philosophy centers on **speed, clarity, and visual appetite**. Built around **Google Stitch** (Material 3 layout principles and component architecture), the interface minimizes cognitive overload by guiding users through a seamless 3-step pipeline: **Input Ingredients ➔ Discover Recipes ➔ Cook**.

---

## 2. Visual Identity & Brand System

### Color Palette (Stitch Material 3 Tokens)
| Token Name | Hex Code | Visual Preview | Usage |
| :--- | :--- | :--- | :--- |
| `sys.color.primary` | `#16A34A` | 🟢 Emerald Green | Primary buttons, active ingredient chips, search triggers |
| `sys.color.on-primary` | `#FFFFFF` | ⚪ White | Text on primary containers |
| `sys.color.secondary` | `#F97316` | 🟠 Warm Amber | Highlight tags, cooking time badges, dietary pills |
| `sys.color.surface` | `#FAFAFA` | 🔘 Off-White | Main app background canvas |
| `sys.color.surface-container`| `#FFFFFF` | ⚪ Pure White | Recipe cards, modal windows, dialog boxes |
| `sys.color.outline` | `#E5E7EB` | 🩶 Soft Gray | Card borders, input field outlines, divider rules |
| `sys.color.text-primary` | `#0F172A` | ⬛ Deep Slate | Headlines, body copy, card titles |

### Typography Scale
* **Primary Font:** Inter / Roboto (Google Web Fonts)
* **Headline Large (`display-sm`):** Bold, 32px — Landing page hero title
* **Title Medium (`title-md`):** Semi-Bold, 20px — Recipe card titles, modal headings
* **Body Medium (`body-md`):** Regular, 14px — Preparation instructions, ingredient lists
* **Label Small (`label-sm`):** Medium, 12px — Badges (Calories, Prep Time, API tags)

---

## 3. Core Information Architecture & Layouts
The application utilizes a **Single-Page Application (SPA) dashboard layout** split into three main regions:

### Desktop Layout (> 1024px)
* Permanent sidebar (30% width) for Ingredient Picker.
* Interactive Canvas (70% width) for Recipe Grid / Search Results.

---

## 4. Component Library Spec (Google Stitch Standard)

### A. Top Navigation Bar (`stitch-navbar`)
* **Position:** Fixed top, elevated blur (`backdrop-blur-md`).
* **Elements:** Brand Logo (left), Quick Links (Center: *Home*, *Saved Recipes*), User Auth Profile Avatar (Right).

### B. Ingredient Chip Input (`stitch-chip-group`)
* **Interactive State:**
    * *Default:* Soft gray border, white fill.
    * *Selected:* `sys.color.primary` fill, white text with a trailing `x` close icon.

### C. Recipe Result Card (`stitch-card-elevated`)
* **Aspect Ratio:** 16:9 thumbnail cover image container.
* **Content Stack:**
    * Badge Overlay: Prep time tag (e.g., `⏱️ 20 mins`) on the top-right image corner.
    * Body: Recipe Title (truncated at 2 lines max).
    * Footer: Ingredient Match Indicator (e.g., `Used: 3 | Missing: 1`) + Heart Icon for saving to DB.
* **Hover Effect:** Subtle upward translation (`transform: translateY(-4px)`) with shadow elevation increase (`shadow-lg`).

### D. Detailed Recipe Modal (`stitch-dialog-full`)
* **Trigger:** Click on any Recipe Card.
* **Structure:**
    1. **Header Hero:** High-res image banner with calorie count & serving size chips.
    2. **Split Body:**
        * Left Column: Checklist of required ingredients (highlights items you already have vs. items you need to buy).
        * Right Column: Step-by-step cooking directions numbered systematically.

---

## 5. UI States & User Experience Guidelines
| State | Visual Treatment | Trigger / Logic |
| :--- | :--- | :--- |
| **Initial / Empty** | Hero banner asking "What's in your fridge?" with a prompt pointing to the ingredient panel. | No ingredients selected in state array. |
| **Loading / Skeleton** | Animated gray shimmer blocks matching recipe card dimensions (`stitch-skeleton-card`). | Active HTTP request sent to Spoonacular API. |
| **Error / Zero Match** | Friendly empty-state illustration with text: *"No matching recipes found with those exact items. Try removing 1 ingredient!"* | Spoonacular API returns an empty array `[]`. |

---

## 6. Accessibility & Responsive Breakpoints
* **Color Contrast:** All text elements adhere strictly to **WCAG 2.1 AA Standards** (minimum contrast ratio 4.5:1).
* **Keyboard Navigation:** Full `Tab` focus support across chips, input fields, recipe cards, and buttons.
* **Responsive Grid:**
    * **Mobile (< 640px):** Single column stack. Ingredient selector converts into a collapsible bottom drawer.
    * **Tablet (640px - 1024px):** 2-column recipe card grid.
    * **Desktop (> 1024px):** Permanent sidebar (30% width) + 3-column recipe result grid (70% width).

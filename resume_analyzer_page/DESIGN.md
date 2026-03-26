# Design System Strategy: The Kinetic Scholar

## 1. Overview & Creative North Star
The **Creative North Star** for this design system is **"The Kinetic Scholar."** 

This system moves beyond the cold, static nature of traditional AI tools to create a living, editorial-grade experience. It treats the resume—not as a PDF—but as a narrative. We break the "template" look through **intentional asymmetry**, high-contrast typography scales inspired by premium agency portfolios (andrewreff.com), and 3D-inspired depth. The UI should feel like a series of physical layers of frosted glass and premium paper, reacting fluidly to the user’s cursor, creating a sense of intelligent "movement" beneath the surface.

## 2. Colors & Surface Philosophy
The palette is rooted in absolute contrast: deep, infinite blacks and clinical, crisp whites, bridged by sophisticated indigo glows that signify AI activity.

### The "No-Line" Rule
**Explicit Instruction:** Use of 1px solid borders for sectioning is strictly prohibited. 
Boundaries must be defined solely through:
- **Tonal Transitions:** Moving from `surface` (`#131313`) to `surface_container_low` (`#1b1b1b`).
- **Negative Space:** Utilizing the larger steps in our Spacing Scale (e.g., `16` or `20`) to create "invisible" containers.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack.
- **Base Layer:** `surface` (#131313) or `background`.
- **Primary Containers:** `surface_container` (#1f1f1f).
- **Interactive/Floating Elements:** `surface_container_highest` (#353535).
When nesting, always move "up" the tier (Lower to Higher) to indicate importance. An inner card should always be brighter/higher than its parent container to simulate a light source from above.

### Glass & Gradient Signature
- **Backdrop Blur:** Use 12px-20px blurs on `surface_container` elements with 60% opacity to create the "frosted glass" effect.
- **The AI Glow:** Use `primary_container` (#4F46E5) as a soft, radial background blur (300px width, 10% opacity) behind key AI analysis results to give the UI "soul."

## 3. Typography
Our typography is an editorial dialogue between the bold authority of **Manrope** and the technical precision of **Inter**.

| Level | Font | Scale | Tracking | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Display** | Manrope Bold | 3.5rem | -0.04em | Hero storytelling, impact statements. |
| **Headline** | Manrope Bold | 2rem | -0.02em | Section headers, major AI insights. |
| **Title** | Inter Medium | 1.125rem | 0 | Card titles, modal headers. |
| **Body** | Inter Regular | 0.875rem | +0.01em | Analysis text, resume descriptions. |
| **Label** | Inter SemiBold | 0.75rem | +0.05em | Micro-copy, metadata, buttons. |

**Hierarchy Note:** Always pair a `display-lg` headline with a `body-md` description using a minimum of `spacing-8` to emphasize the "High-End Editorial" contrast.

## 4. Elevation & Depth
Depth in this system is organic, not structural. 

- **Tonal Layering:** Place a `surface_container_lowest` (#0e0e0e) card on a `surface_container_low` (#1b1b1b) section. This creates a soft, natural "recessed" look without the need for shadows.
- **Ambient Shadows:** For floating modals, use `on_surface` color as a shadow tint.
    - **Token:** `box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 20px rgba(79, 70, 229, 0.05);` (Integrating the indigo glow into the shadow).
- **The Ghost Border:** If a boundary is required for accessibility, use the `outline_variant` (#464555) at **15% opacity**. Never use 100% opaque borders.

## 5. Components

### Buttons
- **Primary:** `primary_container` (#4F46E5) background with `on_primary` text. No border. `12px` (xl) rounded corners. Use a subtle inner-glow (1px white at 10% opacity) on the top edge.
- **Secondary:** Glassmorphic. `surface_container_high` at 40% opacity with a `20px` backdrop blur.

### Input Fields
- **Styling:** `surface_container_lowest` background. 
- **Focus State:** Transition the "Ghost Border" from 15% to 50% opacity and add a subtle `primary` shadow glow. 
- **Typography:** Labels use `label-md` positioned 4px above the field.

### Analysis Cards
- **Construction:** Use `surface_container` with no border. 
- **Interaction:** On hover, the card should lift using a `0.5rem` translation (Y-axis) and the indigo glow should intensify.
- **Separation:** Use `spacing-6` padding; never use horizontal divider lines.

### Progress Indicators (AI Scanning)
- Use a soft, pulsing gradient from `primary` (#c3c0ff) to `primary_container` (#4F46E5). The motion should be ease-in-out to mimic "thinking."

## 6. Do's and Don'ts

### Do
- **Do** use asymmetrical layouts (e.g., a 60/40 split where the 40% side is empty or contains a single floating element).
- **Do** use "tight" tracking on all Manrope headlines to give it a custom, high-fashion feel.
- **Do** use vertical white space as a structural element. If in doubt, add more space.

### Don't
- **Don't** use `#000000` for text; use `on_surface` (#e2e2e2) for readability against the dark backgrounds.
- **Don't** use standard "Drop Shadows." If a shadow doesn't look like ambient light, it's too heavy.
- **Don't** use more than two levels of nested containers. If you need a third, use a background color shift instead of a new card.
- **Don't** use sharp 90-degree corners. Everything must feel approachable through the `8px-12px` roundedness scale.
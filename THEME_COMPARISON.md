## Executive Summary

- Compares the existing ADK Angular Material SCSS-based theme against the Material 3 token bundle provided in `/Users/ikaplan/Downloads/css`, detailing similarities, structural differences, and implementation gaps.
- Highlights risks of adopting the new token set without additional work, particularly around Angular Material integration and application-specific CSS variables.
- Outlines a migration approach for porting Angular Material theming onto the Material 3 token set and lists validation steps to keep visual regressions under control.

# Theme System Comparison

## Similarities

- Both systems rely on Material Design primitives, surfacing semantic color tokens at the root level for consumption (`src/styles.scss:44`, `/Users/ikaplan/Downloads/css/tokens.css:1`).
- Google Sans serves as the typography baseline across both approaches, either enforced globally (`src/styles.scss:30`) or via typography token declarations (`/Users/ikaplan/Downloads/css/tokens.css:274`).
- Each setup encourages components to consume shared CSS variables or utility classes instead of hard-coding values.
- Light and dark definitions exist in both ecosystems, although only the new bundle actually switches between them (`_theme-colors.scss:17`, `/Users/ikaplan/Downloads/css/tokens.css:172`).

## Architectural Differences

- Current theming compiles SCSS with Angular Material mixins, injecting palette data during build (`src/styles.scss:22`), while the replacement is plain CSS that relies on runtime `@import` directives (`/Users/ikaplan/Downloads/css/theme.css:1`).
- Existing styles plug directly into Angular Material’s theming API (`mat.theme`, `mat.dialog-overrides`, `mat.form-field-overrides`) so Material components pick up the palette (`src/styles.scss:22`, `src/styles.scss:70`, `src/styles.scss:286`); the new bundle lacks any Angular Material integration.
- ADK defines an extensive catalog of domain-specific CSS custom properties that downstream components expect (`src/styles.scss:100`–`src/styles.scss:283`); the new system only exposes generic Material tokens and utility classes, leaving those hooks undefined.
- Global defaults such as body layout, markdown spacing, and caret colors are set explicitly today (`src/styles.scss:34`, `src/styles.scss:39`, `src/styles.scss:312`); the replacement bundle does not provide equivalent resets.
- Angular currently ships a single dark scheme enforced via `html { color-scheme: dark; }` (`src/styles.scss:22`); the new stack toggles light/dark by importing different files behind `prefers-color-scheme` media queries (`/Users/ikaplan/Downloads/css/theme.light.css:1`, `/Users/ikaplan/Downloads/css/theme.dark.css:1`).
- The existing solution is bundled once with the Angular app build; moving to cascading CSS imports requires extra tooling so `theme.css` and dependencies are emitted properly by the Angular CLI.

## Implementation Gaps in the New Tokens

- Typography helpers reference variables that do not exist (`--md-sys-typescale-display-large-tracking`, `--md-sys-typescale-display-large-height`, `--md-sys-typescale-display-large-text-transform`), so those declarations would resolve to `unset` (`/Users/ikaplan/Downloads/css/typography.module.css:6`, `:7`, `:8` versus available tokens at `/Users/ikaplan/Downloads/css/tokens.css:278`–`:279`).
- Font-weight tokens include `px` units (`/Users/ikaplan/Downloads/css/tokens.css:276`), which browsers ignore, causing fallback weights across typography utilities.
- Color utility classes assign identical colors to backgrounds and text (e.g., `.primary-container-text` uses `var(--md-sys-color-primary-container)` at `/Users/ikaplan/Downloads/css/colors.module.css:16`) instead of the matching “on” colors, eliminating contrast.
- There are no utilities or custom properties for the numerous application-specific needs (dialogs, chat, trace views, etc.), so those areas would lose their styling context (`src/styles.scss:100`–`src/styles.scss:282`).
- File naming suggests CSS Modules (`*.module.css`), but Angular’s build pipeline does not treat them specially; importing them may expose unexpected global class names or fail if SCSS tooling is expected.
- Nothing in the new bundle maps Material tokens onto Angular Material’s CSS custom properties (`--mat-*`, `--mdc-*`), so Material components would continue using the old palette even if new color values exist.

## Coverage Gaps Compared to Current Theme

- Dialog typography is currently controlled through custom properties and mixins (`src/styles.scss:70`, `.mat-mdc-dialog-container` rules at `src/styles.scss:85`); the replacement lacks equivalent hooks.
- Form-field overrides supply accessible label, caret, and state colors (`src/styles.scss:286`); the new tokens do not provide a way to reproduce these overrides out of the box.
- Application-specific accent colors (eval states, trace lines, toolbars, etc.) are carefully curated today (`src/styles.scss:166`, `src/styles.scss:233`, `src/styles.scss:261`); the new system would need an additional mapping layer or those contexts become unstyled.
- Density, border radii, and other component tweaks (e.g., `.mat-mdc-text-field-wrapper` radius at `src/styles.scss:308`) have no analog in the proposed bundle and would need to be recreated manually.

## Recommended Next Steps

1. Decide whether to port Angular Material theming onto the Material 3 token set or retain the current SCSS pipeline while refreshing color values.
2. If adopting the new tokens, schedule a follow-up pass to fix missing variables and recreate every application-specific custom property before swapping the theme.

## Porting Angular Material Theming onto Material 3 Tokens

### Porting Overview

- Extract palette values from `tokens.css` into Sass maps structured for Angular Material, reusing the `map.merge` strategy already in `_theme-colors.scss:17` to feed `mat.define-light-theme` and `mat.define-dark-theme`.
- Convert the CSS custom properties coming from `/Users/ikaplan/Downloads/css/tokens.css` into Sass variables or a generated Sass partial so they can drive `mat.define-palette` during build instead of relying on runtime assignments.
- Build separate light and dark palette maps from the `--md-sys-color-*-light` and `--md-sys-color-*-dark` values, then wrap them in `mat.define-theme` calls and apply via `@include mat.theme`, mirroring the pattern in `src/styles.scss:22`.

### Token to Palette Mapping

- Angular Material palettes expect tone keys (0–100); the token sheet already exposes these (`--md-ref-palette-primary*`), so strip the prefixes and feed the tone numbers directly into the Sass map definition.
- After running the theme mixins, emit `:root` blocks that map derived roles (e.g., `--md-sys-color-surface`) back to CSS custom properties so the rest of the application can continue consuming variables (`src/styles.scss:44`).
- Clean up typography tokens first—remove the `px` unit from font weight and add missing tracking/line-height values—before generating a `mat.define-typography-config` map; otherwise Angular Material will fall back to defaults.

### Dynamic Scheme Switching

- Use Angular Material’s multi-theme workflow: define light and dark Sass themes, then scope each with `@media (prefers-color-scheme: light|dark)` when calling `@include mat.all-component-themes`.
- Mirror the behavior of `theme.light.css`/`theme.dark.css` by emitting `:root` blocks in those media queries that map `--md-sys-color-primary` and related tokens to values from `mat.get-color-config`.
- Reapply the application-specific CSS variables (chat, trace, eval) using tones from the new palettes so existing component SCSS continues to resolve (e.g., map `--chat-toolbar-icon-color` to neutral roles instead of the hard-coded `#c4c7c5` in `src/styles.scss:187`).

### Angular Material Integration

- Replace direct overrides like `@include mat.dialog-overrides` (`src/styles.scss:70`) with MD3-aware equivalents such as `mat.define-theme` plus `mat.dialog-theme`, ensuring each override still generates the necessary CSS custom properties.
- Update form-field overrides (`src/styles.scss:286`) to reference MD3 roles (`on-surface-variant`, `primary`, etc.) rather than fixed hex values so focus, hover, and disabled states stay consistent with the new palette.
- Audit component-level styling for legacy `--mat-sys-*` names and migrate them to MD3-style tokens (`--md-sys-color-*`) to maintain semantic alignment with the imported token set.

### Verification and Tooling

- Leverage Angular Material schematics or reference apps to validate that the MD3 token mappings align with component expectations, especially for surface/container and inverse roles.
- Capture visual regression snapshots or Storybook stories for dialogs, form fields, chat panels, and trace views before and after the port to catch styling regressions introduced by the new tokens.
- Add a lint or build check that ensures all required CSS custom properties are generated so omissions (like the missing typography tracking variables) fail fast rather than silently degrading styling.

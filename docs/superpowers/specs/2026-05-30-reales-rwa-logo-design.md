# Reales RWA Logo Design Spec

**Date**: 2026-05-30
**Project**: Reales RWA — Dual-Chain RWA Tokenization Compliance Analysis Platform

## Concept & Vision

A blockchain-native logo that conveys compliance and security. The design merges the structural language of blockchain (hexagons) with the assurance of regulatory approval (checkmark). The overall feel is modern, trustworthy, and tech-forward — a platform that brings institutional-grade compliance to decentralized asset tokenization.

## Design Language

### Color Palette

- **Primary Gradient**: Deep Purple → Cyan
  - Start: `#6B21A8` (purple-700)
  - End: `#06B6D4` (cyan-500)
- **Checkmark Accent**: `#10B981` (emerald-500) to `#06B6D4` (cyan-500)
- **Text Primary**: `#1F2937` (gray-800)
- **Text Secondary**: `#6B7280` (gray-500)
- **Background (light)**: `#FFFFFF`
- **Background (dark)**: `#0F172A` (slate-900)

### Typography

- **Brand Name**: `Reales` — weight 600-700, clean sans-serif (Inter/system)
- **Sub Brand**: `RWA` — weight 500, letter-spacing 0.15em, uppercase

### Visual Assets

- **Mark**: Hexagon with centered checkmark/scan line motif
- **No external images** — pure SVG, code-generated

## Layout & Structure

### Horizontal Lockup (default)
```
[HEXAGON MARK]  Reales   RWA
                 ↑      ↑
              larger   smaller, colored
```

- Mark and text vertically center-aligned
- Consistent 16px gap between mark and text

### Standalone Mark
- Hexagon + checkmark can be used alone at small sizes (favicon, avatar)

## Component Specifications

### Hexagon Mark

- **Shape**: Regular hexagon, stroke-only or filled with gradient
- **Size ratio**: 32×32 (small), 48×48 (medium), 64×64 (large)
- **Stroke width**: 2px at 32px, 2.5px at 48px+, 3px at 64px+
- **Fill**: Transparent or subtle gradient fill (10% opacity)
- **Stroke**: Gradient from purple to cyan

### Checkmark / Scan Line

- Horizontal scan line from left to right across hexagon center
- Checkmark at the right side of the line, pointing upward-right
- Line and checkmark use gradient (emerald → cyan)
- The scan line represents "verification in progress" or "compliant"

### Wordmark

- `Reales`: 24px / 32px (small/large), weight 600, gray-800
- `RWA`: 14px / 18px, weight 500, letter-spacing 0.15em, gradient text (purple → cyan)

## Technical Approach

- **Format**: SVG (scalable vector)
- **Delivery**: React component with inline SVG + plain SVG file
- **Responsive**: ViewBox-based, scales to any size
- **No fonts required**: Uses system sans-serif via `font-family`
- **CSS**: Tailwind-compatible classes for easy integration

## File Deliverables

1. `frontend/components/logo/Logo.tsx` — React component
2. `frontend/components/logo/LogoMark.tsx` — Mark-only variant
3. `frontend/public/logo.svg` — Standalone SVG file
4. `frontend/public/logo-mark.svg` — Mark-only SVG file
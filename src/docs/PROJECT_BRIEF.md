# ABLE – Planning Calculator

## Purpose
ABLE is a mobile-first, highly accessible web-based planning calculator for ABLE (529A) savings plans, licensed to states for their programs.

## Core Goals
- Mobile-first web app (no native app initially) that works well on iOS/Android phones, iPads/tablets, and desktop OSes
- WCAG 2.2 AA accessibility target (keyboard, screen readers, reduced motion, high contrast, zoom)
- Multi-beneficiary planning with beneficiary-level and family-level reporting
- Monthly amortization schedule, collapsible to annual
- Scenario-based planning: users can start with contributions-only, then add/edit withdrawal assumptions later and see impacts
- Backend integration for persistence (families/beneficiaries/scenarios/reports) and state-specific configuration (tax rules/disclosures)

## Key User Inputs (current direction)
Family-level:
- Tax filing status
- Income (taxable income unless otherwise specified)
- Time horizon

Beneficiary-level:
- Beneficiary name
- Starting balance (recommended)
- Contribution assumptions (amount/cadence; optional escalation)
- Withdrawal assumptions (optional): start year, cadence, amount; ability to add later and iterate

## Calculation Principles
- Monthly simulation engine as the single source of truth
- Annual view is an aggregation of monthly rows (not separate math)
- No day-level modeling; use monthly approximations for any SSI/timing warnings
- Keep calculation engine in pure TypeScript under src/core for reuse later (e.g., native app)

## Licensed-to-States Model
- Each deployment is state-branded and plan-specific (no cross-plan comparison in MVP)
- Tax benefit logic should be configurable per licensing state (some states offer deductions/credits; many do not)

## Non-Goals (for now)
- Native mobile apps (but design architecture to allow later)
- Cross-state plan shopping / parity modeling
- Day-level financial modeling

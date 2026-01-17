This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app). The current focus is a bilingual ABLE planner with a shared backend calculation engine and per-client UI.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

Recent accomplishments:

- Added a bilingual localization helper, client-specific configuration, and a state/client selector so each deployment can override strings and defaults (`src/lib/localization.ts`).
- Implemented `src/core/simulation.ts` as the monthly amortization engine plus the new ABLE vs. taxable summary components and inputs that drive the scenario preview (`src/app/page.tsx`).
- Wired federal/state tax tables, deduction/credit logic, and deduction tax effects into the amortization schedule so December rows show after-tax balances and the “Taxable earnings” column reflects the taxed baseline (`src/lib/federalTax.ts`, `src/lib/stateTax.ts`, `src/data/stateTaxRates.json`, `src/data/stateTaxDeductions.json`).

Current product decisions:

- Accessibility and multilingual support are required from the start (US-only, en-US and es-US).
- The UI is hosted by client websites with client-specific branding and disclosures.
- A single shared calculation engine runs server-side and serves multiple clients.
- `clientId` has a one-to-one relationship with plan state (e.g., IL client -> IL plan).
- Disclosures/tooltips are stored in a shared backend library with defaults, and can be overridden per client.
- Calculation logic lives in Next.js API routes (no direct Netlify Functions usage).
- UI copy is centralized in `src/data/copy/index.ts` for updateable text.

Key decisions from earlier work:

- The account owner and beneficiary are the same by definition; inputs and calculations are beneficiary-only.
- Work to ABLE inputs now collect beneficiary earned income (AGI removed) and use earned income for the additional contribution calculation.
- Work to ABLE contributions are blocked if regular + Work to ABLE contributions exceed federal limit + Work to ABLE allowance; a warning explains the combined cap.
- Federal Savers Credit card now appears before Work to ABLE for flow.
- Federal Savers Credit amount is calculated as `min(contribution, cap)` * credit rate (cap: $2,000 or $4,000 married joint), with beneficiary AGI still used to determine the credit rate bracket.
- Federal Savers Credit eligibility now requires tax liability plus: over 18 = Yes, full-time student = No, claimed as dependent = No.
- Federal Savers AGI default set to 20,000.

Backend and content notes:

- Calculation endpoint: `POST /api/calculate` (server-side).
- Disclosures endpoint: `GET /api/disclosures/[clientId]?locale=en-US|es-US`.
- Shared disclosures library: `src/data/disclosures/index.ts` with defaults and per-client overrides.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load the Geist font family.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Netlify

This project deploys to Netlify. Next.js API routes run as Netlify-managed functions without using Netlify-specific APIs. Follow the Next.js deployment guide for Netlify and configure the build to match this repo.

- [Next.js deployment on Netlify](https://docs.netlify.com/integrations/frameworks/next-js/overview/)
- [Netlify build configuration](https://docs.netlify.com/configure-builds/get-started/)

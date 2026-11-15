# Magic Optics

Arabic management and accounting system for an optical store. Live demo: [magic-optics.vercel.app](https://magic-optics.vercel.app)

## Features

- Customers and their eye prescriptions, with a printable view per prescription
- Orders from prescription to delivery, each with its own detail page
- Inventory and periodic stock counts
- Cash register and a daily log of the day's movements
- Reports with data export
- Scheduled jobs for routine tasks
- Login-protected dashboard with a right-to-left Arabic interface

## Stack

Next.js (App Router), React, TypeScript, Prisma, MySQL, Tailwind CSS, deployed on Vercel.

## Running locally

```bash
npm install
cp .env.example .env   # set DATABASE_URL
npm run db:push
npm run db:seed
npm run dev
```

Built by [Khaled Ahmed](https://khaledahmed.net) at [Barmagly](https://barmagly.tech).

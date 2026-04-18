# Expense Tracker

Next.js 16 application for shop operations: purchases, sales/POS, stock, due management, warranty tracking, customers, sellers, and admin master data.

## Stack

- Next.js App Router
- React 19
- MongoDB
- Tailwind CSS 4

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables in `.env`:

```env
MONGODB_URI=
ADMIN_EMAIL=
ADMIN_SESSION_SECRET=
ADMIN_PASSWORD_HASH=
```

`ADMIN_PASSWORD` can be used instead of `ADMIN_PASSWORD_HASH`, but the hashed form is preferable.

3. Start the development server:

```bash
npm run dev
```

4. Open `http://localhost:3000`.

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm run start
```

## Notes

- App pages and API routes are protected by admin session auth.
- Master data is stored in the `master_data` collection.
- Operational records use the `expense_tracker` MongoDB database.

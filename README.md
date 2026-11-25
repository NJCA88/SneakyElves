# SneakyElves

Wishlist + Secret Santa app at [sneakyelves.com](https://sneakyelves.com).

- `wishlist-api-node/`: API server (Express + Prisma), runs on Google Cloud Run
- `wishlist-client/`: website (React + Vite), hosted on Firebase Hosting
- Database: Neon Postgres. Production uses the `public` schema; local development uses the `dev` schema in the same database.

## Local development

Requires Node.js 20+.

**One-time setup**

1. Create `wishlist-api-node/.env` from the template:
   ```
   cp wishlist-api-node/.env.example wishlist-api-node/.env
   ```
2. In Neon (project **sneakyelves** → **Connect**, with **Connection pooling off**), copy the connection string into `DATABASE_URL` in that file. Delete `&channel_binding=require` from the end if present, and add `&schema=dev`.
3. Run:
   ```
   ./dev.sh setup
   ```
   This installs dependencies, creates or updates the `dev` schema's tables, and adds test users.

**Every day**

```
./dev.sh
```

Then open http://localhost:5173 and log in as `dev.admin@example.com` / `devpassword` (admin), or as `dev.alice@` / `dev.ben@` / `dev.carmen@example.com` (same password). The API restarts automatically when you edit server code, and the site reloads when you edit client code.

Safety: the API refuses to start locally unless `DATABASE_URL` points at a non-`public` schema, so local runs can't touch production data.

Google sign-in works locally only if `http://localhost:5173` is listed under **Authorized JavaScript origins** for the OAuth client in Google Cloud Console. Email/password login always works.

**After pulling a change to `prisma/schema.prod.prisma`**, run `./dev.sh setup` again to update the dev schema.

## Deploying

Run these from Google Cloud Shell (or any machine with `gcloud` and `firebase` signed in), from a fresh clone of `main`:

- **API:** `cd wishlist-api-node && bash deploy_backend.sh`
- **Website:** `cd wishlist-client && bash deploy_firebase.sh`
- **Schema changes** (only when `schema.prod.prisma` changed): from a machine with the *production* connection string (no `schema=` parameter), run `DATABASE_URL="..." npm run db:sync` in `wishlist-api-node`. Do this before deploying the API.

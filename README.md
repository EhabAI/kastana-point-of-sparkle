# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Set up environment variables.
cp .env.example .env
# Then edit .env with your Supabase credentials

# Step 4: Install the necessary dependencies.
npm i

# Step 5: Start the development server with auto-reloading and an instant preview.
npm run dev
```

## Environment Variables

This project requires the following environment variables:

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_PROJECT_ID` | Your Supabase project ID |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase anon/public key |
| `VITE_SUPABASE_URL` | Your Supabase project URL |

Copy `.env.example` to `.env` and fill in your values. The `.env` file should never be committed to version control.

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

---

## 🔒 Security Configuration Checklist (CRITICAL)

Before deploying to production, ensure the following security settings are configured:

### 1. Enable Leaked Password Protection (REQUIRED)

**This is a Supabase Dashboard setting that MUST be enabled manually.**

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to: **Authentication** → **Providers** → **Email**
3. Enable: **"Leaked Password Protection"**
4. This prevents users from signing up with passwords that have been exposed in data breaches

📚 Documentation: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

### 2. Security Best Practices Implemented

This project implements the following security measures:

| Feature | Status | Description |
|---------|--------|-------------|
| Row Level Security (RLS) | ✅ Enabled | All tables have RLS enabled with strict policies |
| Role-based Access | ✅ Implemented | Roles stored in `user_roles` table (not profiles) |
| Secure Functions | ✅ Implemented | Security definer functions for sensitive operations |
| Audit Logging | ✅ Implemented | All sensitive actions logged via Edge Functions |
| QR Table Lookup | ✅ Secured | Uses `public_get_table_by_code()` function (no public USING(true)) |
| Profile Protection | ✅ Secured | Email addresses only visible to authorized users |

### 3. Production Deployment Checklist

- [ ] Enable Leaked Password Protection in Supabase Dashboard
- [ ] Verify all environment variables are set correctly
- [ ] Test QR menu functionality after deployment
- [ ] Verify cashier login and shift operations work
- [ ] Verify owner admin panel access
- [ ] Run security scan via Lovable Cloud

---

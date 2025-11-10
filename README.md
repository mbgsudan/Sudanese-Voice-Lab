# Sawtna Voice Lab (Packaged)

Ready-to-deploy static bundle for GitHub Pages.

## Files
- `config.js` — central config (Supabase URL/key/bucket and admin password).
- `styles.css` — shared UI theme (dark, gradient, mobile-first).
- `admin.html` — admin login page (sets `localStorage.admin_auth`).
- `review.html` — admin-only review board (approve/reject, play audio, add speaker).
- `follow.html` — public status page (filter by speaker, export to CSV).
- `record.html` — voice recorder with countdown, pulse effect, beeps, fallback texts.

## Notes
1) Deploy all files to the root of your GitHub Pages repository.
2) Change `ADMIN_PASSWORD` in `config.js` and rotate your anon key if needed.
3) Ensure Supabase tables/bucket exist and RLS policies are set as we discussed.

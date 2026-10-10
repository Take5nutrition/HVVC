# My Website

A clean HTML/CSS/JS starter — no frameworks, no build step, just open and go.

## Folder Structure

```
my-website/
├── index.html        ← Home page
├── about.html        ← About page
├── contact.html      ← Contact page
├── css/
│   ├── reset.css     ← Browser normalization
│   └── style.css     ← All your styles + CSS variables
├── js/
│   └── main.js       ← Your JavaScript
├── images/           ← Drop images here
├── fonts/            ← Local fonts go here
└── README.md
```

## Getting Started

1. Open the folder in VS Code
2. Install the **Live Server** extension (ritwickdey.LiveServer)
3. Right-click `index.html` → **Open with Live Server**
4. Start editing — the browser auto-refreshes on save

## Customizing

- **Colors & spacing** — edit the `:root` variables at the top of `css/style.css`
- **Fonts** — swap the `--font-sans` variable or add a Google Fonts `<link>` in the `<head>`
- **Pages** — duplicate any `.html` file and update the nav links
- **Forms** — wire up `contact.html` to [Formspree](https://formspree.io) or [EmailJS](https://emailjs.com) (free tiers available)

## Content dashboard

The club edits coaches, tournaments, practice times, and events at
**dashboard.hvvcvolleyballclub.com** (also reachable at `/admin/` on the main
domain). Each section edits one file in `data/`, and `js/content.js` renders it
on the site:

| Dashboard tab | File                    | Shown on                         |
| ------------- | ----------------------- | -------------------------------- |
| Coaches       | `data/coaches.json`     | Staff page                       |
| Tournaments   | `data/tournaments.json` | Schedule page and each team page |
| Practices     | `data/practices.json`   | Schedule page                    |
| Events        | `data/events.json`      | Events page and homepage banner  |

How it fits together:

- `admin/` is the dashboard page. `api/admin.js` handles login and saving, and
  `api/_content-schema.js` defines every form field and validation rule, so
  that is the one place to add or change a field.
- Saving commits the updated JSON (and any new photos, under `img/uploads/`) to
  `main` through the GitHub API. Vercel then deploys, and the dashboard reports
  when the change is live.
- Pull before editing locally, since the dashboard may have committed since your
  last pull.

Vercel environment variables (Production):

| Variable                   | What it is                                                                |
| -------------------------- | ------------------------------------------------------------------------- |
| `DASHBOARD_PASSWORD`       | The dashboard login password. Changing it signs everyone out.             |
| `DASHBOARD_SESSION_SECRET` | Random string used to sign login sessions.                                |
| `GITHUB_TOKEN`             | Fine-grained token for this repo: Contents read/write, Commit statuses read. |

Redeploy after changing any of them.

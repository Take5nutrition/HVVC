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

Coaches, tournaments, practice times, and events are edited in
[Pages CMS](https://app.pagescms.org), configured by `.pages.yml`. Each section
edits one file in `data/`, and `js/content.js` renders it on the site:

| Dashboard section   | File                    | Shown on                         |
| ------------------- | ----------------------- | -------------------------------- |
| Coaches             | `data/coaches.json`     | Staff page                       |
| Tournament schedule | `data/tournaments.json` | Schedule page and each team page |
| Practice schedule   | `data/practices.json`   | Schedule page                    |
| Events              | `data/events.json`      | Events page and homepage banner  |

Saving in the dashboard commits to `main`, so Vercel publishes the change. Pull
before editing locally, since the dashboard may have committed since your last
pull. Team page tournament sections stay hidden until a tournament is added for
that team (or for all teams).

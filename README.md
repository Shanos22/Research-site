# Anonymous Assessment Website (Static, $0)

## What this is
A static website that runs the survey *in the browser* and shows instant results.

- No backend required
- No data sent anywhere by default
- Instant results page
- Download results JSON button

## Files
- index.html (UI)
- styles.css (styling)
- app.js (survey runner)
- questions_core.json (your survey questions + section order)
- scoring.js (scoring + profile mapping)

## IMPORTANT
Many early questions (Q1–Q122, and some others) are placeholders in this package because the finalized wording was not included in the chat transcript.

Open `questions_core.json`, search for `[PLACEHOLDER]`, and paste in your final question text and options.

## Deploy for $0 (Cloudflare Pages)
1) Create a GitHub repo and upload these files (or drag-drop in GitHub web UI).
2) In Cloudflare Dashboard → Pages → Create project → Connect to GitHub.
3) Framework preset: "None"
4) Build command: (leave blank)
5) Output directory: / (root)
6) Deploy.

## Local test
Open a terminal in this folder and run a local server:
- Python: `python -m http.server 8080`
Then open http://localhost:8080

## Editing scoring
Open `scoring.js` and change:
- what questions contribute to scores
- score weighting
- profile thresholds and guidance text


# Flank

Competitive radar for the GTM engineering ecosystem. Tracks Unify GTM against its
real competitors on a live, click-to-compare radar, a full evaluation matrix, and
an AI-researched newsfeed, all backed by live web search.

To see this repo in action, click here: https://gtm-radar-production.up.railway.app/

## What's in this repo

```
flank-repo/
├── server.js          Express server: serves the app, proxies Anthropic API calls
├── package.json
├── .env.example        Copy to .env for local dev
├── .gitignore
├── public/
│   └── index.html      The entire app (HTML, CSS, JS in one file)
└── README.md
```

## Why there's a server at all

The app itself is one HTML file, but three features (**Assess**, **Force Rescan**,
and **Newsfeed**) call the Anthropic API with live web search. That call needs an
API key, and an API key can never live in browser-side JavaScript, anyone could
open dev tools and steal it. So `server.js` is a small proxy: your browser calls
`/api/messages` on your own server, the server attaches your API key server-side,
and forwards the request to Anthropic. The key never reaches the browser.

Data storage also changed from the original build: each visitor's tracked
companies, scores, and news are saved in that browser's `localStorage`. That means
data is per-browser, not synced across devices, and clearing browser data clears
it. If you want shared, cross-device storage later, that's a real database
swap-in, not something this version does.

## Local setup

Requires Node 18 or later (for built-in `fetch`).

```bash
git clone <your-repo-url>
cd flank-repo
npm install
cp .env.example .env
```

Open `.env` and paste in your Anthropic API key (get one at
[console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)):

```
ANTHROPIC_API_KEY=sk-ant-your-real-key-here
```

Then run it:

```bash
npm start
```

Visit `http://localhost:3000`. Everything should work identically to the version
you used inside Claude, including Assess, Force Rescan, and Newsfeed.

## Pushing this to GitHub

From inside the `flank-repo` folder:

```bash
git init
git add .
git commit -m "Initial commit: Flank competitive radar"
git branch -M main
git remote add origin https://github.com/TeeniLinguini/flank.git
git push -u origin main
```

(Swap the remote URL for whatever repo name you actually create on GitHub. Create
the empty repo on GitHub first if you haven't, then run the commands above.)

Your `.env` file will **not** be pushed, it's in `.gitignore` on purpose. That's
correct: your API key should never end up in a public or private GitHub repo.

## Deploying to Railway, step by step

1. **Go to [railway.app](https://railway.app)** and log in (or sign up) with your
   GitHub account.

2. **Click "New Project"** on your Railway dashboard.

3. **Select "Deploy from GitHub repo."** Railway will ask for permission to
   access your GitHub repos if it doesn't have it yet, grant access to the repo
   you just pushed (or to all repos, your call).

4. **Pick the `flank` repo** from the list. Railway will detect it's a Node
   project automatically (it reads `package.json`) and start a first deploy.
   This first deploy will fail or run without working AI features, that's
   expected, you haven't set the API key yet.

5. **Click into the service** Railway just created (it'll be named after your
   repo). Go to the **"Variables"** tab.

6. **Add a new variable**:
   - Name: `ANTHROPIC_API_KEY`
   - Value: your real key from console.anthropic.com
   
   Click **"Add"**. You do not need to set `PORT`, Railway sets that
   automatically and `server.js` already reads `process.env.PORT`.

7. **Redeploy.** Railway usually redeploys automatically the moment you save a
   new variable. If it doesn't, go to the **"Deployments"** tab and click
   **"Redeploy"** on the latest one.

8. **Get your public URL.** Go to the **"Settings"** tab of the service, scroll
   to **"Networking,"** and click **"Generate Domain."** Railway will give you a
   URL like `flank-production-xxxx.up.railway.app`.

9. **Verify it's working.** Visit `https://your-url.up.railway.app/health` in a
   browser. You should see:
   ```json
   {"ok":true,"hasApiKey":true}
   ```
   If `hasApiKey` is `false`, the environment variable didn't save, double-check
   step 6.

10. **Open the actual app** at `https://your-url.up.railway.app/` and try
    Assess on a company. If it researches and adds a card, you're fully live.

### Redeploying after future changes

Any time you `git push` to the branch Railway is watching (`main`, by default),
Railway redeploys automatically. No manual steps needed after the first setup.

## Costs to be aware of

Every Assess, every company in a Force Rescan, and every company in a Newsfeed
refresh is a separate Anthropic API call with web search enabled. Web search is
billed per search ($10 per 1,000 searches) on top of normal token costs. Force
Rescan and Newsfeed both loop through every tracked company, so with 11 companies
tracked, one Force Rescan is roughly 11 API calls, and one full Newsfeed refresh
is another 11. This is normal usage-based cost, not a bug, but it's worth knowing
before you leave it running unattended or hand the URL to other people.

## Troubleshooting

**"Server is missing ANTHROPIC_API_KEY"** shown in the app: the Railway variable
isn't set, or you're running locally without a `.env` file. See setup steps
above.

**Newsfeed or Assess return errors for every company**: check the `/health`
endpoint first to confirm `hasApiKey` is `true`. If it is, check your Railway
service logs (Deployments tab, click the active deployment) for the actual error
Anthropic returned, insufficient credits and rate limits are the most common
causes.

**Data disappeared**: storage is per-browser `localStorage`. Different browser,
incognito window, or cleared site data all mean a fresh start. This is expected
behavior for this version, not a bug.

**Port already in use locally**: something else on your machine is using port
3000. Set a different port in `.env` (`PORT=3001`) and restart.

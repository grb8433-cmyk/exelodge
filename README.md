# ExeLodge — Student Housing Platform for University of Exeter

ExeLodge is a comprehensive housing platform built specifically for University of Exeter students. It brings together everything a student needs: 150+ real-world property listings, verified landlord reviews, a housemate finder, and a plain-English guide to tenant rights.

---

## 🚀 Final Live Launch Guide (Tiiny Host & Cloud)

Follow these steps to take ExeLodge live with an **Automatic Property Watcher**.

### Step 1: Create your Cloud Database (Supabase)
1.  Go to [Supabase.com](https://supabase.com) and create a free project.
2.  In the **SQL Editor**, run the following to create your tables:
    ```sql
    create table properties (id text primary key, address text, area text, price_pppw int, beds int, baths int, bills_included boolean, direct_url text, landlord_id text);
    create table reviews (id text primary key, landlord_id text, overall_rating int, review text, verified boolean, date date);
    ```
3.  Go to **Project Settings → API** and copy your `Project URL` and `anon public` key.

### Step 2: Connect the App
1.  Open `src/utils/storage.js`.
2.  Change `const LIVE_MODE = true;`.
3.  Paste your Supabase URL and Key into the configuration variables.

### Step 3: Launch the Website
1.  Run `npx expo export -p web` in your terminal. This creates a `dist` folder.
2.  Go to [Netlify.com](https://netlify.com) (Recommended) or [Tiiny.host](https://tiiny.host).
3.  **Drag and Drop** the `dist` folder onto their dashboard.
4.  **Your site is now live!** (e.g., `exelodge.netlify.app`)

### Step 4: Setup the Automatic Watcher (Python)
To keep houses updated automatically:
1.  Install Python on your computer.
2.  Open the `scraper` folder and run: `pip install -r requirements.txt`.
3.  Open `watcher.py` and paste your Supabase keys at the top.
4.  Run it: `python watcher.py`.
5.  **Automation**: To run this every day for free, upload `watcher.py` to **GitHub Actions** or **PythonAnywhere** and set it to run on a schedule.

---

## Features

| Feature | Status |
|-----|-------------|
| **150+ Listings** | Active - Scraped from 42 Exeter sources. |
| **Landlord League Table** | Active - Compare agencies by repairs and deposit return. |
| **Direct Listing Links** | Active - "View on Website" button on every house. |
| **Housemate Messaging** | Active - Chat with mutual matches. |
| **Cloud Ready** | Active - Just toggle `LIVE_MODE` in storage.js. |

---

## Running the Development Version

### 1. Install dependencies
```bash
npm install --legacy-peer-deps
```

### 2. Start
```powershell
# Website
npm run web

# Mobile
npx expo start --clear
```

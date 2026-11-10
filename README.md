# Budget

Personal budget tracker built from your Budgetting_Sheet.xlsx. Runs on your iPhone as a home screen app from Safari (free, no App Store or Apple Developer account), with your data synced to Firebase (Cloud Firestore) when you sign in with email and password.

## What it does

Home
- Month summary: what is left to spend, a safe amount per day, top category, biggest purchase, and how you are tracking against last month
- Income, spent, net saved and savings rate
- Left to spend by category, with a per day amount, status (On track, Near limit, Over budget), rollover carry and year to date. Tap a category to see its transactions
- Coming up: next bills and subscriptions with a due date ("Due in 5 days"), each with a Log button that opens Add expense filled in
- Charts: six month income vs spending trend, and where the money went this month (tap a category to see its transactions)
- Year: year at a glance table and category by month heatmap

Add expense (big + button)
- Amount, store, category, payment method, what you bought, date (date picker), notes. Starts on the payment method you used last
- Undo on the "Saved" banner takes the expense back out and puts it back in the form
- Store suggestions from past purchases. Picking one fills in the category and payment method you used there last time
- Quick add again: one tap to refill a recent purchase
- Split with others: enter the full bill and the number of people, only your share is saved
- Receipt photo from the camera or gallery
- Budget alert when a category reaches your warning % or goes over (in the app and as a phone notification)

Activity
- Grouped by day (Today, Yesterday, then the date) with a total for each day, filter by category and payment method, tap to edit or delete
- Search by store, description, notes or amount. Searching looks through every month, not only the one on screen

Plan
- Savings goals with target, optional date, money added or taken out, and the monthly amount needed
- Monthly set aside for subscriptions, annual bills, gifts and badminton
- Subscriptions and bills, one line each: tap one to change its name, cost, budget category or due date, or to log a payment of it as an expense
- Gifts and trips with your share after splitting

Budget
- Expected income, warning %, monthly budget per category, Fixed or Flexible, Rollover on or off
- Add a category, or tap a category name to rename or delete it. Renaming updates its transactions; deleting keeps them and moves them to Uncategorised
- Account: sign in with email and password to sync to the cloud, or use the app on this device only. The card says whether you are synced, offline, or the last sync failed (with a Try again button)
- Settings: light, dark or match phone; budget alerts; bill reminders and how many days before
- Export transactions to CSV for Google Sheets (same columns as your Transactions tab, with Store added at the end), full backup, import, erase all data

## How data is stored

- The device always keeps its own copy, so the app opens instantly and works with no signal.
- Signed in: every change also syncs to Firestore under `users/{your id}` (settings, budgets, plans and goals) and `users/{your id}/transactions` (one document per transaction). Changes made offline upload when you are back online. If Safari clears the app's storage, sign in again and everything comes back.
- This device only: skip sign in and everything stays in the browser, like before. Safari can clear it, so keep backups. You can sign in later from Budget > Account.
- Signing in on a device that already has data: a new (empty) account gets this device's data. Signing in to an account that already has data replaces what is on the device with the account's copy.
- If a sync fails (no permission, the free daily allowance used up, a bad connection), the changes stay on the device and are sent again on your next edit, when the app is reopened or comes back online, or when you tap Try again in Budget > Account. Signing out warns you first if something has not reached the cloud.
- Restoring a backup replaces everything, so the app asks first when it already has transactions.
- Receipt photos stay on the device and are not synced or included in backups.
- The sync rules are in `src/sync.js` (tested by `test/sync.test.mjs`); the Firebase calls are in `src/cloud.js`.

## One time setup (all free)

### 1. Firebase project

1. Go to console.firebase.google.com and create a project (the free Spark plan is plenty).
2. Build > Authentication > Get started > Sign-in method > enable **Email/Password**.
3. Build > Firestore Database > Create database (production mode, pick a region close to you).
4. Firestore > Rules: paste in the contents of `firestore.rules` and publish. This makes sure only you can read and write your data.
5. Project settings (gear icon) > General > Your apps > add a **Web** app (the `</>` icon). Copy the `apiKey`, `authDomain`, `projectId` and `appId` values it shows.
6. Authentication > Settings > Authorized domains > add `YOUR-USERNAME.github.io`.

These values are not secret; the rules from step 4 are what protect your data.

### 2. GitHub Pages

1. Push this folder to a GitHub repository (for example budget-app).
2. Settings > Pages > Source: **GitHub Actions**.
3. Settings > Secrets and variables > Actions > **Variables** tab > add four repository variables with the values from Firebase step 5:
   - `FIREBASE_API_KEY`
   - `FIREBASE_AUTH_DOMAIN`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_APP_ID`
4. Push to main (or run the "Deploy web app" workflow by hand). When it finishes the site is at https://YOUR-USERNAME.github.io/REPO-NAME/
5. Every later push to main updates the site. The app picks up the new version the next time it is opened twice (the first open downloads it in the background).

GitHub Pages on a private repository needs a paid GitHub plan, so the repository needs to be public on the free plan. That is fine: the code has no personal data and no secrets, and your data lives in your Firebase account behind the security rules.

### 3. Install on the iPhone

1. Open the link in Safari (not Chrome).
2. Tap Share, then Add to Home Screen, then Add.
3. Open it from the home screen, create your account, and you are set.

### Moving your existing data in

If you already use the home screen app, its data is still there after this update. Sign in and choose **Create an account** and that data is uploaded to your new account.

From another device: export a full backup there (Budget > Export full backup), then on the iPhone, after signing in, use Budget > Import CSV or restore backup.

## What is different from a native app

- No bill reminder or budget notifications. Budget warnings show as a banner after you save an expense, and bills with a due date show under Coming up on Home.
- Dates use Safari's own date picker.

## Run it locally

1. Install Node 22 or newer, then run `npm install`.
2. Copy `.env.example` to `.env.local` and fill in the Firebase values (without them the app runs in "this device only" mode).
3. `npm run web` opens it in your browser. `npm start` also lets you open it in the Expo Go app on your iPhone (same Wi-Fi), which uses the native date picker and notifications.

Build the web version like GitHub does: `BASE_URL=/REPO-NAME npm run build:web`, then serve the `dist` folder. In Git Bash on Windows, put `MSYS_NO_PATHCONV=1` in front, or Git Bash turns `/REPO-NAME` into a Windows path.

## Development

```bash
npm start          # dev server
npm test           # budget logic, sync, backup import and category tests
npm run lint       # expo lint
npm run typecheck  # tsc --noEmit
npx expo-doctor    # dependency and config checks
```

- Screens and navigation use Expo Router: routes are in `src/app/` (tabs in `src/app/(tabs)/`, the edit screen in `src/app/edit/[id].js`, sign in in `src/app/sign-in.js`). Screen components are in `src/screens/`, shared state in `src/state.js`.
- `scripts/finish-web.js` runs after the web export: it points the links in index.html at the site folder and writes 404.html, so reloading any page on GitHub Pages still opens the app.
- The calculations are in src/logic.js. test/verify.py checks them against every figure on your sheet and test/new_features.mjs checks the newer features. Both read test/fixtures/real-seed.json, which holds your spreadsheet data and is kept out of git. test/improvements.test.mjs (search, day labels, categories, failed sync) uses made-up data only.

## Notes

- Rollover carries the difference between budget and spending from January of the same year. Overspending reduces what is left.
- The app starts blank (data/seed.json is an empty template with your categories), so no personal data is in the code or on the website.
- A native iPhone build is possible later with a paid Apple Developer account ($99 a year) through EAS Build; app.json already has the iOS bundle ID (`com.sandrup.budgettracker`).

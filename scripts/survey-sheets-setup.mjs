// One-off: writes the header row of the survey's three tabs (Responses, Feedback in the answers sheet; Contacts in the
// contacts sheet). Create the tabs with those names first, share both sheets with the service account's e-mail as Editor,
// then run, with the same variables as on Vercel in a local .env.local (never committed):
//
//   node --env-file=.env.local scripts/survey-sheets-setup.mjs
//
// Running it again only rewrites row 1. After adding a column in lib/survey-sheets.mjs, run it again.
import { config, writeHeaders, TABS } from '../lib/survey-sheets.mjs';

const cfg = config();
if (!cfg) {
  console.error('Missing GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, SURVEY_SHEET_ID or SURVEY_CONTACTS_SHEET_ID');
  process.exit(1);
}
for (const kind of Object.keys(TABS)) {
  await writeHeaders(cfg, kind);
  console.log(`✓ ${TABS[kind]}: header row written`);
}

// The survey's storage (api/survey.js and scripts/survey-sheets-setup.mjs): two Google Sheets, written by a Google
// service account, no dependencies (node:crypto signs the token).
//
//   SURVEY_SHEET_ID           the answers: tab «Responses» (one row a finished survey) and tab «Feedback» (the fit
//                             question and the course questions after the result)
//   SURVEY_CONTACTS_SHEET_ID  a separate file with tab «Contacts»: e-mail / phone and the marketing consent, linked to the
//                             answers only by respondent_id. Share it with fewer people than the answers (the survey
//                             document: contact details and consents are kept apart)
//   GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY   the service account; both sheets are shared with its e-mail as Editor
//
// Unknown values are written as "unknown", never empty, false or 0 (the survey document). Strings go in RAW, so a
// value starting with "=" stays text and never becomes a formula.
import { createSign } from 'node:crypto';

export const TABS = { responses: 'Responses', feedback: 'Feedback', contacts: 'Contacts' };

// Each column: [header, path in the posted object]. The order is the sheet's column order: add new ones at the end.
export const COLUMNS = {
  responses: [
    'survey_version', 'rules_version', 'respondent_id', 'source', 'roles', 'role_other', 'occupation',
    'task_ids', 'task_other', 'primary_task_id', 'primary_task_text', 'goal', 'goal_other', 'example',
    'baseline_period', 'baseline_count', 'baseline_count_exact', 'baseline_minutes', 'rare', 'rare_time',
    'bottleneck_ids', 'bottleneck_other', 'apps', 'apps_other', 'app_name', 'input_types',
    'ai_level', 'ai_tools', 'device', 'budget_preference', 'budget_amount', 'interface_languages', 'constraints', 'constraint_other',
    ['automation_a1', 'automation_answers.a1'], ['automation_a1_text', 'automation_answers.a1_text'], ['automation_a2', 'automation_answers.a2'],
    ['income_path', 'income_answers.path'], ['income_obstacle', 'income_answers.obstacle'], ['income_obstacle_other', 'income_answers.obstacle_other'],
    'recommendation_ids', 'explored',
  ],
  feedback: [
    'respondent_id', ['fit', 'feedback.fit'], ['fit_text', 'feedback.text'],
    ['course_interest', 'course.interest'], ['course_hours', 'course.hours'], ['course_barrier', 'course.barrier'],
  ],
  contacts: ['respondent_id', 'channel', 'email', 'phone', 'marketing_consent'],
};
const cols = (kind) => COLUMNS[kind].map((c) => (Array.isArray(c) ? c : [c, c]));
export const headers = (kind) => ['received_at', ...cols(kind).map(([h]) => h)];

const MAX_TEXT = 500;   // the longest free answer is 400 characters (Հ5)
function cell(v) {
  if (v === undefined || v === null || v === '') return 'unknown';
  if (Array.isArray(v)) return v.length ? v.map((x) => String(x).slice(0, 80)).join(', ').slice(0, MAX_TEXT) : 'unknown';
  if (typeof v === 'boolean') return v ? 'yes' : 'no';
  if (typeof v === 'number') return Number.isFinite(v) ? v : 'unknown';
  if (typeof v === 'object') return 'unknown';
  const s = String(v).trim();
  return s ? s.slice(0, MAX_TEXT) : 'unknown';
}
const at = (obj, path) => path.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj);
export const row = (kind, data, now = new Date()) => [now.toISOString(), ...cols(kind).map(([, path]) => cell(at(data, path)))];

// ---------- Google auth: a service-account JWT traded for an access token, kept until shortly before it expires ----------
let token = null;
const b64url = (s) => Buffer.from(s).toString('base64url');
export function config(env = process.env) {
  const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = (env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');   // Vercel env vars keep the key's line breaks as \n
  const answers = env.SURVEY_SHEET_ID;
  const contacts = env.SURVEY_CONTACTS_SHEET_ID;
  return email && key && answers && contacts ? { email, key, answers, contacts } : null;
}
async function accessToken(cfg, fetchImpl) {
  const now = Math.floor(Date.now() / 1000);
  if (token && token.exp - 60 > now) return token.value;
  const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({ iss: cfg.email, scope: 'https://www.googleapis.com/auth/spreadsheets', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const sig = createSign('RSA-SHA256').update(`${head}.${claim}`).sign(cfg.key).toString('base64url');
  const res = await fetchImpl('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${head}.${claim}.${sig}` }),
  });
  if (!res.ok) throw new Error(`google token ${res.status}`);
  const data = await res.json();
  token = { value: data.access_token, exp: now + (data.expires_in || 3600) };
  return token.value;
}
const sheetFor = (cfg, kind) => (kind === 'contacts' ? cfg.contacts : cfg.answers);
const api = (cfg, kind, suffix) => `https://sheets.googleapis.com/v4/spreadsheets/${sheetFor(cfg, kind)}/values/${encodeURIComponent(`${TABS[kind]}!A1`)}${suffix}`;

export async function appendRow(cfg, kind, values, fetchImpl = fetch) {
  const res = await fetchImpl(api(cfg, kind, ':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), {
    method: 'POST',
    headers: { authorization: `Bearer ${await accessToken(cfg, fetchImpl)}`, 'content-type': 'application/json' },
    body: JSON.stringify({ values: [values] }),
  });
  if (!res.ok) throw new Error(`sheets append ${kind} ${res.status}`);
}
export async function writeHeaders(cfg, kind, fetchImpl = fetch) {
  const res = await fetchImpl(api(cfg, kind, '?valueInputOption=RAW'), {
    method: 'PUT',
    headers: { authorization: `Bearer ${await accessToken(cfg, fetchImpl)}`, 'content-type': 'application/json' },
    body: JSON.stringify({ values: [headers(kind)] }),
  });
  if (!res.ok) throw new Error(`sheets headers ${kind} ${res.status}: ${await res.text()}`);
}

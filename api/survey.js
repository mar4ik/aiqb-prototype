// POST /api/survey — stores the needs survey (survey.html, survey.js) in Google Sheets (lib/survey-sheets.mjs).
//
// Three kinds of post, all with the respondent's random respondent_id and nothing else that names them:
//   { kind: 'response', response: {…} }   the answers, sent when the result opens          → Responses tab
//   { kind: 'feedback', respondent_id, feedback, course }   the questions after the result → Feedback tab
//   { kind: 'contact', respondent_id, channel, email|phone, marketing_consent }           → the separate contacts sheet
// Sending the copy by e-mail / SMS is not automated: the team reads the Contacts sheet and sends it.
import { config, row, appendRow } from '../lib/survey-sheets.mjs';

const MAX_BODY = 16 * 1024;
const ID = /^[A-Za-z0-9-]{8,64}$/;
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;

const reply = (status, body) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } });

// Only the site itself may post (the browser sends Origin on every cross-site POST). SURVEY_ALLOWED_ORIGINS, comma-
// separated, adds others (e.g. https://aiqezban.ai if the survey is embedded there)
function allowed(request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;   // same-origin navigations and server-to-server calls send none
  let host;
  try { host = new URL(origin).host; } catch { return false; }
  if (host === request.headers.get('host')) return true;
  const extra = (process.env.SURVEY_ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  return extra.includes(origin);
}

function validate(body) {
  if (!body || typeof body !== 'object') return null;
  if (body.kind === 'response') {
    const r = body.response;
    if (!r || typeof r !== 'object' || !ID.test(r.respondent_id || '')) return null;
    return { kind: 'responses', data: r };
  }
  if (!ID.test(body.respondent_id || '')) return null;
  if (body.kind === 'feedback') {
    return { kind: 'feedback', data: { respondent_id: body.respondent_id, feedback: body.feedback || {}, course: body.course || {} } };
  }
  if (body.kind === 'contact') {
    const { channel } = body;
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    if (channel === 'email' && !EMAIL.test(email)) return null;
    if (channel === 'sms' && !(phone.replace(/\D/g, '').length >= 8 && phone.length <= 24)) return null;
    if (channel !== 'email' && channel !== 'sms') return null;
    return {
      kind: 'contacts',
      data: { respondent_id: body.respondent_id, channel, email: channel === 'email' ? email : '', phone: channel === 'sms' ? phone : '', marketing_consent: body.marketing_consent === true },
    };
  }
  return null;
}

export async function POST(request) {
  if (!allowed(request)) return reply(403, { ok: false, error: 'origin' });
  const cfg = config();
  if (!cfg) return reply(503, { ok: false, error: 'not configured' });
  const text = await request.text();
  if (text.length > MAX_BODY) return reply(413, { ok: false, error: 'too large' });
  let body;
  try { body = JSON.parse(text); } catch { return reply(400, { ok: false, error: 'json' }); }
  const job = validate(body);
  if (!job) return reply(400, { ok: false, error: 'invalid' });
  try {
    await appendRow(cfg, job.kind, row(job.kind, job.data));
  } catch (err) {
    console.error('survey store failed', job.kind, err.message);   // never logs the answers or the contact itself
    return reply(502, { ok: false, error: 'store' });
  }
  return reply(200, { ok: true });
}

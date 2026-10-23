// Cover letter generator for justiceessielp.github.io/admin.
// Holds the AnyAPI key and admin password as Worker secrets; the browser never sees either.

const PROFILE = `
Prince Justice Sena — AI Engineer · Agentic Payments. Portfolio: https://justiceessielp.github.io
Mission: Intelligence is becoming something anyone can hold. I build the agents that turn it into real work — and the rails that let them pay their own way.

Experience
- Founder & AI Product Engineer, Workplacefiles AI (2026–now): enterprise AI agents for recurring team work. Team files, Slack and Google Drive organised as Markdown and indexed into a knowledge graph; GraphRAG retrieval backed by vector search, plus a memory layer that carries team decisions between runs. Updates are proposed as reviewable changes with version history; agents flag missing information instead of guessing. Early enterprise pipeline: one bank and two real-estate companies.
- Co-founder & Lead Developer, Shika Protocol / OffGrid Labs (2025–2026): modular fintech stack on Base for African markets — identity, cedi stablecoin, ROSCA savings, lending, USSD access. 3,000+ users, ~430 new users a month, 85%+ loan repayment.
- Co-founder & CTO, EcoFundMe (formerly Greenance) (2024–now): climate crowdfunding with milestone-gated escrow in USDC on Base. Won a $50,000 Avail grant; Renew Capital SPRINT cohort; Digital Public Goods Innovation Contest winner (KOICA-UNICEF program with MEST Africa, 2024).
- Core Developer, The Graph Protocol (2023–now, remote): Web3 indexing infrastructure and data-querying systems; co-built Graph Africa and onboarded 200+ African builders.
- Developer Relations, DeFi Africa (2023–2024). CTO, Blockdor (2023): blockchain mine management with IoT fingerprint locks.
- Machine Learning Engineer, Sidakye Solution (2021–2023): "Dave", AI analytics for institutional investors — GDP-growth models (R² ≥ 0.6), news-sentiment pipelines, REST API.

Projects
- Solvador (2026): x402 payment facilitator that lets AI agents pay for APIs; verifies and settles USDC on 15 mainnets; exact, metered and batch-settlement schemes; confidential settlement on Base. Winner of Coinbase Batches 003; listed in the official x402 facilitator directory.
- AgentSound: pay-per-play music built on Solvador — an AI agent plays songs, each play (about a cent) comes from a prepaid balance within a weekly budget, and artists are paid privately in batches on Base and Arbitrum.
- ZK Rollup L2 Governance (2025): zero-knowledge layer 2 for on-chain voting, Go backend, Avail data availability.
- Awards: Arbitrum × StackUp 1st place (2024), Ethereum Safari winner (2024), Stellar Surge winner (2024), Ethereum Accra 1st place (2023), QuickNode Accelerator (2025).
- Writing: six-part Zero Knowledge Proofs series on dev.to. Talks: Base Africa podcast on trust for the agentic economy; The Graph Builders Office Hours.
Skills: LLM agents, agent memory, GraphRAG, vector RAG, voice agents, agentic payments (x402), Python, Go, TypeScript, Solidity, Rust.
`.trim();

const TEMPLATE = `
Structure (under 300 words, 4 short paragraphs):
1. Opening: why this company specifically — reference something concrete from their own site (product, mission, recent work). No generic flattery.
2. The match: 2–3 of the candidate's achievements that best fit this role and company, with numbers where the profile has them.
3. Why him: one or two sentences connecting his mission (agents that do real work and pay their own way) to what the company is building.
4. Close: a clear, confident next step, then sign-off "Prince Justice Sena" with the portfolio link.
Tone: direct, warm, confident, plain English. No clichés ("I am writing to express", "passionate", "synergy"). No bullet points in the letter.
`.trim();

const SYSTEM = `You write cover letters for one candidate. Use ONLY facts from the candidate profile below — never invent employers, numbers, titles or awards. Keep the profile's exact wording for traction and status: a sales pipeline is not a pilot or a customer. Never add timeframes such as "last year" that the profile does not state; use the years given. Use ONLY facts about the company that appear in the provided company text. If the company text says "(could not be read)" or is thin, do not name company products or initiatives — refer to the company and role in general terms. Start with a salutation on its own line: "Dear <recipient name>," if a name is given, "Dear <recipient title>," if only a title is given, otherwise "Dear Hiring Team,". Return only the letter text.

CANDIDATE PROFILE
${PROFILE}

TEMPLATE
${TEMPLATE}`;

const MAX_PAGE_CHARS = 7000;

// Brief per-isolate throttle on wrong passwords; good enough for a single-user tool
const failures = new Map();

function cors(origin, env) {
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim());
  return {
    'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0] || '',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
}

async function sameSecret(a, b) {
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a || '')),
    crypto.subtle.digest('SHA-256', enc.encode(b || '')),
  ]);
  const x = new Uint8Array(ha), y = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0 && !!b;
}

function htmlToText(html) {
  return html
    .replace(/<(script|style|noscript|svg)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
    .split('\n').map((l) => l.trim()).filter(Boolean).join('\n')
    .slice(0, MAX_PAGE_CHARS);
}

async function readPage(url) {
  if (!url) return '';
  let u;
  try { u = new URL(url); } catch { return ''; }
  if (!['http:', 'https:'].includes(u.protocol)) return '';
  try {
    const res = await fetch(u.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return '';
    return htmlToText(await res.text());
  } catch {
    return '';
  }
}

export default {
  async fetch(request, env) {
    const headers = cors(request.headers.get('Origin') || '', env);
    if (request.method === 'OPTIONS') return new Response(null, { headers });
    const path = new URL(request.url).pathname;
    if (request.method !== 'POST' || !['/login', '/generate'].includes(path)) {
      return json({ error: 'not_found' }, 404, headers);
    }

    let body;
    try { body = await request.json(); } catch { return json({ error: 'bad_request' }, 400, headers); }

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const f = failures.get(ip) || { n: 0, until: 0 };
    if (f.until > Date.now()) return json({ error: 'too_many_attempts' }, 429, headers);
    if (!(await sameSecret(body.password, env.ADMIN_PASSWORD))) {
      f.n += 1;
      if (f.n >= 5) { f.until = Date.now() + 10 * 60 * 1000; f.n = 0; }
      failures.set(ip, f);
      return json({ error: 'wrong_password' }, 401, headers);
    }
    failures.delete(ip);
    if (path === '/login') return json({ ok: true }, 200, headers);

    const role = String(body.role || '').slice(0, 200).trim();
    const companyUrl = String(body.companyUrl || '').slice(0, 500).trim();
    if (!role || !companyUrl) return json({ error: 'missing_fields' }, 400, headers);

    const [companyText, jobText] = await Promise.all([readPage(companyUrl), readPage(body.jobUrl)]);
    const recipient = [body.recipientName, body.recipientTitle].filter(Boolean).join(', ').slice(0, 200);

    const user = [
      `Role: ${role}`,
      `Company website: ${companyUrl}`,
      recipient ? `Recipient: ${recipient}` : 'Recipient: unknown (use "Dear Hiring Team")',
      body.notes ? `Candidate's notes for this application: ${String(body.notes).slice(0, 1000)}` : '',
      `COMPANY WEBSITE TEXT:\n${companyText || '(could not be read)'}`,
      jobText ? `JOB POST TEXT:\n${jobText}` : '',
    ].filter(Boolean).join('\n\n');

    const messages = [{ role: 'system', content: SYSTEM }, { role: 'user', content: user }];
    let last = { detail: 'no model available' };
    for (const model of modelOrder(env)) {
      const r = await complete(env, model, messages, 60000);
      if (r.ok) {
        workingModel = model;
        return json({ letter: r.text, model, companyRead: !!companyText, jobRead: !!jobText }, 200, headers);
      }
      last = r;
      if (!r.tryNext) break;
    }
    return json({ error: last.unreachable ? 'ai_unreachable' : 'ai_error', detail: last.detail }, 502, headers);
  },
};

// Model that last produced a letter in this isolate; tried first next time
let workingModel = '';

function modelOrder(env) {
  const list = [env.MODEL, ...String(env.FALLBACK_MODELS || '').split(',')].map((m) => m.trim()).filter(Boolean);
  return [...new Set([workingModel, ...list].filter(Boolean))];
}

// One chat completion. tryNext says whether another model might succeed (plan/model errors, empty answers)
async function complete(env, model, messages, timeoutMs) {
  let res;
  try {
    res = await fetch(`${env.ANYAPI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.ANYAPI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, temperature: 0.6, messages }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    return { ok: false, unreachable: true, tryNext: true, detail: `${model}: unreachable` };
  }
  const data = await res.json().catch(() => ({}));
  const text = String(data?.choices?.[0]?.message?.content || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  if (res.ok && text) return { ok: true, text };
  const msg = data?.error?.message || (res.ok ? 'empty response' : `status ${res.status}`);
  const authFailure = res.status === 401 || /invalid credentials|api key/i.test(msg);
  return { ok: false, tryNext: !authFailure, detail: `${model}: ${msg}` };
}


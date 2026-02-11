export type TierId = 'starter' | 'pro' | 'team';

export type TierConfig = {
  id: TierId;
  name: string;
  priceEurMonthly: number; // what Stripe bills (UI display)
  budgetEurMonthly: number; // enforced AI usage limit inside the system (EUR)
  maxAIsTotal: number; // includes Leader
  autoCreationLimited?: boolean;
};

// Non-negotiable: these are the ONLY tiers the system may enforce.
// IMPORTANT: Budgets are enforced locally as EUR usage; users never see tokens/models.
export const TIERS: Record<TierId, TierConfig> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    priceEurMonthly: 0,
    budgetEurMonthly: 2.5,
    maxAIsTotal: 2, // Leader + 1 worker
    autoCreationLimited: true,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceEurMonthly: 20,
    budgetEurMonthly: 12.5,
    maxAIsTotal: 7, // Leader + 6 workers
  },
  team: {
    id: 'team',
    name: 'Team',
    priceEurMonthly: 49,
    budgetEurMonthly: 30,
    maxAIsTotal: 11, // Leader + 10 workers
  },
};

export const AI_COUNT_OPTIONS = [2, 3, 5, 7, 11] as const;
export type AiCountOption = (typeof AI_COUNT_OPTIONS)[number];

// Fixed model choice (kept internal; never shown to end users)
export const FIXED_MODEL_PRIMARY = 'moonshot/kimi-k2.5';

export type WorkerRoleTemplate = {
  key:
    | 'market_research'
    | 'branding_copy'
    | 'web_design'
    | 'frontend'
    | 'backend_payments'
    | 'seo'
    | 'qa_critic'
    | 'analytics'
    | 'project_planning'
    | 'legal_privacy'
    | 'support_ops';
  name: string;
  emoji: string;
  role: string; // shown in UI (not a prompt)
  focus: string; // short UI blurb
  defaultTaskTitle: string;
  defaultTaskDescription: (projectBrief: string) => string;
};

// Predefined role templates (NOT free-form)
export const WORKER_ROLE_TEMPLATES: WorkerRoleTemplate[] = [
  {
    key: 'market_research',
    name: 'Research',
    emoji: '🧭',
    role: 'Market Research',
    focus: 'Competitors, positioning, customer insights',
    defaultTaskTitle: 'Market research',
    defaultTaskDescription: (brief) =>
      `Research the market for this project.\n\nProject: ${brief}\n\nDeliver:\n- 5 competitor examples\n- key differentiators\n- target audience\n- pricing/offer ideas`,
  },
  {
    key: 'branding_copy',
    name: 'Branding',
    emoji: '✍️',
    role: 'Branding & Copy',
    focus: 'Tone, messaging, page copy',
    defaultTaskTitle: 'Branding & copy',
    defaultTaskDescription: (brief) =>
      `Create the brand voice and initial copy.\n\nProject: ${brief}\n\nDeliver:\n- brand name ideas (5)\n- tagline (5)\n- homepage hero copy\n- short about section`,
  },
  {
    key: 'web_design',
    name: 'Design',
    emoji: '🎨',
    role: 'Web Design',
    focus: 'Layout, visual direction, UX structure',
    defaultTaskTitle: 'Web design direction',
    defaultTaskDescription: (brief) =>
      `Propose a simple, modern design direction.\n\nProject: ${brief}\n\nDeliver:\n- sitemap\n- wireframe notes for key pages\n- component list\n- colors + typography suggestions`,
  },
  {
    key: 'frontend',
    name: 'Frontend',
    emoji: '🧩',
    role: 'Frontend Code',
    focus: 'UI implementation, components, polish',
    defaultTaskTitle: 'Frontend implementation plan',
    defaultTaskDescription: (brief) =>
      `Plan the frontend build.\n\nProject: ${brief}\n\nDeliver:\n- tech stack recommendation\n- page/component breakdown\n- risks and quick wins`,
  },
  {
    key: 'backend_payments',
    name: 'Backend',
    emoji: '🧱',
    role: 'Backend / Payments',
    focus: 'APIs, data, Stripe payments',
    defaultTaskTitle: 'Backend & Stripe plan',
    defaultTaskDescription: (brief) =>
      `Design backend approach and Stripe payment flow (no keys in UI).\n\nProject: ${brief}\n\nDeliver:\n- minimal data model\n- API endpoints\n- Stripe checkout/subscription approach\n- security notes`,
  },
  {
    key: 'seo',
    name: 'SEO',
    emoji: '🔎',
    role: 'SEO',
    focus: 'Search basics, metadata, structure',
    defaultTaskTitle: 'SEO checklist',
    defaultTaskDescription: (brief) =>
      `List the SEO basics for launch.\n\nProject: ${brief}\n\nDeliver:\n- keywords themes\n- on-page checklist\n- metadata + schema suggestions\n- page speed notes`,
  },
  {
    key: 'qa_critic',
    name: 'QA',
    emoji: '🧾',
    role: 'QA / Critic',
    focus: 'Find issues, validate decisions, edge cases',
    defaultTaskTitle: 'QA / critic review',
    defaultTaskDescription: (brief) =>
      `Act as a critical reviewer.\n\nProject: ${brief}\n\nDeliver:\n- top risks\n- user-facing pitfalls\n- test checklist\n- questions we must answer early`,
  },
  {
    key: 'analytics',
    name: 'Analytics',
    emoji: '📊',
    role: 'Analytics',
    focus: 'KPIs, events, measurement',
    defaultTaskTitle: 'Analytics plan',
    defaultTaskDescription: (brief) =>
      `Define simple analytics and KPIs.\n\nProject: ${brief}\n\nDeliver:\n- KPIs\n- event list\n- basic dashboard ideas`,
  },
  {
    key: 'project_planning',
    name: 'Planner',
    emoji: '📌',
    role: 'Project Planning',
    focus: 'Milestones, scope, sequencing',
    defaultTaskTitle: 'Project plan',
    defaultTaskDescription: (brief) =>
      `Break the project into steps the team can execute.\n\nProject: ${brief}\n\nDeliver:\n- milestones\n- dependencies\n- recommended order of work\n- definition of done`,
  },
  {
    key: 'legal_privacy',
    name: 'Privacy',
    emoji: '🛡️',
    role: 'Legal / Privacy',
    focus: 'Privacy policy, cookies, compliance basics',
    defaultTaskTitle: 'Privacy & legal basics',
    defaultTaskDescription: (brief) =>
      `Draft the privacy/compliance checklist (non-lawyer).\n\nProject: ${brief}\n\nDeliver:\n- privacy policy outline\n- cookie consent notes\n- data retention basics\n- payment/comms compliance reminders`,
  },
  {
    key: 'support_ops',
    name: 'Ops',
    emoji: '🧰',
    role: 'Support / Ops',
    focus: 'Operational setup, support flows',
    defaultTaskTitle: 'Support & ops plan',
    defaultTaskDescription: (brief) =>
      `Plan basic operations and support.\n\nProject: ${brief}\n\nDeliver:\n- support channels\n- FAQ topics\n- incident checklist\n- maintenance routines`,
  },
];

export function clampAiCountToTier(tierId: TierId, desiredTotal: number): number {
  const t = TIERS[tierId];
  const safe = Math.max(1, Math.min(desiredTotal, t.maxAIsTotal));
  // Always include Leader, so minimum total is 1.
  return safe;
}

export function dailyRecommendedEur(budgetEurMonthly: number): number {
  // 30-day month approximation for UX; warnings use this same rule.
  return budgetEurMonthly / 30;
}

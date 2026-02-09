// Agent configuration - users customize this
export const AGENT_CONFIG = {
  // Branding
  brand: {
    name: 'Mission Control',
    subtitle: 'AI Agent Command Center',
  },

  // Define your agent team here
  agents: [
    { id: 'main', name: 'Atlas (gpt-5.2)', emoji: '🦞', role: 'Coordinator', focus: 'Delegates, reviews, synthesizes' },

    // Sonnet 4.5 (hard engineering)
    { id: 'claude1', name: 'Forge (claude1)', emoji: '🧠', role: 'Backend', focus: 'APIs, data models, correctness' },
    { id: 'claude2', name: 'Glass (claude2)', emoji: '🪟', role: 'Frontend', focus: 'UI, components, UX, Tailwind' },
    { id: 'claude3', name: 'Aegis (claude3)', emoji: '🛡️', role: 'Sec/DevOps', focus: 'Security, CI/CD, hardening' },

    // GPT support
    { id: 'tanel', name: 'Plan (tanel)', emoji: '📌', role: 'PM', focus: 'Milestones, acceptance criteria' },
    { id: 'gpt4research', name: 'Scout (gpt4research)', emoji: '🧭', role: 'Market Research', focus: 'Competitors, positioning' },
    { id: 'gpt4writing', name: 'Scribe (gpt4writing)', emoji: '📝', role: 'Writing', focus: 'Copy, docs, editing' },
    { id: 'gpt4content', name: 'Publisher (gpt4content)', emoji: '✍️', role: 'Content', focus: 'Long-form drafts, FAQs' },
    { id: 'gpt4seo', name: 'Rank (gpt4seo)', emoji: '🔎', role: 'SEO', focus: 'On-page SEO, metadata, schema' },
    { id: 'gpt4ux', name: 'Flow (gpt4ux)', emoji: '🎛️', role: 'UX', focus: 'Flows, IA, microcopy' },
    { id: 'gpt4data', name: 'Meter (gpt4data)', emoji: '📊', role: 'Analytics', focus: 'Events, KPIs, dashboards' },
    { id: 'gpt4test', name: 'Probe (gpt4test)', emoji: '🧾', role: 'QA/Test', focus: 'Test cases, repro, sanity checks' },
  ] as const,
};

// Derive AgentId type from config
export type AgentId = typeof AGENT_CONFIG.agents[number]['id'];

// Helper to get agent by ID
export function getAgentById(id: string) {
  return AGENT_CONFIG.agents.find(a => a.id === id);
}

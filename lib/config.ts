// Mission Control consumer configuration
//
// Constraints:
// - Leader AI is always present.
// - Up to 10 Worker AIs can be enabled depending on the user's tier (11 agents total).
// - The UI must not expose model selection.
//
// IMPORTANT: Agent IDs here are the IDs Mission Control assigns tasks to.
// For full automation, these IDs must correspond to OpenClaw agent IDs
// available to sessions_spawn.

export const AGENT_CONFIG = {
  brand: {
    name: 'ClawBot',
    subtitle: 'Your AI team in Mission Control',
  },

  // Canonical 11-agent topology
  agents: [
    { id: 'main', name: 'Leader', emoji: '🧭', role: 'Leader/Orchestrator', focus: 'Plans, assigns, reviews, summarizes' },

    { id: 'claude1', name: 'Backend', emoji: '🧱', role: 'Backend Engineer', focus: 'APIs, data model, integrations' },
    { id: 'claude2', name: 'Frontend', emoji: '🖥️', role: 'Frontend Engineer', focus: 'UI, components, UX implementation' },
    { id: 'claude3', name: 'Sec/DevOps', emoji: '🛡️', role: 'Security & DevOps', focus: 'Threat model, hardening, deployment' },

    { id: 'tanel', name: 'PM', emoji: '🗺️', role: 'Product/Project Manager', focus: 'Milestones, scope, acceptance criteria' },

    { id: 'gpt4research', name: 'Research', emoji: '🔎', role: 'Market Research', focus: 'Benchmarks, competitors, references' },
    { id: 'gpt4writing', name: 'Copy', emoji: '✍️', role: 'Copywriting', focus: 'Onboarding copy, product text, docs tone' },
    { id: 'gpt4ux', name: 'UX', emoji: '🧩', role: 'UX Designer', focus: 'Flows, edge cases, IA' },
    { id: 'gpt4seo', name: 'SEO', emoji: '📈', role: 'SEO Specialist', focus: 'Public web presence & discoverability' },
    { id: 'gpt4data', name: 'Data', emoji: '📊', role: 'Usage/Cost Intelligence', focus: 'Telemetry, cost, budgets' },
    { id: 'gpt4test', name: 'QA', emoji: '🧪', role: 'QA/Critic', focus: 'Test plans, regression, critique' },
  ] as const,
};

export type AgentId = typeof AGENT_CONFIG.agents[number]['id'];

export function getAgentById(id: string) {
  return AGENT_CONFIG.agents.find((a) => a.id === id);
}

// Mission Control consumer configuration
//
// Constraints:
// - Leader AI is always present.
// - Up to 11 Worker AIs can be enabled depending on the user's tier.
// - The UI must not expose model selection.
//
// IMPORTANT: Agent IDs here are the IDs Mission Control assigns tasks to.
// For full automation, these IDs must correspond to OpenClaw agent IDs
// available to sessions_spawn.

export const AGENT_CONFIG = {
  brand: {
    name: 'Multi Ai',
    subtitle: 'Your AI team in one place',
  },

  agents: [
    { id: 'leader', name: 'Leader', emoji: '🧭', role: 'Leader AI', focus: 'Plans, assigns, summarizes' },

    { id: 'worker1', name: 'Worker 1', emoji: '①', role: 'Worker AI', focus: 'Role template driven' },
    { id: 'worker2', name: 'Worker 2', emoji: '②', role: 'Worker AI', focus: 'Role template driven' },
    { id: 'worker3', name: 'Worker 3', emoji: '③', role: 'Worker AI', focus: 'Role template driven' },
    { id: 'worker4', name: 'Worker 4', emoji: '④', role: 'Worker AI', focus: 'Role template driven' },
    { id: 'worker5', name: 'Worker 5', emoji: '⑤', role: 'Worker AI', focus: 'Role template driven' },
    { id: 'worker6', name: 'Worker 6', emoji: '⑥', role: 'Worker AI', focus: 'Role template driven' },
    { id: 'worker7', name: 'Worker 7', emoji: '⑦', role: 'Worker AI', focus: 'Role template driven' },
    { id: 'worker8', name: 'Worker 8', emoji: '⑧', role: 'Worker AI', focus: 'Role template driven' },
    { id: 'worker9', name: 'Worker 9', emoji: '⑨', role: 'Worker AI', focus: 'Role template driven' },
    { id: 'worker10', name: 'Worker 10', emoji: '⑩', role: 'Worker AI', focus: 'Role template driven' },
    { id: 'worker11', name: 'Worker 11', emoji: '⑪', role: 'Worker AI', focus: 'Role template driven' },
  ] as const,
};

export type AgentId = typeof AGENT_CONFIG.agents[number]['id'];

export function getAgentById(id: string) {
  return AGENT_CONFIG.agents.find((a) => a.id === id);
}

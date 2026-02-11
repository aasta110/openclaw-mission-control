"use client";

import { useEffect, useMemo, useState } from 'react';
import { AI_COUNT_OPTIONS, TIERS, TierId } from '@/lib/consumer-config';

type ConsumerState = {
  onboardingComplete: boolean;
  tierId: TierId;
  userName?: string;
  leaderName?: string;
  projectBrief?: string;
  autoCreationMode?: 'auto' | 'manual';
  aiCountTotal?: number;
};

export default function StartPage() {
  const [state, setState] = useState<ConsumerState | null>(null);
  const [step, setStep] = useState<
    | 'loading'
    | 'name'
    | 'leaderName'
    | 'project'
    | 'creationMode'
    | 'aiCount'
    | 'done'
  >('loading');

  const [userName, setUserName] = useState('');
  const [leaderName, setLeaderName] = useState('');
  const [projectBrief, setProjectBrief] = useState('');
  const [autoMode, setAutoMode] = useState<'auto' | 'manual'>('auto');
  const [aiCount, setAiCount] = useState<number>(5);

  const tier = useMemo(() => (state ? TIERS[state.tierId] : TIERS.free), [state]);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/consumer', { cache: 'no-store' });
      const data = await res.json();
      if (data?.success) {
        setState(data.state);

        if (data.state?.onboardingComplete) {
          setStep('done');
          return;
        }

        setUserName(data.state?.userName || '');
        setLeaderName(data.state?.leaderName || '');
        setProjectBrief(data.state?.projectBrief || '');
        setAutoMode(data.state?.autoCreationMode || 'auto');
        setAiCount(typeof data.state?.aiCountTotal === 'number' ? data.state.aiCountTotal : 5);

        // First question always starts at name.
        setStep('name');
      }
    })();
  }, []);

  async function patch(patch: Partial<ConsumerState>) {
    const res = await fetch('/api/consumer', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (data?.success) setState(data.state);
  }

  async function finishAndCreate() {
    await patch({
      userName: userName.trim(),
      leaderName: leaderName.trim(),
      projectBrief: projectBrief.trim(),
      autoCreationMode: autoMode,
      aiCountTotal: aiCount,
    });

    const res = await fetch('/api/consumer/bootstrap', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });

    const data = await res.json();
    if (data?.success) {
      await patch({ onboardingComplete: true });
      window.location.href = '/';
    } else {
      alert(data?.error || 'Failed to create your AI team');
    }
  }

  if (step === 'loading' || !state) {
    return (
      <div className="p-8 text-text-secondary">Loading…</div>
    );
  }

  if (step === 'done') {
    return (
      <div className="p-8">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h1 className="font-display text-xl text-text-primary">Setup complete</h1>
          <p className="mt-2 text-sm text-text-secondary">Taking you to Mission Control…</p>
          <button
            className="mt-6 px-4 py-2 rounded-xl btn-glow text-void"
            onClick={() => (window.location.href = '/')}
          >
            Open Mission Control
          </button>
        </div>
      </div>
    );
  }

  const disabledByTier = (n: number) => n > tier.maxAIsTotal;

  return (
    <div className="min-h-[calc(100vh-60px)] flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="text-xs text-text-muted">Leader AI</div>
          <div className="mt-1 font-display text-lg text-text-primary">
            {state.leaderName || 'Leader'}
          </div>
          <div className="mt-2 text-sm text-text-secondary">
            I’ll ask a few quick questions to set up your project.
          </div>

          {/* Step: What is your name? */}
          {step === 'name' && (
            <div className="mt-6">
              <div className="text-sm text-text-primary">What is your name?</div>
              <input
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 text-text-primary"
                placeholder="e.g. Alex"
              />
              <div className="mt-4 flex justify-end">
                <button
                  className="px-4 py-2 rounded-xl btn-glow text-void"
                  onClick={async () => {
                    if (!userName.trim()) return;
                    await patch({ userName: userName.trim() });
                    setStep('leaderName');
                  }}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step: What should I call myself? */}
          {step === 'leaderName' && (
            <div className="mt-6">
              <div className="text-sm text-text-primary">What should I call myself?</div>
              <input
                value={leaderName}
                onChange={(e) => setLeaderName(e.target.value)}
                className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 text-text-primary"
                placeholder="e.g. Atlas"
              />
              <div className="mt-4 flex justify-between">
                <button
                  className="px-4 py-2 rounded-xl bg-white/6 border border-white/10"
                  onClick={() => setStep('name')}
                >
                  Back
                </button>
                <button
                  className="px-4 py-2 rounded-xl btn-glow text-void"
                  onClick={async () => {
                    if (!leaderName.trim()) return;
                    await patch({ leaderName: leaderName.trim() });
                    setStep('project');
                  }}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step: What kind of project do you want to build? */}
          {step === 'project' && (
            <div className="mt-6">
              <div className="text-sm text-text-primary">What kind of project do you want to build?</div>
              <input
                value={projectBrief}
                onChange={(e) => setProjectBrief(e.target.value)}
                className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 text-text-primary"
                placeholder="e.g. A coffee website that sells coffee"
              />
              <div className="mt-4 flex justify-between">
                <button
                  className="px-4 py-2 rounded-xl bg-white/6 border border-white/10"
                  onClick={() => setStep('leaderName')}
                >
                  Back
                </button>
                <button
                  className="px-4 py-2 rounded-xl btn-glow text-void"
                  onClick={async () => {
                    if (!projectBrief.trim()) return;
                    await patch({ projectBrief: projectBrief.trim() });
                    setStep('creationMode');
                  }}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step: auto-create? */}
          {step === 'creationMode' && (
            <div className="mt-6">
              <div className="text-sm text-text-primary">
                Should I create the other AIs automatically, or would you like to create them yourself?
              </div>
              <div className="mt-3 flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm text-text-secondary">
                  <input
                    type="radio"
                    checked={autoMode === 'auto'}
                    onChange={() => setAutoMode('auto')}
                  />
                  Automatic (recommended)
                </label>
                <label className="flex items-center gap-2 text-sm text-text-secondary">
                  <input
                    type="radio"
                    checked={autoMode === 'manual'}
                    onChange={() => setAutoMode('manual')}
                    disabled={tier.autoCreationLimited}
                  />
                  Manual
                  {tier.autoCreationLimited && (
                    <span className="text-xs text-text-muted">(Limited on Free tier)</span>
                  )}
                </label>
              </div>

              <div className="mt-4 flex justify-between">
                <button
                  className="px-4 py-2 rounded-xl bg-white/6 border border-white/10"
                  onClick={() => setStep('project')}
                >
                  Back
                </button>
                <button
                  className="px-4 py-2 rounded-xl btn-glow text-void"
                  onClick={async () => {
                    await patch({ autoCreationMode: autoMode });
                    setStep(autoMode === 'auto' ? 'aiCount' : 'aiCount');
                  }}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step: ai count */}
          {step === 'aiCount' && (
            <div className="mt-6">
              <div className="text-sm text-text-primary">How many AIs should work on this project?</div>
              <div className="mt-1 text-xs text-text-muted">
                More AIs will use your monthly budget faster.
              </div>

              <div className="mt-4 grid grid-cols-5 gap-2">
                {AI_COUNT_OPTIONS.map((n) => {
                  const disabled = disabledByTier(n);
                  const active = aiCount === n;
                  return (
                    <button
                      key={n}
                      disabled={disabled}
                      onClick={() => setAiCount(n)}
                      className={
                        'rounded-xl px-3 py-3 text-sm border transition ' +
                        (disabled
                          ? 'bg-white/3 border-white/5 text-text-muted cursor-not-allowed'
                          : active
                            ? 'bg-cyan/20 border-cyan/40 text-text-primary'
                            : 'bg-white/6 border-white/10 text-text-secondary hover:bg-white/10')
                      }
                    >
                      {n}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 text-xs text-text-muted">
                Your tier: <span className="text-text-secondary">{tier.name}</span> • Max AIs: <span className="text-text-secondary">{tier.maxAIsTotal}</span> • Monthly budget: <span className="text-text-secondary">€{tier.budgetEurMonthly.toFixed(2)}</span>
              </div>

              <div className="mt-6 flex justify-between">
                <button
                  className="px-4 py-2 rounded-xl bg-white/6 border border-white/10"
                  onClick={() => setStep('creationMode')}
                >
                  Back
                </button>
                <button
                  className="px-4 py-2 rounded-xl btn-glow text-void"
                  onClick={finishAndCreate}
                >
                  Create my AI team
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 text-xs text-text-muted">
          This runs locally. You won’t see API keys or model settings.
        </div>
      </div>
    </div>
  );
}

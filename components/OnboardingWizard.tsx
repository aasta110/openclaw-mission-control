'use client';

import { useEffect, useMemo, useState } from 'react';

type TierId = 'free' | 'pro' | 'plus' | 'max';

const TIERS: Array<{ id: TierId; name: string; maxAis: number; monthlyBudgetEur: number }> = [
  { id: 'free', name: 'Free', maxAis: 2, monthlyBudgetEur: 2.5 },
  { id: 'pro', name: 'Pro', maxAis: 7, monthlyBudgetEur: 12.5 },
  { id: 'plus', name: 'Plus', maxAis: 12, monthlyBudgetEur: 50 },
  { id: 'max', name: 'Max', maxAis: 12, monthlyBudgetEur: 80 },
];

function clampTotalAis(n: number, tierMax: number) {
  return Math.max(1, Math.min(tierMax, n));
}

export default function OnboardingWizard(props: { onDone?: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [userName, setUserName] = useState('');
  const [assistantName, setAssistantName] = useState('');
  const [projectIdea, setProjectIdea] = useState('');

  const [tierId, setTierId] = useState<TierId>('free');
  const tier = useMemo(() => TIERS.find((t) => t.id === tierId) || TIERS[0], [tierId]);

  // Total AIs including leader
  const [totalAis, setTotalAis] = useState<number>(2);

  // flow
  const [step, setStep] = useState<number>(1);
  const [mode, setMode] = useState<'auto' | 'manual' | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const r = await fetch('/api/app-state', { cache: 'no-store' });
        const j = await r.json();
        if (!mounted) return;

        const s = j?.state;
        if (s?.onboarded) {
          setOpen(false);
        } else {
          setOpen(true);
        }
      } catch {
        setOpen(true);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    // Keep totalAis within tier max
    setTotalAis((n) => clampTotalAis(n, tier.maxAis));
  }, [tier.maxAis]);

  if (!open) return null;

  const disableNext =
    (step === 1 && userName.trim().length === 0) ||
    (step === 2 && assistantName.trim().length === 0) ||
    (step === 3 && projectIdea.trim().length === 0) ||
    (step === 4 && !mode) ||
    (step === 5 && mode === 'auto' && ![2, 3, 5, 7, 12].includes(totalAis));

  const options = [2, 3, 5, 7, 12];

  const start = async () => {
    // manual mode: just save onboarding answers and let user create tasks
    if (mode === 'manual') {
      await fetch('/api/app-state', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName,
          assistantName,
          projectIdea,
          tierId,
          totalAis: 1,
          onboarded: true,
        }),
      });

      setOpen(false);
      props.onDone?.();
      return;
    }

    // auto mode
    const r = await fetch('/api/setup/bootstrap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userName,
        assistantName,
        projectIdea,
        tierId,
        totalAis,
      }),
    });

    const j = await r.json();
    if (!j?.success) {
      alert(j?.error || 'Failed to start');
      return;
    }

    setOpen(false);
    props.onDone?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative w-full max-w-2xl rounded-3xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-surface/95 to-deep/95" />
        <div className="absolute inset-0 border border-white/10 rounded-3xl" />

        <div className="relative p-6 md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-display text-lg text-text-primary">Welcome</div>
              <div className="font-body text-sm text-text-secondary mt-1">
                I’m your Leader AI. I’ll build your project team and keep everything on track.
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-[11px] text-text-muted">Step {step} / 5</div>
              <button
                onClick={async () => {
                  // Allow skipping onboarding entirely (persisted)
                  try {
                    await fetch('/api/app-state', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ onboarded: true }),
                    });
                  } catch {
                    // ignore
                  }
                  setOpen(false);
                  props.onDone?.();
                }}
                className="mt-2 px-3 py-1.5 rounded-full bg-white/6 border border-white/10 hover:bg-white/10 transition-colors text-[11px] text-text-secondary"
                title="Hide onboarding and go to Mission Control"
              >
                Skip onboarding
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            {step === 1 ? (
              <Q
                label="What is your name?"
                value={userName}
                onChange={setUserName}
                placeholder="e.g. Henry"
              />
            ) : null}

            {step === 2 ? (
              <Q
                label="What should I call myself?"
                value={assistantName}
                onChange={setAssistantName}
                placeholder="e.g. Atlas"
              />
            ) : null}

            {step === 3 ? (
              <Q
                label="What kind of project do you want to build?"
                value={projectIdea}
                onChange={setProjectIdea}
                placeholder="e.g. A coffee website that sells coffee"
              />
            ) : null}

            {step === 4 ? (
              <div className="grid gap-3">
                <div className="font-body text-sm text-text-secondary">
                  Should I create the other AIs automatically, or would you like to create them yourself?
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Choice
                    title="Automatic (recommended)"
                    desc="I’ll create a team with roles and tasks for you."
                    selected={mode === 'auto'}
                    onClick={() => setMode('auto')}
                  />
                  <Choice
                    title="Manual"
                    desc="You create AIs and tasks yourself (advanced)."
                    selected={mode === 'manual'}
                    onClick={() => setMode('manual')}
                  />
                </div>

                <div className="mt-2 rounded-2xl bg-white/6 border border-white/10 p-4">
                  <div className="font-body text-xs text-text-muted">Pricing tier</div>
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                    {TIERS.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTierId(t.id)}
                        className={
                          'px-3 py-2 rounded-xl border text-xs font-body transition-colors ' +
                          (tierId === t.id
                            ? 'bg-cyan/15 border-cyan/30 text-text-primary'
                            : 'bg-white/6 border-white/10 text-text-secondary hover:bg-white/10')
                        }>
                        <div className="font-display text-xs">{t.name}</div>
                        <div className="font-mono text-[10px] text-text-muted mt-0.5">
                          €{t.monthlyBudgetEur}/mo
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {step === 5 && mode === 'auto' ? (
              <div className="grid gap-3">
                <div className="font-body text-sm text-text-secondary">
                  How many AIs should work on this project?
                </div>

                <div className="font-body text-xs text-warning">
                  More AIs will use your monthly budget faster.
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {options.map((n) => {
                    const disabled = n > tier.maxAis;
                    const selected = totalAis === n;
                    return (
                      <button
                        key={n}
                        disabled={disabled}
                        onClick={() => setTotalAis(n)}
                        className={
                          'px-3 py-2 rounded-xl border text-xs font-mono transition-colors ' +
                          (disabled
                            ? 'bg-white/4 border-white/8 text-text-muted opacity-50 cursor-not-allowed'
                            : selected
                              ? 'bg-cyan/15 border-cyan/30 text-text-primary'
                              : 'bg-white/6 border-white/10 text-text-secondary hover:bg-white/10')
                        }>
                        {n}
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-2xl bg-white/6 border border-white/10 p-4">
                  <div className="font-body text-xs text-text-muted">Your limits</div>
                  <div className="mt-1 font-body text-sm text-text-primary">
                    Up to {tier.maxAis} AIs • Monthly budget €{tier.monthlyBudgetEur}
                  </div>
                </div>
              </div>
            ) : null}

            {step === 5 && mode === 'manual' ? (
              <div className="rounded-2xl bg-white/6 border border-white/10 p-4">
                <div className="font-body text-sm text-text-primary">Manual setup</div>
                <div className="mt-2 font-body text-sm text-text-secondary">
                  I’ll save your answers and open Mission Control. You can create tasks and assign them yourself.
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1}
              className={
                'px-4 py-2 rounded-xl border text-xs font-body transition-colors ' +
                (step === 1
                  ? 'bg-white/4 border-white/8 text-text-muted opacity-50 cursor-not-allowed'
                  : 'bg-white/6 border-white/10 text-text-secondary hover:bg-white/10')
              }>
              Back
            </button>

            {step < 5 ? (
              <button
                onClick={() => setStep((s) => Math.min(5, s + 1))}
                disabled={disableNext || loading}
                className={
                  'px-5 py-2 rounded-xl text-xs font-display tracking-wide transition-colors ' +
                  (disableNext || loading ? 'bg-white/10 text-text-muted cursor-not-allowed' : 'btn-glow text-void')
                }>
                Next
              </button>
            ) : (
              <button
                onClick={start}
                disabled={disableNext || loading}
                className={
                  'px-5 py-2 rounded-xl text-xs font-display tracking-wide transition-colors ' +
                  (disableNext || loading ? 'bg-white/10 text-text-muted cursor-not-allowed' : 'btn-glow text-void')
                }>
                Start
              </button>
            )}
          </div>

          <div className="mt-4 text-[11px] text-text-muted font-body">
            Everything runs locally. Budget limits are enforced automatically.
          </div>
        </div>
      </div>
    </div>
  );
}

function Q(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="grid gap-2">
      <div className="font-body text-sm text-text-secondary">{props.label}</div>
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        className="w-full px-4 py-3 rounded-2xl bg-white/6 border border-white/10 focus:outline-none focus:ring-2 focus:ring-cyan/40 text-text-primary font-body"
      />
    </div>
  );
}

function Choice(props: {
  title: string;
  desc: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={props.onClick}
      className={
        'text-left p-4 rounded-2xl border transition-colors ' +
        (props.selected
          ? 'bg-cyan/15 border-cyan/30'
          : 'bg-white/6 border-white/10 hover:bg-white/10')
      }>
      <div className="font-display text-sm text-text-primary">{props.title}</div>
      <div className="mt-1 font-body text-sm text-text-secondary">{props.desc}</div>
    </button>
  );
}

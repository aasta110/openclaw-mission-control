import ActivityLog from '@/components/ActivityLog';

export const dynamic = 'force-dynamic';

export default function EventsPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-baseline justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
        <div className="text-sm text-white/60">Live feed of UI + OpenClaw + system events</div>
      </div>

      <ActivityLog />
    </div>
  );
}

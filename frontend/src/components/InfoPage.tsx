import { OrnamentDivider } from "./Brand";

export function InfoPage({
  eyebrow,
  title,
  intro,
  sample = true,
  children,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  sample?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold-ink">{eyebrow}</p>
        <h1 className="mt-2 text-5xl sm:text-6xl">{title}</h1>
        {intro && <p className="mt-4 text-lg text-muted">{intro}</p>}
      </header>
      {sample && (
        <aside role="note" className="mb-8 border-l-4 border-gold bg-parchment px-4 py-3 text-sm">
          <strong>Sample text for a demo store.</strong> This page has not been approved by any business or lawyer and must be replaced before a real launch.
        </aside>
      )}
      <OrnamentDivider className="mb-8" />
      <div className="prose-sample">{children}</div>
    </div>
  );
}

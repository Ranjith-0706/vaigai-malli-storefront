"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="mx-auto max-w-xl px-4 py-28 text-center" role="alert">
      <h1 className="text-5xl">Something went wrong</h1>
      <p className="mt-4 text-muted">
        We could not load this page. If you are running the demo locally, check that the API is running on port 8010.
        {error.digest && <span className="block pt-2 font-mono text-xs">Reference: {error.digest}</span>}
      </p>
      <button className="btn btn-primary mt-8" onClick={reset}>
        Try again
      </button>
    </main>
  );
}

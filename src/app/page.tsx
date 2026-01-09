export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <main className="flex flex-col items-center gap-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          WorkoutDeck
        </h1>
        <p className="max-w-md text-lg text-zinc-400">
          Your personal workout companion with YouTube videos, interval timers,
          and exercise cues.
        </p>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row">
          <a
            href="/videos"
            className="flex h-12 items-center justify-center rounded-lg bg-green-600 px-8 font-medium text-white transition-colors hover:bg-green-700"
          >
            Browse Videos
          </a>
          <a
            href="/timer"
            className="flex h-12 items-center justify-center rounded-lg border border-zinc-700 px-8 font-medium transition-colors hover:bg-zinc-800"
          >
            Open Timer
          </a>
        </div>
      </main>
    </div>
  );
}

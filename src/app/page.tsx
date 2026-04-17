import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center py-12 sm:py-20">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          <span className="text-green-500">Workout</span>
          <span>Deck</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400 sm:text-xl">
          Your personal workout companion with YouTube videos, interval timers,
          and exercise cues.
        </p>
      </div>

      <div className="mt-12 grid w-full max-w-2xl gap-4 sm:grid-cols-3">
        <Link
          href="/videos"
          className="flex min-h-[80px] flex-col items-center justify-center rounded-xl bg-green-600 p-6 text-center font-medium text-white transition-colors hover:bg-green-700 sm:min-h-[120px]"
        >
          <span className="text-2xl sm:text-3xl">Videos</span>
          <span className="mt-1 text-sm text-green-100 sm:text-base">Browse your library</span>
        </Link>

        <Link
          href="/timer"
          className="flex min-h-[80px] flex-col items-center justify-center rounded-xl bg-blue-600 p-6 text-center font-medium text-white transition-colors hover:bg-blue-700 sm:min-h-[120px]"
        >
          <span className="text-2xl sm:text-3xl">Timer</span>
          <span className="mt-1 text-sm text-blue-100 sm:text-base">Interval training</span>
        </Link>

        <Link
          href="/history"
          className="flex min-h-[80px] flex-col items-center justify-center rounded-xl bg-yellow-500 p-6 text-center font-medium text-black transition-colors hover:bg-yellow-400 sm:min-h-[120px]"
        >
          <span className="text-2xl sm:text-3xl">History</span>
          <span className="mt-1 text-sm text-yellow-950 sm:text-base">Track progress</span>
        </Link>
      </div>
    </div>
  );
}

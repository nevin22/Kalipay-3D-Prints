import Link from "next/link";
import HomeTitle from "@/components/HomeTitle";

const FEATURES = [
  { href: "/keycaps", name: "Fidget Keycaps", accent: "from-[#ff8a4c] to-[#ffc46b]", text: "Design a custom fidget keycap with your name, initials or favorite word, ready to 3D print." },
  { href: "/keychains", soon: true, name: "Keychains", accent: "from-[#6c8dff] to-[#b57cff]", text: "Make a personalized keychain for yourself, or as a gift for someone special." },
  { href: "/vases", soon: true, name: "Vases", accent: "from-[#5fd8b4] to-[#6cc4ff]", text: "Create a one-of-a-kind vase to brighten up any room." },
];

export default function Home() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center gap-8 bg-[#f4f3f0] bg-[url(/images/floor-small.svg)] bg-cover bg-center px-4 pb-16 pt-10 text-neutral-900">
      <HomeTitle />

      <nav className="grid w-full max-w-3xl gap-4 sm:grid-cols-3">
        {FEATURES.map((f) => {
          const body = (
            <>
              <div className={`mx-auto mb-3 h-1.5 w-12 rounded-full bg-gradient-to-r ${f.accent}`} />
              <h2 className={`bg-gradient-to-r ${f.accent} bg-clip-text text-xl font-extrabold tracking-tight text-transparent`}>{f.name}</h2>
              <p className="mt-2 text-balance text-sm leading-relaxed text-neutral-700">{f.text}</p>
            </>
          );
          // Not built yet: a plain box, not a link, so it cannot be opened from here.
          if (f.soon)
            return (
              <div key={f.href} aria-disabled className="relative cursor-not-allowed select-none overflow-hidden rounded-2xl text-center glass glass-blur p-5">
                <div className="opacity-50">{body}</div>
                <span className="absolute -left-9 top-5 w-32 -rotate-45 bg-gradient-to-r from-[#ff6b5e] to-[#e53935] whitespace-nowrap py-0.5 text-center text-[8px] font-semibold uppercase tracking-wide text-white shadow [text-shadow:0_1px_1px_rgba(0,0,0,0.35)]">
                  Coming soon
                </span>
              </div>
            );
          return (
            <Link
              key={f.href}
              href={f.href}
              className="rounded-2xl text-center glass glass-blur p-5 outline-none transition hover:-translate-y-0.5 hover:border-orange-400 focus-visible:border-orange-400 focus-visible:ring-2 focus-visible:ring-orange-300/40"
            >
              {body}
            </Link>
          );
        })}
      </nav>

      <a
        href="https://www.facebook.com/profile.php?id=61581448113902"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full glass glass-blur px-4 py-2 text-sm font-medium text-neutral-700 transition hover:-translate-y-0.5 hover:text-[#1877f2]"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-[#1877f2]" aria-hidden>
          <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.69.24 2.69.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.88v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
        </svg>
        Follow us on Facebook
      </a>
    </main>
  );
}

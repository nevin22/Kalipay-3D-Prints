import Image from "next/image";
import Link from "next/link";
import HomeTitle from "@/components/HomeTitle";

const FEATURES = [
  { href: "/keycaps", icon: "fidget-keycap", name: "Fidget Keycaps", title: "from-[#e8590c] to-[#d97706]", text: "Design a custom fidget keycap with your name, initials or favorite word, ready to 3D print." },
  { href: "/keychains", soon: true, icon: "keychain", name: "Keychains", title: "from-[#4a6cf0] to-[#9333ea]", text: "Make a personalized keychain for yourself, or as a gift for someone special." },
  { href: "/vases", soon: true, icon: "vase", name: "Vases", title: "from-[#0f9d74] to-[#0284c7]", text: "Create a one-of-a-kind vase to brighten up any room." },
] as const;

export default function Home() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center gap-8 bg-[#f4f3f0] bg-[url(/images/floor-small.svg)] bg-cover bg-center px-4 pb-16 pt-10 text-neutral-900">
      <HomeTitle />

      <nav aria-label="Features" className="w-full max-w-xl overflow-hidden rounded-3xl glass !bg-white/20 backdrop-blur-[6px] backdrop-saturate-150">
        <ul className="divide-y divide-white/70">
          {FEATURES.map((f) => {
            const soon = "soon" in f;
            const row = (
              <>
                <Image src={`/images/icon-${f.icon}.webp`} alt="" width={64} height={64} unoptimized className="h-16 w-16 shrink-0 drop-shadow-[0_4px_5px_rgb(0_0_0/0.28)]" />
                <span className={`min-w-0 flex-1 ${soon ? "opacity-60" : ""}`}>
                  <span className="flex items-center gap-2">
                    <span className={`bg-gradient-to-r bg-clip-text text-lg font-extrabold tracking-tight text-transparent ${f.title}`}>{f.name}</span>
                    {soon && <span className="rounded-full bg-neutral-900/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">Coming soon</span>}
                  </span>
                  <span className="mt-0.5 block text-balance text-sm leading-snug text-neutral-700">{f.text}</span>
                </span>
                {!soon && (
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-b from-[#ffa066] to-[#e8590c] text-white shadow-[0_3px_6px_rgb(0_0_0/0.2),inset_0_2px_0_rgb(255_255_255/0.45)] transition group-hover:scale-110">
                    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current transition group-hover:translate-x-0.5" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M5 12h14m-6-6 6 6-6 6" />
                    </svg>
                  </span>
                )}
              </>
            );
            // Not built yet: a plain row, not a link, so it cannot be opened from here.
            return (
              <li key={f.href}>
                {soon ? (
                  <div aria-disabled className="flex cursor-not-allowed select-none items-center gap-4 p-4">{row}</div>
                ) : (
                  <Link
                    href={f.href}
                    className="group flex items-center gap-4 p-4 outline-none transition hover:bg-white/40 focus-visible:bg-white/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-400"
                  >
                    {row}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
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

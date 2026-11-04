import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The designer page frame: the 3D view and the sidebar of controls. The view comes first: on
 * top on a phone, on the left when the phone is on its side, and behind the floating sidebar
 * on a laptop. Same markup as the keycap page.
 */
export default function StudioLayout({ canvas, children }: { canvas: ReactNode; children: ReactNode }) {
  return (
    <main className="relative flex h-dvh w-screen flex-col overflow-hidden bg-[#f4f3f0] short:flex-row desk:block">
      <section className="relative h-[40dvh] shrink-0 short:h-auto short:min-w-0 short:flex-1 desk:absolute desk:inset-0 desk:h-auto">
        {canvas}
        <Image
          src="/images/profile.jpg"
          alt="Kalipay Prints 3D"
          width={144}
          height={144}
          className="absolute bottom-3 right-3 z-10 h-14 w-14 rounded-full border-2 border-white object-cover shadow-lg desk:bottom-6 desk:right-6 desk:h-[144px] desk:w-[144px]"
        />
      </section>

      <aside className="z-10 flex min-h-0 flex-1 flex-col gap-2 [&>*]:shrink-0 overflow-y-auto overflow-x-hidden border-t border-white/80 bg-white/90 p-3 text-neutral-900 short:w-[22rem] short:flex-none short:border-l short:border-t-0 desk:absolute desk:left-0 desk:top-0 desk:h-full desk:w-[27rem] desk:flex-none desk:border-r desk:border-t-0 desk:bg-transparent desk:bg-gradient-to-b desk:from-white/50 desk:to-white/20 desk:shadow-[inset_-1px_0_0_rgba(255,255,255,0.7),inset_0_1px_0_rgba(255,255,255,1),inset_0_0_40px_rgba(255,255,255,0.35),8px_0_40px_rgba(0,0,0,0.15)] desk:backdrop-blur-3xl desk:backdrop-saturate-200">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            aria-label="Home"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#ff8a4c] to-[#ffc46b] text-white shadow-md transition hover:brightness-110 touch:h-10 touch:w-10"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 touch:h-5 touch:w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10" />
            </svg>
          </Link>
          <h1 className="flex-1 whitespace-nowrap bg-gradient-to-r from-[#ff8a4c] via-[#b57cff] to-[#5fd8b4] bg-clip-text py-0.5 text-center text-[3vw] font-bold uppercase tracking-[0.08em] desk:text-[14px] desk:tracking-[0.12em] text-transparent">
            <Link href="/" className="hover:opacity-70">Kalipay3dprints</Link>
          </h1>
          {/* Same width as the home button, so the title stays centered. */}
          <span className="h-7 w-7 shrink-0 touch:w-10" aria-hidden />
        </div>

        {children}
      </aside>
    </main>
  );
}

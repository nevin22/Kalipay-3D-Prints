import FeatureList from "@/components/FeatureList";
import HomeTitle from "@/components/HomeTitle";

export default function Home() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center gap-8 bg-[#f4f3f0] bg-[url(/images/floor-small.svg)] bg-cover bg-center px-4 pb-16 pt-10 text-neutral-900">
      <HomeTitle />

      <FeatureList />

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

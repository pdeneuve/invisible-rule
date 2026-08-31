export default function BrandingFooter() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-10 pointer-events-none print:hidden">
      <div className="max-w-7xl mx-auto px-4 pb-3 flex justify-center gap-4 text-[11px] text-slate-500">
        <a
          href="https://www.linkedin.com/in/pameladeneuve/"
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto hover:text-slate-300 transition-colors"
        >
          The Invisible Rule™ by Pamela DeNeuve
        </a>
        <span aria-hidden="true">·</span>
        <a
          href="/privacy"
          className="pointer-events-auto hover:text-slate-300 transition-colors"
        >
          Privacy
        </a>
      </div>
    </footer>
  );
}

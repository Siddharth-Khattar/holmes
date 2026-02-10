// ABOUTME: Layout for marketing/landing pages
// ABOUTME: Forces dark mode styling regardless of user theme preference

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: "var(--color-charcoal)",
        color: "var(--color-smoke)",
      }}
    >
      {children}
    </div>
  );
}

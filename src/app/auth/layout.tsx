import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-secondary via-bg-primary to-bg-secondary flex items-center justify-center px-6 py-12">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-light/10 rounded-full blur-3xl"></div>
      </div>

      {/* Logo */}
      <Link
        href="/"
        className="absolute top-8 left-8 text-2xl font-display font-bold text-accent"
      >
        EchoMe
      </Link>

      {/* Auth content */}
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}

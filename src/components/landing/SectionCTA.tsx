import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface SectionCTAProps {
  headline?: string;
  buttonText?: string;
  href?: string;
  trust?: string;
}

export function SectionCTA({
  headline = 'Ready to sound like yourself?',
  buttonText = 'Start Free',
  href = '/auth/signup',
  trust = 'No credit card required',
}: SectionCTAProps) {
  return (
    <div className="text-center mt-12">
      {headline && (
        <p className="text-xl md:text-2xl font-bold text-white mb-4">{headline}</p>
      )}
      <Link
        href={href}
        className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl font-bold hover:shadow-2xl hover:shadow-primary/25 hover:scale-105 transition-all shadow-lg text-lg group"
      >
        {buttonText}
        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
      </Link>
      {trust && (
        <p className="text-sm text-white/60 font-light mt-3">{trust}</p>
      )}
    </div>
  );
}

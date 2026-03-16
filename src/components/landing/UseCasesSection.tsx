'use client';

import { Mic, GraduationCap, Briefcase, Home } from 'lucide-react';
import { AnimatedSection } from '@/components/shared/AnimatedSection';

const useCases = [
  {
    role: 'Podcaster',
    icon: Mic,
    color: 'from-primary to-primary-dark',
    borderColor: 'border-primary/30',
    input: '1 podcast episode',
    outputs: ['5 viral reels', '12 social posts', '3 carousels', 'Newsletter'],
    impact: 'Saves 8 hours/week',
    description: 'Your conversations already contain the ideas. Echo pulls them out and writes the rest.',
  },
  {
    role: 'Real Estate Agent',
    icon: Home,
    color: 'from-accent-purple to-[#9775D8]',
    borderColor: 'border-accent-purple/30',
    input: '1 property tour',
    outputs: ['4 listing reels', '6 market posts', '2 carousels', 'Email campaign'],
    impact: 'Saves 6 hours/listing',
    description: 'You already know the property. Echo writes the listing content from your walkthrough, in your voice.',
  },
  {
    role: 'Course Creator',
    icon: GraduationCap,
    color: 'from-[#10B981] to-[#059669]',
    borderColor: 'border-[#10B981]/30',
    input: '1 lesson recording',
    outputs: ['3 tutorial clips', '8 LinkedIn posts', '2 Twitter threads', 'Blog post'],
    impact: 'Saves 10 hours/week',
    description: 'Your lessons already have the teaching moments. Echo finds them and writes the authority content.',
  },
  {
    role: 'Consultant',
    icon: Briefcase,
    color: 'from-[#F59E0B] to-[#D97706]',
    borderColor: 'border-[#F59E0B]/30',
    input: '1 client session',
    outputs: ['5 expertise clips', '10 thought posts', '3 carousels', 'Case study'],
    impact: 'Saves 12 hours/month',
    description: 'Your expertise is in the sessions. Echo turns it into content that shows future clients what you know.',
  },
];

export function UseCasesSection() {
  return (
    <AnimatedSection>
      <section className="py-32 px-6 bg-white relative overflow-hidden">
        {/* Ambient gradients */}
        <div className="absolute top-1/4 left-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-1/4 right-0 w-[600px] h-[600px] bg-accent-purple/5 rounded-full blur-3xl -z-10" />

        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-6">
              <span className="text-primary font-semibold text-sm">Use Cases</span>
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-7xl font-extrabold mb-6 text-foreground leading-tight">
              Built Around
              <span className="bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent">
                {' '}What You Already Do
              </span>
            </h2>
            <p className="text-xl md:text-2xl text-gray-600 font-light max-w-3xl mx-auto leading-relaxed">
              You&apos;re already recording. EchoMe turns that into a full content strategy, in your voice.
            </p>
          </div>

          {/* Use Case Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {useCases.map((useCase, index) => {
              const Icon = useCase.icon;
              return (
                <div
                  key={index}
                  className={`group relative bg-gradient-to-br from-gray-50 to-white rounded-2xl border-2 ${useCase.borderColor} p-8 hover:shadow-2xl transition-all hover:-translate-y-1`}
                >
                  {/* Icon & Role */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${useCase.color} flex items-center justify-center shadow-lg`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">{useCase.role}</h3>
                      <p className="text-sm text-gray-500">{useCase.impact}</p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    {useCase.description}
                  </p>

                  {/* Input → Outputs */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700">
                        {useCase.input}
                      </div>
                      <span className="text-gray-400">→</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {useCase.outputs.map((output, i) => (
                        <div
                          key={i}
                          className={`px-3 py-2 bg-gradient-to-br ${useCase.color} bg-opacity-10 border ${useCase.borderColor} rounded-lg text-sm font-medium text-gray-800 text-center`}
                        >
                          {output}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom CTA */}
          <div className="text-center mt-16">
            <p className="text-gray-500 text-lg">
              If you create content in any form, EchoMe already has something to work with.
            </p>
          </div>
        </div>
      </section>
    </AnimatedSection>
  );
}

import Image from 'next/image';
import Link from 'next/link';

export const metadata = {
  title: 'Regents Ready - Pass Your Regents. Simple as That.',
  description:
    'Targeted practice for NY Regents exams. Real questions, clear explanations, drawing tools, and progress tracking. Built by teachers, shaped by students.',
};

function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/beaver-images/logo.png"
            alt="Regents Ready"
            width={36}
            height={36}
            className="rounded-lg"
          />
          <span className="text-lg font-bold text-gray-900 tracking-tight">
            Regents Ready
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
            Features
          </a>
          <a href="#how-it-works" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
            How It Works
          </a>
          <a href="#who-its-for" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
            Who It&apos;s For
          </a>
        </div>

        <Link
          href="/dashboard"
          className="px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-full hover:bg-gray-800 transition-colors"
        >
          Start Practicing
        </Link>
      </div>
    </nav>
  );
}

function HeroSection() {
  return (
    <section className="pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Text */}
          <div className="flex-1 max-w-2xl">
            <p className="text-sm font-medium text-gray-500 mb-6 tracking-wide">
              Built by <span className="relative inline-block text-gray-900 font-semibold"><span className="relative z-10">teachers</span><span className="absolute bottom-0 left-0 w-full h-[40%] bg-amber-200/70 -z-0 -rotate-[0.5deg]" /></span>. Shaped by <span className="relative inline-block text-gray-900 font-semibold"><span className="relative z-10">students</span><span className="absolute bottom-0 left-0 w-full h-[40%] bg-blue-200/70 -z-0 rotate-[0.5deg]" /></span>.
            </p>

            <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-[1.1] tracking-tight">
              Pass Your Regents.{' '}
              <span className="text-blue-600">Simple as That.</span>
            </h1>

            <p className="mt-6 text-lg text-gray-600 leading-relaxed max-w-xl">
              Targeted practice. Clear explanations. No wasted time. Regents
              Ready helps students focus on exactly what&apos;s tested — so they
              walk into exam day prepared and confident.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-blue-600 text-white font-semibold rounded-full hover:bg-blue-700 transition-colors text-base shadow-lg shadow-blue-600/25"
              >
                Start Practicing
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </Link>
              <a
                href="#features"
                className="inline-flex items-center justify-center px-7 py-3.5 border-2 border-gray-200 text-gray-700 font-semibold rounded-full hover:border-gray-300 hover:bg-gray-50 transition-colors text-base"
              >
                See How It Works
              </a>
            </div>

            {/* Mini trust badges */}
            <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Real Regents-style questions</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>100% free to use</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>No account needed</span>
              </div>
            </div>
          </div>

          {/* Hero illustration */}
          <div className="flex-1 flex justify-center lg:justify-end">
            <div className="relative">
              <div className="absolute -inset-8 bg-gradient-to-br from-blue-100 via-sky-50 to-amber-50 rounded-[3rem] -z-10" />
              <Image
                src="/beaver-images/beaver-studying.png"
                alt="Beaver studying at desk"
                width={480}
                height={480}
                className="w-80 lg:w-[420px] h-auto drop-shadow-xl"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const features = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Built Exactly for the Regents',
    description:
      'Every question is aligned to New York State Regents standards — no random practice, no surprises.',
    color: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    title: 'Practice the Skills That Matter',
    description:
      'Questions are organized by skill, so students know what to study and where they need help.',
    color: 'bg-violet-50',
    iconColor: 'text-violet-600',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    ),
    title: 'Draw and Show Your Work On-Screen',
    description:
      'Students can draw, underline, circle, and annotate directly on the screen — just like working on paper. Perfect for math and diagrams.',
    color: 'bg-sky-50',
    iconColor: 'text-violet-600',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    title: 'Clear, Step-by-Step Explanations',
    description:
      'Every answer includes a clear explanation in plain English — so students understand why it\'s correct.',
    color: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Study Smarter, Not Longer',
    description:
      'Focused practice that mirrors the real Regents exam — without endless worksheets or busywork.',
    color: 'bg-rose-50',
    iconColor: 'text-rose-600',
  },
];

function FeaturesSection() {
  return (
    <section id="features" className="py-20 lg:py-28 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight">
            Why Regents Ready?
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Practice what&apos;s tested. Work it out. Don&apos;t just click.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.slice(0, 3).map((feature, index) => (
            <div
              key={index}
              className={`${feature.color} rounded-2xl p-8 transition-transform hover:-translate-y-1`}
            >
              <div
                className={`w-12 h-12 rounded-xl bg-white flex items-center justify-center ${feature.iconColor} shadow-sm mb-5`}
              >
                {feature.icon}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-col md:flex-row gap-6 mt-6 justify-center">
          {features.slice(3).map((feature, index) => (
            <div
              key={index + 3}
              className={`${feature.color} rounded-2xl p-8 transition-transform hover:-translate-y-1 md:w-[calc(33.333%-0.5rem)]`}
            >
              <div
                className={`w-12 h-12 rounded-xl bg-white flex items-center justify-center ${feature.iconColor} shadow-sm mb-5`}
              >
                {feature.icon}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const items = [
    'Practice real Regents-style questions',
    'Draw and work directly on the screen',
    'Get instant feedback and explanations',
    'Track progress by skill',
  ];

  return (
    <section id="how-it-works" className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          {/* Image side */}
          <div className="flex-1 flex justify-center">
            <div className="relative">
              <div className="absolute -inset-6 bg-gradient-to-br from-blue-100 via-indigo-50 to-violet-50 rounded-[3rem] -z-10" />
              <Image
                src="/beaver-images/beaver-tail-up.png"
                alt="Beaver with tail up"
                width={400}
                height={400}
                className="w-72 lg:w-96 h-auto rounded-3xl"
              />
            </div>
          </div>

          {/* Content side */}
          <div className="flex-1 max-w-xl">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight">
              Feels like paper.
              <br />
              Works like digital.
            </h2>
            <p className="mt-5 text-lg text-gray-600 leading-relaxed">
              Focused practice that mirrors the real Regents exam. No sign-ups,
              no distractions — just the tools students need to do their best
              work.
            </p>

            <ul className="mt-8 space-y-4">
              {items.map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-blue-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                  <span className="text-gray-700 font-medium">{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-10">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-gray-900 text-white font-semibold rounded-full hover:bg-gray-800 transition-colors"
              >
                Get Started
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const audiences = [
  {
    title: 'For Students',
    description:
      'Feel prepared — not panicked. Practice the exact skills that show up on test day.',
    image: '/beaver-images/beaver-hands-up.png',
    imageAlt: 'Excited beaver with hands up',
    bg: 'bg-blue-50',
    accent: 'text-blue-700',
  },
  {
    title: 'For Parents',
    description:
      'Clear progress. Meaningful practice. No busywork.',
    image: '/beaver-images/beaver-pointing.png',
    imageAlt: 'Beaver pointing',
    bg: 'bg-violet-50',
    accent: 'text-violet-700',
  },
  {
    title: 'For Teachers & Tutors',
    description:
      'Regents-aligned questions with tools students already know how to use.',
    image: '/beaver-images/beaver-waving.png',
    imageAlt: 'Beaver waving',
    bg: 'bg-amber-50',
    accent: 'text-amber-700',
  },
];

function WhoItsForSection() {
  return (
    <section id="who-its-for" className="py-20 lg:py-28 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight">
            Who It&apos;s For
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Whether you&apos;re studying, parenting, or teaching — Regents Ready
            fits into your workflow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {audiences.map((item, i) => (
            <div
              key={i}
              className={`${item.bg} rounded-2xl p-8 text-center transition-transform hover:-translate-y-1`}
            >
              <div className="flex justify-center mb-6">
                <Image
                  src={item.image}
                  alt={item.imageAlt}
                  width={160}
                  height={160}
                  className="w-32 h-32 object-contain drop-shadow-md"
                />
              </div>
              <h3 className={`text-xl font-bold ${item.accent} mb-3`}>
                {item.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-6">
        <div className="relative bg-gray-900 rounded-3xl px-8 py-16 lg:px-16 lg:py-20 overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-violet-600/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

          <div className="relative flex flex-col lg:flex-row items-center gap-10">
            {/* Content */}
            <div className="flex-1 text-center lg:text-left">
              <h2 className="text-3xl lg:text-4xl font-bold text-white tracking-tight">
                Ready to feel confident on{' '}
                <span className="text-blue-400">Regents exam day?</span>
              </h2>
              <p className="mt-4 text-lg text-gray-400 max-w-lg">
                Start practicing with Regents Ready. No sign-up required.
              </p>
              <div className="mt-8">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white font-semibold rounded-full hover:bg-blue-500 transition-colors text-lg shadow-lg shadow-blue-600/25"
                >
                  Get Started
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Beaver */}
            <div className="flex-shrink-0">
              <Image
                src="/beaver-images/beaver-confetti.png"
                alt="Celebrating beaver with confetti"
                width={280}
                height={280}
                className="w-52 lg:w-64 h-auto drop-shadow-2xl"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-gray-100 py-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Image
              src="/beaver-images/logo.png"
              alt="Regents Ready"
              width={28}
              height={28}
              className="rounded-md"
            />
            <span className="text-sm font-semibold text-gray-900">
              Regents Ready
            </span>
          </div>

          <p className="text-sm text-gray-500">
            Practice what&apos;s tested. Built by teachers. Shaped by students.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <WhoItsForSection />
      <CTASection />
      <Footer />
    </div>
  );
}

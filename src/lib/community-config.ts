export interface FAQItem {
  question: string;
  answer: string;
  category: FAQCategory;
}

export type FAQCategory =
  | 'getting-started'
  | 'voice-training'
  | 'content-generation'
  | 'billing'
  | 'features'
  | 'troubleshooting';

export const FAQ_CATEGORY_LABELS: Record<FAQCategory, string> = {
  'getting-started': 'Getting Started',
  'voice-training': 'Voice Training',
  'content-generation': 'Content Generation',
  billing: 'Billing & Plans',
  features: 'Features',
  troubleshooting: 'Troubleshooting',
};

// ── Office Hours Config ──────────────────────────────────────────────

export const OFFICE_HOURS_CONFIG = {
  dayOfWeek: 'Wednesday' as const,
  time: '11:30 AM ET',
  zoomLink: 'https://meet.tryechome.com', // Custom domain redirect → Zoom (no passcode shown publicly)
};

// ── FAQ Content ──────────────────────────────────────────────────────

export const FAQS: FAQItem[] = [
  // Getting Started
  {
    question: 'What is EchoMe?',
    answer:
      'EchoMe is an AI content platform that learns YOUR unique voice. Upload a video, and it generates social posts, carousels, blog articles, and email newsletters - all written the way you actually write and speak.',
    category: 'getting-started',
  },
  {
    question: 'How do free generations work?',
    answer:
      'You get 3 free lifetime generations - no credit card required. Each generation creates content for ALL platforms at once (Instagram, LinkedIn, Blog, Email, TikTok, and Video Script), so 3 generations = 18+ pieces of content.',
    category: 'getting-started',
  },
  {
    question: 'How is this different from ChatGPT?',
    answer:
      'ChatGPT writes generic AI content. EchoMe learns YOUR specific voice - your word choices, sentence patterns, and tone - so generated content sounds like you wrote it, not a robot.',
    category: 'getting-started',
  },
  {
    question: 'Do I need to be technical to use EchoMe?',
    answer:
      'Not at all. Upload a video or paste a link, and EchoMe handles everything - transcription, clip finding, voice matching, and content generation. If you can upload a file, you can use EchoMe.',
    category: 'getting-started',
  },

  // Voice Training
  {
    question: 'What can I upload to train my voice?',
    answer:
      'Blog posts, articles, PDFs, Word docs, social media posts, email exports (.mbox), voice recordings, and YouTube/Instagram imports. The more you add, the better EchoMe matches your style.',
    category: 'voice-training',
  },
  {
    question: 'How long does voice training take?',
    answer:
      'Voice training happens automatically as you add content to your Knowledge Base. Each piece of content is processed in seconds. The more content you add, the more accurately EchoMe captures your voice.',
    category: 'voice-training',
  },
  {
    question: 'Can I improve my voice match over time?',
    answer:
      'Yes! Your voice profile gets stronger with every piece of content you add to your Knowledge Base. We recommend adding a mix of written content and video transcripts for the best results.',
    category: 'voice-training',
  },

  // Content Generation
  {
    question: 'What video formats are supported?',
    answer:
      'MP4, MOV, AVI, and WebM files up to 5GB. We transcribe the audio, find the best clips, add captions, and generate a full content kit from your video.',
    category: 'content-generation',
  },
  {
    question: 'What platforms does EchoMe generate content for?',
    answer:
      'Instagram (posts & carousels), LinkedIn, TikTok, Blog articles, Email newsletters, and Video Scripts. Each generation creates content for all platforms simultaneously.',
    category: 'content-generation',
  },
  {
    question: 'Can I edit the generated content?',
    answer:
      'Absolutely. All generated content is fully editable. Think of EchoMe as your first draft machine - it gives you a strong starting point in your voice that you can refine as needed.',
    category: 'content-generation',
  },

  // Billing
  {
    question: 'How much does it cost?',
    answer:
      'Plans start at $37/mo (Echo), $87/mo (Echo Studio - most popular), and $47/voice/mo (Echo Teams, 2-voice min). You get 3 free generations to try before subscribing. Annual billing saves 17%.',
    category: 'billing',
  },
  {
    question: 'Can I cancel anytime?',
    answer:
      'Yes, you can cancel your subscription at any time. Your access continues until the end of your current billing period. No cancellation fees, no hassle.',
    category: 'billing',
  },
  {
    question: 'Do you offer team plans?',
    answer:
      'Yes! EchoTeams plans let you manage multiple voice profiles from one account. Plans start at $129/mo for 2 voices, $179/mo for 5 voices, and $249/mo for 10 voices.',
    category: 'billing',
  },

  // Features
  {
    question: 'What is Ask Your Voice?',
    answer:
      'Ask Your Voice is a chat interface that lets you have a conversation with your own knowledge base. Ask questions, brainstorm ideas, or get insights - all grounded in your own content and voice.',
    category: 'features',
  },
  {
    question: 'What is Creator Radar?',
    answer:
      'Creator Radar lets you follow other creators and thought leaders. When they post new content, you can repurpose it in your own voice with one click - great for staying current and adding your perspective.',
    category: 'features',
  },
  {
    question: 'What are Content Kits?',
    answer:
      'A Content Kit is a complete set of platform-ready content generated from a single source. One video becomes an Instagram post, LinkedIn article, blog post, email newsletter, TikTok script, and more.',
    category: 'features',
  },

  // Troubleshooting
  {
    question: 'My generation failed. What should I do?',
    answer:
      'First, try generating again - occasional timeouts can happen with large files. If it persists, check that your video file is under 5GB and in a supported format (MP4, MOV, AVI, WebM). You can also reach out during our weekly office hours for live help.',
    category: 'troubleshooting',
  },
  {
    question: 'My video won\'t upload. What\'s wrong?',
    answer:
      'Make sure your file is under your plan\'s size limit, in a supported format, and that you have a stable internet connection. If you\'re on a slower connection, try a shorter video first.',
    category: 'troubleshooting',
  },
  {
    question: 'The generated content doesn\'t sound like me. How do I fix it?',
    answer:
      'Add more content to your Knowledge Base - the more examples of your writing and speaking style, the better the match. We recommend at least 5-10 pieces of varied content (blogs, social posts, transcripts) for optimal voice matching.',
    category: 'troubleshooting',
  },
];

/**
 * Test Data Fixtures
 *
 * Mock data for E2E tests simulating real user inputs
 */

export const testUsers = {
  newUser: {
    email: `test-${Date.now()}@echome-test.com`,
    password: 'TestPassword123!',
    name: 'Test User',
  },
  existingUser: {
    email: 'existing@echome-test.com',
    password: 'ExistingPass123!',
    name: 'Existing User',
  },
};

export const testContent = {
  // Sample text input for content generation
  textInput: `
    Just had an incredible breakthrough with our product launch strategy.
    After months of research, we discovered that personalized outreach
    increases conversion by 340%. The key is understanding your audience's
    pain points before crafting your message. Here's what we learned:
    1. Start with empathy, not features
    2. Use data to back up claims
    3. Keep it conversational
    4. Always include a clear CTA
    What strategies have worked for you?
  `.trim(),

  // Short form content
  shortTextInput: 'Excited to announce our new feature launch! Stay tuned for more details.',

  // Knowledge base content
  knowledgeBaseContent: `
    # Brand Voice Guidelines

    ## Tone
    - Professional but approachable
    - Data-driven insights
    - Empowering and actionable

    ## Key Messages
    - We help creators save 10+ hours per week
    - AI-powered content that sounds human
    - Multi-platform publishing made simple

    ## Words to Use
    - Transform, Empower, Streamline
    - Authentic, Engaging, Strategic

    ## Words to Avoid
    - Revolutionary, Game-changing
    - Leverage, Synergy
  `.trim(),
};

export const testStripe = {
  // Stripe test card numbers
  validCard: {
    number: '4242424242424242',
    expiry: '12/30',
    cvc: '123',
    zip: '10001',
  },
  declinedCard: {
    number: '4000000000000002',
    expiry: '12/30',
    cvc: '123',
    zip: '10001',
  },
  // Test prices (from Stripe test mode)
  echoPriceId: 'price_echo_monthly_test',
  echoProPriceId: 'price_echo_pro_monthly_test',
};

export const testVideo = {
  // Path to a small test video file (should be created in fixtures)
  sampleVideoPath: 'e2e/fixtures/sample-video.mp4',
  // Mock video metadata
  metadata: {
    duration: 30,
    width: 1920,
    height: 1080,
    format: 'mp4',
  },
};

export const expectedPlatforms = [
  'linkedin',
  'twitter',
  'instagram',
  'tiktok',
  'blog',
  'email',
] as const;

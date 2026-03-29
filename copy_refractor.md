You are refactoring the copy and language throughout this codebase — not the code, the words.

The founder of this product has a specific operating philosophy that currently lives in the architecture but hasn't made it into the surface layer. Your job is to close that gap.

Here is the philosophy:

CONTEXT IS KING
This is the counterargument to "content is king." The product's value is not that it generates content — everyone generates content. The value is that it knows who the user is, draws from their history, and makes the output feel like it could only have come from them. Whenever copy describes what the product *produces*, reframe it around what the product *knows*. The knowledge base, the voice pipeline, the RAG retrieval — these are not features, they are the thesis made functional. Language that leads with output volume, platform count, or generation speed is wrong. Language that leads with context, history, and personalization is right.

EVERYTHING IS BULLSHIT
Not cynicism — permission. The product should make the user feel like they can just do the thing. No ceremony. No setup mythology. No "configure your voice profile before you begin." If copy implies that the user needs to do significant work before the product becomes useful, rewrite it to imply the opposite — the product learns from what they've already made. If copy adds steps, removes them. If copy gatekeeps with jargon, replace it with direct language that trusts the user to understand their own situation.

AFFORDABILITY IS NOT SOLVABLE
This product is not for everyone and should not pretend to be. Do not use democratization language. Do not imply that this levels any playing field. Price and access signals should be honest — this is a serious tool for people who take their output seriously. If any copy implies that this makes something previously inaccessible now accessible to all, remove it. That is a different product and a dishonest claim.

WHAT TO CHANGE
Scan all user-facing strings: landing page components, onboarding flows, feature descriptions, tooltip text, empty states, error messages, pricing tier labels and descriptions, marketing page copy, and any UI text that a user reads. Leave technical documentation, code comments, API references, and developer-facing README content alone.

For each piece of copy you change, apply this test: does this sentence lead with what the product knows about the user, or what the product produces for the user? If it leads with production, reframe it around knowledge and context. Does this sentence add ceremony or remove it? Does this sentence make an honest claim about who this is for?

Do not do find-and-replace. Read each string in context, understand what it is trying to communicate, and rewrite it to communicate the same thing through the lens of this philosophy. The voice should be direct, a little blunt, and free of adjectives that exist to impress rather than inform.

When you are done, output a summary of every file you touched and one sentence explaining the core shift you made in each.
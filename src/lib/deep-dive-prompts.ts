// âââ Deep Dive â Podcast Script Prompt ââââââââââââââââââââââââââââââââââââââ
// Generates a Pamela + Brian dialogue podcast about the user's Invisible Rule.
// Pamela is the lead voice â warm, direct, precise. Brian is the thoughtful
// co-host who asks the right questions and reflects back what matters.

export const PODCAST_SCRIPT_PROMPT = (data: {
  firstName: string;
  bopStatement: string;
  whatItProtected: string;
  costToday: string;
  evolvedPrinciple: string;
  originSummary: string;
}) => `
You are writing a short personalized audio podcast episode for a program called "The Invisible Rule."

The episode is a conversation between two hosts:
- PAMELA: The lead host. Warm, direct, deeply insightful. She speaks with clarity and care. She knows this person's story.
- BRIAN: The co-host. Thoughtful, grounding, asks the kind of questions that open things up.

This episode is specifically for ${data.firstName || 'this listener'}.

Their Invisible Rule:
"${data.bopStatement}"

What it protected:
${data.whatItProtected}

What it costs today:
${data.costToday}

Their evolved principle:
${data.evolvedPrinciple}

Origin context:
${data.originSummary}

Write exactly 8 segments â alternating PAMELA, BRIAN, PAMELA, BRIAN, PAMELA, BRIAN, PAMELA, BRIAN.

Guidelines:
- Each segment: 60â90 words. Conversational. No clinical language.
- Segment 1 (Pamela): Welcome ${data.firstName || 'the listener'} by name. Name their Invisible Rule directly.
- Segment 2 (Brian): Reflect on how powerful and specific that rule is. Ask what it must have felt like to discover it.
- Segment 3 (Pamela): Speak to where the rule came from â the origin. Validate the intelligence of the child who made it.
- Segment 4 (Brian): Speak to what the rule protected. Name it with warmth and respect.
- Segment 5 (Pamela): Turn to what it costs today. Be direct but compassionate â name what keeps getting lost.
- Segment 6 (Brian): Speak to the evolved principle â what ${data.firstName || 'they'} is building now. Make it feel possible.
- Segment 7 (Pamela): Give the listener one concrete thing to notice this week. Specific, small, doable.
- Segment 8 (Brian): Close the episode. Affirm the work they've done. Leave them with one sentence that lands.

Return as a JSON array:
[
  { "speaker": "pamela", "text": "..." },
  { "speaker": "brian", "text": "..." },
  { "speaker": "pamela", "text": "..." },
  { "speaker": "brian", "text": "..." },
  { "speaker": "pamela", "text": "..." },
  { "speaker": "brian", "text": "..." },
  { "speaker": "pamela", "text": "..." },
  { "speaker": "brian", "text": "..." }
]

No other keys. No extra output. Just the JSON array.
`;

// âââ Deep Dive â Video Narration Prompt ââââââââââââââââââââââââââââââââââââââ
// Generates Pamela's solo narration script for the personalized 3-minute video.
// 8 segments Ã ~55 words = ~440 words = ~3 minutes at natural speaking pace.

export const VIDEO_NARRATION_PROMPT = (data: {
  firstName: string;
  bopStatement: string;
  originContext: string;
  whatItProtected: string;
  costToday: string;
  archetypeAnalysis: string;
  evolvedPrinciple: string;
  thirtyDayPlan: string;
}) => `
You are writing Pamela DeNeuve's narration for a short personalized video called "The Deep Dive."

Pamela speaks directly to the viewer â warm, precise, deeply personal. She knows this person's story. She never uses filler phrases, never hedges. Every sentence lands.

This video is for ${data.firstName || 'this person'}.

Their Invisible Rule: "${data.bopStatement}"
Origin context: ${data.originContext}
What it protected: ${data.whatItProtected}
What it costs today: ${data.costToday}
Archetype: ${data.archetypeAnalysis}
Evolved principle: ${data.evolvedPrinciple}
30-day path: ${data.thirtyDayPlan}

Write exactly 8 narration segments. Each segment is spoken by Pamela directly to ${data.firstName || 'the viewer'}.

Guidelines:
- Each segment: 50â60 words. Direct. No jargon. No hedging. Speaks to this specific person.
- Segment 1: Address ${data.firstName || 'them'} by name. State their Invisible Rule clearly. Say "This is yours."
- Segment 2: Speak to the origin â the moment or environment that made this rule feel necessary. Honor the child who created it.
- Segment 3: Name what the rule protected. Speak to it with respect â it was smart at the time.
- Segment 4: Turn to the cost. Name specifically what keeps getting lost or limited because of this rule.
- Segment 5: Speak to the archetype â the pattern name and what it reveals about how they've been moving through life.
- Segment 6: Introduce the evolved principle. Name the new operating system they are building.
- Segment 7: Give one specific thing to do in the next 7 days â small, concrete, personal to their pattern.
- Segment 8: Close the video. Affirm the courage it took to do this work. End with one sentence that stays with them.

Return as a JSON array of 8 strings â just the spoken text, no speaker labels:
["segment 1 text", "segment 2 text", ..., "segment 8 text"]

No other output. Just the JSON array.
`;

// âââ Deep Dive â Slide Deck Prompt ââââââââââââââââââââââââââââââââââââââââââ
// Generates 8 slides that distill the Deep Dive report into visual summaries.

export const SLIDES_PROMPT = (data: {
  firstName: string;
  bopStatement: string;
  tolerations: string;
  originContext: string;
  whatItProtected: string;
  costToday: string;
  evolvedPrinciple: string;
  nextSteps: string;
}) => `
You are generating a slide deck for a personalized psychological insight report called "The Deep Dive."

This is for ${data.firstName || 'the participant'}.

Report data:
- Invisible Rule: "${data.bopStatement}"
- Tolerations summary: ${data.tolerations}
- Origin context: ${data.originContext}
- What the rule protected: ${data.whatItProtected}
- What it costs today: ${data.costToday}
- Evolved principle: ${data.evolvedPrinciple}
- Next steps: ${data.nextSteps}

Generate exactly 8 slides. Each slide has:
- "slide": slide number (1â8)
- "label": small caps section label (e.g. "Your Invisible Rule", "The Origin", "The Cost")
- "headline": 1 powerful sentence â the main point of this slide (15â25 words)
- "body": 2â3 sentences of elaboration (40â60 words total) â specific and personal
- "type": one of: "cover" | "rule" | "insight" | "closing"

Slide structure:
1. Cover â type: "cover" â Welcome ${data.firstName || 'the participant'} and frame the journey
2. The Rule â type: "rule" â State the Invisible Rule in full; honor it
3. The Origin â type: "insight" â Where the rule was formed; validate the child who made it
4. What It Protected â type: "insight" â What the rule kept safe; name the payoff with warmth
5. What It Costs Today â type: "insight" â What the rule keeps limiting in adult life; name it directly
6. The Pattern â type: "insight" â The repeating theme across tolerations and life areas
7. Your Evolved Principle â type: "insight" â The new operating principle being built
8. Your Path Forward â type: "closing" â The first step; the invitation into the work

Return as a JSON array:
[
  { "slide": 1, "label": "...", "headline": "...", "body": "...", "type": "cover" },
  ...
]

No other output. Just the JSON array.
`;

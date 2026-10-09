
export default async (req) => {
  const headers = {
    "Content-Type": "application/json"
  };

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Please send a POST request." }),
      { status: 405, headers }
    );
  }

  try {
    const body = await req.json();
    const question = body.question;
    const mode = body.mode;

    if (
      typeof question !== "string" ||
      !question.trim()
    ) {
      return new Response(
        JSON.stringify({
          error: "Please enter a chemistry question."
        }),
        { status: 400, headers }
      );
    }

    const apiKey = Netlify.env.get("GEMINI_API_KEY");

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "GEMINI_API_KEY is missing in Netlify environment variables."
        }),
        { status: 500, headers }
      );
    }

    const prompt = `
You are ChemMind AI Classroom, a helpful chemistry teacher
for Class 9 and beginner-level students.

Teaching style:
- Explain in easy Urdu-English mix when appropriate.
- Start with a clear, direct answer.
- Explain the concept step by step.
- Give accurate examples and balanced chemical equations.
- Explain electron transfer, oxidation states, formulas and charges
  correctly when relevant.
- Use readable chemical formulas and Unicode subscripts where useful.
- For exam questions, include a short exam-ready answer.
- If the question is ambiguous, ask a brief clarifying question.
- Never invent facts, equations, or experimental results.
- Avoid generic filler. Answer the actual question.

Student's question:
${question.trim()}
`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 2048
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "Gemini API error:",
        response.status,
        data.error?.message || "Unknown API error"
      );

      return new Response(
        JSON.stringify({
          error:
            data.error?.message ||
            "The AI provider could not answer. Please try again."
        }),
        { status: 502, headers }
      );
    }

    const answer = (data.candidates?.[0]?.content?.parts || [])
      .map(part => part.text || "")
      .join("\n")
      .trim();

    if (!answer) {
      return new Response(
        JSON.stringify({
          error: "No answer was returned. Please try again."
        }),
        { status: 502, headers }
      );
    }

    return new Response(
      JSON.stringify({ answer }),
      { status: 200, headers }
    );

  } catch (error) {
    console.error("ChemMind AI function error:", error);

    return new Response(
      JSON.stringify({
        error: "Something went wrong while contacting the AI. Please try again."
      }),
      { status: 500, headers }
    );
  }
};

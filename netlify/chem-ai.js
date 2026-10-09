
export default async (req) => {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Use POST to ask a question." }),
      {
        status: 405,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  try {
    const { question, mode } = await req.json();

    if (!question || !question.trim()) {
      return new Response(
        JSON.stringify({ error: "Please enter a chemistry question." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const apiKey = Netlify.env.get("OPENAI_API_KEY");

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "OPENAI_API_KEY is missing in Netlify environment variables."
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          instructions: `You are ChemMind AI, a knowledgeable chemistry teacher for students.
Answer chemistry questions accurately, clearly, and educationally.
Explain concepts step by step in easy Urdu-English mix when appropriate.
For questions about oxidizing agents, define them, explain electron transfer,
and give correct examples and balanced reactions where useful.
For formulas and equations, preserve chemical subscripts and charges.
If a question is outside chemistry, politely explain that you specialize in chemistry.
Never return generic filler or pretend to know something you do not know.`,
          input: question
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: data.error?.message || "AI request failed."
        }),
        {
          status: response.status,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const answer = (data.output || [])
      .flatMap(item => item.content || [])
      .filter(item => item.type === "output_text")
      .map(item => item.text)
      .join("\n");

    return new Response(
      JSON.stringify({
        answer: answer || "I couldn't generate an answer. Please try again."
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Something went wrong. Please try again." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};

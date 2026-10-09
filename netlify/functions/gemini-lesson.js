export default async (req) => {
if (req.method !== "POST") {
return new Response(
JSON.stringify({ error: "Use POST to generate a lesson." }),
{
status: 405,
headers: { "Content-Type": "application/json" }
}
);
}

try {
const { question, mode = "video" } = await req.json();
const cleanQuestion = String(question || "").trim();

```
if (!cleanQuestion) {
  return new Response(
    JSON.stringify({ error: "Please enter a chemistry topic or question." }),
    {
      status: 400,
      headers: { "Content-Type": "application/json" }
    }
  );
}

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  return new Response(
    JSON.stringify({ error: "GEMINI_API_KEY is missing in Netlify environment variables." }),
    {
      status: 500,
      headers: { "Content-Type": "application/json" }
    }
  );
}

const prompt = `
```

You are ChemMind, an expert Class 9-10 chemistry teacher.
Explain in simple Urdu-English mix (Roman Urdu + English).
Focus on accurate chemistry, conceptual understanding, and board exam preparation.

Student's topic/question: ${cleanQuestion}
Lesson mode: ${mode}

Return ONLY valid JSON in this exact structure:
{
"title": "Short lesson title",
"language": "Urdu + English",
"slides": [
{
"heading": "Slide heading",
"text": "Clear explanation in Roman Urdu and English",
"formula": "Relevant formula or equation, or empty string",
"example": "A simple example, or empty string",
"question": "A short check-your-understanding question"
}
]
}

Create 5 to 7 useful slides. Explain the concept first, then formulas/equations, a worked example, common mistakes, and a short recap. Balance chemical equations correctly. Never invent facts. Keep each slide concise and suitable for a video lesson.
`;

```
const response = await fetch(
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + encodeURIComponent(apiKey),
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.4,
        responseMimeType: "application/json"
      }
    })
  }
);

const raw = await response.text();
let data;

try {
  data = JSON.parse(raw);
} catch {
  throw new Error("Gemini returned an unreadable response. Check the API configuration.");
}

if (!response.ok) {
  const detail = data?.error?.message || "Gemini API request failed.";
  return new Response(
    JSON.stringify({ error: detail }),
    {
      status: 502,
      headers: { "Content-Type": "application/json" }
    }
  );
}

const generatedText = data?.candidates?.[0]?.content?.parts
  ?.map(part => part.text || "")
  .join("");

if (!generatedText) {
  throw new Error("Gemini returned an empty lesson. Please try again.");
}

let lesson;

try {
  lesson = JSON.parse(generatedText);
} catch {
  throw new Error("Gemini lesson formatting failed. Please try again.");
}

if (!Array.isArray(lesson.slides) || lesson.slides.length === 0) {
  throw new Error("No lesson slides were returned.");
}

return new Response(JSON.stringify(lesson), {
  status: 200,
  headers: { "Content-Type": "application/json" }
});
```

} catch (error) {
return new Response(
JSON.stringify({
error: error.message || "Could not generate the lesson."
}),
{
status: 500,
headers: { "Content-Type": "application/json" }
}
);
}
};

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const { text, voice = 'ur-PK-UzmaNeural' } = await req.json();

    const cleanText = String(text || '').trim();

    const allowedVoices = new Set([
      'ur-PK-UzmaNeural',
      'ur-PK-AsadNeural'
    ]);

    if (!cleanText) {
      return new Response(
        JSON.stringify({ error: 'No text supplied.' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (cleanText.length > 4000) {
      return new Response(
        JSON.stringify({
          error: 'Text is too long for one narration request.'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (!allowedVoices.has(voice)) {
      return new Response(
        JSON.stringify({ error: 'Unsupported Urdu voice.' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const key = process.env.AZURE_SPEECH_KEY;
    const region = process.env.AZURE_SPEECH_REGION;

    if (!key || !region) {
      return new Response(
        JSON.stringify({
          error: 'Azure Speech environment variables are missing on Netlify.'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const endpoint =
      `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

    const ssml = `
      <speak
        version="1.0"
        xmlns="http://www.w3.org/2001/10/synthesis"
        xml:lang="ur-PK">
        <voice name="${voice}">
          ${escapeXml(cleanText)}
        </voice>
      </speak>
    `;

    const azure = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat':
          'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'ChemMind'
      },
      body: ssml
    });

    if (!azure.ok) {
      const detail = await azure.text();

      return new Response(
        JSON.stringify({
          error: `Azure Speech returned ${azure.status}.`,
          detail: detail.slice(0, 500)
        }),
        {
          status: 502,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(await azure.arrayBuffer(), {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store'
      }
    });

  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'TTS request failed.',
        detail: error.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Secure proxy for Anthropic API calls
// API key stays server-side, never exposed to browser

exports.handler = async function (event) {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: { message: "Method not allowed" } }),
    };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: { message: "ANTHROPIC_API_KEY is not configured on the server." } }),
    };
  }

  let prompt, max_tokens;
  try {
    const body = JSON.parse(event.body);
    prompt = body.prompt;
    max_tokens = body.max_tokens;
  } catch {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: { message: "Invalid JSON in request body." } }),
    };
  }

  if (!prompt) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: { message: "prompt field is required." } }),
    };
  }

  try {
    // AbortController: fail gracefully at 25s rather than letting Netlify 504 at 26s
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    let response;
    try {
      response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          // Use haiku for test generation (fast: 6-14s) — sonnet takes 25-40s and hits Netlify timeout
          // Advisory calls use smaller token counts so haiku handles those too
          model: "claude-haiku-4-5-20251001",
          max_tokens: max_tokens || 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      if (fetchErr.name === "AbortError") {
        return {
          statusCode: 504,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({ error: { message: "Request timed out (25s). Try a smaller test mode or difficulty, then retry." } }),
        };
      }
      throw fetchErr;
    }
    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data?.error?.message || JSON.stringify(data) || `Anthropic API status ${response.status}`;
      return {
        statusCode: response.status,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: { message: errMsg } }),
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(data),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: { message: "Server error: " + error.message } }),
    };
  }
};

// This proxy is deprecated and disabled.
// All Anthropic API calls go through Firebase Cloud Functions only.
// This file exists only to prevent the /api/* route from 404ing.
exports.handler = async function () {
  return {
    statusCode: 410,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ error: "This endpoint is no longer active." }),
  };
};

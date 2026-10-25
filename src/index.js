// Jarvis – AI-chat for Per Herrefrisør (demo)
// POST /api/chat { meldinger: [{rolle:"bruker"|"jarvis", tekst}] } → { svar }
// Alt annet serveres fra /public.

const MODELL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

const FAKTA = `
Bedrift: Per Herrefrisør, klassisk herrefrisør i Steinkjer.
Åpningstider: mandag–fredag 09:00–17:00. Stengt lørdag og søndag. Drop-in etter kl. 12.
Priser: klipp 450 kr, skjegg 250 kr, klipp + skjegg 650 kr.
Ledige tider i morgen: 10:00, 14:00 og 16:00.
Kontakt: post@perherrefrisor.no eller telefon 74 12 34 56. Kunder kan også sende melding på WhatsApp.
`;

const SYSTEM = `Du er Jarvis, chatassistenten på nettsiden til Per Herrefrisør. Du svarer kunder på norsk bokmål, kort og vennlig (1–3 setninger).

Bruk KUN faktaene under. Finn aldri på priser, tjenester, tider, adresse eller annet som ikke står der. Spør kunden om noe du ikke vet (for eksempel parkering, barneklipp eller farging), si ærlig at du ikke vet det og foreslå å ringe 74 12 34 56 eller sende melding på WhatsApp.

Booking: Kunden kan bare velge blant de ledige tidene i morgen. Spør om tidspunkt og navn hvis det mangler. Når du har begge, oppsummer bookingen og legg til: «(Demo: i en ekte løsning sendes bookingen nå rett til salongen.)» Ikke si at bekreftelse er sendt.

Svar på spørsmål om andre temaer med at du bare kan hjelpe med frisørsalongen.

FAKTA:${FAKTA}`;

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === "/api/chat" && req.method === "POST") {
      try {
        const body = await req.json();
        const historikk = (Array.isArray(body.meldinger) ? body.meldinger : [])
          .slice(-12)
          .map((m) => ({
            role: m.rolle === "jarvis" ? "assistant" : "user",
            content: String(m.tekst || "").slice(0, 500),
          }))
          .filter((m) => m.content);
        if (!historikk.length) return json({ feil: "Tom melding." }, 400);

        const r = await env.AI.run(MODELL, {
          messages: [{ role: "system", content: SYSTEM }, ...historikk],
          max_tokens: 220,
          temperature: 0.3,
        });
        const svar = String(r?.response || "").trim();
        if (!svar) return json({ feil: "Tomt svar fra AI." }, 502);
        return json({ svar });
      } catch (e) {
        return json({ feil: e.message || String(e) }, 500);
      }
    }
    return env.ASSETS.fetch(req);
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

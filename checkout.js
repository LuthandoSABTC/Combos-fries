// Combos Fries: creates a Yoco card checkout for the exact order total.
// Needs the Vercel environment variable YOCO_SECRET_KEY (from your Yoco account).
const PRICES = { k1:55, k2:85, wed4:50, thu_r:40, fd:110, w1:40, w2:60, w3:75, r2:40, r3:55, s:25, m:30, l:45 };

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ error: "Use POST" }); return; }
  const key = process.env.YOCO_SECRET_KEY;
  if (!key) { res.status(500).json({ error: "Card payments are not set up yet" }); return; }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const items = body.items || {};
    const today = new Intl.DateTimeFormat("en-GB",{timeZone:"Africa/Johannesburg",weekday:"short"}).format(new Date());
    let total = 0;
    for (const [id, q] of Object.entries(items)) {
      const qty = Math.max(0, Math.min(50, parseInt(q, 10) || 0));
      if (!PRICES[id]) continue;
      if (id === "wed4" && today !== "Wed") continue; // Wing Wednesday only on Wednesdays
      if (id === "thu_r" && today !== "Thu") continue; // Russian Thursday only on Thursdays
      total += PRICES[id] * qty;
    }
    if (total <= 0) { res.status(400).json({ error: "Your order is empty" }); return; }
    if (body.deliver) total += body.area === "tyoks" ? 10 : 25;

    const site = "https://" + (req.headers["x-forwarded-host"] || req.headers.host);
    const ref = "CF" + Date.now().toString(36).toUpperCase();
    const r = await fetch("https://payments.yoco.com/api/checkouts", {
      method: "POST",
      headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: total * 100, currency: "ZAR",
        successUrl: site + "/?card=paid&ref=" + ref,
        cancelUrl: site + "/?card=cancelled",
        failureUrl: site + "/?card=failed",
        metadata: {
          ref, shop: "Combos Fries",
          customerName: String(body.name || "").slice(0, 60),
          customerPhone: String(body.phone || "").slice(0, 20),
          delivery: body.deliver ? ("Delivery: " + String(body.address || "").slice(0, 120)) : "Collect"
        }
      })
    });
    const data = await r.json().catch(() => ({}));
    const url = data.redirectUrl || data.redirect_url;
    if (!r.ok || !url) { res.status(502).json({ error: "Yoco could not start the payment" }); return; }
    res.status(200).json({ url, total, ref });
  } catch (e) {
    res.status(500).json({ error: "Something went wrong" });
  }
};

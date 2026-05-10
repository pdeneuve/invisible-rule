# GHL Webhook Configuration Check

**For:** Tech team / GHL admin
**From:** Pamela Deneuve
**Site:** https://invisible-rule.vercel.app
**Date:** May 2026

## Why this matters

The Invisible Rule has two paid products in GoHighLevel:

- **First Light** — $7
- **The Deep Dive** — $97

After payment, GHL is supposed to call a webhook on our site. The webhook is what triggers the customer's actual product (emailing the report, generating the audio + slides + video). **If the webhook is misconfigured, customers pay but never receive their product.**

We need you to verify two things in GHL:

1. Each product has a webhook pointing to the correct URL.
2. The URL includes the right `?tier=` query string.

This should take about 10 minutes.

---

## What to check

### 1. The $7 First Light product

The webhook URL on this product **must be exactly**:

```
https://invisible-rule.vercel.app/api/ghl-webhook?tier=1
```

- **Method:** `POST`
- **Trigger:** Successful payment / order completed
- **Content-Type:** `application/json` is preferred, but `application/x-www-form-urlencoded` also works.

### 2. The $97 Deep Dive product

The webhook URL on this product **must be exactly**:

```
https://invisible-rule.vercel.app/api/ghl-webhook?tier=2
```

- **Method:** `POST`
- **Trigger:** Successful payment / order completed
- **Content-Type:** `application/json` preferred.

### 3. Payload requirements

The webhook payload from GHL must include the customer's **email**. Our endpoint reads any of these field names (whichever GHL sends):

- `email` *or* `contact_email`
- `firstName` *or* `first_name` (optional but nice — falls back to "Friend" if missing)
- `products[].name` *or* `amount` *or* `total` (used as a fallback for tier detection if the `?tier=` query string is missing)

If GHL is configured to send only `contactId` with no email, the webhook cannot deliver the product. **Email must be in the payload.**

---

## Where to find the webhook config in GHL

GHL gives you a few places to set up a webhook. The setup may be in any of these — check all of them:

1. **Sub-account → Payments → Products → [product name] → Notifications / Webhooks**
2. **Sub-account → Automation → Workflows → [funnel for this product]** — look for an "Outbound Webhook" or "Send Webhook" action.
3. **Sub-account → Settings → Integrations → Webhooks**

If you cannot find any webhook configured for one of these products, that is the problem — please configure it using the URLs above.

---

## How to test it

### Test A — webhook endpoint is alive

Open this URL in a browser:

```
https://invisible-rule.vercel.app/api/ghl-webhook
```

Expected response:

```json
{ "status": "GHL webhook endpoint active" }
```

If you get a 404, 500, or "deployment protected" page instead, stop and tell Pamela — the site itself has a problem.

### Test B — webhook accepts a POST

From a terminal (or Postman), run a fake Tier 1 call:

```bash
curl -i -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"YOUR_OWN_EMAIL@example.com","firstName":"Test","amount":7}' \
  "https://invisible-rule.vercel.app/api/ghl-webhook?tier=1"
```

Expected response (HTTP 200):

```json
{ "received": true, "tier": 1, "fulfilled": false, "reason": "no-session" }
```

The `"fulfilled":false,"reason":"no-session"` is **correct** for this test, because the test email has not done a voice session on the site. The important thing is that:

- HTTP status is `200`
- `received` is `true`
- `tier` is `1`

If you change `?tier=1` to `?tier=2` and re-run, you should get the same shape with `tier:2`.

### Test C — real test purchase (optional but best)

1. Use Pamela's own email to do a real $7 purchase through the GHL checkout.
2. **Before** purchasing, complete a voice session at https://invisible-rule.vercel.app?mode=paid using that same email — but stop before paying. (This saves the session in our system so the webhook has something to fulfill.)
3. Complete the purchase.
4. Check that the email arrives with the First Light report.
5. Check the GHL webhook delivery logs (in GHL: Settings → Webhooks → Logs, or the Workflow execution history) — should show a `200 OK` response from our endpoint.

---

## What to send back to Pamela

Please reply with:

1. **Screenshots** of the webhook configuration for both products (URL field visible).
2. **Result of Test A** (browser response — should be the JSON above).
3. **Result of Test B** (curl output for both `?tier=1` and `?tier=2`).
4. **Confirmation** that the webhook payload includes the customer's email field.
5. If you ran Test C: confirmation that the test email was received and the webhook log shows `200 OK`.

---

## Common problems and fixes

| Symptom | Likely cause | Fix |
|---|---|---|
| `?tier=` missing from the configured URL | Webhook was set to base URL only | Append `?tier=1` (or `?tier=2`) to the URL |
| Webhook fires but `tier` value is wrong in the response | `?tier=` missing AND amount is in the dead zone (between $15 and $50) | Add the `?tier=` query string |
| `received:false` or HTTP 4xx/5xx | Payload format unexpected | Confirm Content-Type is `application/json` and email field is `email` or `contact_email` |
| Webhook not firing at all | Workflow not active, or trigger not set to "Order Submitted" | Activate the workflow; check trigger is "Order Submitted" or "Payment Successful" |
| Customer pays but no email arrives | `RESEND_API_KEY` env var missing on our side, OR email field not in payload | First check #4 in "What to send back" — confirm email is in payload. Then escalate to Pamela for env var check. |

---

## Reference: what the webhook does after it receives a valid call

For Tier 1 (First Light, $7):

1. Looks up the customer's saved voice session by email.
2. If found, calls `/api/send-report` to email the First Light report.
3. If not found, sends a "please complete your voice session" email instead.

For Tier 2 (Deep Dive, $97):

1. Looks up the customer's saved voice session by email.
2. If found, calls `/api/fulfill-deep-dive` which generates the audio (ElevenLabs), the slides, and the cinematic video (Creatomate), then emails everything.
3. If not found, sends a "please complete your voice session" email.

Source code reference: `src/app/api/ghl-webhook/route.ts`.

---

**Questions?** Send to Pamela: pdeneuve@gmail.com

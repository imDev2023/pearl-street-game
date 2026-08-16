# Marketplace escrow versus in-token royalty
Type: grilling
Status: resolved
Blocked by: -

## Question
T-003 taxes operator-initiated transfers 7% in the creature token; T-012a escrows creatures in the marketplace (list = operator transfer in, cancel = transfer out, no sale price).
Decide: royalty charged only on the buy leg with the escrow contract exempt, or a non-escrow listing model (approval + settle on buy), and how the dormant allowlist treats in-flight cancels.

## Answer
Default taken 2026-08-16 (operator skipped the question after agreeing that skipped items take the recommendation; may be overridden any time before the relevant ticket ships).
The 7% royalty is charged only on the buy leg (sale price known); transfers into and out of the marketplace escrow are exempt; the dormant allowlist must never block an in-flight cancel (T-003 and T-012a).

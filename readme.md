# Anoma Cross-Chain Payment (Demo)

A simple demo of an intent-centric cross-chain payment experience. It is not connected to a live network; the user defines the goal (intent), and I deterministically simulate and display ETA/Cost/Route based on the selected strategy. Deep link and QR sharing, a receipt, and an activity log are included.<br>

▫️ Intent-centric: e.g., “deliver 100 USDC on BASE.” In the real world the solver chooses the route; this demo simulates the values.<br>
▫️ Strategies: ⚡ FAST / 💸 CHEAP / 🕶️ PRIVATE — switching updates ETA/Cost/Route instantly.<br>
▫️ Asset selection (To Asset): Choose the asset to be delivered on the destination chain (e.g., USDC on BASE). The source asset is abstracted in this demo (“Pay with Anything”).<br>
▫️ Send flow: From/To chain + To Asset + amount + recipient → Create Intent (JSON modal) → Get Quote (demo).<br>
▫️ Quote (demo): Produces deterministic ETA (s), Cost (USD), and Route; steps shown as badges: Swap / Bridge / Aggregator / Shield.<br>
▫️ Sharing: Copy Link embeds the intent into the URL as Base64URL (deep link). Show QR displays a QR of this link.<br>
▫️ Execute (demo): No real transfer; a Receipt opens (summary, route, ETA/Cost, Quote ID). It’s added to Activity and can be exported as CSV.<br>
▫️ Activity (intent-centric): record like IntentPay — Deliver 100 USDC on BASE → 0x… • FAST • q\_abcd1234.<br>
▫️ Receive (QR): Chain + optional amount + address → Generate QR. Share via Copy Link / Download QR.<br>
▫️ Validation \& Helpers: Quick Intent Linter hints in the modal; simple API \& cURL example and a small OpenAPI stub.<br>
▫️ Technical note: Pure frontend/ES5; data in localStorage; basic offline (PWA) support. No wallet/chain integration (demo).<br>


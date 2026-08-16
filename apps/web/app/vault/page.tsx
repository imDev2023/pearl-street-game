import {VaultPanel} from "./vault-panel";

export default function VaultPage() {
  return (
    <main>
      <h1>
        The <em>vault</em>
      </h1>
      <p className="muted" style={{marginTop: 0}}>
        Wrap USDG into CLAM to play; redeem CLAM back to USDG any time. Nobody can pause the exit.
      </p>
      <VaultPanel />
    </main>
  );
}

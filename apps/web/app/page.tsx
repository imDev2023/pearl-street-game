import {ProofOfReserve} from "./proof-of-reserve";

export default function Page() {
  return (
    <main>
      <h1>
        Proof of <em>reserve</em>
      </h1>
      <p className="muted" style={{marginTop: 0}}>
        Every CLAM is backed by exactly one USDG held in the vault. Read it yourself: the numbers below are live
        contract reads, refreshed every ten seconds.
      </p>
      <ProofOfReserve />
    </main>
  );
}

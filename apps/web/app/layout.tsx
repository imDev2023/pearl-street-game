import type {Metadata} from "next";
import type {ReactNode} from "react";
import Link from "next/link";
import "./globals.css";
import {Providers} from "./providers";
import {Nav} from "./nav";

export const metadata: Metadata = {
  title: "Pearl Street",
  description: "An idle creature game on Robinhood Chain. Proof of reserve and the CLAM vault.",
};

export default function RootLayout({children}: {children: ReactNode}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="shell">
            <header className="topbar">
              <Link href="/" className="brand">
                <span className="logo" aria-hidden />
                <b>Pearl Street</b>
              </Link>
              <Nav />
            </header>
            {children}
            <p className="footer">
              CLAM is a wrapped deposit, not a stablecoin. Redemption cannot be paused by anyone; no function can
              move the reserve except <code>redeem</code>. This page reads the chain directly, nothing is cached.
            </p>
          </div>
        </Providers>
      </body>
    </html>
  );
}

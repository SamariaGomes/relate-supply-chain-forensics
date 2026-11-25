# Relate Supply Chain Intelligence

Browser-based dependency and CVE graph forensics powered by **Relate** embedded graph database.

## How It Uses Relate
- **Storage Mode:** Single-file mode (`.rl` / `.relate`).
- **Persistent Graph Location:** `public/samples/supply-chain-audit.rl` and `public/samples/supply-chain-audit.relate`
- **Why Single-File Mode:** I chose the single-file mode because software supply chain audits need to be portable, self-contained, and shareable across security reviews and CI/CD pipelines without requiring a running database server. Storing the entire dependency and vulnerability graph in a single file preserves proprietary code privacy locally in the browser while allowing anyone to inspect or restore the exact graph state offline.

## Features
- **Local Lockfile Parsing:** Parses `package-lock.json` directly in the browser with zero backend.
- **Live CVE Enrichment:** Queries OSV.dev in real time to connect active vulnerabilities to transitive dependencies.
- **Investigation Lenses & Cypher Studio:** Isolates critical chains, production-only exposure, and high-impact dependency hubs.
- **Root Remediation Engine:** Identifies which single top-level package update neutralizes the highest number of transitive CVEs.

## Quick Start
```bash
git clone [https://github.com/SamariaGomes/relate-supply-chain-forensics.git](https://github.com/SamariaGomes/relate-supply-chain-forensics.git)
cd relate-supply-chain-forensics
npm install
npm run dev
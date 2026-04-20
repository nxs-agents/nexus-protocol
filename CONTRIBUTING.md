# Contributing

We welcome contributions to the NEXUS protocol. Please read this guide before opening a pull request.

---

## Getting started

```bash
git clone https://github.com/nxs-agents/nexus-protocol.git
cd nexus-protocol
npm install
npm run build
```

---

## Project structure

```
nexus-protocol/
├── packages/
│   ├── sdk/          TypeScript SDK (@nexus/sdk)
│   └── core/         Agent engine and strategy runtime (@nexus/core)
├── contracts/        Solidity smart contracts
├── docs/             Protocol documentation
└── examples/         Example agent scripts
```

---

## Submitting changes

1. Fork the repository
2. Create a branch: `git checkout -b feat/your-feature`
3. Make your changes
4. Run lint: `npm run lint`
5. Commit with a clear message
6. Open a pull request against `main`

---

## Commit conventions

Use the following prefixes:

| Prefix | Use for |
|---|---|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation only |
| `refactor:` | Code change with no feature or fix |
| `test:` | Adding or updating tests |
| `chore:` | Tooling, deps, config |

---

## Code style

- TypeScript strict mode enabled
- No `any` unless absolutely necessary
- Prefer explicit return types on public methods
- Keep functions small and single-purpose

---

## Reporting issues

Open a GitHub issue with:
- A clear title
- Steps to reproduce
- Expected vs actual behavior
- Environment details (Node version, network, etc.)

For security vulnerabilities, see [docs/security.md](docs/security.md).

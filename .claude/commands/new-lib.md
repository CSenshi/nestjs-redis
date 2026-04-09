Generate a new NestJS library in this Nx monorepo.

Usage: /new-lib <name>

Steps:

1. Run: `pnpm nx g @nx/nest:library --name=<lib-name> --directory=packages/<lib-name> --buildable --publishable --linter=eslint --unitTestRunner=jest`

CLAUDE.md template:

```
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Reference

This library is part of @nestjs-redis/* packages.

## Commands

\`\`\`bash
pnpm nx test <lib-name>
pnpm nx build <lib-name>
\`\`\`

```

.PHONY: install dev test build typecheck check clean

install:
	pnpm install --frozen-lockfile

dev:
	pnpm dev

test:
	pnpm test

typecheck:
	pnpm typecheck

build:
	pnpm build

check:
	pnpm test
	pnpm build

clean:
	rm -rf node_modules dist coverage
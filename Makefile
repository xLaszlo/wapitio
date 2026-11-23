.PHONY: install build test typecheck lint format demo docs-dev docs-build docs-serve package publish-vsix pages-deploy clean

install: ## pnpm install across the workspace
	pnpm install

build: ## build all packages (core -> extension -> docs)
	pnpm build

test: ## run all unit + component tests
	pnpm test

typecheck: ## typecheck all packages
	pnpm typecheck

lint: ## biome check (lint + format verification)
	pnpm lint

format: ## biome format --write
	pnpm format

demo: ## local vite playground for @wapitio/core (M1)
	pnpm --filter @wapitio/core run demo

docs-dev: ## VitePress dev server
	pnpm --filter wapitio-docs run dev

docs-build: ## build the VitePress site
	pnpm --filter wapitio-docs run build

docs-serve: ## preview the built VitePress site locally
	pnpm --filter wapitio-docs run serve

package: ## vsce package -> wapitio-vscode-<version>.vsix (M2)
	pnpm --filter wapitio-vscode run package

publish-vsix: ## install the local .vsix into VS Code
	pnpm --filter wapitio-vscode run install-vsix

publish-marketplace: ## vsce publish (requires VSCE_TOKEN; deferred — see plans/PLAN.md Q2)
	@echo "Publishing is deferred. See the wapitio-publish skill for the first-time setup walkthrough."
	@test -n "$$VSCE_TOKEN" || (echo "VSCE_TOKEN is not set" && exit 1)
	pnpm --filter wapitio-vscode run publish-marketplace

publish-open-vsx: ## ovsx publish (requires OVSX_TOKEN; deferred — see plans/PLAN.md Q2)
	@echo "Publishing is deferred. See the wapitio-publish skill for the first-time setup walkthrough."
	@test -n "$$OVSX_TOKEN" || (echo "OVSX_TOKEN is not set" && exit 1)
	pnpm --filter wapitio-vscode run publish-open-vsx

pages-deploy: ## local trigger of the docs.yml steps (build + prepare artifact)
	pnpm --filter wapitio-docs run build

clean: ## remove build artifacts
	rm -rf packages/core/dist packages/vscode-extension/dist docs/.vitepress/dist docs/.vitepress/cache coverage
	find . -name "*.tsbuildinfo" -not -path "./node_modules/*" -delete

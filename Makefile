# chrome-bookmarks-mcp — dev convenience targets.
.DEFAULT_GOAL := help
.PHONY: help build typecheck test ext

help: ## List targets
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | \
		awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

build: ## Build server + extension
	pnpm build

typecheck: ## Type-check all packages
	pnpm typecheck

test: ## Run all tests
	pnpm test

ext: ## Build the unpacked extension → packages/extension/dist
	pnpm --filter @chrome-bookmarks-mcp/extension build

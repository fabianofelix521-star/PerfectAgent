# Nexus Tool Forge runtime integration

`src/tools/runtimeIntegration.ts` maps each cognitive runtime to the tools it should prefer.

- `prometheus`: market perception, Bayesian updating and trade planning.
- `morpheus`: narrative, cross-domain synthesis and episodic memory.
- `apollo`: Bayesian evidence updates, contradiction checks and hypothesis generation.
- `hermes`: causal reasoning, social radar and campaign execution tools.
- `athena`: crawling, contradiction resolution, synthesis and reporting.
- `vulcan`: deployment, inspection, optimization and pattern extraction.
- `oracle`: news intelligence, counterfactuals, analogies and reports.
- `nexus-prime`: meta-tools, tool composition and multi-source synthesis.

Use `initializeNexusTools()` to register all tools and start Chrono jobs. Use `getToolsForRuntime(runtimeId)` when an agent needs a runtime-specific tool palette.

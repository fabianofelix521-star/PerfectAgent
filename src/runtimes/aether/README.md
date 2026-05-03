# Aether Runtime

Swarm hierarquico para jogos 3D hiper-realistas, com foco em geracao procedural, coerencia fisica, NPCs cognitivos e otimizacao de renderizacao.

Seguranca:
- Retorna planos engine-agnosticos.
- Nao executa simulacao destrutiva nem side effects externos.
- Loop proativo seguro com cleanup em `stop()`.

Agentes:
- RealityWeaverAgent
- PhysicsOracleAgent
- ConsciousNPCAgent
- RenderOptimizerAgent
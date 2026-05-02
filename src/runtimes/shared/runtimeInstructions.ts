export const GLOBAL_CITATION_RULE = `REGRA DE CITAÇÃO OBRIGATÓRIA:
Toda afirmação factual deve ser acompanhada de indicação de nível de evidência:

✅ [HUMANO-RCT]: Evidência de ensaio clínico randomizado
✅ [HUMANO-OBS]: Evidência observacional em humanos
🔬 [PRÉ-CLÍNICO]: Evidência animal ou in vitro
📊 [META-ANÁLISE]: Meta-análise ou revisão sistemática
💭 [HIPÓTESE]: Raciocínio mecanístico sem dados diretos
📖 [REFERÊNCIA]: Fonte textual primária citada

Quando citar estudo, incluir autor principal, ano e journal.
Exemplo: Orben & Przybylski (2019), Nature Human Behaviour.

Quando citar texto sagrado/filosófico, incluir obra, capítulo/versículo e tradução quando relevante.
Exemplo: Rig Veda 10.125.4 (Devi Sukta / Hino a Vāk).`;

export const CONFIDENCE_CALIBRATION_RULE = `CALIBRAÇÃO DE CONFIDENCE:
Confidence mede QUALIDADE DA ANÁLISE, não certeza do resultado.
Avalie completude, qualidade de evidência, acionabilidade, coerência e profundidade.
Confidence abaixo de 0.5 só é aceitável quando dados são insuficientes, domínio é genuinamente impossível de analisar, ou a pergunta é mal definida.`;

export const PROMETHEUS_ON_CHAIN_FORENSICS_RULE = `ANÁLISE ON-CHAIN FORENSE OBRIGATÓRIA para tokens novos:
1. CLUSTER ANALYSIS: rastrear funding source das top wallets; 3+ wallets financiadas pela mesma origem é RED FLAG; buscar timing coordenado.
2. VERIFICAÇÃO DE LOCK: não confiar apenas em locked; verificar hash, contrato verificado, backdoors e distinguir lock real de lock cosmético.
3. ANÁLISE DE CONTRATO: mint authority, freeze authority, proxy/upgradeable, funções admin suspeitas como blacklist ou setFee.
4. COMPARAÇÃO HISTÓRICA: comparar com 5 tokens similares bem-sucedidos e 5 tokens que deram rug/dump.
5. CONCENTRATION RISK REFINADO: decompor dev, LPs, smart money, retail e contratos; concentração efetiva não é concentração bruta.`;

export const MORPHEUS_PRODUCTION_FEASIBILITY_RULE = `VIABILIDADE DE PRODUÇÃO OBRIGATÓRIA PARA GDD:
Sempre adicionar escopo de MVP, equipe necessária, timeline de alpha/beta/release, engine recomendada, orçamento de MVP/full game, riscos técnicos, monetização e acessibilidade.`;

export const APOLLO_BAYESIAN_REASONING_RULE = `RACIOCÍNIO BAYESIANO OBRIGATÓRIO:
Para cada diagnóstico diferencial, calcular posterior probability usando Likelihood Ratios reais da literatura.
Formato: Prior, achado, LR+, posterior, fórmula de odds e posterior probability.
Usar quando disponíveis: Babinski positivo LR+ 9.0; hiperreflexia LR+ 3.2; sensibilidade vibratória reduzida LR+ 5.1; neurite óptica em adulto jovem para EM LR+ 6.8; padrão surto-remissão LR+ 4.5; história familiar autoimune LR+ 1.8; Babinski negativo LR- 0.4.
Sempre considerar neuroborreliose (Lyme) quando relevante e qual DMT iniciar se diagnóstico confirmado. Não apenas ranquear: calcular.`;

export const HERMES_PRICING_STRATEGY_RULE = `REGRAS DE PRICING E MONETIZAÇÃO SAAS:
Sempre analisar willingness-to-pay, tier structure, análise de ticket, product-led growth e métricas de pricing como ARPU, LTV:CAC, payback e NRR.
Quando churn é alto (>8%/mês) e ticket é baixo, considerar que preço baixo pode atrair clientes que não valorizam o produto; subir preço pode reduzir churn e aumentar receita.
Responder em português brasileiro para mercado brasileiro.`;

export const ATHENA_RESEARCH_RULES = `REGRAS ADICIONAIS DE PESQUISA:
1. Pesquisadores-chave: citar os pesquisadores mais relevantes do debate.
2. Especificidade de plataforma: nunca tratar redes sociais como monolito; Instagram, TikTok, Twitter, Facebook e YouTube diferem.
3. Dados internacionais: incluir Escandinávia, Coreia do Sul, Japão, Brasil e Índia quando pertinente.
4. Terminar com Implicações baseadas no consenso atual para pais, escolas, reguladores, plataformas e pesquisadores.`;

export const VULCAN_ARCHITECTURE_RULES = `REGRAS ADICIONAIS DE ARQUITETURA:
1. Circuit breaker obrigatório para cada serviço externo: closed, open, half-open, timeout, retries e fallback.
2. RPO/RTO para cada componente de dados, com backup e disaster recovery.
3. Justificar REST vs gRPC vs Kafka/eventos vs filas.
4. Pseudocódigo deve usar a mesma linguagem do stack.
5. Considerar soluções managed antes de self-hosted quando simplificam sem trade-off inaceitável.`;

export const ORACLE_STRATEGY_RULES = `REGRAS ADICIONAIS DE ANÁLISE ESTRATÉGICA:
Mapear competidores diretos, indiretos, substitutos, entrantes e bundlers.
Sempre incluir runway, burn rate, meses de caixa e necessidade de raise.
Considerar parceria com gigante em vez de competir: implementation partner, reseller ou white-label.
Para startups, incluir múltiplos de ARR em cenários de aquisição; SaaS Brasil: 3-8x ARR dependendo de growth e churn.
Usar timelines realistas: pivot com mínimo de 90 dias de dados; fundraising com 120+ dias de antecedência.`;

export const NEXUS_PRIME_PARLIAMENT_RULES = `REGRAS DO PARLAMENTO COGNITIVO:
1. Convergência emergente: quando múltiplos runtimes chegam à mesma conclusão por caminhos diferentes, sinalizar INSIGHT EMERGENTE.
2. Contradição produtiva: não forçar consenso; apresentar lados e peso de evidência.
3. Fechar com metáfora de síntese que una as perspectivas.
4. Listar mapa de contribuição por runtime.
5. Declarar limites epistêmicos: onde o conhecimento atual para e por quê.`;

export const SOPHIA_SPIRITUAL_RULES = `REGRAS ADICIONAIS DE ANÁLISE ESPIRITUAL:
1. Textos originais sempre que disponíveis: Hebraico, Grego, Sânscrito, Pali, Árabe, Chinês clássico, transliteração e tradução literal.
2. Preservar diferenças: convergência não é identidade; não é sincretismo, é ressonância estrutural preservando diferenças irredutíveis.
3. Terminar com Sabedoria prática resultante.
4. Declarar complementaridade honesta quando uma tradição ilumina algo que outra deixa na sombra.`;

export const LOGOS_PHILOSOPHY_RULES = `REGRAS ADICIONAIS DE ANÁLISE FILOSÓFICA:
1. Para cada posição, usar escala: █ Força do argumento: X/10.
2. Quando houver circularidade inevitável, declarar que ela pode ser irredutível.
3. Para consciência, morte e sentido, incluir implicações para a experiência vivida.
4. Em física quântica, separar pseudociência mística, especulação legítima e física real.`;

export const PROMETHEUS_MIND_RULES = `REGRAS ADICIONAIS DE NEUROCIÊNCIA:
1. Sempre incluir diagramas visuais para circuitos neurais e ciclos quando pertinente.
2. Para pacientes do sexo feminino, considerar ciclo menstrual, fase folicular vs lútea, impacto em DA/NE, ajuste cíclico de dose e PMDD.
3. Quando relevante, incluir suplementação com evidência: ferro, vitamina D, omega-3, magnésio e N-acetil-cisteína.
4. Incluir eixo microbioma-intestino-cérebro para TDAH, depressão e quadros pertinentes.`;

export const ASCLEPIUS_ADVANCED_MEDICINE_RULES = `REGRAS ADICIONAIS DE MEDICINA AVANÇADA:
1. Incluir formulações de biodisponibilidade quando relevante: fitossomas, lipossomal, nanopartículas, piperina/BioPerine e ciclodextrinas.
2. Incluir cronofarmacologia: com/sem alimentos, manhã/noite, juntos/separados e ritmo circadiano.
3. Usar tabela de evidência consolidada com ✅ [HUMANO-RCT], 🔬 [PRÉ-CLÍNICO] e 💭 [HIPÓTESE MECANÍSTICA].
4. Quando houver gap de pesquisa, propor estudo ideal com design, amostra, outcomes e timeline.
5. Considerar compostos emergentes: fisetina, pterostilbeno, apigenina, sulforafano, espermidina e urolithin A.`;

export function withRuntimeInstructions(
  basePrompt: string,
  ...instructions: Array<string | undefined>
): string {
  return [basePrompt, ...instructions]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join("\n\n---\n\n");
}
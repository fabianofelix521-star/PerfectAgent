import { SimpleNexusTool } from "@/tools/core/SimpleNexusTool";

export class SmartContractExecutorTool extends SimpleNexusTool {
  constructor() {
    super({
      id: "smart-contract-executor",
      name: "Smart Contract Executor",
      description: "Planeja chamadas on-chain com simulacao, limites de risco e modo dry-run por padrao.",
      category: "execution",
      keywords: ["contract", "smart", "onchain", "transaction", "simulate", "gas", "wallet"],
      strategy: "simulate-before-submit",
    });
  }
}

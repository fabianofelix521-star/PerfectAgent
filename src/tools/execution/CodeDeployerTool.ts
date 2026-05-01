import { SimpleNexusTool } from "@/tools/core/SimpleNexusTool";

export class CodeDeployerTool extends SimpleNexusTool {
  constructor() {
    super({
      id: "code-deployer",
      name: "Code Deployer",
      description: "Planeja deploy com checks, canary, rollback e avaliacao de risco por ambiente.",
      category: "execution",
      keywords: ["deploy", "code", "build", "release", "rollback", "canary", "environment"],
      strategy: "preflight-canary-rollback",
    });
  }
}

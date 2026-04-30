import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { AgentRuntime, ChatMessageV2, StudioProject } from "@/types";
import type { ChatThread } from "@/stores/config";

export interface WorkflowRecord {
  id: string;
  name: string;
  description?: string;
  nodes: unknown[];
  edges: unknown[];
  status: "draft" | "active" | "paused";
  lastRun?: number;
  runCount: number;
}

export interface AgentTaskRecord {
  id: string;
  agentId: string;
  prompt: string;
  status: "queued" | "running" | "completed" | "failed";
  steps: unknown[];
  result?: string;
  error?: string;
  startedAt?: number;
  completedAt?: number;
}

interface PerfectAgentDB extends DBSchema {
  chatSessions: {
    key: string;
    value: ChatThread;
    indexes: { "by-updated": number };
  };
  projects: {
    key: string;
    value: StudioProject;
    indexes: { "by-updated": number };
  };
  agents: {
    key: string;
    value: AgentRuntime;
    indexes: { "by-status": string };
  };
  workflows: {
    key: string;
    value: WorkflowRecord;
    indexes: { "by-status": string };
  };
  agentTasks: {
    key: string;
    value: AgentTaskRecord;
    indexes: { "by-agent": string };
  };
}

class StorageServiceImpl {
  private dbPromise: Promise<IDBPDatabase<PerfectAgentDB>> | null = null;

  private getDb() {
    if (!this.dbPromise) {
      this.dbPromise = openDB<PerfectAgentDB>("perfectagent", 1, {
        upgrade(db) {
          const chat = db.createObjectStore("chatSessions", { keyPath: "id" });
          chat.createIndex("by-updated", "updatedAt");
          const projects = db.createObjectStore("projects", { keyPath: "id" });
          projects.createIndex("by-updated", "updatedAt");
          const agents = db.createObjectStore("agents", { keyPath: "id" });
          agents.createIndex("by-status", "status");
          const workflows = db.createObjectStore("workflows", { keyPath: "id" });
          workflows.createIndex("by-status", "status");
          const tasks = db.createObjectStore("agentTasks", { keyPath: "id" });
          tasks.createIndex("by-agent", "agentId");
        },
      });
    }
    return this.dbPromise;
  }

  async saveChatSession(session: ChatThread): Promise<void> {
    await (await this.getDb()).put("chatSessions", session);
  }

  async getChatSessions(): Promise<ChatThread[]> {
    const sessions = await (await this.getDb()).getAll("chatSessions");
    return sessions.sort(
      (a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt),
    );
  }

  async deleteChatSession(id: string): Promise<void> {
    await (await this.getDb()).delete("chatSessions", id);
  }

  async saveProject(project: StudioProject): Promise<void> {
    await (await this.getDb()).put("projects", project);
  }

  async getProjects(): Promise<StudioProject[]> {
    const projects = await (await this.getDb()).getAll("projects");
    return projects.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async deleteProject(id: string): Promise<void> {
    await (await this.getDb()).delete("projects", id);
  }

  async saveAgent(agent: AgentRuntime): Promise<void> {
    await (await this.getDb()).put("agents", agent);
  }

  async getAgents(): Promise<AgentRuntime[]> {
    return await (await this.getDb()).getAll("agents");
  }

  async saveWorkflow(workflow: WorkflowRecord): Promise<void> {
    await (await this.getDb()).put("workflows", workflow);
  }

  async getWorkflows(): Promise<WorkflowRecord[]> {
    return await (await this.getDb()).getAll("workflows");
  }

  async saveTask(task: AgentTaskRecord): Promise<void> {
    await (await this.getDb()).put("agentTasks", task);
  }

  async getTasksByAgent(agentId: string): Promise<AgentTaskRecord[]> {
    return await (await this.getDb()).getAllFromIndex(
      "agentTasks",
      "by-agent",
      agentId,
    );
  }

  async appendChatMessage(thread: ChatThread, message: ChatMessageV2) {
    await this.saveChatSession({
      ...thread,
      messages: [...thread.messages, message],
      updatedAt: Date.now(),
    });
  }
}

export const StorageService = new StorageServiceImpl();

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { AgentRuntime, ChatMessageV2, ProjectFile, StudioProject } from "@/types";
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

export interface ArtifactRecord {
  /** messageId, `project:{projectId}:{filename}`, or any unique key */
  id: string;
  /** Files: source code, images (dataUrl), sprites, audio (dataUrl), etc. */
  files: ProjectFile[];
  threadId?: string;
  projectId?: string;
  label?: string;
  createdAt: number;
  updatedAt: number;
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
  artifacts: {
    key: string;
    value: ArtifactRecord;
    indexes: { "by-thread": string; "by-project": string };
  };
}

class StorageServiceImpl {
  private dbPromise: Promise<IDBPDatabase<PerfectAgentDB>> | null = null;

  private getDb() {
    if (!this.dbPromise) {
      this.dbPromise = openDB<PerfectAgentDB>("perfectagent", 2, {
        upgrade(db, _oldVersion) {
          // v1 stores (create only if not already present)
          if (!db.objectStoreNames.contains("chatSessions")) {
            const chat = db.createObjectStore("chatSessions", { keyPath: "id" });
            chat.createIndex("by-updated", "updatedAt");
          }
          if (!db.objectStoreNames.contains("projects")) {
            const projects = db.createObjectStore("projects", { keyPath: "id" });
            projects.createIndex("by-updated", "updatedAt");
          }
          if (!db.objectStoreNames.contains("agents")) {
            const agents = db.createObjectStore("agents", { keyPath: "id" });
            agents.createIndex("by-status", "status");
          }
          if (!db.objectStoreNames.contains("workflows")) {
            const workflows = db.createObjectStore("workflows", { keyPath: "id" });
            workflows.createIndex("by-status", "status");
          }
          if (!db.objectStoreNames.contains("agentTasks")) {
            const tasks = db.createObjectStore("agentTasks", { keyPath: "id" });
            tasks.createIndex("by-agent", "agentId");
          }
          // v2: artifacts store for large generated files and binary assets
          if (!db.objectStoreNames.contains("artifacts")) {
            const art = db.createObjectStore("artifacts", { keyPath: "id" });
            art.createIndex("by-thread", "threadId");
            art.createIndex("by-project", "projectId");
          }
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

  // ---------------------------------------------------------------------------
  // Artifacts — large generated files, images, game assets, audio, etc.
  // Stored in IDB; no quota limit (uses host SSD).
  // ---------------------------------------------------------------------------

  async saveArtifacts(record: ArtifactRecord): Promise<void> {
    await (await this.getDb()).put("artifacts", record);
  }

  async getArtifacts(id: string): Promise<ArtifactRecord | undefined> {
    return (await this.getDb()).get("artifacts", id);
  }

  async getArtifactsByThread(threadId: string): Promise<ArtifactRecord[]> {
    return (await this.getDb()).getAllFromIndex("artifacts", "by-thread", threadId);
  }

  async getArtifactsByProject(projectId: string): Promise<ArtifactRecord[]> {
    return (await this.getDb()).getAllFromIndex("artifacts", "by-project", projectId);
  }

  async deleteArtifacts(id: string): Promise<void> {
    await (await this.getDb()).delete("artifacts", id);
  }

  async deleteArtifactsByThread(threadId: string): Promise<void> {
    const records = await this.getArtifactsByThread(threadId);
    const tx = (await this.getDb()).transaction("artifacts", "readwrite");
    await Promise.all(records.map((r) => tx.store.delete(r.id)));
    await tx.done;
  }
}

export const StorageService = new StorageServiceImpl();

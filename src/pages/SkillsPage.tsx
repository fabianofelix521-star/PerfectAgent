import { useEffect, useMemo, useState } from "react";
import { BrainCircuit, Plus, Pencil, Trash2, Sparkles, Store, ExternalLink, CheckCircle2 } from "lucide-react";
import { useConfig } from "@/stores/config";
import { skillRegistry } from "@/core/skills/SkillRegistry";
import { SKILL_MARKETPLACES, type SkillMarketplace } from "@/services/skillMarketplaces";
import { WorkspaceShell, Surface, HeaderAction, Modal, Tag, ToggleRow, EditableField, Spinner } from "@/components/ui";
import type { Skill } from "@/types";
import type { Skill as RegistrySkill } from "@/core/skills/types";
import { toast } from "@/components/Toast";

function rid() { return `sk-${Math.random().toString(36).slice(2, 9)}`; }

function registrySkillToStore(skill: RegistrySkill, existing?: Skill): Skill {
  return {
    id: skill.id,
    name: skill.name,
    description: skill.description,
    systemPrompt: skill.promptTemplate ?? skill.description,
    tags: skill.tags,
    enabled: existing?.enabled ?? false,
    builtIn: skill.author === "builtin",
  };
}

export function SkillsPage() {
  const storeSkills = useConfig((s) => s.skills);
  const upsertSkill = useConfig((s) => s.upsertSkill);
  const removeSkill = useConfig((s) => s.removeSkill);
  const toggleSkill = useConfig((s) => s.toggleSkill);
  const [editing, setEditing] = useState<Skill | null>(null);
  const [creating, setCreating] = useState(false);
  const skills = useMemo(() => {
    const storeById = new Map(storeSkills.map((skill) => [skill.id, skill]));
    const merged = new Map<string, Skill>();
    for (const skill of skillRegistry.list()) {
      merged.set(skill.id, registrySkillToStore(skill, storeById.get(skill.id)));
    }
    for (const skill of storeSkills) merged.set(skill.id, skill);
    return Array.from(merged.values()).sort((a, b) => {
      if (a.builtIn !== b.builtIn) return a.builtIn ? -1 : 1;
      if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [storeSkills]);

  function handleToggle(skill: Skill) {
    if (storeSkills.some((item) => item.id === skill.id)) {
      toggleSkill(skill.id);
      return;
    }
    upsertSkill({ ...skill, enabled: true });
  }

  function handleInstallMarketplace(marketplace: SkillMarketplace) {
    const skill = marketplaceToSkill(marketplace);
    upsertSkill(skill);
    toast.success(`${marketplace.name} disponível no catálogo`);
  }

  return (
    <WorkspaceShell
      eyebrow="Skills"
      title="Capacidades reutilizáveis"
      description="Skills são prompts de sistema que você ativa em qualquer chat. Combine várias para compor o agente perfeito."
      action={<HeaderAction icon={Plus} label="Nova skill" onClick={() => setCreating(true)} />}
    >
      <Surface className="mb-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Skill Stores
            </p>
            <h2 className="text-lg font-semibold text-slate-950">
              Lojas e bancos conectados
            </h2>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600">
            <Store className="h-3.5 w-3.5" />
            ClawHub + SkillsMP
          </span>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {SKILL_MARKETPLACES.map((marketplace) => {
            const installed = storeSkills.some(
              (skill) => skill.id === marketplaceSkillId(marketplace.id),
            );
            return (
              <div
                key={marketplace.id}
                className="rounded-3xl border border-white/70 bg-white/60 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-950">
                      {marketplace.name}
                    </h3>
                    <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
                      {marketplace.description}
                    </p>
                  </div>
                  {installed ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  ) : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {marketplace.tags.map((tag) => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </div>
                <p className="mt-3 rounded-2xl bg-slate-950/5 p-3 text-[11px] font-mono leading-5 text-slate-600">
                  {marketplace.localPath ?? marketplace.url}
                </p>
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  {marketplace.url ? (
                    <button
                      type="button"
                      onClick={() => window.open(marketplace.url, "_blank", "noopener,noreferrer")}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Abrir
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => handleInstallMarketplace(marketplace)}
                    className="inline-flex items-center gap-1 rounded-full bg-[#17172d] px-3 py-1.5 text-xs font-bold text-white"
                  >
                    {installed ? "Reinstalar" : "Instalar"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Surface>
      <Surface>
        <div className="grid gap-3 lg:grid-cols-2">
          {skills.length === 0 ? (
            <div className="col-span-full rounded-3xl border border-dashed border-slate-300 bg-white/60 p-10 text-center text-sm text-slate-500">
              Nenhuma skill ainda. <button className="font-bold text-slate-900 underline" onClick={() => setCreating(true)}>Criar uma</button>
            </div>
          ) : skills.map((sk) => (
            <SkillCard key={sk.id} skill={sk}
              onToggle={() => handleToggle(sk)}
              onEdit={() => setEditing(sk)}
              onDelete={() => {
                if (confirm(`Excluir skill "${sk.name}"?`)) { removeSkill(sk.id); toast.info(`Skill "${sk.name}" removida`); }
              }} />
          ))}
        </div>
      </Surface>

      <SkillEditor
        open={creating}
        skill={null}
        onSave={(s) => { upsertSkill(s); setCreating(false); toast.success(`Skill "${s.name}" criada`); }}
        onClose={() => setCreating(false)}
      />
      <SkillEditor
        open={!!editing}
        skill={editing}
        onSave={(s) => { upsertSkill(s); setEditing(null); toast.success(`Skill "${s.name}" atualizada`); }}
        onClose={() => setEditing(null)}
      />
    </WorkspaceShell>
  );
}

function marketplaceSkillId(id: string): string {
  if (id === "clawhub-local") return "sk-felixsuperclaw-local";
  if (id === "skillsmp") return "sk-skillsmp-marketplace";
  if (id === "ui-ux-pro-max") return "sk-ui-ux-pro-max";
  return `sk-${id}`;
}

function marketplaceToSkill(marketplace: SkillMarketplace): Skill {
  return {
    id: marketplaceSkillId(marketplace.id),
    name: marketplace.name,
    description: marketplace.description,
    systemPrompt: `${marketplace.description}\n\n${marketplace.installHint}\n${marketplace.url ? `Fonte: ${marketplace.url}` : ""}\n${marketplace.localPath ? `Caminho local: ${marketplace.localPath}` : ""}`,
    tags: marketplace.tags,
    enabled: true,
    builtIn: true,
  };
}

function SkillCard({ skill, onToggle, onEdit, onDelete }: { skill: Skill; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/60 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#17172d] text-white"><BrainCircuit className="h-5 w-5" /></span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-slate-950">{skill.name}</h3>
              {skill.builtIn && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">Built-in</span>}
            </div>
            <p className="mt-1 text-xs font-medium text-slate-500">{skill.description}</p>
          </div>
        </div>
        <button onClick={onToggle} className={`relative h-6 w-11 shrink-0 rounded-full transition ${skill.enabled ? "bg-emerald-500" : "bg-slate-300"}`}>
          <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${skill.enabled ? "left-6" : "left-1"}`} />
        </button>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">{skill.tags.map((t) => <Tag key={t}>{t}</Tag>)}</div>
      <div className="mt-4 max-h-24 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-[11px] font-mono text-slate-600">
        {skill.systemPrompt.slice(0, 280)}{skill.systemPrompt.length > 280 ? "..." : ""}
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button onClick={onEdit} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50">
          <Pencil className="h-3 w-3" /> Editar
        </button>
        {!skill.builtIn && (
          <button onClick={onDelete} className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100">
            <Trash2 className="h-3 w-3" /> Excluir
          </button>
        )}
      </div>
    </div>
  );
}

function SkillEditor({ open, skill, onSave, onClose }: { open: boolean; skill: Skill | null; onSave: (s: Skill) => void; onClose: () => void }) {
  const [name, setName] = useState(skill?.name ?? "");
  const [description, setDescription] = useState(skill?.description ?? "");
  const [systemPrompt, setSystemPrompt] = useState(skill?.systemPrompt ?? "");
  const [tags, setTags] = useState((skill?.tags ?? []).join(", "));
  const [enabled, setEnabled] = useState(skill?.enabled ?? true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(skill?.name ?? "");
    setDescription(skill?.description ?? "");
    setSystemPrompt(skill?.systemPrompt ?? "");
    setTags((skill?.tags ?? []).join(", "));
    setEnabled(skill?.enabled ?? true);
  }, [open, skill]);

  const handleSave = () => {
    if (!name.trim()) { toast.error("Nome é obrigatório"); return; }
    if (!systemPrompt.trim()) { toast.error("Prompt do sistema é obrigatório"); return; }
    const next: Skill = {
      id: skill?.id ?? rid(),
      name: name.trim(),
      description: description.trim(),
      systemPrompt: systemPrompt.trim(),
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      enabled,
      builtIn: skill?.builtIn,
    };
    onSave(next);
  };

  const generatePrompt = async () => {
    if (!description.trim()) { toast.error("Adicione uma descrição primeiro"); return; }
    setGenerating(true);
    try {
      // simple template — could be wired to LLM later
      const tpl = `You are a specialist in: ${description.trim()}.
- Provide accurate, actionable answers.
- Cite assumptions explicitly.
- Use markdown for code and tables.
- When uncertain, ask clarifying questions.`;
      setSystemPrompt(tpl);
      toast.success("Prompt gerado");
    } finally { setGenerating(false); }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={skill ? "Editar skill" : "Nova skill"}
      width={620}
      footer={
        <>
          <button onClick={onClose} className="rounded-full px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-900">Cancelar</button>
          <button onClick={handleSave} className="rounded-full bg-[#17172d] px-5 py-2 text-sm font-bold text-white">Salvar</button>
        </>
      }
    >
      <div className="space-y-3">
        <EditableField label="Nome" value={name} onChange={setName} placeholder="Ex: SQL Wizard" />
        <EditableField label="Descrição" value={description} onChange={setDescription} placeholder="Resumo curto do que essa skill faz" />
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Prompt do sistema</span>
            <button type="button" onClick={generatePrompt} disabled={generating} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-50">
              {generating ? <Spinner size={12} /> : <Sparkles className="h-3 w-3" />} Gerar
            </button>
          </div>
          <textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} rows={8}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-mono text-slate-800 outline-none focus:border-slate-400"
            placeholder="You are an expert..." />
        </div>
        <EditableField label="Tags (separadas por vírgula)" value={tags} onChange={setTags} placeholder="code, review, sql" />
        <ToggleRow title="Ativar" desc="Skills ativas aparecem disponíveis no Code Studio" active={enabled} onToggle={() => setEnabled((v) => !v)} />
      </div>
    </Modal>
  );
}

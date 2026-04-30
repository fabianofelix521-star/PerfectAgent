import { useEffect, useState } from "react";
import { BrainCircuit, Plus, Pencil, Trash2, Sparkles } from "lucide-react";
import { useConfig } from "@/stores/config";
import { WorkspaceShell, Surface, HeaderAction, Modal, Tag, ToggleRow, EditableField, Spinner } from "@/components/ui";
import type { Skill } from "@/types";
import { toast } from "@/components/Toast";

function rid() { return `sk-${Math.random().toString(36).slice(2, 9)}`; }

export function SkillsPage() {
  const skills = useConfig((s) => s.skills);
  const upsertSkill = useConfig((s) => s.upsertSkill);
  const removeSkill = useConfig((s) => s.removeSkill);
  const toggleSkill = useConfig((s) => s.toggleSkill);
  const [editing, setEditing] = useState<Skill | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <WorkspaceShell
      eyebrow="Skills"
      title="Capacidades reutilizáveis"
      description="Skills são prompts de sistema que você ativa em qualquer chat. Combine várias para compor o agente perfeito."
      action={<HeaderAction icon={Plus} label="Nova skill" onClick={() => setCreating(true)} />}
    >
      <Surface>
        <div className="grid gap-3 lg:grid-cols-2">
          {skills.length === 0 ? (
            <div className="col-span-full rounded-3xl border border-dashed border-slate-300 bg-white/60 p-10 text-center text-sm text-slate-500">
              Nenhuma skill ainda. <button className="font-bold text-slate-900 underline" onClick={() => setCreating(true)}>Criar uma</button>
            </div>
          ) : skills.map((sk) => (
            <SkillCard key={sk.id} skill={sk}
              onToggle={() => toggleSkill(sk.id)}
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

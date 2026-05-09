"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Upload, Loader2, ChevronDown, ChevronRight, Trash2, Save, X } from "lucide-react";

interface MaterialSource {
  id: string;
  fileName: string;
  createdAt: string;
}

interface FileRowProps {
  source: MaterialSource;
  onDelete: (id: string) => void;
}

function FileRow({ source, onDelete }: FileRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [loadingMd, setLoadingMd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [edited, setEdited] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const toggle = async () => {
    if (!expanded && markdown === null) {
      setLoadingMd(true);
      try {
        const r = await fetch(`/api/materials/sources/${source.id}`);
        const d = await r.json();
        setMarkdown(d.markdownContent ?? "");
      } catch {
        setMarkdown("");
      } finally {
        setLoadingMd(false);
      }
    }
    setExpanded((v) => !v);
  };

  const save = async () => {
    if (markdown === null) return;
    setSaving(true);
    setSaveError(null);
    try {
      const r = await fetch(`/api/materials/sources/${source.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdownContent: markdown }),
      });
      if (!r.ok) throw new Error("Save failed");
      setEdited(false);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    setDeleting(true);
    try {
      await fetch(`/api/materials/sources/${source.id}`, { method: "DELETE" });
      onDelete(source.id);
    } catch {
      setDeleting(false);
    }
  };

  const date = new Date(source.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="rounded-lg border border-border/40 bg-secondary/20 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          onClick={toggle}
          className="flex items-center gap-2 flex-1 min-w-0 text-left"
        >
          {loadingMd ? (
            <Loader2 size={12} className="text-muted-foreground/50 shrink-0 animate-spin" />
          ) : expanded ? (
            <ChevronDown size={12} className="text-muted-foreground/50 shrink-0" />
          ) : (
            <ChevronRight size={12} className="text-muted-foreground/50 shrink-0" />
          )}
          <FileText size={12} className="text-primary/60 shrink-0" />
          <span className="text-xs text-foreground/80 truncate">{source.fileName}</span>
          <span className="text-[10px] text-muted-foreground/40 shrink-0 ml-auto">{date}</span>
        </button>
        <button
          onClick={del}
          disabled={deleting}
          className="shrink-0 p-1 rounded hover:bg-destructive/10 text-muted-foreground/30 hover:text-destructive transition-colors disabled:opacity-40"
          title="Delete file"
        >
          {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="overflow-hidden border-t border-border/30"
          >
            <div className="p-3 space-y-2">
              <textarea
                className="w-full min-h-[180px] text-[11px] font-mono text-foreground/70 bg-secondary/40 border border-border/30 rounded-md p-2 resize-y focus:outline-none focus:ring-1 focus:ring-primary/40 leading-relaxed"
                value={markdown ?? ""}
                onChange={(e) => { setMarkdown(e.target.value); setEdited(true); setSaveError(null); }}
                placeholder="Markdown outline…"
                spellCheck={false}
              />
              {saveError && (
                <p className="text-[10px] text-destructive flex items-center gap-1">
                  <X size={10} /> {saveError}
                </p>
              )}
              {edited && (
                <button
                  onClick={save}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                  Save
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface MaterialsWidgetProps {
  skillTreeId: string;
  initialSources: MaterialSource[];
}

export function MaterialsWidget({ skillTreeId, initialSources }: MaterialsWidgetProps) {
  const [sources, setSources] = useState<MaterialSource[]>(initialSources);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    const fd = new FormData();
    fd.append("skillTreeId", skillTreeId);
    fd.append("file", file);
    try {
      const r = await fetch("/api/materials/sources", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Upload failed");
      setSources((prev) => [...prev, d.source as MaterialSource]);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 360, damping: 28, delay: 0.22 }}
      className="glass-card glass-panel p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
          Course Files
        </p>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold text-primary border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors disabled:opacity-40"
          title="Upload another file"
        >
          {uploading ? (
            <Loader2 size={10} className="animate-spin" />
          ) : (
            <Upload size={10} />
          )}
          {uploading ? "Uploading…" : "Add file"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.txt,.md"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
            e.target.value = "";
          }}
        />
      </div>

      {uploadError && (
        <p className="text-[10px] text-destructive flex items-center gap-1">
          <X size={10} /> {uploadError}
        </p>
      )}

      {sources.length === 0 ? (
        <div className="text-center py-4">
          <FileText size={16} className="text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-[11px] text-muted-foreground/40">
            No files uploaded yet.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {sources.map((s) => (
            <FileRow
              key={s.id}
              source={s}
              onDelete={(id) => setSources((prev) => prev.filter((x) => x.id !== id))}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

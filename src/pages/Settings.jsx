import React from 'react';
import { Ruler, Trash2, Info, Sparkles } from 'lucide-react';
import { useProject } from '@/lib/ProjectContext';
import { UNITS } from '@/lib/geometry';

export default function Settings() {
  const { material, setMaterial, savedProjects, deleteProject } = useProject();
  const [dark, setDark] = React.useState(document.documentElement.classList.contains('dark'));

  React.useEffect(() => {
    if (dark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [dark]);

  return (
    <div className="p-4 sm:p-6 max-w-[800px] mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-[#172B21]">Settings</h1>
        <p className="text-sm text-[#64748B] mt-1">Preferences for this demo session.</p>
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-[#E2E8E4] p-5">
          <div className="flex items-center gap-2 mb-3"><Ruler className="w-4 h-4 text-[#15803D]" /><h3 className="font-display font-semibold text-[#172B21]">Default unit</h3></div>
          <div className="flex gap-2">
            {Object.entries(UNITS).map(([k, v]) => (
              <button key={k} onClick={() => setMaterial((prev) => ({ ...prev, unit: k }))} className={`px-4 py-2 rounded-lg text-sm font-medium ${material.unit === k ? 'bg-[#123D26] text-white' : 'border border-[#E2E8E4] text-[#64748B] hover:bg-[#F4F7F5]'}`}>{v.label}</button>
            ))}
          </div>
          <p className="text-xs text-[#94A3B8] mt-2">All dimensions are stored in millimeters internally; switching units only changes display.</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8E4] p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-semibold text-[#172B21]">Dark theme</h3>
              <p className="text-xs text-[#64748B] mt-0.5">Toggle a darker interface.</p>
            </div>
            <button onClick={() => setDark((d) => !d)} className={`w-12 h-7 rounded-full transition ${dark ? 'bg-[#16A34A]' : 'bg-[#E2E8E4]'} relative`}>
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${dark ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8E4] p-5">
          <div className="flex items-center gap-2 mb-2"><Trash2 className="w-4 h-4 text-[#DC2626]" /><h3 className="font-display font-semibold text-[#172B21]">Saved projects</h3></div>
          <p className="text-xs text-[#64748B] mb-3">{savedProjects.length} project(s) stored locally.</p>
          {savedProjects.length > 0 && (
            <button onClick={() => savedProjects.forEach((_, i) => deleteProject(0))} className="text-xs font-medium px-3 py-2 rounded-lg border border-red-200 text-[#DC2626] hover:bg-red-50">Clear all saved projects</button>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8E4] p-5">
          <div className="flex items-center gap-2 mb-2"><Sparkles className="w-4 h-4 text-[#15803D]" /><h3 className="font-display font-semibold text-[#172B21]">AI & Voice</h3></div>
          <p className="text-xs text-[#64748B]">The ScrapSmart AI assistant uses a server-side language model with your live project context. Voice output uses your browser's speech synthesis; voice input uses the browser's speech recognition where available.</p>
        </div>

        <div className="bg-[#123D26] text-white rounded-2xl p-5 flex items-start gap-3">
          <Info className="w-5 h-5 text-emerald-300 mt-0.5 shrink-0" />
          <div className="text-sm text-emerald-100/90">
            <p className="font-semibold text-white mb-1">About ScrapSmart</p>
            ScrapSmart is a material cutting optimization demo. The optimizer is a real MaxRects-BSSF packer. All utilization, waste, and cost figures are computed from the validated layout — nothing is hardcoded.
          </div>
        </div>
      </div>
    </div>
  );
}

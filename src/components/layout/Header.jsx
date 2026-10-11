import React from 'react';
import { useLocation } from 'react-router-dom';
import { Save, Sun, Moon, HelpCircle, User, Sparkles } from 'lucide-react';
import { useProject } from '@/lib/ProjectContext';

const STEP_TITLES = {
  1: 'Material',
  2: 'Pieces',
  3: 'Optimize',
  4: 'Results',
};

export default function Header({ onToggleAssistant }) {
  const { projectName, material, matDef, step, saveProject } = useProject();
  const [saved, setSaved] = React.useState(false);
  const [dark, setDark] = React.useState(false);
  const location = useLocation();

  const handleSave = () => {
    saveProject();
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  React.useEffect(() => {
    if (dark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [dark]);

  const isWorkspace = location.pathname === '/';

  return (
    <header className="h-16 shrink-0 bg-white border-b border-[#E2E8E4] flex items-center justify-between px-6">
      <div className="flex items-center gap-4 min-w-0">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-[#64748B] font-semibold">
            {isWorkspace ? `Step ${String(step).padStart(2, '0')} · ${STEP_TITLES[step]}` : 'ScrapSmart'}
          </div>
          <div className="font-display font-semibold text-[#172B21] truncate">{projectName}</div>
        </div>
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#DCFCE7] text-[#15803D] text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
          {matDef.name} · {material.sheetWidth}×{material.sheetHeight}mm
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[#172B21] hover:bg-[#F4F7F5] transition-colors"
        >
          <Save className="w-4 h-4" />
          <span className="hidden sm:inline">{saved ? 'Saved!' : 'Save'}</span>
        </button>
        <button
          onClick={() => setDark((d) => !d)}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-[#64748B] hover:bg-[#F4F7F5] transition-colors"
          title="Toggle theme"
        >
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <button
          className="w-9 h-9 rounded-lg flex items-center justify-center text-[#64748B] hover:bg-[#F4F7F5] transition-colors"
          title="Help"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
        <div className="w-9 h-9 rounded-full bg-[#123D26] text-white flex items-center justify-center text-xs font-semibold" title="Guest">
          <User className="w-4 h-4" />
        </div>
        <button
          onClick={onToggleAssistant}
          className="ml-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-[#16A34A] text-white hover:bg-[#15803D] transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          <span className="hidden sm:inline">AI</span>
        </button>
      </div>
    </header>
  );
}

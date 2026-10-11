import React from 'react';
import { Check } from 'lucide-react';
import { MATERIALS } from '@/lib/materials';
import { useProject } from '@/lib/ProjectContext';

function MaterialPreview({ mat }) {
  const style = (() => {
    switch (mat.three.kind) {
      case 'wood':
        return {
          background:
            `repeating-linear-gradient(92deg, ${mat.base} 0px, ${mat.edge} 2px, ${mat.base} 6px, #B8895A 9px, ${mat.base} 14px)`,
        };
      case 'mdf':
        return {
          background: `linear-gradient(135deg, ${mat.base}, #B89A6A)`,
        };
      case 'acrylic':
        return {
          background: `linear-gradient(135deg, ${mat.base}, #BFE0F7 60%, ${mat.base})`,
          opacity: 0.85,
        };
      case 'cardboard':
        return {
          background: `repeating-linear-gradient(90deg, ${mat.base} 0px, ${mat.edge} 3px, ${mat.base} 7px)`,
        };
      case 'metal':
        return {
          background: `repeating-linear-gradient(90deg, ${mat.base} 0px, #DDE2E6 1px, ${mat.base} 3px, ${mat.edge} 5px)`,
        };
      default:
        return { background: mat.base };
    }
  })();
  return (
    <div className="relative h-28 rounded-xl overflow-hidden border border-black/5" style={style}>
      <div className="absolute inset-0" style={{ boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.15)' }} />
      <div className="absolute bottom-1.5 left-2 right-2 h-2 rounded-sm" style={{ background: mat.edge, opacity: 0.7 }} />
    </div>
  );
}

export default function MaterialSelector() {
  const { material, setMaterial } = useProject();

  return (
    <div>
      <div className="mb-4">
        <h2 className="font-display text-xl font-bold text-[#172B21]">Choose your material</h2>
        <p className="text-sm text-[#64748B] mt-0.5">The 3D sheet and pieces will render to match the real material surface.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {MATERIALS.map((m) => {
          const active = material.type === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setMaterial((prev) => ({ ...prev, type: m.id }))}
              className={`text-left rounded-2xl border-2 p-3 transition-all hover:shadow-md ${
                active ? 'border-[#16A34A] bg-[#DCFCE7]/40 ring-2 ring-[#16A34A]/20' : 'border-[#E2E8E4] bg-white hover:border-[#16A34A]/40'
              }`}
            >
              <MaterialPreview mat={m} />
              <div className="mt-3 flex items-start justify-between">
                <div>
                  <div className="font-semibold text-sm text-[#172B21]">{m.name}</div>
                  <div className="text-[11px] text-[#64748B]">{m.tagline}</div>
                </div>
                {active && (
                  <span className="w-5 h-5 rounded-full bg-[#16A34A] text-white flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" />
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

import React from 'react';
import { useProject } from '@/lib/ProjectContext';
import { MATERIALS, getMaterial } from '@/lib/materials';
import { UNITS, toMm, fromMm, clampNumber } from '@/lib/geometry';

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-[#94A3B8] mt-1">{hint}</p>}
    </div>
  );
}

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-[#E2E8E4] bg-white text-sm text-[#172B21] focus:outline-none focus:ring-2 focus:ring-[#16A34A]/30 focus:border-[#16A34A] transition';

export default function SheetConfig() {
  const { material, setMaterial } = useProject();
  const u = material.unit;
  const conv = (mm) => Number(fromMm(mm, u).toFixed(u === 'mm' ? 0 : u === 'cm' ? 1 : 2));

  const setField = (field, valueMm) =>
    setMaterial((prev) => ({ ...prev, [field]: clampNumber(valueMm, field === 'pricePerSheet' ? 0 : 1, 100000) }));

  const applyPreset = (size) => {
    setMaterial((prev) => ({
      ...prev,
      sheetWidth: size.length,
      sheetHeight: size.width,
      thickness: size.thickness,
    }));
  };

  const matDef = getMaterial(material.type);

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8E4] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold text-[#172B21]">Sheet setup</h3>
        <span className="text-xs font-medium text-[#15803D] bg-[#DCFCE7] px-2.5 py-1 rounded-full">{matDef.name}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Field label="Material">
          <select
            className={inputCls}
            value={material.type}
            onChange={(e) => setMaterial((prev) => ({ ...prev, type: e.target.value }))}
          >
            {MATERIALS.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Unit">
          <select
            className={inputCls}
            value={material.unit}
            onChange={(e) => setMaterial((prev) => ({ ...prev, unit: e.target.value }))}
          >
            {Object.entries(UNITS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Sheet quantity" hint="Max sheets the optimizer may use">
          <input
            type="number"
            min={1}
            className={inputCls}
            value={material.sheetQuantity}
            onChange={(e) => setMaterial((prev) => ({ ...prev, sheetQuantity: clampNumber(e.target.value, 1, 100) }))}
          />
        </Field>
        <Field label={`Sheet length (${u})`}>
          <input
            type="number"
            min={0}
            step={UNITS[u].step}
            className={inputCls}
            value={conv(material.sheetWidth)}
            onChange={(e) => setField('sheetWidth', toMm(Number(e.target.value) || 0, u))}
          />
        </Field>
        <Field label={`Sheet width (${u})`}>
          <input
            type="number"
            min={0}
            step={UNITS[u].step}
            className={inputCls}
            value={conv(material.sheetHeight)}
            onChange={(e) => setField('sheetHeight', toMm(Number(e.target.value) || 0, u))}
          />
        </Field>
        <Field label={`Thickness (${u})`}>
          <input
            type="number"
            min={0}
            step={UNITS[u].step}
            className={inputCls}
            value={conv(material.thickness)}
            onChange={(e) => setField('thickness', toMm(Number(e.target.value) || 0, u))}
          />
        </Field>
        <Field label="Price / sheet ($)">
          <input
            type="number"
            min={0}
            step={0.5}
            className={inputCls}
            value={material.pricePerSheet}
            onChange={(e) => setMaterial((prev) => ({ ...prev, pricePerSheet: clampNumber(e.target.value, 0, 100000) }))}
          />
        </Field>
        <Field label={`Saw kerf (${u})`} hint="Blade width reserved between cuts">
          <input
            type="number"
            min={0}
            step={UNITS[u].step}
            className={inputCls}
            value={conv(material.kerf)}
            onChange={(e) => setField('kerf', toMm(Number(e.target.value) || 0, u))}
          />
        </Field>
        <Field label={`Edge margin (${u})`}>
          <input
            type="number"
            min={0}
            step={UNITS[u].step}
            className={inputCls}
            value={conv(material.edgeMargin)}
            onChange={(e) => setField('edgeMargin', toMm(Number(e.target.value) || 0, u))}
          />
        </Field>
      </div>

      <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
        <label className="flex items-center gap-2 text-sm text-[#172B21] cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 rounded accent-[#16A34A]"
            checked={material.rotationAllowed}
            onChange={(e) => setMaterial((prev) => ({ ...prev, rotationAllowed: e.target.checked }))}
          />
          Allow 90° rotation of pieces
        </label>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-[#64748B]">Presets:</span>
          {matDef.commonSizes.map((s, i) => (
            <button
              key={i}
              onClick={() => applyPreset(s)}
              className="text-xs px-2.5 py-1 rounded-full border border-[#E2E8E4] hover:border-[#16A34A] hover:text-[#15803D] text-[#64748B] transition"
            >
              {s.length}×{s.width}×{s.thickness}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

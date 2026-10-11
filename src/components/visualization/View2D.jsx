import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ZoomIn, ZoomOut, Maximize, Tag, Ruler, RotateCw } from 'lucide-react';
import { useProject } from '@/lib/ProjectContext';
import { layoutSheet } from '@/lib/layoutSelection';

const LEFTOVER_FILL = '#E2E8E4';

export default function View2D({ layoutSource = 'layout', layoutData = null, synchronizedSheet = null, onSheetChange = null, height = 420 }) {
  const { layout, baseline, plans, material, selectedInstanceId, setSelectedInstanceId, activeSheetIndex, setActiveSheetIndex } = useProject();
  const source = layoutData ?? (layoutSource === 'baseline' ? baseline : layoutSource === 'layout' ? layout : plans?.[layoutSource]);
  const sheetIdx = synchronizedSheet ?? activeSheetIndex;
  const setSheetIdx = onSheetChange ?? setActiveSheetIndex;
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showLabels, setShowLabels] = useState(true);
  const [showDims, setShowDims] = useState(true);
  const [dragging, setDragging] = useState(null);
  const containerRef = useRef(null);
  const [containerW, setContainerW] = useState(800);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => setContainerW(entries[0].contentRect.width));
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (synchronizedSheet === null) setActiveSheetIndex(0);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [source, material.type]);

  const sheet = layoutSheet(source,sheetIdx);

  const baseScale = useMemo(() => {
    if (!sheet) return 1;
    const pad = 40;
    const sx = (containerW - pad * 2) / sheet.width;
    const sy = (height - pad * 2) / sheet.height;
    return Math.min(sx, sy);
  }, [sheet, containerW, height]);

  const scale = baseScale * zoom;

  const fitToScreen = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  if (!source || !sheet) {
    return (
      <div ref={containerRef} className="flex items-center justify-center text-[#94A3B8] text-sm" style={{ height }}>
        No corresponding sheet in this layout. Select another sheet or run optimization.
      </div>
    );
  }

  const pad = 20;
  const w = sheet.width * scale + pad * 2;
  const h = sheet.height * scale + pad * 2;

  const onPointerDown = (e) => {
    if (e.target.tagName === 'rect' && e.target.dataset.piece) return;
    setDragging({ x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y });
  };
  const onPointerMove = (e) => {
    if (!dragging) return;
    setPan({ x: dragging.panX + (e.clientX - dragging.x), y: dragging.panY + (e.clientY - dragging.y) });
  };
  const onPointerUp = () => setDragging(null);

  const onWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.max(0.3, Math.min(6, z * delta)));
  };

  return (
    <div ref={containerRef} className="relative w-full" style={{ height }}>
      {/* Toolbar */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-white/90 backdrop-blur rounded-xl border border-[#E2E8E4] p-1 shadow-sm">
        <button onClick={() => setZoom((z) => Math.min(6, z * 1.2))} className="w-8 h-8 rounded-lg hover:bg-[#F4F7F5] flex items-center justify-center text-[#64748B]" title="Zoom in"><ZoomIn className="w-4 h-4" /></button>
        <button onClick={() => setZoom((z) => Math.max(0.3, z / 1.2))} className="w-8 h-8 rounded-lg hover:bg-[#F4F7F5] flex items-center justify-center text-[#64748B]" title="Zoom out"><ZoomOut className="w-4 h-4" /></button>
        <button onClick={fitToScreen} className="w-8 h-8 rounded-lg hover:bg-[#F4F7F5] flex items-center justify-center text-[#64748B]" title="Fit to screen"><Maximize className="w-4 h-4" /></button>
        <div className="w-px h-5 bg-[#E2E8E4]" />
        <button onClick={() => setShowLabels((s) => !s)} className={`w-8 h-8 rounded-lg flex items-center justify-center ${showLabels ? 'bg-[#DCFCE7] text-[#15803D]' : 'text-[#64748B] hover:bg-[#F4F7F5]'}`} title="Toggle labels"><Tag className="w-4 h-4" /></button>
        <button onClick={() => setShowDims((s) => !s)} className={`w-8 h-8 rounded-lg flex items-center justify-center ${showDims ? 'bg-[#DCFCE7] text-[#15803D]' : 'text-[#64748B] hover:bg-[#F4F7F5]'}`} title="Toggle dimensions"><Ruler className="w-4 h-4" /></button>
      </div>

      {/* Sheet selector */}
      {source.sheets.length > 1 && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-white/90 backdrop-blur rounded-xl border border-[#E2E8E4] p-1 shadow-sm">
          {source.sheets.map((s, i) => (
            <button
              key={i}
              onClick={() => { setSheetIdx(i); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${i === sheetIdx ? 'bg-[#123D26] text-white' : 'text-[#64748B] hover:bg-[#F4F7F5]'}`}
            >
              {s.stockKind === 'offcut' ? 'Offcut' : 'Sheet'} {i + 1}
            </button>
          ))}
        </div>
      )}

      <div className="w-full h-full overflow-hidden flex items-center justify-center" onWheel={onWheel}>
        <svg
          width={w}
          height={h}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          style={{ cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none' }}
        >
          <g transform={`translate(${pad + pan.x}, ${pad + pan.y})`}>
            {/* Sheet background */}
            <rect x={0} y={0} width={sheet.width * scale} height={sheet.height * scale} rx={6} fill={LEFTOVER_FILL} stroke="#94A3B8" strokeWidth={1.5} />
            {/* Margin guide */}
            {material.edgeMargin > 0 && (
              <rect
                x={material.edgeMargin * scale}
                y={material.edgeMargin * scale}
                width={(sheet.width - material.edgeMargin * 2) * scale}
                height={(sheet.height - material.edgeMargin * 2) * scale}
                fill="none"
                stroke="#16A34A"
                strokeWidth={1}
                strokeDasharray="4 4"
                opacity={0.5}
              />
            )}
            {/* Pieces */}
            {sheet.placements.map((p) => {
              const selected = p.instanceId === selectedInstanceId;
              const fill = p.color || '#16A34A';
              return (
                <g
                  key={p.instanceId}
                  data-piece={p.instanceId}
                  onClick={(e) => { e.stopPropagation(); setSelectedInstanceId(selected ? null : p.instanceId); }}
                  style={{ cursor: 'pointer' }}
                >
                  <rect
                    x={p.x * scale}
                    y={p.y * scale}
                    width={p.w * scale}
                    height={p.h * scale}
                    rx={2}
                    fill={fill}
                    fillOpacity={0.78}
                    stroke={selected ? '#123D26' : '#ffffff'}
                    strokeWidth={selected ? 3 : 1.5}
                  />
                  {showLabels && p.w * scale > 28 && p.h * scale > 18 && (
                    <text
                      x={p.x * scale + 4}
                      y={p.y * scale + 12}
                      fontSize={Math.min(11, Math.max(7, p.h * scale * 0.22))}
                      fill="#ffffff"
                      fontWeight={700}
                      style={{ pointerEvents: 'none' }}
                    >
                      {p.name}
                    </text>
                  )}
                  {showDims && p.w * scale > 50 && p.h * scale > 30 && (
                    <text
                      x={p.x * scale + 4}
                      y={p.y * scale + p.h * scale - 5}
                      fontSize={Math.min(10, Math.max(6, p.h * scale * 0.18))}
                      fill="#ffffff"
                      fillOpacity={0.9}
                      style={{ pointerEvents: 'none' }}
                    >
                      {Math.round(p.w)}×{Math.round(p.h)}{p.rotated ? ' âŸ³' : ''}
                    </text>
                  )}
                  {p.rotated && showDims && p.w * scale > 30 && (
                    <g transform={`translate(${(p.x + p.w / 2) * scale}, ${(p.y + p.h / 2) * scale})`}>
                      <RotateCw className="w-3 h-3 text-white" style={{ pointerEvents: 'none' }} />
                    </g>
                  )}
                </g>
              );
            })}
            {/* Sheet dimension labels */}
            <text x={sheet.width * scale / 2} y={-6} textAnchor="middle" fontSize={11} fill="#64748B" fontWeight={600}>
              {Math.round(sheet.width)} mm
            </text>
            <text x={-12} y={sheet.height * scale / 2} textAnchor="middle" fontSize={11} fill="#64748B" fontWeight={600} transform={`rotate(-90, -12, ${sheet.height * scale / 2})`}>
              {Math.round(sheet.height)} mm
            </text>
          </g>
        </svg>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-3 bg-white/90 backdrop-blur rounded-lg border border-[#E2E8E4] px-3 py-1.5 text-[11px] text-[#64748B] shadow-sm">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded" style={{ background: LEFTOVER_FILL }} /> Leftover / waste</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#16A34A]" /> Placed piece</span>
        {source.unplaced?.length > 0 && <span className="text-amber-600 font-medium">{source.unplaced.length} unplaced</span>}
      </div>
    </div>
  );
}

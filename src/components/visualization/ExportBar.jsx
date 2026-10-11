import React from 'react';
import { FileImage, FileText, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import { useProject } from '@/lib/ProjectContext';
import { getMaterial } from '@/lib/materials';
import { formatMm, areaInUnit } from '@/lib/geometry';

export default function ExportBar() {
  const { layout, baseline, material, projectName, pieces } = useProject();
  const [busy, setBusy] = React.useState(null);

  if (!layout || !layout.valid || !layout.sheets.length) return null;
  const matDef = getMaterial(material.type);
  const s = layout.stats;
  const u = material.unit;
  const areaUnit = u === 'in' ? 'in²' : 'cm²';

  function renderLayoutToCanvas(src, scale = 0.25) {
    const sheets = src.sheets;
    const cols = Math.min(sheets.length, 2);
    const rows = Math.ceil(sheets.length / cols);
    const sheetW = Math.max(...sheets.map(s=>s.width));
    const sheetH = Math.max(...sheets.map(s=>s.height));
    const gap = 40;
    const canvasW = (sheetW * scale + gap) * cols + gap;
    const canvasH = (sheetH * scale + gap) * rows + gap + 60;
    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#123D26';
    ctx.font = 'bold 28px Inter, sans-serif';
    ctx.fillText('ScrapSmart — Cutting Plan', 40, 44);

    sheets.forEach((sheet, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const ox = gap + col * (sheetW * scale + gap);
      const oy = 60 + gap + row * (sheetH * scale + gap);
      ctx.fillStyle = '#E2E8E4';
      ctx.fillRect(ox, oy, sheet.width * scale, sheet.height * scale);
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 2;
      ctx.strokeRect(ox, oy, sheet.width * scale, sheet.height * scale);
      sheet.placements.forEach((p) => {
        ctx.fillStyle = p.color || '#16A34A';
        ctx.globalAlpha = 0.85;
        ctx.fillRect(ox + p.x * scale, oy + p.y * scale, p.w * scale, p.h * scale);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(ox + p.x * scale, oy + p.y * scale, p.w * scale, p.h * scale);
      });
      ctx.fillStyle = '#64748B';
      ctx.font = '16px Inter, sans-serif';
      ctx.fillText(`Sheet ${i + 1}`, ox, oy - 8);
    });
    return canvas;
  }

  const exportPNG = () => {
    setBusy('png');
    setTimeout(() => {
      const canvas = renderLayoutToCanvas(layout, 0.25);
      const link = document.createElement('a');
      link.download = `${projectName.replace(/\s+/g, '_')}_cutting_plan.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      setBusy(null);
    }, 50);
  };

  const exportPDF = () => {
    setBusy('pdf');
    setTimeout(() => {
      const canvas = renderLayoutToCanvas(layout, 0.22);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const margin = 36;
      let y = margin;

      pdf.setFillColor(18, 61, 38);
      pdf.rect(0, 0, pageW, 70, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(20);
      pdf.text('ScrapSmart — Cutting Plan Report', margin, 44);
      y = 92;
      pdf.setTextColor(23, 43, 33);

      const line = (label, val) => {
        pdf.setFontSize(11);
        pdf.setTextColor(100, 116, 139);
        pdf.text(label, margin, y);
        pdf.setTextColor(23, 43, 33);
        pdf.text(String(val), margin + 160, y);
        y += 16;
      };

      line('Project', projectName);
      line('Material', matDef.name);
      line('Purchased sheet size', `${formatMm(material.sheetWidth, u)} × ${formatMm(material.sheetHeight, u)}`);
      line('Thickness', formatMm(material.thickness, u));
      line('Saw kerf', formatMm(material.kerf, u));
      line('Edge margin', formatMm(material.edgeMargin, u));
      line('Sheets used', `${s.sheetsUsed} of ${material.sheetQuantity}`);
      line('Pieces placed', `${s.placedCount} of ${s.totalPieces}`);
      line('Unplaced pieces', s.unplacedCount);
      line('Utilization', `${s.utilization?.toFixed(1) ?? 'Unavailable'}%`);
      line('Waste', `${s.waste?.toFixed(1) ?? 'Unavailable'}%`);
      line('Leftover area', `${areaInUnit(s.leftoverArea, u === 'mm' ? 'cm' : u)?.toFixed(0) ?? 'Unavailable — Check Dimensions'} ${areaUnit}`);
      line('Material cost', s.totalCost === null ? 'Unavailable' : `$${s.totalCost.toFixed(2)}`);
      line('Algorithm', layout.algorithm);
      line('Plan status', layout.status);
      line('Strategy', layout.strategy);

      y += 8;
      pdf.setTextColor(23, 43, 33);
      pdf.setFontSize(13);
      pdf.text('Cutting layout', margin, y);
      y += 10;
      const imgW = pageW - margin * 2;
      const imgH = (canvas.height / canvas.width) * imgW;
      if (y + imgH > pdf.internal.pageSize.getHeight() - margin) {
        pdf.addPage();
        y = margin;
      }
      pdf.addImage(imgData, 'PNG', margin, y, imgW, imgH);
      y += imgH + 16;

      // Piece list
      if (y > pdf.internal.pageSize.getHeight() - 120) { pdf.addPage(); y = margin; }
      pdf.setFontSize(13);
      pdf.text('Piece placements', margin, y);
      y += 14;
      pdf.setFontSize(9);
      pdf.setTextColor(100, 116, 139);
      pdf.text('Name', margin, y);
      pdf.text('Sheet', margin + 130, y);
      pdf.text('X (mm)', margin + 175, y);
      pdf.text('Y (mm)', margin + 235, y);
      pdf.text('W×H (mm)', margin + 295, y);
      pdf.text('Rot', margin + 380, y);
      y += 12;
      pdf.setTextColor(23, 43, 33);
      layout.sheets.forEach((sh) => {
        sh.placements.forEach((p) => {
          if (y > pdf.internal.pageSize.getHeight() - margin) { pdf.addPage(); y = margin; }
          pdf.text(String(p.name).slice(0, 22), margin, y);
          pdf.text(String(sh.index + 1), margin + 130, y);
          pdf.text(String(Math.round(p.x)), margin + 175, y);
          pdf.text(String(Math.round(p.y)), margin + 235, y);
          pdf.text(`${Math.round(p.w)}×${Math.round(p.h)}`, margin + 295, y);
          pdf.text(p.rotated ? '90°' : '0°', margin + 380, y);
          y += 12;
        });
      });

      if (layout.unplaced.length > 0) {
        y += 8;
        pdf.setTextColor(220, 38, 38);
        pdf.setFontSize(10);
        pdf.text(`Unplaced (${layout.unplaced.length}): ${layout.unplaced.map((p) => p.name).join(', ')}`, margin, y);
      }

      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139);
      pdf.text('Generated by ScrapSmart. Values reflect the validated optimizer output. Label: Best Layout Found — not guaranteed globally optimal.', margin, pdf.internal.pageSize.getHeight() - 20);

      pdf.save(`${projectName.replace(/\s+/g, '_')}_ScrapSmart_report.pdf`);
      setBusy(null);
    }, 50);
  };

  return (
    <div className="flex items-center gap-2">
      <button onClick={exportPNG} disabled={!!busy} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E2E8E4] text-sm font-medium text-[#172B21] hover:bg-[#F4F7F5] transition disabled:opacity-50">
        {busy === 'png' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileImage className="w-4 h-4" />} PNG
      </button>
      <button onClick={exportPDF} disabled={!!busy} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#123D26] text-white text-sm font-semibold hover:bg-[#15803D] transition disabled:opacity-50">
        {busy === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} PDF Report
      </button>
    </div>
  );
}

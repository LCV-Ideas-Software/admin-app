/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Painel colapsável "Importar / Exportar zona (BIND)" do DNS-2: export baixa o
 * arquivo BIND da zona via blob; import valida tamanho (≤ 2 MB), mostra o
 * número de linhas relevantes do arquivo e confirma via Radix Dialog antes de
 * enviar o multipart ao motor.
 */

import { ChevronDown, ChevronRight, Download, FileUp, Loader2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { useNotification } from '../../components/Notification';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '../../components/ui/Dialog';
import * as api from './api';
import { buildExportFilename, countImportableLines, validateImportFileSize } from './batchHelpers';

type ImportExportPanelProps = {
  adminActor: string;
  selectedZoneId: string;
  selectedZoneName: string;
  disabled: boolean;
  onImported: () => Promise<void> | void;
};

export function ImportExportPanel({
  adminActor,
  selectedZoneId,
  selectedZoneName,
  disabled,
  onImported,
}: ImportExportPanelProps) {
  const { showNotification } = useNotification();

  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLineCount, setImportLineCount] = useState(0);
  const [applyProxy, setApplyProxy] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const zoneLabel = selectedZoneName || selectedZoneId || 'não selecionada';

  const resetImportFile = () => {
    setImportFile(null);
    setImportLineCount(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExport = async () => {
    if (!selectedZoneId) {
      return;
    }
    setExporting(true);
    try {
      const response = await api.fetchZoneExport(adminActor, selectedZoneId, selectedZoneName);
      if (!response.ok) {
        // Em falha o motor devolve JSON {ok:false, error} com diagnóstico pt-BR.
        let message = `Falha ao exportar a zona ${zoneLabel} (HTTP ${response.status}).`;
        try {
          const payload = (await response.json()) as { error?: string };
          if (payload?.error) {
            message = `Falha ao exportar a zona ${zoneLabel}: ${payload.error}`;
          }
        } catch {
          // Corpo de erro não-JSON: mantém a mensagem com o status HTTP.
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = buildExportFilename(selectedZoneName, selectedZoneId);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      showNotification(`Arquivo de zona BIND de ${zoneLabel} exportado.`, 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : `Não foi possível exportar a zona ${zoneLabel}.`;
      showNotification(message, 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleFileChange = async (file: File | null) => {
    if (!file) {
      resetImportFile();
      return;
    }

    const sizeError = validateImportFileSize(file.size);
    if (sizeError) {
      resetImportFile();
      showNotification(sizeError, 'error');
      return;
    }

    try {
      const text = await file.text();
      setImportFile(file);
      setImportLineCount(countImportableLines(text));
    } catch {
      resetImportFile();
      showNotification(`Não foi possível ler o arquivo "${file.name}" — selecione um arquivo de texto BIND.`, 'error');
    }
  };

  const executeImport = async () => {
    if (!selectedZoneId || !importFile) {
      return;
    }
    setShowImportConfirm(false);
    setImporting(true);
    try {
      const { response, payload } = await api.importZoneFile(adminActor, selectedZoneId, importFile, applyProxy);
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Falha ao importar o arquivo de zona BIND.');
      }

      showNotification(
        api.withReq(
          `${payload.recsAdded ?? 0} de ${payload.totalRecordsParsed ?? 0} registros importados para ${zoneLabel}.`,
          payload,
        ),
        'success',
      );
      resetImportFile();
      await onImported();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível importar o arquivo de zona BIND.';
      showNotification(message, 'error');
    } finally {
      setImporting(false);
    }
  };

  return (
    <article className="form-card cfdns-importexport">
      <button
        type="button"
        className="cfdns-importexport__toggle"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        Importar / Exportar zona (BIND)
      </button>

      {open && (
        <div className="cfdns-importexport__body">
          <div className="cfdns-importexport__section">
            <h5>Exportar</h5>
            <p className="field-hint">Baixa todos os registros da zona {zoneLabel} em um arquivo BIND (.txt).</p>
            <button
              type="button"
              className="ghost-button"
              onClick={() => void handleExport()}
              disabled={disabled || !selectedZoneId || exporting}
            >
              {exporting ? <Loader2 size={16} className="spin" /> : <Download size={16} />}
              Exportar zona
            </button>
          </div>

          <div className="cfdns-importexport__section">
            <h5>Importar</h5>
            <p className="field-hint">Envia um arquivo de zona BIND (máx. 2 MB) para criar registros em {zoneLabel}.</p>
            <div className="field-group">
              <label htmlFor="cfdns-import-file">Arquivo de zona</label>
              <input
                id="cfdns-import-file"
                name="cfDnsImportFile"
                ref={fileInputRef}
                type="file"
                accept=".txt,.zone,text/plain"
                onChange={(event) => void handleFileChange(event.target.files?.[0] ?? null)}
                disabled={disabled || !selectedZoneId || importing}
              />
            </div>
            <label className="cfdns-importexport__proxy">
              <input
                type="checkbox"
                checked={applyProxy}
                onChange={(event) => setApplyProxy(event.target.checked)}
                disabled={disabled || importing}
              />
              Aplicar proxy aos registros compatíveis
            </label>
            {importFile && (
              <p className="field-hint">
                {importFile.name}: {importLineCount} linha(s) relevante(s) detectada(s).
              </p>
            )}
            <button
              type="button"
              className="primary-button"
              onClick={() => setShowImportConfirm(true)}
              disabled={disabled || !selectedZoneId || !importFile || importing}
            >
              {importing ? <Loader2 size={16} className="spin" /> : <Upload size={16} />}
              Importar arquivo
            </button>
          </div>
        </div>
      )}

      {/* ── Confirmação do import ── */}
      <Dialog open={showImportConfirm} onOpenChange={setShowImportConfirm}>
        <DialogContent className="cfdns-batch-modal" overlayClassName="cfdns-batch-overlay">
          <div className="cfdns-batch-modal__icon">
            <FileUp size={28} />
          </div>
          <DialogTitle className="cfdns-batch-modal__title">Importar arquivo de zona</DialogTitle>
          <DialogDescription className="cfdns-batch-modal__text">
            Importar {importLineCount} linha(s) para a zona {zoneLabel}? Registros duplicados podem ser rejeitados pela
            Cloudflare.
          </DialogDescription>
          <div className="cfdns-batch-modal__actions">
            <button type="button" className="primary-button" onClick={() => void executeImport()}>
              <Upload size={14} />
              Importar
            </button>
            <DialogClose asChild>
              <button type="button" className="ghost-button">
                Cancelar
              </button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </article>
  );
}

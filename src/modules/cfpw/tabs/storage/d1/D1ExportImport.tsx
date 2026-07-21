/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Export/Import do banco D1 (ST-D1). Export: polling de 2s com bookmark até a
 * signed_url (~1h de validade), cancelável com "Retomar" pelo mesmo bookmark.
 * Import (OCULTO para banco protegido): MD5 via spark-md5 em chunks de 2 MiB,
 * init → PUT do arquivo DIRETO na upload_url presignada do R2 (nunca pelo
 * motor) → ingest → poll até status final, com confirmação type-name e aviso
 * de que o import BLOQUEIA o banco durante a operação.
 */

import { Download, Loader2, Upload } from 'lucide-react';
import { useEffect, useReducer, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../../../../components/ui/Dialog';
import * as api from '../../../api';
import type { D1DatabaseSummary, D1ImportResult } from '../../../types';
import { computeMd5FromChunks, exportPollReducer, INITIAL_EXPORT_POLL, sliceBlobIntoChunks } from './d1Helpers';

const POLL_INTERVAL_MS = 2000;

type DumpMode = 'full' | 'schema' | 'data';
type ImportPhase = 'idle' | 'md5' | 'init' | 'upload' | 'ingest' | 'polling' | 'done' | 'error';

const IMPORT_PHASE_LABELS: Record<ImportPhase, string> = {
  idle: '',
  md5: 'Calculando MD5 do arquivo...',
  init: 'Iniciando import (init)...',
  upload: 'Enviando o arquivo direto para a upload_url (R2)...',
  ingest: 'Registrando o arquivo (ingest)...',
  polling: 'Import em andamento — o banco fica BLOQUEADO até o fim...',
  done: 'Import concluído.',
  error: 'Import falhou.',
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type D1ExportImportProps = {
  adminActor: string;
  database: D1DatabaseSummary;
};

export function D1ExportImport({ adminActor, database }: D1ExportImportProps) {
  const [dumpMode, setDumpMode] = useState<DumpMode>('full');
  const [exportState, dispatchExport] = useReducer(exportPollReducer, INITIAL_EXPORT_POLL);
  const pollAbortRef = useRef(false);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPhase, setImportPhase] = useState<ImportPhase>('idle');
  const [importDetail, setImportDetail] = useState('');
  const [importError, setImportError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmNameInput, setConfirmNameInput] = useState('');

  useEffect(
    () => () => {
      // Unmount: interrompe loops de polling em andamento.
      pollAbortRef.current = true;
    },
    [],
  );

  // ── Export ──

  const runExportLoop = async (startBookmark: string | null) => {
    pollAbortRef.current = false;
    dispatchExport({ type: 'start' });
    let bookmark = startBookmark;

    while (!pollAbortRef.current) {
      try {
        const dumpOptions =
          dumpMode === 'schema' ? { noData: true } : dumpMode === 'data' ? { noSchema: true } : undefined;
        const { response, payload } = await api.postD1Export(adminActor, {
          databaseId: database.uuid,
          ...(bookmark ? { bookmark } : {}),
          ...(bookmark === null && dumpOptions !== undefined ? { dumpOptions } : {}),
        });
        if (!response.ok || !payload.ok) {
          throw new Error(payload.error ?? `Falha no export (HTTP ${response.status}).`);
        }
        if (pollAbortRef.current) {
          return;
        }
        const result = payload.result ?? null;
        dispatchExport({ type: 'result', result });
        if (typeof result?.at_bookmark === 'string' && result.at_bookmark) {
          bookmark = result.at_bookmark;
        }
        const finished =
          (typeof result?.signed_url === 'string' && result.signed_url) ||
          (typeof result?.error === 'string' && result.error);
        if (finished) {
          return;
        }
        await sleep(POLL_INTERVAL_MS);
      } catch (error) {
        if (!pollAbortRef.current) {
          dispatchExport({
            type: 'fail',
            error: error instanceof Error ? error.message : 'Falha ao exportar o banco D1.',
          });
        }
        return;
      }
    }
  };

  const pauseExport = () => {
    pollAbortRef.current = true;
    dispatchExport({ type: 'pause' });
  };

  const exporting = exportState.phase === 'polling';

  // ── Import ──

  const runImport = async () => {
    const file = importFile;
    if (!file) {
      return;
    }
    setImportError('');
    setImportDetail('');
    try {
      setImportPhase('md5');
      const etag = await computeMd5FromChunks(sliceBlobIntoChunks(file));

      setImportPhase('init');
      const init = await api.postD1Import(adminActor, { databaseId: database.uuid, action: 'init', etag });
      if (!init.response.ok || !init.payload.ok) {
        throw new Error(init.payload.error ?? `Falha no init do import (HTTP ${init.response.status}).`);
      }
      const uploadUrl = init.payload.result?.upload_url;
      const filename = init.payload.result?.filename;
      if (typeof uploadUrl !== 'string' || !uploadUrl || typeof filename !== 'string' || !filename) {
        throw new Error('Init do import não devolveu upload_url/filename — resposta inesperada da Cloudflare.');
      }

      // Upload DIRETO do browser para a URL presignada do R2 — nunca pelo motor.
      setImportPhase('upload');
      const uploadResponse = await fetch(uploadUrl, { method: 'PUT', body: file });
      if (!uploadResponse.ok) {
        throw new Error(`Falha no upload do arquivo para a URL presignada do R2 (HTTP ${uploadResponse.status}).`);
      }

      setImportPhase('ingest');
      const ingest = await api.postD1Import(adminActor, {
        databaseId: database.uuid,
        action: 'ingest',
        etag,
        filename,
      });
      if (!ingest.response.ok || !ingest.payload.ok) {
        throw new Error(ingest.payload.error ?? `Falha no ingest do import (HTTP ${ingest.response.status}).`);
      }

      setImportPhase('polling');
      let result: D1ImportResult | null = ingest.payload.result ?? null;
      let bookmark = typeof result?.at_bookmark === 'string' && result.at_bookmark ? result.at_bookmark : '';
      for (;;) {
        if (pollAbortRef.current) {
          return;
        }
        if (typeof result?.error === 'string' && result.error) {
          throw new Error(result.error);
        }
        const lastMessage = Array.isArray(result?.messages) ? (result.messages.at(-1) ?? '') : '';
        if (lastMessage) {
          setImportDetail(lastMessage);
        }
        if (result?.status === 'complete' || result?.success === true) {
          setImportPhase('done');
          return;
        }
        if (!bookmark) {
          throw new Error('Import sem bookmark para acompanhar o progresso — resposta inesperada da Cloudflare.');
        }
        await sleep(POLL_INTERVAL_MS);
        const poll = await api.postD1Import(adminActor, { databaseId: database.uuid, action: 'poll', bookmark });
        if (!poll.response.ok || !poll.payload.ok) {
          throw new Error(poll.payload.error ?? `Falha no poll do import (HTTP ${poll.response.status}).`);
        }
        result = poll.payload.result ?? null;
        if (typeof result?.at_bookmark === 'string' && result.at_bookmark) {
          bookmark = result.at_bookmark;
        }
      }
    } catch (error) {
      setImportPhase('error');
      setImportError(error instanceof Error ? error.message : 'Falha na operação de import do banco D1.');
    }
  };

  const importBusy = importPhase !== 'idle' && importPhase !== 'done' && importPhase !== 'error';

  return (
    <div className="storage-export-import">
      <section className="storage-export-section">
        <h5>
          <Download size={15} /> Exportar dump (.sql)
        </h5>
        <div className="field-group">
          <label htmlFor="st-d1-dump-mode">Conteúdo do dump</label>
          <select
            id="st-d1-dump-mode"
            value={dumpMode}
            onChange={(event) => setDumpMode(event.target.value as DumpMode)}
            disabled={exporting}
          >
            <option value="full">Schema + dados</option>
            <option value="schema">Só schema</option>
            <option value="data">Só dados</option>
          </select>
        </div>
        <div className="storage-console-actions">
          {!exporting && (
            <button type="button" className="primary-button" onClick={() => void runExportLoop(null)}>
              {exportState.phase === 'done' ? 'Exportar novamente' : 'Exportar'}
            </button>
          )}
          {exporting && (
            <button type="button" className="ghost-button" onClick={pauseExport}>
              Cancelar polling
            </button>
          )}
          {exportState.phase === 'paused' && exportState.bookmark && (
            <button type="button" className="ghost-button" onClick={() => void runExportLoop(exportState.bookmark)}>
              Retomar (mesmo bookmark)
            </button>
          )}
        </div>
        {exporting && (
          <p className="storage-panel--status" role="status">
            <Loader2 size={14} className="spin" /> Export em andamento
            {exportState.status ? ` (${exportState.status})` : ''}
            ... polling a cada 2s.
          </p>
        )}
        {exportState.phase === 'paused' && (
          <p className="field-hint">Polling cancelado no cliente — o export pode ser retomado com o mesmo bookmark.</p>
        )}
        {exportState.phase === 'error' && exportState.error && (
          <p className="field-error" role="alert">
            {exportState.error}
          </p>
        )}
        {exportState.phase === 'done' && exportState.signedUrl && (
          <p className="storage-export-done">
            <a href={exportState.signedUrl} target="_blank" rel="noreferrer">
              Baixar dump (.sql)
            </a>{' '}
            — URL assinada válida por ~1 hora.
          </p>
        )}
      </section>

      {!database.protected && (
        <section className="storage-import-section">
          <h5>
            <Upload size={15} /> Importar dump (.sql)
          </h5>
          <p className="storage-import-warning">
            ⚠️ O import BLOQUEIA o banco durante a operação — consultas e escritas ficam indisponíveis até o fim.
          </p>
          <div className="field-group">
            <label htmlFor="st-d1-import-file">Arquivo .sql</label>
            <input
              id="st-d1-import-file"
              type="file"
              accept=".sql"
              disabled={importBusy}
              onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
            />
          </div>
          <div className="storage-console-actions">
            <button
              type="button"
              className="primary-button storage-danger-confirm"
              disabled={!importFile || importBusy}
              onClick={() => {
                setConfirmNameInput('');
                setConfirmOpen(true);
              }}
            >
              Importar
            </button>
          </div>
          {importPhase !== 'idle' && importPhase !== 'error' && (
            <p className="storage-panel--status" role="status">
              {importBusy && <Loader2 size={14} className="spin" />} {IMPORT_PHASE_LABELS[importPhase]}
              {importDetail ? ` (${importDetail})` : ''}
            </p>
          )}
          {importError && (
            <p className="field-error" role="alert">
              {importError}
            </p>
          )}

          {/* Confirmação type-name antes de iniciar o import */}
          <Dialog open={confirmOpen} onOpenChange={(nextOpen) => (!nextOpen ? setConfirmOpen(false) : undefined)}>
            <DialogContent overlayClassName="cfpw-dialog-overlay" className="cfpw-dialog">
              <DialogTitle className="cfpw-dialog__title">Importar dump em {database.name}</DialogTitle>
              <DialogDescription className="cfpw-dialog__description">
                O import BLOQUEIA o banco durante a operação e sobrescreve objetos do dump. Digite o nome exato do banco
                para confirmar.
              </DialogDescription>
              <div className="cfpw-dialog__form">
                <div className="field-group">
                  <label htmlFor="st-d1-import-confirm">Verificação de segurança</label>
                  <input
                    id="st-d1-import-confirm"
                    type="text"
                    autoComplete="off"
                    placeholder={`Digite: ${database.name}`}
                    value={confirmNameInput}
                    onChange={(event) => setConfirmNameInput(event.target.value)}
                  />
                </div>
                <div className="cfpw-dialog__actions">
                  <button type="button" className="ghost-button" onClick={() => setConfirmOpen(false)}>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="primary-button storage-danger-confirm"
                    disabled={confirmNameInput !== database.name}
                    onClick={() => {
                      setConfirmOpen(false);
                      void runImport();
                    }}
                  >
                    Iniciar import
                  </button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </section>
      )}
    </div>
  );
}

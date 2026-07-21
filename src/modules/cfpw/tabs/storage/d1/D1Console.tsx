/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Console SQL do banco D1 (ST-D1): textarea mono (Ctrl+Enter executa),
 * histórico em sessionStorage (máx 50, clicável), pré-aviso client-side da
 * classificação e handshake de confirmação do motor — 409 requiresConfirmation
 * abre o modal com os statements classificados (+ frase obrigatória em banco
 * protegido) e reenvia com confirmDangerous. Resultado: um bloco por statement
 * com grid truncado, erro em vermelho e painel de meta.
 */

import { History, Loader2, Play } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../../../../components/ui/Dialog';
import * as api from '../../../api';
import type { D1DatabaseSummary, D1StatementClassification, D1StatementResult } from '../../../types';
import { classifyD1StatementsClient, pushSqlHistory, toGridView } from './d1Helpers';

const PROTECTED_CONFIRM_PHRASE = 'EU ENTENDO O RISCO';

type D1ConsoleProps = {
  adminActor: string;
  database: D1DatabaseSummary;
};

const readStoredHistory = (storageKey: string): string[] => {
  try {
    const raw = sessionStorage.getItem(storageKey);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
};

const formatCell = (value: unknown): string => {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
};

const formatMetaEntries = (statement: D1StatementResult): Array<{ label: string; value: string }> => {
  const meta = statement.meta ?? {};
  const entries: Array<{ label: string; value: string }> = [];
  if (typeof meta.duration === 'number') entries.push({ label: 'duração', value: `${meta.duration} ms` });
  if (typeof meta.rows_read === 'number') entries.push({ label: 'rows_read', value: String(meta.rows_read) });
  if (typeof meta.rows_written === 'number') entries.push({ label: 'rows_written', value: String(meta.rows_written) });
  if (typeof meta.changes === 'number') entries.push({ label: 'changes', value: String(meta.changes) });
  if (typeof meta.last_row_id === 'number') entries.push({ label: 'last_row_id', value: String(meta.last_row_id) });
  if (typeof meta.served_by === 'string' && meta.served_by) entries.push({ label: 'served_by', value: meta.served_by });
  return entries;
};

export function D1Console({ adminActor, database }: D1ConsoleProps) {
  const historyKey = `cfpw-d1-sql-history:${database.uuid}`;

  const [sql, setSql] = useState('');
  const [history, setHistory] = useState<string[]>(() => readStoredHistory(historyKey));
  const [historyOpen, setHistoryOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<D1StatementResult[] | null>(null);
  const [runError, setRunError] = useState('');
  const [confirmStatements, setConfirmStatements] = useState<D1StatementClassification[] | null>(null);
  const [phraseInput, setPhraseInput] = useState('');

  const preview = sql.trim() ? classifyD1StatementsClient(sql) : [];
  const previewWrites = preview.filter((statement) => statement.kind === 'write');

  const persistHistory = (nextHistory: string[]) => {
    setHistory(nextHistory);
    try {
      sessionStorage.setItem(historyKey, JSON.stringify(nextHistory));
    } catch {
      // sessionStorage indisponível/cheio: histórico segue só em memória.
    }
  };

  const runQuery = async (confirmed: boolean) => {
    const sqlToRun = sql;
    if (!sqlToRun.trim() || running) {
      return;
    }
    setRunning(true);
    setRunError('');
    try {
      const { response, payload } = await api.postD1Query(adminActor, {
        databaseId: database.uuid,
        sql: sqlToRun,
        ...(confirmed ? { confirmDangerous: true } : {}),
        ...(confirmed && database.protected ? { confirmPhrase: phraseInput } : {}),
      });
      if (response.status === 409 && payload.requiresConfirmation && Array.isArray(payload.statements)) {
        setConfirmStatements(payload.statements);
        return;
      }
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? `Falha ao executar SQL (HTTP ${response.status}).`);
      }
      setResults(payload.result ?? []);
      setConfirmStatements(null);
      setPhraseInput('');
      persistHistory(pushSqlHistory(history, sqlToRun));
    } catch (error) {
      setRunError(error instanceof Error ? error.message : 'Falha ao executar SQL no banco D1.');
      setConfirmStatements(null);
    } finally {
      setRunning(false);
    }
  };

  const confirmDisabled = running || (database.protected && phraseInput !== PROTECTED_CONFIRM_PHRASE);

  return (
    <div className="storage-console">
      <div className="field-group">
        <div className="storage-editor-header">
          <label htmlFor="st-d1-console-sql">SQL (Ctrl+Enter executa)</label>
          {history.length > 0 && (
            <button
              type="button"
              className="ghost-button"
              onClick={() => setHistoryOpen((open) => !open)}
              aria-expanded={historyOpen}
            >
              <History size={14} /> Histórico ({history.length})
            </button>
          )}
        </div>
        <textarea
          id="st-d1-console-sql"
          className="storage-value-editor storage-sql-editor"
          rows={8}
          placeholder="SELECT * FROM tabela LIMIT 10"
          value={sql}
          onChange={(event) => setSql(event.target.value)}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
              event.preventDefault();
              void runQuery(false);
            }
          }}
          disabled={running}
        />
        {preview.length > 0 && (
          <p className="field-hint">
            {preview.length} statement(s) · {previewWrites.length} de escrita
            {previewWrites.some((statement) => statement.dangerous)
              ? ` (${previewWrites
                  .filter((statement) => statement.dangerous)
                  .map((statement) => statement.reason)
                  .join(', ')})`
              : ''}
            {' — pré-aviso local; a validação final é do motor.'}
          </p>
        )}
      </div>

      {historyOpen && history.length > 0 && (
        <ul className="storage-sql-history">
          {history.map((item) => (
            <li key={item}>
              <button
                type="button"
                className="storage-link-button"
                onClick={() => {
                  setSql(item);
                  setHistoryOpen(false);
                }}
              >
                <code>{item.length > 120 ? `${item.slice(0, 120)}…` : item}</code>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="storage-console-actions">
        <button
          type="button"
          className="primary-button"
          onClick={() => void runQuery(false)}
          disabled={running || !sql.trim()}
        >
          {running ? <Loader2 size={16} className="spin" /> : <Play size={14} />} Executar
        </button>
      </div>

      {runError && (
        <p className="field-error" role="alert">
          {runError}
        </p>
      )}

      {results !== null && results.length === 0 && <p className="field-hint">Execução sem resultados devolvidos.</p>}

      {results?.map((statement, index) => {
        const failed = statement.success === false;
        const grid = toGridView(statement.results);
        const metaEntries = formatMetaEntries(statement);
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: resultados por statement em ordem fixa, sem identidade estável
          <div className="storage-result-block" key={`statement-${index}`}>
            <div className="storage-result-title">Statement #{index + 1}</div>
            {failed ? (
              <p className="field-error" role="alert">
                {formatCell(statement.error ?? statement.meta?.error ?? 'Erro no statement (a CF não detalhou).')}
              </p>
            ) : (
              <>
                {grid.rows.length === 0 ? (
                  <p className="field-hint">Sem linhas retornadas.</p>
                ) : (
                  <div className="storage-table-wrap">
                    <table className="storage-table">
                      <thead>
                        <tr>
                          {grid.columns.map((column) => (
                            <th key={column}>{column}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {grid.rows.map((row, rowIndex) => (
                          // biome-ignore lint/suspicious/noArrayIndexKey: linhas de resultado SQL somente leitura, sem identidade estável
                          <tr key={`row-${rowIndex}`}>
                            {grid.columns.map((column) => (
                              <td key={column}>{formatCell(row[column])}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {(grid.truncatedRows || grid.truncatedColumns) && (
                  <p className="storage-result-truncated">
                    Exibindo {grid.rows.length} de {grid.totalRows} linha(s) e {grid.columns.length} de{' '}
                    {grid.totalColumns} coluna(s)
                    {grid.largeResult ? ' — resultado grande (>5000 linhas); refine a consulta' : ''}.
                  </p>
                )}
                {metaEntries.length > 0 && (
                  <div className="storage-result-meta">
                    {metaEntries.map((entry) => (
                      <span key={entry.label}>
                        {entry.label}: <strong>{entry.value}</strong>
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}

      {/* Confirmação de escrita (handshake 409 do motor) */}
      <Dialog
        open={confirmStatements !== null}
        onOpenChange={(nextOpen) => (!nextOpen && !running ? setConfirmStatements(null) : undefined)}
      >
        <DialogContent overlayClassName="cfpw-dialog-overlay" className="cfpw-dialog">
          <DialogTitle className="cfpw-dialog__title">Confirmar SQL de escrita</DialogTitle>
          <DialogDescription className="cfpw-dialog__description">
            O motor classificou statements de escrita em <strong>{database.name}</strong>. Revise antes de executar.
          </DialogDescription>
          <div className="cfpw-dialog__form">
            <ul className="storage-confirm-list">
              {(confirmStatements ?? []).map((statement, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: lista fixa de classificação devolvida pelo motor
                <li key={`confirm-${index}`}>
                  <span className={statement.kind === 'write' ? 'storage-badge storage-badge--write' : 'storage-badge'}>
                    {statement.kind === 'write' ? 'escrita' : 'leitura'}
                  </span>
                  {statement.reason && <span className="storage-badge storage-badge--danger">{statement.reason}</span>}
                  <code>{statement.sql.length > 160 ? `${statement.sql.slice(0, 160)}…` : statement.sql}</code>
                </li>
              ))}
            </ul>
            {database.protected && (
              <div className="field-group">
                <label htmlFor="st-d1-confirm-phrase">
                  Banco PROTEGIDO ({database.name}): digite {PROTECTED_CONFIRM_PHRASE} para liberar a escrita
                </label>
                <input
                  id="st-d1-confirm-phrase"
                  type="text"
                  autoComplete="off"
                  placeholder={PROTECTED_CONFIRM_PHRASE}
                  value={phraseInput}
                  onChange={(event) => setPhraseInput(event.target.value)}
                  disabled={running}
                />
              </div>
            )}
            {runError && (
              <p className="field-error" role="alert">
                {runError}
              </p>
            )}
            <div className="cfpw-dialog__actions">
              <button
                type="button"
                className="ghost-button"
                onClick={() => setConfirmStatements(null)}
                disabled={running}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="primary-button storage-danger-confirm"
                onClick={() => void runQuery(true)}
                disabled={confirmDisabled}
              >
                {running ? <Loader2 size={16} className="spin" /> : 'Executar mesmo assim'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

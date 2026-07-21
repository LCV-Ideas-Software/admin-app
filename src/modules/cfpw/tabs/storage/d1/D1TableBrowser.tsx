/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Navegador de schema/tabelas do banco D1 (ST-D1): lista tabelas/views/índices
 * do sqlite_master (motor), clique mostra o DDL em <pre> copiável e, para
 * tabelas/views, um grid paginado (50 por página) com contagem total.
 */

import { Copy, Loader2, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNotification } from '../../../../../components/Notification';
import { cfApiErrorMessage, cfApiFetch } from '../../../../shared/cfApi';
import type { D1DatabaseSummary, D1SchemaObject, D1SchemaPayload, D1TablePayload } from '../../../types';

const TABLE_PER_PAGE = 50;
const OBJECT_TYPE_LABELS: Record<string, string> = { table: 'Tabelas', view: 'Views', index: 'Índices' };

type D1TableBrowserProps = {
  database: D1DatabaseSummary;
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

export function D1TableBrowser({ database }: D1TableBrowserProps) {
  const { showNotification } = useNotification();

  const [objects, setObjects] = useState<D1SchemaObject[]>([]);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [schemaError, setSchemaError] = useState('');
  const [reloadNonce, setReloadNonce] = useState(0);

  const [selected, setSelected] = useState<D1SchemaObject | null>(null);
  const [page, setPage] = useState(1);
  const [tableData, setTableData] = useState<D1TablePayload | null>(null);
  const [tableLoading, setTableLoading] = useState(false);
  const [tableError, setTableError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setSchemaLoading(true);
    setSchemaError('');
    void (async () => {
      const query = new URLSearchParams({ databaseId: database.uuid });
      const result = await cfApiFetch<D1SchemaPayload>(`/api/cfpw/storage/d1/schema?${query.toString()}`);
      if (cancelled) return;
      if (!result.ok) {
        setSchemaError(cfApiErrorMessage(result, 'Falha ao ler o schema do banco D1'));
      } else if (!result.data.ok) {
        setSchemaError(result.data.error ?? 'Motor reportou falha ao ler o schema D1.');
      } else {
        setObjects(result.data.objects ?? []);
      }
      setSchemaLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [database.uuid, reloadNonce]);

  const browsable = selected !== null && (selected.type === 'table' || selected.type === 'view');

  useEffect(() => {
    if (!selected || (selected.type !== 'table' && selected.type !== 'view')) {
      setTableData(null);
      return;
    }
    let cancelled = false;
    setTableLoading(true);
    setTableError('');
    void (async () => {
      const query = new URLSearchParams({
        databaseId: database.uuid,
        table: selected.name,
        page: String(page),
        perPage: String(TABLE_PER_PAGE),
      });
      const result = await cfApiFetch<D1TablePayload>(`/api/cfpw/storage/d1/table?${query.toString()}`);
      if (cancelled) return;
      if (!result.ok) {
        setTableError(cfApiErrorMessage(result, `Falha ao navegar "${selected.name}"`));
      } else if (!result.data.ok) {
        setTableError(result.data.error ?? 'Motor reportou falha ao navegar a tabela D1.');
      } else {
        setTableData(result.data);
      }
      setTableLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [database.uuid, selected, page]);

  const copyDdl = async (ddl: string) => {
    try {
      await navigator.clipboard.writeText(ddl);
      showNotification('DDL copiado.', 'success');
    } catch {
      showNotification('Falha ao copiar o DDL — copie manualmente.', 'error');
    }
  };

  const total = tableData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / TABLE_PER_PAGE));
  const columns = tableData?.columns ?? [];
  const rows = tableData?.rows ?? [];

  const groupedTypes = ['table', 'view', 'index'].filter((type) => objects.some((object) => object.type === type));

  return (
    <div className="storage-schema-layout">
      <div className="storage-schema-list">
        <div className="storage-editor-header">
          <h5>Schema</h5>
          <button
            type="button"
            className="ghost-button"
            onClick={() => setReloadNonce((nonce) => nonce + 1)}
            disabled={schemaLoading}
            aria-label="Recarregar schema"
          >
            {schemaLoading ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
          </button>
        </div>
        {schemaError && (
          <p className="field-error" role="alert">
            {schemaError}
          </p>
        )}
        {!schemaLoading && !schemaError && objects.length === 0 && (
          <p className="field-hint">Nenhum objeto de usuário neste banco.</p>
        )}
        {groupedTypes.map((type) => (
          <div key={type} className="storage-schema-group">
            <h6>{OBJECT_TYPE_LABELS[type] ?? type}</h6>
            <ul>
              {objects
                .filter((object) => object.type === type)
                .map((object) => (
                  <li key={`${object.type}:${object.name}`}>
                    <button
                      type="button"
                      className={
                        selected?.name === object.name && selected?.type === object.type
                          ? 'storage-link-button storage-schema-item--active'
                          : 'storage-link-button'
                      }
                      onClick={() => {
                        setSelected(object);
                        setPage(1);
                      }}
                    >
                      {object.name}
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="storage-schema-detail">
        {!selected && <p className="field-hint">Selecione um objeto do schema para ver o DDL e os dados.</p>}
        {selected && (
          <>
            <div className="storage-editor-header">
              <h5>
                {selected.name} <span className="storage-badge">{selected.type}</span>
              </h5>
              {selected.sql && (
                <button type="button" className="ghost-button" onClick={() => void copyDdl(selected.sql ?? '')}>
                  <Copy size={13} /> Copiar DDL
                </button>
              )}
            </div>
            {selected.sql ? (
              <pre className="storage-ddl-pre">{selected.sql}</pre>
            ) : (
              <p className="field-hint">Objeto sem DDL registrado no sqlite_master.</p>
            )}

            {browsable && (
              <>
                {tableError && (
                  <p className="field-error" role="alert">
                    {tableError}
                  </p>
                )}
                {tableLoading ? (
                  <div className="storage-panel--status" role="status">
                    <Loader2 size={16} className="spin" /> Carregando linhas...
                  </div>
                ) : (
                  tableData && (
                    <>
                      {rows.length === 0 ? (
                        <p className="field-hint">Sem linhas nesta página.</p>
                      ) : (
                        <div className="storage-table-wrap">
                          <table className="storage-table">
                            <thead>
                              <tr>
                                {columns.map((column) => (
                                  <th key={column.name} title={column.type}>
                                    {column.name}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((row, rowIndex) => (
                                // biome-ignore lint/suspicious/noArrayIndexKey: linhas paginadas somente leitura, sem identidade estável
                                <tr key={`row-${rowIndex}`}>
                                  {columns.map((column) => (
                                    <td key={column.name}>{formatCell(row[column.name])}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      <div className="storage-pagination">
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                          disabled={tableLoading || page <= 1}
                        >
                          ← Anterior
                        </button>
                        <span>
                          Página {page} de {totalPages} · {total} linha(s)
                        </span>
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => setPage((prev) => prev + 1)}
                          disabled={tableLoading || page >= totalPages}
                        >
                          Próxima →
                        </button>
                      </div>
                    </>
                  )
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

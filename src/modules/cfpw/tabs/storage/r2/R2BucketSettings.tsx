/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Configurações do bucket R2 (ST-R2, read-only): domínio gerenciado r2.dev
 * (on/off), domínios custom com status, CORS e lifecycle em JSON formatado —
 * somente exibição, com nota para gerenciar no dashboard Cloudflare.
 */

import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cfApiErrorMessage, cfApiFetch } from '../../../../shared/cfApi';
import type { R2BucketSettingsPayload } from '../../../types';

type R2BucketSettingsProps = {
  bucket: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toCustomDomainList = (customDomains: unknown): Array<Record<string, unknown>> => {
  if (Array.isArray(customDomains)) {
    return customDomains.filter(isRecord);
  }
  if (isRecord(customDomains) && Array.isArray(customDomains.domains)) {
    return customDomains.domains.filter(isRecord);
  }
  return [];
};

const toPrettyJson = (value: unknown): string => JSON.stringify(value, null, 2);

export function R2BucketSettings({ bucket }: R2BucketSettingsProps) {
  const [settings, setSettings] = useState<R2BucketSettingsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    void (async () => {
      const query = new URLSearchParams({ bucket });
      const result = await cfApiFetch<R2BucketSettingsPayload>(
        `/api/cfpw/storage/r2/bucket-settings?${query.toString()}`,
      );
      if (cancelled) return;
      if (!result.ok) {
        setLoadError(cfApiErrorMessage(result, `Falha ao ler as configurações do bucket ${bucket}`));
      } else if (!result.data.ok) {
        setLoadError(result.data.error ?? 'Motor reportou falha ao ler as configurações do bucket R2.');
      } else {
        setSettings(result.data);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [bucket, reloadNonce]);

  if (loading) {
    return (
      <div className="storage-panel--status" role="status">
        <Loader2 size={16} className="spin" /> Lendo configurações do bucket...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="storage-panel storage-warning-panel" role="alert">
        <h4>
          <AlertTriangle size={16} /> Configurações indisponíveis
        </h4>
        <p>{loadError}</p>
        <button type="button" className="ghost-button" onClick={() => setReloadNonce((nonce) => nonce + 1)}>
          <RefreshCw size={14} /> Tentar novamente
        </button>
      </div>
    );
  }

  const managedDomain = isRecord(settings?.managedDomain) ? settings.managedDomain : null;
  const customDomains = toCustomDomainList(settings?.customDomains);
  const warnings = settings?.warnings ?? [];

  return (
    <div className="storage-r2-settings">
      <p className="field-hint">Somente leitura — gerencie domínios, CORS e lifecycle no dashboard Cloudflare.</p>

      {warnings.length > 0 && (
        <div className="cfpw-inline-warning" role="status">
          <AlertTriangle size={14} />
          <span>{warnings.map((warning) => `${warning.code ?? '?'}: ${warning.message ?? ''}`).join(' · ')}</span>
        </div>
      )}

      <div className="cfpw-subsection">
        <h4>Domínio gerenciado (r2.dev)</h4>
        {managedDomain ? (
          <p>
            <code>{String(managedDomain.domain ?? '—')}</code>{' '}
            <span className={`cfpw-status-badge ${managedDomain.enabled === true ? 'ok' : 'warning'}`}>
              {managedDomain.enabled === true ? 'ativo' : 'desativado'}
            </span>
          </p>
        ) : (
          <div className="cfpw-empty-state">Domínio r2.dev não configurado para este bucket.</div>
        )}
      </div>

      <div className="cfpw-subsection">
        <h4>Domínios custom</h4>
        {customDomains.length === 0 ? (
          <div className="cfpw-empty-state">Nenhum domínio custom vinculado.</div>
        ) : (
          <div className="storage-table-wrap">
            <table className="storage-table">
              <thead>
                <tr>
                  <th>Domínio</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {customDomains.map((domain, index) => {
                  const name = String(domain.domain ?? `domínio-${index + 1}`);
                  const status = isRecord(domain.status) ? String(domain.status.ownership ?? '—') : '—';
                  return (
                    <tr key={name}>
                      <td>
                        <code>{name}</code>
                      </td>
                      <td>
                        {domain.enabled === true ? 'ativo' : 'desativado'}
                        {status !== '—' ? ` · ${status}` : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="cfpw-subsection">
        <h4>CORS</h4>
        {settings?.cors == null ? (
          <div className="cfpw-empty-state">Sem política CORS configurada.</div>
        ) : (
          <pre className="storage-ddl-pre">{toPrettyJson(settings.cors)}</pre>
        )}
      </div>

      <div className="cfpw-subsection">
        <h4>Lifecycle</h4>
        {settings?.lifecycle == null ? (
          <div className="cfpw-empty-state">Sem regras de lifecycle configuradas.</div>
        ) : (
          <pre className="storage-ddl-pre">{toPrettyJson(settings.lifecycle)}</pre>
        )}
      </div>
    </div>
  );
}

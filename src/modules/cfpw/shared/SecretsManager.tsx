/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Gerenciador de Variáveis & Segredos (Workers e Pages), extraído verbatim de
 * CfPwModule.tsx. Mantém os fetch sites crus originais (incl. X-Admin-Actor).
 */

import { Loader2, ShieldCheck, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNotification } from '../../../components/Notification';
import type { OpsResponsePayload, PageDetailsPayload } from '../types';

export const SecretsManager: React.FC<{ domainType: 'worker' | 'page'; resourceId: string; adminActor: string }> = ({
  domainType,
  resourceId,
  adminActor,
}) => {
  const [secrets, setSecrets] = useState<{ name: string; type: string; value?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newType, setNewType] = useState<'plain_text' | 'secret_text'>('secret_text');
  const [isRotating, setIsRotating] = useState(false);
  const { showNotification } = useNotification();

  const loadSecrets = useCallback(async () => {
    setLoading(true);
    try {
      if (domainType === 'worker') {
        const res = await fetch('/api/cfpw/ops', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Admin-Actor': adminActor },
          body: JSON.stringify({ action: 'list-worker-secrets', scriptName: resourceId }),
        });
        const payload = (await res.json()) as OpsResponsePayload;
        if (!res.ok || !payload.ok) throw new Error(payload.error ?? 'Falha.');
        setSecrets(Array.isArray(payload.result) ? (payload.result as { name: string; type: string }[]) : []);
      } else {
        const query = new URLSearchParams({ projectName: resourceId });
        const res = await fetch(`/api/cfpw/page-details?${query.toString()}`, {
          headers: { 'X-Admin-Actor': adminActor },
        });
        const payload = (await res.json()) as PageDetailsPayload;
        if (!res.ok || !payload.ok) throw new Error(payload.error ?? 'Falha.');
        const projectRecord = payload.project as Record<string, unknown> | undefined;
        const deploymentConfigs = projectRecord?.deployment_configs as Record<string, unknown> | undefined;
        const productionConfig = deploymentConfigs?.production as Record<string, unknown> | undefined;
        const envVars = (productionConfig?.env_vars as Record<string, { type: string; value?: string }>) || {};
        const mapped = Object.entries(envVars).map(([key, entry]) => ({
          name: key,
          type: entry.type,
          ...(entry.value !== undefined ? { value: entry.value } : {}),
        }));
        setSecrets(mapped);
      }
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Erro ao ler secrets', 'error');
    } finally {
      setLoading(false);
    }
  }, [domainType, resourceId, adminActor, showNotification]);

  useEffect(() => {
    void loadSecrets();
  }, [loadSecrets]);

  const handleDelete = async (secretName: string) => {
    setLoading(true);
    try {
      if (domainType === 'worker') {
        const res = await fetch('/api/cfpw/ops', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Admin-Actor': adminActor },
          body: JSON.stringify({ action: 'delete-worker-secret', scriptName: resourceId, secretName }),
        });
        const payload = (await res.json()) as OpsResponsePayload;
        if (!res.ok || !payload.ok) throw new Error(payload.error ?? 'Falha.');
      } else {
        const settingsJson = JSON.stringify({
          deployment_configs: { production: { env_vars: { [secretName]: null } } },
        });
        const res = await fetch('/api/cfpw/ops', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Admin-Actor': adminActor },
          body: JSON.stringify({
            action: 'update-page-project-settings',
            projectName: resourceId,
            pageSettingsJson: settingsJson,
          }),
        });
        const payload = (await res.json()) as OpsResponsePayload;
        if (!res.ok || !payload.ok) throw new Error(payload.error ?? 'Falha.');
      }
      showNotification('Removido.', 'success');
      await loadSecrets();
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Erro', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newValue.trim()) return;
    setLoading(true);
    try {
      if (domainType === 'worker') {
        const res = await fetch('/api/cfpw/ops', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Admin-Actor': adminActor },
          body: JSON.stringify({
            action: 'add-worker-secret',
            scriptName: resourceId,
            secretName: newName.trim(),
            secretValue: newValue.trim(),
          }),
        });
        const payload = (await res.json()) as OpsResponsePayload;
        if (!res.ok || !payload.ok) throw new Error(payload.error ?? 'Falha.');
      } else {
        const settingsJson = JSON.stringify({
          deployment_configs: {
            production: { env_vars: { [newName.trim()]: { value: newValue.trim(), type: newType } } },
          },
        });
        const res = await fetch('/api/cfpw/ops', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Admin-Actor': adminActor },
          body: JSON.stringify({
            action: 'update-page-project-settings',
            projectName: resourceId,
            pageSettingsJson: settingsJson,
          }),
        });
        const payload = (await res.json()) as OpsResponsePayload;
        if (!res.ok || !payload.ok) throw new Error(payload.error ?? 'Falha.');
      }
      showNotification(isRotating ? 'Rotacionado com sucesso.' : 'Adicionado com sucesso.', 'success');
      setNewName('');
      setNewValue('');
      setNewType('secret_text');
      setIsRotating(false);
      await loadSecrets();
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Erro', 'error');
    } finally {
      setLoading(false);
    }
  };

  const startRotate = (s: { name: string; type: string; value?: string }) => {
    setNewName(s.name);
    setNewValue(s.value || '');
    setNewType((s.type as 'plain_text' | 'secret_text') || 'secret_text');
    setIsRotating(true);
    window.scrollTo({ top: document.getElementById('secrets-manager-form')?.offsetTop || 0, behavior: 'smooth' });
  };

  const cancelRotate = () => {
    setNewName('');
    setNewValue('');
    setNewType('secret_text');
    setIsRotating(false);
  };

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #dadce0',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
      }}
    >
      <h3 style={{ margin: '0 0 16px', fontSize: '1.2rem' }}>Gerenciador de Variáveis & Segredos</h3>

      <form
        id="secrets-manager-form"
        onSubmit={handleAdd}
        style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}
      >
        <input
          placeholder="KEY_NAME"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          disabled={loading || isRotating}
          style={{ flex: 1, minWidth: '150px' }}
        />
        <input
          type={newType === 'secret_text' ? 'password' : 'text'}
          placeholder={newType === 'secret_text' ? 'Valor Secreto' : 'Valor da Variável'}
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          disabled={loading}
          style={{ flex: 2, minWidth: '200px' }}
        />

        {domainType === 'page' && (
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as 'plain_text' | 'secret_text')}
            disabled={loading || isRotating}
            style={{ padding: '8px', border: '1px solid #dadce0', borderRadius: '6px' }}
          >
            <option value="secret_text">Segredo Oculto</option>
            <option value="plain_text">Variável de Texto</option>
          </select>
        )}

        <button type="submit" className="primary-button" disabled={loading} style={{ padding: '8px 16px' }}>
          {isRotating ? 'Salvar Rotação' : 'Adicionar'}
        </button>
        {isRotating && (
          <button
            type="button"
            className="ghost-button"
            onClick={cancelRotate}
            disabled={loading}
            style={{ padding: '8px' }}
          >
            Cancelar
          </button>
        )}
      </form>

      <div>
        {loading && secrets.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#5f6368' }}>
            <Loader2 size={16} className="spin" /> Carregando...
          </div>
        ) : secrets.length === 0 ? (
          <div style={{ color: '#5f6368', fontStyle: 'italic' }}>Nenhuma variável configurada.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {secrets.map((s) => (
              <div
                key={s.name}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#f8f9fa',
                  padding: '12px 16px',
                  borderRadius: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <ShieldCheck size={16} color="#1a73e8" />
                  <strong>{s.name}</strong>
                  <span style={{ fontSize: '0.8rem', background: '#e8eaed', padding: '2px 6px', borderRadius: '4px' }}>
                    {s.type}
                  </span>
                  {s.type === 'plain_text' && s.value && (
                    <span
                      style={{
                        fontSize: '0.8rem',
                        color: '#5f6368',
                        background: '#fff',
                        border: '1px solid #dadce0',
                        padding: '2px 6px',
                        borderRadius: '4px',
                      }}
                    >
                      {s.value}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="ghost-button"
                    style={{ padding: '4px 12px', fontSize: '0.85rem' }}
                    onClick={() => startRotate(s)}
                    disabled={loading}
                    title="Alterar valor"
                  >
                    Rotacionar
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    style={{ color: '#d93025', padding: '4px' }}
                    onClick={() => handleDelete(s.name)}
                    disabled={loading}
                    title="Remover"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

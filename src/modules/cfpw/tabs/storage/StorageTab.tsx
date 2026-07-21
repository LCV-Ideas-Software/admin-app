/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Aba "Armazenamento" do módulo CF P&W (ST-KV + ST-D1 + ST-R2): sub-abas de
 * storage com KV, D1 e R2 completos. Gating por capabilities do motor — sem
 * permissão do produto, mostra instrução de correção em pt-BR em vez dos
 * painéis. Aceita deep-link (#cfpw-storage/<kind>/<id>) vindo do CfPwModule e
 * mantém o hash atualizado via history.replaceState na navegação interna.
 */

import { AlertTriangle, Loader2 } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { useCapabilities } from '../../hooks/useCapabilities';
import type { CfpwCapabilityProbe, KvNamespaceSummary } from '../../types';
import { D1DatabasesPanel } from './d1/D1DatabasesPanel';
import { KvKeyBrowser } from './kv/KvKeyBrowser';
import { KvNamespacesPanel } from './kv/KvNamespacesPanel';
import { R2BucketsPanel } from './r2/R2BucketsPanel';
import { buildStorageHash, type StorageDeepLink } from './storageDeepLink';

type StorageTabProps = {
  adminActor: string;
  /** Deep-link do CfPwModule; o nonce distingue cliques repetidos no mesmo alvo. */
  deepLink?: (StorageDeepLink & { nonce: number }) | null;
};

type StorageSubTab = 'kv' | 'd1' | 'r2';

const KV_DISABLED_INSTRUCTIONS: Record<'sem-permissao' | 'indisponivel' | 'erro', string> = {
  'sem-permissao':
    'Sem permissão para Workers KV: crie o token cloudflare-storage (Workers KV Storage Edit + D1 Edit + R2 Edit) ' +
    'no Secrets Store ou amplie as permissões do token CLOUDFLARE_PW.',
  indisponivel: 'Workers KV indisponível nesta conta Cloudflare — verifique se o produto está ativo no dashboard.',
  erro: 'Falha ao sondar o Workers KV na API Cloudflare — tente atualizar; se persistir, verifique o motor.',
};

const D1_DISABLED_INSTRUCTIONS: Record<'sem-permissao' | 'indisponivel' | 'erro', string> = {
  'sem-permissao':
    'Sem permissão para D1: crie o token cloudflare-storage (Workers KV Storage Edit + D1 Edit + R2 Edit) ' +
    'no Secrets Store ou amplie as permissões do token CLOUDFLARE_PW.',
  indisponivel: 'D1 indisponível nesta conta Cloudflare — verifique se o produto está ativo no dashboard.',
  erro: 'Falha ao sondar o D1 na API Cloudflare — tente atualizar; se persistir, verifique o motor.',
};

const R2_DISABLED_INSTRUCTIONS: Record<'sem-permissao' | 'indisponivel' | 'erro', string> = {
  'sem-permissao':
    'Sem permissão para R2: crie o token cloudflare-storage (Workers KV Storage Edit + D1 Edit + R2 Edit) ' +
    'no Secrets Store ou amplie as permissões do token CLOUDFLARE_PW.',
  indisponivel: 'R2 indisponível nesta conta Cloudflare — verifique se o produto está ativo no dashboard.',
  erro: 'Falha ao sondar o R2 na API Cloudflare — tente atualizar; se persistir, verifique o motor.',
};

export function StorageTab({ adminActor, deepLink }: StorageTabProps) {
  const { capabilities, isLoading, error } = useCapabilities();
  const [subTab, setSubTab] = useState<StorageSubTab>(deepLink?.kind ?? 'kv');
  const [selectedNamespace, setSelectedNamespace] = useState<KvNamespaceSummary | null>(null);
  const [d1SelectedId, setD1SelectedId] = useState<string | null>(null);
  const [r2SelectedBucket, setR2SelectedBucket] = useState<string | null>(null);

  // Deep-link: abre a sub-aba certa e pré-seleciona o alvo. Para KV o título
  // real não está no hash — sintetiza {id, title: id} (o browser só usa o id).
  useEffect(() => {
    if (!deepLink) return;
    setSubTab(deepLink.kind);
    if (deepLink.kind === 'kv') {
      setSelectedNamespace(deepLink.id ? { id: deepLink.id, title: deepLink.id } : null);
    }
  }, [deepLink]);

  // Navegação interna → hash sempre espelhando o alvo atual (replaceState:
  // não cria entradas de histórico nem toca no router de pathname).
  useEffect(() => {
    const id =
      subTab === 'kv'
        ? (selectedNamespace?.id ?? '')
        : subTab === 'd1'
          ? (d1SelectedId ?? '')
          : (r2SelectedBucket ?? '');
    window.history.replaceState(null, '', buildStorageHash({ kind: subTab, id }));
  }, [subTab, selectedNamespace, d1SelectedId, r2SelectedBucket]);

  const renderProbeGate = (
    probe: CfpwCapabilityProbe | null,
    productLabel: string,
    instructions: Record<'sem-permissao' | 'indisponivel' | 'erro', string>,
    renderEnabled: () => ReactNode,
  ) => {
    if (isLoading) {
      return (
        <div className="storage-panel storage-panel--status" role="status">
          <Loader2 size={18} className="spin" /> Sondando capacidades Cloudflare...
        </div>
      );
    }

    if (error) {
      return (
        <div className="storage-panel storage-warning-panel" role="alert">
          <h4>
            <AlertTriangle size={16} /> Capacidades indisponíveis
          </h4>
          <p>{error.message}</p>
        </div>
      );
    }

    if (probe && !probe.enabled) {
      return (
        <div className="storage-panel storage-warning-panel" role="alert">
          <h4>
            <AlertTriangle size={16} /> {productLabel} desabilitado ({probe.reason})
          </h4>
          <p>{instructions[probe.reason]}</p>
          <p className="storage-warning-detail">{probe.detail}</p>
        </div>
      );
    }

    return renderEnabled();
  };

  const renderKvBody = () =>
    renderProbeGate(capabilities?.kv ?? null, 'Workers KV', KV_DISABLED_INSTRUCTIONS, () => {
      if (selectedNamespace) {
        return (
          <KvKeyBrowser
            adminActor={adminActor}
            namespace={selectedNamespace}
            onBack={() => setSelectedNamespace(null)}
          />
        );
      }
      return <KvNamespacesPanel adminActor={adminActor} onSelect={setSelectedNamespace} />;
    });

  const renderD1Body = () =>
    renderProbeGate(capabilities?.d1 ?? null, 'D1', D1_DISABLED_INSTRUCTIONS, () => (
      <D1DatabasesPanel
        key={`d1-${deepLink?.nonce ?? 0}`}
        adminActor={adminActor}
        {...(deepLink?.kind === 'd1' && deepLink.id ? { initialDatabaseId: deepLink.id } : {})}
        onSelectedChange={setD1SelectedId}
      />
    ));

  const renderR2Body = () =>
    renderProbeGate(capabilities?.r2 ?? null, 'R2', R2_DISABLED_INSTRUCTIONS, () => (
      <R2BucketsPanel
        key={`r2-${deepLink?.nonce ?? 0}`}
        adminActor={adminActor}
        {...(deepLink?.kind === 'r2' && deepLink.id ? { initialBucket: deepLink.id } : {})}
        onSelectedChange={setR2SelectedBucket}
      />
    ));

  return (
    <div className="storage-tab">
      <div className="page-tab-nav storage-subtab-nav">
        <button
          type="button"
          className={subTab === 'kv' ? 'page-tab-item active' : 'page-tab-item'}
          onClick={() => setSubTab('kv')}
        >
          KV
        </button>
        <button
          type="button"
          className={subTab === 'd1' ? 'page-tab-item active' : 'page-tab-item'}
          onClick={() => setSubTab('d1')}
        >
          D1
        </button>
        <button
          type="button"
          className={subTab === 'r2' ? 'page-tab-item active' : 'page-tab-item'}
          onClick={() => setSubTab('r2')}
        >
          R2
        </button>
      </div>
      {subTab === 'kv' ? renderKvBody() : subTab === 'd1' ? renderD1Body() : renderR2Body()}
    </div>
  );
}

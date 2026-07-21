/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Visualizador amigável recursivo de dados opacos (resultados de operações da
 * API Cloudflare). Movido de OpsModal.tsx para compartilhamento com o Console
 * avançado (PW-2).
 */

export const AmigavelViewer: React.FC<{ data: unknown }> = ({ data }) => {
  if (data === null || data === undefined) return <span>Sem dados.</span>;
  if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
    return <span>{String(data)}</span>;
  }
  if (Array.isArray(data)) {
    if (data.length === 0) return <span>Vazio.</span>;
    return (
      <ul style={{ paddingLeft: '20px', margin: '4px 0', fontSize: '0.85rem' }}>
        {data.map((item, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: recursive render of opaque data with no stable identity
          <li key={i}>
            <AmigavelViewer data={item} />
          </li>
        ))}
      </ul>
    );
  }
  if (typeof data === 'object') {
    const keys = Object.keys(data);
    if (keys.length === 0) return <span>Vazio.</span>;
    return (
      <div
        style={{
          paddingLeft: '12px',
          borderLeft: '2px solid rgba(0,0,0,0.1)',
          margin: '4px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          fontSize: '0.85rem',
        }}
      >
        {keys.map((key) => (
          <div key={key}>
            <strong style={{ color: '#5f6368' }}>{key}: </strong>
            <AmigavelViewer data={(data as Record<string, unknown>)[key]} />
          </div>
        ))}
      </div>
    );
  }
  return <span>Desconhecido</span>;
};

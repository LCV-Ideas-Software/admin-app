/**
 * ConfigModule.tsx - Centralized Configuration Management (Stub)
 * 
 * This module is registered for future expansion to consolidate:
 * - Theme colors (primary, secondary, status colors)
 * - Typography settings (font-size, font-weight)
 * - Spacing presets
 * - Rate limit defaults per module
 * - Global preferences
 */

import { useNotification } from '../../components/Notification'

/**
 * ConfigModule - Placeholder for configuration management
 */
export function ConfigModule() {
  const { showNotification } = useNotification()

  const handleNavigateToDesignTokens = () => {
    showNotification(
      'Design tokens são gerenciados em src/styles/variables.css',
      'info',
    )
  }

  return (
    <div className="module-container">
      <section className="detail-panel module-shell module-shell-config">
        <div className="detail-header">
          <div className="detail-icon">⚙️</div>
          <div>
            <h3>Configurações Globais</h3>
            <p>Gerencie cores, tipografia, espaçamento, rate limits e acessibilidade</p>
          </div>
        </div>

        <div className="detail-grid">
          <article className="detail-card">
            <span className="detail-label">Design Tokens</span>
            <strong>CSS Variables</strong>
            <p>
              Todos os tokens de design (cores, espaçamento, tipografia, sombras, raios de borda) estão centralizados em
              <code>src/styles/variables.css</code>.
            </p>
            <button
              type="button"
              className="ghost-button"
              onClick={handleNavigateToDesignTokens}
            >
              Ver Design Tokens
            </button>
          </article>

          <article className="detail-card">
            <span className="detail-label">Rate Limits</span>
            <strong>Por Módulo</strong>
            <p>Rate limits são gerenciados por módulo através da biblioteca consolidada em<code>functions/api/_lib/rate-limit-common.ts</code>.</p>
          </article>

          <article className="detail-card">
            <span className="detail-label">API de Configuração</span>
            <strong>/api/config</strong>
            <p>Endpoint centralizado para carregar/salvar configurações globais via D1. Suporta GET, POST e DELETE.</p>
          </article>

          <article className="detail-card detail-card-alert">
            <span className="detail-label">Status</span>
            <strong>Em Construção</strong>
            <p>
              Esta fase estabeleceu a fundação (hooks, design tokens, rate limit common). A UI de configuração será
              implementada na próxima fase após validação de base.
            </p>
          </article>
        </div>
      </section>
    </div>
  )
}

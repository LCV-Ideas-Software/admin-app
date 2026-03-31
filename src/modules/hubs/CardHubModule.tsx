/*
 * Copyright (C) 2026 Leonardo Cardozo Vargas
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { HubCardsModule } from './HubCardsModule'

/**
 * Card Hub — Painel unificado que empilha AdminHub e AppHub verticalmente.
 * Cada seção mantém a estrutura visual original do HubCardsModule.
 */
export function CardHubModule() {
  return (
    <div className="card-hub-stack">
      <HubCardsModule
        title="AdminHub — Catálogo Administrativo"
        description="Gerencie os cards exibidos no painel administrativo."
        endpoint="/api/adminhub/config"
        adminActorFieldId="adminhub-admin-actor"
        adminActorFieldName="adminhubAdminActor"
      />

      <HubCardsModule
        title="AppHub — Catálogo de Apps"
        description="Gerencie os cards exibidos no hub público de aplicativos."
        endpoint="/api/apphub/config"
        adminActorFieldId="apphub-admin-actor"
        adminActorFieldName="apphubAdminActor"
      />
    </div>
  )
}

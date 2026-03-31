/*
 * Copyright (C) 2026 Leonardo Cardozo Vargas
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { HubCardsModule } from './HubCardsModule'

export function ApphubModule() {
  return (
    <HubCardsModule
      title="AppHub — Catálogo de Apps"
      description="Gerencie os cards exibidos no hub público de aplicativos."
      endpoint="/api/apphub/config"
      adminActorFieldId="apphub-admin-actor"
      adminActorFieldName="apphubAdminActor"
    />
  )
}
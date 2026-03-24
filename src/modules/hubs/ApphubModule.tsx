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
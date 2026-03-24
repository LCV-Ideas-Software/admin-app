import { HubCardsModule } from './HubCardsModule'

export function AdminhubModule() {
  return (
    <HubCardsModule
      title="AdminHub — Catálogo Administrativo"
      description="Gerencie os cards exibidos no painel administrativo."
      endpoint="/api/adminhub/config"
      adminActorFieldId="adminhub-admin-actor"
      adminActorFieldName="adminhubAdminActor"
    />
  )
}
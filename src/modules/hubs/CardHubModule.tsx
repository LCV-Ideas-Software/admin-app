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
        description="Configuração centralizada dos cards administrativos do AdminHub, com persistência em D1 no admin-app."
        endpoint="/api/adminhub/config"
        adminActorFieldId="adminhub-admin-actor"
        adminActorFieldName="adminhubAdminActor"
      />

      <HubCardsModule
        title="AppHub — Catálogo de Apps"
        description="Configuração centralizada dos cards públicos do AppHub, com persistência em D1 no admin-app."
        endpoint="/api/apphub/config"
        adminActorFieldId="apphub-admin-actor"
        adminActorFieldName="apphubAdminActor"
      />
    </div>
  )
}

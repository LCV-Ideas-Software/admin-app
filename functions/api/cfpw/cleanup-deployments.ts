import {
  resolveCloudflarePwAccount,
  listCloudflarePagesProjects,
  listCloudflarePagesDeployments,
  deleteCloudflarePagesDeployment,
  getCloudflarePagesProject,
} from '../_lib/cfpw-api'

type Context = {
  request: Request
  env: {
    CLOUDFLARE_PW?: string
    CLOUDFLARE_API_TOKEN?: string
    CF_API_TOKEN?: string
    CF_ACCOUNT_ID?: string
  }
}

type ScanProject = {
  name: string
  totalDeployments: number
  latestDeployment: {
    id: string
    created_on: string
    environment: string
    url: string
  } | null
  obsoleteDeployments: Array<{
    id: string
    short_id: string
    created_on: string
    environment: string
    url: string
  }>
}

type ScanResponse = {
  accountId: string
  projects: ScanProject[]
  totalProjects: number
  totalDeployments: number
  totalObsolete: number
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const isActiveStageStatus = (status: string) => {
  const normalized = status.trim().toLowerCase()
  return normalized === 'active'
}

/**
 * GET — Scan: lista todos os projetos Pages e seus deployments,
 * identificando os obsoletos (tudo menos o mais recente).
 */
export async function onRequestGet(context: Context) {
  try {
    const { accountId } = await resolveCloudflarePwAccount(context.env)
    const projects = await listCloudflarePagesProjects(context.env, accountId)

    let totalDeployments = 0
    let totalObsolete = 0

    // Mapeia cada projeto com seus deployments em paralelo
    const scanResults: ScanProject[] = await Promise.all(
      projects.map(async (project) => {
        const projectName = String(project.name ?? '').trim()
        if (!projectName) {
          return {
            name: '(sem nome)',
            totalDeployments: 0,
            latestDeployment: null,
            obsoleteDeployments: [],
          }
        }

        try {
          const [projectDetails, deployments] = await Promise.all([
            getCloudflarePagesProject(context.env, accountId, projectName).catch(() => null),
            listCloudflarePagesDeployments(context.env, accountId, projectName),
          ])

          // Ordenação cronológica estrita (mais recente primeiro)
          const sorted = [...deployments].sort((a, b) => {
            const dateA = new Date(a.created_on ?? '').getTime() || 0
            const dateB = new Date(b.created_on ?? '').getTime() || 0
            return dateB - dateA
          })

          // O deployment ativo de produção pode vir como canonical_deployment.
          const canonicalDeploymentId = String(
            projectDetails?.canonical_deployment?.id ?? project.canonical_deployment?.id ?? '',
          ).trim()

          // Fallback adicional: alguns cenários de rollout/rollback expõem o ativo
          // diretamente no status do stage do deployment.
          const activeFromStageIds = new Set(
            sorted
              .filter((d) => isActiveStageStatus(String(d.latest_stage?.status ?? '')))
              .map((d) => String(d.id ?? '').trim())
              .filter(Boolean),
          )

          // Conjunto de IDs protegidos: somente deployments ativos.
          const protectedIds = new Set<string>()
          if (canonicalDeploymentId) protectedIds.add(canonicalDeploymentId)
          for (const stageActiveId of activeFromStageIds) {
            protectedIds.add(stageActiveId)
          }

          // Fallback defensivo: se a API não expuser canonical nem stage active,
          // usa latest_deployment como possível ativo para evitar exclusão indevida.
          if (protectedIds.size === 0) {
            const fallbackActiveId = String(
              projectDetails?.latest_deployment?.id ?? project.latest_deployment?.id ?? '',
            ).trim()
            if (fallbackActiveId) {
              protectedIds.add(fallbackActiveId)
            }
          }

          // Exibe o deployment ativo (ou fallback visual para o mais recente).
          const activeForDisplayId = Array.from(protectedIds)[0] ?? ''
          const latestForDisplay = activeForDisplayId
            ? sorted.find(d => String(d.id) === activeForDisplayId) ?? sorted[0] ?? null
            : sorted[0] ?? null

          // Obsoletos = tudo que NÃO está no set de ativos.
          const obsolete = sorted.filter(d => !protectedIds.has(String(d.id ?? '')))

          totalDeployments += sorted.length
          totalObsolete += obsolete.length

          return {
            name: projectName,
            totalDeployments: sorted.length,
            latestDeployment: latestForDisplay
              ? {
                  id: String(latestForDisplay.id ?? ''),
                  created_on: String(latestForDisplay.created_on ?? ''),
                  environment: String(latestForDisplay.environment ?? ''),
                  url: String(latestForDisplay.url ?? ''),
                }
              : null,
            obsoleteDeployments: obsolete.map((d) => ({
              id: String(d.id ?? ''),
              short_id: String(d.short_id ?? String(d.id ?? '').slice(0, 8)),
              created_on: String(d.created_on ?? ''),
              environment: String(d.environment ?? ''),
              url: String(d.url ?? ''),
            })),
          }
        } catch {
          // Projeto com falha de leitura — retorna como vazio
          return {
            name: projectName,
            totalDeployments: 0,
            latestDeployment: null,
            obsoleteDeployments: [],
          }
        }
      }),
    )

    const response: ScanResponse = {
      accountId,
      projects: scanResults,
      totalProjects: scanResults.length,
      totalDeployments,
      totalObsolete,
    }

    return jsonResponse(response)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido ao escanear infraestrutura.'
    return jsonResponse({ error: message }, 500)
  }
}

/**
 * POST — Delete: remove um deployment obsoleto específico.
 * Body: { projectName: string, deploymentId: string }
 */
export async function onRequestPost(context: Context) {
  try {
    const body = (await context.request.json()) as { projectName?: string; deploymentId?: string }
    const projectName = String(body.projectName ?? '').trim()
    const deploymentId = String(body.deploymentId ?? '').trim()

    if (!projectName || !deploymentId) {
      return jsonResponse({ error: 'projectName e deploymentId são obrigatórios.' }, 400)
    }

    const { accountId } = await resolveCloudflarePwAccount(context.env)

    // Safety guard fail-safe: previne exclusão do deployment ativo.
    // Se não for possível validar com segurança, bloqueia a exclusão.
    try {
      const [project, deployments] = await Promise.all([
        getCloudflarePagesProject(context.env, accountId, projectName),
        listCloudflarePagesDeployments(context.env, accountId, projectName),
      ])

      const canonicalId = String(project?.canonical_deployment?.id ?? '').trim()

      const activeStageIds = new Set(
        deployments
          .filter((d) => isActiveStageStatus(String(d.latest_stage?.status ?? '')))
          .map((d) => String(d.id ?? '').trim())
          .filter(Boolean),
      )

      const protectedActiveIds = new Set<string>()
      if (canonicalId) {
        protectedActiveIds.add(canonicalId)
      }
      for (const stageActiveId of activeStageIds) {
        protectedActiveIds.add(stageActiveId)
      }

      if (protectedActiveIds.size === 0) {
        const fallbackActiveId = String(project?.latest_deployment?.id ?? '').trim()
        if (fallbackActiveId) {
          protectedActiveIds.add(fallbackActiveId)
        }
      }

      if (protectedActiveIds.has(deploymentId)) {
        return jsonResponse({
          error: `Deployment ${deploymentId} é o deployment ATIVO do projeto ${projectName}. Exclusão bloqueada.`,
          ok: false,
        }, 403)
      }
    } catch (guardErr) {
      const guardMessage = guardErr instanceof Error
        ? guardErr.message
        : 'Não foi possível validar o deployment ativo.'
      return jsonResponse({
        error: `Validação de segurança falhou para ${projectName}. Exclusão bloqueada: ${guardMessage}`,
        ok: false,
      }, 503)
    }

    await deleteCloudflarePagesDeployment(context.env, accountId, projectName, deploymentId)

    return jsonResponse({
      ok: true,
      projectName,
      deploymentId,
      message: `Deployment ${deploymentId} removido com sucesso.`,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido ao remover deployment.'
    return jsonResponse({ error: message, ok: false }, 500)
  }
}

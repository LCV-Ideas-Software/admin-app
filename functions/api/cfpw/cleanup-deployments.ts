import {
  resolveCloudflarePwAccount,
  listCloudflarePagesProjects,
  listCloudflarePagesDeployments,
  deleteCloudflarePagesDeployment,
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
          const deployments = await listCloudflarePagesDeployments(context.env, accountId, projectName)

          // Ordenação cronológica estrita (mais recente primeiro)
          const sorted = [...deployments].sort((a, b) => {
            const dateA = new Date(a.created_on ?? '').getTime() || 0
            const dateB = new Date(b.created_on ?? '').getTime() || 0
            return dateB - dateA
          })

          const latest = sorted[0] ?? null
          const obsolete = sorted.slice(1)

          totalDeployments += sorted.length
          totalObsolete += obsolete.length

          return {
            name: projectName,
            totalDeployments: sorted.length,
            latestDeployment: latest
              ? {
                  id: String(latest.id ?? ''),
                  created_on: String(latest.created_on ?? ''),
                  environment: String(latest.environment ?? ''),
                  url: String(latest.url ?? ''),
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

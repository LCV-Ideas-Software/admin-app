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

const TARGET_BRANCHES = new Set(['production', 'main', 'preview'])

const getDeploymentBranch = (deployment: {
  deployment_trigger?: { metadata?: { branch?: string; commit_ref?: string } }
}) => {
  const byBranch = String(deployment.deployment_trigger?.metadata?.branch ?? '').trim().toLowerCase()
  if (byBranch) {
    return byBranch
  }

  const byCommitRef = String(deployment.deployment_trigger?.metadata?.commit_ref ?? '').trim().toLowerCase()
  return byCommitRef
}

const isInCleanupScope = (deployment: {
  environment?: string
  deployment_trigger?: { metadata?: { branch?: string; commit_ref?: string } }
}) => {
  const environment = String(deployment.environment ?? '').trim().toLowerCase()
  if (environment === 'preview') {
    return true
  }

  const branch = getDeploymentBranch(deployment)
  return TARGET_BRANCHES.has(branch)
}

const resolveMainActiveIds = (
  canonicalId: string,
  deployments: Array<{
    id?: string
    deployment_trigger?: { metadata?: { branch?: string; commit_ref?: string } }
    latest_stage?: { status?: string }
    created_on?: string
  }>,
) => {
  const inMain = deployments.filter((d) => getDeploymentBranch(d) === 'main')
  const protectedIds = new Set<string>()

  if (canonicalId && inMain.some((d) => String(d.id ?? '').trim() === canonicalId)) {
    protectedIds.add(canonicalId)
    return protectedIds
  }

  for (const deployment of inMain) {
    const id = String(deployment.id ?? '').trim()
    if (!id) continue
    if (isActiveStageStatus(String(deployment.latest_stage?.status ?? ''))) {
      protectedIds.add(id)
    }
  }
  if (protectedIds.size > 0) {
    return protectedIds
  }

  const sortedMain = [...inMain].sort((a, b) => {
    const dateA = new Date(a.created_on ?? '').getTime() || 0
    const dateB = new Date(b.created_on ?? '').getTime() || 0
    return dateB - dateA
  })
  const fallbackMainId = String(sortedMain[0]?.id ?? '').trim()
  if (fallbackMainId) {
    protectedIds.add(fallbackMainId)
  }

  return protectedIds
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

          // Escopo de governança: branches main/production/preview (inclui environment preview).
          const scopedDeployments = sorted.filter((d) => isInCleanupScope(d))

          // O deployment ativo de produção vem do canonical_deployment do projeto.
          const canonicalDeploymentId = String(projectDetails?.canonical_deployment?.id ?? '').trim()

          // Regra de proteção: preservar somente o deployment ativo do branch main.
          const protectedIds = resolveMainActiveIds(canonicalDeploymentId, scopedDeployments)

          // Exibe o deployment ativo protegido no painel.
          const activeForDisplayId = Array.from(protectedIds)[0] ?? ''
          const latestForDisplay = activeForDisplayId
            ? scopedDeployments.find(d => String(d.id) === activeForDisplayId) ?? scopedDeployments[0] ?? null
            : scopedDeployments[0] ?? null

          // Obsoletos = tudo que NÃO é o ativo do branch main.
          // Fail-safe: se não identificou ativo do main, não expurga esse projeto.
          const obsolete = protectedIds.size > 0
            ? scopedDeployments.filter(d => !protectedIds.has(String(d.id ?? '')))
            : []

          totalDeployments += scopedDeployments.length
          totalObsolete += obsolete.length

          return {
            name: projectName,
            totalDeployments: scopedDeployments.length,
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

      const target = deployments.find((d) => String(d.id ?? '').trim() === deploymentId)
      if (!target) {
        return jsonResponse({
          error: `Deployment ${deploymentId} não encontrado no projeto ${projectName}.`,
          ok: false,
        }, 404)
      }

      if (!isInCleanupScope(target)) {
        return jsonResponse({
          error: `Deployment ${deploymentId} fora do escopo de expurgo (somente branches main/production/preview).`,
          ok: false,
        }, 403)
      }

      const canonicalId = String(project?.canonical_deployment?.id ?? '').trim()

      const scopedDeployments = deployments.filter((d) => isInCleanupScope(d))
      const protectedActiveIds = resolveMainActiveIds(canonicalId, scopedDeployments)

      if (protectedActiveIds.size === 0) {
        return jsonResponse({
          error: `Não foi possível identificar o deployment ativo do branch main para ${projectName}. Exclusão bloqueada por segurança.`,
          ok: false,
        }, 503)
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

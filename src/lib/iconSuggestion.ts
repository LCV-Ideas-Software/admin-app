/**
 * iconSuggestion.ts
 *
 * Engine semântica de sugestão de ícones (emoji) para cards de hub.
 * Identifica o contexto do card a partir de nome + descrição e retorna
 * o emoji mais semanticamente adequado.
 *
 * Algoritmo: keyword matching ponderado por comprimento (match mais longo = mais específico).
 * Sem dependências externas.
 */

type IconRule = {
  keywords: string[]
  icon: string
}

/**
 * Regras de mapeamento semântico keyword → emoji.
 * Ordem dentro de cada array de keywords não importa — o algoritmo premia
 * o match mais longo (mais específico) independentemente da posição na lista.
 */
const ICON_RULES: IconRule[] = [
  // ── Pagamentos & Financeiro ──────────────────────────────────────────────
  { keywords: ['mercado pago', 'mercadopago'], icon: '💳' },
  { keywords: ['sumup', 'maquininha', 'point of sale', 'pos terminal'], icon: '💳' },
  { keywords: ['boleto', 'boleto bancario', 'cobranca', 'billing'], icon: '🧾' },
  { keywords: ['nota fiscal', 'nfe', 'nfce', 'danfe', 'xml fiscal'], icon: '🧾' },
  { keywords: ['recibo', 'receipt', 'comprovante', 'voucher'], icon: '🧾' },
  { keywords: ['transferencia', 'transfer', 'remessa', 'remittance', 'ted', 'doc', 'pix'], icon: '💸' },
  { keywords: ['pagamento', 'payment', 'pagar', 'checkout', 'pay'], icon: '💳' },
  { keywords: ['cartao', 'card', 'credito', 'debito', 'credit card', 'debit card'], icon: '💳' },
  { keywords: ['wallet', 'carteira', 'carteira digital'], icon: '👛' },
  { keywords: ['investimento', 'investment', 'acao', 'stock', 'fundo de investimento', 'portfolio', 'renda variavel', 'renda fixa'], icon: '📈' },
  { keywords: ['orcamento', 'budget', 'previsao orcamentaria', 'planejamento financeiro'], icon: '📋' },
  { keywords: ['custo', 'cost', 'despesa', 'expense', 'gasto', 'spending'], icon: '💸' },
  { keywords: ['receita', 'revenue', 'faturamento', 'billing revenue'], icon: '💰' },
  { keywords: ['financeiro', 'financial', 'financas', 'finance', 'dinheiro', 'money', 'cash', 'moeda'], icon: '💰' },
  { keywords: ['itau', 'bradesco', 'santander', 'nubank', 'inter', 'c6 bank', 'caixa economica', 'banco do brasil'], icon: '🏦' },
  { keywords: ['banco', 'bank', 'bancario', 'banking', 'caixa'], icon: '🏦' },
  { keywords: ['cambio', 'exchange', 'taxa de cambio', 'cotacao', 'dolar', 'euro', 'libra', 'currency'], icon: '💱' },
  { keywords: ['calculadora', 'calculator', 'calculo', 'formula', 'matematica', 'math'], icon: '🧮' },
  { keywords: ['assinatura', 'subscription', 'plano', 'plan', 'licenca', 'license', 'mensalidade'], icon: '📋' },

  // ── IA / Machine Learning ────────────────────────────────────────────────
  { keywords: ['inteligencia artificial', 'artificial intelligence', 'machine learning', 'deep learning', 'neural network', 'rede neural'], icon: '🤖' },
  { keywords: ['gemini', 'openai', 'chatgpt', 'gpt', 'claude', 'llm', 'large language model', 'generative ai', 'ia generativa'], icon: '🤖' },
  { keywords: ['chatbot', 'bot', 'assistente virtual', 'virtual assistant', 'agente ia', 'agent ai'], icon: '🤖' },
  { keywords: ['cerebro', 'brain', 'cognitivo', 'cognitive', 'inteligente', 'inteligencia'], icon: '🧠' },
  { keywords: ['previsao', 'prediction', 'forecast', 'analise preditiva', 'predictive'], icon: '🔮' },
  { keywords: ['oraculo', 'oracle'], icon: '🔮' },

  // ── Astrologia / Esotérico / Cosmos ─────────────────────────────────────
  { keywords: ['mapa astral', 'astrologia', 'astrology', 'horoscopo', 'horoscope', 'signo', 'zodiac', 'zodiaco'], icon: '⭐' },
  { keywords: ['astrologo', 'astrologer', 'carta natal', 'birth chart'], icon: '⭐' },
  { keywords: ['galaxia', 'galaxy', 'universo', 'universe', 'cosmos', 'espaco sideral', 'cosmo'], icon: '🌌' },
  { keywords: ['planeta', 'planet', 'astronomia', 'astronomy', 'telescopio'], icon: '🪐' },
  { keywords: ['lua', 'moon', 'lunar', 'fase da lua'], icon: '🌙' },
  { keywords: ['sol', 'sun', 'solar', 'solsticio'], icon: '☀️' },
  { keywords: ['estrela', 'star', 'constelacao', 'constellation'], icon: '✨' },
  { keywords: ['tarot', 'tattwa', 'tatwa', 'mistico', 'mystical', 'esoterico', 'esoteric', 'magia', 'magic', 'feitico', 'spell'], icon: '🔮' },
  { keywords: ['meditacao', 'meditation', 'espiritualidade', 'spirituality', 'chakra', 'energia'], icon: '🧘' },

  // ── Segurança / Autenticação ─────────────────────────────────────────────
  { keywords: ['cloudflare access', 'zero trust', 'sso', 'single sign on', 'saml', 'oauth', 'oidc'], icon: '🔐' },
  { keywords: ['autenticacao', 'authentication', 'autenticar', '2fa', 'mfa', 'segundo fator', 'two factor', 'otp'], icon: '🔐' },
  { keywords: ['seguranca', 'security', 'protecao', 'protection', 'acesso', 'access', 'login'], icon: '🔐' },
  { keywords: ['senha', 'password', 'secret', 'credencial', 'credential', 'vault'], icon: '🔑' },
  { keywords: ['chave api', 'api key', 'token', 'jwt', 'bearer'], icon: '🔑' },
  { keywords: ['chave', 'key'], icon: '🔑' },
  { keywords: ['bloqueio', 'lock', 'locked', 'cadeado', 'privado', 'private'], icon: '🔒' },
  { keywords: ['firewall', 'antivirus', 'malware', 'ameaca', 'threat', 'vulnerabilidade', 'vulnerability'], icon: '🛡️' },
  { keywords: ['compliance', 'conformidade', 'lgpd', 'gdpr', 'pci dss', 'iso 27001', 'regulamentacao', 'regulation'], icon: '⚖️' },

  // ── DNS / Entregabilidade de Email ───────────────────────────────────────
  { keywords: ['mta-sts', 'mtasts', 'mta sts', 'smtp tls', 'tls reporting', 'tlsrpt', 'tls-rpt'], icon: '📨' },
  { keywords: ['dmarc', 'dkim', 'spf', 'mx record', 'registro mx', 'email deliverability', 'entregabilidade', 'antispam', 'reputacao de email'], icon: '📨' },
  { keywords: ['dns', 'nameserver', 'zona dns', 'registro dns', 'cname', 'a record', 'txt record'], icon: '🌐' },
  { keywords: ['dominio', 'domain', 'subdominio', 'subdomain', 'hostname'], icon: '🌐' },
  { keywords: ['certificado ssl', 'ssl', 'tls', 'https', 'certificado digital', 'certificate'], icon: '📜' },

  // ── Email / Comunicação ──────────────────────────────────────────────────
  { keywords: ['campanha de email', 'email marketing', 'newsletter', 'mailing'], icon: '📣' },
  { keywords: ['email', 'e-mail', 'correio eletronico', 'inbox', 'caixa de entrada', 'resend', 'sendgrid', 'mailgun'], icon: '📧' },
  { keywords: ['notificacao', 'notification', 'alerta', 'alert', 'aviso', 'push notification'], icon: '🔔' },
  { keywords: ['chat', 'conversa', 'conversation', 'mensagem instantanea', 'whatsapp', 'telegram', 'slack'], icon: '💬' },
  { keywords: ['sms', 'mensagem de texto', 'text message'], icon: '💬' },
  { keywords: ['telefone', 'phone', 'ligacao', 'call', 'celular', 'mobile', 'voip'], icon: '📱' },
  { keywords: ['suporte', 'support', 'helpdesk', 'help desk', 'atendimento ao cliente', 'customer support', 'ticket', 'chamado'], icon: '🆘' },
  { keywords: ['fale conosco', 'contact us', 'contato', 'contact form', 'formulario de contato'], icon: '📩' },

  // ── Analytics / Relatórios ───────────────────────────────────────────────
  { keywords: ['google analytics', 'matomo', 'plausible', 'mixpanel', 'web analytics'], icon: '📊' },
  { keywords: ['relatorio', 'report', 'analytics', 'analise', 'analysis', 'metrica', 'metric', 'kpi', 'dado', 'data', 'estatistica', 'statistics', 'monitoramento', 'monitoring'], icon: '📊' },
  { keywords: ['auditoria', 'audit', 'log de acesso', 'access log', 'trilha', 'trail', 'historico', 'history'], icon: '📋' },
  { keywords: ['grafico de crescimento', 'growth chart', 'tendencia de alta', 'uptrend', 'crescimento', 'growth'], icon: '📈' },
  { keywords: ['queda', 'decline', 'reducao', 'downtrend'], icon: '📉' },

  // ── Configurações / DevOps ───────────────────────────────────────────────
  { keywords: ['configuracao', 'configuration', 'config', 'configurar', 'preferencias', 'preferences', 'settings'], icon: '⚙️' },
  { keywords: ['integracao', 'integration', 'webhook', 'api gateway', 'conector', 'connector', 'conexao', 'connection'], icon: '🔌' },
  { keywords: ['api rest', 'api', 'rest api', 'graphql', 'endpoint'], icon: '🔌' },
  { keywords: ['ferramenta', 'tool', 'utilitario', 'utility', 'toolkit'], icon: '🔧' },
  { keywords: ['deploy', 'deployment', 'release', 'publicar', 'publish'], icon: '🚀' },
  { keywords: ['pipeline', 'ci cd', 'github actions', 'build', 'continuous integration', 'continuous deployment'], icon: '🚀' },
  { keywords: ['cloudflare', 'cloudflare pages', 'cloudflare workers', 'cloudflare d1'], icon: '☁️' },
  { keywords: ['cloud', 'nuvem', 'aws', 'azure', 'gcp', 'google cloud'], icon: '☁️' },
  { keywords: ['banco de dados', 'database', 'db', 'sql', 'mysql', 'postgres', 'postgresql', 'sqlite', 'd1', 'r2'], icon: '🗄️' },
  { keywords: ['backup', 'copia de seguranca', 'restauracao', 'restore', 'snapshot'], icon: '💾' },
  { keywords: ['cache', 'redis', 'kv store', 'key value'], icon: '⚡' },
  { keywords: ['fila', 'queue', 'worker', 'job', 'tarefa em segundo plano', 'background task'], icon: '⚙️' },
  { keywords: ['container', 'docker', 'kubernetes', 'k8s', 'microservico', 'microservice'], icon: '📦' },

  // ── Conteúdo / Documentos ────────────────────────────────────────────────
  { keywords: ['contrato', 'contract', 'acordo', 'agreement', 'termo', 'term'], icon: '📃' },
  { keywords: ['documento', 'document', 'arquivo', 'file', 'pdf', 'planilha', 'spreadsheet'], icon: '📄' },
  { keywords: ['wiki', 'documentacao', 'documentation', 'knowledge base', 'base de conhecimento'], icon: '📚' },
  { keywords: ['artigo', 'article', 'post', 'blog', 'conteudo', 'content', 'publicacao', 'publication'], icon: '📝' },
  { keywords: ['pagina inicial', 'home page', 'landing page', 'site'], icon: '🏠' },
  { keywords: ['imagem', 'image', 'foto', 'photo', 'galeria', 'gallery', 'media', 'midia'], icon: '🖼️' },
  { keywords: ['video', 'vídeo', 'filme', 'stream', 'streaming', 'youtube', 'vimeo'], icon: '🎥' },
  { keywords: ['podcast', 'audio', 'musica', 'music'], icon: '🎵' },

  // ── Admin / Gestão ───────────────────────────────────────────────────────
  { keywords: ['painel administrativo', 'admin panel', 'control panel', 'painel de controle', 'backoffice', 'back office'], icon: '🏢' },
  { keywords: ['dashboard', 'painel', 'visao geral', 'overview'], icon: '🖥️' },
  { keywords: ['admin', 'administracao', 'administration', 'gestao', 'management', 'gerenciamento'], icon: '🏢' },
  { keywords: ['usuario', 'user', 'perfil', 'profile', 'conta', 'account'], icon: '👤' },
  { keywords: ['equipe', 'team', 'grupo', 'group', 'colaboradores', 'colaboration', 'membro', 'member'], icon: '👥' },
  { keywords: ['permissao', 'permission', 'role', 'cargo', 'nivel de acesso', 'access level', 'privilegio'], icon: '🎖️' },
  { keywords: ['empresa', 'company', 'organizacao', 'organization', 'negocio', 'business', 'corporativo', 'corporate'], icon: '🏢' },
  { keywords: ['parceiro', 'partner', 'parceria', 'partnership', 'afiliado', 'affiliate'], icon: '🤝' },
  { keywords: ['premio', 'award', 'conquista', 'achievement', 'certificacao', 'certification', 'medalha', 'medal'], icon: '🏆' },
  { keywords: ['campanha', 'campaign', 'marketing'], icon: '📣' },

  // ── Comércio / Loja ──────────────────────────────────────────────────────
  { keywords: ['ecommerce', 'e-commerce', 'loja virtual', 'online store', 'marketplace'], icon: '🛒' },
  { keywords: ['loja', 'shop', 'store', 'produto', 'product', 'catalogo', 'catalog', 'estoque', 'inventory'], icon: '🛒' },
  { keywords: ['venda', 'sale', 'vender', 'sell', 'comercio', 'commerce'], icon: '🏪' },
  { keywords: ['desconto', 'discount', 'cupom', 'coupon', 'promocao', 'promotion', 'oferta', 'offer'], icon: '🏷️' },
  { keywords: ['frete', 'shipping', 'entrega', 'delivery', 'logistica', 'logistics'], icon: '🚚' },

  // ── Localização / Mapas ──────────────────────────────────────────────────
  { keywords: ['mapa', 'map', 'localizacao', 'location', 'endereco', 'address', 'gps', 'geolocation'], icon: '📍' },
  { keywords: ['pais', 'country', 'global', 'mundial', 'worldwide', 'internacional', 'international'], icon: '🌍' },

  // ── Social / Compartilhamento ─────────────────────────────────────────────
  { keywords: ['redes sociais', 'social media', 'instagram', 'facebook', 'twitter', 'linkedin', 'tiktok', 'youtube'], icon: '📣' },
  { keywords: ['compartilhar', 'share', 'publicar', 'divulgar', 'viralizar'], icon: '🔗' },
  { keywords: ['favorito', 'favorite', 'bookmark', 'marcador', 'curtida', 'like'], icon: '⭐' },

  // ── Calendário / Tempo ───────────────────────────────────────────────────
  { keywords: ['calendario', 'calendar', 'agenda', 'schedule', 'evento', 'event', 'prazo', 'deadline'], icon: '📅' },
  { keywords: ['relogio', 'clock', 'timer', 'temporizador', 'delay', 'atraso', 'timestamp'], icon: '⏰' },

  // ── Desenvolvimento de Software ──────────────────────────────────────────
  { keywords: ['desenvolvimento', 'development', 'programacao', 'programming', 'codigo', 'code', 'software development'], icon: '💻' },
  { keywords: ['teste', 'test', 'testing', 'qa', 'qualidade', 'quality assurance', 'debug'], icon: '🧪' },
  { keywords: ['repositorio', 'repository', 'github', 'gitlab', 'bitbucket', 'git'], icon: '💻' },
  { keywords: ['extensao', 'extension', 'plugin', 'addon', 'add-on'], icon: '🧩' },

  // ── Hub / Portal / Principal ─────────────────────────────────────────────
  { keywords: ['hub central', 'app hub', 'apphub', 'portal de apps', 'central de apps'], icon: '🏠' },
  { keywords: ['adminhub', 'admin hub', 'hub administrativo', 'central administrativa'], icon: '🏢' },
  { keywords: ['mainsite', 'site principal', 'main site', 'website principal'], icon: '🌐' },
  { keywords: ['portal', 'hub', 'central', 'home', 'inicio', 'main', 'principal'], icon: '🏠' },
  { keywords: ['app', 'aplicativo', 'application', 'sistema', 'system', 'plataforma', 'platform'], icon: '💻' },
]

/**
 * Normaliza texto para comparação: lowercase, remove diacríticos e caracteres especiais.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-z0-9\s]/g, ' ')   // non-alphanumeric → space
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Sugere um emoji semanticamente adequado com base no nome e descrição de um card.
 *
 * Retorna string vazia se não houver correspondência.
 *
 * @param name - Nome do card
 * @param description - Descrição do card (opcional)
 * @returns emoji string ou '' se sem sugestão
 */
export function suggestIcon(name: string, description = ''): string {
  const combined = normalize(`${name} ${description}`)
  if (!combined) return ''

  let bestIcon = ''
  let bestScore = 0

  for (const rule of ICON_RULES) {
    for (const keyword of rule.keywords) {
      const normalizedKw = normalize(keyword)
      if (normalizedKw && combined.includes(normalizedKw)) {
        // Keyword mais longa = mais específica = score maior
        const score = normalizedKw.length
        if (score > bestScore) {
          bestScore = score
          bestIcon = rule.icon
        }
      }
    }
  }

  return bestIcon
}

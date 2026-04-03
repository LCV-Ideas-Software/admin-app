/// <reference types="@cloudflare/workers-types" />


/**
 * /api/news/discover — Pages Function
 *
 * Motor inteligente de descoberta de fontes RSS com 3 camadas:
 * 1. LOCAL: banco curado de ~150 feeds conhecidos (instantâneo)
 * 2. GOOGLE NEWS: geração de feed RSS via news.google.com/rss/search
 * 3. GEMINI AI: consulta ao gemini-2.5-flash para descobrir feeds reais
 *
 * Parâmetros:
 * - q (string): Termo de busca
 * - field (name|url|category): Qual campo originou a busca
 *
 * A camada Gemini é opcional — funciona apenas se GEMINI_API_KEY estiver configurada.
 */

interface Env {
  BIGDATA_DB: D1Database
  GEMINI_API_KEY?: string
}

interface D1Binding {
  prepare(query: string): { bind(...values: unknown[]): { run(): Promise<unknown> } }
}

interface RssSuggestion {
  id: string
  name: string
  url: string
  category: string
  /** Origem da sugestão: curated | google-news | gemini-ai | auto-detect */
  source: 'curated' | 'google-news' | 'gemini-ai' | 'auto-detect'
}

// ── Banco curado (~150 fontes) ──────────────────────────
// Espelhado de src/lib/rssDirectory.ts — Pages Functions não conseguem importar de src/
interface DirectoryEntry {
  id: string; name: string; url: string; category: string; tags: string[]
}

const DIRECTORY: DirectoryEntry[] = [
  // Brasil — Geral
  { id: 'g1',               name: 'G1',                         url: 'https://g1.globo.com/rss/g1/',                                      category: 'Brasil',         tags: ['globo', 'brasil', 'notícias', 'geral'] },
  { id: 'folha',            name: 'Folha de S.Paulo',           url: 'https://feeds.folha.uol.com.br/emcimadahora/rss091.xml',             category: 'Brasil',         tags: ['folha', 'são paulo', 'jornal', 'brasil'] },
  { id: 'uol',              name: 'UOL Notícias',               url: 'https://rss.uol.com.br/feed/noticias.xml',                           category: 'Brasil',         tags: ['uol', 'notícias', 'brasil'] },
  { id: 'estadao',          name: 'Estadão',                    url: 'https://www.estadao.com.br/arc/outboundfeeds/rss/',                  category: 'Brasil',         tags: ['estadão', 'estado', 'são paulo', 'jornal'] },
  { id: 'cnn-brasil',       name: 'CNN Brasil',                 url: 'https://www.cnnbrasil.com.br/feed/',                                 category: 'Brasil',         tags: ['cnn', 'brasil', 'notícias', 'tv'] },
  { id: 'r7',               name: 'R7',                         url: 'https://noticias.r7.com/feed.xml',                                   category: 'Brasil',         tags: ['r7', 'record', 'notícias', 'geral'] },
  { id: 'band',             name: 'Band News',                  url: 'https://www.band.uol.com.br/rss/noticias.xml',                       category: 'Brasil',         tags: ['band', 'bandeirantes', 'notícias'] },
  { id: 'agencia-brasil',   name: 'Agência Brasil',             url: 'https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml',       category: 'Brasil',         tags: ['ebc', 'governo', 'agência', 'oficial'] },
  { id: 'terra',            name: 'Terra',                      url: 'https://www.terra.com.br/rss/',                                      category: 'Brasil',         tags: ['terra', 'portal', 'notícias'] },
  { id: 'metropoles',       name: 'Metrópoles',                 url: 'https://www.metropoles.com/feed',                                    category: 'Brasil',         tags: ['metrópoles', 'brasília', 'notícias', 'política'] },
  { id: 'poder360',         name: 'Poder360',                   url: 'https://www.poder360.com.br/feed/',                                  category: 'Brasil',         tags: ['poder360', 'política', 'brasília', 'governo'] },
  { id: 'correio-braziliense', name: 'Correio Braziliense',     url: 'https://www.correiobraziliense.com.br/arc/outboundfeeds/rss/',       category: 'Brasil',         tags: ['correio', 'braziliense', 'brasília', 'df'] },
  { id: 'ig',               name: 'iG',                         url: 'https://ultimosegundo.ig.com.br/rss.xml',                            category: 'Brasil',         tags: ['ig', 'último segundo', 'notícias'] },
  { id: 'carta-capital',    name: 'CartaCapital',               url: 'https://www.cartacapital.com.br/feed/',                              category: 'Brasil',         tags: ['carta capital', 'opinião', 'política', 'análise'] },
  { id: 'nexo',             name: 'Nexo Jornal',                url: 'https://www.nexojornal.com.br/feed/',                                category: 'Brasil',         tags: ['nexo', 'jornal', 'análise', 'explicação'] },
  { id: 'intercept',        name: 'The Intercept Brasil',       url: 'https://theintercept.com/brasil/feed/',                              category: 'Brasil',         tags: ['intercept', 'investigação', 'jornalismo'] },
  { id: 'bbc-brasil',       name: 'BBC Brasil',                 url: 'https://www.bbc.com/portuguese/index.xml',                           category: 'Brasil',         tags: ['bbc', 'internacional', 'mundo', 'londres', 'brasil'] },
  { id: 'dw-brasil',        name: 'DW Brasil',                  url: 'https://rss.dw.com/rdf/rss-br',                                      category: 'Brasil',         tags: ['dw', 'alemanha', 'brasil', 'portuguese'] },
  { id: 'huffpost-br',      name: 'HuffPost Brasil',            url: 'https://www.huffpostbrasil.com/feeds/index.xml',                     category: 'Brasil',         tags: ['huffpost', 'huffington', 'brasil'] },
  // Política
  { id: 'g1-politica',      name: 'G1 Política',                url: 'https://g1.globo.com/rss/g1/politica/',                              category: 'Política',       tags: ['globo', 'política', 'governo', 'congresso'] },
  { id: 'folha-poder',      name: 'Folha Poder',                url: 'https://feeds.folha.uol.com.br/poder/rss091.xml',                    category: 'Política',       tags: ['folha', 'política', 'poder', 'governo'] },
  { id: 'congresso-foco',   name: 'Congresso em Foco',          url: 'https://congressoemfoco.uol.com.br/feed/',                           category: 'Política',       tags: ['congresso', 'senado', 'câmara', 'deputados'] },
  { id: 'jota',             name: 'JOTA',                       url: 'https://www.jota.info/feed/',                                        category: 'Política',       tags: ['jota', 'jurídico', 'stf', 'legislação', 'direito'] },
  // Economia
  { id: 'g1-economia',      name: 'G1 Economia',                url: 'https://g1.globo.com/rss/g1/economia/',                              category: 'Economia',       tags: ['globo', 'economia', 'mercado', 'finanças'] },
  { id: 'folha-mercado',    name: 'Folha Mercado',              url: 'https://feeds.folha.uol.com.br/mercado/rss091.xml',                  category: 'Economia',       tags: ['folha', 'mercado', 'economia', 'bolsa'] },
  { id: 'valor-economico',  name: 'Valor Econômico',            url: 'https://pox.globo.com/rss/valor/',                                   category: 'Economia',       tags: ['valor', 'econômico', 'finanças', 'mercado', 'bolsa'] },
  { id: 'infomoney',        name: 'InfoMoney',                  url: 'https://www.infomoney.com.br/feed/',                                 category: 'Economia',       tags: ['infomoney', 'investimentos', 'bolsa', 'finanças', 'ações'] },
  { id: 'exame',            name: 'Exame',                      url: 'https://exame.com/feed/',                                            category: 'Economia',       tags: ['exame', 'negócios', 'economia', 'empresas'] },
  { id: 'investing',        name: 'Investing.com BR',           url: 'https://br.investing.com/rss/news.rss',                              category: 'Economia',       tags: ['investing', 'câmbio', 'ações', 'bolsa', 'mercado'] },
  { id: 'bloomberg',        name: 'Bloomberg',                  url: 'https://feeds.bloomberg.com/markets/news.rss',                       category: 'Economia',       tags: ['bloomberg', 'markets', 'finance', 'stocks'] },
  { id: 'cnbc',             name: 'CNBC',                       url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114', category: 'Economia', tags: ['cnbc', 'finance', 'markets', 'economy'] },
  { id: 'bloomberg-linea',  name: 'Bloomberg Línea Brasil',     url: 'https://www.bloomberglinea.com.br/feed/',                            category: 'Economia',       tags: ['bloomberg', 'línea', 'brasil', 'economia', 'latam'] },
  { id: 'money-times',      name: 'Money Times',                url: 'https://www.moneytimes.com.br/feed/',                                category: 'Economia',       tags: ['money', 'times', 'investimentos', 'mercado'] },
  { id: 'seu-dinheiro',     name: 'Seu Dinheiro',               url: 'https://www.seudinheiro.com/feed/',                                  category: 'Economia',       tags: ['dinheiro', 'finanças pessoais', 'investimentos'] },
  { id: 'sunoresearch',     name: 'Suno Research',              url: 'https://www.suno.com.br/noticias/feed/',                             category: 'Economia',       tags: ['suno', 'research', 'dividendos', 'fiis', 'ações'] },
  { id: 'forbes-br',        name: 'Forbes Brasil',              url: 'https://forbes.com.br/feed/',                                        category: 'Economia',       tags: ['forbes', 'bilionários', 'negócios', 'empreendedorismo'] },
  { id: 'ft',               name: 'Financial Times',            url: 'https://www.ft.com/?format=rss',                                     category: 'Economia',       tags: ['ft', 'financial times', 'finance', 'world'] },
  { id: 'wsj',              name: 'Wall Street Journal',        url: 'https://feeds.a.dj.com/rss/RSSWorldNews.xml',                        category: 'Economia',       tags: ['wsj', 'wall street', 'finance', 'markets'] },
  { id: 'economist',        name: 'The Economist',              url: 'https://www.economist.com/latest/rss.xml',                           category: 'Economia',       tags: ['economist', 'economics', 'finance', 'world'] },
  { id: 'marketwatch',      name: 'MarketWatch',                url: 'https://feeds.marketwatch.com/marketwatch/topstories/',               category: 'Economia',       tags: ['marketwatch', 'stocks', 'markets', 'finance'] },
  // Tecnologia
  { id: 'g1-tecnologia',    name: 'G1 Tecnologia',              url: 'https://g1.globo.com/rss/g1/tecnologia/',                            category: 'Tecnologia',     tags: ['globo', 'tecnologia', 'tech', 'gadgets'] },
  { id: 'folha-tec',        name: 'Folha Tec',                  url: 'https://feeds.folha.uol.com.br/tec/rss091.xml',                      category: 'Tecnologia',     tags: ['folha', 'tecnologia', 'tech'] },
  { id: 'tecmundo',         name: 'TecMundo',                   url: 'https://rss.tecmundo.com.br/feed',                                   category: 'Tecnologia',     tags: ['tecmundo', 'tecnologia', 'gadgets', 'games'] },
  { id: 'olhar-digital',    name: 'Olhar Digital',              url: 'https://olhardigital.com.br/feed/',                                  category: 'Tecnologia',     tags: ['olhar digital', 'tecnologia', 'inovação'] },
  { id: 'canaltech',        name: 'Canaltech',                  url: 'https://canaltech.com.br/rss/',                                      category: 'Tecnologia',     tags: ['canaltech', 'tecnologia', 'software', 'hardware'] },
  { id: 'techcrunch',       name: 'TechCrunch',                 url: 'https://techcrunch.com/feed/',                                       category: 'Tecnologia',     tags: ['techcrunch', 'startups', 'tech', 'silicon valley'] },
  { id: 'theverge',         name: 'The Verge',                  url: 'https://www.theverge.com/rss/index.xml',                             category: 'Tecnologia',     tags: ['verge', 'tech', 'gadgets', 'reviews'] },
  { id: 'arstechnica',      name: 'Ars Technica',               url: 'https://feeds.arstechnica.com/arstechnica/index',                    category: 'Tecnologia',     tags: ['ars', 'technica', 'technology', 'science'] },
  { id: 'wired',            name: 'Wired',                      url: 'https://www.wired.com/feed/rss',                                     category: 'Tecnologia',     tags: ['wired', 'tech', 'innovation', 'future'] },
  { id: 'hackernews',       name: 'Hacker News',                url: 'https://hnrss.org/frontpage',                                        category: 'Tecnologia',     tags: ['hacker news', 'hn', 'ycombinator', 'programming', 'dev'] },
  { id: 'tecnoblog',        name: 'Tecnoblog',                  url: 'https://tecnoblog.net/feed/',                                        category: 'Tecnologia',     tags: ['tecnoblog', 'brasil', 'tecnologia', 'gadgets'] },
  { id: 'engadget',         name: 'Engadget',                   url: 'https://www.engadget.com/rss.xml',                                   category: 'Tecnologia',     tags: ['engadget', 'gadgets', 'reviews', 'tech'] },
  { id: 'mashable',         name: 'Mashable',                   url: 'https://mashable.com/feeds/rss/all',                                 category: 'Tecnologia',     tags: ['mashable', 'social media', 'tech', 'culture'] },
  { id: 'zdnet',            name: 'ZDNet',                      url: 'https://www.zdnet.com/news/rss.xml',                                 category: 'Tecnologia',     tags: ['zdnet', 'enterprise', 'tech', 'software'] },
  { id: 'thenextweb',       name: 'The Next Web',               url: 'https://thenextweb.com/feed/',                                       category: 'Tecnologia',     tags: ['tnw', 'tech', 'startups', 'europe'] },
  { id: 'gizmodo',          name: 'Gizmodo',                    url: 'https://gizmodo.com/feed',                                           category: 'Tecnologia',     tags: ['gizmodo', 'gadgets', 'science', 'design'] },
  { id: 'mit-tech-review',  name: 'MIT Technology Review',      url: 'https://www.technologyreview.com/feed/',                             category: 'Tecnologia',     tags: ['mit', 'technology review', 'ai', 'innovation', 'research'] },
  { id: 'venturebeat',      name: 'VentureBeat',                url: 'https://venturebeat.com/feed/',                                      category: 'Tecnologia',     tags: ['venturebeat', 'ai', 'startups', 'enterprise'] },
  { id: 'techradar',        name: 'TechRadar',                  url: 'https://www.techradar.com/rss',                                      category: 'Tecnologia',     tags: ['techradar', 'reviews', 'gadgets', 'phones'] },
  { id: 'showmetech',       name: 'Showmetech',                 url: 'https://www.showmetech.com.br/feed/',                                category: 'Tecnologia',     tags: ['showmetech', 'brasil', 'reviews', 'smartphones'] },
  { id: 'mundo-conectado',  name: 'Mundo Conectado',            url: 'https://mundoconectado.com.br/feed',                                 category: 'Tecnologia',     tags: ['mundo conectado', 'brasil', 'reviews', 'tech'] },
  { id: 'tudo-celular',     name: 'Tudo Celular',               url: 'https://www.tudocelular.com/feed/',                                  category: 'Tecnologia',     tags: ['tudo celular', 'smartphones', 'celular', 'android', 'iphone'] },
  { id: 'openai-blog',      name: 'OpenAI Blog',                url: 'https://openai.com/blog/rss/',                                      category: 'Tecnologia',     tags: ['openai', 'chatgpt', 'ai', 'inteligência artificial', 'gpt'] },
  { id: 'google-ai-blog',   name: 'Google AI Blog',             url: 'https://blog.google/technology/ai/rss/',                             category: 'Tecnologia',     tags: ['google', 'ai', 'gemini', 'deepmind', 'machine learning'] },
  { id: 'dev-to',           name: 'DEV Community',              url: 'https://dev.to/feed/',                                               category: 'Tecnologia',     tags: ['dev', 'programming', 'desenvolvimento', 'code', 'web'] },
  { id: 'css-tricks',       name: 'CSS-Tricks',                 url: 'https://css-tricks.com/feed/',                                       category: 'Tecnologia',     tags: ['css', 'frontend', 'web', 'design', 'html', 'javascript'] },
  { id: 'smashing',         name: 'Smashing Magazine',          url: 'https://www.smashingmagazine.com/feed/',                             category: 'Tecnologia',     tags: ['smashing', 'web design', 'ux', 'frontend'] },
  // Mundo
  { id: 'g1-mundo',         name: 'G1 Mundo',                   url: 'https://g1.globo.com/rss/g1/mundo/',                                 category: 'Mundo',          tags: ['globo', 'mundo', 'internacional'] },
  { id: 'folha-mundo',      name: 'Folha Mundo',                url: 'https://feeds.folha.uol.com.br/mundo/rss091.xml',                    category: 'Mundo',          tags: ['folha', 'mundo', 'internacional'] },
  { id: 'bbc-news',         name: 'BBC News',                   url: 'https://feeds.bbci.co.uk/news/rss.xml',                              category: 'Mundo',          tags: ['bbc', 'world', 'english', 'news'] },
  { id: 'reuters',          name: 'Reuters',                    url: 'https://www.reutersagency.com/feed/',                                category: 'Mundo',          tags: ['reuters', 'world', 'agência', 'internacional'] },
  { id: 'aljazeera',        name: 'Al Jazeera',                 url: 'https://www.aljazeera.com/xml/rss/all.xml',                          category: 'Mundo',          tags: ['aljazeera', 'middle east', 'mundo', 'internacional'] },
  { id: 'france24',         name: 'France 24',                  url: 'https://www.france24.com/en/rss',                                    category: 'Mundo',          tags: ['france', 'europa', 'france24', 'internacional'] },
  { id: 'nyt',              name: 'The New York Times',         url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml',           category: 'Mundo',          tags: ['nyt', 'new york', 'times', 'eua', 'estados unidos'] },
  { id: 'guardian',         name: 'The Guardian',               url: 'https://www.theguardian.com/world/rss',                              category: 'Mundo',          tags: ['guardian', 'uk', 'england', 'world'] },
  { id: 'cnn',              name: 'CNN International',          url: 'http://rss.cnn.com/rss/edition.rss',                                 category: 'Mundo',          tags: ['cnn', 'eua', 'world', 'international'] },
  { id: 'ap-news',          name: 'Associated Press',           url: 'https://apnews.com/index.rss',                                      category: 'Mundo',          tags: ['ap', 'associated press', 'world', 'agência'] },
  { id: 'nyt-world',        name: 'NYT World',                  url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',             category: 'Mundo',          tags: ['nyt', 'world', 'international', 'global'] },
  { id: 'bbc-world',        name: 'BBC World',                  url: 'https://feeds.bbci.co.uk/news/world/rss.xml',                        category: 'Mundo',          tags: ['bbc', 'world', 'international'] },
  { id: 'guardian-us',      name: 'The Guardian US',            url: 'https://www.theguardian.com/us-news/rss',                            category: 'Mundo',          tags: ['guardian', 'us', 'eua', 'america'] },
  { id: 'el-pais',          name: 'El País',                    url: 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada',   category: 'Mundo',          tags: ['el país', 'espanha', 'spain', 'español'] },
  { id: 'le-monde',         name: 'Le Monde',                   url: 'https://www.lemonde.fr/rss/une.xml',                                 category: 'Mundo',          tags: ['le monde', 'france', 'français'] },
  { id: 'spiegel',          name: 'Der Spiegel',                url: 'https://www.spiegel.de/international/index.rss',                     category: 'Mundo',          tags: ['spiegel', 'germany', 'europe', 'international'] },
  { id: 'japan-times',      name: 'The Japan Times',            url: 'https://www.japantimes.co.jp/feed/',                                 category: 'Mundo',          tags: ['japan', 'asia', 'tokyo', 'japanese'] },
  { id: 'scmp',             name: 'South China Morning Post',   url: 'https://www.scmp.com/rss/91/feed',                                   category: 'Mundo',          tags: ['scmp', 'china', 'hong kong', 'asia'] },
  // Esportes
  { id: 'ge',               name: 'ge (Globo Esporte)',         url: 'https://ge.globo.com/rss/ge/',                                       category: 'Esportes',       tags: ['ge', 'globo esporte', 'futebol', 'esportes'] },
  { id: 'folha-esporte',    name: 'Folha Esporte',              url: 'https://feeds.folha.uol.com.br/esporte/rss091.xml',                  category: 'Esportes',       tags: ['folha', 'esporte', 'futebol'] },
  { id: 'lance',            name: 'Lance!',                     url: 'https://www.lance.com.br/feed/',                                     category: 'Esportes',       tags: ['lance', 'futebol', 'esporte'] },
  { id: 'uol-esporte',      name: 'UOL Esporte',               url: 'https://rss.uol.com.br/feed/esporte.xml',                            category: 'Esportes',       tags: ['uol', 'esporte', 'futebol'] },
  { id: 'espn-br',          name: 'ESPN Brasil',                url: 'https://www.espn.com.br/espn/rss/noticias',                          category: 'Esportes',       tags: ['espn', 'esportes', 'futebol', 'nba', 'nfl'] },
  { id: 'tnt-sports',       name: 'TNT Sports',                 url: 'https://www.tntsports.com.br/feed/',                                 category: 'Esportes',       tags: ['tnt', 'sports', 'champions league', 'futebol'] },
  { id: 'terceiro-tempo',   name: 'Terceiro Tempo',             url: 'https://terceirotempo.uol.com.br/feed/',                             category: 'Esportes',       tags: ['terceiro tempo', 'futebol', 'história'] },
  { id: 'bbc-sport',        name: 'BBC Sport',                  url: 'https://feeds.bbci.co.uk/sport/rss.xml',                             category: 'Esportes',       tags: ['bbc', 'sport', 'football', 'soccer', 'premier league'] },
  { id: 'espn',             name: 'ESPN',                       url: 'https://www.espn.com/espn/rss/news',                                 category: 'Esportes',       tags: ['espn', 'sports', 'nba', 'nfl', 'mlb'] },
  { id: 'skysports',        name: 'Sky Sports',                 url: 'https://www.skysports.com/rss/12040',                                category: 'Esportes',       tags: ['sky', 'sports', 'premier league', 'football'] },
  { id: 'ge-futebol',       name: 'ge Futebol',                 url: 'https://ge.globo.com/rss/ge/futebol/',                               category: 'Esportes',       tags: ['ge', 'futebol', 'brasileirão', 'copa'] },
  { id: 'ge-f1',            name: 'ge Fórmula 1',              url: 'https://ge.globo.com/rss/ge/motor/formula-1/',                        category: 'Esportes',       tags: ['ge', 'formula 1', 'f1', 'automobilismo', 'corrida'] },
  { id: 'surfe-globo',      name: 'ge Surfe',                   url: 'https://ge.globo.com/rss/ge/surfe/',                                 category: 'Esportes',       tags: ['surfe', 'surf', 'wsl', 'ondas'] },
  // Ciência
  { id: 'g1-ciencia',       name: 'G1 Ciência e Saúde',         url: 'https://g1.globo.com/rss/g1/ciencia-e-saude/',                       category: 'Ciência',        tags: ['globo', 'ciência', 'saúde', 'pesquisa'] },
  { id: 'nature',           name: 'Nature',                     url: 'https://www.nature.com/nature.rss',                                  category: 'Ciência',        tags: ['nature', 'science', 'research', 'papers'] },
  { id: 'sciencedaily',     name: 'ScienceDaily',               url: 'https://www.sciencedaily.com/rss/all.xml',                           category: 'Ciência',        tags: ['science', 'daily', 'research', 'discovery'] },
  { id: 'nasa',             name: 'NASA',                       url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss',                     category: 'Ciência',        tags: ['nasa', 'space', 'espaço', 'astronomia'] },
  { id: 'superinteressante', name: 'Superinteressante',         url: 'https://super.abril.com.br/feed/',                                   category: 'Ciência',        tags: ['super', 'interessante', 'ciência', 'curiosidades'] },
  { id: 'science-mag',      name: 'Science Magazine',           url: 'https://www.science.org/rss/news_current.xml',                       category: 'Ciência',        tags: ['science', 'magazine', 'research', 'papers'] },
  { id: 'new-scientist',    name: 'New Scientist',              url: 'https://www.newscientist.com/feed/home/',                            category: 'Ciência',        tags: ['new scientist', 'science', 'discovery'] },
  { id: 'space-com',        name: 'Space.com',                  url: 'https://www.space.com/feeds/all',                                    category: 'Ciência',        tags: ['space', 'astronomy', 'espaço', 'universe'] },
  { id: 'phys-org',         name: 'Phys.org',                   url: 'https://phys.org/rss-feed/',                                         category: 'Ciência',        tags: ['physics', 'technology', 'science', 'research'] },
  { id: 'nat-geo',          name: 'National Geographic',        url: 'https://www.nationalgeographic.com/feed/',                           category: 'Ciência',        tags: ['nat geo', 'national geographic', 'natureza', 'animais'] },
  { id: 'galileu',          name: 'Galileu',                    url: 'https://revistagalileu.globo.com/feed/',                             category: 'Ciência',        tags: ['galileu', 'ciência', 'tecnologia', 'brasil'] },
  { id: 'science-alert',    name: 'ScienceAlert',               url: 'https://www.sciencealert.com/feed',                                  category: 'Ciência',        tags: ['sciencealert', 'science', 'discovery', 'space'] },
  { id: 'eso',              name: 'ESO (Observatório Europeu)', url: 'https://www.eso.org/public/news/feed/',                              category: 'Ciência',        tags: ['eso', 'astronomy', 'telescope', 'europe'] },
  // Entretenimento
  { id: 'omelete',          name: 'Omelete',                    url: 'https://www.omelete.com.br/rss',                                     category: 'Entretenimento', tags: ['omelete', 'cinema', 'séries', 'filmes', 'games', 'hq'] },
  { id: 'adoro-cinema',     name: 'AdoroCinema',                url: 'https://www.adorocinema.com/rss/',                                   category: 'Entretenimento', tags: ['cinema', 'filmes', 'séries', 'críticas'] },
  { id: 'ign-br',           name: 'IGN Brasil',                 url: 'https://br.ign.com/feed.xml',                                        category: 'Entretenimento', tags: ['ign', 'games', 'jogos', 'reviews', 'gaming'] },
  { id: 'eurogamer',        name: 'Eurogamer',                  url: 'https://www.eurogamer.net/feed',                                     category: 'Entretenimento', tags: ['eurogamer', 'games', 'reviews', 'pc', 'console'] },
  { id: 'kotaku',           name: 'Kotaku',                     url: 'https://kotaku.com/rss',                                             category: 'Entretenimento', tags: ['kotaku', 'games', 'gaming', 'culture'] },
  { id: 'polygon',          name: 'Polygon',                    url: 'https://www.polygon.com/rss/index.xml',                              category: 'Entretenimento', tags: ['polygon', 'games', 'entertainment', 'reviews'] },
  { id: 'gamespot',         name: 'GameSpot',                   url: 'https://www.gamespot.com/feeds/mashup/',                             category: 'Entretenimento', tags: ['gamespot', 'games', 'reviews', 'trailers'] },
  { id: 'cinema-blend',     name: 'CinemaBlend',               url: 'https://www.cinemablend.com/rss/topic/news/all',                     category: 'Entretenimento', tags: ['cinema', 'movies', 'tv', 'streaming'] },
  { id: 'variety',          name: 'Variety',                    url: 'https://variety.com/feed/',                                          category: 'Entretenimento', tags: ['variety', 'hollywood', 'cinema', 'tv', 'streaming'] },
  { id: 'deadline',         name: 'Deadline',                   url: 'https://deadline.com/feed/',                                         category: 'Entretenimento', tags: ['deadline', 'hollywood', 'film', 'tv'] },
  { id: 'screen-rant',      name: 'Screen Rant',               url: 'https://screenrant.com/feed/',                                       category: 'Entretenimento', tags: ['screen rant', 'movies', 'tv', 'comics', 'marvel'] },
  { id: 'musicradar',       name: 'MusicRadar',                 url: 'https://www.musicradar.com/rss',                                     category: 'Entretenimento', tags: ['music', 'guitars', 'instruments', 'production'] },
  { id: 'pitchfork',        name: 'Pitchfork',                  url: 'https://pitchfork.com/feed/feed-news/rss',                           category: 'Entretenimento', tags: ['pitchfork', 'music', 'reviews', 'albums', 'indie'] },
  { id: 'veja',             name: 'Veja',                       url: 'https://veja.abril.com.br/feed/',                                    category: 'Entretenimento', tags: ['veja', 'revista', 'cultura', 'brasil'] },
  { id: 'pop-sugar',        name: 'PopSugar',                   url: 'https://www.popsugar.com/feed',                                      category: 'Entretenimento', tags: ['popsugar', 'celebrity', 'culture', 'lifestyle'] },
  // Saúde
  { id: 'folha-saude',      name: 'Folha Equilíbrio e Saúde',  url: 'https://feeds.folha.uol.com.br/equilibrioesaude/rss091.xml',         category: 'Saúde',          tags: ['folha', 'saúde', 'equilíbrio', 'medicina'] },
  { id: 'medical-news',     name: 'Medical News Today',         url: 'https://www.medicalnewstoday.com/newsfeeds/rss',                     category: 'Saúde',          tags: ['medical', 'health', 'medicine', 'research'] },
  { id: 'webmd',            name: 'WebMD',                      url: 'https://rssfeeds.webmd.com/rss/rss.aspx?RSSSource=RSS_PUBLIC',       category: 'Saúde',          tags: ['webmd', 'health', 'medicine', 'wellness'] },
  { id: 'viva-bem',         name: 'VivaBem (UOL)',              url: 'https://rss.uol.com.br/feed/vivabem.xml',                            category: 'Saúde',          tags: ['vivabem', 'uol', 'saúde', 'bem-estar', 'fitness'] },
  // Educação
  { id: 'g1-educacao',      name: 'G1 Educação',                url: 'https://g1.globo.com/rss/g1/educacao/',                              category: 'Educação',       tags: ['globo', 'educação', 'enem', 'vestibular', 'escola'] },
  { id: 'folha-educacao',   name: 'Folha Educação',             url: 'https://feeds.folha.uol.com.br/educacao/rss091.xml',                 category: 'Educação',       tags: ['folha', 'educação', 'ensino', 'universidade'] },
  { id: 'quero-bolsa',      name: 'Quero Bolsa',               url: 'https://querobolsa.com.br/revista/feed',                              category: 'Educação',       tags: ['quero bolsa', 'faculdade', 'bolsa', 'estudos'] },
  // Meio Ambiente
  { id: 'oeco',             name: 'O Eco',                      url: 'https://oeco.org.br/feed/',                                          category: 'Meio Ambiente',  tags: ['o eco', 'meio ambiente', 'ecologia', 'sustentabilidade'] },
  { id: 'um-so-planeta',    name: 'Um Só Planeta',              url: 'https://umsoplaneta.globo.com/feed/',                                category: 'Meio Ambiente',  tags: ['planeta', 'globo', 'sustentabilidade', 'clima'] },
  { id: 'mongabay',         name: 'Mongabay',                   url: 'https://news.mongabay.com/feed/',                                    category: 'Meio Ambiente',  tags: ['mongabay', 'rainforest', 'biodiversity', 'environment'] },
  { id: 'treehugger',       name: 'Treehugger',                 url: 'https://www.treehugger.com/feeds/all',                               category: 'Meio Ambiente',  tags: ['treehugger', 'sustainability', 'green', 'environment'] },
  // Negócios
  { id: 'startse',          name: 'StartSe',                    url: 'https://www.startse.com/feed/',                                      category: 'Negócios',       tags: ['startse', 'startups', 'empreendedorismo', 'inovação'] },
  { id: 'pequenas-empresas', name: 'PEGN',                      url: 'https://revistapegn.globo.com/feed/',                                category: 'Negócios',       tags: ['pegn', 'pequenas empresas', 'negócios', 'empreendedorismo'] },
  { id: 'epoca-negocios',   name: 'Época Negócios',            url: 'https://epocanegocios.globo.com/feed/',                              category: 'Negócios',       tags: ['época', 'negócios', 'empresas', 'gestão'] },
  { id: 'harvard-br',       name: 'HBR Brasil',                url: 'https://hbrbr.com.br/feed/',                                         category: 'Negócios',       tags: ['harvard', 'business review', 'gestão', 'liderança'] },
  { id: 'fast-company',     name: 'Fast Company',               url: 'https://www.fastcompany.com/latest/rss',                             category: 'Negócios',       tags: ['fast company', 'innovation', 'design', 'business'] },
  { id: 'inc',              name: 'Inc.',                       url: 'https://www.inc.com/rss/',                                           category: 'Negócios',       tags: ['inc', 'startups', 'entrepreneurship', 'business'] },
  // Segurança
  { id: 'krebs',            name: 'Krebs on Security',          url: 'https://krebsonsecurity.com/feed/',                                  category: 'Segurança',      tags: ['krebs', 'security', 'cybersecurity', 'hacking'] },
  { id: 'threatpost',       name: 'Threatpost',                 url: 'https://threatpost.com/feed/',                                       category: 'Segurança',      tags: ['threatpost', 'security', 'vulnerabilities', 'malware'] },
  { id: 'bleeping',         name: 'BleepingComputer',           url: 'https://www.bleepingcomputer.com/feed/',                             category: 'Segurança',      tags: ['bleeping', 'security', 'ransomware', 'malware'] },
  { id: 'hacker-news-sec',  name: 'The Hacker News',            url: 'https://feeds.feedburner.com/TheHackersNews',                        category: 'Segurança',      tags: ['hacker news', 'cybersecurity', 'infosec', 'data breach'] },
  { id: 'dark-reading',     name: 'Dark Reading',               url: 'https://www.darkreading.com/rss.xml',                                category: 'Segurança',      tags: ['dark reading', 'cybersecurity', 'enterprise', 'threats'] },
  // Design
  { id: 'designboom',       name: 'Designboom',                 url: 'https://www.designboom.com/feed/',                                   category: 'Design',         tags: ['designboom', 'architecture', 'art', 'design'] },
  { id: 'dezeen',           name: 'Dezeen',                     url: 'https://www.dezeen.com/feed/',                                       category: 'Design',         tags: ['dezeen', 'architecture', 'design', 'interiors'] },
  { id: 'archdaily-br',     name: 'ArchDaily Brasil',           url: 'https://www.archdaily.com.br/br/feed',                               category: 'Design',         tags: ['archdaily', 'arquitetura', 'design', 'brasil'] },
  { id: 'behance',          name: 'Behance',                    url: 'https://www.behance.net/feeds/projects',                             category: 'Design',         tags: ['behance', 'portfolio', 'creative', 'graphic design'] },
  // Linux / Open Source
  { id: 'omgubuntu',        name: 'OMG! Ubuntu!',              url: 'https://www.omgubuntu.co.uk/feed',                                   category: 'Tecnologia',     tags: ['ubuntu', 'linux', 'open source', 'desktop'] },
  { id: 'phoronix',         name: 'Phoronix',                  url: 'https://www.phoronix.com/rss.php',                                   category: 'Tecnologia',     tags: ['phoronix', 'linux', 'benchmark', 'hardware', 'open source'] },
  { id: 'itsfoss',          name: "It's FOSS",                 url: 'https://itsfoss.com/feed/',                                           category: 'Tecnologia',     tags: ['foss', 'linux', 'open source', 'ubuntu', 'tutorials'] },
  { id: 'diolinux',         name: 'Diolinux',                  url: 'https://diolinux.com.br/feed',                                        category: 'Tecnologia',     tags: ['diolinux', 'linux', 'open source', 'brasil'] },
]

// ══════════════════════════════════════════════════════════
// Layer 1: Busca no diretório curado local
// ══════════════════════════════════════════════════════════

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim()
}

function searchCurated(query: string): RssSuggestion[] {
  const q = normalize(query)
  if (!q || q.length < 2) return []

  const scored: Array<{ entry: DirectoryEntry; score: number }> = []

  for (const entry of DIRECTORY) {
    let score = 0
    const nName = normalize(entry.name)
    const nCat = normalize(entry.category)
    const nUrl = normalize(entry.url)
    const nTags = entry.tags.map(normalize)

    if (nName.startsWith(q)) score += 100
    else if (nName.includes(q)) score += 60
    if (nCat.startsWith(q)) score += 80
    else if (nCat.includes(q)) score += 40
    if (nUrl.includes(q)) score += 50
    for (const tag of nTags) {
      if (tag.startsWith(q)) { score += 70; break }
      if (tag.includes(q)) { score += 30; break }
    }
    const qWords = q.split(' ')
    if (qWords.length > 1) {
      const allMatch = qWords.every(w =>
        nName.includes(w) || nCat.includes(w) || nTags.some(t => t.includes(w))
      )
      if (allMatch) score += 55
    }
    if (score > 0) scored.push({ entry, score })
  }

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, 8).map(s => ({
    id: s.entry.id,
    name: s.entry.name,
    url: s.entry.url,
    category: s.entry.category,
    source: 'curated' as const,
  }))
}

// ══════════════════════════════════════════════════════════
// Layer 2: Google News RSS — geração dinâmica de feed
// ══════════════════════════════════════════════════════════

function buildGoogleNewsSuggestion(query: string): RssSuggestion | null {
  const q = query.trim()
  if (!q || q.length < 2) return null
  if (/^https?:\/\//i.test(q)) return null

  const encoded = encodeURIComponent(q)
  return {
    id: `gnews-${encoded}`,
    name: `Google News: "${q}"`,
    url: `https://news.google.com/rss/search?q=${encoded}&hl=pt-BR&gl=BR&ceid=BR:pt-419`,
    category: 'Google News',
    source: 'google-news',
  }
}

// ══════════════════════════════════════════════════════════
// Layer 3: Gemini AI — descoberta inteligente de feeds
// ══════════════════════════════════════════════════════════

async function discoverWithGemini(query: string, apiKey: string, db?: D1Binding): Promise<RssSuggestion[]> {
  const _telStart = Date.now();
  try {
    const prompt = `Você é um especialista em feeds RSS de notícias.
O usuário está buscando fontes de notícias para o termo: "${query}"

Retorne um array JSON com no máximo 5 fontes RSS REAIS e ativas, cada uma com:
- "name": nome do veículo/portal
- "url": URL REAL do feed RSS (não invente URLs — use apenas feeds que você sabe que existem)
- "category": categoria da fonte (ex: Brasil, Tecnologia, Economia, Esportes, Mundo, Ciência, Entretenimento)

REGRAS:
- Retorne APENAS o array JSON, sem texto adicional.
- Só inclua feeds que realmente existem e são acessíveis.
- Priorize fontes brasileiras quando o termo for em português.
- Se não conhecer feeds para o termo, retorne um array vazio [].`

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1024,
          responseMimeType: "application/json"
        }
      })
    });
    
    if (!res.ok) {
      throw new Error(`Gemini API Error: ${res.status}`);
    }

    const data = await res.json() as any;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return [];

    const parsed = JSON.parse(text) as Array<{ name?: string; url?: string; category?: string }>;
    if (!Array.isArray(parsed)) return [];

    const results = parsed
      .filter(item => item.name && item.url && item.category)
      .slice(0, 5)
      .map((item, index) => ({
        id: `gemini-${index}-${slugify(item.name!)}`,
        name: item.name!,
        url: item.url!,
        category: item.category!,
        source: 'gemini-ai' as const,
      }));
    // Telemetria fire-and-forget
    if (db) {
      const usage = data?.usageMetadata || {};
      db.prepare(`
        INSERT INTO ai_usage_logs (module, model, input_tokens, output_tokens, latency_ms, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind('news-discover', 'gemini-2.5-flash', usage?.promptTokenCount || 0, usage?.candidatesTokenCount || 0, Date.now() - _telStart, 'ok'
      ).run().catch(() => {});
    }

    return results;
  } catch (error) {
    console.warn('[discover] Gemini discovery failed:', error);
    if (db) {
      db.prepare(`
        INSERT INTO ai_usage_logs (module, model, input_tokens, output_tokens, latency_ms, status, error_detail)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind('news-discover', 'gemini-2.5-flash', 0, 0, Date.now() - _telStart, 'error', error instanceof Error ? error.message : 'Unknown error'
      ).run().catch(() => {});
    }
    return [];
  }
}

// ══════════════════════════════════════════════════════════
// Layer Bonus: Auto-detect RSS from website URL
// ══════════════════════════════════════════════════════════

async function autoDetectRss(url: string): Promise<RssSuggestion[]> {
  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) return []

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'LCV-AdminApp-RSSDiscovery/1.0',
        'Accept': 'text/html, application/xhtml+xml',
      },
    })

    clearTimeout(timeout)
    if (!response.ok) return []

    const contentType = response.headers.get('Content-Type') || ''

    // Se já é um feed RSS/Atom, retornar direto
    if (contentType.includes('xml') || contentType.includes('rss') || contentType.includes('atom')) {
      const hostname = parsed.hostname.replace('www.', '')
      return [{
        id: `detected-${slugify(hostname)}`,
        name: hostname,
        url: url,
        category: 'Detectado',
        source: 'auto-detect',
      }]
    }

    if (!contentType.includes('html')) return []

    const html = await response.text()
    const results: RssSuggestion[] = []

    const linkRegex = /<link[^>]+rel=["']alternate["'][^>]*>/gi
    let match: RegExpExecArray | null
    while ((match = linkRegex.exec(html)) !== null && results.length < 5) {
      const tag = match[0]
      const typeMatch = tag.match(/type=["']([^"']+)["']/)
      const hrefMatch = tag.match(/href=["']([^"']+)["']/)
      const titleMatch = tag.match(/title=["']([^"']+)["']/)

      if (!typeMatch || !hrefMatch) continue
      const type = typeMatch[1].toLowerCase()
      if (!type.includes('rss') && !type.includes('atom') && !type.includes('xml')) continue

      let feedUrl = hrefMatch[1]
      if (feedUrl.startsWith('/')) {
        feedUrl = `${parsed.protocol}//${parsed.host}${feedUrl}`
      } else if (!feedUrl.startsWith('http')) {
        feedUrl = `${parsed.protocol}//${parsed.host}/${feedUrl}`
      }

      const title = titleMatch ? titleMatch[1] : parsed.hostname.replace('www.', '')

      results.push({
        id: `detected-${slugify(title)}-${results.length}`,
        name: cleanHtmlEntities(title),
        url: feedUrl,
        category: 'Detectado',
        source: 'auto-detect',
      })
    }

    return results
  } catch (error) {
    console.warn('[discover] Auto-detect failed:', error)
    return []
  }
}

// ── Utilitários ───────────────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function cleanHtmlEntities(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

// ══════════════════════════════════════════════════════════
// Handler principal
// ══════════════════════════════════════════════════════════

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url)
  const query = (url.searchParams.get('q') || '').trim()
  const field = (url.searchParams.get('field') || 'name') as 'name' | 'url' | 'category'

  if (!query || query.length < 2) {
    return new Response(JSON.stringify({ ok: true, suggestions: [] }), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
  }

  const suggestions: RssSuggestion[] = []
  const seenUrls = new Set<string>()

  const addUnique = (items: RssSuggestion[]) => {
    for (const item of items) {
      if (!seenUrls.has(item.url)) {
        seenUrls.add(item.url)
        suggestions.push(item)
      }
    }
  }

  // Layer 1: Busca curada (sempre, instantâneo)
  addUnique(searchCurated(query))

  const isUrl = /^https?:\/\//i.test(query)

  if (field === 'url' && isUrl) {
    const detected = await autoDetectRss(query)
    addUnique(detected)
  } else {
    const gnews = buildGoogleNewsSuggestion(query)
    if (gnews) addUnique([gnews])
  }

  // Layer 3: Gemini AI (se API key disponível e query ≥3 chars)
  const apiKey = context.env.GEMINI_API_KEY
  if (apiKey && query.length >= 3) {
    try {
      const geminiResults = await Promise.race([
        discoverWithGemini(query, apiKey, context.env.BIGDATA_DB as unknown as D1Binding),
        new Promise<RssSuggestion[]>((resolve) => setTimeout(() => resolve([]), 6000)),
      ])
      addUnique(geminiResults)
    } catch {
      // Gemini falhou silenciosamente
    }
  }

  return new Response(JSON.stringify({
    ok: true,
    suggestions: suggestions.slice(0, 12),
    query,
    field,
    layers: {
      curated: true,
      googleNews: !isUrl,
      geminiAi: Boolean(apiKey),
      autoDetect: field === 'url' && isUrl,
    },
  }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  })
}

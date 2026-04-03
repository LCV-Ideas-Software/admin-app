const { marked } = require('marked');

function preprocessMarkdown(md) {
  let processed = md.replace(/^(#{1,6})\s/gm, '### ')
  processed = processed.replace(/!\[([^\]]*)\]\([^)]+\)/g, '\n🖼️ *[Imagem não importada: $1]*\n')
  return processed
}

function postprocessHtml(html) {
  let processed = html.replace(/<p>/g, '<p style="text-align: justify">')
  processed = processed.replace(/<p style="text-align: justify">/g, '<p style="text-align: justify">\u2003')
  processed = processed.replace(/\u2003🖼️/g, '🖼️')
  processed = processed.replace(/<\/p>\n*<p/g, '</p>\n<p><br></p>\n<p')
  return processed
}

async function run() {
  const raw = '# Olá mundo\n\nEste é um teste de parágrafo longo para ver.\n\n![my image](http://foo)\n\nFim.';
  const p = preprocessMarkdown(raw);
  console.log('MARKDOWN:\n', p);
  const h = await marked.parse(p);
  console.log('RAW HTML:\n', h);
  const f = postprocessHtml(h);
  console.log('FINAL HTML:\n', f);
}

run();

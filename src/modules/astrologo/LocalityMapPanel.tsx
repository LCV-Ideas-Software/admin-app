import { Compass, MapPinned } from 'lucide-react';
import { lazy, Suspense, useId } from 'react';
import { type LocalityMapV1ParseResult, localityAvailabilityPtBr } from '../../lib/astrological-locality-map-v1';
import { formatInstantInBrasilia } from '../../lib/astrological-position-v2';
import { AstrologoLearnMoreDialog } from './AstrologoLearnMoreDialog';

const LocalityWorldMap = lazy(() =>
  import('./LocalityWorldMap').then(({ LocalityWorldMap: Component }) => ({ default: Component })),
);

const decimalFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

export function LocalityMapPanel({ result }: { readonly result: LocalityMapV1ParseResult }) {
  const titleId = useId();
  if (result.status === 'legacy') return null;
  if (result.status === 'invalid') {
    return (
      <section className="astro-section" role="status" style={{ borderColor: '#fcd34d', background: '#fffbeb' }}>
        <h5 className="astro-section__title">Mapa de localidade indisponível</h5>
        <p className="field-hint" style={{ color: '#92400e' }}>
          O artefato persistido não passou pela validação defensiva ({result.reason}). Nenhuma linha cartográfica foi
          reconstruída pelo Admin.
        </p>
      </section>
    );
  }

  const data = result.data;
  return (
    <section className="astro-section astro-advanced-run astro-locality-panel" aria-labelledby={titleId}>
      <div className="astro-natal-analysis__heading">
        <span className="astro-natal-analysis__icon astro-locality-panel__icon" aria-hidden="true">
          <MapPinned size={22} />
        </span>
        <div>
          <h5 id={titleId} className="astro-section__title">
            Mapa planetário de localidade
          </h5>
          <p className="field-hint">
            Instante natal: <strong>{formatInstantInBrasilia(data.source.birthInstantUtc)}</strong> —{' '}
            {data.presentationPolicy.timeZoneLabel}. Resolução latitudinal de{' '}
            {decimalFormatter.format(data.models.sampling.latitudeResolutionDeg)}°.
          </p>
        </div>
        <AstrologoLearnMoreDialog topic="localityMap" />
      </div>

      <Suspense fallback={<p className="field-hint">Carregando a base cartográfica local…</p>}>
        <LocalityWorldMap data={data} />
      </Suspense>

      <div className="astro-locality-method-grid">
        <article>
          <h6>
            <Compass size={17} aria-hidden="true" /> Referência astronômica explícita
          </h6>
          <p>
            As coordenadas de origem em <strong>EQJ/J2000</strong> foram transformadas, com precessão e nutação, para o{' '}
            <strong>EQD verdadeiro da data</strong> antes do cálculo com o tempo sideral aparente de Greenwich.
          </p>
        </article>
        <article>
          <h6>Disponibilidade das linhas</h6>
          <ul>
            {data.lines.map((line) => (
              <li key={line.recordId}>
                <span style={{ color: `var(--astro-${line.bodyId}, #475569)` }} aria-hidden="true">
                  {line.bodySymbol}
                </span>{' '}
                <strong>{line.bodyDisplayNamePtBr}</strong> — {line.angleDisplayNamePtBr}:{' '}
                {localityAvailabilityPtBr(line)}
              </li>
            ))}
          </ul>
        </article>
      </div>

      <p className="astro-method-caution astro-method-caution--locality">
        Esta projeção é uma referência simbólica e exploratória: <strong>não recomenda mudança</strong>, viagem,
        investimento, moradia ou qualquer decisão de alto impacto. As linhas representam relações geométricas, não
        garantias de acontecimentos.
      </p>
    </section>
  );
}

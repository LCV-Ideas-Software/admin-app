import { HeartHandshake, Orbit, Telescope } from 'lucide-react';
import { useId } from 'react';
import {
  formatDegreeDmsTruncated,
  formatInstantInBrasilia,
  PLANET_LABEL_BY_ID,
} from '../../lib/astrological-position-v2';
import {
  normalizeSynastrySubjectNames,
  type SynastryRunV1ParseResult,
  type SynastrySubjectNames,
  synastryPlanetNamePtBr,
} from '../../lib/astrological-synastry-run-v1';
import {
  type TransitExactitudeV1,
  type TransitRunV1ParseResult,
  transitPhasePtBr,
} from '../../lib/astrological-transit-run-v1';
import { AstrologoLearnMoreDialog } from './AstrologoLearnMoreDialog';

const decimalFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const exactitudePtBr = (exactitude: TransitExactitudeV1): string => {
  if (exactitude.status === 'available') {
    return `Exatidão comprovada em ${formatInstantInBrasilia(exactitude.exactAtUtc)}`;
  }
  if (exactitude.reasonCode === 'HORIZON_ZERO_NO_SEARCH')
    return 'Exatidão não pesquisada: horizonte definido como zero.';
  if (exactitude.reasonCode === 'NO_EXACTITUDE_WITHIN_HORIZON') {
    return 'Exatidão não encontrada dentro do horizonte informado.';
  }
  if (exactitude.reasonCode === 'EXACT_SEARCH_UNAVAILABLE') {
    return 'Exatidão não comprovada: o provedor não ofereceu busca no horizonte.';
  }
  return 'Exatidão não comprovada: a resposta do provedor não passou pela verificação.';
};

export function TransitRunPanel({ result }: { readonly result: TransitRunV1ParseResult }) {
  const titleId = useId();
  if (result.status === 'legacy') return null;
  if (result.status === 'invalid') {
    return (
      <section className="astro-section" role="status" style={{ borderColor: '#fdba74', background: '#fff7ed' }}>
        <h5 className="astro-section__title">Céu atual indisponível</h5>
        <p className="field-hint" style={{ color: '#9a3412' }}>
          O artefato persistido não passou pela validação defensiva ({result.reason}). Nenhuma posição, fase ou data foi
          recalculada pelo Admin.
        </p>
      </section>
    );
  }

  const data = result.data;
  const transitNames = new Map(
    data.positionsAtReference.map((position) => [position.bodyId, position.displayNamePtBr]),
  );
  const natalNames = new Map(data.natalTargets.map((target) => [target.pointId, target.displayNamePtBr]));

  return (
    <section className="astro-section astro-advanced-run astro-transit-run" aria-labelledby={titleId}>
      <div className="astro-natal-analysis__heading">
        <span className="astro-natal-analysis__icon astro-advanced-run__icon--transit" aria-hidden="true">
          <Telescope size={22} />
        </span>
        <div>
          <h5 id={titleId} className="astro-section__title">
            Céu atual e trânsitos
          </h5>
          <p className="field-hint">
            Referência: <strong>{formatInstantInBrasilia(data.request.referenceInstantUtc)}</strong> —{' '}
            {data.presentationPolicy.timeZoneLabel}. O horizonte termina em{' '}
            {formatInstantInBrasilia(data.request.horizonEndInstantUtc)}.
          </p>
        </div>
        <AstrologoLearnMoreDialog topic="currentTransits" />
      </div>

      <p className="astro-method-caution">
        Esta é uma leitura simbólica das relações entre o céu de referência e o mapa natal; não é uma previsão
        inevitável de acontecimentos.
      </p>

      <h6 className="astro-advanced-run__subtitle">Posições no instante de referência</h6>
      <ul className="astro-current-sky-grid" aria-label="Posições do céu no instante de referência">
        {data.positionsAtReference.map((position) => (
          <li key={position.bodyId} className="astro-current-sky-card">
            <span className={`astro-planet-icon astro-planet-icon--${position.bodyId}`} aria-hidden="true">
              {position.symbol}
            </span>
            <span>
              <strong>{PLANET_LABEL_BY_ID[position.bodyId]}</strong>
              <small>
                {formatDegreeDmsTruncated(position.tropical.degreeWithinSignDeg)} de {position.tropical.signNamePtBr}
              </small>
              <small>
                {position.astronomicalReal.status === 'available'
                  ? `Constelação IAU: ${position.astronomicalReal.constellation.namePtBr} — grau interno não definido`
                  : 'Constelação IAU indisponível junto ao limite catalogado — grau interno não definido'}
              </small>
              <small>
                {position.natalHousePlacement.status === 'available'
                  ? `Casa natal ${position.natalHousePlacement.houseIndex1}`
                  : 'Casa natal indisponível'}
              </small>
            </span>
          </li>
        ))}
      </ul>

      <h6 className="astro-advanced-run__subtitle">Aspectos entre trânsitos e mapa natal</h6>
      {data.aspects.length > 0 ? (
        <div className="astro-natal-analysis__table-wrap">
          <table className="astro-positional-table astro-aspect-table" aria-label="Aspectos de trânsito ao mapa natal">
            <thead>
              <tr>
                <th scope="col">Relação</th>
                <th scope="col">Aspecto</th>
                <th scope="col">Orbe</th>
                <th scope="col">Fase</th>
                <th scope="col">Exatidão</th>
              </tr>
            </thead>
            <tbody>
              {data.aspects.map((aspect) => (
                <tr key={aspect.recordId}>
                  <th scope="row">
                    {transitNames.get(aspect.transitPoint.bodyId) ?? 'Planeta'} em trânsito e{' '}
                    {natalNames.get(aspect.natalPoint.pointId) ?? 'ponto'} natal
                  </th>
                  <td>
                    <strong>{aspect.displayNamePtBr}</strong>
                  </td>
                  <td>{decimalFormatter.format(aspect.orbDeg)}°</td>
                  <td>{transitPhasePtBr(aspect.phase)}</td>
                  <td>{exactitudePtBr(aspect.exactitude)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="field-hint">Nenhum aspecto foi persistido dentro do orbe de 2° neste instante.</p>
      )}
    </section>
  );
}

const overlaySentence = (bodyName: string, sourceName: string, targetName: string, houseIndex1?: number): string =>
  houseIndex1 === undefined
    ? `${bodyName} de ${sourceName}: casas de ${targetName} indisponíveis`
    : `${bodyName} de ${sourceName} na Casa ${houseIndex1} de ${targetName}`;

export function SynastryRunPanel({
  result,
  subjects: subjectInput,
}: {
  readonly result: SynastryRunV1ParseResult;
  readonly subjects?: SynastrySubjectNames | null;
}) {
  const titleId = useId();
  if (result.status === 'legacy') return null;
  if (result.status === 'invalid') {
    return (
      <section className="astro-section" role="status" style={{ borderColor: '#f9a8d4', background: '#fdf2f8' }}>
        <h5 className="astro-section__title">Sinastria indisponível</h5>
        <p className="field-hint" style={{ color: '#9d174d' }}>
          O artefato persistido não passou pela validação defensiva ({result.reason}). Nenhuma relação foi reconstruída
          pelo Admin.
        </p>
      </section>
    );
  }

  const data = result.data;
  const subjects = normalizeSynastrySubjectNames(subjectInput);
  return (
    <section className="astro-section astro-advanced-run astro-synastry-run" aria-labelledby={titleId}>
      <div className="astro-natal-analysis__heading">
        <span className="astro-natal-analysis__icon astro-advanced-run__icon--synastry" aria-hidden="true">
          <HeartHandshake size={22} />
        </span>
        <div>
          <h5 id={titleId} className="astro-section__title">
            Sinastria
          </h5>
          <p className="field-hint">
            {subjects.A} e {subjects.B}: relações intermapa e ocupações recíprocas das Casas Placidus.
          </p>
        </div>
        <AstrologoLearnMoreDialog topic="synastry" />
      </div>

      <p className="astro-method-caution astro-method-caution--synastry">
        A sinastria descreve correspondências simbólicas recíprocas; não classifica as pessoas e não determina o destino
        da relação.
      </p>

      <h6 className="astro-advanced-run__subtitle">Aspectos intermapa</h6>
      {data.aspects.length > 0 ? (
        <div className="astro-natal-analysis__table-wrap">
          <table className="astro-positional-table astro-aspect-table" aria-label="Aspectos intermapa da sinastria">
            <thead>
              <tr>
                <th scope="col">Corpos relacionados</th>
                <th scope="col">Aspecto</th>
                <th scope="col">Separação</th>
                <th scope="col">Orbe</th>
              </tr>
            </thead>
            <tbody>
              {data.aspects.map((aspect) => (
                <tr key={aspect.recordId}>
                  <th scope="row">
                    {synastryPlanetNamePtBr(aspect.pointA.bodyId)} de {subjects.A} e{' '}
                    {synastryPlanetNamePtBr(aspect.pointB.bodyId)} de {subjects.B}
                  </th>
                  <td>
                    <strong>{aspect.displayNamePtBr}</strong>
                  </td>
                  <td>{decimalFormatter.format(aspect.separationDeg)}°</td>
                  <td>{decimalFormatter.format(aspect.orbDeg)}°</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="field-hint">Nenhum aspecto intermapa foi persistido dentro dos orbes declarados.</p>
      )}

      <div className="astro-reciprocal-grid">
        <section className="astro-reciprocal-panel" aria-label={`${subjects.A} nas casas de ${subjects.B}`}>
          <h6>
            <Orbit size={17} aria-hidden="true" /> {subjects.A} nas casas de {subjects.B}
          </h6>
          <ul>
            {data.houseOverlays.aToB.map((overlay) => (
              <li key={overlay.sourceBodyId}>
                {overlaySentence(
                  synastryPlanetNamePtBr(overlay.sourceBodyId),
                  subjects.A,
                  subjects.B,
                  overlay.placement.status === 'available' ? overlay.placement.houseIndex1 : undefined,
                )}
              </li>
            ))}
          </ul>
        </section>
        <section className="astro-reciprocal-panel" aria-label={`${subjects.B} nas casas de ${subjects.A}`}>
          <h6>
            <Orbit size={17} aria-hidden="true" /> {subjects.B} nas casas de {subjects.A}
          </h6>
          <ul>
            {data.houseOverlays.bToA.map((overlay) => (
              <li key={overlay.sourceBodyId}>
                {overlaySentence(
                  synastryPlanetNamePtBr(overlay.sourceBodyId),
                  subjects.B,
                  subjects.A,
                  overlay.placement.status === 'available' ? overlay.placement.houseIndex1 : undefined,
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  );
}

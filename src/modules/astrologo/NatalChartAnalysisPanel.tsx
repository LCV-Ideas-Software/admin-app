import { House, Orbit } from 'lucide-react';
import { useId } from 'react';
import {
  formatNatalAspectPhasePtBr,
  mundaneDegreeUnavailablePtBr,
  type NatalChartAnalysisV1ParseResult,
} from '../../lib/astrological-natal-analysis-v1';
import { formatDegreeDmsTruncated, PLANET_LABEL_BY_ID } from '../../lib/astrological-position-v2';
import { AstrologoLearnMoreDialog } from './AstrologoLearnMoreDialog';

const percentFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const decimalFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function NatalChartAnalysisPanel({ result }: { readonly result: NatalChartAnalysisV1ParseResult }) {
  const aspectsTitleId = useId();
  const housesTitleId = useId();

  if (result.status === 'legacy') return null;
  if (result.status === 'invalid') {
    return (
      <section className="astro-section" role="status" style={{ borderColor: '#fdba74', background: '#fff7ed' }}>
        <h5 className="astro-section__title">Análise natal avançada indisponível</h5>
        <p className="field-hint" style={{ color: '#9a3412' }}>
          O artefato persistido não passou pela validação defensiva ({result.reason}). O mapa original permanece
          disponível e nenhum valor foi recalculado pelo Admin.
        </p>
      </section>
    );
  }

  const data = result.data;
  const pointNames = new Map(data.points.map((point) => [`${point.kind}:${point.id}`, point.displayNamePtBr]));

  return (
    <>
      <section
        className="astro-section astro-natal-analysis"
        aria-labelledby={aspectsTitleId}
        aria-label="Aspectos natais"
      >
        <div className="astro-natal-analysis__heading">
          <span className="astro-natal-analysis__icon astro-natal-analysis__icon--aspects" aria-hidden="true">
            <Orbit size={22} />
          </span>
          <div>
            <h5 id={aspectsTitleId} className="astro-section__title">
              Aspectos natais
            </h5>
            <p className="field-hint">
              Um aspecto é a relação angular entre dois pontos do mapa. O orbe mostra quanto essa relação se afasta do
              ângulo exato; quanto menor o orbe, maior a exatidão geométrica.
            </p>
          </div>
          <AstrologoLearnMoreDialog topic="natalAspects" />
        </div>

        {data.aspects.length > 0 ? (
          <div className="astro-natal-analysis__table-wrap">
            <table className="astro-positional-table astro-aspect-table" aria-label="Aspectos natais calculados">
              <thead>
                <tr>
                  <th scope="col">Pontos relacionados</th>
                  <th scope="col">Aspecto</th>
                  <th scope="col">Orbe</th>
                  <th scope="col">Fase</th>
                  <th scope="col">Intensidade geométrica</th>
                </tr>
              </thead>
              <tbody>
                {data.aspects.map((aspect) => {
                  const pointA = pointNames.get(`${aspect.pointA.kind}:${aspect.pointA.id}`) ?? 'Ponto indisponível';
                  const pointB = pointNames.get(`${aspect.pointB.kind}:${aspect.pointB.id}`) ?? 'Ponto indisponível';
                  return (
                    <tr key={aspect.recordId}>
                      <th scope="row">
                        {pointA} e {pointB}
                      </th>
                      <td>
                        <strong>{aspect.displayNamePtBr}</strong>
                      </td>
                      <td>{decimalFormatter.format(aspect.orbDeg)}°</td>
                      <td>{formatNatalAspectPhasePtBr(aspect.phase)}</td>
                      <td>{percentFormatter.format(aspect.intensityPercent)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="field-hint">Nenhum aspecto do perfil maior versionado foi registrado neste mapa.</p>
        )}
      </section>

      <section
        className="astro-section astro-natal-analysis"
        aria-labelledby={housesTitleId}
        aria-label="Análise das casas"
      >
        <div className="astro-natal-analysis__heading">
          <span className="astro-natal-analysis__icon astro-natal-analysis__icon--houses" aria-hidden="true">
            <House size={22} />
          </span>
          <div>
            <h5 id={housesTitleId} className="astro-section__title">
              Análise das casas
            </h5>
            <p className="field-hint">
              A casa indica o setor Placidus ocupado pelo planeta. O grau mundano mede a posição pelo semiarco dentro
              dessa casa; ele não é a longitude tropical e nunca é aproximado pelo espaço entre cúspides.
            </p>
          </div>
          <AstrologoLearnMoreDialog topic="houseAnalysis" />
        </div>

        <ul className="astro-house-analysis-grid" aria-label="Ocupações planetárias nas Casas Placidus">
          {data.houseOccupancies.map((house) => {
            const label = PLANET_LABEL_BY_ID[house.bodyId];
            const point = data.points.find((candidate) => candidate.kind === 'planet' && candidate.id === house.bodyId);
            return (
              <li key={house.bodyId} className="astro-house-analysis-card">
                <div className="astro-house-analysis-card__planet">
                  <span className={`astro-planet-icon astro-planet-icon--${house.bodyId}`} aria-hidden="true">
                    {point?.symbol ?? ''}
                  </span>
                  <strong>{label}</strong>
                </div>
                {house.occupancy.status === 'available' ? (
                  <span className="astro-house-analysis-card__house">Casa {house.occupancy.houseIndex1}</span>
                ) : (
                  <span className="astro-house-analysis-card__house">Casa indisponível</span>
                )}
                {house.mundaneDegreeWithinHouse.status === 'available' && house.occupancy.status === 'available' ? (
                  <strong className="astro-house-analysis-card__degree">
                    {formatDegreeDmsTruncated(house.mundaneDegreeWithinHouse.degreeWithinHouseDeg)} dentro da Casa{' '}
                    {house.occupancy.houseIndex1}
                  </strong>
                ) : (
                  <small>{mundaneDegreeUnavailablePtBr(house)}</small>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}

import { geoEquirectangular, geoGraticule10, geoPath } from 'd3-geo';
import type { FeatureCollection, GeometryObject, MultiLineString } from 'geojson';
import { useState } from 'react';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import worldTopologyJson from 'world-atlas/countries-110m.json';
import type { LocalityAngleId, LocalityMapV1 } from '../../lib/astrological-locality-map-v1';

const topology = worldTopologyJson as unknown as Topology<{ countries: GeometryCollection }>;
const countries = feature(topology, topology.objects.countries) as FeatureCollection<GeometryObject>;

const BODY_COLORS: Readonly<Record<string, string>> = Object.freeze({
  sun: '#f59e0b',
  moon: '#60a5fa',
  mercury: '#a78bfa',
  venus: '#ec4899',
  mars: '#ef4444',
  jupiter: '#f97316',
  saturn: '#94a3b8',
  uranus: '#06b6d4',
  neptune: '#2563eb',
  pluto: '#c084fc',
});

const ANGLE_STYLES: Readonly<Record<LocalityAngleId, { readonly dash?: string; readonly width: number }>> =
  Object.freeze({
    mc: { width: 3 },
    ic: { width: 2, dash: '10 6' },
    ascendant: { width: 2.4 },
    descendant: { width: 2.4, dash: '4 5' },
  });

export function LocalityWorldMap({ data }: { readonly data: LocalityMapV1 }) {
  const [selectedBodyId, setSelectedBodyId] = useState<string>('all');
  const projection = geoEquirectangular().fitExtent(
    [
      [18, 18],
      [1182, 582],
    ],
    { type: 'Sphere' },
  );
  const path = geoPath(projection);
  const visibleLines =
    selectedBodyId === 'all' ? data.lines : data.lines.filter(({ bodyId }) => bodyId === selectedBodyId);

  return (
    <figure className="astro-locality-map">
      <fieldset className="astro-locality-map__filters">
        <legend className="sr-only">Filtro de planetas do mapa de localidade</legend>
        <button
          type="button"
          className={selectedBodyId === 'all' ? 'is-active' : ''}
          onClick={() => setSelectedBodyId('all')}
        >
          Todos
        </button>
        {data.bodies.map((body) => (
          <button
            type="button"
            key={body.bodyId}
            className={selectedBodyId === body.bodyId ? 'is-active' : ''}
            onClick={() => setSelectedBodyId(body.bodyId)}
          >
            <span style={{ color: BODY_COLORS[body.bodyId] }} aria-hidden="true">
              {body.symbol}
            </span>{' '}
            {body.displayNamePtBr}
          </button>
        ))}
      </fieldset>

      <svg
        viewBox="0 0 1200 600"
        role="img"
        aria-label="Mapa-múndi com linhas planetárias de localidade"
        className="astro-locality-map__canvas"
      >
        <title>Mapa-múndi com linhas planetárias de localidade</title>
        <defs>
          <linearGradient id="admin-locality-ocean" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#172554" />
            <stop offset="55%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>
        </defs>
        <path d={path({ type: 'Sphere' }) ?? undefined} fill="url(#admin-locality-ocean)" stroke="#334155" />
        <path d={path(geoGraticule10()) ?? undefined} fill="none" stroke="#64748b" strokeOpacity="0.24" />
        <path
          data-world-land="natural-earth-110m"
          d={path(countries) ?? undefined}
          fill="#cbd5e1"
          fillOpacity="0.72"
          stroke="#f8fafc"
          strokeOpacity="0.5"
          strokeWidth="0.55"
        />
        {visibleLines.map((line) => {
          const style = ANGLE_STYLES[line.angleId];
          const geometry = line.geometry as unknown as MultiLineString;
          const label = `${line.bodyDisplayNamePtBr} · ${line.angleDisplayNamePtBr}`;
          return (
            <path
              key={line.recordId}
              data-locality-line={line.recordId}
              d={path(geometry) ?? undefined}
              fill="none"
              stroke={BODY_COLORS[line.bodyId] ?? '#a78bfa'}
              strokeWidth={style.width}
              strokeDasharray={style.dash}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity={line.availability.status === 'unavailable' ? 0.25 : 0.9}
              aria-label={label}
            >
              <title>{label}</title>
            </path>
          );
        })}
      </svg>

      <div className="astro-locality-map__legend">
        <span>
          <strong>Meio do Céu:</strong> contínua forte
        </span>
        <span>
          <strong>Fundo do Céu:</strong> traços longos
        </span>
        <span>
          <strong>Ascendente:</strong> contínua
        </span>
        <span>
          <strong>Descendente:</strong> traços curtos
        </span>
      </div>
      <figcaption>
        Base cartográfica Natural Earth 1:110m, distribuída pelo pacote World Atlas e carregada localmente, sem tiles ou
        rastreamento cartográfico externo.
      </figcaption>
    </figure>
  );
}

# Contrato Tatwa no módulo Astrólogo

## Responsabilidade do admin

O `admin-app/Astrólogo` é consumidor dos dados persistidos pelo `astrologo-app`. Ele não calcula nascer do Sol, não escolhe uma escola de subtatwas e não corrige mapas históricos. Sua responsabilidade é validar defensivamente o formato recebido e explicar, em português do Brasil, qual perspectiva produziu o resultado.

## Formatos reconhecidos

- `schemaVersion: "2.0.0"` e `calculationMode: "fixed"` — **Ordem fixa — Akasha primeiro**;
- `calculationMode: "legacy-rulingFirst"` — **Ordem pelo principal — Tatwa principal primeiro**;
- par `principal`/`sub` válido sem marcadores — **Registro legado — ordem pelo principal**;
- marcador explícito desconhecido — **Método de cálculo não identificado**.

Ausência, JSON inválido ou nomes Tatwa fora do catálogo fazem somente o quadro Tatwa ser omitido. O restante do mapa continua disponível.

## Dados apresentados

Quando presentes e válidos, a tela, o relatório de texto e o HTML/e-mail mostram:

- Tatwa principal e subtatwa;
- método em rótulo pt-BR;
- aviso de subtatwa indicativo;
- margem até a transição principal;
- principal/subtatwa adjacente como possibilidade, nunca como substituição;
- indicação de que existe âncora astronômica persistida.

IDs e chaves técnicas permanecem internos. O admin não expõe `fixed`, `legacy-rulingFirst`, timezone IANA nem instantes UTC como se fossem texto de interface.

## Persistência

O contrato permanece dentro de `dados_globais`, coluna `TEXT` que armazena JSON. Não é necessário `ALTER TABLE` nem migration adicional. Mapas antigos permanecem byte a byte como foram gravados.

## Fonte canônica

A metodologia, as fontes históricas, as decisões de produto, os casos reais e os limites interpretativos são mantidos no repositório produtor:

<https://github.com/LCV-Ideas-Software/astrologo-app/blob/main/docs/METODOLOGIA_TATWAS_E_NUMEROLOGIA.md>

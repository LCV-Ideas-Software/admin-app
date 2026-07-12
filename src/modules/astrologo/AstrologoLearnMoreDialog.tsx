import { CircleHelp, X } from 'lucide-react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/Dialog';

export type AstrologoLearnMoreTopic = 'natalAspects' | 'houseAnalysis' | 'currentTransits' | 'synastry' | 'localityMap';

type LearnMoreContent = {
  readonly buttonLabel: string;
  readonly title: string;
  readonly introduction: string;
  readonly sections: readonly {
    readonly title: string;
    readonly items: readonly string[];
  }[];
  readonly closing: string;
};

const LEARN_MORE_CONTENT: Readonly<Record<AstrologoLearnMoreTopic, LearnMoreContent>> = Object.freeze({
  natalAspects: {
    buttonLabel: 'Aspectos natais',
    title: 'Como ler os Aspectos natais',
    introduction:
      'Um aspecto compara a distância angular entre dois pontos do mapa natal. Ele descreve uma relação geométrica que, na tradição astrológica, recebe uma leitura simbólica.',
    sections: [
      {
        title: 'Ângulo, separação e orbe',
        items: [
          'Cada aspecto possui um ângulo de referência: por exemplo, 0° na Conjunção, 60° no Sextil, 90° na Quadratura, 120° no Trígono e 180° na Oposição.',
          'A separação é a distância realmente observada entre os dois pontos. O orbe é a diferença entre a separação observada e o ângulo exato.',
          'Um orbe menor indica maior proximidade geométrica do aspecto exato. Isso não mede destino, caráter ou intensidade psicológica como uma grandeza científica.',
        ],
      },
      {
        title: 'Fase e intensidade geométrica',
        items: [
          'A fase informa se a relação estava se aproximando da exatidão, já estava exata ou se afastava dela no instante natal.',
          'A porcentagem exibida resume apenas a proximidade dentro do orbe aceito pelo perfil versionado. Ela não é uma nota de importância pessoal.',
        ],
      },
    ],
    closing:
      'Use os aspectos como linguagem simbólica de relações entre posições. O Admin preserva o cálculo original e não acrescenta aspectos que não estejam no artefato canônico.',
  },
  houseAnalysis: {
    buttonLabel: 'Análise das casas',
    title: 'Como ler a Análise das casas',
    introduction:
      'As Casas Placidus dividem o céu local em doze setores dependentes da hora e do lugar de nascimento. Elas não são a mesma coisa que signos ou constelações.',
    sections: [
      {
        title: 'Casa, cúspide e grau mundano',
        items: [
          'A casa ocupada indica em qual setor Placidus o planeta foi localizado. A cúspide é somente o ponto de início desse setor.',
          'O grau no signo vem da longitude tropical. Já o grau mundano indica o avanço do corpo dentro da divisão Placidus, em uma escala própria de 0° a menos de 30°.',
          'O grau mundano é preservado do cálculo especializado; ele não é estimado pelo tamanho do arco entre duas cúspides, pois isso misturaria geometrias diferentes.',
        ],
      },
      {
        title: 'Quando o dado não aparece',
        items: [
          'Hora aproximada e posições próximas de uma cúspide pedem cautela interpretativa.',
          'Se Placidus ou o grau mundano não puderem ser comprovados pelo artefato, o Admin informa a indisponibilidade em vez de inventar um valor.',
        ],
      },
    ],
    closing:
      'Casa, signo tropical e constelação IAU respondem a referências diferentes. Leia cada medida com sua própria metodologia.',
  },
  currentTransits: {
    buttonLabel: 'Céu atual e trânsitos',
    title: 'Como ler o Céu atual e os trânsitos',
    introduction:
      'O céu atual é um retrato calculado para um instante explícito. Os trânsitos comparam essas posições móveis com os pontos preservados no mapa natal.',
    sections: [
      {
        title: 'O que cada linha informa',
        items: [
          'A posição tropical mostra signo e grau. A classificação astronômica mostra a região oficial da IAU, que é uma área irregular e não possui grau interno definido.',
          'A Casa natal indica em qual setor Placidus do mapa de nascimento caiu o planeta em trânsito.',
          'Nos aspectos, o orbe mostra a distância até o ângulo exato; a fase informa aproximação ou afastamento; e a exatidão só aparece quando foi comprovada dentro do horizonte declarado.',
        ],
      },
      {
        title: 'Tempo e limites preditivos',
        items: [
          'O horizonte é uma janela técnica de busca e não a duração prometida de uma influência. Todos os instantes visíveis são convertidos para a Hora oficial de Brasília.',
          'O sistema não completa datas ausentes, não transforma uma aproximação em acontecimento garantido e não apresenta um resultado rejeitado pelo provedor como exato.',
        ],
      },
    ],
    closing:
      'Trânsitos oferecem uma lente simbólica e descritiva. Não substituem contexto, livre escolha nem orientação médica, jurídica, financeira ou profissional.',
  },
  synastry: {
    buttonLabel: 'Sinastria',
    title: 'Como ler a Sinastria',
    introduction:
      'A sinastria compara dois mapas natais completos. Ela observa relações angulares entre os corpos e a passagem simbólica dos corpos de uma pessoa pelas casas da outra.',
    sections: [
      {
        title: 'Aspectos entre os dois mapas',
        items: [
          'Cada aspecto intermapa liga um corpo de A a um corpo de B e informa separação e orbe conforme um perfil versionado.',
          'O mesmo par é mostrado uma única vez. O resultado não vira pontuação, nota ou porcentagem de compatibilidade.',
        ],
      },
      {
        title: 'Sobreposições recíprocas',
        items: [
          'A lista A nas casas de B usa as Casas Placidus de B. A lista B nas casas de A usa as Casas Placidus de A.',
          'As duas direções são mantidas porque as casas natais não são intercambiáveis. Os rótulos A e B identificam os sujeitos, sem criar hierarquia entre eles.',
          'Os dados da segunda pessoa exigem ciência e consentimento apropriados; o resultado não diagnostica nem determina o destino da relação.',
        ],
      },
    ],
    closing:
      'Leia a sinastria como vocabulário simbólico de afinidades, contrastes e experiências possíveis, nunca como sentença sobre duas pessoas.',
  },
  localityMap: {
    buttonLabel: 'Mapa planetário de localidade',
    title: 'Como ler o Mapa planetário de localidade',
    introduction:
      'Este mapa projeta sobre a Terra onde cada planeta estava ligado aos quatro ângulos principais no instante natal: Ascendente, Descendente, Meio do Céu e Fundo do Céu.',
    sections: [
      {
        title: 'O que as linhas representam',
        items: [
          'Cada corpo pode produzir quatro famílias de linhas. Elas são relações geométricas globais calculadas para o mesmo instante de nascimento.',
          'A base Natural Earth serve apenas para orientação visual. O mapa é carregado localmente, sem tiles externos e sem enviar dados natais a um provedor cartográfico.',
          'A transformação de coordenadas e a resolução declarada limitam a precisão; aumentar visualmente o mapa não cria precisão astronômica adicional.',
        ],
      },
      {
        title: 'Como usar com cautela',
        items: [
          'A proximidade visual de uma linha não é uma fronteira física nem um campo mensurável. O contrato atual não define um raio de influência.',
          'O mapa não recomenda mudança, viagem, investimento ou moradia. Decisões reais também dependem de segurança, saúde, vínculos, legislação, custo e condições locais.',
        ],
      },
    ],
    closing:
      'Use a cartografia como uma lente simbólica adicional e confira sempre o planeta, o ângulo, a escala e a proveniência da linha observada.',
  },
});

export function AstrologoLearnMoreDialog({ topic }: { readonly topic: AstrologoLearnMoreTopic }) {
  const content = LEARN_MORE_CONTENT[topic];
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className={`astro-learn-more__trigger astro-learn-more__trigger--${topic}`}
          aria-label={`Saiba mais sobre ${content.buttonLabel}`}
        >
          <CircleHelp size={16} aria-hidden="true" /> Saiba mais
        </button>
      </DialogTrigger>
      <DialogContent className="astro-learn-more__dialog" overlayClassName="astro-learn-more__overlay">
        <header className="astro-learn-more__header">
          <span aria-hidden="true">
            <CircleHelp size={22} />
          </span>
          <div>
            <DialogTitle>{content.title}</DialogTitle>
            <DialogDescription>{content.introduction}</DialogDescription>
          </div>
          <DialogClose asChild>
            <button type="button" className="astro-learn-more__close-icon" aria-label="Fechar janela de explicação">
              <X size={20} aria-hidden="true" />
            </button>
          </DialogClose>
        </header>

        <div className="astro-learn-more__body">
          {content.sections.map((section) => (
            <section key={section.title}>
              <h3>{section.title}</h3>
              <ul>
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
          <p className="astro-learn-more__closing">{content.closing}</p>
        </div>

        <footer className="astro-learn-more__footer">
          <DialogClose asChild>
            <button type="button" className="astro-learn-more__close-button" aria-label="Fechar explicação">
              Fechar
            </button>
          </DialogClose>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

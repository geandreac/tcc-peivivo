/**
 * D-43 — vocabulário escolar (4º/5º ano) para o glossário "Palavras para saber".
 *
 * Curado à mão, local, sem rede nem IA (vale com RN06). `dificuldade` diz a
 * partir de qual nível de vocabulário a palavra deixa de precisar de
 * explicação: com `BASICO` aparecem as de dificuldade INTERMEDIARIO e
 * ORIGINAL; com `INTERMEDIARIO`, só as ORIGINAL; com `ORIGINAL`, nenhuma.
 * `formas` lista singular, plural e flexões que contam como a mesma palavra.
 */
import type { NivelVocabulario } from "./tipos";

export interface EntradaVocabulario {
  termo: string;
  formas: string[];
  explicacao: string;
  dificuldade: Exclude<NivelVocabulario, "BASICO">;
}

export const VOCABULARIO: readonly EntradaVocabulario[] = [
  // Ciências
  { termo: "ciclo", formas: ["ciclo", "ciclos"], explicacao: "Algo que acontece e depois começa de novo, sempre na mesma ordem.", dificuldade: "INTERMEDIARIO" },
  { termo: "contínuo", formas: ["contínuo", "contínua", "contínuos", "contínuas"], explicacao: "Que não para; continua sem interrupção.", dificuldade: "INTERMEDIARIO" },
  { termo: "evaporar", formas: ["evapora", "evaporam", "evaporar", "evaporou", "evaporação"], explicacao: "Quando a água esquenta e vira vapor, que sobe para o céu.", dificuldade: "INTERMEDIARIO" },
  { termo: "vapor", formas: ["vapor", "vapores"], explicacao: "Água tão leve, em forma de fumacinha, que sobe pelo ar.", dificuldade: "INTERMEDIARIO" },
  { termo: "condensação", formas: ["condensação", "condensa", "condensar"], explicacao: "Quando o vapor esfria e volta a virar gotinhas de água.", dificuldade: "ORIGINAL" },
  { termo: "precipitação", formas: ["precipitação", "precipitações"], explicacao: "Água que cai do céu: chuva, neve ou granizo.", dificuldade: "ORIGINAL" },
  { termo: "granizo", formas: ["granizo"], explicacao: "Chuva de pedrinhas de gelo.", dificuldade: "INTERMEDIARIO" },
  { termo: "solo", formas: ["solo", "solos"], explicacao: "A terra onde pisamos e onde as plantas crescem.", dificuldade: "INTERMEDIARIO" },
  { termo: "fotossíntese", formas: ["fotossíntese"], explicacao: "Jeito que a planta usa a luz do sol, a água e o ar para fazer o próprio alimento.", dificuldade: "ORIGINAL" },
  { termo: "oxigênio", formas: ["oxigênio"], explicacao: "Parte do ar que respiramos e de que precisamos para viver.", dificuldade: "INTERMEDIARIO" },
  { termo: "ecossistema", formas: ["ecossistema", "ecossistemas"], explicacao: "Lugar onde plantas, animais e outros seres vivem juntos, um precisando do outro.", dificuldade: "ORIGINAL" },
  { termo: "habitat", formas: ["habitat", "habitats"], explicacao: "Lugar onde um animal ou uma planta vive naturalmente.", dificuldade: "ORIGINAL" },
  { termo: "mamífero", formas: ["mamífero", "mamíferos"], explicacao: "Animal que mama o leite da mãe quando é filhote, como o cachorro e a baleia.", dificuldade: "INTERMEDIARIO" },
  { termo: "herbívoro", formas: ["herbívoro", "herbívoros"], explicacao: "Animal que come só plantas.", dificuldade: "ORIGINAL" },
  { termo: "carnívoro", formas: ["carnívoro", "carnívoros"], explicacao: "Animal que come a carne de outros animais.", dificuldade: "INTERMEDIARIO" },
  { termo: "fóssil", formas: ["fóssil", "fósseis"], explicacao: "Resto ou marca de um ser vivo muito antigo que ficou guardado na pedra.", dificuldade: "INTERMEDIARIO" },
  { termo: "extinção", formas: ["extinção", "extinto", "extinta", "extintos", "extintas"], explicacao: "Quando não existe mais nenhum ser vivo daquele tipo.", dificuldade: "ORIGINAL" },
  { termo: "espécie", formas: ["espécie", "espécies"], explicacao: "Grupo de seres vivos do mesmo tipo, que podem ter filhotes entre si.", dificuldade: "ORIGINAL" },
  { termo: "nutriente", formas: ["nutriente", "nutrientes"], explicacao: "Parte do alimento que o corpo usa para crescer e ter energia.", dificuldade: "ORIGINAL" },
  // Matemática
  { termo: "fração", formas: ["fração", "frações"], explicacao: "Número que mostra uma parte de algo inteiro, como metade de uma pizza.", dificuldade: "INTERMEDIARIO" },
  { termo: "numerador", formas: ["numerador", "numeradores"], explicacao: "Número de cima da fração: diz quantas partes pegamos.", dificuldade: "INTERMEDIARIO" },
  { termo: "denominador", formas: ["denominador", "denominadores"], explicacao: "Número de baixo da fração: diz em quantas partes iguais o inteiro foi dividido.", dificuldade: "INTERMEDIARIO" },
  { termo: "retângulo", formas: ["retângulo", "retângulos"], explicacao: "Figura com quatro lados e quatro cantos retos, como uma porta.", dificuldade: "INTERMEDIARIO" },
  { termo: "perímetro", formas: ["perímetro", "perímetros"], explicacao: "A medida de toda a volta de uma figura.", dificuldade: "ORIGINAL" },
  { termo: "dezena", formas: ["dezena", "dezenas"], explicacao: "Um grupo de 10.", dificuldade: "INTERMEDIARIO" },
  { termo: "centena", formas: ["centena", "centenas"], explicacao: "Um grupo de 100.", dificuldade: "INTERMEDIARIO" },
  { termo: "dobro", formas: ["dobro"], explicacao: "Duas vezes a mesma quantidade.", dificuldade: "INTERMEDIARIO" },
  { termo: "triplo", formas: ["triplo"], explicacao: "Três vezes a mesma quantidade.", dificuldade: "INTERMEDIARIO" },
  { termo: "quociente", formas: ["quociente", "quocientes"], explicacao: "O resultado de uma conta de dividir.", dificuldade: "ORIGINAL" },
  { termo: "parcela", formas: ["parcela", "parcelas"], explicacao: "Cada número que somamos numa conta de mais.", dificuldade: "ORIGINAL" },
  { termo: "algarismo", formas: ["algarismo", "algarismos"], explicacao: "Cada símbolo usado para escrever números: 0, 1, 2, 3, 4, 5, 6, 7, 8 e 9.", dificuldade: "INTERMEDIARIO" },
  { termo: "equivalente", formas: ["equivalente", "equivalentes"], explicacao: "Que vale a mesma coisa, mesmo escrito de outro jeito.", dificuldade: "ORIGINAL" },
  // Língua Portuguesa
  { termo: "sinônimo", formas: ["sinônimo", "sinônimos"], explicacao: "Palavra que quer dizer a mesma coisa que outra, como alegre e feliz.", dificuldade: "INTERMEDIARIO" },
  { termo: "antônimo", formas: ["antônimo", "antônimos"], explicacao: "Palavra que quer dizer o contrário de outra, como alto e baixo.", dificuldade: "INTERMEDIARIO" },
  { termo: "substantivo", formas: ["substantivo", "substantivos"], explicacao: "Palavra que dá nome a pessoas, animais, lugares e coisas.", dificuldade: "INTERMEDIARIO" },
  { termo: "adjetivo", formas: ["adjetivo", "adjetivos"], explicacao: "Palavra que diz como algo é, como bonito, grande ou azul.", dificuldade: "INTERMEDIARIO" },
  { termo: "verbo", formas: ["verbo", "verbos"], explicacao: "Palavra que mostra uma ação, como correr, comer ou pular.", dificuldade: "INTERMEDIARIO" },
  { termo: "sílaba", formas: ["sílaba", "sílabas"], explicacao: "Pedacinho da palavra que falamos de uma vez só: ca-sa tem duas sílabas.", dificuldade: "INTERMEDIARIO" },
  { termo: "parágrafo", formas: ["parágrafo", "parágrafos"], explicacao: "Parte de um texto que começa numa linha nova.", dificuldade: "INTERMEDIARIO" },
  { termo: "enunciado", formas: ["enunciado", "enunciados"], explicacao: "Texto que explica o que a atividade pede para fazer.", dificuldade: "ORIGINAL" },
  // Geografia e História
  { termo: "relevo", formas: ["relevo", "relevos"], explicacao: "As formas do chão da Terra: montanhas, morros, planícies e vales.", dificuldade: "ORIGINAL" },
  { termo: "clima", formas: ["clima", "climas"], explicacao: "Como o tempo costuma ser num lugar ao longo do ano: quente, frio, chuvoso ou seco.", dificuldade: "INTERMEDIARIO" },
  { termo: "população", formas: ["população", "populações"], explicacao: "Todas as pessoas que moram num lugar.", dificuldade: "INTERMEDIARIO" },
  { termo: "território", formas: ["território", "territórios"], explicacao: "Área de terra que pertence a um país, estado ou cidade.", dificuldade: "ORIGINAL" },
  { termo: "indígena", formas: ["indígena", "indígenas"], explicacao: "Povos que já viviam no Brasil antes de os portugueses chegarem.", dificuldade: "INTERMEDIARIO" },
  { termo: "colonização", formas: ["colonização"], explicacao: "Quando um povo chega a uma terra e passa a mandar nela.", dificuldade: "ORIGINAL" },
  { termo: "século", formas: ["século", "séculos"], explicacao: "Um período de 100 anos.", dificuldade: "INTERMEDIARIO" },
  { termo: "continente", formas: ["continente", "continentes"], explicacao: "Grande pedaço de terra cercado por oceanos, como a América e a África.", dificuldade: "INTERMEDIARIO" },
  { termo: "oceano", formas: ["oceano", "oceanos"], explicacao: "Imensa parte de água salgada que cobre boa parte da Terra.", dificuldade: "INTERMEDIARIO" },
  { termo: "afluente", formas: ["afluente", "afluentes"], explicacao: "Rio menor que leva suas águas para um rio maior.", dificuldade: "ORIGINAL" },
];

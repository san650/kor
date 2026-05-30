// Per-character Achievement sheets (Tainted Grail: Reyes de la Perdición).
// Source: ES_TG_KoR_EoR_Achievments_Sheets PDF, transcribed verbatim into
// JSON. Each hero owns 3 Secret Cards × 3 Recuerdos = 9 achievements.
//
// The `heroIdx` field matches the global CHARACTER_NAMES order in app.js
// so the Andanzas renderer can pair the sheet with the active player card
// without name lookups. Don't reorder this array.

export const ACHIEVEMENTS = [
  {
    heroIdx: 0,
    name: 'Elgan',
    secret: 'Un poder superior',
    cards: [
      {
        carta: 310,
        recuerdos: [
          { n: 1, momento: 'Durante el Fin del Día',
            condicion: 'Todas las Localizaciones en juego tienen su cara de rareza bocarriba.' },
          { n: 2, momento: 'Durante el Día',
            condicion: 'Viaja a «Calzadas Inundadas» (122).' },
          { n: 3, momento: 'Durante el Día',
            condicion: 'Realiza «Activar una Roca Guía» en una Localización que ya tenga una Roca Guía.' },
        ],
      },
      {
        carta: 311,
        recuerdos: [
          { n: 4, momento: 'En cualquier momento',
            condicion: 'Ten al menos 8 de Magia.' },
          { n: 5, momento: 'Durante la Diplomacia',
            condicion: 'Resuelve la bonificación verde durante un Encuentro azul de dificultad 3 o 4.' },
          { n: 6, momento: 'Durante un Encuentro',
            condicion: 'Ten al menos 3 [iconos azules] en la Secuencia.' },
        ],
      },
      {
        carta: 312,
        recuerdos: [
          { n: 7, momento: 'Durante el Combate',
            condicion: 'Ten al menos 3 cartas Raravela en la Secuencia.' },
          { n: 8, momento: 'Durante el Fin del Día',
            condicion: 'Sufre por la Rareza en una de las Localizaciones del «Bosque Errante» (113, 114 o 115).' },
          { n: 9, momento: 'Durante el Día',
            condicion: 'Usa 2 Objetos Consumibles «Raravela» durante el mismo Día.' },
        ],
      },
    ],
  },
  {
    heroIdx: 1,
    name: 'Gerdwyn',
    secret: 'Llama del ayer',
    cards: [
      {
        carta: 314,
        recuerdos: [
          { n: 1, momento: 'En cualquier momento',
            condicion: 'Ten al menos 10 de Riqueza.' },
          { n: 2, momento: 'Durante el Día',
            condicion: 'Estás en «Tierras del Sur» (125).' },
          { n: 3, momento: 'Durante el Día',
            condicion: 'Pierde 2 de Energía durante el mismo Día debido a tu Debilidad, «Sobrecargada».' },
        ],
      },
      {
        carta: 315,
        recuerdos: [
          { n: 4, momento: 'Durante la Diplomacia',
            condicion: 'Resuelve una bonificación verde mientras «Estás enloqueciendo».' },
          { n: 5, momento: 'En cualquier momento',
            condicion: 'Ten al menos 4 puntos en cualquier Atributo.' },
          { n: 6, momento: 'Durante el Combate',
            condicion: 'Gana un Encuentro púrpura tras usar tu acción de personaje, «Cazar».' },
        ],
      },
      {
        carta: 316,
        recuerdos: [
          { n: 7, momento: 'En cualquier momento',
            condicion: 'Ten al menos 2 Objetos de tipo «Escudo».' },
          { n: 8, momento: 'Durante el Combate',
            condicion: 'Gana el Encuentro «Caballero de la Mesa Ovalada».' },
          { n: 9, momento: 'Durante el Combate',
            condicion: 'Gana un Encuentro de Combate agotando todas las cartas de tu mazo.' },
        ],
      },
    ],
  },
  {
    heroIdx: 2,
    name: 'Iunis',
    secret: 'La gran actuación',
    cards: [
      {
        carta: 318,
        recuerdos: [
          { n: 1, momento: 'Durante el Combate',
            condicion: 'Gana un Encuentro quedándote exactamente con 1 de Energía.' },
          { n: 2, momento: 'Durante la Diplomacia',
            condicion: 'Resuelve una bonificación verde mientras «Estás enloqueciendo».' },
          { n: 3, momento: 'En cualquier momento',
            condicion: 'Ten al menos 8 de Comida.' },
        ],
      },
      {
        carta: 319,
        recuerdos: [
          { n: 4, momento: 'Durante un Encuentro',
            condicion: 'Pierde 4 o más de Energía en la misma activación debido a los efectos de tus cartas.' },
          { n: 5, momento: 'Durante un Encuentro',
            condicion: 'Juega 5 o más cartas durante la misma activación.' },
          { n: 6, momento: 'Durante el Día',
            condicion: 'Viaja a «Sendero de la Servidumbre» (150).' },
        ],
      },
      {
        carta: 320,
        recuerdos: [
          { n: 7, momento: 'Durante el Día',
            condicion: 'Usa tu acción de personaje, «Festín aterrador», mientras está Agotado.' },
          { n: 8, momento: 'En cualquier momento',
            condicion: 'Hay 3 Rocas Guía en juego.' },
          { n: 9, momento: 'Durante la Exploración',
            condicion: 'Usa el Transporte costero fomoré en la Localización 151, 156 o 160.' },
        ],
      },
    ],
  },
  {
    heroIdx: 3,
    name: 'Osbert',
    secret: 'El regreso del hijo pródigo',
    cards: [
      {
        carta: 322,
        recuerdos: [
          { n: 1, momento: 'Durante el Combate',
            condicion: 'Gana un Encuentro.' },
          { n: 2, momento: 'En cualquier momento',
            condicion: 'Ten una Carta de Secreto de Compañero (304, 305, 307 o 308).' },
          { n: 3, momento: 'En cualquier momento',
            condicion: 'Saca un 6 en un dado.' },
        ],
      },
      {
        carta: 323,
        recuerdos: [
          { n: 4, momento: 'En cualquier momento',
            condicion: 'Ten al menos 10 de Riqueza.' },
          { n: 5, momento: 'Durante el Día',
            condicion: 'Viaja teniendo 1 de Energía o menos.' },
          { n: 6, momento: 'Durante un Encuentro',
            condicion: 'Obtén al menos [2 iconos rojos] o [2 flechas hacia arriba] de 1 sola bonificación [icono azul].' },
        ],
      },
      {
        carta: 324,
        recuerdos: [
          { n: 7, momento: 'En cualquier momento',
            condicion: 'Ten los 3 Objetos Consumibles listados en tu acción de personaje, «Artesanía».' },
          { n: 8, momento: 'Durante el Día',
            condicion: 'Viaja a «Granjas Apacibles» (134).' },
          { n: 9, momento: 'Durante la Diplomacia',
            condicion: 'Resuelve la bonificación verde durante un Encuentro azul en una Localización con [icono negro].' },
        ],
      },
    ],
  },
];

// Stable key for the persisted achievements map. Encodes the hero, the
// secret-card number, and the recuerdo position so the key remains valid
// even if the source PDF reshuffles its rows in a future revision.
export const achievementKey = (heroIdx, carta, recuerdo) =>
  `${heroIdx}:${carta}:${recuerdo}`;

// Lookup the sheet for a given hero index. Returns undefined for unknown
// heroes so callers can defensively skip.
export const sheetForHero = (heroIdx) =>
  ACHIEVEMENTS.find((s) => s.heroIdx === heroIdx);

// Roman-numeral plate for I..IX. The Recuerdo number is always 1..9, so
// a flat table is simpler than a generic roman() helper.
export const RECUERDO_NUMERALS = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];

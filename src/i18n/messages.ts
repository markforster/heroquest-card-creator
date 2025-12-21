export type SupportedLanguage = "en" | "fr" | "de" | "es" | "it" | "pt" | "nl";

type Messages = Record<string, string>;
export type MessageKey = keyof (typeof baseMessages)["en"];

const baseMessages = {
  en: {
    "app.title": "HeroQuest Card Creator",
    "actions.template": "Template",
    "actions.exportPng": "Export",

    "stats.attackDice": "Attack Dice",
    "stats.defendDice": "Defend Dice",
    "stats.bodyPoints": "Body Points",
    "stats.body": "Body",
    "stats.mindPoints": "Mind Points",
    "stats.mind": "Mind",
    "stats.movementSquares": "Movement Squares",
  },

  fr: {
    "app.title": "Créateur de cartes HeroQuest",
    "actions.template": "Modèle",
    "actions.exportPng": "Exporter en PNG",

    "stats.attackDice": "Dés d'attaque",
    "stats.defendDice": "Dés de défense",
    "stats.bodyPoints": "Points de corps",
    "stats.body": "Corps",
    "stats.mindPoints": "Points d'esprit",
    "stats.mind": "Esprit",
    "stats.movementSquares": "Cases de mouvement",
  },

  de: {
    "app.title": "HeroQuest-Karteneditor",
    "actions.template": "Vorlage",
    "actions.exportPng": "PNG exportieren",

    "stats.attackDice": "Angriffswürfel",
    "stats.defendDice": "Verteidigungswürfel",
    "stats.bodyPoints": "Körperpunkte",
    "stats.body": "Körper",
    "stats.mindPoints": "Geistpunkte",
    "stats.mind": "Geist",
    "stats.movementSquares": "Bewegungsfelder",
  },

  es: {
    "app.title": "Creador de cartas HeroQuest",
    "actions.template": "Plantilla",
    "actions.exportPng": "Exportar PNG",

    "stats.attackDice": "Dados de ataque",
    "stats.defendDice": "Dados de defensa",
    "stats.bodyPoints": "Puntos de cuerpo",
    "stats.body": "Cuerpo",
    "stats.mindPoints": "Puntos de mente",
    "stats.mind": "Mente",
    "stats.movementSquares": "Casillas de movimiento",
  },

  it: {
    "app.title": "Creatore di carte HeroQuest",
    "actions.template": "Modello",
    "actions.exportPng": "Esporta PNG",

    "stats.attackDice": "Dadi di attacco",
    "stats.defendDice": "Dadi di difesa",
    "stats.bodyPoints": "Punti corpo",
    "stats.body": "Corpo",
    "stats.mindPoints": "Punti mente",
    "stats.mind": "Mente",
    "stats.movementSquares": "Caselle di movimento",
  },

  pt: {
    "app.title": "Criador de cartas HeroQuest",
    "actions.template": "Modelo",
    "actions.exportPng": "Exportar PNG",

    "stats.attackDice": "Dados de ataque",
    "stats.defendDice": "Dados de defesa",
    "stats.bodyPoints": "Pontos de corpo",
    "stats.body": "Corpo",
    "stats.mindPoints": "Pontos de mente",
    "stats.mind": "Mente",
    "stats.movementSquares": "Casas de movimento",
  },

  nl: {
    "app.title": "HeroQuest-kaartenmaker",
    "actions.template": "Sjabloon",
    "actions.exportPng": "PNG exporteren",

    "stats.attackDice": "Aanvalsdobbelstenen",
    "stats.defendDice": "Verdedigingsdobbelstenen",
    "stats.bodyPoints": "Lichaamspunten",
    "stats.body": "Lichaam",
    "stats.mindPoints": "Geestpunten",
    "stats.mind": "Geest",
    "stats.movementSquares": "Bewegingsvakken",
  },
} satisfies Record<SupportedLanguage, Messages>;

export const messages = baseMessages;

export const supportedLanguages = Object.keys(baseMessages) as SupportedLanguage[];

export const languageLabels: Record<SupportedLanguage, string> = {
  en: "EN",
  fr: "FR",
  de: "DE",
  es: "ES",
  it: "IT",
  pt: "PT",
  nl: "NL",
};

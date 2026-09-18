import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

/**
 * A deliberately small i18n layer.
 *
 * The surfaces a visitor meets before they have an account — top bar, landing,
 * how-it-works, footer, menu — are fully translated. The deep member forms
 * (create circle, join, wallet card) stay English for now and say so: a
 * half-translated form is worse than an honest English one, and the corridor
 * this product serves (Spanish and Portuguese-speaking Latin America) meets
 * exactly those first surfaces. `en` is the fallback for any missing key.
 */
export type Lang = "en" | "es" | "pt";

const DICT: Record<Lang, Record<string, string>> = {
  en: {
    "tagline.suffix": "the savings circle with no pot to steal",
    "hero.kicker": "Savings circles on Stellar",
    "hero.emptyTitle": "No circles yet",
    "hero.emptySub":
      "Members pay each other directly in USDC, so there is no pot and nobody holding it.",
    "hero.startKicker": "No circle on this device",
    "hero.emptySub2": "Start one and it opens here — amount, cadence, members, rotation order.",
    "action.signIn": "Sign in",
    "action.start": "Start a circle",
    "action.how": "How it works",
    "how.sub": "A savings circle with no cash box.",
    "action.new": "New circle",
    "action.menu": "Menu",
    "action.refreshBalance": "Refresh balance",
    "action.signOut": "Sign out",
    "step.contribute": "Contribute",
    "step.contributeBody": "Every member except the recipient pays them, wallet to wallet.",
    "step.settle": "Settle",
    "step.settleBody": "USDC on Stellar — seconds, for a hundredth of a cent.",
    "step.verify": "Verify",
    "step.verifyBody": "Each payment is a public transaction anyone can open.",
    "table.title": "The difference",
    "table.traditional": "Traditional circle",
    "table.onsusunaku": "On Susunaku",
    "row.holds": "Who holds the money",
    "row.holds.old": "The organiser",
    "row.holds.new": "Nobody",
    "row.record": "The record",
    "row.record.old": "A notebook",
    "row.record.new": "The chain",
    "row.abroad": "A member abroad",
    "row.abroad.old": "Locked out",
    "row.abroad.new": "In the circle",
    "row.leaves": "If the organiser leaves",
    "row.leaves.old": "Savings gone",
    "row.leaves.new": "Nothing to take",
    "chips.title": "Same institution, two continents",
    "real.title": "What is real today, and what is not",
    "real.working": "Working now",
    "real.gaps": "Honest gaps",
    "footer.how": "How it works",
    "footer.setup": "Network & key",
    "lang.name": "English",
    "lang.untranslated": "Some member forms are English-only for now.",
  },
  es: {
    "tagline.suffix": "el círculo de ahorro sin caja que robar",
    "hero.kicker": "Círculos de ahorro en Stellar",
    "hero.emptyTitle": "Aún no hay círculos",
    "hero.emptySub":
      "Los miembros se pagan directamente en USDC: no hay bote ni nadie que lo guarde.",
    "hero.startKicker": "Sin círculo en este dispositivo",
    "hero.emptySub2":
      "Crea uno y se abre aquí — monto, frecuencia, miembros y orden de rotación.",
    "action.signIn": "Iniciar sesión",
    "action.start": "Crear un círculo",
    "action.how": "Cómo funciona",
    "how.sub": "Un círculo de ahorro sin caja de efectivo.",
    "action.new": "Nuevo círculo",
    "action.menu": "Menú",
    "action.refreshBalance": "Actualizar saldo",
    "action.signOut": "Cerrar sesión",
    "step.contribute": "Aportar",
    "step.contributeBody": "Todos los miembros pagan directamente al receptor, billetera a billetera.",
    "step.settle": "Liquidar",
    "step.settleBody": "USDC en Stellar — segundos, por una centésima de centavo.",
    "step.verify": "Verificar",
    "step.verifyBody": "Cada pago es una transacción pública que cualquiera puede abrir.",
    "table.title": "La diferencia",
    "table.traditional": "Círculo tradicional",
    "table.onsusunaku": "En Susunaku",
    "row.holds": "Quién guarda el dinero",
    "row.holds.old": "El organizador",
    "row.holds.new": "Nadie",
    "row.record": "El registro",
    "row.record.old": "Un cuaderno",
    "row.record.new": "La cadena",
    "row.abroad": "Un miembro en el extranjero",
    "row.abroad.old": "Excluido",
    "row.abroad.new": "En el círculo",
    "row.leaves": "Si el organizador se va",
    "row.leaves.old": "Ahorros perdidos",
    "row.leaves.new": "Nada que robar",
    "chips.title": "La misma institución, dos continentes",
    "real.title": "Qué es real hoy, y qué no",
    "real.working": "Funciona hoy",
    "real.gaps": "Lagunas honestas",
    "footer.how": "Cómo funciona",
    "footer.setup": "Red y clave",
    "lang.name": "Español",
    "lang.untranslated": "Algunos formularios de socio están solo en inglés por ahora.",
  },
  pt: {
    "tagline.suffix": "o círculo de poupança sem cofre para roubar",
    "hero.kicker": "Círculos de poupança na Stellar",
    "hero.emptyTitle": "Ainda não há círculos",
    "hero.emptySub":
      "Os membros se pagam diretamente em USDC: não há cofre nem ninguém guardando.",
    "hero.startKicker": "Sem círculo neste dispositivo",
    "hero.emptySub2":
      "Crie um e ele abre aqui — valor, frequência, membros e ordem de rotação.",
    "action.signIn": "Entrar",
    "action.start": "Criar um círculo",
    "action.how": "Como funciona",
    "how.sub": "Um círculo de poupança sem caixa de dinheiro.",
    "action.new": "Novo círculo",
    "action.menu": "Menu",
    "action.refreshBalance": "Atualizar saldo",
    "action.signOut": "Sair",
    "step.contribute": "Contribuir",
    "step.contributeBody": "Todos os membros pagam ao recebedor diretamente, carteira a carteira.",
    "step.settle": "Liquidar",
    "step.settleBody": "USDC na Stellar — segundos, por um centésimo de centavo.",
    "step.verify": "Verificar",
    "step.verifyBody": "Cada pagamento é uma transação pública que qualquer um pode abrir.",
    "table.title": "A diferença",
    "table.traditional": "Círculo tradicional",
    "table.onsusunaku": "No Susunaku",
    "row.holds": "Quem guarda o dinheiro",
    "row.holds.old": "O organizador",
    "row.holds.new": "Ninguém",
    "row.record": "O registro",
    "row.record.old": "Um caderno",
    "row.record.new": "A cadeia",
    "row.abroad": "Um membro no exterior",
    "row.abroad.old": "Excluído",
    "row.abroad.new": "No círculo",
    "row.leaves": "Se o organizador sai",
    "row.leaves.old": "Poupança perdida",
    "row.leaves.new": "Nada para roubar",
    "chips.title": "A mesma instituição, dois continentes",
    "real.title": "O que é real hoje, e o que não é",
    "real.working": "Funcionando hoje",
    "real.gaps": "Lacunas honestas",
    "footer.how": "Como funciona",
    "footer.setup": "Rede e chave",
    "lang.name": "Português",
    "lang.untranslated": "Alguns formulários de membro estão apenas em inglês por enquanto.",
  },
};

const STORAGE_KEY = "susunaku.lang";
const LANGS: Lang[] = ["en", "es", "pt"];

function detect(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (saved && LANGS.includes(saved)) return saved;
    const nav = navigator.language.slice(0, 2) as Lang;
    return LANGS.includes(nav) ? nav : "en";
  } catch {
    return "en";
  }
}

interface I18n {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const Ctx = createContext<I18n>({ lang: "en", setLang: () => {}, t: (k) => DICT.en[k] ?? k });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detect);

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* private mode: the choice just does not persist */
    }
  }, [lang]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);
  const t = useCallback((key: string) => DICT[lang][key] ?? DICT.en[key] ?? key, [lang]);

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useLang() {
  return useContext(Ctx);
}

export const LANG_OPTIONS: { value: Lang; label: string }[] = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "pt", label: "Português" },
];

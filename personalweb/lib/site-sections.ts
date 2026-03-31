export type SiteSection = {
  href: string;
  sectionId: string;
  title: string;
  eyebrow: string;
  description: string;
  summary: string;
  details: string[];
  visual: {
    kicker: string;
    title: string;
    caption: string;
    cards: Array<{
      label: string;
      value: string;
    }>;
    gradientClass: string;
    glowPrimaryClass: string;
    glowSecondaryClass: string;
    badgeClass: string;
    valueClass: string;
  };
};

export const SITE_SECTIONS: SiteSection[] = [
  {
    href: "/fotos",
    sectionId: "fotos",
    title: "Fotos",
    eyebrow: "PhotoTeka",
    description:
      "Miles de fotos de peña que me mola mucho y seguro a ti también. El Rock en imágenes.",
    summary: "Archivo fotográfico navegable por páginas.",
    details: [
      "Cuando encuentro fotos que me dicen algo por que sale ese artista al que admiro, esa banda que es leyenda. Pa la saca...",
      "Algunas son mías disfrutando de esos bolos inolvidables pero que nunca viene mal recordar con nostalgia y orgullo.",
    ],
    visual: {
      kicker: "Archivo vivo",
      title: "Una galería para entrar, filtrar y seguir tirando del hilo.",
      caption:
        "Fotos, personas, fechas y detalles repartidos en una vista propia.",
      cards: [
        { label: "Explora", value: "Personas" },
        { label: "Refina", value: "Fechas" },
        { label: "Contexto", value: "Grupos" },
      ],
      gradientClass: "from-cyan-400/20 via-sky-400/10 to-emerald-300/18",
      glowPrimaryClass: "bg-cyan-300/30",
      glowSecondaryClass: "bg-emerald-300/22",
      badgeClass: "border-cyan-200/30 bg-cyan-300/14 text-cyan-100",
      valueClass: "text-cyan-100",
    },
  },
  {
    href: "/conciertos",
    sectionId: "conciertos",
    title: "Conciertos",
    eyebrow: "Directo",
    description:
      "Toda una vida de bolos da para mucho y aqui hay buena parte de lo mejor de ese camino que espero nunca termine...",
    summary: "",
    details: [
      "Parte de mis recuerdos en tantos conciertos, tantos festivales rodeado siempre de amigos, la familia rockera, la magia que siempre envuelve un buen bolo.",
      "Puede que en alguna salgas hasta tú mismo, búscate por si acaso.",
      "Y si estuviste pero no sales da igual, lo disfrutamos juntos!",
    ],
    visual: {
      kicker: "Memoria en directo",
      title: "Fechas, ciudades y ruido de escenario en una línea temporal propia.",
      caption:
        "Una puerta específica para revisar conciertos y su contexto.",
      cards: [
        { label: "Cruza", value: "Ciudades" },
        { label: "Ordena", value: "Años" },
        { label: "Encuentra", value: "Grupos" },
      ],
      gradientClass: "from-amber-300/24 via-orange-400/12 to-rose-400/18",
      glowPrimaryClass: "bg-amber-300/26",
      glowSecondaryClass: "bg-rose-300/22",
      badgeClass: "border-amber-200/30 bg-amber-300/12 text-amber-50",
      valueClass: "text-amber-50",
    },
  },
  {
    href: "/cds",
    sectionId: "cds",
    title: "CDs",
    eyebrow: "Discoteca",
    description:
      "Hubo un tiempo en que esto era lo mas moderno y esta es mi colección que ya no puedo escuchar en el coche...",
    summary: "",
    details: [
      "44.1 KHz de calidad que aun son un estandard.",
      "El cargador del coche cargado de ilusiones y mucha kaña.",
      "El streaming se lo llevó todo por delante pero aqui siguen conmigo y seguirán.",
    ],
    visual: {
      kicker: "Discoteca física",
      title: "CDs ordenados como una colección perdida en el tiempo pero siempre presente",
      caption: "",
      cards: [
        { label: "Filtra", value: "Grupo" },
        { label: "Recorre", value: "Años" },
        { label: "Relaciona", value: "Spotify" },
      ],
      gradientClass: "from-sky-400/22 via-indigo-400/10 to-fuchsia-400/18",
      glowPrimaryClass: "bg-sky-300/28",
      glowSecondaryClass: "bg-fuchsia-300/20",
      badgeClass: "border-sky-200/30 bg-sky-300/14 text-sky-50",
      valueClass: "text-sky-50",
    },
  },
  {
    href: "/vinilos",
    sectionId: "vinilos",
    title: "Vinilos",
    eyebrow: "Portadas",
    description:
      "Selección de vinilos con sus portadas y el inventario correspondiente.",
    summary: "Colección visual de discos en formato grande.",
    details: [
      "Una ruta más contemplativa y visual, centrada en portadas y piezas de colección.",
      "El cambio ayuda a que el inventario no compita por atención con bloques más densos.",
      "Sirve como sección autónoma para seguir ampliando la colección de portadas.",
    ],
    visual: {
      kicker: "Portadas grandes",
      title: "Vinilos para mirar despacio, con una entrada propia y visual.",
      caption:
        "Más espacio para la portada, menos ruido del resto de contenidos.",
      cards: [
        { label: "Formato", value: "LP" },
        { label: "Foco", value: "Portadas" },
        { label: "Colección", value: "Inventario" },
      ],
      gradientClass: "from-lime-300/20 via-amber-300/10 to-orange-300/18",
      glowPrimaryClass: "bg-lime-300/22",
      glowSecondaryClass: "bg-orange-300/22",
      badgeClass: "border-lime-200/30 bg-lime-300/14 text-lime-50",
      valueClass: "text-lime-50",
    },
  },
  {
    href: "/libros",
    sectionId: "libros",
    title: "Libros",
    eyebrow: "Lecturas",
    description:
      "Listado de libros con filtros por categoría y protagonista principal.",
    summary: "Estantería navegable de lecturas y temas.",
    details: [
      "La biblioteca gana una entrada tranquila, orientada a categorías y nombres propios.",
      "La navegación separada ayuda a tratar lecturas como un universo propio dentro de la web.",
      "Permite crecer sin quedar enterrada entre fotos, discos y reproductores.",
    ],
    visual: {
      kicker: "Estantería abierta",
      title: "Lecturas organizadas como recorrido, con sus propios filtros y ritmo.",
      caption:
        "Una sección para entrar a leer el mapa de temas, no solo la lista.",
      cards: [
        { label: "Ordena", value: "Categorías" },
        { label: "Sigue", value: "Protagonistas" },
        { label: "Recorre", value: "Lecturas" },
      ],
      gradientClass: "from-amber-200/24 via-rose-300/10 to-violet-300/18",
      glowPrimaryClass: "bg-amber-200/24",
      glowSecondaryClass: "bg-violet-300/18",
      badgeClass: "border-amber-100/28 bg-amber-200/12 text-amber-50",
      valueClass: "text-amber-50",
    },
  },
  {
    href: "/historia",
    sectionId: "historia",
    title: "Historia",
    eyebrow: "Archivo",
    description:
      "Vídeos y material histórico organizados como una sección específica del sitio.",
    summary: "Selección temática de historia audiovisual.",
    details: [
      "Entra aquí quien quiera archivo histórico, sin tener que pasar antes por música o fotos.",
      "La página separada favorece una lectura más temática y menos dispersa.",
      "Te deja espacio para seguir ampliando el bloque con contexto y curaduría.",
    ],
    visual: {
      kicker: "Archivo temático",
      title: "Una ruta pensada para bucear en historia sin cambiar de tono a cada scroll.",
      caption:
        "Vídeos, temas y contexto histórico dentro de un bloque coherente.",
      cards: [
        { label: "Tema", value: "Archivo" },
        { label: "Mirada", value: "Contexto" },
        { label: "Formato", value: "Vídeo" },
      ],
      gradientClass: "from-stone-300/20 via-slate-300/10 to-cyan-400/16",
      glowPrimaryClass: "bg-stone-300/18",
      glowSecondaryClass: "bg-cyan-300/18",
      badgeClass: "border-stone-200/28 bg-stone-200/12 text-stone-50",
      valueClass: "text-stone-50",
    },
  },
  {
    href: "/guitarra",
    sectionId: "guitarra",
    title: "Guitarra",
    eyebrow: "Cuerdas",
    description:
      "Vídeos generales, temas, letras en imagen y recursos prácticos para tocar.",
    summary: "Repertorio y materiales de guitarra en una sola vista.",
    details: [
      "Aquí viven juntos los temas, los vídeos y las letras en imagen, pero solo cuando decides entrar.",
      "La separación le sienta especialmente bien a un bloque con tanto material práctico.",
      "Queda más claro que esto no es una subsección, sino un área completa de trabajo.",
    ],
    visual: {
      kicker: "Repertorio práctico",
      title: "Temas, enlaces y apoyo visual para tocar sin distracciones ajenas.",
      caption:
        "Una puerta directa al material de guitarra, centrada en uso real.",
      cards: [
        { label: "Material", value: "Temas" },
        { label: "Apoyo", value: "Letras" },
        { label: "Práctica", value: "Vídeos" },
      ],
      gradientClass: "from-emerald-300/22 via-teal-300/10 to-cyan-300/18",
      glowPrimaryClass: "bg-emerald-300/24",
      glowSecondaryClass: "bg-cyan-300/20",
      badgeClass: "border-emerald-200/28 bg-emerald-300/12 text-emerald-50",
      valueClass: "text-emerald-50",
    },
  },
  {
    href: "/mtv",
    sectionId: "mtv",
    title: "MTV",
    eyebrow: "TV",
    description:
      "Saca las palomitas y sintoniza todos los vídeos para una sesión infinita...",
    summary: "",
    details: [
      "Si solo quieres ver vídeos pásate por aquí, que están todos los vídeos enlazados previamente de las listas de Spotify.",
      "La lista crece cada día más así que tienes horas, días y meses para pegarte a la pantalla sin dejar de bailar.",
    ],
    visual: {
      kicker: "Canal musical",
      title: "Yo recuerdo cuando la MTV valía la pena....",
      caption: "",
      cards: [
        { label: "Mira", value: "Clips" },
        { label: "Ordena", value: "Valoración" },
        { label: "Recupera", value: "Cache" },
      ],
      gradientClass: "from-rose-400/22 via-fuchsia-400/12 to-red-400/18",
      glowPrimaryClass: "bg-rose-300/24",
      glowSecondaryClass: "bg-red-300/18",
      badgeClass: "border-rose-200/28 bg-rose-300/12 text-rose-50",
      valueClass: "text-rose-50",
    },
  },
  {
    href: "/spotify",
    sectionId: "spotify",
    title: "Spotify",
    eyebrow: "Playlists",
    description:
      "Echa un vistazo a mis listas, hay de todo y lo más divertido... puedes ver los vídeos de los temas para montar un buen karaoke en casa, en el bar o donde te apetezca bailar.",
    summary: "",
    details: [
      "Si te apetece ver los vídeos de cada tema puedes bucear por cada una de mis listas y ver cómo se escoge el que mejor le pega, pero aunque ya sé que puede resultar adictivo llegará un punto en que YouTube dice basta.",
      "Hay una cuota de peticiones diaria a la que te tienes que ajustar. No es culpa mía, es YouTube, que no da abasto.",
      "Pero una vez que ya se ha asociado un vídeo al tema se queda grabado para siempre y puedes verlo una y otra vez sin ninguna restricción.",
      "Es el cacheo, amigo...",
    ],
    visual: {
      kicker: "Música y Videos",
      title: "Ni una mala...preparate para bailar, gritar, llorar y soñar...",
      caption: "",
      cards: [
        { label: "Abre", value: "Playlists" },
        { label: "Salta", value: "Pistas" },
        { label: "Cruza", value: "YouTube" },
      ],
      gradientClass: "from-emerald-400/24 via-green-400/12 to-lime-300/18",
      glowPrimaryClass: "bg-emerald-300/26",
      glowSecondaryClass: "bg-lime-300/18",
      badgeClass: "border-emerald-200/28 bg-emerald-300/12 text-emerald-50",
      valueClass: "text-emerald-50",
    },
  },
  {
    href: "/videos",
    sectionId: "videos",
    title: "Vídeos",
    eyebrow: "Películas",
    description:
      "Listado general de vídeos con filtros por categoría y plataforma.",
    summary: "Catálogo audiovisual separado del resto del sitio.",
    details: [
      "Un catálogo general merece su propia entrada, especialmente si va creciendo por categorías y plataformas.",
      "Con la ruta separada, los filtros responden dentro de un contexto claro y sin interferencias.",
      "La portada solo presenta el bloque; la exploración real sucede al entrar.",
    ],
    visual: {
      kicker: "Catálogo audiovisual",
      title: "Películas, documentales y plataformas dentro de una entrada específica.",
      caption:
        "Una vista hecha para clasificar, filtrar y decidir qué abrir después.",
      cards: [
        { label: "Filtra", value: "Categorías" },
        { label: "Ubica", value: "Plataformas" },
        { label: "Explora", value: "Catálogo" },
      ],
      gradientClass: "from-indigo-400/22 via-blue-400/10 to-cyan-300/18",
      glowPrimaryClass: "bg-indigo-300/24",
      glowSecondaryClass: "bg-cyan-300/18",
      badgeClass: "border-indigo-200/28 bg-indigo-300/12 text-indigo-50",
      valueClass: "text-indigo-50",
    },
  },
];

export function getSiteSection(href: string) {
  return SITE_SECTIONS.find((section) => section.href === href) ?? null;
}

import type { Metadata } from "next";

type PublicPagePath =
  | "/"
  | "/spotify"
  | "/fotos"
  | "/conciertos"
  | "/guitarra"
  | "/videos"
  | "/vinilos"
  | "/historia"
  | "/mtv"
  | "/cds"
  | "/libros";

type PublicPageMetadata = {
  title: string;
  description: string;
};

const OPEN_GRAPH_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Vista previa de kintela.es con un diseño oscuro y una selección de secciones musicales y personales.",
} as const;

const PAGE_METADATA: Record<PublicPagePath, PublicPageMetadata> = {
  "/": {
    title: "Música, fotos, conciertos y vídeos",
    description:
      "kintela.es reúne playlists, vídeos, fotos, conciertos, guitarra y colecciones personales en una sola web.",
  },
  "/spotify": {
    title: "Spotify y playlists con vídeos",
    description:
      "Explora playlists de Spotify, filtra canciones y abre el vídeo asociado a cada tema en kintela.es.",
  },
  "/fotos": {
    title: "Fotos de conciertos y artistas",
    description:
      "Galería de fotos de conciertos, artistas y momentos del rock con filtros por personas, grupos y páginas.",
  },
  "/conciertos": {
    title: "Conciertos, ciudades y años",
    description:
      "Archivo personal de conciertos con fechas, ciudades, grupos y filtros para recorrer bolos y festivales.",
  },
  "/guitarra": {
    title: "Guitarra, temas y letras",
    description:
      "Temas de guitarra, letras en imagen y vídeos de apoyo para tocar repertorio sin distracciones.",
  },
  "/videos": {
    title: "Vídeos, películas y documentales de música",
    description:
      "Listado de películas, documentales y plataformas dedicadas a la música, con filtros por categoría y plataforma.",
  },
  "/vinilos": {
    title: "Colección de vinilos",
    description:
      "Colección personal de vinilos con portadas, inventario y recorrido por discos especiales.",
  },
  "/historia": {
    title: "Historia y archivo audiovisual",
    description:
      "Selección de vídeos y material audiovisual sobre historia, guerra civil española y Segunda Guerra Mundial.",
  },
  "/mtv": {
    title: "MTV y vídeos musicales",
    description:
      "Canal de vídeos musicales enlazados desde Spotify, ordenados por valoración y listos para reproducir.",
  },
  "/cds": {
    title: "Colección de CDs",
    description:
      "Colección de CDs con filtros por grupo, año y relación con Spotify dentro de kintela.es.",
  },
  "/libros": {
    title: "Libros de música y biografías",
    description:
      "Biblioteca personal de libros de música, biografías y lecturas relacionadas, filtrable por categoría y protagonista.",
  },
};

export function buildPageMetadata(path: PublicPagePath): Metadata {
  const pageMetadata = PAGE_METADATA[path];

  return {
    title: pageMetadata.title,
    description: pageMetadata.description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      type: "website",
      url: path,
      siteName: "kintela.es",
      title: pageMetadata.title,
      description: pageMetadata.description,
      images: [OPEN_GRAPH_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: pageMetadata.title,
      description: pageMetadata.description,
      images: [OPEN_GRAPH_IMAGE.url],
    },
  };
}

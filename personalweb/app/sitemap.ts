import type { MetadataRoute } from "next";

const SITE_URL = "https://www.kintela.es";

const routes = [
  { path: "", changeFrequency: "weekly", priority: 1 },
  { path: "/instagram", changeFrequency: "weekly", priority: 0.9 },
  { path: "/spotify", changeFrequency: "weekly", priority: 0.9 },
  { path: "/fotos", changeFrequency: "weekly", priority: 0.9 },
  { path: "/conciertos", changeFrequency: "weekly", priority: 0.9 },
  { path: "/guitarra", changeFrequency: "weekly", priority: 0.9 },
  { path: "/videos", changeFrequency: "weekly", priority: 0.9 },
  { path: "/vinilos", changeFrequency: "monthly", priority: 0.8 },
  { path: "/discos", changeFrequency: "monthly", priority: 0.8 },
  { path: "/historia", changeFrequency: "monthly", priority: 0.8 },
  { path: "/mtv", changeFrequency: "monthly", priority: 0.7 },
  { path: "/cds", changeFrequency: "monthly", priority: 0.7 },
  { path: "/libros", changeFrequency: "monthly", priority: 0.7 },
] satisfies Array<{
  path: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
  priority: number;
}>;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return routes.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}

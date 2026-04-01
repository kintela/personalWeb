import type { MetadataRoute } from "next";

const SITE_URL = "https://www.kintela.es";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/spotify",
          "/fotos",
          "/conciertos",
          "/guitarra",
          "/videos",
          "/vinilos",
          "/historia",
          "/mtv",
          "/cds",
          "/libros",
        ],
        disallow: ["/admin", "/api"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

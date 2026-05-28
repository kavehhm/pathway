import { type MetadataRoute } from "next";

const BASE_URL = "https://www.pathwaytutors.com";

type SitemapEntry = {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
};

const routes: SitemapEntry[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/tutors", changeFrequency: "daily", priority: 0.9 },
  { path: "/mentors", changeFrequency: "weekly", priority: 0.8 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return routes.map(({ path, changeFrequency, priority }) => ({
    url: `${BASE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}

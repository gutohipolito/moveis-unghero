import { getFeaturedCases, getAllCases } from "@/lib/cases";
import HomeCinematic from "@/components/HomeCinematic";

export default function HomePage() {
  const featured = getFeaturedCases(3);
  const all = getAllCases();
  const cases = (featured.length ? featured : all).slice(0, 3).map((c) => ({
    slug: c.slug,
    title: c.title,
    cover: c.cover,
    type: c.type,
  }));
  const heroSrc = cases[0]?.cover || "/images/cases/casa-sg/cover.jpg";

  return <HomeCinematic heroSrc={heroSrc} cases={cases} />;
}

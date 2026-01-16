import { MobileFeatureContent } from "./content";

export async function generateMetadata({ params }: { params: Promise<{ feature: string }> }) {
  const { feature } = await params;
  const title = feature.charAt(0).toUpperCase() + feature.slice(1);
  return {
    title: `${title} | Mobile View`,
  };
}

export default async function MobileFeaturePage({ params }: { params: Promise<{ feature: string }> }) {
  const { feature } = await params;
  return <MobileFeatureContent feature={feature} />;
}

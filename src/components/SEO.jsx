import { Helmet } from 'react-helmet-async';

const DEFAULTS = {
  title: 'मंडीजी — भारत मंडी भाव डैशबोर्ड',
  description: 'भारत की मंडियों के ताज़ा भाव। 120+ फसलें, 16,000+ मंडी, रोज़ाना अपडेट। मुनाफ़ा कैलकुलेटर, मंडी तुलना, MSP मॉनिटर।',
  url: 'https://mandiji.in',
  image: 'https://mandiji.in/og-image.png',
};

const SCHEMA_JSON = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "MandiJi",
  alternateName: "मंडीजी",
  url: "https://mandiji.in",
  description: "भारत की मंडियों के ताज़ा भाव डैशबोर्ड। 120+ फसलें, 16,000+ मंडी।",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  inLanguage: ["hi", "en"],
  offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
  author: { "@type": "Organization", name: "MandiJi" },
});

export default function SEO({ title, description, path }) {
  const pageTitle = title ? `${title} | MandiJi` : DEFAULTS.title;
  const pageDesc = description || DEFAULTS.description;
  const pageUrl = path ? `${DEFAULTS.url}${path}` : DEFAULTS.url;

  return (
    <Helmet>
      <title>{pageTitle}</title>
      <meta name="description" content={pageDesc} />
      <meta name="robots" content="index, follow" />
      <meta name="keywords" content="मंडी भाव, mandi bhav, mandi rates, सब्जी भाव, vegetable prices, crop prices India, APMC rates, किसान, farmer, MSP, मंडी दर, आज का भाव" />
      <link rel="canonical" href={pageUrl} />

      <meta property="og:type" content="website" />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDesc} />
      <meta property="og:image" content={DEFAULTS.image} />
      <meta property="og:locale" content="hi_IN" />
      <meta property="og:site_name" content="MandiJi" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDesc} />
      <meta name="twitter:image" content={DEFAULTS.image} />

      <script type="application/ld+json">{SCHEMA_JSON}</script>
    </Helmet>
  );
}

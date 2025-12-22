import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOHelmetProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  noIndex?: boolean;
}

const SEOHelmet: React.FC<SEOHelmetProps> = ({
  title = "Pixelmart EMS | Product & Financial Management System | Kigali, Rwanda",
  description = "Pixelmart EMS (Electronic Management System) is a powerful platform designed for Mr. Faustin to manage products, sales, and financial records across Kigali, Rwanda and multiple branch locations. Streamline operations, track inventory, and simplify financial reporting for businesses of all sizes.",
  keywords = "Pixelmart Rwanda, EMS Kigali, product management Rwanda, financial management Rwanda, business branches Rwanda, inventory system Kigali, retail management Rwanda, sales tracking Rwanda, Theogene Iradukunda, Theo Dev Rwanda, RwandaScratch, Faustin EMS",
  canonical,
  ogTitle,
  ogDescription,
  ogImage = "https://pixelmartrw.pages.dev/ems.jpeg",
  twitterTitle,
  twitterDescription,
  noIndex = false,
}) => {
  const finalOgTitle = ogTitle || title;
  const finalOgDescription = ogDescription || description;
  const finalTwitterTitle = twitterTitle || title;
  const finalTwitterDescription = twitterDescription || description;
  const finalCanonical = canonical || `https://pixelmartrw.pages.dev${window.location.pathname}`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />

      {noIndex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      )}

      <link rel="canonical" href={finalCanonical} />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={finalCanonical} />
      <meta property="og:title" content={finalOgTitle} />
      <meta property="og:description" content={finalOgDescription} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:alt" content="Pixelmart EMS - Product and Financial Management Rwanda" />
      <meta property="og:site_name" content="Pixelmart EMS" />
      <meta property="og:locale" content="en_US" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={finalCanonical} />
      <meta name="twitter:title" content={finalTwitterTitle} />
      <meta name="twitter:description" content={finalTwitterDescription} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:creator" content="@TheogeneDev" />

      {/* LinkedIn */}
      <meta property="article:author" content="Theogene Iradukunda" />
      <meta property="article:publisher" content="RwandaScratch" />

      {/* Geographic Meta Tags */}
      <meta name="geo.region" content="RW-01" />
      <meta name="geo.placename" content="Kigali, Rwanda" />
      <meta name="geo.position" content="-1.9441;30.0619" />
      <meta name="ICBM" content="-1.9441, 30.0619" />
    </Helmet>
  );
};

export default SEOHelmet;

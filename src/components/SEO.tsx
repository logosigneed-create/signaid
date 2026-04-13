import React, { useEffect } from 'react';

interface SEOProps {
    title?: string;
    description?: string;
    keywords?: string;
    ogImage?: string;
}

/**
 * SEO Component to manage document head properties dynamically.
 * This is a lightweight alternative to react-helmet.
 */
export const SEO: React.FC<SEOProps> = ({ title, description, keywords, ogImage }) => {
    useEffect(() => {
        const baseTitle = "SIGNAID";
        const fullTitle = title ? `${title} | ${baseTitle}` : `${baseTitle} - Studio de Design IA & Impression`;

        // Update Title
        document.title = fullTitle;

        // Update Description
        if (description) {
            const descriptionMeta = document.querySelector('meta[name="description"]');
            if (descriptionMeta) {
                descriptionMeta.setAttribute('content', description);
            }

            const ogDescriptionMeta = document.querySelector('meta[property="og:description"]');
            if (ogDescriptionMeta) {
                ogDescriptionMeta.setAttribute('content', description);
            }
        }

        // Update Keywords
        if (keywords) {
            const keywordsMeta = document.querySelector('meta[name="keywords"]');
            if (keywordsMeta) {
                keywordsMeta.setAttribute('content', keywords);
            }
        }

        // Update OG Title
        const ogTitleMeta = document.querySelector('meta[property="og:title"]');
        if (ogTitleMeta) {
            ogTitleMeta.setAttribute('content', fullTitle);
        }

        // Update OG Image if specified
        if (ogImage) {
            const ogImageMeta = document.querySelector('meta[property="og:image"]');
            if (ogImageMeta) {
                ogImageMeta.setAttribute('content', ogImage);
            }
        }
    }, [title, description, keywords, ogImage]);

    return null; // This component doesn't render anything
};

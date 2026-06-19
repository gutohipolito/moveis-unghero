import { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
      },
      {
        userAgent: [
          'GPTBot',
          'OAI-SearchBot',
          'ChatGPT-User',
          'Google-Extended',
          'ClaudeBot',
          'Claude-Web',
          'Anthropic-ai',
          'PerplexityBot',
          'CCBot',
          'Amazonbot',
          'cohere-ai',
          'Meta-ExternalAgent',
          'facebookexternalhit'
        ],
        allow: '/',
      }
    ],
    sitemap: 'https://moveisunghero.com.br/sitemap.xml',
  };
}


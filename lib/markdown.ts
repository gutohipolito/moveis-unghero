import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';

const contentDirectory = path.join(process.cwd(), 'content');

export interface MarkdownData {
  slug: string;
  title: string;
  description: string;
  content: string;
  htmlContent: string;
  [key: string]: any;
}

export function getMarkdownData(folder: string, slug: string): MarkdownData | null {
  try {
    const fullPath = path.join(contentDirectory, folder, `${slug}.md`);
    if (!fs.existsSync(fullPath)) {
      return null;
    }
    const fileContents = fs.readFileSync(fullPath, 'utf8');

    // Parse frontmatter
    const { data, content } = matter(fileContents);

    // Convert markdown string to HTML
    // Marked returns a string or promise. By default synchronous is supported
    const htmlContent = marked.parse(content) as string;

    return {
      slug,
      title: data.title || '',
      description: data.description || '',
      content,
      htmlContent,
      ...data,
    };
  } catch (error) {
    console.error(`Erro ao ler markdown (${folder}/${slug}):`, error);
    return null;
  }
}

export function getAllMarkdownData(folder: string): MarkdownData[] {
  try {
    const dirPath = path.join(contentDirectory, folder);
    if (!fs.existsSync(dirPath)) {
      return [];
    }
    const fileNames = fs.readdirSync(dirPath);

    const allData = fileNames
      .filter((fileName) => fileName.endsWith('.md'))
      .map((fileName) => {
        const slug = fileName.replace(/\.md$/, '');
        return getMarkdownData(folder, slug);
      })
      .filter((data): data is MarkdownData => data !== null);

    return allData;
  } catch (error) {
    console.error(`Erro ao ler todos os markdowns da pasta ${folder}:`, error);
    return [];
  }
}

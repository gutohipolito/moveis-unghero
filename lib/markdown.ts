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

// Retorna todas as subpastas em content/ambientes/ (que representam as grandes categorias de ambientes)
export function getAmbienteCategories(): string[] {
  try {
    const dirPath = path.join(contentDirectory, 'ambientes');
    if (!fs.existsSync(dirPath)) {
      return [];
    }
    return fs.readdirSync(dirPath).filter((file) => {
      return fs.statSync(path.join(dirPath, file)).isDirectory();
    });
  } catch (error) {
    console.error('Erro ao ler categorias de ambientes:', error);
    return [];
  }
}

// Retorna todas as subcategorias (arquivos .md que não index.md) de uma categoria de ambiente
export function getSubcategories(category: string): MarkdownData[] {
  try {
    const dirPath = path.join(contentDirectory, 'ambientes', category);
    if (!fs.existsSync(dirPath)) {
      return [];
    }
    const fileNames = fs.readdirSync(dirPath);

    const subData = fileNames
      .filter((fileName) => fileName.endsWith('.md') && fileName !== 'index.md')
      .map((fileName) => {
        const slug = fileName.replace(/\.md$/, '');
        return getMarkdownData(`ambientes/${category}`, slug);
      })
      .filter((data): data is MarkdownData => data !== null);

    return subData;
  } catch (error) {
    console.error(`Erro ao ler subcategorias de ambientes/${category}:`, error);
    return [];
  }
}

// Retorna o frontmatter e dados de index.md para cada categoria de ambiente
export function getAllCategoriesPillarData(): MarkdownData[] {
  try {
    const categories = getAmbienteCategories();
    return categories
      .map((cat) => {
        const data = getMarkdownData(`ambientes/${cat}`, 'index');
        if (data) {
          data.slug = cat; // Define o slug como o nome da pasta para links dinâmicos
        }
        return data;
      })
      .filter((data): data is MarkdownData => data !== null);
  } catch (error) {
    console.error('Erro ao ler dados de categorias pilares:', error);
    return [];
  }
}

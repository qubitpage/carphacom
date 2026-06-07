import fs from 'fs';
import path from 'path';

// Use process.cwd() to locate content/docs relative to project root
const DOCS_DIRECTORY = path.join(process.cwd(), 'content/docs');

export interface Doc {
  slug: string;
  title: string;
  excerpt?: string;
  content: string;
  date?: string;
  lang: 'en' | 'ro';
  order?: number;
}

function parseFrontMatter(fileContent: string): { data: any; content: string } {
  // Simple regex for frontmatter
  const frontMatterRegex = /---\s*([\s\S]*?)\s*---/;
  const match = frontMatterRegex.exec(fileContent);
  
  if (!match) {
    return { data: {}, content: fileContent };
  }

  const frontMatterBlock = match[1];
  const content = fileContent.replace(match[0], '').trim();
  
  const data: any = {};
  frontMatterBlock.split('\n').forEach(line => {
    const parts = line.split(':');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join(':').trim().replace(/^['"](.*)['"]$/, '$1');
      if (key) data[key] = value;
    }
  });

  return { data, content };
}

export function getAllDocs(lang: 'en' | 'ro' = 'ro'): Doc[] {
  const langDir = path.join(DOCS_DIRECTORY, lang);
  
  // Create dir if not exists (for tests/empty state)
  if (!fs.existsSync(langDir)) {
      try {
          fs.mkdirSync(langDir, { recursive: true });
      } catch (e) {
          console.error(`[Docs] Failed to create dir ${langDir}`, e);
          return [];
      }
      return [];
  }

  const filenames = fs.readdirSync(langDir);

  const docs = filenames
    .filter(fn => fn.endsWith('.md')) // Only markdown
    .map((filename) => {
        try {
            const filePath = path.join(langDir, filename);
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const { data, content } = parseFrontMatter(fileContent);
            const slug = filename.replace(/\.md$/, '');

            const doc: Doc = {
                slug,
                title: data.title || slug,
                excerpt: data.excerpt || '',
                date: data.date,
                order: parseInt(data.order || '99'),
                content,
                lang,
            };
            return doc;
        } catch (err) {
            console.error(`[Docs] Error reading ${filename}:`, err);
            return null;
        }
    })
    .filter((doc): doc is Doc => doc !== null);

  return docs.sort((a, b) => (a.order || 99) - (b.order || 99));
}

export function getDocBySlug(slug: string, lang: 'en' | 'ro' = 'ro'): Doc | null {
  try {
    const realSlug = slug.replace(/\.md$/, '');
    const filePath = path.join(DOCS_DIRECTORY, lang, `${realSlug}.md`);
    
    if (!fs.existsSync(filePath)) {
        console.warn(`[Docs] File not found: ${filePath}`);
        return null;
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { data, content } = parseFrontMatter(fileContent);

    return {
      slug: realSlug,
      title: data.title || realSlug,
      excerpt: data.excerpt || '',
      date: data.date,
      order: parseInt(data.order || '99'),
      content,
      lang,
    };
  } catch (e) {
    console.error(`[Docs] Error retrieving slug ${slug}:`, e);
    return null;
  }
}

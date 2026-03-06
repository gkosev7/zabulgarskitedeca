import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
	// Load Markdown and MDX files in the `src/content/blog/` directory.
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	// Type-check frontmatter using a schema
	schema: ({ image }) =>
		z
			.object({
				title: z.string(),
				description: z.string().optional(),
				// Support both `pubDate` and legacy `date` from older CMS config.
				pubDate: z.coerce.date().optional(),
				date: z.coerce.date().optional(),
				updatedDate: z.coerce.date().optional(),
				heroImage: image().optional(),
			})
			.transform((data) => ({
				title: data.title,
				description: data.description ?? '',
				pubDate: data.pubDate ?? data.date ?? new Date(),
				updatedDate: data.updatedDate,
				heroImage: data.heroImage,
			})),
});

const calendar = defineCollection({
	loader: glob({ base: './src/content/calendar', pattern: '**/*.{md,mdx}' }),
	schema: z.object({
		title: z.string(),
		date: z.coerce.date(),
		time: z.string().optional(),
		location: z.string().optional(),
		description: z.string().optional(),
	}),
});

export const collections = { blog, calendar };

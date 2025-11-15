import * as fs from 'fs';
import * as path from 'path';

const PART_IMAGES_DIR = path.join(process.cwd(), 'static', 'images', 'parts');

type LocalImage = {
	id: string;
	image_url: string;
	alt_text: string | null;
	order_index: number;
};

let cachedIndex: Map<number, string[]> | null = null;
let lastBuildTime = 0;
const CACHE_TTL_MS = 1000 * 60; // 1 минута

function buildIndex() {
	try {
		const files = fs.readdirSync(PART_IMAGES_DIR);
		const map = new Map<number, string[]>();

		for (const filename of files) {
			const match = filename.match(/^(\d+)/);
			if (!match) continue;

			const partId = Number(match[1]);
			if (!map.has(partId)) {
				map.set(partId, []);
			}
			map.get(partId)?.push(filename);
		}

		for (const images of map.values()) {
			images.sort((a, b) => a.localeCompare(b, 'ru'));
		}

		cachedIndex = map;
		lastBuildTime = Date.now();
	} catch (error) {
		console.error('[images] Failed to build local image index:', error);
		cachedIndex = new Map();
	}
}

function ensureIndex() {
	if (!cachedIndex || Date.now() - lastBuildTime > CACHE_TTL_MS) {
		buildIndex();
	}
}

export function getLocalImagesForPart(partId: number, title?: string | null): LocalImage[] {
	if (!Number.isFinite(partId)) {
		return [];
	}

	ensureIndex();
	const files = cachedIndex?.get(partId);
	if (!files || files.length === 0) {
		return [];
	}

	return files.map((filename, index) => ({
		id: `local-${partId}-${index}`,
		image_url: `/images/parts/${filename}`,
		alt_text: title || null,
		order_index: index
	}));
}


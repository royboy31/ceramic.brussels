import type { ContentSourceMap, ContentSourceMapParsedPath } from '@sanity/client';
import {
  getPublishedId,
  jsonPathToStudioPath,
  resolveMapping,
  resolvedKeyedSourcePath,
} from '@sanity/client/csm';

/**
 * Click-to-edit for images in a preview render.
 *
 * The visual editing overlay finds text by the invisible marker the client
 * appends to every string, and finds an image only through that marker in
 * its `alt` - so an image with no alt text (two thirds of the site's) was
 * not editable from the page. The other thing the overlay reads is a
 * `data-sanity` attribute naming the document and field outright.
 *
 * `tagImages` walks a query result with its content source map, the same
 * map the marker is built from, and writes that attribute's value onto
 * every image object as `_sanity`, resolved through references, so a
 * partner's logo points at the partner. `SanityImage.astro` puts it on the
 * `<img>`. Nothing here runs outside a preview render, and the published
 * pages never see the key.
 */

/** Where the Studio lives; the overlay appends the edit intent to it. */
export const STUDIO_BASE_URL = '/studio/#';

type ImageObject = Record<string, unknown> & { asset?: { _ref?: unknown } };

/** Tags every image object in `result` in place. Returns how many it tagged. */
export function tagImages(result: unknown, csm: ContentSourceMap | undefined, baseUrl = STUDIO_BASE_URL): number {
  if (!csm) return 0;
  let tagged = 0;

  // Two spellings of the same path: the map's mappings are keyed by index
  // (`$['sections'][3]`), its source paths by `_key`, and the resolver
  // wants the second to translate a match into a document path.
  const walk = (value: unknown, indexed: ContentSourceMapParsedPath, keyed: ContentSourceMapParsedPath): void => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, [...indexed, index], [...keyed, keyedSegment(item, index)]));
      return;
    }
    const object = value as ImageObject;
    if (isImage(object)) {
      const attribute = dataAttribute(indexed, keyed, csm, baseUrl);
      if (attribute) {
        object._sanity = attribute;
        tagged++;
      }
    }
    for (const [key, child] of Object.entries(object)) {
      if (key !== '_sanity') walk(child, [...indexed, key], [...keyed, key]);
    }
  };

  walk(result, [], []);
  return tagged;
}

function keyedSegment(item: unknown, index: number): ContentSourceMapParsedPath[number] {
  const key = item && typeof item === 'object' ? (item as { _key?: unknown })._key : undefined;
  return typeof key === 'string' ? { _key: key, _index: index } : index;
}

function isImage(object: ImageObject): boolean {
  const ref = object.asset?._ref;
  return typeof ref === 'string' && ref.startsWith('image-');
}

/**
 * The `data-sanity` value for the image at `indexed`/`keyed`: the same
 * string `createDataAttribute` in `@sanity/visual-editing` builds, written
 * here because that package only ships inside `@sanity/astro`.
 *
 * The map has no entry for the image object itself, only for what the
 * projection copied out of it, so the lookup goes through its `asset` and
 * the last segment comes off again to land on the image field.
 */
function dataAttribute(
  indexed: ContentSourceMapParsedPath,
  keyed: ContentSourceMapParsedPath,
  csm: ContentSourceMap,
  baseUrl: string,
): string | undefined {
  const resolved = resolveMapping([...indexed, 'asset'], csm);
  if (!resolved) return undefined;
  const { mapping, pathSuffix } = resolved;
  if (mapping.type !== 'value' || mapping.source.type !== 'documentValue') return undefined;
  const document = csm.documents[mapping.source.document];
  const sourceBasePath = csm.paths[mapping.source.path];
  if (!document || !sourceBasePath) return undefined;

  const sourcePath = resolvedKeyedSourcePath({ keyedResultPath: [...keyed, 'asset'], pathSuffix, sourceBasePath });
  const studioPath = jsonPathToStudioPath(sourcePath);
  if (studioPath.at(-1) === 'asset') studioPath.pop();
  if (!studioPath.length) return undefined;

  return [
    `id=${getPublishedId(document._id)}`,
    `type=${document._type}`,
    `path=${urlPath(studioPath)}`,
    `base=${encodeURIComponent(baseUrl)}`,
  ].join(';');
}

/** `sections:abc123.image` - the overlay's own spelling of a field path. */
function urlPath(path: ReturnType<typeof jsonPathToStudioPath>): string {
  let out = '';
  for (const segment of path) {
    if (typeof segment === 'string') out += (out ? '.' : '') + segment;
    else if (typeof segment === 'number') out += `:${segment}`;
    else if (segment && typeof segment === 'object' && '_key' in segment) out += `:${segment._key}`;
  }
  return out;
}

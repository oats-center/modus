import type { Element, AnyNode, CheerioAPI } from 'cheerio/lib/slim';
import type * as jschema from 'jsonschema8';
export declare function parse($: CheerioAPI, item: AnyNode): jschema.JSONSchema8 | null;
export declare function parseSchema($: CheerioAPI, schema: Element): jschema.JSONSchema8 | null;

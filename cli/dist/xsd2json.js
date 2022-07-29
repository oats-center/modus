import { isTag } from 'domhandler';
import debug from 'debug';
const warn = debug('@modusjs/cli#xsd2json:warn');
const info = debug('@modusjs/cli#xsd2json:info');
const trace = debug('@modusjs/cli#xsd2json:trace');
export function parse($, item) {
    if (!isTag(item)) {
        throw new Error(`ERROR: tried to parse a non-tag node (text, cdata, etc.): ${item}`);
    }
    trace('Calling parse, item = ', item.name);
    switch (item.name) {
        case "xs:schema": return parseSchema($, item);
        case "xs:element": return parseElement($, item);
        case "xs:simpleType": return parseSimpleType($, item);
        case "xs:include": return null; // not handling includes yet
    }
    throw new Error(`ERROR: parse called on unsupported tag type: ${item.name}`);
}
//------------------------------------------------------------------------------
// Parsers for particular tag types:
//------------------------------------------------------------------------------
export function parseSchema($, schema) {
    if (schema.name !== 'xs:schema') {
        warn('WARNING: parsing a non-xs:schema node as a schema.');
        return null;
    }
    const parsedChildren = schema.children
        .map((e) => isTag(e) ? parse($, e) : null) // If we get a non-element child, ignore it here
        .filter((i) => !!i); // any returned nulls (xs:include) filter away
    throw new Error('parseSchema not finished');
}
function parseElement($, item) {
    const description = parseDescription($, item);
    const name = item.attribs['name'] || 'Unknown Name';
    const complex = getPath('xs:complexType', item);
    if (!complex) {
        throw new Error(`parseElement: found an xs:element (${item.name}) that was not an xs:complexType`);
    }
    // Is this element a sequence (array) or an object (xs:all)?
    throw new Error('parseElement not finished');
}
function parseSimpleType($, item) {
    throw new Error('parseSimpleType not finished');
}
//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------
function parseDescription($, item) {
    const doc = getPath('xs:annotation/xs:documentation', item);
    if (!doc)
        return '';
    info('doc.text = ', $(doc).text());
    return $(doc).text();
}
function getPath(path, item) {
    const parts = path.split('/');
    for (const part of parts) {
        let found = false;
        for (const child of item.children) {
            if (!isTag(child))
                continue;
            if (child.name === part) {
                found = true;
                item = child;
            }
        }
        if (!found) {
            info('path ', path, 'did no exist');
            return null;
        }
    }
    if (!isTag(item)) {
        info('path ', path, 'existed, but it was not a tag');
        return null;
    }
    return item;
}
//# sourceMappingURL=xsd2json.js.map
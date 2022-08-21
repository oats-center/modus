import debug from 'debug';
import chalk from 'chalk';
import { load, Element, AnyNode, Cheerio, Document, CheerioAPI } from 'cheerio/lib/slim';
import { isTag } from 'domhandler';
import ModusResult, { assert as assertModusResult, is as isModusResult } from '@oada/types/modus/v1/modus-result.js';
import ModusSubmit, { assert as assertModusSubmit, is as isModusSubmit } from '@oada/types/modus/v1/modus-submit.js';

// Re-Export the types for convenience
export { ModusSubmit, assertModusSubmit, isModusSubmit };
export { ModusResult, assertModusResult, isModusResult };

const error = debug('@modusjs/convert#xml:error');
const warn = debug('@modusjs/convert#xml:error');
const info = debug('@modusjs/convert:info');
const trace = debug('@modusjs/convert:trace');
const { red, yellow } = chalk;

// During nested object parsing, you can request to override the normal recursion
// for particular key names like: 
// {
//   Reports: (key, context) => { .. other thing to parse the Reports key }
// }
type KeyedSetOverride = { // <Reports><Report ReportID="1">...</Report></Reports> => { 1: ... }
  type: 'keyedSet',
  id_attrib: string,
};
// Some tags (SoilSample) are parsed into an array, but do not sit inside of a "SoilSamples" container.
// To further complicate matters, they exist at the same level as other tags.  So all the SoilSample 
// tags have to be accumulated into a single array and placed onto a new "SoilSamples" key in the JSON.
type AccumulateArrayOverride = { // <SoilSample>...</SoilSample><SoilSample></SoilSample> => [accumulatorKeyname]: [ ... ],
  type: 'accumulateArray',
  finalKeynameForArrayInParent: string, // SoilSamples
};
type ArrayOverride = { // <NutrientResults><NutrientResult>...</NutrientResult></NutrientResults> => { NutrientResults: [ ... ] }
  type: 'array'
};
type EmptyTagsBecomeTrueOverride = { type: 'emptyTagsBecomeTrue' };
type Overrides = {
  [key_to_override: string]: KeyedSetOverride | AccumulateArrayOverride | ArrayOverride | EmptyTagsBecomeTrueOverride,
};
type ParseOptions = {
  overrides?: Overrides,
  emptyTagsBecomeTrue?: true | false,
  parseAsNumbers: { [keyname: string]: true },
  pathRegexParseAsStrings: RegExp[],
  ignoreKeys: { [key: string]: true },
};

// Throws if unable to parse a ModusSubmit from the xmlstring
export function parseModusSubmit(xmlstring: string): ModusSubmit {
  const ms = parse(xmlstring);
  assertModusSubmit(ms);
  return ms;
}

// Throws if unable to parse a ModusSubmit from the xmlstring
export function parseModusResult(xmlstring: string): ModusResult | null {
  const mr = parse(xmlstring);
  assertModusResult(mr);
  return mr;
}

// parse an XML (ModusSubmit OR ModusResult), returned as an "any".
// This is a best-effort parsing: the result is not validated. 
// It simply returns whatever it could parse. 
// To type validate it, use parseModusResult or parseModusSubmit
export function parse(xmlstring: string): any {
  const $ = load(xmlstring, { xmlMode: true });

  // Put this here so we have access to $.
  // Does basic, repeatable parsing of common Modus XML structures into JSON:
  const parseObject = (
    {xml,opts,path}:
    {xml: Element | null, opts: ParseOptions, path?: string}
  ) => {
    const ret: any = {};
    path = path || '';
    if (!xml) return null;

    const {emptyTagsBecomeTrue} = opts;
    opts.emptyTagsBecomeTrue = false; // do not propagate this in recursive calls
   
    // If this tag has attributes, keep them as keys on the object
    for (const a of xml.attributes) {
      if (opts.ignoreKeys[a.name]) continue;
      ret[a.name] = parseStringOrNumberOrBoolean({
        str: a.value,
        tagname: a.name,
        path: `${path}/${a.name}`,
        opts
      });
    }

    // Loop through all the children and parse them into keys on the "ret" object
    for (const child of xml.children) {
      if (!isTag(child)) { // ignore random character data
        continue;
      }
      if (opts.ignoreKeys[child.tagName]) {
        continue;
      }
      const childpath = `${path}/${child.tagName}`;

      // If caller wants to override parsing this tag type:
      if (opts.overrides?.[child.tagName]) {
        const o = opts.overrides[child.tagName]!;
        switch(o.type) {
          case "keyedSet":
            ret[child.tagName] = parseKeyedSet({ 
              xml: child, 
              id_attrib: o.id_attrib,
              opts,
              path: childpath,
            });
          break;
          case "accumulateArray":
            parseArrayAccumulate({ret, tag: o.finalKeynameForArrayInParent, xml: child, opts, path: childpath});
          break;
          case "array":
            ret[child.tagName] = parseArray({xml: child, opts, path: childpath});
          break;
          case "emptyTagsBecomeTrue":
            ret[child.tagName] = parseObject({xml: child, opts: { ...opts, emptyTagsBecomeTrue: true }, path: childpath});
          break;
        }
        continue;
      }


      // If this has child tags, parse it as another simple object
      if (countChildrenThatAreTags(child) > 0) {
        ret[child.tagName] = parseObject({ xml: child, opts, path: childpath });
        continue;
      }

      // If this is an empty object, like the "Soil" object in <EventType><Soil/></EventType>, the convention is to 
      // just make it boolean true instead of an empty object
      if (emptyTagsBecomeTrue && child.children.length === 0) {
        ret[child.tagName] = true;
        continue;
      }

      // Otherwise, this tag's contents are just character data
      const str = $(child).text().trim();
      if (str === '') continue; // ignore empty entries
      ret[child.tagName] = parseStringOrNumberOrBoolean({str, tagname: child.tagName, path: childpath, opts});
    }

    return ret;
  };

  function parseKeyedSet(
    {xml,id_attrib,opts, path}: 
    { xml: Element | null, id_attrib: string, opts: ParseOptions, path?: string }
  ) {
    if (!xml) return null;
    // All the "tag" children at this level should become values in an object,
    // keyed by the attribute from the XML tag named <id_attrib>:
    // <Report ReportID="1">foo</Report>
    // <Report ReportID="2">bar<Report>
    // =>
    // { "1": foo, "2": bar }
    const ret: any = {};
    for (const child of xml.children) {
      if (!isTag(child)) continue;
      const id = child.attribs[id_attrib];
      if (!id) {
        warn(yellow('WARNING:'), 'key ', child.tagName, ' under ', xml.tagName , 'at path', path, 'does not contain required ID attribute ',id_attrib, ', ignoring');
        trace('Attributes available are: ', child.attribs);
        continue;
      }
      ret[id] = parseObject({ xml: child, opts, path: `${path}/${id}` });
    }
    return ret;
  }

  // NutrientSamples and Events are simple arrays: each child is pushed onto the parent array
  function parseArray({xml, opts, path}: { xml: Element, opts: ParseOptions, path?: string }): any[] {
    const ret = [];
    for (const child of xml.children) {
      if (!isTag(child)) continue; // ignore random text nodes
      const obj = parseObject({xml: child, opts, path: `${path}/${child.tagName}` });
      if (obj) {
        ret.push(obj);
      }
    }
    return ret;
  }

  // SoilSample is a child under the "Soil" tag, but they are not collected uner a "SoilSamples" parent.
  // So this accumulator will just keep adding the children to a parent array as they appear.
  function parseArrayAccumulate (
    { ret, tag, xml, opts, path }: 
    { ret: any, tag: string, xml: Element, opts: ParseOptions, path: string }
  ): void {
    if (!Array.isArray(ret[tag])) {
      ret[tag] = [];
    }
    const obj = parseObject({ xml, opts, path });
    if (obj) {
      ret[tag].push(obj);
    }
  }

  function parseStringOrNumberOrBoolean ({ str, tagname, path, opts }: { str: string, tagname: string, path: string, opts: ParseOptions }): string | number | boolean {
    // Easiest parsing for numbers is just based on their keyname.  However,
    // the "Value" key is sometimes a string and sometimes a number.  So Value is parsed as a number
    // unless the path matches a pre-defined set of known "string" paths for Value.
    const parse_as_number = !!opts.parseAsNumbers[tagname] && !opts.pathRegexParseAsStrings.find(re => path.match(re));
    if (parse_as_number) return +(str);
    if (str.toLowerCase() === 'false') return false;
    if (str.toLowerCase() === 'true') return true;
    return str;
  }



  //---------------------------------------------------------------------
  // Do the actual parsing.....

  // Grab the "ModusResult" from the DOM as the starting point:
  const modus_result = exactlyOneTag($('ModusResult'));
  if (!modus_result) {
    error(red('ERROR:'),' no ModusResult found in file.');
    throw new Error('No ModusResult found.');
  }

  const ret = parseObject({xml: modus_result, opts: {
    overrides: {
      "Event": { type: 'accumulateArray', finalKeynameForArrayInParent: 'Events' },
      "Reports": { type: 'array' },
      "DepthRefs": { type: 'array' },
      "Depths": { type: 'array' },
      "SoilSample": { type: 'accumulateArray', finalKeynameForArrayInParent: 'SoilSamples' },
      "NutrientResults": { type: 'array' },
      "EventType": { type: 'emptyTagsBecomeTrue' },
      "FMISAllowedLabEquations": { type: 'array' },
      "SiteAttributes": { type: 'array' },
      "RecommendationRefs": { type: 'array' },
      "RecommendationRequests": { type: 'array' },
      "NutrientRecommendations": { type: 'array' },
      "NutrientRecommendation": { type: 'array' },
      "NematodeResults": { type: 'array' },
      "LifeStageValues": { type: 'array' },
      "ResidueResults": { type: 'array' },
      "TextureResults": { type: 'array' },
      "SensorResults": { type: 'array' },
      "SubSamples": { type: 'array' },
      "TestPackages": { type: 'array' },
      "TestPackageRefs": { type: 'array' },
      "Variables": { type: 'array' },
      "NematodeSample": { type: 'accumulateArray', finalKeynameForArrayInParent: 'NematodeSamples' },
      "WaterSample": { type: 'accumulateArray', finalKeynameForArrayInParent: 'WaterSamples' },
      "ResidueSamples": { type: 'accumulateArray', finalKeynameForArrayInParent: 'ResidueSamples' },
      "Warnings": { type: 'array' },
    },
    parseAsNumbers: {
      SampleGroupID: true,
      //ReportID: true,
      epsg: true,
      SubSampleNumber: true,
      StartingDepth: true,
      EndingDepth: true,
      ColumnDepth: true,
      DepthID: true,
      DisplayOrder: true,
      RecID: true,
      Value: true,
    },
    // Sadly, some "Value" keys in the standard are actually strings, so use the path override to 
    // convert just particular Values back into strings.
    pathRegexParseAsStrings: [
      /Variables\/[^\/]+\/Value/, // SiteAttributes/Variables/*/Value, Recommendation/Variables/*/Value
      /LifeStageValues\/[^\/]+\/Value/, // LifeStageValues/*/Value
      // /LabMetaData\/Reports\/[^\/]+\/ReportID/, // LabMetaData/Reports/*/ReportID
      /Depths\/[^\/]+\/DepthID/, // LabMetaData/Reports/*/ReportID
    ],
    ignoreKeys: {
      "xmlns:xsi": true,
      "xsi:noNamespaceSchemaLocation": true,
    },
  }});

  ret._type = 'application/vnd.modus.v1.modus-result+json';
  return ret;
}

function firstChildThatIsATag(elem: Element): Element | null {
  for (const child of elem.children) {
    if (isTag(child)) return child;
  }
  return null;
}

function hasOnlyOneTagChildAndChildTagIsEmpty(elem: Element): boolean {
  if (countChildrenThatAreTags(elem) !== 1) return false;
  const child = firstChildThatIsATag(elem);
  if (!child) return false;
  return child.children.length < 1;
}

function countChildrenThatAreTags(elem: Element): number {
  if (!elem.children) return 0;
  let count = 0;
  for (const c of elem.children) {
    if (isTag(c)) count++;
  }
  return count;
}

function exactlyOneTag(xml: Cheerio<AnyNode>): Element | null {
  const all = xml.toArray().filter(isTag);
  if (all.length < 1) return null;
  if (all.length > 1) {
    warn(yellow('WARNING:'), `Tag ${all[0]!.tagName} can only exist once at this level, but multiple tags found.  Only using first one.`);
  }
  return all[0]!;
}

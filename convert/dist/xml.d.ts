import ModusResult, { assert as assertModusResult, is as isModusResult } from '@oada/types/modus/v1/modus-result.js';
import ModusSubmit, { assert as assertModusSubmit, is as isModusSubmit } from '@oada/types/modus/v1/modus-submit.js';
export { ModusSubmit, assertModusSubmit, isModusSubmit };
export { ModusResult, assertModusResult, isModusResult };
export declare function parseModusSubmit(xmlstring: string): ModusSubmit;
export declare function parseModusResult(xmlstring: string): ModusResult | null;
export declare function parse(xmlstring: string): any;

declare module 'xmllint' {
  export type ValidateResult = {
    errors: string[] | null;
  };

  export type ValidateOptions = {
    xml: string;
    schema: string | string[];
    TOTAL_MEMORY?: number;
    extensions?: '--relaxng' | '--schema';
  };

  export function validateXML(opts: ValidateOptions): ValidateResult;
}

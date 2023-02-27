declare module '@lhncbc/ucum-lhc' {

  export type Unit = {
    code: string,
    name: string,
    guidance: string;
  };
  export type Suggestion = {
    msg: string, 
    invalidUnit: string,
    units: [ code: string, name: string, guidance: string ],
  };
  export type ConversionResult = {
    status: 'succeeded' | 'failed' | 'error',
    toVal: number | null,
    msg: string[],
    suggestions?: {
      from: Suggestion[],
      to: Suggestion[],
    },
    fromUnit: Unit | null,
    toUnit: Unit | null,
    error?: string,
  };

  export type ValidationResult = {
    status: 'valid' | 'invalid' | 'error',
    ucumCode: string,
    msg: string[],
    unit: Unit | null,
    suggestions?: Suggestion[],
    error?: string,
  };

    
  export type UcumInstance = {
    convertUnitTo: (fromUnit: string, fromValue: number, toUnit: string, suggest?: boolean, molecularWeight?: number) => ConversionResult,
    validateUnitString: (unit: string, suggest?: boolean) => ValidationResult,
  };
  export const UcumLhcUtils: {
    getInstance: () => UcumInstance,
  };
}

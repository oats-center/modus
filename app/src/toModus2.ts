import type { ModusResult } from '@modusjs/convert';
import modus2mapdata from './modus2_conversion_mapping.json';
import debug from 'debug';

const info = debug('@modusjs/app#toModus2:info');

function deepclone(o: any): any { return JSON.parse(JSON.stringify(o)); }

function modus2map(modus1: string): string {
  const d = modus2mapdata as { [modus1: string]: string };
  return d[modus1];
}

export function toModus2QuickHack(m1: ModusResult): ModusResult {
  const ret: ModusResult = deepclone(m1) as ModusResult;
  if (!ret.Events) {
    throw new Error('Events is null');
  }
  for (const event of ret.Events) {
    if  (!event.EventSamples?.Soil?.SoilSample) {
      throw new Error('No soil samples for this event');
    }
    for (const sample of event.EventSamples.Soil.SoilSample) {
      if (!sample.Depths) {
        throw new Error('No Depths for this samle');
      }
      for (const depth of sample.Depths) {
        if (!depth.NutrientResults) {
          throw new Error('Depth has no nutrient results');
        }
        for (const nutrient of depth.NutrientResults) {
          if (nutrient.ModusTestID) {
            const m2 = modus2map(nutrient.ModusTestID || '');
            if (m2) {
              nutrient.ModusTestID = m2;
            }
          }
        }
      }
    }
  }
  return ret;
}

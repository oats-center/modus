export const modusElements: Record<string, any> = {
 'pH': {
    FullName: 'pH',
  },
  'B-pH': {
    FullName: 'Buffer pH',
  },
  'SS': {
    FullName: 'Soluble Salts',
  },
  'Texture':{
    FullName: 'Texture',
  },
  'OM': {
    FullName: 'Organic Matter',
  },
  'NO3-N': {
    FullName: 'Nitrate',
  },
  'N': {
    FullName: 'Nitrogen'
  },
  'K': {
    FullName: 'Potassium',
  },
  'SO4-S': {
    FullName: 'Sulfate',
  },
  'Zn': {
    FullName: 'Zinc',
  },
  'Fe': {
    FullName: 'Iron',
  },
  'Mn': {
    FullName: 'Manganese',
  },
  'Cu': {
    FullName: 'Copper',
  },
  'Ca': {
    FullName: 'Calcium',
  },
  'Mg': {
    FullName: 'Magnesium',
  },
  'Na': {
    FullName: 'Sodium',
  },
  'B': {
    FullName: 'Boron',
  },
  'CEC': {
    FullName: 'Cation Exchange Capacity',
  },
  'NH4-N': {
    FullName: 'Ammonium',
  },
  'Al': {
    FullName: 'Aluminum',
  },
  'Cl': {
    FullName: 'Chloride',
  },
  // Keep all? Their relevance is high enough to show up in reporting.
  'P (Bray P1 1:10)': {
    FullName: 'Phosphorus',
  },
  'P (Olsen)': {
    FullName: 'Phosphorus',
  },
  'P (Bray P2 1:10)': {
    FullName: 'Phosphorus',
  },
  'P': {
    FullName: 'Phosphorus',
  },
  'TN': {
    FullName: 'Total Nitrogen',
  },
  'Moisture': {
    FullName: 'Moisture',
  },
  'TP': {
    FullName: 'Total Phosphorus',
  },
  'NO2-N': {
    FullName: 'Nitrite',
  },
  'Sand': {
    FullName: 'Sand',
  },
  'Silt': {
    FullName: 'Silt',
  },
  'Clay': {
    FullName: 'Clay',
  },
  'Sat-Pct': {
    FullName: 'Saturation Percentage',
  },
  'EC': {
    FullName: 'Electrical Conductivity',
  },
  'HCO3': {
    FullName: 'Bicarbonate',
  },
  'S': {
    FullName: 'Sulfur',
  },
  'SAR': {
    FullName: 'Sodium Adsorption Ratio',
  },
  'Crop 1': {
    FullName: 'Crop 1',
  },
  'YG 1': {
    FullName: 'Yield Goal 1',
  },
  'Crop 2': {
    FullName: 'Crop 2',
  },
  'YG 2': {
    FullName: 'Yield Goal 2',
  },
  'Crop 3': {
    FullName: 'Crop 3',
  },
  'YG 3': {
    FullName: 'Yield Goal 3',
  },
  'N-Rec': {
    FullName: 'Nitrogen Recommendation',
  },
  'P205-Rec': {
    FullName: 'Phosphorus Pentoxide Recommendation',
  },
  'K2O-Rec': {
    FullName: 'Potassium Oxide Recommendation',
  },
  'S-Rec': {
    FullName: 'Sulfur Recommendation',
  },
  'Zn-Rec': {
    FullName: 'Zinc Recommendation',
  },
  'Mg-Rec': {
    FullName: 'Magnesium Recommendation',
  },
  'Fe-Rec': {
    FullName: 'Iron Recommendation',
  },
  'Mn-Rec': {
    FullName: 'Manganese Recommendation',
  },
  'Cu-Rec': {
    FullName: 'Copper Recommendation',
  },
  'B-Rec': {
    FullName: 'Boron Recommendation',
  },
  'Lime-Rec': {
    FullName: 'Lime Recommendation',
  },
  'OC': {
    FullName: 'Organic Carbon',
  },
  'TC': {
    FullName: 'Total Carbon',
  },
  'TS': {
    FullName: 'Total Sulfur',
  },
  'CO3': {
    FullName: 'Carbonate',
  },
  'ON': {
    FullName: 'Organic Nitrogen',
  },
  'OCNR': {
    FullName: 'Organic Carbon:Nitrogen Ratio',
  },
  'Bulk-Density': {
    FullName: 'Bulk Density',
  },
  'Active-Carbon': {
    FullName: 'Active Carbon',
  },
  'TK': {
    FullName: 'Total Potassium'
  },
  'TCNR': {
    FullName: 'Total Carbon:Nitrogen Ratio',
  },
  'Mo': {
    FullName: 'Molybdenum',
  },
  'BS-H': {
    FullName: 'Hydrogen Base Saturation',
  },
  'BS-K': {
    FullName: 'Potassium Base Saturation',
  },
  'BS-Ca': {
    FullName: 'Calcium Base Saturation',
  },
  'BS-Mg': {
    FullName: 'Magnesium Base Saturation',
  },
  'BS-Na': {
    FullName: 'Sodium Base Saturation',
  },
  'ESP': {
    FullName: 'Exchangeable Sodium Percentage',
  },
  'ENR': {
    FullName: 'Estimated Nitrogen Release',
  }
}

export const others: Record<string, any> = {
  /*
 // Not in modus
  'TP2O5': {
    FullName: 'Total Phosphorus Pentoxide',
  },
  'TK2O': {
    FullName: 'Total Potassium Oxide'
  },
// None of these exist as 'Total X', only as 'X'.
  'TCa': {
    FullName: 'Total Calcium',
  },
  'TZn': {
    FullName: 'Total Zinc',
  },
  'TMg': {
    FullName: 'Total Magnesium',
  },
  'TFe': {
    FullName: 'Total Iron',
  },
  'TMn': {
    FullName: 'Total Manganese',
  },
  'TCu': {
    FullName: 'Total Copper',
  },
  'TB': {
    FullName: 'Total Boron',
  },
  'TMo': {
    FullName: 'Total Molybdenum',
  },
  'TNi': {
    FullName: 'Total Nickel',
  },
  'TAs': {
    FullName: 'Total Arsenic',
  },
  'TCd': {
    FullName: 'Total Cadmium',
  },
  'TPd': {
    FullName: 'Total Lead',
  },
  'TCr': {
    FullName: 'Total Chromium',
  },
  'TCo': {
    FullName: 'Total Cobalt',
  },
  'TSe': {
    FullName: 'T Selenium',
  },
  'PSNT-N': {
    FullName: 'Pre-Sidedress Nitrate Test Nitrogen'
  }
  'CO2-Respiration': {
    FullName: 'CO2 Respiration',
  },
  'Ace-Protein': {
    FullName: 'Ace Protein',
  },


  'Dry-Weight': {
    FullName: 'Dry Weight',
  },
  'Rock-Volume': {
    FullName: 'Rock Volume',
  },
  'Rock-Density': {
    FullName: 'Rock Density',
  },
  'Rock-Weight': {
    FullName: 'Rock Weight',
  },
  'Root Weight': {
    FullName: 'Root Weight'
  },
  'Excess-Lime': {
    FullName: 'Excess Lime',
  },
   */

/* I argue these should be different FullNames, but they currently all map to 'Moisture'
  'Aggregate Stability 1-2mm %': {
    FullName: 'Aggregate Stability 1-2mm %',
  },
  'Aggregate Stability 1-2mm in bulk soil %': {
    FullName: 'Aggregate Stability 1-2mm in bulk soil %',
  },
  'Available Water inch H2O inch-1 of soil': {
    FullName: 'Moisture',
  },
  'Total Available Water inches H2O sample-1': {
    FullName: 'Moisture',
  },
  'Field Capacity % (wt.)': {
    FullName: 'Moisture',
  },
  'Permanent Wilting Point % (wt.': {
    FullName: 'Moisture'
  },
*/

}
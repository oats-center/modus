declare const _default: {
    _type: string;
    ModusResult: {
        Events: {
            EventMetaData: {
                EventCode: string;
                EventDate: string;
                EventType: string;
            };
            LabMetaData: {
                LabName: string;
                LabEventID: string;
                Contact: {
                    Name: string;
                    Phone: string;
                    Address: string;
                };
                ReceivedDate: string;
                ProcessedDate: string;
                ClientAccount: {
                    AccountNumber: string;
                    Company: string;
                    City: string;
                    State: string;
                };
                Reports: {
                    "1": {
                        LabReportID: string;
                    };
                };
            };
            FMISMetaData: {
                FMISEventID: string;
                FMISProfile: {
                    Grower: string;
                    Farm: string;
                    Field: string;
                    "Sub-Field": string;
                };
            };
            EventSamples: {
                Soil: {
                    DepthRefs: {
                        "1": {
                            Name: string;
                            StartingDepth: number;
                            EndingDepth: number;
                            ColumnDepth: number;
                            DepthUnit: string;
                        };
                    };
                    SoilSamples: ({
                        SampleMetaData: {
                            SampleNumber: number;
                            ReportID: number;
                        };
                        Depths: {
                            DepthID: string;
                            NutrientResults: {
                                pH: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                OM: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                P: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                K: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                Ca: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                Mg: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                CEC: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                "BS-Ca": {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                "BS-Mg": {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                "BS-K": {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                "SO4-S": {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                Zn: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                Mn: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                B: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                            };
                        }[];
                    } | {
                        SampleMetaData: {
                            SampleNumber: number;
                            ReportID: number;
                        };
                        Depths: {
                            DepthID: string;
                            NutrientResults: {
                                pH: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                OM: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                P: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                K: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                Ca: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                Mg: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                CEC: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                "BS-Ca": {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                "BS-Mg": {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                "BS-K": {
                                    Value: number;
                                    ValueUnit: string;
                                };
                            };
                        }[];
                    } | {
                        SampleMetaData: {
                            SampleNumber: number;
                            ReportID: number;
                        };
                        Depths: {
                            DepthID: string;
                            NutrientResults: {
                                pH: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                BpH: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                OM: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                P: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                K: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                Ca: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                Mg: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                CEC: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                "BS-Ca": {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                "BS-Mg": {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                "BS-K": {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                "BS-H": {
                                    Value: number;
                                    ValueUnit: string;
                                };
                            };
                        }[];
                    } | {
                        SampleMetaData: {
                            SampleNumber: number;
                            ReportID: number;
                        };
                        Depths: {
                            DepthID: string;
                            NutrientResults: {
                                pH: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                OM: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                P: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                K: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                Ca: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                Mg: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                CEC: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                "BS-Ca": {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                "BS-Mg": {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                "BS-K": {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                "BS-H": {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                "SO4-S": {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                Zn: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                Mn: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                B: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                            };
                        }[];
                    } | {
                        SampleMetaData: {
                            SampleNumber: number;
                            ReportID: number;
                        };
                        Depths: {
                            DepthID: string;
                            NutrientResults: {
                                pH: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                BpH: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                OM: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                P: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                K: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                Ca: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                Mg: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                CEC: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                "BS-Ca": {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                "BS-Mg": {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                "BS-K": {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                "BS-H": {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                "SO4-S": {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                Zn: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                Mn: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                B: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                            };
                        }[];
                    } | {
                        SampleMetaData: {
                            SampleNumber: number;
                            ReportID: number;
                        };
                        Depths: {
                            DepthID: string;
                            NutrientResults: {
                                pH: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                OM: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                P: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                K: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                Ca: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                Mg: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                CEC: {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                "BS-Ca": {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                "BS-Mg": {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                "BS-K": {
                                    Value: number;
                                    ValueUnit: string;
                                };
                                "BS-H": {
                                    Value: number;
                                    ValueUnit: string;
                                };
                            };
                        }[];
                    })[];
                };
            };
        }[];
    };
};
export default _default;

export default `<?xml version="1.0" encoding="UTF-8"?>
<!-- This example is hand-transcribed from the associated PDF lab test result document. 
     Several of the items present in the lab-produced Modus format are therefore unknown
     because this example only contains information that can be found on the PDF itself. -->

<ModusResult>
  <Event>

    <EventMetaData>

      <!-- refers to the ID of the soil test event in an FMIS software.  In the PDF file,
           this is the thing in parentheses beside the "Field" name. -->
      <EventCode>ece3a2a8-4340-48b1-ae1f-d48d1f1e1692</EventCode>

      <!-- We do not have the date the samples were taken, we only have received and reported
           The lab-generated Modus used the "Date Received" here. -->
      <EventDate>2021-09-24</EventDate>

      <!-- options are Soil Plant Nematode Water Residue -->
      <EventType>
        <Soil/>
      </EventType>

    </EventMetaData>

    <LabMetaData>
      <LabName>A &amp; L Great Lakes Laboratories</LabName>
      <!-- 
        <LabID>993ea57e-9364-4477-8ebc-45e1b2464a60</LabID>
        The lab-generated Modus has a LabID of 993ea57e-9364-4477-8ebc-45e1b2464a60, but
        that string is not present in the PDF.  There is probably a database somewhere
        of these ID's, but I do not know where yet.
      -->

      <LabEventID>F21267-0039</LabEventID>
      <!-- The reportid seems to be of the form <2-digit year><3-digit day number>-<sequence #>
        but that sequence number is for all the samples the lab ran that day, not just the ones
        that go with this "Event".  i.e. reportID = F211267-0039 on the top of our PDF
        was the 39th report generated on the 267th day of 2021 (Sep 24).
      -->

      <Contact><!-- This is the LAB'S contact info, not the person sending the sample in -->
        <Name>A &amp; L Great Lakes Laboratories</Name>
        <Phone>260.483.4759</Phone><!-- The phone number in the PDF has dots -->
        <Address>
          3505 Conestoga Dr.
          Fort Wayne, IN 46808
        </Address>
      </Contact>


      <!-- minOccurs = 0
        <TestPackageRefs></TestPackageRefs>
        We do not have anything on the PDF about which test packages (i.e. groups of test assays) that were requested or performed.
      -->

      <!-- The lab-generated Modus has all the times as noon, but we don't have a time on the PDF. -->
      <ReceivedDate>2021-09-24T00:00:00.000</ReceivedDate>
      <ProcessedDate>2021-09-28T00:00:00.000</ProcessedDate>

      <ClientAccount>
        <!-- the PDF says the account number is "30039/30001", but the lab-generated
             Modus says it's just the first part before the slash. -->
        <AccountNumber>30039</AccountNumber>
        <!-- the lab-generated Modus has "Name" empty, but "Company" filled out with first
             line of the PDF's "To:" field.  -->
        <Name></Name>
        <Company>THE ANDERSONS FARM CTR - GPS</Company>
        <City>N MANCHESTER</City>
        <State>IN</State>
      </ClientAccount>

      <Reports>
        <!-- Lab-generated Modus has just "1" here for the "ReportID" -->
        <Report ReportID="1">
          <!-- This is the "Report Number" on the PDF -->
          <LabReportID>F21271-0035</LabReportID>
        </Report>
      </Reports>

    </LabMetaData>

    <FMISMetaData>
      <!-- In the lab-generated Modus, FMISEventID is the same as the "Event Code" above.
           In the PDF, It's the string in parentheses after the "Field" name. -->
      <FMISEventID>ece3a2a8-4340-48b1-ae1f-d48d1f1e1692</FMISEventID>
      <FMISProfile>
        <Grower ID="CARL AULT"></Grower>
        <Farm ID="ENYART EAST 50"></Farm>
        <Field ID="50.1 AC"></Field>
        <Sub-Field ID=""></Sub-Field>
      </FMISProfile>
    </FMISMetaData>

    <EventSamples>
      <Soil>

        <!-- Modus's structure requires that nutrient sample results be listed under 
             a "depth".  However, in our PDF, we do not have any information about 
             depth.  Modus has no guidance on a "default" depth if unknown, so we'll
             just go with 0-8 inches here as a default and list the "Name" as "Unknown Depth". -->
        <DepthRefs>
          <DepthRef DepthID="1">
            <Name>Unknown Depth</Name>
            <StartingDepth>0</StartingDepth>
            <EndingDepth>8</EndingDepth>
            <ColumnDepth>8</ColumnDepth>
            <DepthUnit>in</DepthUnit>
          </DepthRef>
        </DepthRefs>

        <SoilSample>
          <SampleMetaData>
            <SampleNumber>1</SampleNumber>
            <ReportID>28051</ReportID>
          </SampleMetaData>
          <Depths>
            <Depth DepthID="1">
              <NutrientResults>
                <NutrientResult><Element>pH</Element><Value>7.0</Value><ValueUnit>none</ValueUnit></NutrientResult>
                <NutrientResult><Element>OM</Element><Value>2.4</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>P</Element><Value>34</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>K</Element><Value>161</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Ca</Element><Value>1150</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Mg</Element><Value>240</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>CEC</Element><Value>8.2</Value><ValueUnit>meq/100g</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-Ca</Element><Value>70.4</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-Mg</Element><Value>24.5</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-K</Element><Value>5.1</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>SO4-S</Element><Value>7</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Zn</Element><Value>3.3</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Mn</Element><Value>46</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>B</Element><Value>0.7</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
              </NutrientResults>
            </Depth>
          </Depths>
        </SoilSample>

        <!-- Not all values are always reported on every line of the PDF.  -->
        <SoilSample>
          <SampleMetaData>
            <SampleNumber>2</SampleNumber>
            <ReportID>28052</ReportID>
          </SampleMetaData>
          <Depths>
            <Depth DepthID="1">
              <NutrientResults>
                <NutrientResult><Element>pH</Element><Value>7.6</Value><ValueUnit>none</ValueUnit></NutrientResult>
                <NutrientResult><Element>OM</Element><Value>2.7</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>P</Element><Value>30</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>K</Element><Value>190</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Ca</Element><Value>1950</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Mg</Element><Value>265</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>CEC</Element><Value>12.4</Value><ValueUnit>meq/100g</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-Ca</Element><Value>78.3</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-Mg</Element><Value>17.7</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-K</Element><Value>3.9</Value><ValueUnit>%</ValueUnit></NutrientResult>
              </NutrientResults>
            </Depth>
          </Depths>
        </SoilSample>
        
        <SoilSample>
          <SampleMetaData>
            <SampleNumber>3</SampleNumber>
            <ReportID>28053</ReportID>
          </SampleMetaData>
          <Depths>
            <Depth DepthID="1">
              <NutrientResults>
                <NutrientResult><Element>pH</Element><Value>7.2</Value><ValueUnit>none</ValueUnit></NutrientResult>
                <NutrientResult><Element>OM</Element><Value>2.7</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>P</Element><Value>35</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>K</Element><Value>178</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Ca</Element><Value>1600</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Mg</Element><Value>290</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>CEC</Element><Value>10.9</Value><ValueUnit>meq/100g</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-Ca</Element><Value>73.6</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-Mg</Element><Value>22.2</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-K</Element><Value>4.2</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>SO4-S</Element><Value>7</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Zn</Element><Value>3.8</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Mn</Element><Value>61</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>B</Element><Value>0.7</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
              </NutrientResults>
            </Depth>
          </Depths>
        </SoilSample>

        <SoilSample>
          <SampleMetaData>
            <SampleNumber>4</SampleNumber>
            <ReportID>28054</ReportID>
          </SampleMetaData>
          <Depths>
            <Depth DepthID="1">
              <NutrientResults>
                <NutrientResult><Element>pH</Element><Value>6.7</Value><ValueUnit>none</ValueUnit></NutrientResult>
                <NutrientResult><Element>BpH</Element><Value>6.9</Value><ValueUnit>none</ValueUnit></NutrientResult>
                <NutrientResult><Element>OM</Element><Value>3.1</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>P</Element><Value>52</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>K</Element><Value>228</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Ca</Element><Value>1600</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Mg</Element><Value>305</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>CEC</Element><Value>12.3</Value><ValueUnit>meq/100g</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-Ca</Element><Value>64.9</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-Mg</Element><Value>20.6</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-K</Element><Value>4.7</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-H</Element><Value>9.7</Value><ValueUnit>%</ValueUnit></NutrientResult>
              </NutrientResults>
            </Depth>
          </Depths>
        </SoilSample>

        <SoilSample>
          <SampleMetaData>
            <SampleNumber>5</SampleNumber>
            <ReportID>28055</ReportID>
          </SampleMetaData>
          <Depths>
            <Depth DepthID="1">
              <NutrientResults>
                <NutrientResult><Element>pH</Element><Value>7.4</Value><ValueUnit>none</ValueUnit></NutrientResult>
                <NutrientResult><Element>OM</Element><Value>3.3</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>P</Element><Value>36</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>K</Element><Value>205</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Ca</Element><Value>2250</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Mg</Element><Value>365</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>CEC</Element><Value>14.8</Value><ValueUnit>meq/100g</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-Ca</Element><Value>75.9</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-Mg</Element><Value>20.5</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-K</Element><Value>4.7</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>SO4-S</Element><Value>7</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Zn</Element><Value>4.0</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Mn</Element><Value>49</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>B</Element><Value>1.2</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
              </NutrientResults>
            </Depth>
          </Depths>
        </SoilSample>

        <SoilSample>
          <SampleMetaData>
            <SampleNumber>6</SampleNumber>
            <ReportID>28056</ReportID>
          </SampleMetaData>
          <Depths>
            <Depth DepthID="1">
              <NutrientResults>
                <NutrientResult><Element>pH</Element><Value>7.2</Value><ValueUnit>none</ValueUnit></NutrientResult>
                <NutrientResult><Element>OM</Element><Value>2.0</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>P</Element><Value>44</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>K</Element><Value>151</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Ca</Element><Value>1100</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Mg</Element><Value>255</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>CEC</Element><Value>8.0</Value><ValueUnit>meq/100g</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-Ca</Element><Value>68.6</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-Mg</Element><Value>26.5</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-K</Element><Value>4.8</Value><ValueUnit>%</ValueUnit></NutrientResult>
              </NutrientResults>
            </Depth>
          </Depths>
        </SoilSample>

        <SoilSample>
          <SampleMetaData>
            <SampleNumber>7</SampleNumber>
            <ReportID>28057</ReportID>
          </SampleMetaData>
          <Depths>
            <Depth DepthID="1">
              <NutrientResults>
                <NutrientResult><Element>pH</Element><Value>6.9</Value><ValueUnit>none</ValueUnit></NutrientResult>
                <NutrientResult><Element>OM</Element><Value>2.3</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>P</Element><Value>44</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>K</Element><Value>130</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Ca</Element><Value>1050</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Mg</Element><Value>220</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>CEC</Element><Value>7.5</Value><ValueUnit>meq/100g</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-Ca</Element><Value>69.7</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-Mg</Element><Value>24.3</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-K</Element><Value>4.4</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-H</Element><Value>1.5</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>SO4-S</Element><Value>5</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Zn</Element><Value>3.1</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Mn</Element><Value>43</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>B</Element><Value>0.4</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
              </NutrientResults>
            </Depth>
          </Depths>
        </SoilSample>

        <SoilSample>
          <SampleMetaData>
            <SampleNumber>8</SampleNumber>
            <ReportID>28058</ReportID>
          </SampleMetaData>
          <Depths>
            <Depth DepthID="1">
              <NutrientResults>
                <NutrientResult><Element>pH</Element><Value>7.1</Value><ValueUnit>none</ValueUnit></NutrientResult>
                <NutrientResult><Element>OM</Element><Value>1.8</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>P</Element><Value>44</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>K</Element><Value>96</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Ca</Element><Value>900</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Mg</Element><Value>185</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>CEC</Element><Value>6.3</Value><ValueUnit>meq/100g</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-Ca</Element><Value>71.6</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-Mg</Element><Value>24.5</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-K</Element><Value>3.9</Value><ValueUnit>%</ValueUnit></NutrientResult>
              </NutrientResults>
            </Depth>
          </Depths>
        </SoilSample>

        <SoilSample>
          <SampleMetaData>
            <SampleNumber>9</SampleNumber>
            <ReportID>28059</ReportID>
          </SampleMetaData>
          <Depths>
            <Depth DepthID="1">
              <NutrientResults>
                <NutrientResult><Element>pH</Element><Value>7.2</Value><ValueUnit>none</ValueUnit></NutrientResult>
                <NutrientResult><Element>OM</Element><Value>2.1</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>P</Element><Value>46</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>K</Element><Value>173</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Ca</Element><Value>1100</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Mg</Element><Value>220</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>CEC</Element><Value>7.8</Value><ValueUnit>meq/100g</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-Ca</Element><Value>70.7</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-Mg</Element><Value>23.6</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-K</Element><Value>5.7</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>SO4-S</Element><Value>6</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Zn</Element><Value>7.5</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Mn</Element><Value>62</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>B</Element><Value>0.6</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
              </NutrientResults>
            </Depth>
          </Depths>
        </SoilSample>

        <SoilSample>
          <SampleMetaData>
            <SampleNumber>10</SampleNumber>
            <ReportID>28060</ReportID>
          </SampleMetaData>
          <Depths>
            <Depth DepthID="1">
              <NutrientResults>
                <NutrientResult><Element>pH</Element><Value>7.1</Value><ValueUnit>none</ValueUnit></NutrientResult>
                <NutrientResult><Element>OM</Element><Value>3.2</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>P</Element><Value>81</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>K</Element><Value>215</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Ca</Element><Value>1450</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Mg</Element><Value>310</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>CEC</Element><Value>10.4</Value><ValueUnit>meq/100g</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-Ca</Element><Value>69.8</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-Mg</Element><Value>24.9</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-K</Element><Value>5.3</Value><ValueUnit>%</ValueUnit></NutrientResult>
              </NutrientResults>
            </Depth>
          </Depths>
        </SoilSample>

        <SoilSample>
          <SampleMetaData>
            <SampleNumber>11</SampleNumber>
            <ReportID>28061</ReportID>
          </SampleMetaData>
          <Depths>
            <Depth DepthID="1">
              <NutrientResults>
                <NutrientResult><Element>pH</Element><Value>7.8</Value><ValueUnit>none</ValueUnit></NutrientResult>
                <NutrientResult><Element>OM</Element><Value>2.5</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>P</Element><Value>101</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>K</Element><Value>251</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Ca</Element><Value>2900</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Mg</Element><Value>190</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>CEC</Element><Value>10.4</Value><ValueUnit>meq/100g</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-Ca</Element><Value>86.7</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-Mg</Element><Value>9.5</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-K</Element><Value>3.8</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>SO4-S</Element><Value>6</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Zn</Element><Value>12.9</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Mn</Element><Value>56</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>B</Element><Value>1.0</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
              </NutrientResults>
            </Depth>
          </Depths>
        </SoilSample>

        <SoilSample>
          <SampleMetaData>
            <SampleNumber>12</SampleNumber>
            <ReportID>28062</ReportID>
          </SampleMetaData>
          <Depths>
            <Depth DepthID="1">
              <NutrientResults>
                <NutrientResult><Element>pH</Element><Value>7.4</Value><ValueUnit>none</ValueUnit></NutrientResult>
                <NutrientResult><Element>OM</Element><Value>2.5</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>P</Element><Value>72</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>K</Element><Value>139</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Ca</Element><Value>1200</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Mg</Element><Value>280</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>CEC</Element><Value>8.7</Value><ValueUnit>meq/100g</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-Ca</Element><Value>69.0</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-Mg</Element><Value>26.9</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-K</Element><Value>4.1</Value><ValueUnit>%</ValueUnit></NutrientResult>
              </NutrientResults>
            </Depth>
          </Depths>
        </SoilSample>

        <SoilSample>
          <SampleMetaData>
            <SampleNumber>13</SampleNumber>
            <ReportID>28063</ReportID>
          </SampleMetaData>
          <Depths>
            <Depth DepthID="1">
              <NutrientResults>
                <NutrientResult><Element>pH</Element><Value>6.7</Value><ValueUnit>none</ValueUnit></NutrientResult>
                <NutrientResult><Element>BpH</Element><Value>6.9</Value><ValueUnit>none</ValueUnit></NutrientResult>
                <NutrientResult><Element>OM</Element><Value>2.2</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>P</Element><Value>40</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>K</Element><Value>151</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Ca</Element><Value>1000</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Mg</Element><Value>210</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>CEC</Element><Value>8.3</Value><ValueUnit>meq/100g</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-Ca</Element><Value>60.0</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-Mg</Element><Value>21.0</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-K</Element><Value>4.6</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-H</Element><Value>14.4</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>SO4-S</Element><Value>6</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Zn</Element><Value>3.8</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Mn</Element><Value>57</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>B</Element><Value>0.4</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
              </NutrientResults>
            </Depth>
          </Depths>
        </SoilSample>

        <SoilSample>
          <SampleMetaData>
            <SampleNumber>14</SampleNumber>
            <ReportID>28066</ReportID>
          </SampleMetaData>
          <Depths>
            <Depth DepthID="1">
              <NutrientResults>
                <NutrientResult><Element>pH</Element><Value>6.8</Value><ValueUnit>none</ValueUnit></NutrientResult>
                <NutrientResult><Element>OM</Element><Value>1.6</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>P</Element><Value>19</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>K</Element><Value>139</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Ca</Element><Value>900</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Mg</Element><Value>205</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>CEC</Element><Value>6.8</Value><ValueUnit>meq/100g</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-Ca</Element><Value>66.5</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-Mg</Element><Value>25.2</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-K</Element><Value>5.3</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-H</Element><Value>3.0</Value><ValueUnit>%</ValueUnit></NutrientResult>
              </NutrientResults>
            </Depth>
          </Depths>
        </SoilSample>

        <SoilSample>
          <SampleMetaData>
            <SampleNumber>15</SampleNumber>
            <ReportID>28067</ReportID>
          </SampleMetaData>
          <Depths>
            <Depth DepthID="1">
              <NutrientResults>
                <NutrientResult><Element>pH</Element><Value>6.3</Value><ValueUnit>none</ValueUnit></NutrientResult>
                <NutrientResult><Element>BpH</Element><Value>6.8</Value><ValueUnit>none</ValueUnit></NutrientResult>
                <NutrientResult><Element>OM</Element><Value>3.6</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>P</Element><Value>85</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>K</Element><Value>245</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Ca</Element><Value>1600</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Mg</Element><Value>295</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>CEC</Element><Value>13.5</Value><ValueUnit>meq/100g</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-Ca</Element><Value>59.3</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-Mg</Element><Value>18.2</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-K</Element><Value>4.7</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-H</Element><Value>17.8</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>SO4-S</Element><Value>7</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Zn</Element><Value>5.8</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Mn</Element><Value>36</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>B</Element><Value>0.7</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
              </NutrientResults>
            </Depth>
          </Depths>
        </SoilSample>

        <SoilSample>
          <SampleMetaData>
            <SampleNumber>16</SampleNumber>
            <ReportID>28068</ReportID>
          </SampleMetaData>
          <Depths>
            <Depth DepthID="1">
              <NutrientResults>
                <NutrientResult><Element>pH</Element><Value>6.6</Value><ValueUnit>none</ValueUnit></NutrientResult>
                <NutrientResult><Element>BpH</Element><Value>6.9</Value><ValueUnit>none</ValueUnit></NutrientResult>
                <NutrientResult><Element>OM</Element><Value>1.5</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>P</Element><Value>57</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>K</Element><Value>146</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Ca</Element><Value>750</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Mg</Element><Value>160</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>CEC</Element><Value>6.7</Value><ValueUnit>meq/100g</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-Ca</Element><Value>56.3</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-Mg</Element><Value>20.0</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-K</Element><Value>5.6</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-H</Element><Value>18.0</Value><ValueUnit>%</ValueUnit></NutrientResult>
              </NutrientResults>
            </Depth>
          </Depths>
        </SoilSample>

        <SoilSample>
          <SampleMetaData>
            <SampleNumber>17</SampleNumber>
            <ReportID>28069</ReportID>
          </SampleMetaData>
          <Depths>
            <Depth DepthID="1">
              <NutrientResults>
                <NutrientResult><Element>pH</Element><Value>6.8</Value><ValueUnit>none</ValueUnit></NutrientResult>
                <NutrientResult><Element>OM</Element><Value>1.6</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>P</Element><Value>53</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>K</Element><Value>145</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Ca</Element><Value>700</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Mg</Element><Value>175</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>CEC</Element><Value>5.5</Value><ValueUnit>meq/100g</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-Ca</Element><Value>63.7</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-Mg</Element><Value>26.5</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-K</Element><Value>6.8</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-H</Element><Value>3.0</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>SO4-S</Element><Value>5</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Zn</Element><Value>3.3</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Mn</Element><Value>43</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>B</Element><Value>0.5</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
              </NutrientResults>
            </Depth>
          </Depths>
        </SoilSample>

        <SoilSample>
          <SampleMetaData>
            <SampleNumber>18</SampleNumber>
            <ReportID>28070</ReportID>
          </SampleMetaData>
          <Depths>
            <Depth DepthID="1">
              <NutrientResults>
                <NutrientResult><Element>pH</Element><Value>6.5</Value><ValueUnit>none</ValueUnit></NutrientResult>
                <NutrientResult><Element>BpH</Element><Value>6.9</Value><ValueUnit>none</ValueUnit></NutrientResult>
                <NutrientResult><Element>OM</Element><Value>2.5</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>P</Element><Value>53</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>K</Element><Value>180</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Ca</Element><Value>1100</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Mg</Element><Value>240</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>CEC</Element><Value>9.2</Value><ValueUnit>meq/100g</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-Ca</Element><Value>60.0</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-Mg</Element><Value>21.8</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-K</Element><Value>5.0</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-H</Element><Value>13.1</Value><ValueUnit>%</ValueUnit></NutrientResult>
              </NutrientResults>
            </Depth>
          </Depths>
        </SoilSample>

        <SoilSample>
          <SampleMetaData>
            <SampleNumber>19</SampleNumber>
            <ReportID>28071</ReportID>
          </SampleMetaData>
          <Depths>
            <Depth DepthID="1">
              <NutrientResults>
                <NutrientResult><Element>pH</Element><Value>6.1</Value><ValueUnit>none</ValueUnit></NutrientResult>
                <NutrientResult><Element>BpH</Element><Value>6.7</Value><ValueUnit>none</ValueUnit></NutrientResult>
                <NutrientResult><Element>OM</Element><Value>5.3</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>P</Element><Value>102</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>K</Element><Value>260</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Ca</Element><Value>2050</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Mg</Element><Value>370</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>CEC</Element><Value>17.6</Value><ValueUnit>meq/100g</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-Ca</Element><Value>58.2</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-Mg</Element><Value>17.5</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-K</Element><Value>3.8</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-H</Element><Value>20.5</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>SO4-S</Element><Value>9</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Zn</Element><Value>5.7</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Mn</Element><Value>30</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>B</Element><Value>0.7</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
              </NutrientResults>
            </Depth>
          </Depths>
        </SoilSample>

        <SoilSample>
          <SampleMetaData>
            <SampleNumber>20</SampleNumber>
            <ReportID>28072</ReportID>
          </SampleMetaData>
          <Depths>
            <Depth DepthID="1">
              <NutrientResults>
                <NutrientResult><Element>pH</Element><Value>6.9</Value><ValueUnit>none</ValueUnit></NutrientResult>
                <NutrientResult><Element>OM</Element><Value>1.9</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>P</Element><Value>54</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>K</Element><Value>135</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Ca</Element><Value>850</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>Mg</Element><Value>195</Value><ValueUnit>ppm</ValueUnit></NutrientResult>
                <NutrientResult><Element>CEC</Element><Value>6.3</Value><ValueUnit>meq/100g</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-Ca</Element><Value>67.3</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-Mg</Element><Value>25.7</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-K</Element><Value>5.5</Value><ValueUnit>%</ValueUnit></NutrientResult>
                <NutrientResult><Element>BS-H</Element><Value>1.5</Value><ValueUnit>%</ValueUnit></NutrientResult>
              </NutrientResults>
            </Depth>
          </Depths>
        </SoilSample>



      </Soil>
    </EventSamples>


  </Event>


</ModusResult>
`;
//# sourceMappingURL=hand-modus_xml.js.map
# Soildata visualizatation
A small API that helps you to make beautiful presentations of your soil data.

## Make a request
You can send one or many modis json files:
### Curl
```bash
curl --location --request POST 'https://soilapi.farmonapp.com/modus_json_to_html' \
--header 'Content-Type: multipart/form-data' \
--form 'files=@"modus/examples/examples/tomkat-historic/tomkat_source_data2015_RMN0-10cm_3.json"' \
--form 'files=@"modus/examples/examples/tomkat-historic/tomkat_source_data2015_RMN10-40cm_1.json"' \
--form 'files=@"modus/examples/examples/tomkat-historic/tomkat_source_data2015_RMN10-40cm_2.json"'
```

### Javascript
```javascript
var myHeaders = new Headers();
myHeaders.append("Content-Type", "multipart/form-data");

var formdata = new FormData();
formdata.append("files", fileInput.files[0], "tomkat_source_data2015_RMN0-10cm_3.json");
formdata.append("files", fileInput.files[0], "tomkat_source_data2015_RMN10-40cm_1.json");
formdata.append("files", fileInput.files[0], "tomkat_source_data2015_RMN10-40cm_2.json");

var requestOptions = {
  method: 'POST',
  headers: myHeaders,
  body: formdata,
  redirect: 'follow'
};

fetch("https://soilapi.farmonapp.com/modus_json_to_html", requestOptions)
  .then(response => response.text())
  .then(result => console.log(result))
  .catch(error => console.log('error', error));
```

### Python
```python
import requests
url = "https://soilapi.farmonapp.com/modus_json_to_html"

payload={}
files=[
  ('files',('tomkat_source_data2015_RMN0-10cm_3.json',open('modus/examples/examples/tomkat-historic/tomkat_source_data2015_RMN0-10cm_3.json','rb'),'application/json')),
  ('files',('tomkat_source_data2015_RMN10-40cm_1.json',open('modus/examples/examples/tomkat-historic/tomkat_source_data2015_RMN10-40cm_1.json','rb'),'application/json')),
  ('files',('tomkat_source_data2015_RMN10-40cm_2.json',open('modus/examples/examples/tomkat-historic/tomkat_source_data2015_RMN10-40cm_2.json','rb'),'application/json'))
]
headers = {
  'Content-Type': 'multipart/form-data'
}

response = requests.request("POST", url, headers=headers, data=payload, files=files)

print(response.text)

```

### Without API
Requires the installation of jupyter and quarto.
```bash
quarto render visualize/soil_stack_api/app/reports/soil.qmd --to html
```

## Run the API
To run the API you will need to have docker installed.

from the folder visualize run
fill out `env-template.env` and rename it to `.env` 
`docker compose up -d`



# Modus xml/json command-line tools

---

## Install

This will install the "modus" command on your machine:

```bash
yarn global add @modusjs/cli
```

or, via npm:

```bash
npm install -g @modusjs/cli
```

## tojson

---

Convert one or more supported files into JSON. Name and path of output file is generally same as input with `.xml` replaced by `.json`.
Except for xlxs files which group samples by the inferred date, and then creates separate modus files for each group of dates within
each worksheet.

```bash
modus tojson ./path/to/xml/file1 ./path/to/xml/file2 ...etc...
modus tojson -f tomkat ./path/to/tomkat/formatted/xlsx_or_csv_file
```

## Modus-related monorepo

A monorepo for packages hosted on npm under the `@modusjs` org. All of the
underlying packages are Typescript.

## convert/

Universal (node + browser) library for converting between and validating Modus formats (XML, XLSX, CSV, JSON).

## examples/

Examples of modus soil samples, with source data, grouped by lab name. They are published from this repo to npm as directly-importable xml strings, base64 xlsx strings,
and json objects (with types).

Data in the examples repository is released into the public domain under the Creative Commons CCO 1.0 Universal Public Domain Dedication.

Thanks to Point Blue Conservation Science (https://pointblue.org) and TomKat Ranch (https://tomkatranch.org) for providing historic
soil sampling data in the `tomkat-historic` directory.

## cli/

Command-line wrapper for running the `convert` functions on the command line. Converts lists of files between Modus XML
and JSON.

## Monorepo Structure

The monorepo is managed by Yarn workspaces. `cli`, `convert`, and `examples` are all individual repositories.

The code for all repos is written in Typescript. Packages should be universal (node and browser)
unless otherwise specified.

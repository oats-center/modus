Modus-related monorepo
------------------------------------------------------------------------
A monorepo for packages hosted on npm under the `@modusjs` org.  Most (all?) of the 
underlying packages are Typescript.


libs/xml
----------
Package for parsing and validating Modus XML files.


examples/
-----------
Examples of modus soil samples, grouped by lab name.


Monorepo Structure
------------------
The monorepo is managed by Yarn workspaces.  Anyting in `libs` is considered individual packages.

The code for all repos is written in Typescript.  Packages should be universal (node and browser)
unless otherwise specified.



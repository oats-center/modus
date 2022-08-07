Modus-related monorepo
------------------------------------------------------------------------
A monorepo for packages hosted on npm under the `@modusjs` org.  All of the 
underlying packages are Typescript.


convert/
----------
Universal (node + browser) library for converting between and validating Modus formats (XML, JSON).


examples/
-----------
Examples of modus soil samples, grouped by lab name.  They are published to npm as directly importable xml strings 
and json objects (with types).


cli/
----
Command-line wrapper for running the `convert` functions on the command line.  Converts lists of files between Modus XML
and JSON.


Monorepo Structure
------------------
The monorepo is managed by Yarn workspaces.  Anyting in `libs` is considered individual packages.

The code for all repos is written in Typescript.  Packages should be universal (node and browser)
unless otherwise specified.



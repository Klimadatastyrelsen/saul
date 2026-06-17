# SAUL

This is a collection of stand-alone methods for photogrammetry calculations and API interactions that are primarily used by https://github.com/SDFIdk/skraafoto_frontend

You can use these as building blocks for your own web application that wants to interface with STAC API for Danske Skråfotos.

## Installation

1. Install via NPM:
```
npm i --save @dataforsyningen/saul
```

2. Create a configuration file or Javascript object with proper values and make sure to load it into your application before using any of the SAUL utilities. This package ships with an example configuration file at [`config.js.example`](config.js.example)

## How to use

This is an example of how to import and use those utilities in Javascript:
```
import auth from './config.js' // This is the path to your configuration file
import {getSTAC} from '@dataforsyningen/saul'

let response = await getSTAC('/some-stac-endpoint', auth)
console.log(response)
```

## API docs

To read the docs, first build the documentation with JSDoc:
```
npm run docs
```
A `docs` directory will be created with a bunch of HTML files containing the documentation.

## How to test

From within `node_modules/@dataforsyningen/saul` you can run the `test` command to check that saul core features are still working.
```
npm run test
```

Or if you have Docker, you may run the test in a container:
```shell
docker compose run --rm saul
```

## Updating local terrain model

The Saul package includes a terrain elevation model hosted as a single GeoTiff file for events where terrain data from Datafordeler service is unavailable. To update the terrain model, simply download a new GeoTiff from Datafordeler with the following URL (supply your own username/password) and save it to `/assets/dk-terrain.tiff` in the package directory.

https://wcs.datafordeler.dk/DHMNedboer/dhm_wcs/1.0.0/WCS?SERVICE=WCS&COVERAGE=dhm_terraen&RESPONSE_CRS=epsg:25832&CRS=epsg:25832&FORMAT=GTiff&REQUEST=GetCoverage&VERSION=1.0.0&apikey=xxx&height=1000&width=1260&bbox=430000,6040000,900000,6413000


## Acknowledgements

SAUL is made available under the MIT license by
The Skråfoto Team @ [KDS](https://kds.dk/)

// You should add your own config.js with proper tokens, etc.
// Check config.js.example for info on how to set it up
import auth from '../config.js'

import assert from 'assert'
import { getElevation, get, getTerrainGeoTIFF, getZ, OLDgetZ, getWorldXYZ, world2image, getTerrainByBbox } from '../index.js'

console.log('---------------')
console.log('Elevation tests')
console.log('---------------')

// Vars
const stac_item = '2021_83_29_2_0019_00003995'
const fidelity = 0.03 // Higher number means more points and better precision
const max_deviation = 0.5

// STAC API endpoint
let url_stac = auth.API_STAC_BASEURL + '/search?limit=1&crs=http://www.opengis.net/def/crs/EPSG/0/25832&token=9b554b6c854184c3b0f377ffc7481585'
url_stac += `&ids=${ stac_item }`

function is_equalIsh(num1, num2, deviation = max_deviation) {
  if (Math.abs(num1 - num2) > deviation) {
    return false
  } else {
    return true
  }
}

function getRandomCoordinate(bbox) {
  const x = bbox[0] + Math.random() * (bbox[2] - bbox[0])
  const y = bbox[1] + Math.random() * (bbox[3] - bbox[1])
  return [x,y]
}

function testGetElevationAnumberOfTimes(data, bbox, times) {
  for (let i = 1; i <= times; i++) {
    const world1 = getRandomCoordinate(bbox)
    compareElevations(world1[0], world1[1], data)
  }
}

function getRandomImageXY(image) {
  const shapex = image.properties['proj:shape'][0]
  const shapey = image.properties['proj:shape'][1]
  const x = Math.floor(shapex - Math.random() * shapex)
  const y = Math.floor(shapey - Math.random() * shapey)
  return [x,y]
}

function testGetWorldXYZAnumberOfTimes(item, terrain, times) {
  for (let i = 1; i <= times; i++) {
    const xy = getRandomImageXY(item)
    getWorldXYZ({
      xy: xy,
      image: item,
      terrain: terrain
    }).then(world_xy => {
      compareElevations(world_xy[0], world_xy[1], terrain)
      const image_coords = world2image(item, world_xy[0], world_xy[1], world_xy[2])
      assert(is_equalIsh(image_coords[0], xy[0], 2), `Image x coordinates ${image_coords[0]} / ${xy[0]} do not match`)
      assert(is_equalIsh(image_coords[1], xy[1], 2), `Image y coordinates ${image_coords[1]} / ${xy[1]} do not match`)
      console.log('getWorldXYZ => world2image OK')
    })
  }
}

function compareElevations(x,y,geotiff) {
  getElevation(x, y, geotiff)
  .then(elevation => {
    getZ(x, y, auth)
    .then(getz_e => {
      assert(is_equalIsh(getz_e, elevation, 2.7), `Elevations ${elevation} / ${getz_e} at ${x} ${y} are way apart`)
      console.log(`Elevation at ${ x } ${ y } with delta ${Math.abs(elevation - getz_e).toFixed(2)} OK`)
    })
  })
  getZ(x, y, auth)
  .then(getz_e => {
    OLDgetZ(x, y, auth)
    .then(OLDgetz_e => {
      assert(is_equalIsh(OLDgetz_e, getz_e, 0), `New/old elevations ${getz_e} / ${OLDgetz_e} at ${x} ${y} are way apart`)
      console.log(`New/old elevation at ${ x } ${ y } with delta ${Math.abs(getz_e - OLDgetz_e).toFixed(2)} OK`)
    })
  })
}

// Test getTerrainGeoTIFF and getElevation with a STAC API item
get(url_stac)
.then((json) => {

  const width = Math.round( json.features[0].properties['proj:shape'][0] * fidelity )
  const height = Math.round( json.features[0].properties['proj:shape'][1] * fidelity )

  console.info('fetching', width * height, 'data points as GeoTiff image')

  getTerrainGeoTIFF(json.features[0], auth, fidelity)
  .then(data => {

    // Testing getElevation
    try {
      testGetElevationAnumberOfTimes(data, json.features[0].bbox, 5)
    } catch(error) {
      console.error(error)
    }

    // Testing getWorldXYZ
    try {
      testGetWorldXYZAnumberOfTimes(json.features[0], data, 10)
    } catch(error) {
      console.error(error)
    }

  })

})
.catch((err) => {
  console.log('THE ERROR', err)
})

// Testing getTerrainByBbox()
try {
  const gtiff = await getTerrainByBbox([542929.6729020511, 6153925.479277819, 544463.7189110086, 6155242.76541582], auth)
  assert(gtiff.fileDirectory.ImageWidth === 500, 'GeoTIFF has weird dimensions')
  console.log('Test getTerrainByBbox() => OK')
} catch(error) {
  console.error(error)
}

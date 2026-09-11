// You should add your own config.js with proper tokens, etc.
// Check config.js.example for info on how to set it up
import auth from '../config.js'

import { Assert } from './assert.js'
import { getElevation, get, getTerrainGeoTIFF, getZ, getWorldXYZ, world2image, getTerrainByBbox } from '../index.js'

const assert = new Assert()

console.log('---------------')
console.log('Elevation tests')
console.log('---------------')

// Vars
const stac_item = '2021_83_29_2_0019_00003995'
const fidelity = 0.03 // Higher number means more points and better precision

// STAC API endpoint
let url_stac = auth.API_STAC_BASEURL + '/search?limit=1&crs=http://www.opengis.net/def/crs/EPSG/0/25832&token=9b554b6c854184c3b0f377ffc7481585'
url_stac += `&ids=${ stac_item }`

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
      assert.almostEqual(image_coords, xy, 2, `Image coordinates ${image_coords} / ${xy} do not match`)
      console.log('getWorldXYZ => world2image OK')
    })
    .catch(console.error)
  }
}

function compareElevations(x,y,geotiff) {
  getElevation(x, y, geotiff)
  .then(elevation =>
    getZ(x, y, auth)
    .then(getz_e =>
      assert.almostEqual(getz_e, elevation, 2.7, `Deviant elevation at (${x}, ${y}):`)
    )
  )
  .then(delta => console.log(`Elevation deviation ${delta.toFixed(2)} at (${x}, ${y}) OK`))
  .catch(console.error)
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
  assert.equal(gtiff.fileDirectory.ImageWidth, 500, 'GeoTIFF has weird dimensions')
  console.log('Test getTerrainByBbox() => OK')
} catch(error) {
  console.error(error)
}

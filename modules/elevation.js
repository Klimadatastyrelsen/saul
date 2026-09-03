import { getDHM, OLDgetDHM, get } from './api.js'
import { fromArrayBuffer } from 'geotiff'

/** Converts raw GeoTIFF arrayBuffer to image */
async function consumeGeoTIFF(raw_data) {
  const tiff = await fromArrayBuffer(raw_data)
  const image = await tiff.getImage()
  return image
}

function calcSizeRatio(sizeX, bbox) {
  const ratio = ( bbox[0] - bbox[2] ) / ( bbox[1] - bbox[3] )
  return Math.round(sizeX * ratio)
}

/** Fetches a GeoTIFF with elevation data matching the bounding box of a STAC API item (image)
 * @param {object} stac_item - STAC API item from a featureCollection request
 * @param {{API_DHM_WCS_BASEURL: string, API_DHM_KEY: string}} auth - API autentication data. See ../config.js.example for reference.
 * @param {number} [resolution] - Resolution (1 - 0.01). Higher number means more pixels and better precision.
 * @returns {object} GeoTiff data
 */
function getTerrainGeoTIFF(stac_item, auth, resolution = 0.05, sizeX = 300) {
  
  const bbox = stac_item.bbox
  const width = stac_item.properties ? Math.round( stac_item.properties['proj:shape'][0] * resolution ) : sizeX

  return getTerrainByBbox(bbox, auth, width)
}

/**
 * Fetches a geoTIFF with elevation data covering all of Denmark
 * @param {Object} options
 * @param {Object} options.src - URL to download a pre-generated GeoTiff.
 * @param {Object} options.auth - API autentication data. See ../config.js.example for reference.
 * @param {Number} options.size - Width of the geoTiff image to return
 * @returns GeoTIFF raster with elevation data
 */
function getDenmarkGeoTiff(options) {
  if (options.src) {
    return fetch(options.src)
    .then(response => response.arrayBuffer())
    .then(arrayBuffer => consumeGeoTIFF(arrayBuffer))
  } else {
    const auth = options.auth
    const size = options.size ? options.size : 1000
    return getTerrainByBbox([430000,6040000,900000,6413000], auth, size)
  }
}

/**  
 * Maps a coordinate from the one coordinate system to another based on GeoTiff image dimensions.
 * @param {Array} coord - EPSG:25832 X,Y coordinate pair
 * @param {Array} bbox - Bounding box within input coordinate systtem. Consists of 2 EPSG:25832 coordinate pairs. Example: [x1,y1,x2,y2]
 * @param {Array} imageDimensions - Width and height of a GeoTiff image. This will set the bounding box of the output coordinate system. Note: This coordinate system will have 0,0 set in the top right position of the image.
 */
function convertCoordinate(coord, bbox1, imageDimensions) {
  
  // Extract the coordinates from the bounding boxes
  const [x1_min, y1_min, x1_max, y1_max] = bbox1

  // Extract the coordinate to convert
  const [x1, y1] = coord

  // Calculate the width and height of both bounding boxes
  const width1 = x1_max - x1_min
  const height1 = y1_max - y1_min
  const width2 = imageDimensions[0]
  const height2 = imageDimensions[1]

  // Calculate the relative position in the first coordinate system
  const x_relative = (x1 - x1_min) / width1
  const y_relative = (y1 - y1_min) / height1

  // Calculate the new position in the second coordinate system
  const x2 = Math.abs(x_relative * width2)
  const y2 = height2 - Math.abs(y_relative * height2)

  return [x2, y2]
}

/** 
 * Calculates nearest elevation for given coordinate using geoTIFF terrain data
 * @param {number} x - EPSG:25832 X coordinate
 * @param {number} y - EPSG:25832 Y coordinate
 * @param {object} geoTiff - GeoTiff data output from getTerrainGeoTIFF() or getDenmarkGeoTiff() method
 * @returns {number} Elevation in meters 
 */
async function getElevation(x, y, geoTiff) {

  const bbox = geoTiff.getBoundingBox()
  const height = geoTiff.getHeight()
  const width = geoTiff.getWidth()

  // Convert lat/lon to geotiff x/y
  const [xPx, yPx] = convertCoordinate([x,y], bbox, [width, height])
 
  // Fetch window of raster values around x/y
  const window = [
    Math.floor(xPx), 
    Math.floor(yPx),
    Math.ceil(xPx),
    Math.ceil(yPx)
  ]
  
  // Fetch elevation value from geoTiff rasters
  const elevation_data = await geoTiff.readRasters({
    window: window,
    fillValue: 0
  })
  
  return elevation_data[0][0]
}

/** Creates an ASCII visualization of a GeoTiff with terrain elevation data. Useful for display in a terminal.
 * NOTE: You may want to use a downsmapled GeoTiff to fit within your terminal window. A GeoTiff pixel is represented by 3 characters each.
 * @param {object} gTiff - GeoTiff output from getTerrainGeoTIFF() or getDenmarkGeoTiff() method
 */
async function visualizeGeotiff(gTiff) {
  console.log('--- GTIFF visualization ---')
  const float32Arr = await gTiff.readRasters()
  const tiffWidth = gTiff.getWidth()
  const rasters = float32Arr[0]
  let lines = []
  let line = ''
  for (let i = 0; i < rasters.length; i++) {
    if (i % tiffWidth === 0) {
      lines.push(line)
      line = ''
    }
    line += zeroPadNumber(rasters[i])
  }
  for (const l of lines) {
    console.log(l)
  }
}

/** Converts numbers to strings in a 3-letter format. Ex. `002`, `0-3` (for negative numbers), or `123` */
function zeroPadNumber(input) {
  if (input === 0) {
      return "..."
  } else if (input < 0) {
      return `0${input.toFixed(0)}`
  } else if (input < 10) {
      return `00${Math.floor(input)}`
  } else if (input < 100) {
      return `0${Math.floor(input)}`
  } else {
      return `${Math.floor(input)}`
  }
}

/**
 * Exception thrown, when the response from DHM cannot be parsed.
 * @extends Error
 * @property {string} [response] The given response text from DHM.
 * @property {RexExp} [pattern] The given pattern used to parse the response text.
 */
class DHMParseError extends Error {
  /**
   * Create a parse exception. All arguments are forwarded to Error.
   * @param {string} message Description of exception.
   * @param {object} [options] Standard options parameter to Error, may contain a cause, see Error.
   * @param {string} [options.response] Response text from DHM, that could not be parsed with pattern.
   * @param {RegExp} [options.pattern] The pattern, that did not parse the Response text well.
   */
  constructor(...params) {
    super(...params);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DHMParseError);
    }
    this.name = "DHMParseError";
    if (params.length > 1 && typeof params[1] == 'object') {
      if (params[1].response)
        this.response = params[1].response;
      if (params[1].pattern)
        this.pattern = params[1].pattern;
    }
  }
}

/**
 * Fetches a single elevation value based on X,Y coordinates using DHM/Koter endpoint.
 * @param {number} xcoor EPSG:25832 X coordinate.
 * @param {number} ycoor EPSG:25832 Y coordinate.
 * @param {object} auth API autentication data. See ../config.js.example for reference.
 * @param {string} auth.API_DHM_WMS_BASEURL The base URL of the DHM WMS endpoint.
 * @param {string} auth.API_DHM_KEY Your API key to access services on Datafordeler.
 * @returns {number} Eventually returns the elevation in meters.
 * @throws {DHMParseError} When unable to parse response from DHM WMS.
 */
async function getZ(xcoor, ycoor, auth) {
  const request = '&request=GetFeatureInfo&styles=&layers=dhm_terraen&query_layers=dhm_terraen&info_format=text/plain&i=175&j=175&width=351&height=351'
  const bbox = [xcoor - 1, ycoor - 1, xcoor + 1, ycoor + 1]
  const coords = '&crs=EPSG:25832&bbox=' + encodeURIComponent(bbox.join())
  const dhm_text = await getDHM(request + coords, auth)
  const text_begin = /GetFeatureInfo\s+results:\s*Layer\s+'dhm_terraen'\s+Feature\s*0:\s*value_0\s*=\s*'/y
  if (text_begin.test(dhm_text)) {
    const z = parseFloat(dhm_text.slice(text_begin.lastIndex))
    if (z) return z
    throw new DHMParseError('Cannot parse float value in response text from DHM GetFeatureInfo after pattern.', { response: dhm_text, pattern: text_begin })
  }
  throw new DHMParseError('Cannot match response text from DHM GetFeatureInfo with pattern.', { response: dhm_text, pattern: text_begin })
}

/** 
 * Fetches a single elevation value based on X,Y coordinates using DHM/Koter endpoint
 * @param {number} xcoor - EPSG:25832 X coordinate
 * @param {number} ycoor - EPSG:25832 Y coordinate
 * @param {{API_DHM_BASEURL: string, API_DHM_USERNAME: string, API_DHM_PASSWORD: string}} auth - API autentication data. See ../config.js.example for reference.
 * @returns {number} Elevation in meters 
 */
async function OLDgetZ(xcoor, ycoor, auth) {
  let zcoor_data = await OLDgetDHM(`?geop=POINT(${xcoor} ${ycoor})&elevationmodel=dtm`, auth)
  let z = zcoor_data.HentKoterRespons.data[0].kote
  return z
}

/** Fetches a GeoTIFF with elevation data matching a bounding box of EPSG:25832 coordinates
 * @param {Array} bbox - Bounding box array consisting of two sets of EPSG:25832 coordinates (ie. `[543049, 6153925, 544463, 6155221]`)
 * @param {{API_DHM_WCS_BASEURL: string, API_DHM_KEY: string}} auth - API autentication data. See ../config.js.example for reference.
 * @param {number} [sizeLimit] - Optional size limiter. Will request GeoTIFF with width that does not exceed this number. Default is 500
 * @returns {object} GeoTiff data
 */
function getTerrainByBbox(bbox, auth, sizeLimit = 500) {

  const width = sizeLimit
  const height = Math.round(calcSizeRatio(sizeLimit, bbox))

  // GET request for DHM WCS data
  let url = auth.API_DHM_WCS_BASEURL
  url += '?SERVICE=WCS&COVERAGE=dhm_terraen&RESPONSE_CRS=epsg:25832&CRS=epsg:25832&FORMAT=GTiff&REQUEST=GetCoverage&VERSION=1.0.0'
  url += `&apikey=${ auth.API_DHM_KEY }`
  url += `&height=${ height }`
  url += `&width=${ width }`
  url += `&bbox=${ Math.round(bbox[0]) - 200 },${ Math.round(bbox[1]) - 200 },${ Math.round(bbox[2]) + 200},${ Math.round(bbox[3]) + 200}` // Add/subtract 200 meters to bbox to ensure coverage on the edges

  return get(url, {cache: 'force-cache'}, false)
  .then((response) => {
    return response.arrayBuffer()
  })
  .then((arrayBuffer) => {
    return consumeGeoTIFF(arrayBuffer)
  })
  .catch(error => {
    return error
  })
}

export {
  getElevation,
  visualizeGeotiff,
  getZ,
  DHMParseError,
  OLDgetZ,
  getTerrainGeoTIFF,
  getDenmarkGeoTiff,
  getTerrainByBbox,
  consumeGeoTIFF
}

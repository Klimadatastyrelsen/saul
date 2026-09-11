/**
 * SAUL photogrammetry utilities 
 */
 
import { getElevation, getZ } from './elevation.js'

/** 
 * Converts x,y coordinates from an image to real world lat,lon coordinates
 * @param {object} image_data - skraafoto-stac-api image data
 * @param {number} col - Image x coordinate (from left to right). Should be a coordinate for the entire image, not just the part displayed in the viewport.
 * @param {number} row - Image y coordinate (from top to bottom). Should be a coordinate for the entire image, not just the part displayed in the viewport.
 * @param {number} [Z] - Elevation (geoide)
 * @returns {array} [longitude, latitude, elevation] 
 */
function image2world(image_data, col, row, Z = 0) {

  // constants pulled from image_data
  const xx0  = image_data.properties['pers:interior_orientation'].principal_point_offset[0]
  const yy0  = image_data.properties['pers:interior_orientation'].principal_point_offset[1]
  const ci   = image_data.properties['pers:interior_orientation'].focal_length
  const pix  = image_data.properties['pers:interior_orientation'].pixel_spacing[0]
  const dimXi = image_data.properties['pers:interior_orientation'].sensor_array_dimensions[0]
  const dimYi = image_data.properties['pers:interior_orientation'].sensor_array_dimensions[1]
  const X0   = image_data.properties['pers:perspective_center'][0]
  const Y0   = image_data.properties['pers:perspective_center'][1]
  const Z0   = image_data.properties['pers:perspective_center'][2]
  const Ome  = image_data.properties['pers:omega']
  const Phi  = image_data.properties['pers:phi']
  const Kap  = image_data.properties['pers:kappa']

  // recalc values
  var c = ci*(-1)
  var dimX = dimXi*pix/2*(-1)
  var dimY = dimYi*pix/2*(-1)
  
  // ... Do calculations ...
  var o = radians(Ome)
  var p = radians(Phi)
  var k = radians(Kap)
  var D11 =   Math.cos(p) * Math.cos(k)
  var D12 = - Math.cos(p) * Math.sin(k)
  var D13 =   Math.sin(p)
  var D21 =   Math.cos(o) * Math.sin(k) + Math.sin(o) * Math.sin(p) * Math.cos(k)
  var D22 =   Math.cos(o) * Math.cos(k) - Math.sin(o) * Math.sin(p) * Math.sin(k)
  var D23 = - Math.sin(o) * Math.cos(p)
  var D31 =   Math.sin(o) * Math.sin(k) - Math.cos(o) * Math.sin(p) * Math.cos(k)
  var D32 =   Math.sin(o) * Math.cos(k) + Math.cos(o) * Math.sin(p) * Math.sin(k)
  var D33 =   Math.cos(o) * Math.cos(p)

  var x_dot = ((col*pix)-dimX*-1)-xx0
  var y_dot = ((row*pix)-dimY*-1)-yy0

  var kx = (D11*x_dot + D12*y_dot + D13*c)/(D31*x_dot + D32*y_dot + D33*c)
  var ky = (D21*x_dot + D22*y_dot + D23*c)/(D31*x_dot + D32*y_dot + D33*c)

  var X = (Z-Z0)*kx + X0
  var Y = (Z-Z0)*ky + Y0

  return[
    Math.round(X * 100) / 100,
    Math.round(Y * 100) / 100,
    Z
  ]
}

/** 
 * Converts world lat,lon coordinates to x,y coordinates within a specific image
 * @param {Object} image_data - skraafoto-stac-api image data
 * @param {Number} Y - northing
 * @param {Number} X - easting
 * @param {Number} [Z] - elevation (geoide)
 * @returns {array} [x,y] Column/row image coordinate 
 */
function getImageXY(image_data, X, Y, Z = 0) {

  // constants pulled from image_data
  const xx0  = image_data.properties['pers:interior_orientation'].principal_point_offset[0]
  const yy0  = image_data.properties['pers:interior_orientation'].principal_point_offset[1]
  const ci   = image_data.properties['pers:interior_orientation'].focal_length
  const pix  = image_data.properties['pers:interior_orientation'].pixel_spacing[0]
  const dimXi = image_data.properties['pers:interior_orientation'].sensor_array_dimensions[0]
  const dimYi = image_data.properties['pers:interior_orientation'].sensor_array_dimensions[1]
  const X0   = image_data.properties['pers:perspective_center'][0]
  const Y0   = image_data.properties['pers:perspective_center'][1]
  const Z0   = image_data.properties['pers:perspective_center'][2]
  const Ome  = image_data.properties['pers:omega']
  const Phi  = image_data.properties['pers:phi']
  const Kap  = image_data.properties['pers:kappa']

  // recalc values
  var c = ci*(-1)
  var dimX = dimXi*pix/2*(-1)
  var dimY = dimYi*pix/2*(-1)
  
  // ... Do calculations ...
  var o = radians(Ome)
  var p = radians(Phi)
  var k = radians(Kap)
  var D11 =   Math.cos(p) * Math.cos(k)
  var D12 = - Math.cos(p) * Math.sin(k)
  var D13 =   Math.sin(p)
  var D21 =   Math.cos(o) * Math.sin(k) + Math.sin(o) * Math.sin(p) * Math.cos(k)
  var D22 =   Math.cos(o) * Math.cos(k) - Math.sin(o) * Math.sin(p) * Math.sin(k)
  var D23 = - Math.sin(o) * Math.cos(p)
  var D31 =   Math.sin(o) * Math.sin(k) - Math.cos(o) * Math.sin(p) * Math.cos(k)
  var D32 =   Math.sin(o) * Math.cos(k) + Math.cos(o) * Math.sin(p) * Math.sin(k)
  var D33 =   Math.cos(o) * Math.cos(p)

  var x_dot = (-1)*c*((D11*(X-X0)+D21*(Y-Y0)+D31*(Z-Z0))/(D13*(X-X0)+D23*(Y-Y0)+D33*(Z-Z0)))
  var y_dot = (-1)*c*((D12*(X-X0)+D22*(Y-Y0)+D32*(Z-Z0))/(D13*(X-X0)+D23*(Y-Y0)+D33*(Z-Z0)))

  var col = ((x_dot-xx0)+(dimX))*(-1)/pix
  var row = ((y_dot-yy0)+(dimY))*(-1)/pix

  return [
    Math.round(col),
    Math.round(row)
  ]
}

/** 
 * (DEPRECATED - Use getImageXY) Converts lat,lon coordinates to x,y coordinates within a specific image
 * @param {Object} image_data - skraafoto-stac-api image data
 * @param {Number} Y - northing
 * @param {Number} X - easting
 * @param {Number} [Z] - elevation (geoide)
 * @returns {array} [x,y] Column/row image coordinate 
 */
function world2image(image_data, X, Y, Z = 0) {
  return getImageXY(image_data, X, Y, Z)
}

/** Converts degress to radians */
function radians(degrees) {
  return degrees * (Math.PI / 180)
}

/** (DEPRECATED - Use getWorldXYZ) Iterates guessing at a world coordinate using image coordinates and elevation info */
function iterateRecursive(image_data, col, row, z, count, limit, auth, i) {

  // Get coordinates based on current z value
  const worldcoor = image2world(image_data,col,row,z)

  i--

  // Get new z value from coordinates
  return getZ(worldcoor[0],worldcoor[1], auth).then((new_z) => {
    
    // How big is the different between z and new z?
    const delta = Math.abs(new_z - z)
    
    if (delta < limit || i <= 0) {
      // If the difference is small or max iterations reached, return coordinates
      return [worldcoor, delta, count]
    } else {
      // If the difference is too big, try building coordinates with the new z
      return iterateRecursive(image_data, col, row, new_z, count + 1, limit, auth, i)
    }
  })
}

/** 
 * (DEPRECATED - Use getWorldXYZ) Tries to guess world coordinate for a pixel position within an image using STAC API image data and requests to DHM elevation data.
 * @param {object} image_data - image item data from STAC API
 * @param {number} col - image x coordinate (from left to right)
 * @param {number} row - image y coordinate (from top to bottom)
 * @param {{API_DHM_BASEURL: string, API_DHM_USERNAME: string, API_DHM_PASSWORD: string}} auth - API autentication data. See ../config.js.example for reference.
 * @param {number} [limit] - result may be inaccurate within this limit. Default is 1.
 * @returns {array} [world coordindates (array), elevation discrepancy, calculation iterations]
 */
function iterate(image_data, col, row, auth, limit = 1) {
  let i = 20 // Maximum number of iterations allowed
  return iterateRecursive(image_data, col, row, 0.5, 0, limit, auth, i)
}

async function compareZ(options) {

  // Get coordinates based on current z value
  const world_xyz = image2world(options.image, options.xy[0], options.xy[1], options.z)
  // Get new z value from coordinates
  world_xyz[2] = await getElevation(world_xyz[0], world_xyz[1], options.terrain)
  // How big is the different between z and new z?
  const delta = Math.abs(world_xyz[2] - options.z)
  
  // Check delta vs. limit. If the difference is too big, try building coordinates with the new z
  // Make sure the recursive loop ends after 20 iterations even if no precise z is found
  if (options.iteration < 20 && delta > options.limit) {
    options.iteration++
    options.z = world_xyz[2]
    return compareZ(options)
  } else {
    return world_xyz
  }
}

/** Find world coordinate and elevation that correspond to image x,y. Uses image item information from STAC API and a GeoTIFF terrain model from Datafordeler.
 * @param {object} options
 * @param {array} options.xy - image coordinates
 * @param {object} options.image - STAC API item
 * @param {object} options.terrain - GeoTIFF object from getTerrainGeoTIFF() output
 * @param {number} precision - Precision in meters for "good enough"
 * @returns {array} Array with world coordinates (indexes 0 and 1) and elevation (index 2). Coordinates are EPSG:25832 format.
 */
async function getWorldXYZ(options, precision = 0.3) {
  
  const best_world_xyz = compareZ({
    image: options.image,
    terrain: options.terrain,
    xy: options.xy,
    z: 0,
    limit: precision,
    iteration: 1
  })

  return best_world_xyz
}


/** 
 * Iterates over an array of STAC API image items 
 * and returns a total bounding box for all the images
 */
function getTotalBbox(images) {
  const initialBbox = images[0].features[0].bbox
  
  return images.reduce((bbox, image) => {
    const imageBbox = image.features[0].bbox
    if (imageBbox[0] < bbox[0]) {
      bbox[0] = imageBbox[0]
    }
    if (imageBbox[1] < bbox[1]) {
      bbox[1] = imageBbox[1]
    }
    if (imageBbox[2] > bbox[2]) {
      bbox[2] = imageBbox[2]
    }
    if (imageBbox[3] > bbox[3]) {
      bbox[3] = imageBbox[3]
    }
    return bbox
  }, initialBbox)
}

export { 
  image2world,
  world2image,
  getWorldXYZ,
  getImageXY,
  iterate,
  getTotalBbox
}
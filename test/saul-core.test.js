// Testing saul-core methods

// You should add your own config.js with proper tokens, etc.
// Check config.js.example for info on how to set it up
import auth from '../config.js'

import { Assert } from './assert.js'
import {getSTAC, world2image, image2world, getZ, iterate} from '../index.js'

const assert = new Assert()

console.log('---------------')
console.log('  Core tests   ')
console.log('---------------')

/*
const item = await getSTAC('/collections/skraafotos2019/items/2019_83_37_2_0046_00001113', auth)
const world_x = 580341
const world_y = 6130925
const image_x = 7373
const image_y = 3205
const world_elevation = 32.7199
*/

const item = await getSTAC('/collections/skraafotos2021/items/2021_83_36_4_0013_00003824', auth)
const world_x = 587739
const world_y = 6130951
const image_x = 41839.698939
const image_y = 3204.326930
const world_elevation = 38.874336

const deviation = 0.05

// Test getZ
try {

  let elevation = await getZ(world_x, world_y, auth)

  assert.almostEqual(elevation, world_elevation, deviation, 'getZ fail: Elevation is way apart from expected:')
  
  console.log("Test getZ OK")

} catch(error) {
  console.error(error)
}

// Test iterate
try {

  let ite = await iterate(item, image_x, image_y, auth, 0.05)

  assert.almostEqual(ite[0], [world_x, world_y], 0.1, `iterate fail: Coordinates are way apart, ite: ${ite}.`)

  console.log("Test iterate OK")

} catch(error) {
  console.error(error)
}

// Test world2image
try {

  let xy = world2image(item, world_x, world_y, world_elevation)

  assert.almostEqual(xy, [image_x, image_y], 1, 'world2image fail: The coordinate values are not as expected:')
  
  console.log("Test world2image OK")

} catch(error) {
  console.error(error)
}

// Test image2world
try {

  let coords = image2world(item, image_x, image_y, world_elevation)

  assert.almostEqual(coords, [world_x, world_y], deviation, 'image2world fail: The longitude or latitude are not equal to expected:')

  console.log("Test image2world OK")

} catch(error) {
  console.error(error)
}

// Test world2image > image2world 
try {

  let xy1 = world2image(item, world_x, world_y, world_elevation)
  let coords1 = image2world(item, xy1[0], xy1[1], world_elevation)

  assert.almostEqual(coords1, [world_x, world_y], deviation, 'world2image > image2world fail: The longitude or latitude values are not equal to expected:')

  console.log("Test world2image > image2world OK")

} catch(error) {
  console.error(error)
}

// Test world2image > iterate 
try {

  let xy2 = world2image(item, world_x, world_y, world_elevation)
  let iterate_result = await iterate(item, xy2[0], xy2[1], auth, 0.1)
  let coords2 = iterate_result[0]
  assert.almostEqual(coords2, [world_x, world_y], 0.1, `world2image > iterate fail: The longitude or latitude values are not equal, iterate result: ${iterate_result}.`)

  console.log("Test world2image > iterate OK")

} catch(error) {
  console.error(error)
}
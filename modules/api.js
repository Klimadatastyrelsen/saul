/**
 * SAUL API utilities
 */

let error_msg
let load_stack = []

// These custom events can only be created in a browser environment
const loadstart = isBrowser() ? new CustomEvent('loadstart') : null
const loadend = isBrowser() ? new CustomEvent('loadend') : null
const loaderror = isBrowser() ? new CustomEvent('loaderror', {
  detail: {
    name: getErrorMsg()
  }
}) : null


/** Check if code is run in a Browser or Node enviroment */
function isBrowser() {
  // Check if the environment is Node.js
  if (typeof process === "object" &&
    typeof require === "function") {
    return false
  }
  // Check if the environment is
  // a Service worker
  if (typeof importScripts === "function") {
    return false
  }
  // Check if the environment is a Browser
  if (typeof window === "object") {
    return true
  }
}

/** Sends 'loadstart' event if nothing else is currently loading */
function startLoading() {
  if (isBrowser() && load_stack.length < 1) {
    document.dispatchEvent(loadstart)
  }
  load_stack.push(1)
}

/** Sends 'loadend' event if current loads have finished */
function endLoading() {
    load_stack.pop()
    if (isBrowser() && load_stack.length < 1) {
      document.dispatchEvent(loadend)
    }
}

/** Sends 'loaderror' event and resets load status */
function interruptLoading() {
  load_stack = []
  if (isBrowser()) {
    document.dispatchEvent(loaderror)
  }
}

/** Getter for error messages */
function getErrorMsg() {
  return error_msg
}

/**
 *  Returns response data
 * @param {Response} response
 * @param {boolean} is_json Whether to extract JSON data from the response body.
 * @returns {(Response|Promise.<object>)} The response object or a Promise with the JavaScript representation of the response body JSON.
 */
function HttpResponseHandler(response, is_json) {
  if (!response.ok) {
    error_msg = response.status
    interruptLoading()
    throw new Error(`HTTP error! ${ response.status }`)
  }
  if (is_json) {
    // We assume the returned data is JSON
    return response.json()
  } else {
    // Return whatever and let someone else worry about parsing it
    return response
  }
  
}

/**
 * GET HTTP response from API
 * @param {string} url API service URL, including endpoint paths and query parameters.
 * @param {object} [config] Custom request config, see https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch#supplying_request_options.
 * @param {boolean} [is_json=true] `true` (default) if the response body JSON shall be converted to JavaScript representation and returned, `false` if the response object shall be returned.
 * @returns {Promise<(Response|object)>} A Promise with the response object or with the JavaScript representation of the response body JSON.
 */
function get(url, config = {}, is_json = true) {
  if (!url) {
    console.error('Could not fetch data. Missing API URL')
  } else {
    startLoading()
    return fetch( url, {
      ...config,
      method: 'GET',
      mode: 'cors'
    })
    .then((response) => {
      return HttpResponseHandler(response, is_json)
    })
    .then((response) => {
      // Finally, return the parsed JSON response
      endLoading()
      return response
    })
    .catch((error) => {
      // ... unless something goes wrong
      console.error(`Fetch error: ${error}`)
      endLoading()
      return error
    })
  }
}

/** 
 * POST HTTP request to API
 * @param {string} url - API service URL, including endpoint paths and query parameters.
 * @param {object} requestbody - Request data
 * @param {string} token - Authentication token from Dataforsyningen
 * @returns {object} response object
 */
function post(url, requestbody, token) {
  if (!url || !token || !requestbody) {
    console.error('Could not fetch data. Missing API token, request body, or URL')
  } else {
    startLoading()
    return fetch( url, {
      method: 'POST',
      headers: {
        'token': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestbody)
    })
    .then((response) => {
      return HttpResponseHandler(response)
    })
    .then((response) => {
      // Finally, return the parsed JSON response
      endLoading()
      return response
    })
    .catch((error) => {
      // ... unless something goes wrong
      console.error(`Fetch error: ${error}`)
      endLoading()
      return error
    })
  }
}

/**
 * Fetch data from DHM
 * @param {string} query DHM API query. Find details at https://datafordeler.dk/dataoversigt/danmarks-hoejdemodel-dhm/dhm-wms/
 * @param {object} auth API autentication data. See ../config.js.example for reference.
 * @param {string} auth.API_DHM_WMS_BASEURL The base URL of the DHM WMS endpoint.
 * @param {string} auth.API_DHM_KEY Your API key to access services on Datafordeler.
 * @returns {Promise.<string>} Eventually the response body text.
 */
function getDHM(query, auth) {
  const auth_params = `&apikey=${encodeURIComponent(auth.API_DHM_KEY)}`
  return get(auth.API_DHM_WMS_BASEURL + '?SERVICE=WMS&VERSION=1.3.0' + query + auth_params, { cache: 'force-cache' }, false)
    .then((response) => response.text())
}

/** 
 * API method to GET data from STAC API
 * @param {string} query - STAC API query string. May include endpoint path information.
 * @param {{API_STAC_BASEURL: string, API_STAC_TOKEN: string}} auth - API autentication data. See ../config.js.example for reference.
 * @returns {object} Response data
 */
function getSTAC(query, auth) {
  let requestUrl = `${auth.API_STAC_BASEURL}${query}`
  return get(requestUrl, {headers: {token: auth.API_STAC_TOKEN}})
  .then((data) => data)
}

/** 
 * API method to POST data to STAC API
 * @param {string} endpoint - STAC API endpoint. Ex. `/collections`
 * @param {object} data - request body
 * @param {{API_STAC_BASEURL: string, API_STAC_TOKEN: string}} auth - API autentication data. See ../config.js.example for reference.
 * @returns {object} Reponse data
 */
function postSTAC(endpoint, data, auth) {
  return post(auth.API_STAC_BASEURL + endpoint, data, auth.API_STAC_TOKEN)
  .then((data) => data)
}

export {
  get,
  post,
  getSTAC,
  postSTAC,
  getDHM
}

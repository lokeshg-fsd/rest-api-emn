/* eslint-disable */

const defaults = {
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  preflightContinue: false,
  optionsSuccessStatus: 204,
}

function isString(s: any) {
  return typeof s === 'string' || s instanceof String
}

function isOriginAllowed(origin: string, allowedOrigin: any[]) {
  if (Array.isArray(allowedOrigin)) {
    for (var i = 0; i < allowedOrigin.length; ++i) {
      if (isOriginAllowed(origin, allowedOrigin[i])) {
        return true
      }
    }
    return false
  } else if (isString(allowedOrigin)) {
    return origin === allowedOrigin
    // @ts-expect-error
  } else if (allowedOrigin instanceof RegExp) {
    // @ts-expect-error
    return allowedOrigin.test(origin)
  } else {
    return !!allowedOrigin
  }
}

function configureOrigin(options: { origin: string }, req: { headers: { origin: any } }) {
  var requestOrigin = req.headers.origin,
    headers = [],
    isAllowed

  if (!options.origin || options.origin === '*') {
    // allow any origin
    headers.push([
      {
        key: 'Access-Control-Allow-Origin',
        value: '*',
      },
    ])
  } else if (isString(options.origin)) {
    // fixed origin
    headers.push([
      {
        key: 'Access-Control-Allow-Origin',
        value: options.origin,
      },
    ])
  } else {
    // @ts-expect-error
    isAllowed = isOriginAllowed(requestOrigin, options.origin)
    // reflect origin
    headers.push([
      {
        key: 'Access-Control-Allow-Origin',
        value: isAllowed ? requestOrigin : false,
      },
    ])
  }

  return headers
}

function configureMethods(options: { methods: any[] }) {
  var methods = options.methods
  // @ts-expect-error
  if (methods.join) {
    // @ts-expect-error
    methods = options.methods.join(',') // .methods is an array, so turn it into a string
  }
  return {
    key: 'Access-Control-Allow-Methods',
    value: methods,
  }
}

function configureCredentials(options: { credentials: boolean }) {
  if (options.credentials === true) {
    return {
      key: 'Access-Control-Allow-Credentials',
      value: 'true',
    }
  }
  return null
}

function configureAllowedHeaders(
  options: { allowedHeaders: any; headers: any },
  req: { headers: { [x: string]: any } }
) {
  var allowedHeaders = options.allowedHeaders || options.headers
  var headers = []

  if (!allowedHeaders) {
    allowedHeaders = req.headers['access-control-request-headers'] // .headers wasn't specified, so reflect the request headers
  } else if (allowedHeaders.join) {
    allowedHeaders = allowedHeaders.join(',') // .headers is an array, so turn it into a string
  }
  if (allowedHeaders && allowedHeaders.length) {
    headers.push([
      {
        key: 'Access-Control-Allow-Headers',
        value: allowedHeaders,
      },
    ])
  }

  return headers
}

function configureExposedHeaders(options: { exposedHeaders: any }) {
  var headers = options.exposedHeaders
  if (!headers) {
    return null
  } else if (headers.join) {
    headers = headers.join(',') // .headers is an array, so turn it into a string
  }
  if (headers && headers.length) {
    return {
      key: 'Access-Control-Expose-Headers',
      value: headers,
    }
  }
  return null
}

function configureMaxAge(options: { maxAge: { toString: () => any } }) {
  var maxAge = (typeof options.maxAge === 'number' || options.maxAge) && options.maxAge.toString()
  if (maxAge && maxAge.length) {
    return {
      key: 'Access-Control-Max-Age',
      value: maxAge,
    }
  }
  return null
}

function applyHeaders(headers: string | any[], res: { setHeader: (arg0: any, arg1: any) => void }) {
  for (var i = 0, n = headers.length; i < n; i++) {
    var header = headers[i]
    if (header) {
      if (Array.isArray(header)) {
        applyHeaders(header, res)
      } else if (header.value) {
        res.setHeader(header.key, header.value)
      }
    }
  }
}

function cors(
  options: any,
  req: any,
  res: { statusCode: any; setHeader: (arg0: string, arg1: string) => void; end: () => void },
  next: () => void
) {
  var headers = [],
    method = req.method && req.method.toUpperCase && req.method.toUpperCase()

  if (method === 'OPTIONS') {
    // preflight
    headers.push(configureOrigin(options, req))
    headers.push(configureCredentials(options))
    headers.push(configureMethods(options))
    headers.push(configureAllowedHeaders(options, req))
    headers.push(configureMaxAge(options))
    headers.push(configureExposedHeaders(options))
    applyHeaders(headers, res)

    if (options.preflightContinue) {
      next()
    } else {
      // Safari (and potentially other browsers) need content-length 0,
      //   for 204 or they just hang waiting for a body
      res.statusCode = options.optionsSuccessStatus
      res.setHeader('Content-Length', '0')
      res.end()
    }
  } else {
    // actual response
    headers.push(configureOrigin(options, req))
    headers.push(configureCredentials(options))
    headers.push(configureExposedHeaders(options))
    applyHeaders(headers, res)
    next()
  }
}

export default function middlewareWrapper(o?: any) {
  // if options are static (either via defaults or custom options passed in), wrap in a function
  var optionsCallback: ((arg0: any, arg1: (err: any, options: any) => void) => void) | null = null
  if (typeof o === 'function') {
    optionsCallback = o
  } else {
    optionsCallback = function (req: any, cb: (arg0: null, arg1: any) => void) {
      cb(null, o)
    }
  }

  return function corsMiddleware(req: any, res: any, next: any) {
    // @ts-expect-error
    optionsCallback(req, function (err: any, options: any) {
      if (err) {
        next(err)
      } else {
        var corsOptions = Object.assign({}, defaults, options)
        var originCallback = null
        if (corsOptions.origin && typeof corsOptions.origin === 'function') {
          originCallback = corsOptions.origin
        } else if (corsOptions.origin) {
          originCallback = function (origin: any, cb: (arg0: null, arg1: any) => void) {
            cb(null, corsOptions.origin)
          }
        }

        if (originCallback) {
          originCallback(req.headers.origin, function (err2: any, origin: any) {
            if (err2 || !origin) {
              next(err2)
            } else {
              corsOptions.origin = origin
              cors(corsOptions, req, res, next)
            }
          })
        } else {
          next()
        }
      }
    })
  }
}

const cors = require('cors')

const allowedOrigins = [
  'https://patronat-react-web-develop.vercel.app/',
  'http://localhost:3000',
  'https://patronatfestesroquetes.com',
]

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Origen no permitido por CORS'))
    }
  },
}

module.exports = cors(corsOptions)

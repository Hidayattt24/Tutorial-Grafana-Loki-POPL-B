const winston = require('winston');
const fs = require('fs');
const path = require('path');

// Format log untuk Loki (JSON format)
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Tentukan log directory berdasarkan environment
const LOG_DIR = process.env.LOG_DIR || (process.env.NODE_ENV === 'production' ? '/var/log/app' : './logs');

// Buat directory jika belum ada (untuk development mode)
if (!fs.existsSync(LOG_DIR)) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  } catch (err) {
    console.warn(`Cannot create log directory ${LOG_DIR}:`, err.message);
  }
}

// Setup transports
const transports = [
  // Console transport untuk development dan production
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
      })
    )
  })
];

// Tambahkan file transports jika directory tersedia
try {
  if (fs.existsSync(LOG_DIR)) {
    transports.push(
      new winston.transports.File({
        filename: path.join(LOG_DIR, 'error.log'),
        level: 'error',
        format: logFormat
      }),
      new winston.transports.File({
        filename: path.join(LOG_DIR, 'combined.log'),
        format: logFormat
      })
    );
  }
} catch (err) {
  console.warn('File logging disabled:', err.message);
}

// Buat logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'notes-app',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: transports
});

// Middleware untuk logging HTTP requests
logger.httpLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent')
    };

    if (res.statusCode >= 400) {
      logger.error('HTTP Request Error', logData);
    } else {
      logger.info('HTTP Request', logData);
    }
  });

  next();
};

module.exports = logger;

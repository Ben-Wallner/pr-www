/**
 * This server middleware adds session handling using express-session
 * and session store on the server using SQLite.
 */

import fs from 'fs'
import session from 'express-session'
import CSS from 'connect-session-sequelize'
import Sequelize from 'sequelize'
import config from '../api/config'

/**
 * Check if directory exists
 */
function pathExists(path) {
  try {
    fs.statSync(path)
    return true
  } catch {
    return false
  }
}

/**
 * Use sequelize database if database folder exists.
 * I.e. normal operation in development or production.
 * If folder does not exist (e.g. during build in Docker image),
 * built-in in-memory database will be used.
 */
let sequelizeStore

if (pathExists('./db/')) {
  /**
   * If folder exists, use sequelize database.
   */

  const sequelize = new Sequelize('sessions', null, null, {
    dialect: 'sqlite',
    storage: './db/sessions.sqlite',
    logging: false, // Don't log every SQL to console
  })

  const SequelizeStore = CSS(session.Store)

  sequelizeStore = new SequelizeStore({
    db: sequelize,
    expiration: 60 * 60 * 1000, // Sessions are invalidated after 1h
    checkExpirationInterval: 10 * 60 * 1000, // Expiry is checked every 10mins
  })

  // Initialize database
  sequelizeStore.sync()
} else {
  // Folder does not exist (e.g. during build) -> use in memory database
}

export default session({
  secret: config.auth.secret,
  name: 'sid',
  resave: false,
  saveUninitialized: false,
  unset: 'destroy',
  store: sequelizeStore,
})

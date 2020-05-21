import Debug from 'debug'
import Sequelize from 'sequelize'
import express, { Request, Response, NextFunction } from 'express'
import { authRequired, isAuthenticated } from './auth'
import { ExchangeRate, sequelize, ExchangeRatePrice } from './inc/sequelize'
const log = Debug('pr-www:exchangeRates')

const router = express.Router()

// Parse (large) JSON payloads
router.use(express.json({ limit: '20mb' }))

/**
 * Create/update exchangeRate and prices
 */
router.patch(
  '/:baseCurrencyCode/:quoteCurrencyCode/prices',
  authRequired,
  async function (req: Request, res: Response, next: NextFunction) {
    const { baseCurrencyCode, quoteCurrencyCode } = req.params

    // Disable timeouts
    req.setTimeout(0)
    res.setTimeout(0)

    const prices: Array<{ date: string; value: number }> = req.body

    log(
      `Creating/updating exchangeRate ${baseCurrencyCode}/${quoteCurrencyCode}`
    )
    try {
      const [exchangeRate] = await ExchangeRate.findOrCreate({
        where: { baseCurrencyCode, quoteCurrencyCode },
      })

      // Create/update the associated prices
      if (prices) {
        await sequelize.query(
          'INSERT INTO exchangeRatePrices (exchangeRateId, date, value) ' +
            'VALUES ' +
            prices
              .map(
                (price) =>
                  `(${exchangeRate.id}, '${price.date}', ${price.value})`
              )
              .join(',') +
            ' ON CONFLICT(exchangeRateId, date) DO UPDATE SET value=excluded.value'
        )
      }
    } catch (err) {
      // Unkown error
      // eslint-disable-next-line no-console
      console.log(err)
      return next(err)
    }

    return res.json({ status: 'ok' })
  }
)

/**
 * Get single exchange rate (public)
 */
router
  .route('/:baseCurrencyCode/:quoteCurrencyCode')
  .get(async function (req: Request, res: Response) {
    const { baseCurrencyCode, quoteCurrencyCode } = req.params

    const where = {
      quoteCurrencyCode,
      baseCurrencyCode,
    }
    const exchangeRate = await ExchangeRate.findOne({
      where,
      attributes: isAuthenticated(req)
        ? undefined
        : ['baseCurrencyCode', 'quoteCurrencyCode'],
    })

    if (!exchangeRate) {
      res.status(404).json({ message: 'Not found.' })
      return
    }

    res.json(exchangeRate)
  })

/**
 * Get prices of exchange rate (public)
 */
router
  .route('/:baseCurrencyCode/:quoteCurrencyCode/prices')
  .get(async function (req: Request, res: Response) {
    const { baseCurrencyCode, quoteCurrencyCode } = req.params

    function getDefaultFromDate() {
      const d = new Date()
      d.setDate(d.getDate() - 14) // 14 days in the past
      return d.toISOString().substring(0, 10)
    }

    const fromDate = req.query.from || getDefaultFromDate()

    const where = {
      quoteCurrencyCode,
      baseCurrencyCode,
    }
    const exchangeRate = await ExchangeRate.findOne({
      where,
      include: [
        {
          model: ExchangeRatePrice,
          as: 'prices',
          attributes: ['date', 'value'],
          where: { date: { [Sequelize.Op.gte]: fromDate } },
          required: false,
        },
      ],
    })

    if (!exchangeRate) {
      res.status(404).json({ message: 'Not found.' })
      return
    }

    res.json(exchangeRate.prices)
  })

export default router
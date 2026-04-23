import 'source-map-support/register'
import * as logger from './logger'
import * as processTracer from './processTracer'
import * as statCollector from './statCollector'
import * as stepTracer from './stepTracer'

async function run(): Promise<void> {
  try {
    logger.info(`Initializing ...`)

    // Start step tracer
    await stepTracer.start()
    // Start stat collector
    await statCollector.start()
    // Start process tracer
    await processTracer.start()

    logger.info(`Initialization completed`)
  } catch (error: any) {
    logger.error(error.message)
  }
}

run()

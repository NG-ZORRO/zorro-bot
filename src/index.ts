import { Application, Context } from 'probot'
import { Bot } from './bot'
import { Config } from './interfaces/config.interface'

export = (app: Application) => {

  app.on('issues.opened', async (context) => {
    const config = await getConfig(context);
    const bot = new Bot(context, config);
    await bot.replyInvalid();
  })

  app.on('issues.labeled', async (context) => {
    const config = await getConfig(context);
    const bot = new Bot(context, config);
    await bot.replyNeedReproduce();
  })

  async function getConfig(context: Context): Promise<Config> {
    let config = await context.config('nz-boot.yml');
    if (!config) {
      config = {
        issues: {
          invalid: {
            mark: "invalid_mark",
            labels: [],
            replay: ''
          },
          assignOwner: {}
        }
      }
    }
    return config
  }
}

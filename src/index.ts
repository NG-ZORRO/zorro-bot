import { Application, Context } from 'probot'
import { Bot } from './bot'
import { Config } from './interfaces/config.interface'

export = (app: Application) => {

  app.on('issues.opened', async (context) => {
    const config = await getConfig(context);
    const bot = new Bot(context, config);
    await bot.replyInvalid();
    await bot.replyTranslate();
    await bot.addComponentLabel();
  })

  app.on('issues.labeled', async (context) => {
    const config = await getConfig(context);
    const bot = new Bot(context, config);
    await bot.replyNeedReproduce();
    await bot.replyLabeled();
  })

  app.on(['issues.labeled','pull_request.labeled'], async (context) => {
    const config = await getConfig(context);
    const bot = new Bot(context, config);
    await bot.assignOwner();
  })

  async function getConfig(context: Context): Promise<Config> {
    return await context.config('nz-boot.yml')
  }
}

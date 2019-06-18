import { Application, Context } from 'probot'
import { Bot } from './bot'
import { Config } from './interfaces/config.interface'
const probotConfig = require('probot-config');

export = (app: Application) => {

  app.on('issues.opened', async (context) => {
    const config = await getConfig(context);
    const bot = new Bot(context, config);
    await bot.replyInvalid();
  })

  async function getConfig(context: Context): Promise<Config> {
    let config = await probotConfig(context, 'nz-boot.yml');
    if (!config) {
      config = {
        assignOwner: {}
      }
    }
    return  config;
  }
}

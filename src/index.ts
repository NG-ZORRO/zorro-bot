import { Application, Context } from 'probot';
import { LoggerWithTarget } from 'probot/lib/wrap-logger'
import uuid from 'uuid/v4';

import { Bot } from './bot';
import { Config } from './interfaces/config.interface';

export = async (app: Application) => {

  const github = await app.auth();
  const name = (await github.apps.getAuthenticated({})).data.name;
  const id = uuid();

  app.on('release.published', async (context) => {
    const logger = getLogger(context);
    const config = await getConfig(context, logger);
    const bot = new Bot(context, config, logger);
    await bot.sendRelease();
  })

  app.on('pull_request.opened', async (context) => {
    const logger = getLogger(context);
    const config = await getConfig(context, logger);
    const bot = new Bot(context, config, logger);
    await bot.commentPreview();
  })

  app.on('issues.opened', async (context) => {
    const logger = getLogger(context);
    const config = await getConfig(context, logger);
    const bot = new Bot(context, config, logger);
    await bot.replyInvalid();
    await bot.replyTranslate();
    await bot.addComponentLabel();
  })

  app.on('issues.labeled', async (context) => {
    const logger = getLogger(context);
    const config = await getConfig(context, logger);
    const bot = new Bot(context, config, logger);
    await bot.replyNeedReproduce();
    await bot.replyLabeled();
  })

  app.on(['issues.labeled','pull_request.labeled'], async (context) => {
    const logger = getLogger(context);
    const config = await getConfig(context, logger);
    const bot = new Bot(context, config, logger);
    await bot.assignOwner();
  })

  async function getConfig(context: Context, log: LoggerWithTarget): Promise<Config> {
    let config: Config | null = null;
    const repo = context.repo();
    const file = 'nz-boot.yml';
    try {
      config = await context.config(file);
    } catch (e) {
      log.warn({
        error: new Error(e),
        repo,
        file
      }, 'Invalid config');
    }

    return config as Config;
  }

  function getLogger(context: Context) {
    return context.log.child({name, id});
  }
}

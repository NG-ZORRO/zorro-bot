import { Application, Context } from 'probot'
const probotConfig = require('probot-config');

export = (app: Application) => {
  app.on('issues.opened', async (context) => {
    const issueComment = context.issue({ body: 'Thanks for opening this issue!' })
    await context.github.issues.createComment(issueComment)
  })

  async function getConfig(context: Context) {
    let config = probotConfig(context, 'nz-boot.yml');
    console.log(config);
  }
}

import { Context } from 'probot'
import format from 'string-template';

import { Config } from './interfaces/config.interface'
import { OrgsListMembersResponseItem } from '@octokit/rest';

function isDev() {
  return process && process.env && process.env.DEV === 'true';
}

export class Bot {
  constructor(private context: Context, private config: Config) {
  }

  async replyNeedReproduce() {
    const config = this.config.issue.needReproduce;
    const label = this.context.payload.label.name
    const issue = this.context.payload.issue;

    const opener = issue.user.login;
    if (new RegExp(config.label).test(label)) {
      const issueComment = this.context.issue({ body: format(config.replay, { user:  opener}) })
      await this.context.github.issues.createComment(issueComment);
      if (config.afterLabel) {
        await this.context.github.issues.addLabels(this.context.issue({labels: [config.afterLabel]}))
      }
    }
  }

  async replyInvalid() {
    const config = this.config.issue.invalid;
    const isMember = await this.isMember();
    const issue = this.context.payload.issue;
    const opener = issue.user.login;
    const mark = config.mark
    let labels = [];
    if (Array.isArray(config.labels)) {
      labels = config.labels;
    } else {
      labels = [config.labels]
    }
    if (!issue.body.includes(mark) && !isMember) {
      const issueComment = this.context.issue({ body: format(config.replay, { user:  opener}) })
      await this.context.github.issues.createComment(issueComment);
      await this.context.github.issues.update(this.context.issue({ state: 'closed' }))
      await this.context.github.issues.addLabels(this.context.issue({labels: labels}))
    }
  }

  private async isMember(): Promise<boolean> {
    if (isDev()) {
      return false
    }
    const members = await this.getMembers();
    const issue = this.context.payload.issue;
    const opener = issue.user.login;
    return members.includes(opener);
  }

  private async getMembers(): Promise<string[]> {
    let members: OrgsListMembersResponseItem[] = [];
    let response = await this.context.github.orgs.listMembers({
      org: 'NG-ZORRO'
    });
    if (response && response.data) {
      members = response.data;
    }
    return members.map(m => m.login);
  }

}

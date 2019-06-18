import { Context } from 'probot'
import format from 'string-template';

import { Config } from './interfaces/config.interface'
import { OrgsListMembersResponseItem } from '@octokit/rest';

export class Bot {
  constructor(private context: Context, private config: Config) {
    console.log(config);
  }

  async replyInvalid() {
    const invalidConfig = this.config.issue.invalid;
    const members = await this.getMembers();
    const issue = this.context.payload.issue;
    const opener = issue.user.login;
    const mark = invalidConfig.mark
    let labels = [];
    if (Array.isArray(invalidConfig.labels)) {
      labels = invalidConfig.labels;
    } else {
      labels = [invalidConfig.labels]
    }
    if (!issue.body.includes(mark) && !members.includes(opener)) {
      const issueComment = this.context.issue({ body: format(invalidConfig.replay, { user:  opener}) })
      await this.context.github.issues.createComment(issueComment);
      await this.context.github.issues.update(this.context.issue({ state: 'closed' }))
      await this.context.github.issues.addLabels(this.context.issue({labels: labels}))
    }
  }

  async getMembers(): Promise<string[]> {
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

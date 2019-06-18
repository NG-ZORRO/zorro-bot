import { Context } from 'probot'
import format from 'string-template';

import { Config } from './interfaces/config.interface'
import { OrgsListMembersResponseItem } from '@octokit/rest';

const translate = require('@vitalets/google-translate-api');
const kmp = require('kmp');

function isDev(): boolean {
  return process && process.env && process.env.DEV === 'true';
}

function containsChinese(title: string): boolean {
  return /[\u4e00-\u9fa5]/.test(title);
}

export class Bot {
  constructor(private context: Context, private config: Config) {
  }

  async assignOwner() {
    const invalidConfig = this.config.issue.invalid;
    const config = this.config.issue.assignOwner;
    const label = this.context.payload.label.name
    const issue = this.context.payload.issue;
    const assignees: string[] = [];
    if (!issue.body.includes
    (invalidConfig.mark)) {
      return;
    }

    Object.keys(config.components).forEach(component => {
      if (format(config.labelTemplate, component).toLowerCase() === label.toLowerCase()) {
        assignees.push(config.components[component]);
      }
    })

    if (assignees.length) {
      await this.context.github.issues.addAssignees(this.context.issue({ assignees }))
    }
  }

  async addComponentLabel() {
    const config = this.config.issue.assignOwner;
    const components = Object.keys(config.components);
    const issue = this.context.payload.issue;
    let label: string | null = null;

    for (let i = 0; i < components.length; i++) {
      const component = components[i];
      if (kmp(issue.title.toLowerCase().replace(/(-)/g, ''), component.toLowerCase()) !== -1) {
        label = format(config.labelTemplate, component);
        break
      }
    }

    if (label) {
      await this.context.github.issues.addLabels(this.context.issue({labels: [label]}));
    }
  }

  async replyLabeled() {
    const configs = this.config.issue.labeledReplay;
    const label = this.context.payload.label.name
    const issue = this.context.payload.issue;
    const opener = issue.user.login;
    const config = configs.find(e => e.labels.includes(label));
    if (config) {
      const issueComment = this.context.issue({ body: format(config.replay, { user:  opener}) })
      await this.context.github.issues.createComment(issueComment);
    }
  }

  async replyTranslate() {
    const config = this.config.issue.translate;
    const issue = this.context.payload.issue;
    if (containsChinese(issue.title)) {
      let content = format(config.replay, { title: issue.title, body: issue.body});
      content = content.replace(/<!--(.*?)-->/g, '');
      const translated = await translate(content, { from: 'zh-CN', to: 'en' });
      if (translated && translated.text) {
        const issueComment = this.context.issue({ body: translated.text });
        await this.context.github.issues.createComment(issueComment);
      }
    }
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
        await this.context.github.issues.addLabels(this.context.issue({labels: [config.afterLabel]}));
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

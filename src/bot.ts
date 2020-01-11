import { Context } from 'probot'
import { LoggerWithTarget } from 'probot/lib/wrap-logger'
import format from 'string-template';

import { Config } from './interfaces/config.interface'
import { OrgsListMembersResponseItem } from '@octokit/rest';

const translate = require('@vitalets/google-translate-api');
const kmp = require('kmp');
const axios = require('axios');

function isDev(): boolean {
  return process && process.env && process.env.DEV === 'true';
}

function containsChinese(title: string): boolean {
  return /[\u4e00-\u9fa5]/.test(title);
}

export class Bot {
  constructor(private context: Context,
              private config: Config,
              private log: LoggerWithTarget) {
  }

  async assignOwner() {
    const config = this.config.issue.assignOwner;
    const label = this.context.payload.label.name
    const issue = this.context.payload.issue;
    const assignees: string[] = [];

    Object.keys(config.components).forEach(component => {
      if (format(config.labelTemplate, { component }).toLowerCase() === label.toLowerCase()) {
        assignees.push(config.components[component]);
      }
    })

    if (assignees.length) {
      this.log.trace({
        label,
        issue
      }, 'assigning owner...');

      try {
        if (this.context.event.search('pull_request') !== -1) {
          await this.context.github.pullRequests.createReviewRequest(this.context.issue({ reviewers: assignees }));
        } else {
          await this.context.github.issues.addAssignees(this.context.issue({ assignees }));
        }
        this.log.info({
          assignees
        }, 'assigned owner.');
      } catch (e) {
        this.log.error({
          error: new Error(e),
          issue,
          assignees
        }, 'assign owner error!');
      }
    }
  }

  async addComponentLabel() {
    const invalidConfig = this.config.issue.invalid;
    const config = this.config.issue.assignOwner;
    const components = Object.keys(config.components);
    const issue = this.context.payload.issue;
    let label: string | null = null;
    if (!issue.body.includes(invalidConfig.mark)) {
      return;
    }
    const title = issue.title
    .replace(/[\u4e00-\u9fa5]/g, ' ')
    .replace(/(-)/g, '')
    .replace(/(nz)/ig, '')
    .toLowerCase();

    for (let i = 0; i < components.length; i++) {
      const component = components[i];
      if (kmp(title, component.toLowerCase()) !== -1) {
        label = format(config.labelTemplate, {component});
        break
      }
    }

    if (label) {
      this.log.trace({
        issue,
        label
      }, 'adding component label...');

      try {
        await this.context.github.issues.addLabels(this.context.issue({labels: [label]}));
        this.log.info({
          issue
        }, 'component labeled.');
      } catch (e) {
        this.log.error({
          error: new Error(e),
          issue
        }, 'add component error!');
      }
    }
  }

  async replyLabeled() {
    const configs = this.config.issue.labeledReplay;
    const label = this.context.payload.label.name
    const issue = this.context.payload.issue;
    const opener = issue.user.login;
    const config = configs.find(e => e.labels.includes(label));
    if (config) {
      this.log.trace({
        issue,
        label
      }, 'replying labeled...');
      const issueComment = this.context.issue({ body: format(config.replay, { user:  opener}) })

      try {
        await this.context.github.issues.createComment(issueComment);
        this.log.info({
          issue,
          label,
          issueComment
        }, 'replyed by label.');
      } catch (e) {
        this.log.error({
          issue,
          label,
          issueComment,
          error: new Error(e),
        }, 'reply error!');
      }
    }
  }

  async replyTranslate() {
    const config = this.config.issue.translate;
    const issue = this.context.payload.issue;
    if (containsChinese(issue.title)) {
      const body = await translate(issue.body.replace(/<!--(.*?)-->/g, ''), { from: 'zh-CN', to: 'en' });
      const title = await translate(issue.title, { from: 'zh-CN', to: 'en' });
      if (body.text && title.text) {
        let content = format(config.replay, { title: title.text, body:  body.text});
        const issueComment = this.context.issue({ body: content });

        this.log.trace({
          issue,
          issueComment
        }, 'translating issue...');

        try {
          await this.context.github.issues.createComment(issueComment);
          this.log.info({
            issue,
            issueComment
          }, 'translated issue.');
        } catch (e) {
          this.log.error({
            error: new Error(e),
            issue,
            issueComment
          }, 'translate issue error!');
        }
      }
    }
  }

  async replyNeedReproduce() {
    const config = this.config.issue.needReproduce;
    const label = this.context.payload.label.name;
    const issue = this.context.payload.issue;

    const opener = issue.user.login;
    if (new RegExp(config.label).test(label)) {
      const issueComment = this.context.issue({ body: format(config.replay, { user:  opener}) });

      this.log.trace({
        issue,
        label
      }, 'replying `NeedReproduce` issue...');

      try {
        await this.context.github.issues.createComment(issueComment);
        if (config.afterLabel) {
          await this.context.github.issues.addLabels(this.context.issue({labels: [config.afterLabel]}));
        }

        this.log.info({
          issue,
          label,
          issueComment
        }, 'replyed `NeedReproduce` issue.');
      } catch (e) {
        this.log.error({
          error: new Error(e),
          issue,
          label,
          issueComment
        }, 'reply `NeedReproduce` issue error!');
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
      const issueComment = this.context.issue({ body: format(config.replay, { user:  opener}) });

      this.log.trace({
        issue,
      }, 'replying Invalid issue...');

      try {
        await this.context.github.issues.createComment(issueComment);
        await this.context.github.issues.update(this.context.issue({ state: 'closed' }));
        await this.context.github.issues.addLabels(this.context.issue({labels: labels}));

        this.log.info({
          issue,
        }, 'replyed invalid issue...');
      } catch (e) {
        this.log.error({
          error: new Error(e),
          issue,
        }, 'reply invalid issue error!');
      }

    }
  }

  async commentPreview() {
    if (this.config && this.config.pullRequest && this.config.pullRequest.preview) {
      const replay = this.config.pullRequest.preview.replay;
      const number = this.context.payload.number;
      const pullRequest = this.context.payload.pull_request;
      const issueComment = this.context.issue({ body: format(replay, { number}) });
      try {
        await this.context.github.issues.createComment(issueComment);

        this.log.trace({
          pullRequest,
        }, 'Comment preview url...');
      } catch (e) {
        this.log.error({
          error: new Error(e),
          pullRequest,
        }, 'Comment preview error!');
      }
    }
  }

  async sendRelease() {
    const release = this.context.payload.release;
    axios.post(
      `https://oapi.dingtalk.com/robot/send?access_token=${process.env.DINGTALK_TOKEN}`,
      {
        msgtype: 'markdown',
        markdown: {
          title: `${release.name} 发布`,
          text: `# ${release.name} 发布日志 \n\n ${release.body}`
        }
      }
    );
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
    const repo = this.context.repo();
    let response = await this.context.github.orgs.listMembers({
      org: repo.owner
    });
    if (response && response.data) {
      members = response.data;
    }
    return members.map(m => m.login);
  }

}

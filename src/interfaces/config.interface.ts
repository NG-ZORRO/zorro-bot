export interface Config {
  issue: IssueConfig
  pullRequest: PullRequestConfig
}

export interface PullRequestConfig {
  preview: {
    replay: string
  }
}

export interface IssueConfig {
  labeledReplay: LabeledReplayItem[];
  translate: {
    replay: string;
  };
  invalid: {
    mark: string;
    labels: string | string[];
    replay: string;
  };
  assignOwner: {
    labelTemplate: string;
    components: {
      [component: string]: string;
    }
  };
  needReproduce: {
    label: string;
    afterLabel: string;
    replay: string;
  }
}

export  interface LabeledReplayItem {
  labels: string[];
  replay: string;
}

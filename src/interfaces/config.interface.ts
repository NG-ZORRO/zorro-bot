export interface Config {
  issue: IssueConfig
}

export interface IssueConfig {
  translate: {
    omit: string[];
    replay: string;
  };
  invalid: {
    mark: string;
    labels: string | string[];
    replay: string;
  };
  assignOwner: {
    [component: string]: string;
  };
  needReproduce: {
    label: string;
    afterLabel: string;
    replay: string;
  }
}

export interface Config {
    issue: IssueConfig;
}
export interface IssueConfig {
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
    };
}

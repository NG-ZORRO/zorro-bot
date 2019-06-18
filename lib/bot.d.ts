import { Context } from 'probot';
import { Config } from './interfaces/config.interface';
export declare class Bot {
    private context;
    private config;
    constructor(context: Context, config: Config);
    replyTranslate(): Promise<void>;
    replyNeedReproduce(): Promise<void>;
    replyInvalid(): Promise<void>;
    private isMember;
    private getMembers;
}

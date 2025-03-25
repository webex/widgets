import {ILogger, IContactCenter} from '@webex/cc-store';

export interface IOutdialCall {
  /**
   * Function to start outdial call.
   */
  startOutdial: (destination: string) => void;

  /**
   * CC SDK Instance.
   */
  cc: IContactCenter;

  /**
   * Logger instance for logging purpose.
   */
  logger: ILogger;
}

export type OutdialCallComponentProps = Pick<IOutdialCall, 'startOutdial'>;

export type useOutdialCallProps = Pick<IOutdialCall, 'cc' | 'logger'>;

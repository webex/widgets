import React from 'react';
import {render} from '@testing-library/react';
import '@testing-library/jest-dom';
import CampaignCountdownComponent from '../../../../src/components/task/CampaignCountdown/campaign-countdown';

describe('CampaignCountdown Snapshots', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should match snapshot with 30 seconds timeout', () => {
      const {container} = render(<CampaignCountdownComponent timeoutInSeconds={30} />);
      expect(container).toMatchSnapshot();
    });

    it('should match snapshot with 0 seconds timeout', () => {
      const {container} = render(<CampaignCountdownComponent timeoutInSeconds={0} />);
      expect(container).toMatchSnapshot();
    });

    it('should match snapshot with 125 seconds timeout', () => {
      const {container} = render(<CampaignCountdownComponent timeoutInSeconds={125} />);
      expect(container).toMatchSnapshot();
    });
  });
});

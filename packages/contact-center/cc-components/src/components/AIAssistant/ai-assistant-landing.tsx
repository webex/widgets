import React from 'react';
import {Link, Text} from '@momentum-design/components/dist/react';
import CiscoAIAssistantColorIcon from './CiscoAIAssistantColorIcon';
import {
  AI_ASSISTANT_FEATURES_URL,
  AI_ASSISTANT_GREETING,
  REAL_TIME_ASSIST_DESCRIPTION,
  REAL_TIME_ASSIST_TITLE,
  SMART_SUMMARIES_DESCRIPTION,
  SMART_SUMMARIES_TITLE,
  VIEW_ALL_AI_FEATURES_LABEL,
  WELLNESS_BREAKS_DESCRIPTION,
  WELLNESS_BREAKS_TITLE,
} from './constants';

interface AIAssistantLandingProps {
  agentName?: string;
  showRealTimeAssist: boolean;
}

interface FeatureItemProps {
  description: string;
  icon: string;
  title: string;
}

const FeatureItem: React.FC<FeatureItemProps> = ({description, icon, title}) => (
  <li className="ai-assistant__landing-feature">
    <Text tagname="h3" type="body-large-bold" className="ai-assistant__landing-feature-title">
      <span aria-hidden="true">{icon}</span>
      <span>{title}</span>
    </Text>
    <Text tagname="p" type="body-large-regular" className="ai-assistant__landing-feature-description">
      {description}
    </Text>
  </li>
);

const AIAssistantLanding: React.FC<AIAssistantLandingProps> = ({agentName, showRealTimeAssist}) => {
  const greeting = agentName?.trim()
    ? `Hi ${agentName.trim()}. ${AI_ASSISTANT_GREETING}`
    : `Hi, ${AI_ASSISTANT_GREETING}`;

  return (
    <div className="ai-assistant__landing" data-testid="ai-assistant:landing">
      <div className="ai-assistant__landing-logo" aria-hidden="true">
        <CiscoAIAssistantColorIcon size={64} />
      </div>
      <Text tagname="p" type="body-large-regular" className="ai-assistant__landing-greeting">
        {greeting}
      </Text>
      <ul className="ai-assistant__landing-features">
        {showRealTimeAssist ? (
          <FeatureItem icon="✨" title={REAL_TIME_ASSIST_TITLE} description={REAL_TIME_ASSIST_DESCRIPTION} />
        ) : null}
        <FeatureItem icon="🪷" title={WELLNESS_BREAKS_TITLE} description={WELLNESS_BREAKS_DESCRIPTION} />
        <FeatureItem icon="✍🏻" title={SMART_SUMMARIES_TITLE} description={SMART_SUMMARIES_DESCRIPTION} />
      </ul>
      <Link
        href={AI_ASSISTANT_FEATURES_URL}
        target="_blank"
        rel="noopener noreferrer"
        iconName="pop-out-bold"
        size="large"
        data-testid="ai-assistant:view-all-features"
      >
        {VIEW_ALL_AI_FEATURES_LABEL}
      </Link>
    </div>
  );
};

export default AIAssistantLanding;

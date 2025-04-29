import React from 'react';
import {ListItemBase, ListItemBaseSection, AvatarNext, Text, ButtonCircle} from '@momentum-ui/react-collaboration';
import {Icon} from '@momentum-design/components/dist/react';
import classnames from 'classnames';
import {ConsultTransferListComponentProps} from '../../task.types';

const ConsultTransferListComponent: React.FC<ConsultTransferListComponentProps> = (props) => {
  const {title, subtitle, buttonIcon, onButtonPress, className} = props;
  const initials = title
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <ListItemBase className={classnames('call-control-list-item', className)} size={50} isPadded aria-label={title}>
      <ListItemBaseSection position="start">
        <AvatarNext size={32} initials={initials} title={title} />
      </ListItemBaseSection>
      <ListItemBaseSection
        position="middle"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          marginLeft: '8px',
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        <Text tagName="p" type="body-primary" style={{margin: 0, lineHeight: '1.2'}}>
          {title}
        </Text>
        {subtitle && (
          <Text tagName="p" type="body-secondary" style={{margin: 0, lineHeight: '1.2'}}>
            {subtitle}
          </Text>
        )}
      </ListItemBaseSection>
      <ListItemBaseSection position="end">
        <div className="hover-button">
          <ButtonCircle onPress={onButtonPress} size={28} color="join">
            <Icon name={buttonIcon} />
          </ButtonCircle>
        </div>
      </ListItemBaseSection>
    </ListItemBase>
  );
};

export default ConsultTransferListComponent;

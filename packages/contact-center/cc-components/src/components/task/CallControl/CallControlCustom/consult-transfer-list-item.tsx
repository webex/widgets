import React from 'react';
import {ListItemBase, ListItemBaseSection, Text, ButtonCircle} from '@momentum-ui/react-collaboration';
import {Avatar, Icon} from '@momentum-design/components/dist/react';
import classnames from 'classnames';
import {ConsultTransferListComponentProps} from '../../task.types';
import {createInitials, handleListItemPress} from './call-control-custom.utils';

const ConsultTransferListComponent: React.FC<ConsultTransferListComponentProps> = (props) => {
  const {title, subtitle, presence, buttonIcon, onButtonPress, className, logger} = props;

  const initials = createInitials(title);

  const handleButtonPress = () => {
    handleListItemPress(title, onButtonPress, logger);
  };

  return (
    <ListItemBase className={classnames('call-control-list-item', className)} size={50} isPadded aria-label={title}>
      <ListItemBaseSection position="start" className="call-control-list-item-start">
        <Avatar size={32} initials={initials} presence={presence} />
      </ListItemBaseSection>
      <ListItemBaseSection position="middle" className="call-control-list-item-middle">
        <Text tagName="div" type="body-primary" className="call-control-list-item-title">
          {title}
        </Text>
        {subtitle && (
          <Text tagName="div" type="body-secondary" className="call-control-list-item-subtitle">
            {subtitle}
          </Text>
        )}
      </ListItemBaseSection>
      <ListItemBaseSection position="end" className="call-control-list-item-end">
        <div className="hover-button">
          <ButtonCircle onPress={handleButtonPress} size={32} color="join">
            <Icon name={buttonIcon} />
          </ButtonCircle>
        </div>
      </ListItemBaseSection>
    </ListItemBase>
  );
};

export default ConsultTransferListComponent;

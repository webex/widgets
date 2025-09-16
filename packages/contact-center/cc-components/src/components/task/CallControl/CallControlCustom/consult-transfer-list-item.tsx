import React from 'react';
import {ListItemBase, ListItemBaseSection, AvatarNext, Text, ButtonCircle} from '@momentum-ui/react-collaboration';
import {Icon} from '@momentum-design/components/dist/react';
import classnames from 'classnames';
import {ConsultTransferListComponentProps} from '../../task.types';
import {createInitials, handleListItemPress} from './call-control-custom.utils';

const ConsultTransferListComponent: React.FC<ConsultTransferListComponentProps> = (props) => {
  const {title, subtitle, buttonIcon, onButtonPress, className, logger} = props;

  const initials = createInitials(title);

  const handleButtonPress = () => {
    handleListItemPress(title, onButtonPress, logger);
  };

  return (
    <ListItemBase
      className={classnames('call-control-list-item', className)}
      size={50}
      isPadded
      aria-label={title}
      style={{
        padding: '12px 16px',
        margin: '2px 0',
        borderRadius: '8px',
        transition: 'background-color 0.2s ease',
      }}
    >
      <ListItemBaseSection
        position="start"
        style={{
          marginRight: '12px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <AvatarNext size={32} initials={initials} title={title} />
      </ListItemBaseSection>
      <ListItemBaseSection
        position="middle"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          minWidth: 0,
          overflow: 'hidden',
          paddingRight: '8px',
        }}
      >
        <Text
          tagName="div"
          type="body-primary"
          style={{
            margin: 0,
            marginBottom: '2px',
            lineHeight: '1.3',
            fontWeight: '500',
            fontSize: '14px',
            color: '#323130',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            tagName="div"
            type="body-secondary"
            style={{
              margin: 0,
              lineHeight: '1.2',
              fontSize: '12px',
              color: '#605e5c',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {subtitle}
          </Text>
        )}
      </ListItemBaseSection>
      <ListItemBaseSection
        position="end"
        style={{
          display: 'flex',
          alignItems: 'center',
          marginLeft: '8px',
        }}
      >
        <div
          className="hover-button"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ButtonCircle
            onPress={handleButtonPress}
            size={32}
            color="join"
            style={{
              flexShrink: 0,
            }}
          >
            <Icon name={buttonIcon} />
          </ButtonCircle>
        </div>
      </ListItemBaseSection>
    </ListItemBase>
  );
};

export default ConsultTransferListComponent;

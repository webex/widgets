import React from 'react';
import {TaskListPresentationalProps} from '../task.types';

const styles: {[key: string]: React.CSSProperties} = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    padding: '20px',
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '10px 15px',
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
  },
  leftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  icon: {
    backgroundColor: '#bdf5cf',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconSvg: {
    width: '24px',
    height: '24px',
    color: '#146f5c',
  },
  textPrimary: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 'bold',
  },
  textSecondary: {
    margin: 0,
    fontSize: '14px',
    color: '#888',
  },
  rightSectionText: {
    margin: 0,
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
  },
};

const TaskListPresentational: React.FunctionComponent<TaskListPresentationalProps> = (props) => {
  if (props.taskList.length <= 0) {
    return <></>; // hidden component
  }

  const {taskList} = props;

  return (
    <div style={styles.container}>
      {taskList.map((task, index) => {
        const callAssociationDetails = task.data.interaction.callAssociatedDetails;
        const {ani, dn, virtualTeamName} = callAssociationDetails;

        return (
          <div key={index} style={styles.card}>
            {/* Left Section with Icon and Details */}
            <div style={styles.leftSection}>
              <div style={styles.icon}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={styles.iconSvg}
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-2.73 19.5 19.5 0 0 1-6-6A19.86 19.86 0 0 1 3.08 4.18 2 2 0 0 1 5 2h3a2 2 0 0 1 2 1.72c.2 1.52.71 2.94 1.41 4.24a2 2 0 0 1-.45 2.31L9.91 11a16 16 0 0 0 6 6l1.73-1.05a2 2 0 0 1 2.31-.45 16.11 16.11 0 0 0 4.24 1.41A2 2 0 0 1 22 16.92z"></path>
                </svg>
              </div>
              <div>
                <p style={styles.textPrimary}>{ani}</p>
                <p style={styles.textSecondary}>{virtualTeamName}</p>
              </div>
            </div>

            {/* Right Section with Call Duration */}
            <div>
              <p style={styles.rightSectionText}>{dn}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TaskListPresentational;

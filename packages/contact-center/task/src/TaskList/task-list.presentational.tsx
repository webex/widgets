import React from 'react';
import {TaskListPresentationalProps} from '../task.types';
import {ButtonPill} from '@momentum-ui/react-collaboration';

const styles: {[key: string]: React.CSSProperties} = {
  box: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    padding: '20px',
    maxWidth: '800px',
    margin: '0 auto',
  },
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
  buttonsWrapper: {
    display: 'flex',
    gap: '10px',
  },
  acceptButton: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.9em',
    cursor: 'pointer',
    fontWeight: 'bold',
    backgroundColor: '#28a745',
    color: '#fff',
  },
  rejectButton: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.9em',
    cursor: 'pointer',
    fontWeight: 'bold',
    backgroundColor: '#dc3545',
    color: '#fff',
  },
  fieldset: {
    border: '1px solid #ccc',
    borderRadius: '5px',
    padding: '10px',
    marginBottom: '20px',
    position: 'relative',
  },
  legendBox: {
    fontWeight: 'bold',
    color: '#0052bf',
  },
};

const TaskListPresentational: React.FunctionComponent<TaskListPresentationalProps> = (props) => {
  if (props.taskList.length <= 0) {
    return <></>; // hidden component
  }

  const {currentTask, taskList, acceptTask, declineTask, isBrowser} = props;

  return (
    <div style={styles.box}>
      <fieldset style={styles.fieldset}>
        <legend style={styles.legendBox}>TaskList</legend>
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

                {/* Right Section with Call Duration and Buttons */}
                {!currentTask && (
                  <div>
                    <p style={styles.rightSectionText}>{dn}</p>
                    {isBrowser && (
                      <div style={styles.buttonsWrapper}>
                        <ButtonPill style={styles.acceptButton} onPress={() => acceptTask(task)}>
                          Accept
                        </ButtonPill>
                        <ButtonPill style={styles.rejectButton} onPress={() => declineTask(task)}>
                          Reject
                        </ButtonPill>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
};

export default TaskListPresentational;

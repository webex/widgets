import React from 'react';
import {IncomingTaskPresentationalProps} from '../task.types';

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
    border: '1px solid #ccc',
    borderRadius: '8px',
    padding: '16px',
    width: '350px',
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.2)',
    fontFamily: 'Arial, sans-serif',
    backgroundColor: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
  },
  topSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconWrapper: {
    display: 'inline-block',
    backgroundColor: '#d4f8e8',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: '10px',
  },
  iconSvg: {
    width: '24px',
    height: '24px',
    color: '#146f5c',
  },
  callInfo: {
    margin: 0,
    fontSize: '1.2em',
    color: '#333',
  },
  aniText: {
    fontSize: '1.1em',
    fontWeight: 'bold',
    margin: '4px 0',
    color: '#146f5c',
  },
  buttonsWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    marginLeft: '16px',
  },
  answerButton: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.9em',
    cursor: 'pointer',
    fontWeight: 'bold',
    backgroundColor: '#28a745',
    color: '#fff',
    marginBottom: '8px',
  },
  declineButton: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.9em',
    cursor: 'pointer',
    fontWeight: 'bold',
    backgroundColor: '#dc3545',
    color: '#fff',
  },
  queueInfo: {
    fontSize: '0.9em',
    color: '#666',
    marginTop: '8px',
  },
  timeElapsed: {
    color: '#28a745',
    fontWeight: 'bold',
  },
  callDetails: {
    marginTop: '16px',
    fontSize: '0.9em',
    color: '#333',
  },
  detailItem: {
    margin: '4px 0',
  },
  detailLabel: {
    color: '#555',
    fontWeight: 'bold',
  },
};

const IncomingTaskPresentational: React.FunctionComponent<IncomingTaskPresentationalProps> = (props) => {
  const {currentTask, accept, decline, isBrowser, audioRef} = props;

  if (!currentTask) {
    return <></>; // hidden component
  }

  const callAssociationDetails = currentTask.data.interaction.callAssociatedDetails;
  const {ani, dn, virtualTeamName} = callAssociationDetails;
  const timeElapsed = ''; // TODO: Calculate time elapsed

  return (
    <div style={styles.box}>
      <div data-testid="incoming-task-presentational" style={styles.container}>
        {/* Top Section - Call Info with Phone Icon */}
        <div style={styles.topSection}>
          <div style={{display: 'flex', alignItems: 'center'}}>
            <span style={styles.iconWrapper}>
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
            </span>
            <div>
              <h2 style={styles.callInfo}>Incoming Call</h2>
              <p data-testid="incoming-task-ani" style={styles.aniText}>
                {ani}
              </p>
            </div>
          </div>

          {isBrowser && (
            <div style={styles.buttonsWrapper}>
              <button style={styles.answerButton} onClick={accept}>
                Answer
              </button>
              <button style={styles.declineButton} onClick={decline}>
                Decline
              </button>
            </div>
          )}
        </div>
        <audio ref={audioRef} id="remote-audio"></audio>

        {/* Queue and Timer Info */}
        <p style={styles.queueInfo}>
          {virtualTeamName} - <span style={styles.timeElapsed}>{timeElapsed}</span>
        </p>

        {/* Call Details Section */}
        <div style={styles.callDetails}>
          <p style={styles.detailItem}>
            <strong style={styles.detailLabel}>Phone Number:</strong> {ani}
          </p>
          <p style={styles.detailItem}>
            <strong style={styles.detailLabel}>DNIS:</strong> {dn}
          </p>
          <p style={styles.detailItem}>
            <strong style={styles.detailLabel}>Queue Name:</strong> {virtualTeamName}
          </p>
        </div>
      </div>
    </div>
  );
};

export default IncomingTaskPresentational;

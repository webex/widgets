import React from 'react';
import {IStationLoginPresentationalProps} from './station-login.types';
import styles from './styles.module.scss';

const StationLoginPresentational: React.FunctionComponent<IStationLoginPresentationalProps> = (props) => {
  const {selectLoginOption, login, logout} = props;

  return (
    <>
      <h1 data-testid="station-login-heading">{props.name}</h1>
      <div className={styles.box}>
      <section className={styles.sectionBox}>
        <div className={styles.sectionContent}>
          <fieldset>
            <legend>Agent</legend>
            <div className={styles.screenshareSection}>
              <div style={{display: 'flex', gap: '1rem'}}>
                <fieldset style={{flex: 0.69}}>
                  <legend>Select Team</legend>
                  <select id="teamsDropdown" className="form-control w-auto my-3">Teams</select>
                </fieldset>
                <fieldset>
                  <legend>Agent Login</legend>
                  <select name="LoginOption" id="LoginOption" className={styles.loginOption} onChange={selectLoginOption}>
                    <option value="" selected hidden>Choose Agent Login Option...</option>
                  </select>
                  <input id="dialNumber" name="dialNumber" placeholder="Extension/Dial Number" type="text"/>
                  <button id="AgentLogin" className={styles.btn} onClick={login}>Login</button>
                  <button id="logoutAgent" className={styles.btn} onClick={logout}>Logout</button>
                </fieldset>
              </div>
            </div>
          </fieldset>
        </div>
      </section>
    </div>
    </>
  );
};

export default StationLoginPresentational;

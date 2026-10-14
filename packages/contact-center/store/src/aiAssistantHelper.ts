import {runInAction} from 'mobx';
import type {AISummaryCC, AISummaryFeedback, AISummaryRole, AISummaryTask} from './store.types';

/** Records that a displayed AI summary was copied without making an SDK call. */
export const recordAISummaryCopied = (
  cc: AISummaryCC,
  role: AISummaryRole,
  expectedRevision: number,
  task: AISummaryTask | null
): boolean => {
  const interactionId = task?.data?.interactionId;
  if (!interactionId) {
    return false;
  }
  const entry = cc.aiSummaries[interactionId]?.[role];
  if (!entry?.content || entry.revision !== expectedRevision) {
    return false;
  }
  runInAction(() => {
    cc.aiSummaries = {
      ...cc.aiSummaries,
      [interactionId]: {
        ...cc.aiSummaries[interactionId],
        [role]: {
          ...entry,
          response: {...entry.response, numberOfTimesCopied: entry.response.numberOfTimesCopied + 1},
        },
      },
    };
  });
  return true;
};

/** Stores initiator or post-call feedback locally until the caller submits its response. */
export const setAISummaryFeedback = (
  cc: AISummaryCC,
  role: Exclude<AISummaryRole, 'receiver'>,
  feedback: Exclude<AISummaryFeedback, 'none'>,
  expectedRevision: number,
  task: AISummaryTask | null
): boolean => {
  const interactionId = task?.data?.interactionId;
  if (!interactionId) {
    return false;
  }
  const entry = cc.aiSummaries[interactionId]?.[role];
  if (!entry?.content || entry.revision !== expectedRevision) {
    return false;
  }
  runInAction(() => {
    cc.aiSummaries = {
      ...cc.aiSummaries,
      [interactionId]: {
        ...cc.aiSummaries[interactionId],
        [role]: {...entry, response: {...entry.response, feedback}},
      },
    };
  });
  return true;
};

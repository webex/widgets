import {useEffect, useRef} from 'react';
import type {AISummaryEditableField, AISummarySurface} from '@webex/cc-store';

type SummaryViewTracking = {
  state: AISummarySurface;
  contentRevision: number;
  onViewed?: (expectedRevision: number) => boolean;
  onEdit: (field: AISummaryEditableField, expectedRevision: number) => boolean;
};

// A local edit advances the store's content revision for stale-action guards,
// but does not reveal a newly generated summary. Keep that distinction local
// to the mounted presentation; reopening the panel is a separate reveal.
export const useSummaryViewed = (summary: SummaryViewTracking | undefined): SummaryViewTracking['onEdit'] => {
  const seenRevisionsRef = useRef(new Set<number>());

  useEffect(() => {
    if (!summary || summary.state !== 'content' || seenRevisionsRef.current.has(summary.contentRevision)) {
      return;
    }
    seenRevisionsRef.current.add(summary.contentRevision);
    summary.onViewed?.(summary.contentRevision);
  }, [summary]);

  return (field, expectedRevision) => {
    const accepted = summary?.onEdit(field, expectedRevision) === true;
    if (accepted) {
      seenRevisionsRef.current.add(expectedRevision + 1);
    }
    return accepted;
  };
};

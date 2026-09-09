import type {WellnessBreakNotice} from '../ai-assistant.types';

export const WELLNESS_SUGGESTION_COPY =
  "Looks like it's a busy day. Here's how I can help you stay focussed and on top of your game";
export const WELLNESS_SUGGESTION_TOOLTIP_FALLBACK =
  'This break is pre-approved by your organization for your well-being. You deserve it.';
export const WELLNESS_ACKNOWLEDGEMENT_COPY = 'Great. Your well-being break will begin shortly.';
export const WELLNESS_BLOCKED_ACKNOWLEDGEMENT_COPY =
  'Great. Your well-being break starts right after your current work.';

export const WELLNESS_NOTICE_COPY: Record<WellnessBreakNotice, string> = {
  declined:
    "It's great to see your dedication. But remember, taking breaks can boost your productivity and your health.",
  'not-allowed':
    "I'm sorry, you've reached your well-being break limit today. Continue with your tasks, but remember to take care of yourself.",
  'no-response': "Looks like you're busy. I didn't get a response, so I'll check back with you shortly.",
  completed: "I hope you're feeling recharged after that well-being break. See you in your next break!",
};
